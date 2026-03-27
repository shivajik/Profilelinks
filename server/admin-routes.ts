import { Router, type Request, type Response } from "express";
import bcrypt from "bcryptjs";
import { db, storage } from "./storage";
import { requireAdminAuth } from "./admin-auth";
import { rateLimit } from "./rate-limit";
import { invalidateAnalyticsCache } from "./analytics";
import {
  adminUsers,
  users,
  pricingPlans,
  payments,
  userSubscriptions,
  teams,
  teamMembers,
  adminLoginSchema,
  createAdminSchema,
  createPricingPlanSchema,
  updatePricingPlanSchema,
} from "@shared/schema";
import { eq, desc, count, sql, and, or, ilike, inArray } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

const router = Router();

// ─── Seed first admin (only if none exists) ────────────────────────────────
const adminAuthLimiter = rateLimit("admin-auth", 5, 15 * 60 * 1000); // 5 attempts per 15 min

router.post("/api/admin/seed", adminAuthLimiter, async (req: Request, res: Response) => {
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
router.post("/api/admin/login", adminAuthLimiter, async (req: Request, res: Response) => {
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
  req.session.destroy((err) => {
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out" });
  });
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
    const { monthlyPrice, yearlyPrice, monthlyPriceUsd, yearlyPriceUsd, ...rest } = result.data;
    const [plan] = await db
      .insert(pricingPlans)
      .values({
        ...rest,
        monthlyPrice: monthlyPrice.toString(),
        yearlyPrice: yearlyPrice.toString(),
        monthlyPriceUsd: monthlyPriceUsd.toString(),
        yearlyPriceUsd: yearlyPriceUsd.toString(),
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
    const { monthlyPrice, yearlyPrice, monthlyPriceUsd, yearlyPriceUsd, ...rest } = result.data;
    const updateData: Record<string, any> = { ...rest, updatedAt: new Date() };
    if (monthlyPrice !== undefined) updateData.monthlyPrice = monthlyPrice.toString();
    if (yearlyPrice !== undefined) updateData.yearlyPrice = yearlyPrice.toString();
    if (monthlyPriceUsd !== undefined) updateData.monthlyPriceUsd = monthlyPriceUsd.toString();
    if (yearlyPriceUsd !== undefined) updateData.yearlyPriceUsd = yearlyPriceUsd.toString();

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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 10, 100));
    const offset = (page - 1) * limit;
    const accountType = req.query.accountType as string | undefined;
    const search = ((req.query.search as string) || "").trim();
    const planNameFilter = ((req.query.planName as string) || "").trim();
    const normalizedPlanFilter = planNameFilter.toLowerCase();

    const conditions: any[] = [];

    if (accountType === "disabled") {
      conditions.push(eq(users.isDisabled, true));
    } else if (accountType === "ltd" || accountType === "LTD") {
      conditions.push(eq(users.isLtd, true));
    } else if (accountType && accountType !== "all") {
      conditions.push(eq(users.accountType, accountType));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(users.displayName, pattern),
          ilike(users.username, pattern),
          ilike(users.email, pattern),
        )!,
      );
    }

    if (normalizedPlanFilter && normalizedPlanFilter !== "all") {
      if (normalizedPlanFilter === "free") {
        conditions.push(sql`NOT EXISTS (
          SELECT 1
          FROM user_subscriptions us
          WHERE us.user_id = ${users.id}
            AND us.status = 'active'
        )`);
      } else {
        conditions.push(sql`EXISTS (
          SELECT 1
          FROM user_subscriptions us
          INNER JOIN pricing_plans pp ON pp.id = us.plan_id
          WHERE us.user_id = ${users.id}
            AND us.status = 'active'
            AND LOWER(pp.name) = LOWER(${planNameFilter})
        )`);
      }
    }

    const whereCondition = conditions.length > 0 ? and(...conditions) : undefined;

    const paginatedUsers = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        displayName: users.displayName,
        accountType: users.accountType,
        onboardingCompleted: users.onboardingCompleted,
        template: users.template,
        isDisabled: users.isDisabled,
        isLtd: users.isLtd,
        createdAt: users.createdAt,
        businessPhone: users.businessPhone,
      })
      .from(users)
      .where(whereCondition)
      .orderBy(sql`${users.createdAt} DESC NULLS LAST`, desc(users.id))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db.select({ count: count() }).from(users).where(whereCondition);
    const total = Number(totalResult?.count ?? 0);

    if (paginatedUsers.length === 0) {
      return res.json({ users: [], total, page, limit });
    }

    const userIds = paginatedUsers.map((u: any) => u.id);

    const subscriptionRows = await db
      .select({
        userId: userSubscriptions.userId,
        status: userSubscriptions.status,
        billingCycle: userSubscriptions.billingCycle,
        planName: pricingPlans.name,
        createdAt: userSubscriptions.createdAt,
        isTrial: userSubscriptions.isTrial,
      })
      .from(userSubscriptions)
      .leftJoin(pricingPlans, sql`${userSubscriptions.planId} = ${pricingPlans.id}`)
      .where(inArray(userSubscriptions.userId, userIds))
      .orderBy(desc(userSubscriptions.createdAt));

    const latestSubscriptionByUserId = new Map<string, { status: string; billingCycle: string; planName?: string | null; isTrial?: boolean }>();
    for (const sub of subscriptionRows) {
      if (!latestSubscriptionByUserId.has(sub.userId)) {
        latestSubscriptionByUserId.set(sub.userId, {
          status: sub.status,
          billingCycle: sub.billingCycle,
          planName: sub.planName,
          isTrial: sub.isTrial ?? false,
        });
      }
    }

    // Check if users are team owners (have teams they own)
    const teamOwnerRows = await db
      .select({
        ownerId: teams.ownerId,
        teamId: teams.id,
        teamName: teams.name,
      })
      .from(teams)
      .where(inArray(teams.ownerId, userIds));

    const teamOwnerMap = new Map<string, { teamId: string; teamName: string }>();
    for (const row of teamOwnerRows) {
      teamOwnerMap.set(row.ownerId, { teamId: row.teamId, teamName: row.teamName });
    }

    // Get team member counts for team owners
    const teamIds = teamOwnerRows.map(r => r.teamId);
    let memberCountMap = new Map<string, number>();
    if (teamIds.length > 0) {
      const memberCounts = await db
        .select({
          teamId: teamMembers.teamId,
          count: count(),
        })
        .from(teamMembers)
        .where(inArray(teamMembers.teamId, teamIds))
        .groupBy(teamMembers.teamId);
      for (const mc of memberCounts) {
        memberCountMap.set(mc.teamId, Number(mc.count));
      }
    }

    const usersWithSubs = paginatedUsers.map((userRow: any) => {
      const teamOwner = teamOwnerMap.get(userRow.id);
      return {
        ...userRow,
        subscription: latestSubscriptionByUserId.get(userRow.id) ?? null,
        isTeamOwner: !!teamOwner,
        teamName: teamOwner?.teamName ?? null,
        teamMemberCount: teamOwner ? (memberCountMap.get(teamOwner.teamId) ?? 0) : 0,
      };
    });

    res.json({ users: usersWithSubs, total, page, limit });
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

