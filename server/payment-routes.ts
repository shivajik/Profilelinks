import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db, storage } from "./storage";
import {
  pricingPlans,
  payments,
  userSubscriptions,
  users,
  promoCodes,
  affiliates,
  affiliateReferrals,
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";
import { apiFetch } from "@/lib/queryClient";

const router = Router();

function normalizeBillingCycleScope(scope: unknown): "monthly" | "yearly" | "both" {
  const normalized = String(scope ?? "").trim().toLowerCase();
  if (["monthly", "month", "monthly only", "monthly_only"].includes(normalized)) return "monthly";
  if (["yearly", "annual", "annually", "year", "yearly only", "yearly_only"].includes(normalized)) return "yearly";
  if (normalized === "both") return "both";
  return "both";
}

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

async function getAppSettingValue(key: string): Promise<string | undefined> {
  try {
    const result = await db.execute(sql`SELECT value FROM app_settings WHERE key = ${key} LIMIT 1`);
    const row = (result.rows?.[0] ?? null) as { value?: unknown } | null;
    if (typeof row?.value === "string" && row.value.trim()) {
      return row.value.trim();
    }
  } catch {
    // app_settings table may not exist yet
  }

  return undefined;
}

// ─── Get all public pricing plans ──────────────────────────────────────────
router.get("/api/pricing/plans", async (req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(pricingPlans)
      .where(and(eq(pricingPlans.isActive, true), eq(pricingPlans.isLtd, false)))
      .orderBy(pricingPlans.sortOrder);
    res.json(plans);
  } catch (error: any) {
    console.error("Fetch plans error:", error);
    res.status(500).json({ message: "Failed to fetch plans" });
  }
});

// ─── Get user's current subscription ───────────────────────────────────────
router.get("/api/payments/subscription", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const subs = await db
      .select({
        id: userSubscriptions.id,
        status: userSubscriptions.status,
        billingCycle: userSubscriptions.billingCycle,
        currentPeriodEnd: userSubscriptions.currentPeriodEnd,
        planId: userSubscriptions.planId,
        planName: pricingPlans.name,
        planMonthlyPrice: pricingPlans.monthlyPrice,
        planYearlyPrice: pricingPlans.yearlyPrice,
        isTrial: userSubscriptions.isTrial,
        trialEndsAt: userSubscriptions.trialEndsAt,
      })
      .from(userSubscriptions)
      .leftJoin(pricingPlans, sql`${userSubscriptions.planId} = ${pricingPlans.id}`)
      .where(sql`${userSubscriptions.userId} = ${req.session.userId}`)
      .orderBy(desc(userSubscriptions.createdAt))
      .limit(1);

    res.json(subs[0] ?? null);
  } catch (error: any) {
    console.error("Subscription error:", error);
    res.status(500).json({ message: "Failed to fetch subscription" });
  }
});

