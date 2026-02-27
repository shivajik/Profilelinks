import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, storage } from "./storage";
import { requireAdminAuth } from "./admin-auth";
import {
  adminUsers,
  users,
  pricingPlans,
  payments,
  userSubscriptions,
  adminLoginSchema,
  createAdminSchema,
  createPricingPlanSchema,
  updatePricingPlanSchema,
} from "@shared/schema";
import { eq, desc, count, sql } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

const router = Router();

// ─── Seed first admin (only if none exists) ────────────────────────────────
router.post("/api/admin/seed", async (req: Request, res: Response) => {
  try {
    const result = createAdminSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const existing = await db.select().from(adminUsers).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ message: "Admin already exists. Use the admin login." });
    }
    const hashedPassword = await bcrypt.hash(result.data.password, 12);
    const [admin] = await db
      .insert(adminUsers)
      .values({ email: result.data.email, password: hashedPassword, name: result.data.name })
      .returning();
    const { password: _, ...safeAdmin } = admin;
    res.status(201).json({ message: "Admin created successfully", admin: safeAdmin });
  } catch (error: any) {
    console.error("Seed error:", error);
    res.status(500).json({ message: "Failed to create admin" });
  }
});

// ─── Check if admin exists ──────────────────────────────────────────────────
router.get("/api/admin/exists", async (req: Request, res: Response) => {
  try {
    const existing = await db.select({ id: adminUsers.id }).from(adminUsers).limit(1);
    res.json({ exists: existing.length > 0 });
  } catch {
    res.status(500).json({ message: "Failed to check" });
  }
});

// ─── Admin Login ────────────────────────────────────────────────────────────
router.post("/api/admin/login", async (req: Request, res: Response) => {
  try {
    const result = adminLoginSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const { email, password } = result.data;
    const admins = await db.select().from(adminUsers).where(eq(adminUsers.email, email.toLowerCase()));
    const admin = admins[0];
    if (!admin) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    const valid = await bcrypt.compare(password, admin.password);
    if (!valid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    req.session.adminUserId = admin.id;
    const { password: _, ...safeAdmin } = admin;
    res.json({ message: "Logged in successfully", admin: safeAdmin });
  } catch (error: any) {
    console.error("Admin login error:", error);
    res.status(500).json({ message: "Admin login failed" });
  }
});

// ─── Admin Logout ───────────────────────────────────────────────────────────
router.post("/api/admin/logout", (req: Request, res: Response) => {
  (req.session as any).adminUserId = undefined;
  res.json({ message: "Logged out" });
});

// ─── Admin Me ───────────────────────────────────────────────────────────────
router.get("/api/admin/me", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const adminId = req.session.adminUserId;
    const admins = await db.select().from(adminUsers).where(sql`${adminUsers.id} = ${adminId}`);
    const admin = admins[0];
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    const { password: _, ...safeAdmin } = admin;
    res.json(safeAdmin);
  } catch {
    res.status(500).json({ message: "Failed to fetch admin" });
  }
});

// ─── Dashboard Stats ────────────────────────────────────────────────────────
router.get("/api/admin/stats", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const [totalUsersResult] = await db.select({ count: count() }).from(users);

    const revenueResult = await db
      .select({ total: sql<string>`COALESCE(SUM(amount::numeric), 0)` })
      .from(payments)
      .where(eq(payments.status, "success"));

    const [activeSubsResult] = await db
      .select({ count: count() })
      .from(userSubscriptions)
      .where(eq(userSubscriptions.status, "active"));

    const [totalPlansResult] = await db.select({ count: count() }).from(pricingPlans);
    const [totalPaymentsResult] = await db.select({ count: count() }).from(payments);

    // Count successful payments as revenue
    const [successPayments] = await db
      .select({ count: count() })
      .from(payments)
      .where(eq(payments.status, "success"));

    res.json({
      totalUsers: Number(totalUsersResult?.count ?? 0),
      totalRevenue: parseFloat(revenueResult[0]?.total ?? "0"),
      activeSubscriptions: Number(activeSubsResult?.count ?? 0),
      totalPlans: Number(totalPlansResult?.count ?? 0),
      totalPayments: Number(totalPaymentsResult?.count ?? 0),
      successfulPayments: Number(successPayments?.count ?? 0),
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
});

// ─── Pricing Plans CRUD ─────────────────────────────────────────────────────
router.get("/api/admin/plans", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const plans = await db.select().from(pricingPlans).orderBy(pricingPlans.sortOrder);
    res.json(plans);
  } catch {
    res.status(500).json({ message: "Failed to fetch plans" });
  }
});