// ─── Bulk Delete Users ────────────────────────────────────────────────────────
router.post("/api/admin/users/bulk-delete", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "No user IDs provided" });
    await db.delete(users).where(inArray(users.id, ids));
    res.json({ message: `${ids.length} user(s) deleted` });
  } catch (error: any) {
    console.error("Bulk delete error:", error);
    res.status(500).json({ message: "Failed to bulk delete users" });
  }
});

// ─── Bulk Deactivate/Reactivate Users ────────────────────────────────────────
router.post("/api/admin/users/bulk-toggle-status", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { ids, disable } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ message: "No user IDs provided" });
    await db.update(users).set({ isDisabled: !!disable }).where(inArray(users.id, ids));
    res.json({ message: `${ids.length} user(s) ${disable ? "deactivated" : "reactivated"}` });
  } catch (error: any) {
    console.error("Bulk toggle error:", error);
    res.status(500).json({ message: "Failed to update user statuses" });
  }
});


// ─── Payments List ──────────────────────────────────────────────────────────
router.get("/api/admin/payments", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.max(1, Math.min(parseInt(req.query.limit as string) || 10, 100));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;
    const search = (req.query.search as string || "").trim();
    const planId = req.query.planId as string | undefined;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;

    const conditions: any[] = [];
    if (status && status !== "all") conditions.push(eq(payments.status, status));
    if (planId && planId !== "all") conditions.push(sql`${payments.planId} = ${planId}`);
    if (startDate) conditions.push(sql`${payments.createdAt} >= ${new Date(startDate)}`);
    if (endDate) conditions.push(sql`${payments.createdAt} <= ${new Date(endDate + "T23:59:59")}`);
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(users.username, pattern),
          ilike(users.email, pattern),
          ilike(pricingPlans.name, pattern),
        )
      );
    }

    const whereClause = conditions.length > 0 ? sql.join(conditions, sql` AND `) : undefined;

    const selectFields = {
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
    };

    let query = db
      .select(selectFields)
      .from(payments)
      .leftJoin(users, sql`${payments.userId} = ${users.id}`)
      .leftJoin(pricingPlans, sql`${payments.planId} = ${pricingPlans.id}`)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      query = query.where(whereClause) as any;
    }

    const allPayments = await query;

    let countQuery = db
      .select({ count: count() })
      .from(payments)
      .leftJoin(users, sql`${payments.userId} = ${users.id}`)
      .leftJoin(pricingPlans, sql`${payments.planId} = ${pricingPlans.id}`);
    if (whereClause) {
      countQuery = countQuery.where(whereClause) as any;
    }
    const [totalResult] = await countQuery;

    res.json({ payments: allPayments, total: Number(totalResult?.count ?? 0), page, limit });
  } catch (error: any) {
    console.error("Payments error:", error);
    res.status(500).json({ message: "Failed to fetch payments" });
  }
});

