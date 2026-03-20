import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";
import { db } from "./storage";
import { sql } from "drizzle-orm";
import "dotenv/config";

let transporter: nodemailer.Transporter | null = null;

// ── NodeMailer (Gmail App Password) ─────────────────────────────────────
// Used for ALL transactional emails: OTP, invites, credentials, plan alerts
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

async function sendEmailViaNodemailer(opts: {
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

// ── SendGrid — ONLY for Email Blast ─────────────────────────────────────
// NOT used for OTP, invites, or credentials — those always use NodeMailer

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

// ── Email Templates (all use NodeMailer) ─────────────────────────────────

export async function sendInviteEmail(opts: {
  to: string;
  inviterName: string;
  teamName: string;
  inviteLink: string;
  role: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `You've been invited to join ${opts.teamName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">You're Invited! 🎉</h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">Join <strong>${opts.teamName}</strong> on VisiCardly</p>
        </div>
        <div style="padding: 32px 24px;">
          <div style="background: #f8f7ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6C5CE7;">
            <p style="color: #374151; font-size: 15px; margin: 0; line-height: 1.6;">
              <strong>${opts.inviterName}</strong> has invited you to join <strong>${opts.teamName}</strong> as a <strong style="color: #6C5CE7;">${opts.role}</strong>.
            </p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${opts.inviteLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
              Accept Invitation →
            </a>
          </div>
          <p style="color: #9ca3af; font-size: 13px; text-align: center; margin: 16px 0 0;">
            Or copy this link: <a href="${opts.inviteLink}" style="color: #6C5CE7; word-break: break-all;">${opts.inviteLink}</a>
          </p>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 20px 24px; text-align: center; background: #fafafa;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
            If you didn't expect this invitation, you can safely ignore this email.
          </p>
          <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
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
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Your account for ${opts.teamName} has been created`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">Welcome to ${opts.teamName}! 🎉</h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">Your account is ready to use</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 20px; line-height: 1.6;">
            An account has been created for you. Here are your login credentials:
          </p>
          <div style="background: #f8f7ff; border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e9e5ff;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px; font-weight: 600; width: 140px;">Email:</td>
                <td style="padding: 8px 0; color: #111827; font-size: 14px;"><a href="mailto:${opts.to}" style="color: #6C5CE7; text-decoration: none;">${opts.to}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Temporary Password:</td>
                <td style="padding: 8px 0;"><code style="background: #e9e5ff; color: #6C5CE7; padding: 4px 10px; border-radius: 6px; font-size: 14px; font-weight: 600;">${opts.tempPassword}</code></td>
              </tr>
            </table>
          </div>
          <div style="background: #fef3c7; border-radius: 10px; padding: 14px 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
            <p style="color: #92400e; font-size: 13px; margin: 0; font-weight: 500;">⚠️ You will be asked to change your password on first login.</p>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${opts.loginUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
              Log In Now →
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 20px 24px; text-align: center; background: #fafafa;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
            If you didn't expect this, please contact your team administrator.
          </p>
          <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
      </div>
    `,
  });
}

export async function sendVerificationOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Your VisiCardly Verification Code: ${opts.otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">Email Verification 🔐</h1>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">Your verification code is:</p>
          <div style="background: #f8f7ff; border-radius: 12px; padding: 24px; margin: 0 0 20px; border: 2px dashed #6C5CE7;">
            <p style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #6C5CE7; margin: 0; font-family: monospace;">${opts.otp}</p>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">This code expires in 10 minutes.</p>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
          <a href="${process.env.APP_URL || 'https://visicardly.com'}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
      </div>
    `,
  });
}

export async function sendPasswordResetOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Password Reset Code: ${opts.otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">Password Reset 🔑</h1>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">Use this code to reset your password:</p>
          <div style="background: #f8f7ff; border-radius: 12px; padding: 24px; margin: 0 0 20px; border: 2px dashed #6C5CE7;">
            <p style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #6C5CE7; margin: 0; font-family: monospace;">${opts.otp}</p>
          </div>
          <p style="color: #9ca3af; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, ignore this email.</p>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
          <a href="${process.env.APP_URL || 'https://visicardly.com'}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
      </div>
    `,
  });
}

export async function sendSignupOTP(opts: {
  to: string;
  otp: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Your VisiCardly sign up code: ${opts.otp}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(17,24,39,0.08); border: 1px solid #ede9fe;">
        <div style="background: linear-gradient(135deg, #6C5CE7, #8b5cf6); padding: 32px 24px; text-align: center;">
          <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.75);">VisiCardly</p>
          <h1 style="color: #ffffff; font-size: 26px; margin: 0 0 8px 0; font-weight: 800;">Confirm your email</h1>
          <p style="color: rgba(255,255,255,0.88); font-size: 14px; margin: 0;">Use this one-time code to finish creating your account.</p>
        </div>
        <div style="padding: 32px 24px; text-align: center;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 18px; line-height: 1.7;">
            Welcome aboard! Enter the verification code below on the registration screen to continue.
          </p>
          <div style="background: #f8f7ff; border-radius: 16px; padding: 24px; margin: 0 0 18px; border: 2px dashed #6C5CE7;">
            <p style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #6C5CE7; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace;">${opts.otp}</p>
          </div>
          <div style="background: #f9fafb; border-radius: 14px; padding: 16px 18px; text-align: left; margin: 0 auto 18px; border: 1px solid #e5e7eb;">
            <p style="margin: 0 0 8px; color: #111827; font-size: 14px; font-weight: 700;">Before you continue:</p>
            <ul style="margin: 0; padding-left: 18px; color: #6b7280; font-size: 13px; line-height: 1.7;">
              <li>This code expires in <strong>10 minutes</strong>.</li>
              <li>Use the same email address you entered during sign up.</li>
              <li>If you did not request this code, you can safely ignore this email.</li>
            </ul>
          </div>
          <div style="text-align: center;">
            <a href="${appUrl}" style="display: inline-block; padding: 12px 22px; border-radius: 10px; background: #6C5CE7; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 14px;">Open VisiCardly</a>
          </div>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
          <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
      </div>
    `,
  });
}

