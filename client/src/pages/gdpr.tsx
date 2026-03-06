import LegalLayout from "@/components/legal-layout";

export default function GdprPage() {
  return (
    <LegalLayout>
      <div className="max-w-3xl mx-auto px-6 py-16 prose prose-sm dark:prose-invert">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">GDPR Compliance</h1>
        <p className="text-muted-foreground">Last updated: February 2026</p>

        <h2>Our Commitment to Data Protection</h2>
        <p>
          VisiCardly is committed to protecting your personal data in accordance with the General Data Protection Regulation (GDPR). This page explains how we collect, use, and protect your information.
        </p>

        <h2>Data We Collect</h2>
        <ul>
          <li><strong>Account information:</strong> Name, email address, username, and profile details you provide.</li>
          <li><strong>Usage data:</strong> Page views, link clicks, and analytics data to help you understand your audience.</li>
          <li><strong>Technical data:</strong> IP addresses, browser type, and device information for security and service improvement.</li>
        </ul>

        <h2>Your Rights Under GDPR</h2>
        <ul>
          <li><strong>Right to Access:</strong> Request a copy of your personal data.</li>
          <li><strong>Right to Rectification:</strong> Update or correct your personal data.</li>
          <li><strong>Right to Erasure:</strong> Delete your account and all associated data.</li>
          <li><strong>Right to Portability:</strong> Export your data in a standard format.</li>
          <li><strong>Right to Object:</strong> Object to certain data processing activities.</li>
        </ul>

        <h2>Data Security</h2>
        <p>
          We use industry-standard encryption and security measures to protect your personal data. Passwords are hashed using bcrypt, and all data is transmitted over HTTPS.
        </p>

        <h2>Data Retention</h2>
        <p>
          We retain your data for as long as your account is active. Upon account deletion, all personal data is permanently removed within 30 days.
        </p>

        <h2>Contact Us</h2>
        <p>
          For any GDPR-related requests or questions, please contact us at{" "}
          <a href="mailto:privacy@visicardly.com" className="text-primary">privacy@visicardly.com</a>.
        </p>
      </div>
    </LegalLayout>
  );
}
