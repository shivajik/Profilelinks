import { useEffect } from "react";
import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface LegalLayoutProps {
  children: React.ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center gap-4 px-6 py-3">
          <WouterLink href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </WouterLink>
          <WouterLink href="/">
            <span className="text-xl font-bold tracking-tight cursor-pointer">
              <span className="text-primary">Visi</span>
              <span className="text-foreground">Cardly</span>
            </span>
          </WouterLink>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground mb-4 block">
                <span className="text-primary">Visi</span>Cardly
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The simplest way to share your online presence. One link for everything.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">Pricing</WouterLink></li>
                <li><WouterLink href="/docs" className="text-sm text-muted-foreground hover:text-foreground">Documentation</WouterLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/about" className="text-sm text-muted-foreground hover:text-foreground">About</WouterLink></li>
                <li><WouterLink href="/contact" className="text-sm text-muted-foreground hover:text-foreground">Contact Us</WouterLink></li>
                <li><WouterLink href="/gdpr" className="text-sm text-muted-foreground hover:text-foreground">GDPR Compliance</WouterLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/support" className="text-sm text-muted-foreground hover:text-foreground">Support</WouterLink></li>
                <li><WouterLink href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</WouterLink></li>
                <li><WouterLink href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</WouterLink></li>
                <li><WouterLink href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground">Refund Policy</WouterLink></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">
              VisiCardly. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <WouterLink href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</WouterLink>
              <WouterLink href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</WouterLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