router.post("/api/admin/plans", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = createPricingPlanSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const { monthlyPrice, yearlyPrice, ...rest } = result.data;
    const [plan] = await db
      .insert(pricingPlans)
      .values({
        ...rest,
        monthlyPrice: monthlyPrice.toString(),
        yearlyPrice: yearlyPrice.toString(),
      })
      .returning();
    res.status(201).json(plan);
  } catch (error: any) {
    console.error("Create plan error:", error);
    res.status(500).json({ message: "Failed to create plan" });
  }
});

router.patch("/api/admin/plans/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = updatePricingPlanSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const { monthlyPrice, yearlyPrice, ...rest } = result.data;
    const updateData: Record<string, any> = { ...rest, updatedAt: new Date() };
    if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice.toString();
    if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice.toString();

    const planId = req.params.id;
    const updated = await db
      .update(pricingPlans)
      .set(updateData)
      .where(sql`${pricingPlans.id} = ${planId}`)
      .returning();
    if (!updated.length) return res.status(404).json({ message: "Plan not found" });
    res.json(updated[0]);
  } catch (error: any) {
    console.error("Update plan error:", error);
    res.status(500).json({ message: "Failed to update plan" });
  }
});

router.delete("/api/admin/plans/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const planId = req.params.id;
    const result = await db.delete(pricingPlans).where(sql`${pricingPlans.id} = ${planId}`).returning();
    if (!result.length) return res.status(404).json({ message: "Plan not found" });
    res.json({ message: "Plan deleted" });
  } catch (error: any) {
    console.error("Delete plan error:", error);
    res.status(500).json({ message: "Failed to delete plan" });
  }
});

// ─── Users List ─────────────────────────────────────────────────────────────
router.get("/api/admin/users", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const accountType = req.query.accountType as string | undefined;

    let query = db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        accountType: users.accountType,
        onboardingCompleted: users.onboardingCompleted,
        template: users.template,
        isDisabled: users.isDisabled,
      })
      .from(users)
      .orderBy(desc(users.id))
      .limit(limit)
      .offset(offset);

    if (accountType && accountType !== "all") {
      (query as any).where(sql`${users.accountType} = ${accountType}`);
    }

    const allUsers = await query;

    // Get subscription for each user in batch
    const usersWithSubs = await Promise.all(
      allUsers.map(async (u) => {
        const subs = await db
          .select({
            status: userSubscriptions.status,
            billingCycle: userSubscriptions.billingCycle,
            planName: pricingPlans.name,
          })
          .from(userSubscriptions)
          .leftJoin(pricingPlans, sql`${userSubscriptions.planId} = ${pricingPlans.id}`)
          .where(sql`${userSubscriptions.userId} = ${u.id}`)
          .orderBy(desc(userSubscriptions.createdAt))
          .limit(1);
        return { ...u, subscription: subs[0] ?? null };
      })
    );

    const [totalResult] = await db.select({ count: count() }).from(users);
    res.json({ users: usersWithSubs, total: Number(totalResult?.count ?? 0), page, limit });
  } catch (error: any) {
    console.error("Users error:", error);
    res.status(500).json({ message: "Failed to fetch users" });
  }
});

