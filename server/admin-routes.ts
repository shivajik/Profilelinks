import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "./storage";
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

export default router;
