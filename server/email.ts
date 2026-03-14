import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { db } from "./storage";
import { sql } from "drizzle-orm";
import "dotenv/config";

let transporter: nodemailer.Transporter | null = null;

// ── Email Provider Detection ─────────────────────────────────────────────
async function getSendGridApiKey(): Promise<string | null> {
  try {
    const result = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'sendgrid_api_key'`);
    const rows = result.rows as any[];
    return rows[0]?.value || null;
  } catch {
    return null;
  }
}

async function getSendGridFromEmail(): Promise<string> {
  try {
    const result = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'sendgrid_from_email'`);
    const rows = result.rows as any[];
    return rows[0]?.value || process.env.EMAIL || "noreply@visicardly.com";
  } catch {
    return process.env.EMAIL || "noreply@visicardly.com";
  }
}

async function getSendGridFromName(): Promise<string> {
  try {
    const result = await db.execute(sql`SELECT value FROM app_settings WHERE key = 'sendgrid_from_name'`);
    const rows = result.rows as any[];
    return rows[0]?.value || "VisiCardly";
  } catch {
    return "VisiCardly";
  }
}

function getNodemailerTransporter() {
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

// ── Unified Email Sender ─────────────────────────────────────────────────
async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  try {
    const sendgridKey = await getSendGridApiKey();

    if (sendgridKey) {
      // Use SendGrid
      sgMail.setApiKey(sendgridKey);
      const fromEmail = await getSendGridFromEmail();
      const fromName = await getSendGridFromName();

      await sgMail.send({
        to: opts.to,
        from: { email: fromEmail, name: fromName },
        subject: opts.subject,
        html: opts.html,
      });
      return true;
    } else {
      // Fallback to Nodemailer/Gmail
      const emailTransporter = getNodemailerTransporter();
      await emailTransporter.sendMail({
        from: process.env.EMAIL,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });
      return true;
    }
  } catch (err) {
    console.error(`Failed to send email to ${opts.to}:`, err);
    return false;
  }
}

// ── Email Templates ──────────────────────────────────────────────────────

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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">You're Invited! 🎉</h2>
        <p style="color: #555; font-size: 16px;">
          <strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.teamName}</strong> as a <strong>${opts.role}</strong>.
        </p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${opts.inviteLink}" 
             style="background-color: #6C5CE7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
            Accept Invitation
          </a>
        </div>
        <p style="color: #888; font-size: 14px;">
          Or copy this link: <a href="${opts.inviteLink}" style="color: #6C5CE7;">${opts.inviteLink}</a>
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px;">
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    `,
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
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to ${opts.teamName}! 🎉</h2>
        <p style="color: #555; font-size: 16px;">
          An account has been created for you. Here are your login credentials:
        </p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${opts.to}</p>
          <p style="margin: 5px 0;"><strong>Temporary Password:</strong> ${opts.tempPassword}</p>
        </div>
        <p style="color: #e74c3c; font-size: 14px;">⚠️ You will be asked to change your password on first login.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${opts.loginUrl}" 
             style="background-color: #6C5CE7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
            Log In Now
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px;">
          If you didn't expect this, please contact your team administrator.
        </p>
      </div>
    `,
  });
}

export async function sendVerificationOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Your VisiCardly Verification Code: ${opts.otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Email Verification 🔐</h2>
        <p style="color: #555; font-size: 16px;">Your verification code is:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6C5CE7; margin: 0;">${opts.otp}</p>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore it.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px;">VisiCardly — Your Digital Business Card</p>
      </div>
    `,
  });
}

export async function sendPasswordResetOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Password Reset Code: ${opts.otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Password Reset 🔑</h2>
        <p style="color: #555; font-size: 16px;">You requested a password reset. Use this code to verify your identity:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6C5CE7; margin: 0;">${opts.otp}</p>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore it.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px;">VisiCardly — Your Digital Business Card</p>
      </div>
    `,
  });
}

export async function sendSignupOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Verify Your Email: ${opts.otp}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Welcome to VisiCardly!</h2>
        <p style="color: #555; font-size: 16px;">Please verify your email address with this code:</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6C5CE7; margin: 0;">${opts.otp}</p>
        </div>
        <p style="color: #888; font-size: 14px;">This code expires in 10 minutes.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px;">VisiCardly — Your Digital Business Card</p>
      </div>
    `,
  });
}

export async function sendPackageUpgradeEmail(opts: {
  to: string;
  planName: string;
  previousPlan: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Plan Upgraded to ${opts.planName}!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Plan Upgrade Confirmed! 🎉</h2>
        <p style="color: #555; font-size: 16px;">
          Your VisiCardly plan has been upgraded from <strong>${opts.previousPlan}</strong> to <strong>${opts.planName}</strong>.
        </p>
        <p style="color: #555; font-size: 14px;">You now have access to all features included in your new plan. Enjoy!</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px;">VisiCardly — Your Digital Business Card</p>
      </div>
    `,
  });
}

export async function sendPackageExpiryEmail(opts: {
  to: string;
  planName: string;
  expiryDate: string;
}): Promise<boolean> {
  return sendEmail({
    to: opts.to,
    subject: `Your ${opts.planName} plan is expiring soon`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">Plan Expiry Notice</h2>
        <p style="color: #555; font-size: 16px;">
          Your <strong>${opts.planName}</strong> plan will expire on <strong>${opts.expiryDate}</strong>.
        </p>
        <p style="color: #555; font-size: 14px;">To continue enjoying all features, please renew your plan before the expiry date.</p>
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.APP_URL || 'https://visicardly.com'}/dashboard" 
             style="background-color: #6C5CE7; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
            Renew Now
          </a>
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #aaa; font-size: 12px;">VisiCardly — Your Digital Business Card</p>
      </div>
    `,
  });
}

export async function sendBulkTemplateEmail(opts: {
  subject: string;
  body: string;
  recipients: { email: string; username: string; displayName?: string | null }[];
}): Promise<{ sent: number; failed: number; total: number }> {
  let sent = 0;
  let failed = 0;

  for (const recipient of opts.recipients) {
    try {
      let personalizedBody = opts.body
        .replace(/\r\n/g, "\n")
        .replace(/\n/g, "<br>")
        .replace(/\{\{username\}\}/g, recipient.username || "")
        .replace(/\{\{email\}\}/g, recipient.email || "")
        .replace(/\{\{displayName\}\}/g, recipient.displayName || recipient.username || "");

      let personalizedSubject = opts.subject
        .replace(/\{\{username\}\}/g, recipient.username || "")
        .replace(/\{\{email\}\}/g, recipient.email || "")
        .replace(/\{\{displayName\}\}/g, recipient.displayName || recipient.username || "");

      const success = await sendEmail({
        to: recipient.email,
        subject: personalizedSubject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${personalizedBody}
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
            <p style="color: #aaa; font-size: 12px;">VisiCardly — Your Digital Business Card</p>
          </div>
        `,
      });

      if (success) sent++;
      else failed++;
    } catch (err) {
      console.error(`Failed to send email to ${recipient.email}:`, err);
      failed++;
    }
  }

  return { sent, failed, total: opts.recipients.length };
}