// ─── Toggle User Enabled/Disabled ───────────────────────────────────────────
router.patch("/api/admin/users/:id/toggle-status", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const existing = await db.select({ isDisabled: users.isDisabled }).from(users).where(sql`${users.id} = ${userId}`);
    if (!existing.length) return res.status(404).json({ message: "User not found" });
    const newStatus = !existing[0].isDisabled;
    await db.update(users).set({ isDisabled: newStatus }).where(sql`${users.id} = ${userId}`);
    res.json({ message: newStatus ? "User disabled" : "User enabled", isDisabled: newStatus });
  } catch (error: any) {
    console.error("Toggle user error:", error);
    res.status(500).json({ message: "Failed to update user status" });
  }
});

// ─── Delete User ─────────────────────────────────────────────────────────────
router.delete("/api/admin/users/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const result = await db.delete(users).where(sql`${users.id} = ${userId}`).returning();
    if (!result.length) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Failed to delete user" });
  }
});


// ─── Payments List ──────────────────────────────────────────────────────────
router.get("/api/admin/payments", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const planId = req.query.planId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(payments.status, status));
    if (planId && planId !== "all") conditions.push(sql`${payments.planId} = ${planId}`);
    if (startDate) conditions.push(sql`${payments.createdAt} >= ${new Date(startDate)}`);
    if (endDate) conditions.push(sql`${payments.createdAt} <= ${new Date(endDate + "T23:59:59")}`);

    let query = db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        billingCycle: payments.billingCycle,
        razorpayOrderId: payments.razorpayOrderId,
        razorpayPaymentId: payments.razorpayPaymentId,
        createdAt: payments.createdAt,
        userEmail: users.email,
        username: users.username,
        planName: pricingPlans.name,
      })
      .from(payments)
      .leftJoin(users, sql`${payments.userId} = ${users.id}`)
      .leftJoin(pricingPlans, sql`${payments.planId} = ${pricingPlans.id}`)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    if (conditions.length > 0) {
      query = query.where(sql.join(conditions, sql` AND `)) as any;
    }

    const allPayments = await query;

    const [totalResult] = await db.select({ count: count() }).from(payments);
    res.json({ payments: allPayments, total: Number(totalResult?.count ?? 0), page, limit });
  } catch (error: any) {
    console.error("Payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// ─── User Detail with Payment History ───────────────────────────────────────
router.get("/api/admin/users/:id", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const userResult = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        accountType: users.accountType,
        onboardingCompleted: users.onboardingCompleted,
        isDisabled: users.isDisabled,
        template: users.template,
        bio: users.bio,
        profileImage: users.profileImage,
      })
      .from(users)
      .where(sql`${users.id} = ${userId}`)
      .limit(1);

    if (!userResult.length) return res.status(404).json({ message: "User not found" });
    const user = userResult[0];

    // Get subscription
    const subs = await db
      .select({
        status: userSubscriptions.status,
        billingCycle: userSubscriptions.billingCycle,
        planName: pricingPlans.name,
        currentPeriodStart: userSubscriptions.currentPeriodStart,
        currentPeriodEnd: userSubscriptions.currentPeriodEnd,
      })
      .from(userSubscriptions)
      .leftJoin(pricingPlans, sql`${userSubscriptions.planId} = ${pricingPlans.id}`)
      .where(sql`${userSubscriptions.userId} = ${userId}`)
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    // Get payment history
    const userPayments = await db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        billingCycle: payments.billingCycle,
        razorpayOrderId: payments.razorpayOrderId,
        razorpayPaymentId: payments.razorpayPaymentId,
        createdAt: payments.createdAt,
        planName: pricingPlans.name,
      })
      .from(payments)
      .leftJoin(pricingPlans, sql`${payments.planId} = ${pricingPlans.id}`)
      .where(sql`${payments.userId} = ${userId}`)
      .orderBy(desc(payments.createdAt));

    // Get usage counts
    const { getUserPlanLimits } = await import("./plan-limits");
    const limits = await getUserPlanLimits(userId as string);

    res.json({
      user,
      subscription: subs[0] ?? null,
      payments: userPayments,
      usage: limits,
    });
  } catch (error: any) {
    console.error("User detail error:", error);
    res.status(500).json({ message: "Failed to fetch user details" });
  }
});

