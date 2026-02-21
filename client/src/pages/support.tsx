import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, HelpCircle, BookOpen, Mail } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center gap-4 px-6 py-3">
          <WouterLink href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </WouterLink>
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">link</span>folio
          </span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">Support</h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
          Need help? We're here for you. Browse our resources or reach out directly.
        </p>

        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-foreground mb-1">Documentation</h3>
              <p className="text-sm text-muted-foreground mb-2">
                Comprehensive guides on how to use all Linkfolio features.
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
      </main>
    </div>
  );
}