export async function sendPackageUpgradeEmail(opts: {
  to: string;
  planName: string;
  previousPlan: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Your VisiCardly plan is now ${opts.planName}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">Your package has been updated</h1>
        </div>
        <div style="padding: 32px 24px;">
          <div style="background: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #10b981;">
            <p style="color: #374151; font-size: 15px; margin: 0; line-height: 1.6;">
              Your account package has changed from <strong>${opts.previousPlan}</strong> to <strong style="color: #059669;">${opts.planName}</strong>.
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.7; margin: 0 0 18px;">Your available features and theme access are now updated to match the new package.</p>
          <div style="text-align: center;">
            <a href="${appUrl}/dashboard" style="display: inline-block; background: #059669; color: #ffffff; padding: 12px 22px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 14px;">Open dashboard</a>
          </div>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
          <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
      </div>
    `,
  });
}

export async function sendPackageExpiryEmail(opts: {
  to: string;
  planName: string;
  expiryDate: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Your ${opts.planName} plan is expiring soon`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #f59e0b, #d97706); padding: 28px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">Plan Expiry Notice ⏳</h1>
        </div>
        <div style="padding: 32px 24px;">
          <div style="background: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
            <p style="color: #374151; font-size: 15px; margin: 0; line-height: 1.6;">
              Your <strong>${opts.planName}</strong> plan will expire on <strong style="color: #d97706;">${opts.expiryDate}</strong>.
            </p>
          </div>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">Renew now to keep all your features active.</p>
          <div style="text-align: center;">
            <a href="${appUrl}/dashboard?section=billing" 
               style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
              Renew Now →
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
}

export async function sendWelcomeEmail(opts: {
  to: string;
  username: string;
}): Promise<boolean> {
  const appUrl = process.env.APP_URL || 'https://visicardly.com';
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Welcome to VisiCardly, ${opts.username}! 🎉`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">Welcome to VisiCardly! 🎉</h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">Your digital business card is ready</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
            Hi <strong>${opts.username}</strong>, thanks for joining VisiCardly!
          </p>
          <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 24px;">
            You can now create your stunning digital business card, add links, social profiles, and share your online presence with one custom link.
          </p>
          <div style="background: #f8f7ff; border-radius: 12px; padding: 20px; margin-bottom: 24px; border-left: 4px solid #6C5CE7;">
            <p style="color: #374151; font-size: 14px; margin: 0 0 12px; font-weight: 600;">Here's what you can do:</p>
            <ul style="color: #6b7280; font-size: 13px; margin: 0; padding-left: 16px; line-height: 2;">
              <li>Add unlimited links and social profiles</li>
              <li>Choose from 30+ beautiful themes</li>
              <li>Share your profile with a QR code</li>
              <li>Track visitors with analytics</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${appUrl}/dashboard"
               style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
              Go to Dashboard →
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 20px 24px; text-align: center; background: #fafafa;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0 0 4px;">
            Your profile: <a href="${appUrl}/${opts.username}" style="color: #6C5CE7; font-weight: 600;">${appUrl}/${opts.username}</a>
          </p>
          <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
      </div>
    `,
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
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `Payment Confirmation — ${opts.planName} Plan`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 32px 24px; text-align: center;">
          <h1 style="color: #ffffff; font-size: 24px; margin: 0 0 8px 0; font-weight: 700;">Payment Successful! ✅</h1>
          <p style="color: rgba(255,255,255,0.85); font-size: 14px; margin: 0;">Thank you for your purchase</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 20px;">
            Hi <strong>${opts.username}</strong>, your payment has been received successfully.
          </p>

          <!-- Invoice -->
          <div style="background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 12px;">
              <div>
                <p style="font-weight: 700; font-size: 16px; margin: 0; color: #111827;">VisiCardly</p>
                <p style="font-size: 11px; color: #9ca3af; margin: 4px 0 0;">visicardly.com</p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 13px; font-weight: 600; margin: 0; color: #111827;">${opts.invoiceNo}</p>
                <p style="font-size: 11px; color: #9ca3af; margin: 4px 0 0;">${opts.date}</p>
              </div>
            </div>

            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 600; margin: 0 0 6px;">From</p>
            <p style="font-size: 12px; color: #374151; margin: 0; font-weight: 600;">KSoft Solution</p>
            <p style="font-size: 11px; color: #6b7280; margin: 2px 0;">T-16, Software Technology Parks of India,</p>
            <p style="font-size: 11px; color: #6b7280; margin: 2px 0;">Chikhalthana MIDC, Chhatrapati Sambhaji Nagar, 431008, Maharashtra.</p>

            <div style="margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 12px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-size: 12px; color: #6b7280;">Plan</td>
                  <td style="padding: 8px 0; font-size: 12px; color: #111827; text-align: right; font-weight: 600;">${opts.planName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 8px 0; font-size: 12px; color: #6b7280;">Billing Cycle</td>
                  <td style="padding: 8px 0; font-size: 12px; color: #111827; text-align: right; text-transform: capitalize;">${opts.billingCycle}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 14px; color: #111827; font-weight: 700;">Total</td>
                  <td style="padding: 10px 0; font-size: 16px; color: #059669; text-align: right; font-weight: 700;">₹${opts.amount} ${opts.currency}</td>
                </tr>
              </table>
            </div>

            ${opts.orderId ? `<p style="font-size: 10px; color: #9ca3af; margin: 12px 0 0;">Order ID: ${opts.orderId}</p>` : ''}
            ${opts.paymentId ? `<p style="font-size: 10px; color: #9ca3af; margin: 2px 0 0;">Payment ID: ${opts.paymentId}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 28px 0;">
            <a href="${appUrl}/dashboard?section=billing"
               style="display: inline-block; background: linear-gradient(135deg, #6C5CE7, #a855f7); color: white; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(108,92,231,0.35);">
              View Dashboard →
            </a>
          </div>
        </div>
        <div style="border-top: 1px solid #f3f4f6; padding: 16px 24px; text-align: center; background: #fafafa;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0 0 4px;">
            Powered by <a href="https://ksoftsolution.com" target="_blank" style="color: #6C5CE7; text-decoration: none; font-weight: 600;">KSoft Solution</a>
          </p>
          <a href="${appUrl}" style="color: #6C5CE7; font-size: 12px; text-decoration: none; font-weight: 600;">VisiCardly</a>
          <span style="color: #d1d5db; font-size: 12px;"> — Digital Business Cards</span>
        </div>
      </div>
    `,
  });
}

// ── Email Blast — uses SendGrid exclusively ───────────────────────────────

export async function sendBulkTemplateEmail(opts: {
  subject: string;
  body: string;
  recipients: { email: string; username: string; displayName?: string | null }[];
}): Promise<{ sent: number; failed: number; total: number; errors: string[] }> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Check SendGrid config once before the loop
  const config = await getSendGridConfig();
  if (!config) {
    const msg = "SendGrid not configured — set your API key in Admin → Settings before sending email blasts";
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

      const result = await sendEmailViaSendGrid({
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

      if (result.ok) {
        sent++;
      } else {
        failed++;
        if (result.error && !errors.includes(result.error)) {
          errors.push(result.error);
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
  return sendEmailViaNodemailer({
    to: opts.to,
    subject: `New Contact Form Submission — ${opts.subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #6C5CE7, #a855f7); padding: 20px; border-radius: 12px 12px 0 0;">
          <h2 style="color: white; margin: 0;">📬 New Contact Form Submission</h2>
          <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0;">From your VisiCardly profile: ${opts.profileName}</p>
        </div>
        <div style="border: 1px solid #eee; border-top: none; padding: 20px; border-radius: 0 0 12px 12px;">
          <p><strong>Name:</strong> ${opts.senderName}</p>
          <p><strong>Email:</strong> <a href="mailto:${opts.senderEmail}">${opts.senderEmail}</a></p>
          <p><strong>Subject:</strong> ${opts.subject}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${opts.message}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="color: #aaa; font-size: 12px;">This message was sent via the contact form on your VisiCardly profile.</p>
        </div>
      </div>
    `,
  });
}
