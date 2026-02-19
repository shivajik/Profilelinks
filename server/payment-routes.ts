import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { db } from "./storage";
import {
  pricingPlans,
  payments,
  userSubscriptions,
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from "@shared/schema";
import { eq, sql, desc } from "drizzle-orm";
import { fromZodError } from "zod-validation-error";

const router = Router();

function requireAuth(req: Request, res: Response, next: () => void) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// ─── Get all public pricing plans ──────────────────────────────────────────
router.get("/api/pricing/plans", async (req: Request, res: Response) => {
  try {
    const plans = await db
      .select()
      .from(pricingPlans)
      .where(eq(pricingPlans.isActive, true))
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
    const { planId, billingCycle } = result.data;

    const plans = await db.select().from(pricingPlans).where(sql`${pricingPlans.id} = ${planId}`);
    const plan = plans[0];
    if (!plan || !plan.isActive) {
      return res.status(404).json({ message: "Plan not found or inactive" });
    }

    const price = billingCycle === "yearly" ? parseFloat(plan.yearlyPrice) : parseFloat(plan.monthlyPrice);

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
      return res.json({ free: true, message: "Subscribed to free plan" });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
 
    if (!keyId || !keySecret) {
      return res.status(500).json({ message: "Payment gateway not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." });
    }

    // Amount in paise (INR smallest unit)
    const amountInPaise = Math.round(price * 100);

    const orderPayload = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        userId: req.session.userId!,
        planId,
        billingCycle,
      },
    };

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const response = await fetch("https://api.razorpay.com/v1/orders", {
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
      amount: (amountInPaise / 100).toString(),
      currency: "INR",
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

// ─── Verify Payment ────────────────────────────────────────────────────────
router.post("/api/payments/verify", requireAuth as any, async (req: Request, res: Response) => {
  try {
    const result = verifyPaymentSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: fromZodError(result.error).message });
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, planId, billingCycle } = result.data;

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
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

    res.json({ success: true, message: "Payment verified and subscription activated" });
  } catch (error: any) {
    console.error("Verify payment error:", error);
    res.status(500).json({ message: "Payment verification failed" });
  }
});

export default router;