// ─── User Detail with Payment History ──────────────────────────────H��────────
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
        businessPhone: users.businessPhone,
      })
      .from(users)
      .where(sql`${users.id} = ${userId}`)
      .limit(1);

    if (!userResult.length) return res.status(404).json({ message: "User not found" });
    const user = userResult[0];

    const memberships = await storage.getTeamMembershipsByUserId(userId as string);
    const activeMembership = memberships.find((membership) => membership.status === "activated");
    const resolvedBusinessPhone = activeMembership?.businessPhone || user.businessPhone || null;

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

    // Check if user is a team owner and get team members
    let teamInfo: any = null;
    const ownedTeams = await db.select().from(teams).where(sql`${teams.ownerId} = ${userId}`).limit(1);
    if (ownedTeams.length > 0) {
      const team = ownedTeams[0];
      const members = await db
        .select({
          id: teamMembers.id,
          userId: teamMembers.userId,
          teamId: teamMembers.teamId,
          status: teamMembers.status,
          jobTitle: teamMembers.jobTitle,
          businessPhone: teamMembers.businessPhone,
          userName: users.username,
          userEmail: users.email,
          userDisplayName: users.displayName,
        })
        .from(teamMembers)
        .leftJoin(users, sql`${teamMembers.userId} = ${users.id}`)
        .where(sql`${teamMembers.teamId} = ${team.id}`);

      teamInfo = {
        teamId: team.id,
        teamName: team.name,
        members: members.map(m => ({
          id: m.id,
          userId: m.userId,
          username: m.userName,
          email: m.userEmail,
          displayName: m.userDisplayName,
          jobTitle: m.jobTitle,
          status: m.status,
        })),
      };
    }

    res.json({
      user: { ...user, businessPhone: resolvedBusinessPhone },
      subscription: subs[0] ?? null,
      payments: userPayments,
      usage: limits,
      teamInfo,
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
    const userResult = await db
      .select({ id: users.id, email: users.email, username: users.username })
      .from(users)
      .where(sql`${users.id} = ${userId}`)
      .limit(1);
    if (!userResult.length) return res.status(404).json({ message: "User not found" });

    const targetUser = userResult[0];

    const previousSubscription = await db
      .select({ planName: pricingPlans.name })
      .from(userSubscriptions)
      .leftJoin(pricingPlans, eq(userSubscriptions.planId, pricingPlans.id))
      .where(sql`${userSubscriptions.userId} = ${userId} AND ${userSubscriptions.status} = 'active'`)
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    // Verify plan exists
    const planResult = await db.select().from(pricingPlans).where(sql`${pricingPlans.id} = ${planId}`).limit(1);
    if (!planResult.length) return res.status(404).json({ message: "Plan not found" });

    const plan = planResult[0];
    const previousPlanName = previousSubscription[0]?.planName ?? "Free";
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

    if (targetUser.email) {
      try {
        const { sendPackageUpgradeEmail } = await import("./email");
        await sendPackageUpgradeEmail({
          to: targetUser.email,
          planName: plan.name,
          previousPlan: previousPlanName,
        });
      } catch (emailError) {
        console.error(`Failed to send plan update email to ${targetUser.email}:`, emailError);
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

// ─── Email Blast ────────────────────────────────────────────────────────────
router.post("/api/admin/email-blast", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { subject, body, recipientMode, planFilter, emails } = req.body;
    if (!subject || !body) return res.status(400).json({ message: "Subject and body are required" });

    let recipients: { email: string; username: string; displayName?: string | null }[] = [];

    if (recipientMode === "manual") {
      if (!Array.isArray(emails) || emails.length === 0) return res.status(400).json({ message: "No recipients selected" });
      const allUsers = await db.select({ email: users.email, username: users.username, displayName: users.displayName }).from(users).where(inArray(users.email, emails));
      recipients = allUsers;
    } else if (recipientMode === "all") {
      recipients = await db.select({ email: users.email, username: users.username, displayName: users.displayName }).from(users);
    } else if (recipientMode === "plan") {
      if (planFilter === "free" || !planFilter || planFilter === "all") {
        // For "free" or "all", get all users
        const allUsers = await db.select({ email: users.email, username: users.username, displayName: users.displayName, id: users.id }).from(users);
        if (planFilter === "free") {
          // Filter out users with active subscriptions
          const usersWithSubs = await db.select({ userId: userSubscriptions.userId }).from(userSubscriptions).where(eq(userSubscriptions.status, "active"));
          const subUserIds = new Set(usersWithSubs.map((s: any) => s.userId));
          recipients = allUsers.filter((u: any) => !subUserIds.has(u.id));
        } else {
          recipients = allUsers;
        }
      } else {
        // Filter by specific plan name
        const planRows = await db.select({ id: pricingPlans.id }).from(pricingPlans).where(eq(pricingPlans.name, planFilter));
        if (planRows.length > 0) {
          const planIds = planRows.map((p: any) => p.id);
          const subs = await db.select({ userId: userSubscriptions.userId }).from(userSubscriptions).where(and(eq(userSubscriptions.status, "active"), inArray(userSubscriptions.planId, planIds)));
          const userIds = subs.map((s: any) => s.userId);
          if (userIds.length > 0) {
            recipients = await db.select({ email: users.email, username: users.username, displayName: users.displayName }).from(users).where(inArray(users.id, userIds));
          }
        }
      }
    }

    if (recipients.length === 0) return res.status(400).json({ message: "No recipients found" });

    // Send emails via SendGrid (email blast only)
    const { sendBulkTemplateEmail } = await import("./email");
    const results = await sendBulkTemplateEmail({ subject, body, recipients });

    const message = results.sent === 0 && results.errors.length > 0
      ? `Failed to send emails: ${results.errors[0]}`
      : `Email sent to ${results.sent} of ${results.total} recipients.${results.failed > 0 ? ` (${results.failed} failed)` : ""}`;

    res.json({
      message,
      sent: results.sent,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error: any) {
    console.error("Email blast error:", error);
    res.status(500).json({ message: "Failed to send emails" });
  }
});

// ─── SendGrid Settings ──────────────────────────────────────────────────────
router.get("/api/admin/settings/sendgrid", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT key, value FROM app_settings WHERE key IN ('sendgrid_api_key', 'sendgrid_from_email', 'sendgrid_from_name')`);
    const rows = result.rows as any[];
    const settings: Record<string, string> = {};
    for (const row of rows) {
      if (row.key === 'sendgrid_api_key') {
        const v = row.value;
        settings.apiKey = v.length > 8 ? v.substring(0, 4) + '****' + v.substring(v.length - 4) : (v ? '********' : '');
        settings.isSet = v ? 'true' : 'false';
      } else {
        settings[row.key] = row.value;
      }
    }
    res.json(settings);
  } catch {
    res.status(500).json({ message: "Failed to fetch SendGrid settings" });
  }
});

router.post("/api/admin/settings/sendgrid", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { apiKey, fromEmail, fromName } = req.body;
    if (apiKey !== undefined) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('sendgrid_api_key', ${apiKey}, now()) ON CONFLICT (key) DO UPDATE SET value = ${apiKey}, updated_at = now()`);
    }
    if (fromEmail) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('sendgrid_from_email', ${fromEmail}, now()) ON CONFLICT (key) DO UPDATE SET value = ${fromEmail}, updated_at = now()`);
    }
    if (fromName) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('sendgrid_from_name', ${fromName}, now()) ON CONFLICT (key) DO UPDATE SET value = ${fromName}, updated_at = now()`);
    }
    res.json({ message: "SendGrid settings saved successfully" });
  } catch (error: any) {
    console.error("SendGrid settings error:", error);
    res.status(500).json({ message: "Failed to save SendGrid settings" });
  }
});

