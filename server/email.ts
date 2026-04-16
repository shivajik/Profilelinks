import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { db } from "./storage";
import { sql } from "drizzle-orm";
import "dotenv/config";

let transporter: nodemailer.Transporter | null = null;

// ── NodeMailer (Gmail App Password) ─────────────────────────────────────
function getNodemailerTransporter(): nodemailer.Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASS,
      },
    });
  }
  return transporter;
}

export async function sendEmailViaNodemailer(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  try {
    const emailTransporter = getNodemailerTransporter();
    await emailTransporter.sendMail({
      from: `"VisiCardly" <${process.env.EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    return true;
  } catch (err) {
    console.error(`[NodeMailer] Failed to send email to ${opts.to}:`, err);
    return false;
  }
}

// ── SendGrid — Primary email transport ─────────────────────────────────────

async function getSendGridConfig(): Promise<{
  apiKey: string;
  fromEmail: string;
  fromName: string;
} | null> {
  try {
    const result = await db.execute(
      sql`SELECT key, value FROM app_settings WHERE key IN ('sendgrid_api_key', 'sendgrid_from_email', 'sendgrid_from_name')`
    );
    const rows = result.rows as { key: string; value: string }[];
    const map: Record<string, string> = {};
    rows.forEach((r) => { map[r.key] = r.value; });

    const apiKey = map["sendgrid_api_key"];
    if (!apiKey) return null;

    return {
      apiKey,
      fromEmail: map["sendgrid_from_email"] || "noreply@visicardly.com",
      fromName: map["sendgrid_from_name"] || "VisiCardly",
    };
  } catch {
    return null;
  }
}

async function sendEmailViaSendGrid(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const config = await getSendGridConfig();
  if (!config) {
    return { ok: false, error: "SendGrid not configured — set API key in Admin → Settings" };
  }

  try {
    sgMail.setApiKey(config.apiKey);
    await sgMail.send({
      to: opts.to,
      from: { email: config.fromEmail, name: config.fromName },
      subject: opts.subject,
      html: opts.html,
    });
    return { ok: true };
  } catch (err: any) {
    const code: number = err?.code ?? 0;
    const body = err?.response?.body;
    const sgErrors: string = body?.errors?.map((e: any) => e.message).join("; ") ?? "";

    let friendly = `SendGrid error (HTTP ${code})`;
    if (code === 401) {
      friendly = "SendGrid 401 Unauthorized — check that your API key is valid and has 'Mail Send' permission";
    } else if (code === 403) {
      friendly = "SendGrid 403 Forbidden — the sender email is not verified in SendGrid. Go to SendGrid → Settings → Sender Authentication and verify your sender.";
    } else if (sgErrors) {
      friendly += `: ${sgErrors}`;
    }

    console.error(`[SendGrid] Failed to send email to ${opts.to}: ${friendly}`, err);
    return { ok: false, error: friendly };
  }
}

// ── Unified email sender: NodeMailer primary, SendGrid fallback ──────────
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  // Try NodeMailer first (primary)
  if (process.env.EMAIL && process.env.PASS) {
    const nmResult = await sendEmailViaNodemailer(opts);
    if (nmResult) return true;
    console.warn(`[Email] NodeMailer failed for ${opts.to}, trying SendGrid fallback...`);
  }

  // Fallback to SendGrid if NodeMailer is not configured or failed
  const sgResult = await sendEmailViaSendGrid(opts);
  if (sgResult.ok) return true;

  if (sgResult.error?.includes("not configured")) {
    // Neither configured — try NodeMailer anyway as last resort
    if (!process.env.EMAIL || !process.env.PASS) {
      console.error(`[Email] No email transport configured. Set EMAIL and PASS env vars for NodeMailer.`);
      return false;
    }
    return sendEmailViaNodemailer(opts);
  }

  console.error(`[Email] All transports failed for ${opts.to}: ${sgResult.error}`);
  return false;
}

// ── Modern Email Template Wrapper ──────────────────────────────────────
function emailWrapper(opts: {
  preheader?: string;
  accentColor?: string;
  iconEmoji: string;
  title: string;
  subtitle?: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
  footerExtra?: string;
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
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  ${opts.preheader ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${opts.preheader}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%; background: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden;">
          
          <!-- Logo -->
          <tr>
            <td style="padding: 28px 32px 0; text-align: center;">
              <span style="font-size: 22px; font-weight: 800; color: ${accent}; letter-spacing: -0.5px;">VisiCardly</span>
            </td>
          </tr>

          <!-- Icon + Title -->
          <tr>
            <td style="padding: 24px 32px 0; text-align: center;">
              <div style="width: 56px; height: 56px; border-radius: 14px; background: ${accent}12; margin: 0 auto 16px; line-height: 56px; font-size: 28px;">
                ${opts.iconEmoji}
              </div>
              <h1 style="margin: 0 0 6px; font-size: 22px; font-weight: 700; color: #18181b; line-height: 1.3;">
                ${opts.title}
              </h1>
              ${opts.subtitle ? `<p style="margin: 0; font-size: 14px; color: #71717a; line-height: 1.5;">${opts.subtitle}</p>` : ''}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 24px 32px 0;">
              ${opts.body}
            </td>
          </tr>

          <!-- CTA -->
          ${opts.ctaText && opts.ctaUrl ? `
          <tr>
            <td style="padding: 24px 32px 0; text-align: center;">
              <a href="${opts.ctaUrl}" style="display: inline-block; background: ${accent}; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; line-height: 1;">
                ${opts.ctaText}
              </a>
            </td>
          </tr>` : ''}

          <!-- Footer -->
          <tr>
            <td style="padding: 32px 32px 24px;">
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 0 0 20px;" />
              ${opts.footerExtra || ''}
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

// ── Reusable UI helpers ──────────────────────────────────────────────
function infoBox(content: string, borderColor = '#e4e4e7', bgColor = '#fafafa'): string {
  return `<div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 16px; margin-bottom: 16px;">${content}</div>`;
}

function warningBox(content: string): string {
  return `<div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
    <p style="margin: 0; font-size: 13px; color: #92400e; line-height: 1.5;">${content}</p>
  </div>`;
}

// ── Email Templates ─────────────────────────────────────────────────

export async function sendInviteEmail(opts: {
  to: string;
  inviterName: string;
  teamName: string;
  inviteLink: string;
  role: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `You've been invited to join ${opts.teamName}`,
    html: emailWrapper({
      preheader: `${opts.inviterName} invited you to join ${opts.teamName} on VisiCardly`,
      iconEmoji: '✉️',
      title: "You're invited!",
      subtitle: `${opts.inviterName} wants you to join <strong>${opts.teamName}</strong>`,
      body: `
        <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.7;">
          You've been invited as a <strong style="color: #6C5CE7;">${opts.role}</strong> on VisiCardly. Accept the invitation to get started.
        </p>
        ${infoBox(`
          <p style="margin: 0; font-size: 13px; color: #71717a; line-height: 1.5;">
            Or copy this link:<br/>
            <a href="${opts.inviteLink}" style="color: #6C5CE7; word-break: break-all; font-size: 12px;">${opts.inviteLink}</a>
          </p>
        `)}
      `,
      ctaText: 'Accept Invitation',
      ctaUrl: opts.inviteLink,
      footerExtra: `<p style="margin: 0 0 12px; font-size: 12px; color: #a1a1aa; text-align: center;">If you didn't expect this invitation, you can safely ignore this email.</p>`,
    }),
  });
}

export async function sendCredentialsEmail(opts: {
  to: string;
  teamName: string;
  loginUrl: string;
  tempPassword: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Your account for ${opts.teamName} has been created`,
    html: emailWrapper({
      preheader: `Your VisiCardly account for ${opts.teamName} is ready`,
      accentColor: '#6C5CE7',
      iconEmoji: '🔑',
      title: `Welcome to ${opts.teamName}!`,
      subtitle: 'Your account is ready — log in with the credentials below',
      body: `
        ${infoBox(`
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 13px; width: 130px;">Email</td>
              <td style="padding: 6px 0; color: #18181b; font-size: 14px; font-weight: 500;">${opts.to}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 13px;">Temporary Password</td>
              <td style="padding: 6px 0;">
                <code style="background: #f4f4f5; color: #6C5CE7; padding: 3px 8px; border-radius: 4px; font-size: 14px; font-weight: 600;">${opts.tempPassword}</code>
              </td>
            </tr>
          </table>
        `)}
        ${warningBox('⚠️ You will be asked to change your password on first login.')}
      `,
      ctaText: 'Log In Now',
      ctaUrl: opts.loginUrl,
      footerExtra: `<p style="margin: 0 0 12px; font-size: 12px; color: #a1a1aa; text-align: center;">If you didn't expect this, please contact your team administrator.</p>`,
    }),
  });
}