// ─── Admin Assign Plan to User ──────────────────────────────────────────────
router.post("/api/admin/users/:id/assign-plan", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { planId, billingCycle, paymentMethod, notes } = req.body;

    if (!planId) return res.status(400).json({ message: "Plan ID is required" });

    // Verify user exists
    const userResult = await db.select({ id: users.id }).from(users).where(sql`${users.id} = ${userId}`).limit(1);
    if (!userResult.length) return res.status(404).json({ message: "User not found" });

    // Verify plan exists
    const planResult = await db.select().from(pricingPlans).where(sql`${pricingPlans.id} = ${planId}`).limit(1);
    if (!planResult.length) return res.status(404).json({ message: "Plan not found" });

    const plan = planResult[0];
    const cycle = billingCycle || "monthly";
    const amount = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;

    // Deactivate existing subscriptions
    await db
      .update(userSubscriptions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(sql`${userSubscriptions.userId} = ${userId} AND ${userSubscriptions.status} = 'active'`);

    // Create new subscription
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + (cycle === "yearly" ? 12 : 1));

    await db.insert(userSubscriptions).values({
      userId: userId as string,
      planId: planId as string,
      status: "active",
      billingCycle: cycle as string,
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    });

    // Record payment with admin note
    await db.insert(payments).values({
      userId: userId as string,
      planId: planId as string,
      amount: amount.toString(),
      currency: "INR",
      status: "success",
      billingCycle: cycle as string,
      razorpayOrderId: `ADMIN-${Date.now()}`,
      razorpayPaymentId: `admin-assigned-${(paymentMethod as string) || "manual"}${notes ? ` | ${notes}` : ""}`,
    });

    // If team plan, convert user to team account
    if (plan.planType === "team") {
      const existingUser = await db.select({ accountType: users.accountType, teamId: users.teamId }).from(users).where(sql`${users.id} = ${userId}`).limit(1);
      if (existingUser[0] && existingUser[0].accountType !== "team") {
        const team = await storage.createTeam({ name: "My Team", ownerId: userId as string });
        await storage.addTeamMember({ teamId: team.id, userId: userId as string, role: "owner", status: "activated" });
        await storage.updateUser(userId as string, { accountType: "team", teamId: team.id });
      }
    }

    res.json({ message: `Plan "${plan.name}" assigned to user successfully` });
  } catch (error: any) {
    console.error("Assign plan error:", error);
    res.status(500).json({ message: "Failed to assign plan" });
  }
});

// ─── Reports CSV Download ───────────────────────────────────────────────────
router.get("/api/admin/reports/download", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const status = req.query.status as string | undefined;
    const planId = req.query.planId as string | undefined;

    const conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(payments.status, status));
    if (planId && planId !== "all") conditions.push(sql`${payments.planId} = ${planId}`);
    if (startDate) conditions.push(sql`${payments.createdAt} >= ${new Date(startDate)}`);
    if (endDate) conditions.push(sql`${payments.createdAt} <= ${new Date(endDate + "T23:59:59")}`);

    let query = db
      .select({
        id: payments.id,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        billingCycle: payments.billingCycle,
        razorpayOrderId: payments.razorpayOrderId,
        razorpayPaymentId: payments.razorpayPaymentId,
        createdAt: payments.createdAt,
        userEmail: users.email,
        username: users.username,
        planName: pricingPlans.name,
      })
      .from(payments)
      .leftJoin(users, sql`${payments.userId} = ${users.id}`)
      .leftJoin(pricingPlans, sql`${payments.planId} = ${pricingPlans.id}`)
      .orderBy(desc(payments.createdAt));

    if (conditions.length > 0) {
      query = query.where(sql.join(conditions, sql` AND `)) as any;
    }

    const allPayments = await query;

    // Generate CSV
    const headers = ["Date", "User", "Email", "Plan", "Amount", "Currency", "Billing Cycle", "Status", "Razorpay Order ID", "Razorpay Payment ID"];
    const rows = allPayments.map((p: any) => [
      new Date(p.createdAt).toISOString().split("T")[0],
      p.username || "",
      p.userEmail || "",
      p.planName || "",
      p.amount,
      p.currency,
      p.billingCycle || "",
      p.status,
      p.razorpayOrderId || "",
      p.razorpayPaymentId || "",
    ]);

    const csv = [headers.join(","), ...rows.map((r: string[]) => r.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=payments-report-${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csv);
  } catch (error: any) {
    console.error("Report download error:", error);
    res.status(500).json({ message: "Failed to generate report" });
  }
});

