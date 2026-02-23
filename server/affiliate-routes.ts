import { Router, type Request, type Response } from "express";
import { db } from "./storage";
import { requireAdminAuth } from "./admin-auth";
import {
  affiliates,
  affiliateReferrals,
  promoCodes,
  users,
  payments,
  pricingPlans,
  createAffiliateSchema,
  updateAffiliateSchema,
  createPromoCodeSchema,
  updatePromoCodeSchema,
  validatePromoCodeSchema,
} from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import crypto from "crypto";

const router = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ═══════════════════════════════════════════════════
// ADMIN: Affiliate Management
// ═══════════════════════════════════════════════════

// List all affiliates
router.get("/api/admin/affiliates", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const all = await db
      .select({
        id: affiliates.id,
        userId: affiliates.userId,
        referralCode: affiliates.referralCode,
        commissionRate: affiliates.commissionRate,
        isActive: affiliates.isActive,
        totalEarnings: affiliates.totalEarnings,
        createdAt: affiliates.createdAt,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
      })
      .from(affiliates)
      .leftJoin(users, eq(affiliates.userId, users.id))
      .orderBy(desc(affiliates.createdAt));
    res.json(all);
  } catch (error: any) {
    console.error("Fetch affiliates error:", error);
    res.status(500).json({ message: "Failed to fetch affiliates" });
  }
});

