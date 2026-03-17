import { Router, Request, Response } from "express";
import { db, storage } from "./storage";
import { ltdCodes, users, userSubscriptions, pricingPlans, teams, teamMembers } from "@shared/schema";
import { eq, sql, and } from "drizzle-orm";
import { createLtdCodeSchema, updateLtdCodeSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { requireAdminAuth } from "./admin-auth";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = Router();

async function getAppSetting(key: string): Promise<string | null> {
  try {
    const r = await db.execute(sql`SELECT value FROM app_settings WHERE key = ${key} LIMIT 1`);
    return (r.rows[0] as any)?.value ?? null;
  } catch { return null; }
}
async function setAppSetting(key: string, value: string) {
  await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES (${key}, ${value}, now()) ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = now()`);
}

// ─── Public: check if LTD page is enabled ────────────────────────────────────
router.get("/api/ltd/status", async (_req: Request, res: Response) => {
  const val = await getAppSetting("ltd_page_enabled");
  res.json({ enabled: val === "true" });
});

// ─── Public: validate LTD code ───────────────────────────────────────────────
router.post("/api/ltd/validate", async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code is required" });

    const [ltdCode] = await db.select({
      id: ltdCodes.id,
      code: ltdCodes.code,
      planId: ltdCodes.planId,
      maxUses: ltdCodes.maxUses,
      currentUses: ltdCodes.currentUses,
      isActive: ltdCodes.isActive,
    }).from(ltdCodes).where(eq(ltdCodes.code, code.toUpperCase().trim()));

    if (!ltdCode) return res.status(404).json({ message: "Invalid redemption code" });
    if (!ltdCode.isActive) return res.status(400).json({ message: "This code has been deactivated" });
    if (ltdCode.currentUses >= ltdCode.maxUses) {
      return res.status(400).json({ message: "This code has already been redeemed" });
    }

    let planName: string | null = null;
    if (ltdCode.planId) {
      const [plan] = await db.select({ name: pricingPlans.name }).from(pricingPlans).where(eq(pricingPlans.id, ltdCode.planId));
      planName = plan?.name ?? null;
    }

    res.json({ valid: true, planName });
  } catch (err: any) {
    console.error("LTD validate error:", err);
    res.status(500).json({ message: "Failed to validate code" });
  }
});

// ─── Public: register with LTD code ──────────────────────────────────────────
router.post("/api/ltd/register", async (req: Request, res: Response) => {
  try {
    const pageEnabled = await getAppSetting("ltd_page_enabled");
    if (pageEnabled !== "true") return res.status(403).json({ message: "LTD registration is not available" });

    const { code, email, password, username, displayName } = req.body;
    if (!code || !email || !password || !username) {
      return res.status(400).json({ message: "Code, email, username and password are required" });
    }
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    // Validate code (re-validate to prevent race conditions)
    const [ltdCode] = await db.select().from(ltdCodes).where(eq(ltdCodes.code, code.toUpperCase().trim()));
    if (!ltdCode) return res.status(400).json({ message: "Invalid redemption code" });
    if (!ltdCode.isActive) return res.status(400).json({ message: "This code has been deactivated" });
    if (ltdCode.currentUses >= ltdCode.maxUses) {
      return res.status(400).json({ message: "This code has already been redeemed" });
    }

    // Check email/username uniqueness
    const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existingEmail) return res.status(400).json({ message: "Email already in use" });

    const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, normalizedUsername));
    if (existingUsername) return res.status(400).json({ message: "Username already taken" });

    // Determine account type from LTD code
    const isTeamCode = (ltdCode as any).signupAccountType === "team";

    // Create user — marked as LTD
    const hashedPassword = await bcrypt.hash(password, 10);
    const [newUser] = await db.insert(users).values({
      email: normalizedEmail,
      username: normalizedUsername,
      password: hashedPassword,
      displayName: displayName?.trim() || username,
      onboardingCompleted: true,
      isLtd: true,
      accountType: isTeamCode ? "team" : "personal",
    } as any).returning();

    // If team code, create a team for the user
    if (isTeamCode) {
      const team = await storage.createTeam({
        name: newUser.displayName ? `${newUser.displayName}'s Team` : `${newUser.username}'s Team`,
        size: "1-5",
        ownerId: newUser.id,
      });
      await storage.addTeamMember({
        teamId: team.id,
        userId: newUser.id,
        role: "owner",
        status: "activated",
      });
      await storage.updateUser(newUser.id, { teamId: team.id });
    }

    // Create lifetime subscription if a plan is linked
    if (ltdCode.planId) {
      await db.insert(userSubscriptions).values({
        userId: newUser.id,
        planId: ltdCode.planId,
        status: "active",
        billingCycle: "yearly",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 50 * 365 * 24 * 60 * 60 * 1000),
      });
    }

    // Increment code usage (mark as used for single-use codes)
    await db.update(ltdCodes)
      .set({ currentUses: ltdCode.currentUses + 1 })
      .where(eq(ltdCodes.id, ltdCode.id));

    // Auto-login
    (req.session as any).userId = newUser.id;
    res.json({ message: "Account created successfully", username: newUser.username });
  } catch (err: any) {
    console.error("LTD register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ─── Admin: get page enabled status ──────────────────────────────────────────
router.get("/api/admin/ltd/settings", requireAdminAuth, async (_req: Request, res: Response) => {
  const val = await getAppSetting("ltd_page_enabled");
  const purchaseVal = await getAppSetting("ltd_purchase_page_enabled");
  res.json({ ltdPageEnabled: val === "true", ltdPurchasePageEnabled: purchaseVal === "true" });
});

// ─── Admin: toggle page enabled ───────────────────────────────────────────────
router.post("/api/admin/ltd/settings", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { ltdPageEnabled, ltdPurchasePageEnabled } = req.body;
    if (ltdPageEnabled !== undefined) {
      await setAppSetting("ltd_page_enabled", ltdPageEnabled ? "true" : "false");
    }
    if (ltdPurchasePageEnabled !== undefined) {
      await setAppSetting("ltd_purchase_page_enabled", ltdPurchasePageEnabled ? "true" : "false");
    }
    res.json({ message: "Settings updated" });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update settings" });
  }
});

// ─── Public: check LTD purchase page status ──────────────────────────────────
router.get("/api/ltd/purchase-status", async (_req: Request, res: Response) => {
  const val = await getAppSetting("ltd_purchase_page_enabled");
  res.json({ enabled: val === "true" });
});

// ─── Public: get LTD plans ───────────────────────────────────────────────────
router.get("/api/ltd/plans", async (_req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(pricingPlans)
      .where(and(eq(pricingPlans.isActive, true), eq(pricingPlans.isLtd, true)))
      .orderBy(pricingPlans.sortOrder);
    res.json(plans);
  } catch (err: any) {
    res.status(500).json({ message: "Failed to fetch LTD plans" });
  }
});

// ─── Public: register for LTD purchase (no code needed) ──────────────────────
router.post("/api/ltd/purchase-register", async (req: Request, res: Response) => {
  try {
    const purchaseEnabled = await getAppSetting("ltd_purchase_page_enabled");
    if (purchaseEnabled !== "true") return res.status(403).json({ message: "LTD purchase is not available" });

    const { email, password, username, displayName, planId } = req.body;
    if (!email || !password || !username || !planId) {
      return res.status(400).json({ message: "Email, username, password and plan are required" });
    }
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.toLowerCase().trim();

    // Check plan exists and is LTD
    const [plan] = await db.select().from(pricingPlans).where(and(eq(pricingPlans.id, planId), eq(pricingPlans.isLtd, true), eq(pricingPlans.isActive, true)));
    if (!plan) return res.status(400).json({ message: "Invalid or inactive LTD plan" });

    // Check uniqueness
    const [existingEmail] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail));
    if (existingEmail) return res.status(400).json({ message: "Email already in use" });
    const [existingUsername] = await db.select({ id: users.id }).from(users).where(eq(users.username, normalizedUsername));
    if (existingUsername) return res.status(400).json({ message: "Username already taken" });

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);
    const isTeamPlan = plan.planType === "team";
    const [newUser] = await db.insert(users).values({
      email: normalizedEmail,
      username: normalizedUsername,
      password: hashedPassword,
      displayName: displayName?.trim() || username,
      onboardingCompleted: false,
      isLtd: true,
      accountType: isTeamPlan ? "team" : "personal",
    } as any).returning();

    if (isTeamPlan) {
      const team = await storage.createTeam({
        name: newUser.displayName ? `${newUser.displayName}'s Team` : `${newUser.username}'s Team`,
        size: "1-5",
        ownerId: newUser.id,
      });
      await storage.addTeamMember({
        teamId: team.id,
        userId: newUser.id,
        role: "owner",
        status: "activated",
      });
      await storage.updateUser(newUser.id, { teamId: team.id });
    }

    // Auto-login
    (req.session as any).userId = newUser.id;
    res.json({ message: "Account created", userId: newUser.id, planId });
  } catch (err: any) {
    console.error("LTD purchase register error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
});

// ─── Admin: list LTD codes ────────────────────────────────────────────────────
router.get("/api/admin/ltd/codes", requireAdminAuth, async (_req: Request, res: Response) => {
  try {
    const codes = await db.select({
      id: ltdCodes.id,
      code: ltdCodes.code,
      planId: ltdCodes.planId,
      maxUses: ltdCodes.maxUses,
      currentUses: ltdCodes.currentUses,
      isActive: ltdCodes.isActive,
      signupAccountType: ltdCodes.signupAccountType,
      notes: ltdCodes.notes,
      createdAt: ltdCodes.createdAt,
      planName: pricingPlans.name,
    }).from(ltdCodes)
      .leftJoin(pricingPlans, eq(ltdCodes.planId, pricingPlans.id))
      .orderBy(sql`${ltdCodes.createdAt} DESC`);
    res.json(codes);
  } catch (err: any) {
    console.error("LTD codes list error:", err);
    res.status(500).json({ message: "Failed to fetch LTD codes" });
  }
});

// ─── Admin: create single LTD code ───────────────────────────────────────────
router.post("/api/admin/ltd/codes", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = createLtdCodeSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });

    const { code, planId, notes, signupAccountType } = result.data;
    const resolvedPlanId = planId && planId !== "__none__" && planId.trim() !== "" ? planId : null;

    const [existing] = await db.select({ id: ltdCodes.id }).from(ltdCodes).where(eq(ltdCodes.code, code.toUpperCase()));
    if (existing) return res.status(400).json({ message: "A code with this name already exists" });

    const [created] = await db.insert(ltdCodes).values({
      code: code.toUpperCase(),
      planId: resolvedPlanId,
      maxUses: 1,
      signupAccountType: signupAccountType || "individual",
      notes: notes || null,
    }).returning();
    res.json(created);
  } catch (err: any) {
    console.error("LTD create error:", err);
    res.status(500).json({ message: "Failed to create LTD code" });
  }
});

// ─── Admin: bulk generate LTD codes ──────────────────────────────────────────
router.post("/api/admin/ltd/codes/bulk", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { count, prefix, planId, notes, signupAccountType } = req.body;
    const n = Math.min(Math.max(parseInt(count) || 1, 1), 500);
    const resolvedPlanId = planId && planId !== "__none__" && planId.trim() !== "" ? planId : null;

    const generated: string[] = [];
    const failed: string[] = [];

    for (let i = 0; i < n; i++) {
      const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
      const code = prefix ? `${prefix.toUpperCase()}-${randomPart}` : `LTD-${randomPart}`;
      try {
        await db.insert(ltdCodes).values({
          code,
          planId: resolvedPlanId,
          maxUses: 1,
          signupAccountType: signupAccountType || "individual",
          notes: notes || null,
        });
        generated.push(code);
      } catch {
        failed.push(code);
      }
    }

    res.json({
      message: `Generated ${generated.length} code(s)${failed.length ? `, ${failed.length} failed (duplicates)` : ""}`,
      generated,
      failed,
    });
  } catch (err: any) {
    console.error("LTD bulk generate error:", err);
    res.status(500).json({ message: "Failed to bulk generate codes" });
  }
});

// ─── Admin: update LTD code ───────────────────────────────────────────────────
router.patch("/api/admin/ltd/codes/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = updateLtdCodeSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });

    const [updated] = await db.update(ltdCodes).set(result.data).where(sql`${ltdCodes.id} = ${req.params.id}`).returning();
    if (!updated) return res.status(404).json({ message: "Code not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ message: "Failed to update code" });
  }
});

// ─── Admin: delete LTD code ───────────────────────────────────────────────────
router.delete("/api/admin/ltd/codes/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    await db.delete(ltdCodes).where(sql`${ltdCodes.id} = ${req.params.id}`);
    res.json({ message: "Code deleted" });
  } catch (err: any) {
    res.status(500).json({ message: "Failed to delete code" });
  }
});

export default router;
