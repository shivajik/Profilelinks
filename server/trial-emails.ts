import { db } from "./storage";
import { userSubscriptions, pricingPlans, users } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmailViaNodemailer } from "./email";

// Email types for trial sequence
const TRIAL_EMAIL_TYPES = {
  HALFWAY_REMINDER: "trial_halfway_reminder",    // 1.5 days
  EXPIRED_NOTICE: "trial_expired_notice",         // after 3 days
  DISCOUNT_OFFER: "trial_discount_offer",         // 1 day after expiry
} as const;

async function getTrialDiscount(): Promise<string> {
  try {
    const result = await db.execute(
      sql`SELECT value FROM app_settings WHERE key = 'trial_discount_percent'`
    );
    const rows = result.rows as { value: string }[];
    return rows[0]?.value || "20";
  } catch {
    return "20";
  }
}

async function getTrialCouponCode(): Promise<string> {
  try {
    const result = await db.execute(
      sql`SELECT value FROM app_settings WHERE key = 'trial_discount_coupon_code'`
    );
    const rows = result.rows as { value: string }[];
    return rows[0]?.value || "JOIN-NOW-20";
  } catch {
    return "JOIN-NOW-20";
  }
}

async function hasEmailBeenSent(userId: string, emailType: string): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT 1 FROM trial_email_log WHERE user_id = ${userId} AND email_type = ${emailType} LIMIT 1`
    );
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function hasCustomDiscountBeenSent(userId: string, minDaysExpired: number): Promise<boolean> {
  try {
    const emailType = `trial_custom_discount_${minDaysExpired}`;
    const result = await db.execute(
      sql`SELECT 1 FROM trial_email_log WHERE user_id = ${userId} AND email_type = ${emailType} LIMIT 1`
    );
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function hasRecentCustomDiscountBeenSent(userId: string, cooldownHours: number = 72): Promise<boolean> {
  try {
    const result = await db.execute(
      sql`SELECT 1 FROM trial_email_log WHERE user_id = ${userId} AND email_type LIKE 'trial_custom_discount_%' AND sent_at > NOW() - INTERVAL '1 hour' * ${cooldownHours} LIMIT 1`
    );
    return (result.rows?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

async function logEmailSent(userId: string, emailType: string): Promise<void> {
  try {
    await db.execute(
      sql`INSERT INTO trial_email_log (id, user_id, email_type, sent_at) VALUES (gen_random_uuid(), ${userId}, ${emailType}, now())`
    );
  } catch (err) {
    console.error("[Trial Emails] Failed to log email:", err);
  }
}

export async function processTrialEmails(): Promise<{ processed: number; emailsSent: string[]; errors: string[] }> {
  const result = { processed: 0, emailsSent: [] as string[], errors: [] as string[] };
  try {
    const now = new Date();

    // Find all trial subscriptions (active OR expired)
    const trialSubs = await db
      .select({
        userId: userSubscriptions.userId,
        trialEndsAt: userSubscriptions.trialEndsAt,
        planName: pricingPlans.name,
        status: userSubscriptions.status,
      })
      .from(userSubscriptions)
      .innerJoin(pricingPlans, eq(userSubscriptions.planId, pricingPlans.id))
      .where(
        and(
          eq(userSubscriptions.isTrial, true),
          sql`${userSubscriptions.trialEndsAt} IS NOT NULL`
        )
      );

    console.log(`[Trial Emails] Found ${trialSubs.length} trial subscriptions`);

    for (const sub of trialSubs) {
      if (!sub.trialEndsAt) continue;
      result.processed++;

      const trialEnd = new Date(sub.trialEndsAt);
      const hoursUntilExpiry = (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
      const hoursSinceExpiry = -hoursUntilExpiry;

      // Get user email
      const userRows = await db
        .select({ email: users.email, username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, sub.userId))
        .limit(1);

      if (!userRows.length) {
        result.errors.push(`User ${sub.userId} not found`);
        continue;
      }
      const user = userRows[0];
      const appUrl = process.env.APP_URL || 'https://visicardly.com';

      console.log(`[Trial Emails] User ${user.email}: status=${sub.status}, hoursUntilExpiry=${hoursUntilExpiry.toFixed(1)}, hoursSinceExpiry=${hoursSinceExpiry.toFixed(1)}`);

      // 1. Halfway reminder (around 1.5 days = 36 hours remaining)
      if (hoursUntilExpiry > 0 && hoursUntilExpiry <= 36 && sub.status === "active") {
        const sent = await hasEmailBeenSent(sub.userId, TRIAL_EMAIL_TYPES.HALFWAY_REMINDER);
        if (!sent) {
          const remainingHours = Math.round(hoursUntilExpiry);
          await sendTrialReminderEmail(user.email, user.displayName || user.username, sub.planName, remainingHours, appUrl);
          await logEmailSent(sub.userId, TRIAL_EMAIL_TYPES.HALFWAY_REMINDER);
          result.emailsSent.push(`${user.email}: halfway reminder`);
        } else {
          console.log(`[Trial Emails] Already sent halfway reminder to ${user.email}`);
        }
      }

      // 2. Expired notice (trial ended)
      if (hoursSinceExpiry > 0 && hoursSinceExpiry <= 48) {
        const sent = await hasEmailBeenSent(sub.userId, TRIAL_EMAIL_TYPES.EXPIRED_NOTICE);
        if (!sent) {
          await sendTrialExpiredEmail(user.email, user.displayName || user.username, sub.planName, appUrl);
          await logEmailSent(sub.userId, TRIAL_EMAIL_TYPES.EXPIRED_NOTICE);
          result.emailsSent.push(`${user.email}: expired notice`);
        } else {
          console.log(`[Trial Emails] Already sent expired notice to ${user.email}`);
        }
      }

      // 3. Discount offer (1 day after expiry)
      if (hoursSinceExpiry >= 24 && hoursSinceExpiry <= 72) {
        const sent = await hasEmailBeenSent(sub.userId, TRIAL_EMAIL_TYPES.DISCOUNT_OFFER);
        if (!sent) {
          const discount = await getTrialDiscount();
          const couponCode = await getTrialCouponCode();
          await sendTrialDiscountEmail(user.email, user.displayName || user.username, sub.planName, discount, couponCode, appUrl);
          await logEmailSent(sub.userId, TRIAL_EMAIL_TYPES.DISCOUNT_OFFER);
          result.emailsSent.push(`${user.email}: discount offer`);
        } else {
          console.log(`[Trial Emails] Already sent discount offer to ${user.email}`);
        }
      }
    }
  } catch (err) {
    console.error("[Trial Emails] Error processing trial emails:", err);
    result.errors.push(String(err));
  }
  return result;
}

// Custom discount email for admin-triggered sends
export async function processCustomDiscountEmails(options: {
  discountPercent: string;
  couponCode: string;
  minDaysExpired: number;
}): Promise<{ processed: number; emailsSent: string[]; skipped: string[]; errors: string[] }> {
  const result = { processed: 0, emailsSent: [] as string[], skipped: [] as string[], errors: [] as string[] };
  try {
    const now = new Date();
    const minHoursExpired = options.minDaysExpired * 24;
    const emailType = `trial_custom_discount_${options.minDaysExpired}`;

    // Find all expired trial subscriptions
    const trialSubs = await db
      .select({
        userId: userSubscriptions.userId,
        trialEndsAt: userSubscriptions.trialEndsAt,
        planName: pricingPlans.name,
        status: userSubscriptions.status,
      })
      .from(userSubscriptions)
      .innerJoin(pricingPlans, eq(userSubscriptions.planId, pricingPlans.id))
      .where(
        and(
          eq(userSubscriptions.isTrial, true),
          sql`${userSubscriptions.trialEndsAt} IS NOT NULL`
        )
      );

    for (const sub of trialSubs) {
      if (!sub.trialEndsAt) continue;
      result.processed++;

      const trialEnd = new Date(sub.trialEndsAt);
      const hoursSinceExpiry = (now.getTime() - trialEnd.getTime()) / (1000 * 60 * 60);

      // Only send to users whose trial expired >= minDaysExpired ago
      if (hoursSinceExpiry < minHoursExpired) {
        continue;
      }

      // Check if ANY custom discount email was already sent to this user (prevent spam)
      const anyDiscountSent = await hasRecentCustomDiscountBeenSent(sub.userId, 72);
      if (anyDiscountSent) {
        const userRows = await db.select({ email: users.email }).from(users).where(eq(users.id, sub.userId)).limit(1);
        result.skipped.push(`${userRows[0]?.email || sub.userId} (already received a custom discount email)`);
        continue;
      }

      // Check if user has since purchased a plan (skip active non-trial subscriptions)
      const activeSubs = await db
        .select()
        .from(userSubscriptions)
        .where(sql`${userSubscriptions.userId} = ${sub.userId} AND ${userSubscriptions.status} = 'active' AND ${userSubscriptions.isTrial} = false`)
        .limit(1);
      if (activeSubs.length > 0) {
        const userRows = await db.select({ email: users.email }).from(users).where(eq(users.id, sub.userId)).limit(1);
        result.skipped.push(`${userRows[0]?.email || sub.userId} (already has active plan)`);
        continue;
      }

      const userRows = await db
        .select({ email: users.email, username: users.username, displayName: users.displayName })
        .from(users)
        .where(eq(users.id, sub.userId))
        .limit(1);

      if (!userRows.length) {
        result.errors.push(`User ${sub.userId} not found`);
        continue;
      }
      const user = userRows[0];
      const appUrl = process.env.APP_URL || 'https://visicardly.com';
      const daysSinceExpiry = Math.floor(hoursSinceExpiry / 24);

      await sendTrialDiscountEmail(
        user.email,
        user.displayName || user.username,
        sub.planName,
        options.discountPercent,
        options.couponCode,
        appUrl
      );
      await logEmailSent(sub.userId, emailType);
      result.emailsSent.push(`${user.email} (${daysSinceExpiry} days expired)`);
    }
  } catch (err) {
    console.error("[Trial Emails] Error processing custom discount emails:", err);
    result.errors.push(String(err));
  }
  return result;
}

async function sendTrialReminderEmail(to: string, name: string, planName: string, hoursLeft: number, appUrl: string): Promise<void> {
  try {
    await sendEmailViaNodemailer({
      to,
      subject: `⏰ Your visicardly ${planName} trial is expiring soon!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">Your Trial is Expiring Soon ⏰</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">About ${hoursLeft} hours remaining</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              Your visicardly<strong>${planName}</strong> trial is expiring soon. To keep all your premium features — including team management, premium themes, analytics, and QR codes — please upgrade your plan.
            </p>
            <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
              <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 500;">
                ⚠️ After your trial expires, your account will be moved to the Free plan and premium features will be disabled.
              </p>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${appUrl}/dashboard?section=billing"
                 style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
                Upgrade Now →
              </a>
            </div>
          </div>
          <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
            <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
            <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
          </div>
        </div>
      `,
    });
    console.log(`[Trial Emails] Sent halfway reminder to ${to}`);
  } catch (err) {
    console.error(`[Trial Emails] Failed to send reminder to ${to}:`, err);
  }
}

async function sendTrialExpiredEmail(to: string, name: string, planName: string, appUrl: string): Promise<void> {
  try {
    await sendEmailViaNodemailer({
      to,
      subject: `Your visicardly ${planName} trial has expired`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">Trial Expired</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">Your visicardly ${planName} trial has ended</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              Your <strong>${planName}</strong> trial has expired and your account has been moved to the <strong>Free plan</strong>. Your premium data is safely saved — upgrade anytime to restore everything.
            </p>
            <div style="background: #fef2f2; border-radius: 12px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
              <p style="color: #991b1b; font-size: 13px; margin: 0 0 8px; font-weight: 600;">What's changed:</p>
              <ul style="color: #991b1b; font-size: 13px; margin: 0; padding-left: 16px; line-height: 1.8;">
                <li>Premium themes are disabled (switched to Minimal)</li>
                <li>Team members can no longer access their accounts</li>
                <li>Analytics, QR codes, and menu builder are locked</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${appUrl}/dashboard?section=billing"
                 style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
                Upgrade to Restore →
              </a>
            </div>
          </div>
          <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
            <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
            <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
          </div>
        </div>
      `,
    });
    console.log(`[Trial Emails] Sent expired notice to ${to}`);
  } catch (err) {
    console.error(`[Trial Emails] Failed to send expired notice to ${to}:`, err);
  }
}