// ─── Create Razorpay Order ─────────────────────────────────────────────────
router.post("/api/payments/create-order", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const result = createPaymentOrderSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }
    const { planId, billingCycle, currency, promoCode } = result.data;

    const plans = await db.select().from(pricingPlans).where(sql`${pricingPlans.id} = ${planId}`);
    const plan = plans[0];
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: "Plan not found or inactive" });
    }

    const useUsd = currency === "USD" && parseFloat(billingCycle === "yearly" ? plan.yearlyPriceUsd : plan.monthlyPriceUsd) > 0;
    let price = useUsd
      ? (billingCycle === "yearly" ? parseFloat(plan.yearlyPriceUsd) : parseFloat(plan.monthlyPriceUsd))
      : (billingCycle === "yearly" ? parseFloat(plan.yearlyPrice) : parseFloat(plan.monthlyPrice));
    const orderCurrency = useUsd ? "USD" : "INR";

    // Apply promo code discount
    let appliedPromoId: string | null = null;
    if (promoCode) {
      const [code] = await db.select().from(promoCodes).where(eq(promoCodes.code, promoCode.toUpperCase()));
      if (!code) return res.status(400).json({ message: "Invalid promo code" });
      if (!code.isActive) return res.status(400).json({ message: "This promo code is no longer active" });
      if (code.maxUses && code.maxUses > 0 && code.currentUses >= code.maxUses) return res.status(400).json({ message: "This promo code has reached its usage limit" });
      if (code.expiresAt && new Date(code.expiresAt) <= new Date()) return res.status(400).json({ message: "This promo code has expired" });
      if (plan.isLtd && !code.appliesToLtd) return res.status(400).json({ message: "This coupon is not valid for LTD plans" });
      if (!plan.isLtd && !code.appliesToRegular) return res.status(400).json({ message: "This coupon is not valid for regular plans" });
      if (code.planId && code.planId !== planId) return res.status(400).json({ message: "This coupon is not valid for the selected plan" });

      // Check billing cycle scope
      const codeBillingScope = normalizeBillingCycleScope((code as any).billingCycleScope);
      if (codeBillingScope !== "both" && codeBillingScope !== billingCycle) {
        return res.status(400).json({ message: `This coupon is only valid for ${codeBillingScope} billing` });
      }

      const codeDiscountType = code.discountType || "percentage";
      if (codeDiscountType === "money") {
        // Fixed monetary discount
        const fixedAmount = billingCycle === "yearly"
          ? parseFloat(code.discountYearlyAmount || "0")
          : parseFloat(code.discountMonthlyAmount || "0");
        price = Math.max(0, price - fixedAmount);
      } else {
        // Percentage discount
        const discount = parseFloat(code.discountPercent);
        price = Math.max(0, Math.round(price * (1 - discount / 100)));
      }
      appliedPromoId = code.id;
    }

    if (price === 0) {
      // Free plan — create subscription directly
      await db.insert(userSubscriptions).values({
        userId: req.session.userId!,
        planId,
        status: "active",
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: billingCycle === "yearly"
          ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      // Increment promo code usage for free (100% discount) orders
      if (promoCode && appliedPromoId) {
        const [code] = await db.select().from(promoCodes).where(eq(promoCodes.code, promoCode.toUpperCase()));
        if (code) {
          await db.update(promoCodes).set({ currentUses: code.currentUses + 1 }).where(eq(promoCodes.id, code.id));
        }
      }

      // If team plan, auto-upgrade user
      if (plan.planType === "team") {
        const user = await storage.getUser(req.session.userId!);
        if (user && user.accountType !== "team") {
          const team = await storage.createTeam({
            name: user.displayName ? `${user.displayName}'s Team` : `${user.username}'s Team`,
            size: "1-5",
            ownerId: user.id,
          });
          await storage.addTeamMember({
            teamId: team.id,
            userId: user.id,
            role: "owner",
            status: "activated",
          });
          await storage.updateUser(user.id, { accountType: "team", teamId: team.id });
        }
      }

      return res.json({ free: true, message: "Subscribed to free plan" });
    }

    // Read payment keys from DB first, fallback to env
    const keyIdFromDb = await getAppSettingValue("razorpay_key_id");
    const keySecretFromDb = await getAppSettingValue("razorpay_key_secret");
    const keyId = keyIdFromDb ?? process.env.RAZORPAY_KEY_ID;
    const keySecret = keySecretFromDb ?? process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ message: "Payment gateway not configured. Admin needs to set Razorpay keys in Settings." });
    }

    // Amount in smallest unit (paise for INR, cents for USD)
    const amountInSmallestUnit = Math.round(price * 100);

    const orderPayload = {
      amount: amountInSmallestUnit,
      currency: orderCurrency,
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: req.session.userId!,
        planId,
        billingCycle,
      },
    };

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await apiFetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Razorpay order error:", errText);
      return res.status(500).json({ message: "Failed to create payment order" });
    }

    const order = await response.json() as { id: string; amount: number; currency: string };

    // Store pending payment record
    await db.insert(payments).values({
      userId: req.session.userId!,
      planId,
      amount: (amountInSmallestUnit / 100).toString(),
      currency: orderCurrency,
      status: "pending",
      razorpayOrderId: order.id,
      billingCycle,
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId,
      planName: plan.name,
    });
  } catch (error: any) {
    console.error("Create order error:", error);
    res.status(500).json({ message: "Failed to create payment order" });
  }
});