// ─── Seed Team Packages ─────────────────────────────────────────────────────
router.post("/api/admin/seed-team-packages", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const teamPackages = [
      {
        name: "Team Starter",
        description: "Perfect for small teams getting started. Upgrade from individual to team account.",
        monthlyPrice: "499",
        yearlyPrice: "4990",
        features: JSON.stringify([
          "Up to 5 team members",
          "Team branding & templates",
          "Shared contact management",
          "Menu builder access",
          "QR codes for all members",
          "Basic analytics",
        ]),
        maxLinks: 25,
        maxPages: 5,
        maxTeamMembers: 5,
        maxBlocks: 50,
        maxSocials: 10,
        qrCodeEnabled: true,
        analyticsEnabled: true,
        customTemplatesEnabled: true,
        menuBuilderEnabled: true,
        planType: "team",
        isActive: true,
        isFeatured: false,
        sortOrder: 10,
      },
      {
        name: "Team Pro",
        description: "For growing teams that need more power and customization.",
        monthlyPrice: "999",
        yearlyPrice: "9990",
        features: JSON.stringify([
          "Up to 20 team members",
          "Advanced team branding",
          "Custom templates library",
          "Full menu builder",
          "QR codes & analytics",
          "Priority support",
          "Shared contacts",
        ]),
        maxLinks: 50,
        maxPages: 10,
        maxTeamMembers: 20,
        maxBlocks: 100,
        maxSocials: 20,
        qrCodeEnabled: true,
        analyticsEnabled: true,
        customTemplatesEnabled: true,
        menuBuilderEnabled: true,
        planType: "team",
        isActive: true,
        isFeatured: true,
        sortOrder: 11,
      },
      {
        name: "Team Enterprise",
        description: "Unlimited power for large organizations. Full control and customization.",
        monthlyPrice: "2499",
        yearlyPrice: "24990",
        features: JSON.stringify([
          "Up to 200 team members",
          "White-label branding",
          "Unlimited templates",
          "Full menu builder",
          "Advanced analytics",
          "Dedicated support",
          "API access",
          "Custom integrations",
        ]),
        maxLinks: 200,
        maxPages: 50,
        maxTeamMembers: 200,
        maxBlocks: 500,
        maxSocials: 50,
        qrCodeEnabled: true,
        analyticsEnabled: true,
        customTemplatesEnabled: true,
        menuBuilderEnabled: true,
        planType: "team",
        isActive: true,
        isFeatured: false,
        sortOrder: 12,
      },
    ];

    const inserted = [];
    for (const pkg of teamPackages) {
      const [plan] = await db
        .insert(pricingPlans)
        .values(pkg)
        .returning();
      inserted.push(plan);
    }

  res.status(201).json({ message: `${inserted.length} team packages created`, plans: inserted });
  } catch (error: any) {
    console.error("Seed team packages error:", error);
    res.status(500).json({ message: "Failed to seed team packages" });
  }
});

// ─── User Search (for affiliate autocomplete) ──────────────────────────────
router.get("/api/admin/users/search", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string || "").trim().toLowerCase();
    if (q.length < 2) return res.json([]);
    const results = await db
      .select({ id: users.id, email: users.email, username: users.username, displayName: users.displayName })
      .from(users)
      .where(sql`LOWER(${users.email}) LIKE ${'%' + q + '%'} OR LOWER(${users.username}) LIKE ${'%' + q + '%'}`)
      .limit(10);
    res.json(results);
  } catch {
    res.status(500).json({ message: "Search failed" });
  }
});