export async function sendVerificationOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Your VisiCardly Verification Code: ${opts.otp}`,
    html: emailWrapper({
      preheader: `Your verification code is ${opts.otp}`,
      iconEmoji: '🔐',
      title: 'Email Verification',
      subtitle: 'Enter this code to verify your email address',
      body: `
        <div style="text-align: center; background: #fafafa; border: 2px dashed #d4d4d8; border-radius: 10px; padding: 20px; margin-bottom: 16px;">
          <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6C5CE7; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${opts.otp}</p>
        </div>
        <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">This code expires in 10 minutes.</p>
      `,
    }),
  });
}

export async function sendPasswordResetOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Password Reset Code: ${opts.otp}`,
    html: emailWrapper({
      preheader: `Your password reset code is ${opts.otp}`,
      iconEmoji: '🔑',
      title: 'Password Reset',
      subtitle: 'Use this code to reset your password',
      body: `
        <div style="text-align: center; background: #fafafa; border: 2px dashed #d4d4d8; border-radius: 10px; padding: 20px; margin-bottom: 16px;">
          <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6C5CE7; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${opts.otp}</p>
        </div>
        <p style="margin: 0; font-size: 13px; color: #a1a1aa; text-align: center;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
      `,
    }),
  });
}

export async function sendSignupOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmail({
    to: opts.to,
    subject: `Your VisiCardly sign up code: ${opts.otp}`,
    html: emailWrapper({
      preheader: `Your sign up verification code is ${opts.otp}`,
      iconEmoji: '👋',
      title: 'Confirm your email',
      subtitle: 'Use this one-time code to finish creating your account',
      body: `
        <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.7;">
          Welcome! Enter the code below on the registration screen to continue.
        </p>
        <div style="text-align: center; background: #fafafa; border: 2px dashed #d4d4d8; border-radius: 10px; padding: 20px; margin-bottom: 16px;">
          <p style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #6C5CE7; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${opts.otp}</p>
        </div>
        ${infoBox(`
          <p style="margin: 0 0 6px; color: #18181b; font-size: 13px; font-weight: 600;">Before you continue:</p>
          <ul style="margin: 0; padding-left: 16px; color: #71717a; font-size: 13px; line-height: 1.8;">
            <li>This code expires in <strong>10 minutes</strong></li>
            <li>Use the same email you entered during sign up</li>
            <li>If you didn't request this, ignore this email</li>
          </ul>
        `)}
      `,
      ctaText: 'Open VisiCardly',
      ctaUrl: appUrl,
    }),
  });
}

