import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" className="mb-8" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>

        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 19, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We collect information you provide directly to us when you create an account, update your profile, or use the Service:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Account Information:</strong> name, email address, username, and password</li>
              <li><strong>Profile Information:</strong> display name, bio, profile image, and links you create</li>
              <li><strong>Payment Information:</strong> billing details processed securely via Razorpay (we do not store card numbers)</li>
              <li><strong>Usage Data:</strong> how you interact with the Service, including page views and link clicks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Provide, operate, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send technical notices, updates, and support messages</li>
              <li>Respond to your comments and questions</li>
              <li>Monitor and analyze trends, usage, and activities in connection with the Service</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              We do not sell, trade, or otherwise transfer your personal information to third parties except in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li><strong>Service Providers:</strong> We may share information with vendors who perform services on our behalf (e.g., payment processing, hosting)</li>
              <li><strong>Legal Requirements:</strong> We may disclose information if required by law or in good-faith belief that such action is necessary</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. Your passwords are hashed and never stored in plain text. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use cookies and similar tracking technologies to track activity on the Service and hold certain information. Cookies are files with a small amount of data that may include an anonymous unique identifier. You can instruct your browser to refuse all cookies, but some features of the Service may not function properly without them.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Object to or restrict how we process your data</li>
              <li>Export your data in a portable format</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              To exercise these rights, you can delete your account from the dashboard settings or contact us directly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your personal information for as long as your account is active or as needed to provide you the Service. When you delete your account, we will delete or anonymize your information within 30 days, except where we are required to retain it for legal or business purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is not directed to individuals under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes your acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at{" "}
              <a href="mailto:privacy@linkfolio.app" className="text-primary underline">privacy@linkfolio.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