// ─── Payment Gateway Settings ───────────────────────────────────────────────
router.get("/api/admin/settings/payment-keys", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT key, CASE WHEN key = 'razorpay_environment' THEN value WHEN length(value) > 8 THEN substring(value, 1, 4) || '****' || substring(value, length(value) - 3) ELSE '********' END as masked_value FROM app_settings WHERE key IN ('razorpay_key_id', 'razorpay_key_secret', 'razorpay_environment')`);
    const keys: Record<string, string> = {};
    for (const row of result.rows as any[]) {
      keys[row.key] = row.masked_value;
    }
    res.json(keys);
  } catch (error: any) {
    console.error("Payment keys fetch error:", error);
    res.status(500).json({ message: "Failed to fetch payment keys" });
  }
});

router.post("/api/admin/settings/payment-keys", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { razorpayKeyId, razorpayKeySecret, razorpayEnvironment } = req.body;
    if (razorpayKeyId) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('razorpay_key_id', ${razorpayKeyId}, now()) ON CONFLICT (key) DO UPDATE SET value = ${razorpayKeyId}, updated_at = now()`);
    }
    if (razorpayKeySecret) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('razorpay_key_secret', ${razorpayKeySecret}, now()) ON CONFLICT (key) DO UPDATE SET value = ${razorpayKeySecret}, updated_at = now()`);
    }
    if (razorpayEnvironment) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('razorpay_environment', ${razorpayEnvironment}, now()) ON CONFLICT (key) DO UPDATE SET value = ${razorpayEnvironment}, updated_at = now()`);
    }
    res.json({ message: "Payment gateway keys updated successfully" });
  } catch (error: any) {
    console.error("Payment keys update error:", error);
    res.status(500).json({ message: "Failed to update payment keys" });
  }
});

// ─── CleanSignups Email Verification Settings ───────────────────────────────
router.get("/api/admin/settings/cleansignups-key", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'cleansignups_api_key'`);
    const rows = result.rows as any[];
    const value = rows[0]?.value || "";
    const masked = value.length > 8 ? value.substring(0, 4) + "****" + value.substring(value.length - 4) : (value ? "********" : "");
    res.json({ masked, isSet: !!value });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch key" });
  }
});

router.post("/api/admin/settings/cleansignups-key", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey || !apiKey.trim()) {
      // Delete the key to disable verification
      await db.execute(sql`DELETE FROM app_settings WHERE key = 'cleansignups_api_key'`);
      return res.json({ message: "CleanSignups verification disabled" });
    }
    await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('cleansignups_api_key', ${apiKey.trim()}, now()) ON CONFLICT (key) DO UPDATE SET value = ${apiKey.trim()}, updated_at = now()`);
    res.json({ message: "CleanSignups API key saved successfully" });
  } catch (error: any) {
    console.error("CleanSignups key update error:", error);
    res.status(500).json({ message: "Failed to save API key" });
  }
});

// ─── Public Email Verification Endpoint (used before registration) ──────────
router.post("/api/auth/verify-email", async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    // Check if CleanSignups API key is configured
    const result = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'cleansignups_api_key'`);
    const rows = result.rows as any[];
    const apiKey = rows[0]?.value;

    if (!apiKey) {
      // No API key set — skip verification
      return res.json({ valid: true, skipped: true });
    }

    // Call CleanSignups API
    const response = await fetch("https://api.cleansignups.com/api/dashboard/verify", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      console.error("CleanSignups API error:", response.status);
      // If API fails, allow registration (don't block user due to service issues)
      return res.json({ valid: true, skipped: true, reason: "service_error" });
    }

    const data = await response.json();

    // If isTemporary = true → invalid email
    if (data.isTemporary === true) {
      return res.json({ valid: false, message: "Temporary or disposable emails are not allowed. Please use a valid email address." });
    }

    // If isTemporary = false → valid email
    return res.json({ valid: true });
  } catch (error: any) {
    console.error("Email verification error:", error);
    // On error, allow registration
    return res.json({ valid: true, skipped: true, reason: "error" });
  }
});

export default router;