export async function sendPackageUpgradeEmail(opts: {
  to: string;
  planName: string;
  previousPlan: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmail({
    to: opts.to,
    subject: `Your VisiCardly plan is now ${opts.planName}`,
    html: emailWrapper({
      preheader: `Your plan has been upgraded from ${opts.previousPlan} to ${opts.planName}`,
      accentColor: '#10b981',
      iconEmoji: '🚀',
      title: 'Plan Updated!',
      subtitle: `You're now on the <strong>${opts.planName}</strong> plan`,
      body: `
        ${infoBox(`
          <p style="margin: 0; font-size: 14px; color: #3f3f46; line-height: 1.6;">
            Your account has been upgraded from <strong>${opts.previousPlan}</strong> to <strong style="color: #10b981;">${opts.planName}</strong>. All features are now active.
          </p>
        `, '#d1fae5', '#ecfdf5')}
      `,
      ctaText: 'Open Dashboard',
      ctaUrl: `${appUrl}/dashboard`,
    }),
  });
}

export async function sendPackageExpiryEmail(opts: {
  to: string;
  planName: string;
  expiryDate: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmail({
    to: opts.to,
    subject: `Your ${opts.planName} plan is expiring soon`,
    html: emailWrapper({
      preheader: `Your ${opts.planName} plan expires on ${opts.expiryDate}`,
      accentColor: '#f59e0b',
      iconEmoji: '⏳',
      title: 'Plan Expiry Notice',
      subtitle: `Your <strong>${opts.planName}</strong> plan expires on <strong>${opts.expiryDate}</strong>`,
      body: `
        <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.7;">
          Renew now to keep all your features active and avoid any interruption.
        </p>
      `,
      ctaText: 'Renew Now',
      ctaUrl: `${appUrl}/dashboard?section=billing`,
    }),
  });
}

export async function sendWelcomeEmail(opts: {
  to: string;
  username: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmail({
    to: opts.to,
    subject: `Welcome to VisiCardly, ${opts.username}!`,
    html: emailWrapper({
      preheader: `Your VisiCardly profile is ready — start customizing it now`,
      iconEmoji: '🎉',
      title: `Welcome, ${opts.username}!`,
      subtitle: 'Your digital business card is ready to go',
      body: `
        <p style="margin: 0 0 16px; font-size: 14px; color: #3f3f46; line-height: 1.7;">
          Thanks for joining VisiCardly! Create your stunning digital card, add links, social profiles, and share your online presence with one custom link.
        </p>
        ${infoBox(`
          <p style="margin: 0 0 8px; color: #18181b; font-size: 13px; font-weight: 600;">Here's what you can do:</p>
          <ul style="margin: 0; padding-left: 16px; color: #71717a; font-size: 13px; line-height: 2;">
            <li>Add unlimited links and social profiles</li>
            <li>Choose from 30+ beautiful themes</li>
            <li>Share your profile with a QR code</li>
            <li>Track visitors with analytics</li>
          </ul>
        `)}
      `,
      ctaText: 'Go to Dashboard',
      ctaUrl: `${appUrl}/dashboard`,
      footerExtra: `
        <p style="margin: 0 0 12px; font-size: 12px; color: #a1a1aa; text-align: center;">
          Your profile: <a href="${appUrl}/${opts.username}" style="color: #6C5CE7; font-weight: 600;">${appUrl}/${opts.username}</a>
        </p>
      `,
    }),
  });
}

export async function sendPaymentConfirmationEmail(opts: {
  to: string;
  username: string;
  planName: string;
  amount: string;
  currency: string;
  billingCycle: string;
  invoiceNo: string;
  date: string;
  orderId?: string;
  paymentId?: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmail({
    to: opts.to,
    subject: `Payment Confirmation — ${opts.planName} Plan`,
    html: emailWrapper({
      preheader: `Payment of ₹${opts.amount} received for ${opts.planName} plan`,
      accentColor: '#10b981',
      iconEmoji: '✅',
      title: 'Payment Successful!',
      subtitle: `Thank you for your purchase, ${opts.username}`,
      body: `
        <div style="background: #fafafa; border: 1px solid #e4e4e7; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 1px solid #e4e4e7;">
            <div>
              <p style="font-weight: 700; font-size: 15px; margin: 0; color: #18181b;">VisiCardly</p>
              <p style="font-size: 11px; color: #a1a1aa; margin: 3px 0 0;">visicardly.com</p>
            </div>
            <div style="text-align: right;">
              <p style="font-size: 12px; font-weight: 600; margin: 0; color: #18181b;">${opts.invoiceNo}</p>
              <p style="font-size: 11px; color: #a1a1aa; margin: 3px 0 0;">${opts.date}</p>
            </div>
          </div>

          <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #a1a1aa; font-weight: 600; margin: 0 0 4px;">From</p>
          <p style="font-size: 12px; color: #3f3f46; margin: 0; font-weight: 600;">KSoft Solution</p>
          <p style="font-size: 11px; color: #71717a; margin: 2px 0;">T-16, Software Technology Parks of India,</p>
          <p style="font-size: 11px; color: #71717a; margin: 2px 0;">Chikhalthana MIDC, Chhatrapati Sambhaji Nagar, 431008, Maharashtra.</p>

          <div style="margin-top: 14px; border-top: 1px solid #e4e4e7; padding-top: 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #f4f4f5;">
                <td style="padding: 8px 0; font-size: 12px; color: #71717a;">Plan</td>
                <td style="padding: 8px 0; font-size: 12px; color: #18181b; text-align: right; font-weight: 600;">${opts.planName}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f4f4f5;">
                <td style="padding: 8px 0; font-size: 12px; color: #71717a;">Billing Cycle</td>
                <td style="padding: 8px 0; font-size: 12px; color: #18181b; text-align: right; text-transform: capitalize;">${opts.billingCycle}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-size: 14px; color: #18181b; font-weight: 700;">Total</td>
                <td style="padding: 10px 0; font-size: 16px; color: #10b981; text-align: right; font-weight: 700;">₹${opts.amount} ${opts.currency}</td>
              </tr>
            </table>
          </div>

          ${opts.orderId ? `<p style="font-size: 10px; color: #a1a1aa; margin: 10px 0 0;">Order ID: ${opts.orderId}</p>` : ''}
          ${opts.paymentId ? `<p style="font-size: 10px; color: #a1a1aa; margin: 2px 0 0;">Payment ID: ${opts.paymentId}</p>` : ''}
        </div>
      `,
      ctaText: 'View Dashboard',
      ctaUrl: `${appUrl}/dashboard?section=billing`,
      footerExtra: `
        <p style="margin: 0 0 12px; font-size: 11px; color: #a1a1aa; text-align: center;">
          Powered by <a href="https://ksoftsolution.com" target="_blank" style="color: #6C5CE7; text-decoration: none; font-weight: 600;">KSoft Solution</a>
        </p>
      `,
    }),
  });
}

// ── Email Blast — uses NodeMailer primary, SendGrid fallback ──────────────

export async function sendBulkTemplateEmail(opts: {
  subject: string;
  body: string;
  recipients: { email: string; username: string; displayName?: string | null }[];
}): Promise<{ sent: number; failed: number; total: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  const hasNodemailer = !!(process.env.EMAIL && process.env.PASS);
  const sgConfig = await getSendGridConfig();

  if (!hasNodemailer && !sgConfig) {
    const msg = "No email transport configured — set EMAIL and PASS env vars for NodeMailer, or configure SendGrid in Admin → Settings";
    console.error(`[Email Blast] ${msg}`);
    return { sent: 0, failed: opts.recipients.length, total: opts.recipients.length, errors: [msg] };
  }

  for (const recipient of opts.recipients) {
    try {
      const personalizedBody = opts.body
        .replace(/\r\n/g, "\n")
        .replace(/\n/g, "<br>")
        .replace(/\{\{username\}\}/g, recipient.username || "")
        .replace(/\{\{email\}\}/g, recipient.email || "")
        .replace(/\{\{displayName\}\}/g, recipient.displayName || recipient.username || "");

      const personalizedSubject = opts.subject
        .replace(/\{\{username\}\}/g, recipient.username || "")
        .replace(/\{\{email\}\}/g, recipient.email || "")
        .replace(/\{\{displayName\}\}/g, recipient.displayName || recipient.username || "");

      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 20px;">
          ${personalizedBody}
          <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 30px 0;" />
          <p style="color: #a1a1aa; font-size: 12px;">VisiCardly · Digital Business Cards</p>
        </div>
      `;

      // Try NodeMailer first, then SendGrid fallback
      const emailSent = await sendEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html: emailHtml,
      });

      if (emailSent) {
        sent++;
      } else {
        failed++;
        if (!errors.includes("Email delivery failed")) {
          errors.push("Email delivery failed");
        }
      }
    } catch (err: any) {
      console.error(`[Email Blast] Unexpected error for ${recipient.email}:`, err);
      failed++;
    }
  }

  return { sent, failed, total: opts.recipients.length, errors };
}

// ── Contact Form Notification ──────────────────────────────────────
export async function sendContactFormEmail(opts: {
  to: string;
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
  profileName: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `New Contact Form Submission — ${opts.subject}`,
    html: emailWrapper({
      preheader: `New message from ${opts.senderName} via your VisiCardly profile`,
      iconEmoji: '📬',
      title: 'New Contact Form Submission',
      subtitle: `From your VisiCardly profile: ${opts.profileName}`,
      body: `
        ${infoBox(`
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 13px; width: 80px; vertical-align: top;">Name</td>
              <td style="padding: 6px 0; color: #18181b; font-size: 14px;">${opts.senderName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 13px; vertical-align: top;">Email</td>
              <td style="padding: 6px 0; color: #18181b; font-size: 14px;"><a href="mailto:${opts.senderEmail}" style="color: #6C5CE7;">${opts.senderEmail}</a></td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #71717a; font-size: 13px; vertical-align: top;">Subject</td>
              <td style="padding: 6px 0; color: #18181b; font-size: 14px;">${opts.subject}</td>
            </tr>
          </table>
        `)}
        <div style="background: #fafafa; border-radius: 8px; padding: 14px 16px; white-space: pre-wrap; font-size: 14px; color: #3f3f46; line-height: 1.6; border: 1px solid #e4e4e7;">
          ${opts.message}
        </div>
      `,
      footerExtra: `<p style="margin: 0 0 12px; font-size: 12px; color: #a1a1aa; text-align: center;">This message was sent via the contact form on your VisiCardly profile.</p>`,
    }),
  });
}