// Create affiliate (assign user as affiliate)
router.post("/api/admin/affiliates", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = createAffiliateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    // Check user exists
    const [user] = await db.select().from(users).where(eq(users.id, result.data.userId));
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check not already affiliate
    const [existing] = await db.select().from(affiliates).where(eq(affiliates.userId, result.data.userId));
    if (existing) return res.status(400).json({ message: "User is already an affiliate" });

    const referralCode = `REF-${user.username.toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const [affiliate] = await db.insert(affiliates).values({
      userId: result.data.userId,
      referralCode,
      commissionRate: result.data.commissionRate.toString(),
    }).returning();

    res.status(201).json(affiliate);
  } catch (error: any) {
    console.error("Create affiliate error:", error);
    res.status(500).json({ message: "Failed to create affiliate" });
  }
});

// Update affiliate
router.patch("/api/admin/affiliates/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = updateAffiliateSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const updateData: Record<string, any> = {};
    if (result.data.commissionRate !== undefined) updateData.commissionRate = result.data.commissionRate.toString();
    if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;

    const [updated] = await db
      .update(affiliates)
      .set(updateData)
      .where(sql`${affiliates.id} = ${req.params.id}`)
      .returning();
    if (!updated) return res.status(404).json({ message: "Affiliate not found" });
    res.json(updated);
  } catch (error: any) {
    console.error("Update affiliate error:", error);
    res.status(500).json({ message: "Failed to update affiliate" });
  }
});

// Delete affiliate
router.delete("/api/admin/affiliates/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.delete(affiliates).where(sql`${affiliates.id} = ${req.params.id}`).returning();
    if (!result.length) return res.status(404).json({ message: "Affiliate not found" });
    res.json({ message: "Affiliate removed" });
  } catch (error: any) {
    console.error("Delete affiliate error:", error);
    res.status(500).json({ message: "Failed to delete affiliate" });
  }
});

// Get affiliate referrals (admin)
router.get("/api/admin/affiliates/:id/referrals", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const referrals = await db
      .select({
        id: affiliateReferrals.id,
        referredUserId: affiliateReferrals.referredUserId,
        commissionAmount: affiliateReferrals.commissionAmount,
        status: affiliateReferrals.status,
        createdAt: affiliateReferrals.createdAt,
        username: users.username,
        email: users.email,
      })
      .from(affiliateReferrals)
      .leftJoin(users, sql`${affiliateReferrals.referredUserId} = ${users.id}`)
      .where(sql`${affiliateReferrals.affiliateId} = ${req.params.id}`)
      .orderBy(desc(affiliateReferrals.createdAt));
    res.json(referrals);
  } catch {
    res.status(500).json({ message: "Failed to fetch referrals" });
  }
});

// ═══════════════════════════════════════════════════
// ADMIN: Promo Code Management
// ═══════════════════════════════════════════════════

router.get("/api/admin/promo-codes", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const codes = await db.select().from(promoCodes).orderBy(desc(promoCodes.createdAt));
    res.json(codes);
  } catch {
    res.status(500).json({ message: "Failed to fetch promo codes" });
  }
});

router.post("/api/admin/promo-codes", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = createPromoCodeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const [existing] = await db.select().from(promoCodes).where(eq(promoCodes.code, result.data.code.toUpperCase()));
    if (existing) return res.status(400).json({ message: "Promo code already exists" });

    const [code] = await db.insert(promoCodes).values({
      code: result.data.code.toUpperCase(),
      discountPercent: result.data.discountPercent.toString(),
      maxUses: result.data.maxUses,
      expiresAt: result.data.expiresAt ? new Date(result.data.expiresAt) : null,
    }).returning();
    res.status(201).json(code);
  } catch (error: any) {
    console.error("Create promo error:", error);
    res.status(500).json({ message: "Failed to create promo code" });
  }
});

router.patch("/api/admin/promo-codes/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = updatePromoCodeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const updateData: Record<string, any> = {};
    if (result.data.discountPercent !== undefined) updateData.discountPercent = result.data.discountPercent.toString();
    if (result.data.maxUses !== undefined) updateData.maxUses = result.data.maxUses;
    if (result.data.isActive !== undefined) updateData.isActive = result.data.isActive;
    if (result.data.expiresAt !== undefined) updateData.expiresAt = result.data.expiresAt ? new Date(result.data.expiresAt) : null;

    const [updated] = await db.update(promoCodes).set(updateData).where(sql`${promoCodes.id} = ${req.params.id}`).returning();
    if (!updated) return res.status(404).json({ message: "Promo code not found" });
    res.json(updated);
  } catch (error: any) {
    console.error("Update promo error:", error);
    res.status(500).json({ message: "Failed to update promo code" });
  }
});

router.delete("/api/admin/promo-codes/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.delete(promoCodes).where(sql`${promoCodes.id} = ${req.params.id}`).returning();
    if (!result.length) return res.status(404).json({ message: "Promo code not found" });
    res.json({ message: "Promo code deleted" });
  } catch {
    res.status(500).json({ message: "Failed to delete promo code" });
  }
});

// ═══════════════════════════════════════════════════
// PUBLIC: Validate promo code
// ═══════════════════════════════════════════════════

router.post("/api/promo-codes/validate", async (req: Request, res: Response) => {
  try {
    const result = validatePromoCodeSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid code" });
    }
    const [code] = await db.select().from(promoCodes).where(eq(promoCodes.code, result.data.code.toUpperCase()));
    if (!code) return res.status(404).json({ message: "Invalid promo code" });
    if (!code.isActive) return res.status(400).json({ message: "This promo code is no longer active" });
    if (code.maxUses && code.maxUses > 0 && code.currentUses >= code.maxUses) return res.status(400).json({ message: "This promo code has reached its usage limit" });
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) return res.status(400).json({ message: "This promo code has expired" });

    res.json({ valid: true, discountPercent: parseFloat(code.discountPercent), code: code.code });
  } catch {
    res.status(500).json({ message: "Failed to validate promo code" });
  }
});

// ═══════════════════════════════════════════════════
// AFFILIATE DASHBOARD (for logged-in affiliate users)
// ═══════════════════════════════════════════════════

router.get("/api/affiliate/dashboard", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.userId, req.session.userId!));
    if (!affiliate) return res.status(404).json({ message: "You are not an affiliate" });

    const referrals = await db
      .select({
        id: affiliateReferrals.id,
        referredUserId: affiliateReferrals.referredUserId,
        commissionAmount: affiliateReferrals.commissionAmount,
        status: affiliateReferrals.status,
        createdAt: affiliateReferrals.createdAt,
        username: users.username,
        email: users.email,
      })
      .from(affiliateReferrals)
      .leftJoin(users, eq(affiliateReferrals.referredUserId, users.id))
      .where(eq(affiliateReferrals.affiliateId, affiliate.id))
      .orderBy(desc(affiliateReferrals.createdAt));

    const totalEarnings = parseFloat(affiliate.totalEarnings);
    const pendingReferrals = referrals.filter(r => r.status === "pending").length;
    const convertedReferrals = referrals.filter(r => r.status === "converted").length;

    res.json({
      affiliate: {
        id: affiliate.id,
        referralCode: affiliate.referralCode,
        commissionRate: parseFloat(affiliate.commissionRate),
        isActive: affiliate.isActive,
        totalEarnings,
      },
      referrals,
      stats: {
        totalReferrals: referrals.length,
        pendingReferrals,
        convertedReferrals,
        totalEarnings,
      },
    });
  } catch (error: any) {
    console.error("Affiliate dashboard error:", error);
    res.status(500).json({ message: "Failed to fetch affiliate dashboard" });
  }
});

// ═══════════════════════════════════════════════════
// Track referral on registration (called internally)
// ═══════════════════════════════════════════════════

// Public endpoint: track a referral visit when user registers with ref code
router.post("/api/affiliate/track", async (req: Request, res: Response) => {
  try {
    const { referralCode, userId } = req.body;
    if (!referralCode || !userId) return res.status(400).json({ message: "Missing data" });

    const [affiliate] = await db.select().from(affiliates).where(eq(affiliates.referralCode, referralCode));
    if (!affiliate || !affiliate.isActive) return res.status(404).json({ message: "Invalid referral" });

    // Don't allow self-referral
    if (affiliate.userId === userId) return res.status(400).json({ message: "Cannot refer yourself" });

    // Check if already tracked
    const [existing] = await db.select().from(affiliateReferrals)
      .where(sql`${affiliateReferrals.affiliateId} = ${affiliate.id} AND ${affiliateReferrals.referredUserId} = ${userId}`);
    if (existing) return res.json({ message: "Already tracked" });

    await db.insert(affiliateReferrals).values({
      affiliateId: affiliate.id,
      referredUserId: userId,
      status: "pending",
    });

    res.json({ message: "Referral tracked" });
  } catch {
    res.status(500).json({ message: "Failed to track referral" });
  }
});

export default router;
