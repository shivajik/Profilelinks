import nodemailer from "nodemailer";
import "dotenv/config";
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
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

export async function sendInviteEmail(opts: {
  to: string;
  inviterName: string;
  teamName: string;
  inviteLink: string;
  role: string;
}): Promise<boolean> {
  try {
    const emailTransporter = getTransporter();
    await emailTransporter.sendMail({
      from: process.env.EMAIL,
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
    return true;
  } catch (err) {
    console.error("Failed to send invite email:", err);
    return false;
  }
}

export async function sendCredentialsEmail(opts: {
  to: string;
  teamName: string;
  loginUrl: string;
  tempPassword: string;
}): Promise<boolean> {
  try {
    const emailTransporter = getTransporter();
    await emailTransporter.sendMail({
      from: process.env.EMAIL,
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
    return true;
  } catch (err) {
    console.error("Failed to send credentials email:", err);
    return false;
  }
}
