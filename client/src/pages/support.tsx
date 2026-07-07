import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { HelpCircle, BookOpen, Mail } from "lucide-react";
import LegalLayout from "@/components/legal-layout";
import SEO from "@/components/seo";

const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "How do I contact VisiCardly support?", acceptedAnswer: { "@type": "Answer", text: "Email support@visicardly.com or use the contact form. We reply within one business day." } },
    { "@type": "Question", name: "Where can I find the documentation?", acceptedAnswer: { "@type": "Answer", text: "Full guides are available at visicardly.com/docs covering every feature — profiles, links, QR codes, teams, menus and analytics." } },
    { "@type": "Question", name: "Is VisiCardly free?", acceptedAnswer: { "@type": "Answer", text: "Yes, a free plan is available. Paid plans unlock QR codes, analytics, multiple pages and team features." } },
    { "@type": "Question", name: "Do you offer refunds?", acceptedAnswer: { "@type": "Answer", text: "All purchases are final and non-refundable. Contact support for duplicate charges caused by technical errors." } },
  ],
};

export default function SupportPage() {
  return (
    <LegalLayout>
      <SEO
        title="Support & Help Center — VisiCardly"
        description="Get help with VisiCardly. Browse the FAQ, read documentation, or contact our support team — we usually reply within one business day."
        path="/support"
        jsonLd={FAQ_JSONLD}
      />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="aurora-chip mb-6">— Help center</div>
        <h1 className="aurora-display text-5xl md:text-6xl mb-5">We're here to <em>help</em></h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          Need help? Browse our resources or reach out directly — we usually reply within one business day.
        </p>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Documentation</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Comprehensive guides on how to use all VisiCardly features.
              </p>
              <WouterLink href="/docs">
                <Button variant="outline" size="sm">View Docs</Button>
              </WouterLink>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">FAQ</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Quick answers to common questions about plans, features, and billing.
              </p>
              <WouterLink href="/docs">
                <Button variant="outline" size="sm">Browse FAQ</Button>
              </WouterLink>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Contact Support</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Can't find what you need? Reach out and we'll get back to you within 24 hours.
              </p>
              <WouterLink href="/contact">
                <Button variant="outline" size="sm">Contact Us</Button>
              </WouterLink>
            </div>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