// ─── Trial Discount Settings ────────────────────────────────────────────────
router.get("/api/admin/settings/trial-discount", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'trial_discount_percent'`);
    const rows = result.rows as any[];
    res.json({ discountPercent: rows[0]?.value || "20" });
  } catch {
    res.status(500).json({ message: "Failed to fetch trial discount" });
  }
});

router.post("/api/admin/settings/trial-discount", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { discountPercent } = req.body;
    if (discountPercent === undefined || isNaN(Number(discountPercent)) || Number(discountPercent) < 0 || Number(discountPercent) > 100) {
      return res.status(400).json({ message: "Discount must be between 0 and 100" });
    }
    await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('trial_discount_percent', ${String(discountPercent)}, now()) ON CONFLICT (key) DO UPDATE SET value = ${String(discountPercent)}, updated_at = now()`);
    res.json({ message: "Trial discount updated", discountPercent: String(discountPercent) });
  } catch (error: any) {
    console.error("Trial discount error:", error);
    res.status(500).json({ message: "Failed to update trial discount" });
  }
});


router.get("/api/admin/settings/tracking", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT key, value FROM app_settings WHERE key IN ('ga4_measurement_id', 'fb_pixel_id')`);
    const settings: Record<string, string> = {};
    for (const row of (result.rows as any[])) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch {
    res.status(500).json({ message: "Failed to fetch tracking settings" });
  }
});

router.post("/api/admin/settings/tracking", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { ga4MeasurementId, fbPixelId } = req.body;
    if (ga4MeasurementId !== undefined) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('ga4_measurement_id', ${ga4MeasurementId}, now()) ON CONFLICT (key) DO UPDATE SET value = ${ga4MeasurementId}, updated_at = now()`);
    }
    if (fbPixelId !== undefined) {
      await db.execute(sql`INSERT INTO app_settings (key, value, updated_at) VALUES ('fb_pixel_id', ${fbPixelId}, now()) ON CONFLICT (key) DO UPDATE SET value = ${fbPixelId}, updated_at = now()`);
    }
    invalidateAnalyticsCache();
    res.json({ message: "Tracking settings saved" });
  } catch (error: any) {
    console.error("Tracking settings error:", error);
    res.status(500).json({ message: "Failed to save tracking settings" });
  }
});

