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
    return rows[0]?.value || "WELCOME-20";
  } catch {
    return "WELCOME-20";
  }
}

// Fetch full promo code details to determine discount type
async function getPromoCodeDetails(couponCode: string): Promise<{
  discountType: string;
  discountPercent: string;
  discountMonthlyAmount: string;
  discountYearlyAmount: string;
} | null> {
  try {
    const result = await db.execute(
      sql`SELECT discount_type, discount_percent, discount_monthly_amount, discount_yearly_amount 
          FROM promo_codes WHERE code = ${couponCode} AND is_active = true LIMIT 1`
    );
    const rows = result.rows as any[];
    if (!rows.length) return null;
    return {
      discountType: rows[0].discount_type || "percentage",
      discountPercent: rows[0].discount_percent || "0",
      discountMonthlyAmount: rows[0].discount_monthly_amount || "0",
      discountYearlyAmount: rows[0].discount_yearly_amount || "0",
    };
  } catch {
    return null;
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

// Build the discount display text based on discount type
function buildDiscountDisplay(opts: {
  discountType: string;
  discountPercent: string;
  discountMonthlyAmount?: string;
  discountYearlyAmount?: string;
}): { headline: string; subtitle: string; ctaLabel: string; subjectPrefix: string } {
  if (opts.discountType === "money") {
    const monthly = parseFloat(opts.discountMonthlyAmount || "0");
    const yearly = parseFloat(opts.discountYearlyAmount || "0");
    let amountText = "";
    if (monthly > 0 && yearly > 0) {
      amountText = `₹${monthly}/mo or ₹${yearly}/yr`;
    } else if (monthly > 0) {
      amountText = `₹${monthly}`;
    } else if (yearly > 0) {
      amountText = `₹${yearly}`;
    } else {
      amountText = "a special discount";
    }
    return {
      headline: `₹${Math.max(monthly, yearly)} OFF`,
      subtitle: `Save ${amountText} on any paid plan`,
      ctaLabel: `Claim ₹${Math.max(monthly, yearly)} Discount`,
      subjectPrefix: `₹${Math.max(monthly, yearly)} off`,
    };
  }
  
  // Percentage discount
  const pct = opts.discountPercent || "20";
  return {
    headline: `${pct}% OFF`,
    subtitle: `On any paid plan`,
    ctaLabel: `Claim ${pct}% Discount`,
    subjectPrefix: `${pct}% discount`,
  };
}

export async function processTrialEmails(): Promise<{ processed: number; emailsSent: string[]; errors: string[] }> {
  const result = { processed: 0, emailsSent: [] as string[], errors: [] as string[] };
  try {
    const now = new Date();

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

      // 3. Auto discount offer (24-72hrs after expiry) — uses WELCOME-20 coupon
      if (hoursSinceExpiry >= 24 && hoursSinceExpiry <= 72) {
        const sent = await hasEmailBeenSent(sub.userId, TRIAL_EMAIL_TYPES.DISCOUNT_OFFER);
        if (!sent) {
          const couponCode = await getTrialCouponCode();
          const promoDetails = await getPromoCodeDetails(couponCode);
          
          const discountType = promoDetails?.discountType || "percentage";
          const discountPercent = promoDetails?.discountPercent || await getTrialDiscount();
          const monthlyAmount = promoDetails?.discountMonthlyAmount || "0";
          const yearlyAmount = promoDetails?.discountYearlyAmount || "0";
          
          await sendTrialDiscountEmail(user.email, user.displayName || user.username, sub.planName, {
            discountType,
            discountPercent,
            discountMonthlyAmount: monthlyAmount,
            discountYearlyAmount: yearlyAmount,
            couponCode,
          }, appUrl);
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
  discountType?: string;
  discountMonthlyAmount?: string;
  discountYearlyAmount?: string;
}): Promise<{ processed: number; emailsSent: string[]; skipped: string[]; errors: string[] }> {
  const result = { processed: 0, emailsSent: [] as string[], skipped: [] as string[], errors: [] as string[] };
  try {
    const now = new Date();
    const minHoursExpired = options.minDaysExpired * 24;
    const emailType = `trial_custom_discount_${options.minDaysExpired}`;

    // If discount type not provided, try to fetch from promo code
    let discountType = options.discountType || "percentage";
    let monthlyAmount = options.discountMonthlyAmount || "0";
    let yearlyAmount = options.discountYearlyAmount || "0";
    let discountPercent = options.discountPercent;

    if (!options.discountType) {
      const promoDetails = await getPromoCodeDetails(options.couponCode);
      if (promoDetails) {
        discountType = promoDetails.discountType;
        monthlyAmount = promoDetails.discountMonthlyAmount;
        yearlyAmount = promoDetails.discountYearlyAmount;
        discountPercent = promoDetails.discountPercent;
      }
    }

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

      if (hoursSinceExpiry < minHoursExpired) {
        continue;
      }

      const anyDiscountSent = await hasRecentCustomDiscountBeenSent(sub.userId, 72);
      if (anyDiscountSent) {
        const userRows = await db.select({ email: users.email }).from(users).where(eq(users.id, sub.userId)).limit(1);
        result.skipped.push(`${userRows[0]?.email || sub.userId} (already received a custom discount email)`);
        continue;
      }

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
        {
          discountType,
          discountPercent,
          discountMonthlyAmount: monthlyAmount,
          discountYearlyAmount: yearlyAmount,
          couponCode: options.couponCode,
        },
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
      subject: `Your VisiCardly ${planName} trial is expiring soon`,
      html: buildModernEmail({
        iconEmoji: '⏰',
        title: 'Your Trial is Expiring Soon',
        subtitle: `About ${hoursLeft} hours remaining`,
        accentColor: '#f59e0b',
        body: `
          <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.7;">
            Hi <strong>${name}</strong>,
          </p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.7;">
            Your <strong>${planName}</strong> trial is expiring soon. Upgrade now to keep all your premium features — team management, premium themes, analytics, and QR codes.
          </p>
          <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
            <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">
              ⚠️ After your trial expires, your account will be moved to the Free plan and premium features will be disabled.
            </p>
          </div>
        `,
        ctaText: 'Upgrade Now',
        ctaUrl: `${appUrl}/dashboard?section=billing`,
      }),
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
      subject: `Your VisiCardly ${planName} trial has expired`,
      html: buildModernEmail({
        iconEmoji: '📋',
        title: 'Trial Expired',
        subtitle: `Your ${planName} trial has ended`,
        accentColor: '#ef4444',
        body: `
          <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.7;">
            Hi <strong>${name}</strong>,
          </p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.7;">
            Your <strong>${planName}</strong> trial has expired and your account has been moved to the <strong>Free plan</strong>. Your premium data is safely saved — upgrade anytime to restore everything.
          </p>
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 6px; font-size: 13px; color: #991b1b; font-weight: 600;">What's changed:</p>
            <ul style="margin: 0; padding-left: 16px; color: #991b1b; font-size: 13px; line-height: 1.8;">
              <li>Premium themes are disabled (switched to Minimal)</li>
              <li>Team members can no longer access their accounts</li>
              <li>Analytics, QR codes, and menu builder are locked</li>
            </ul>
          </div>
        `,
        ctaText: 'Upgrade to Restore',
        ctaUrl: `${appUrl}/dashboard?section=billing`,
      }),
    });
    console.log(`[Trial Emails] Sent expired notice to ${to}`);
  } catch (err) {
    console.error(`[Trial Emails] Failed to send expired notice to ${to}:`, err);
  }
}

async function sendTrialDiscountEmail(
  to: string,
  name: string,
  planName: string,
  discountInfo: {
    discountType: string;
    discountPercent: string;
    discountMonthlyAmount?: string;
    discountYearlyAmount?: string;
    couponCode: string;
  },
  appUrl: string
): Promise<void> {
  try {
    const display = buildDiscountDisplay(discountInfo);
    const billingUrl = `${appUrl}/dashboard?section=billing&promoCode=${encodeURIComponent(discountInfo.couponCode)}`;
    
    await sendEmailViaNodemailer({
      to,
      subject: `🎁 Special ${display.subjectPrefix} — Upgrade your VisiCardly plan!`,
      html: buildModernEmail({
        iconEmoji: '🎁',
        title: 'Special Offer Just for You!',
        subtitle: display.subtitle,
        accentColor: '#6C5CE7',
        body: `
          <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.7;">
            Hi <strong>${name}</strong>,
          </p>
          <p style="margin: 0 0 16px; font-size: 14px; color: #71717a; line-height: 1.7;">
            We noticed your <strong>${planName}</strong> trial expired recently. We'd love to have you back! Here's a special offer to upgrade your plan.
          </p>
          <div style="text-align: center; background: #fafafa; border: 2px dashed #6C5CE7; border-radius: 10px; padding: 24px; margin-bottom: 16px;">
            <p style="font-size: 40px; font-weight: 800; color: #6C5CE7; margin: 0; line-height: 1.2;">${display.headline}</p>
            <p style="color: #71717a; font-size: 13px; margin: 8px 0 0;">${display.subtitle}</p>
            <p style="font-size: 15px; font-weight: 700; color: #6C5CE7; margin: 12px 0 0; letter-spacing: 2px;">Code: ${discountInfo.couponCode}</p>
          </div>
          <div style="background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
            <p style="margin: 0 0 6px; font-size: 13px; color: #065f46; font-weight: 600;">What you'll get back:</p>
            <ul style="margin: 0; padding-left: 16px; color: #065f46; font-size: 13px; line-height: 1.8;">
              <li>All your premium data and settings restored</li>
              <li>Team member access re-enabled</li>
              <li>Premium themes, analytics, QR codes & more</li>
            </ul>
          </div>
        `,
        ctaText: display.ctaLabel,
        ctaUrl: billingUrl,
      }),
    });
    console.log(`[Trial Emails] Sent discount offer to ${to}`);
  } catch (err) {
    console.error(`[Trial Emails] Failed to send discount offer to ${to}:`, err);
  }
}

// Modern email template builder (matching email.ts design)
function buildModernEmail(opts: {
  iconEmoji: string;
  title: string;
  subtitle?: string;
  accentColor?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const accent = opts.accentColor || '#6C5CE7';
  const appUrl = process.env.APP_URL || 'https://visicardly.com';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden;">
          <tr>
            <td style="padding: 28px 32px 0; text-align: center;">
              <span style="font-size: 22px; font-weight: 800; color: ${accent}; letter-spacing: -0.5px;">VisiCardly</span>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 0; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: ${accent}12; margin: 0 auto 16px; line-height: 56px; font-size: 28px;">
                ${opts.iconEmoji}
              </div>
              <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #18181b; line-height: 1.3;">${opts.title}</h1>
              ${opts.subtitle ? `<p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;">${opts.subtitle}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px 0;">
              ${opts.body}
            </td>
          </tr>
          ${opts.ctaText && opts.ctaUrl ? `
          <tr>
            <td style="padding: 24px 32px 0; text-align: center;">
              <a href="${opts.ctaUrl}" style="display: inline-block; background: ${accent}; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; line-height: 1;">${opts.ctaText}</a>
            </td>
          </tr>` : ''}
          <tr>
            <td style="padding: 32px 32px 24px;">
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 0 0 20px;" />
              <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center; line-height: 1.6;">
                <a href="${appUrl}" style="color: ${accent}; text-decoration: none; font-weight: 600;">VisiCardly</a> · Digital Business Cards
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
