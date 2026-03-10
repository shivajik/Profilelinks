import { useState, useEffect } from "react";
import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { SiFacebook, SiX, SiInstagram, SiPinterest, SiTumblr } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import logoPath from "/logo.png";

interface LegalLayoutProps {
  children: React.ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 left-0 right-0 z-[999] bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <WouterLink href="/">
            <span className="text-xl font-bold tracking-tight flex items-center gap-2" data-testid="text-logo">
              <img src={logoPath} alt="VisiCardly" className="w-12 h-10 object-contain" />
              <span><span className="text-primary">Visi</span><span className="text-foreground">Cardly</span></span>
            </span>
          </WouterLink>
          <nav className="hidden md:flex items-center gap-6 flex-wrap">
            <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-how-it-works">
              How it works
            </a>
            <a href="/#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-features">
              Features
            </a>
            <a href="/#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" data-testid="link-testimonials">
              Testimonials
            </a>
            <WouterLink href="/pricing">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-pricing">
                Pricing
              </span>
            </WouterLink>
            <WouterLink href="/docs">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-docs">
                Docs
              </span>
            </WouterLink>
          </nav>
          <div className="hidden md:flex items-center gap-3 flex-wrap">
            {user ? (
              <WouterLink href="/dashboard">
                <Button data-testid="button-dashboard">Dashboard</Button>
              </WouterLink>
            ) : (
              <>
                <WouterLink href="/auth">
                  <Button variant="ghost" data-testid="button-login">Log in</Button>
                </WouterLink>
                <WouterLink href="/auth?tab=register">
                  <Button data-testid="button-signup">Sign up free</Button>
                </WouterLink>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="flex flex-col px-6 py-4 gap-3">
              <a href="/#how-it-works" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-how-it-works">
                How it works
              </a>
              <a href="/#features" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-features">
                Features
              </a>
              <a href="/#testimonials" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-testimonials">
                Testimonials
              </a>
              <WouterLink href="/pricing">
                <span className="text-sm font-medium text-muted-foreground py-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-pricing">
                  Pricing
                </span>
              </WouterLink>
              <WouterLink href="/docs">
                <span className="text-sm font-medium text-muted-foreground py-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-docs">
                  Docs
                </span>
              </WouterLink>
              <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
                {user ? (
                  <WouterLink href="/dashboard">
                    <Button data-testid="mobile-button-dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Button>
                  </WouterLink>
                ) : (
                  <>
                    <WouterLink href="/auth">
                      <Button variant="ghost" data-testid="mobile-button-login" onClick={() => setMobileMenuOpen(false)}>Log in</Button>
                    </WouterLink>
                    <WouterLink href="/auth?tab=register">
                      <Button data-testid="mobile-button-signup" onClick={() => setMobileMenuOpen(false)}>Sign up free</Button>
                    </WouterLink>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground mb-4 flex items-center gap-2">
                <img src={logoPath} alt="VisiCardly" className="w-12 h-10 object-contain" />
                <span><span className="text-primary">Visi</span>Cardly</span>
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
              <a href="https://www.facebook.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiFacebook className="w-4 h-4" /></a>
              <a href="https://x.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiX className="w-4 h-4" /></a>
              <a href="https://www.instagram.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiInstagram className="w-4 h-4" /></a>
              <a href="https://in.pinterest.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiPinterest className="w-4 h-4" /></a>
              <a href="https://www.tumblr.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiTumblr className="w-4 h-4" /></a>
            </div>
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