async function sendTrialDiscountEmail(to: string, name: string, planName: string, discountPercent: string, couponCode: string, appUrl: string): Promise<void> {
  try {
    const billingUrl = `${appUrl}/dashboard?section=billing&promoCode=${encodeURIComponent(couponCode)}`;
    await sendEmailViaNodemailer({
      to,
      subject: `🎁 Special ${discountPercent}% discount — Upgrade your VisiCardly plan!`,
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
          <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">🎁 Special Offer Just for You!</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0;">Get ${discountPercent}% off on any plan</p>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
              We noticed your <strong>${planName}</strong> trial expired recently. We'd love to have you back! Here's a special <strong>${discountPercent}% discount</strong> to upgrade your plan.
            </p>
            <div style="background: linear-gradient(135deg, #f0f0ff, #e8e5ff); border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px; border: 2px dashed #6C5CE7;">
              <p style="font-size: 48px; font-weight: 800; color: #6C5CE7; margin: 0;">${discountPercent}% OFF</p>
              <p style="color: #6b7280; font-size: 13px; margin: 8px 0 0;">On any paid plan</p>
              <p style="font-size: 16px; font-weight: 700; color: #6C5CE7; margin: 12px 0 0; letter-spacing: 2px;">Code: ${couponCode}</p>
            </div>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #10b981;">
              <p style="color: #065f46; font-size: 13px; margin: 0 0 8px; font-weight: 600;">What you'll get back:</p>
              <ul style="color: #065f46; font-size: 13px; margin: 0; padding-left: 16px; line-height: 1.8;">
                <li>All your premium data and settings restored</li>
                <li>Team member access re-enabled</li>
                <li>Premium themes, analytics, QR codes & more</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${billingUrl}"
                 style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
                Claim ${discountPercent}% Discount →
              </a>
            </div>
          </div>
          <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
            <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
            <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
          </div>
        </div>
      `,
    });
    console.log(`[Trial Emails] Sent discount offer to ${to}`);
  } catch (err) {
    console.error(`[Trial Emails] Failed to send discount offer to ${to}:`, err);
  }
}

// Start the trial email scheduler (runs every 30 minutes)
let trialEmailInterval: NodeJS.Timeout | null = null;

export function startTrialEmailScheduler(): void {
  if (trialEmailInterval) return;
  console.log("[Trial Emails] Scheduler started (every 30 min)");
  
  // Run after 1 minute of startup
  setTimeout(() => processTrialEmails(), 60 * 1000);
  
  // Then every 30 minutes
  trialEmailInterval = setInterval(() => processTrialEmails(), 30 * 60 * 1000);
}