// ─── Resume Pending Payment ───────────────────────────────────────────────
router.post("/api/payments/resume-order", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.body;
    if (!paymentId) {
      return res.status(400).json({ message: "Payment ID is required" });
    }

    // Find the pending payment
    const paymentRecords = await db.select().from(payments).where(sql`${payments.id} = ${paymentId} AND ${payments.userId} = ${req.session.userId}`);
    const payment = paymentRecords[0];
    
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }
    
    if (payment.status !== "pending") {
      return res.status(400).json({ message: "This payment is no longer pending" });
    }
    
    if (!payment.razorpayOrderId) {
      return res.status(400).json({ message: "Invalid payment record — no order ID" });
    }

    // Get Razorpay keys
    const keyIdFromDb = await getAppSettingValue("razorpay_key_id");
    const keyId = keyIdFromDb ?? process.env.RAZORPAY_KEY_ID;
    
    if (!keyId) {
      return res.status(500).json({ message: "Payment gateway not configured" });
    }

    // Return order details for the frontend to resume payment
    res.json({
      orderId: payment.razorpayOrderId,
      amount: Math.round(parseFloat(payment.amount) * 100), // Convert back to paise
      currency: payment.currency,
      keyId,
    });
  } catch (error: any) {
    console.error("Resume order error:", error);
    res.status(500).json({ message: "Failed to resume payment" });
  }
});

// ─── Verify Payment ────────────────────────────────────────────────────────
router.get("/api/payments/history", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const history = await db
      .select({
        id: payments.id,
        planId: payments.planId,
        amount: payments.amount,
        currency: payments.currency,
        status: payments.status,
        billingCycle: payments.billingCycle,
        razorpayOrderId: payments.razorpayOrderId,
        razorpayPaymentId: payments.razorpayPaymentId,
        createdAt: payments.createdAt,
        planName: pricingPlans.name,
        planDescription: pricingPlans.description,
      })
      .from(payments)
      .leftJoin(pricingPlans, sql`${payments.planId} = ${pricingPlans.id}`)
      .where(sql`${payments.userId} = ${req.session.userId}`)
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(sql`${payments.userId} = ${req.session.userId}`);

    res.json({ payments: history, total: Number(totalResult?.count ?? 0), page, limit });
  } catch (error: any) {
    console.error("Payment history error:", error);
    res.status(500).json({ message: "Failed to fetch payment history" });
  }
});