// ─── Public Tracking IDs (no auth needed, for injecting into HTML) ──────────
router.get("/api/settings/tracking", async (req: Request, res: Response) => {
  try {
    const result = await db.execute(sql`SELECT key, value FROM app_settings WHERE key IN ('ga4_measurement_id', 'fb_pixel_id') AND value != ''`);
    const settings: Record<string, string> = {};
    for (const row of (result.rows as any[])) {
      settings[row.key] = row.value;
    }
    res.json(settings);
  } catch {
    res.json({});
  }
});

// ─── Trigger Trial Emails ────────────────────────────────────────────────────
router.post("/api/admin/trigger-trial-emails", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { processTrialEmails } = await import("./trial-emails");
    const result = await processTrialEmails();
    res.json({
      message: "Trial emails processed successfully",
      processed: result.processed,
      emailsSent: result.emailsSent,
      errors: result.errors,
    });
  } catch (error: any) {
    console.error("Trial emails trigger error:", error);
    res.status(500).json({ message: "Failed to process trial emails", error: error.message });
  }
});

// ─── Custom Discount Email Blast ─────────────────────────────────────────────
router.post("/api/admin/send-custom-discount", requireAdminAuth, async (req: Request, res: Response) => {
  try {
    const { discountPercent, couponCode, minDaysExpired, discountType, discountMonthlyAmount, discountYearlyAmount } = req.body;
    if (!couponCode || !minDaysExpired) {
      return res.status(400).json({ message: "couponCode and minDaysExpired are required" });
    }
    const { processCustomDiscountEmails } = await import("./trial-emails");
    const result = await processCustomDiscountEmails({
      discountPercent: String(discountPercent || "0"),
      couponCode: String(couponCode),
      minDaysExpired: Number(minDaysExpired),
      discountType: discountType || undefined,
      discountMonthlyAmount: discountMonthlyAmount || undefined,
      discountYearlyAmount: discountYearlyAmount || undefined,
    });
    res.json({
      message: "Custom discount emails processed",
      ...result,
    });
  } catch (error: any) {
    console.error("Custom discount email error:", error);
    res.status(500).json({ message: "Failed to send custom discount emails", error: error.message });
  }
});

export default router;
