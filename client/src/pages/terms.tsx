import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Button variant="ghost" size="sm" className="mb-8" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Button>

        <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-10">Last updated: February 19, 2026</p>

        <div className="prose prose-sm max-w-none space-y-8 text-foreground">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Linkfolio ("the Service"), you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Use License</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Permission is granted to temporarily use Linkfolio for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1 ml-4">
              <li>Modify or copy the materials</li>
              <li>Use the materials for any commercial purpose or for any public display</li>
              <li>Attempt to decompile or reverse engineer any software contained in Linkfolio</li>
              <li>Remove any copyright or other proprietary notations from the materials</li>
              <li>Transfer the materials to another person or "mirror" the materials on any other server</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Terms</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account and password. Linkfolio cannot and will not be liable for any loss or damage from your failure to comply with this security obligation.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You may not use the Service for any illegal or unauthorized purpose. You must not, in the use of the Service, violate any laws in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Payment & Subscriptions</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              Paid plans are billed in advance on a monthly or yearly basis. Subscriptions automatically renew unless cancelled before the renewal date. Refunds are not provided for partial billing periods.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to change our pricing with 30 days' notice. Such notice may be provided at any time by posting the changes to the Linkfolio website or the Service itself.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Content & Prohibited Uses</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              You retain ownership of any content you submit, post, or display through the Service. You grant Linkfolio a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content solely for the purpose of operating the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You agree not to post content that is illegal, harmful, threatening, abusive, harassing, defamatory, vulgar, obscene, or otherwise objectionable. We reserve the right to remove any content and terminate accounts that violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              The materials on Linkfolio are provided on an "as is" basis. Linkfolio makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties, including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitations</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall Linkfolio or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Linkfolio, even if Linkfolio or a Linkfolio authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms and conditions are governed by and construed in accordance with applicable laws, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have questions about these Terms, please contact us at{" "}
              <a href="mailto:legal@linkfolio.app" className="text-primary underline">legal@linkfolio.app</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