// ─── Verify Payment ────────────────────────────────────────────────────────
router.post("/api/payments/verify", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const result = verifyPaymentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId, billingCycle, promoCode } = result.data;

    const keySecretFromDb = await getAppSettingValue("razorpay_key_secret");
    const keySecret = keySecretFromDb ?? process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ message: "Payment gateway not configured" });
    }

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: "Payment verification failed — invalid signature" });
    }

    if (promoCode) {
      const [paymentPlan] = await db.select({ isLtd: pricingPlans.isLtd }).from(pricingPlans).where(eq(pricingPlans.id, planId));
      const [code] = await db.select().from(promoCodes).where(eq(promoCodes.code, promoCode.toUpperCase()));
      if (paymentPlan && code && code.isActive && (!code.maxUses || code.maxUses === 0 || code.currentUses < code.maxUses) && (!code.expiresAt || new Date(code.expiresAt) > new Date())) {
        const scopeMatches = paymentPlan.isLtd ? code.appliesToLtd : code.appliesToRegular;
        const planMatches = !code.planId || code.planId === planId;
        const codeBillingScope = normalizeBillingCycleScope((code as any).billingCycleScope);
        const billingScopeMatches = codeBillingScope === "both" || codeBillingScope === billingCycle;
        if (scopeMatches && planMatches && billingScopeMatches) {
          await db.update(promoCodes).set({ currentUses: code.currentUses + 1 }).where(eq(promoCodes.id, code.id));
        }
      }
    }

    // Update payment record to success
    await db
      .update(payments)
      .set({
        status: "success",
        razorpayPaymentId,
        razorpaySignature,
        updatedAt: new Date(),
      })
      .where(sql`${payments.razorpayOrderId} = ${razorpayOrderId}`);

    // Upsert user subscription
    const existing = await db
      .select()
      .from(userSubscriptions)
      .where(sql`${userSubscriptions.userId} = ${req.session.userId}`)
      .limit(1);

    const periodEnd = billingCycle === "yearly"
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (existing.length > 0) {
      await db
        .update(userSubscriptions)
        .set({
          planId,
          status: "active",
          billingCycle,
          currentPeriodStart: new Date(),
          currentPeriodEnd: periodEnd,
          updatedAt: new Date(),
        })
        .where(sql`${userSubscriptions.userId} = ${req.session.userId}`);
    } else {
      await db.insert(userSubscriptions).values({
        userId: req.session.userId!,
        planId,
        status: "active",
        billingCycle,
        currentPeriodStart: new Date(),
        currentPeriodEnd: periodEnd,
      });
    }

    // If this is a team plan, auto-upgrade user to team
    const planRows = await db.select().from(pricingPlans).where(sql`${pricingPlans.id} = ${planId}`);
    const purchasedPlan = planRows[0];
    if (purchasedPlan && purchasedPlan.planType === "team") {
      const user = await storage.getUser(req.session.userId!);
      if (user && user.accountType !== "team") {
        // Create a team for this user
        const team = await storage.createTeam({
          name: user.displayName ? `${user.displayName}'s Team` : `${user.username}'s Team`,
          size: "1-5",
          ownerId: user.id,
        });
        await storage.addTeamMember({
          teamId: team.id,
          userId: user.id,
          role: "owner",
          status: "activated",
        });
        await storage.updateUser(user.id, { accountType: "team", teamId: team.id });
      }
    }

    // Track affiliate commission if user was referred
    const [referral] = await db.select().from(affiliateReferrals)
      .where(sql`${affiliateReferrals.referredUserId} = ${req.session.userId} AND ${affiliateReferrals.status} = 'pending'`);
    
    if (referral) {
      const [affiliate] = await db.select().from(affiliates).where(sql`${affiliates.id} = ${referral.affiliateId}`);
      if (affiliate) {
        // Get actual payment amount
        const [paymentRecord] = await db.select().from(payments)
          .where(sql`${payments.razorpayOrderId} = ${razorpayOrderId}`);
        const paymentAmount = paymentRecord ? parseFloat(paymentRecord.amount) : 0;
        const commission = Math.round(paymentAmount * parseFloat(affiliate.commissionRate) / 100 * 100) / 100;

        await db.update(affiliateReferrals).set({
          status: "converted",
          paymentId: paymentRecord?.id,
          commissionAmount: commission.toString(),
        }).where(sql`${affiliateReferrals.id} = ${referral.id}`);

        await db.update(affiliates).set({
          totalEarnings: sql`${affiliates.totalEarnings} + ${commission}`,
        }).where(sql`${affiliates.id} = ${affiliate.id}`);
      }
    }

    // Send payment confirmation email
    const user = await storage.getUser(req.session.userId!);
    if (user) {
      const [paymentRecord] = await db.select().from(payments).where(sql`${payments.razorpayOrderId} = ${razorpayOrderId}`);
      const planRows2 = await db.select().from(pricingPlans).where(sql`${pricingPlans.id} = ${planId}`);
      const planForEmail = planRows2[0];
      if (paymentRecord) {
        import("./email").then(({ sendPaymentConfirmationEmail }) => {
          sendPaymentConfirmationEmail({
            to: user.email,
            username: user.username,
            planName: planForEmail?.name ?? "Subscription",
            amount: parseFloat(paymentRecord.amount).toLocaleString(),
            currency: paymentRecord.currency,
            billingCycle,
            invoiceNo: `INV-${paymentRecord.id.slice(0, 8).toUpperCase()}`,
            date: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
            orderId: razorpayOrderId,
            paymentId: razorpayPaymentId,
          }).catch(() => {});
        });
      }
    }

    res.json({ success: true, message: "Payment verified and subscription activated" });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

export default router;
