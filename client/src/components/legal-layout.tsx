import { useState, useEffect } from "react";
import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { SiFacebook, SiX, SiInstagram, SiPinterest, SiTumblr } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import logoPath from "/logo.png";

interface LegalLayoutProps {
  children: React.ReactNode;
  /** Apply the aurora-bg gradient backdrop. Pass false for pages that paint their own backdrop (e.g. ltd-purchase). */
  aurora?: boolean;
}

export default function LegalLayout({ children, aurora = true }: LegalLayoutProps) {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const NAV_LINKS: { href: string; label: string; testid: string; anchor?: boolean }[] = [
    { href: "/#how-it-works", label: "How it works", testid: "link-how-it-works" },
    { href: "/#features", label: "Features", testid: "link-features" },
    { href: "/#testimonials", label: "Testimonials", testid: "link-testimonials" },
    { href: "/pricing", label: "Pricing", testid: "link-pricing" },
    { href: "/docs", label: "Docs", testid: "link-docs" },
  ];

  return (
    <div className={`min-h-screen ${aurora ? "aurora-bg" : "bg-background"} overflow-x-hidden text-foreground flex flex-col`}>
      {/* Pill nav — mirrors landing page */}
      <header className="fixed top-4 left-0 right-0 z-[999] px-4">
        <div className="landing-pill-nav max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 rounded-full">
          <WouterLink href="/">
            <img src={logoPath} alt="VisiCardly" className="w-[58px] h-[44px] object-contain" data-testid="text-logo" />
          </WouterLink>
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((item) => (
              <a
                key={item.testid}
                href={item.href}
                data-testid={item.testid}
                className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover-elevate"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <WouterLink href="/dashboard">
                <Button size="sm" className="rounded-full" data-testid="button-dashboard">Dashboard</Button>
              </WouterLink>
            ) : (
              <>
                <WouterLink href="/auth">
                  <Button variant="ghost" size="sm" className="rounded-full" data-testid="button-login">Log in</Button>
                </WouterLink>
                <WouterLink href="/auth?tab=register">
                  <Button size="sm" className="rounded-full" data-testid="button-signup">Sign up free</Button>
                </WouterLink>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden rounded-full"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 mx-auto max-w-6xl landing-glass rounded-2xl">
            <div className="flex flex-col px-6 py-4 gap-3">
              {NAV_LINKS.map((item) => (
                <a
                  key={`m-${item.testid}`}
                  href={item.href}
                  data-testid={`mobile-${item.testid}`}
                  className="text-sm font-medium text-muted-foreground py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </a>
              ))}
              <div className="flex items-center gap-3 pt-2 border-t border-border/60 flex-wrap">
                {user ? (
                  <WouterLink href="/dashboard">
                    <Button className="rounded-full" data-testid="mobile-button-dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Button>
                  </WouterLink>
                ) : (
                  <>
                    <WouterLink href="/auth">
                      <Button variant="ghost" className="rounded-full" data-testid="mobile-button-login" onClick={() => setMobileMenuOpen(false)}>Log in</Button>
                    </WouterLink>
                    <WouterLink href="/auth?tab=register">
                      <Button className="rounded-full" data-testid="mobile-button-signup" onClick={() => setMobileMenuOpen(false)}>Sign up free</Button>
                    </WouterLink>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 pt-28 relative">{children}</main>

      <footer className="relative border-t border-border/60 bg-card/40 backdrop-blur-xl py-14 px-6 mt-16">
        <div className="absolute inset-0 landing-grid-bg opacity-30 pointer-events-none" />
        <div className="max-w-6xl mx-auto relative">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <WouterLink href="/">
                <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain mb-4 cursor-pointer" />
              </WouterLink>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The simplest way to share your online presence. One link for everything.
              </p>
            </div>
            <div>
              <h4 className="text-[11px] landing-mono uppercase text-foreground mb-4 tracking-wider">Product</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</WouterLink></li>
                <li><WouterLink href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</WouterLink></li>
                <li><a href="/#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] landing-mono uppercase text-foreground mb-4 tracking-wider">Company</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</WouterLink></li>
                <li><WouterLink href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact Us</WouterLink></li>
                <li><WouterLink href="/gdpr" className="text-sm text-muted-foreground hover:text-foreground transition-colors">GDPR Compliance</WouterLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[11px] landing-mono uppercase text-foreground mb-4 tracking-wider">Support</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</WouterLink></li>
                <li><WouterLink href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</WouterLink></li>
                <li><WouterLink href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms of Service</WouterLink></li>
                <li><WouterLink href="/refund-policy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Refund Policy</WouterLink></li>
              </ul>
            </div>
          </div>
          <div className="aurora-divider mb-8" />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">
              © 2026 VisiCardly powered by{" "}
              <a href="https://ksoftsolution.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline">KSoft Solution</a>
              . All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <a href="https://www.facebook.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiFacebook className="w-4 h-4" /></a>
              <a href="https://x.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiX className="w-4 h-4" /></a>
              <a href="https://www.instagram.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiInstagram className="w-4 h-4" /></a>
              <a href="https://in.pinterest.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiPinterest className="w-4 h-4" /></a>
              <a href="https://www.tumblr.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiTumblr className="w-4 h-4" /></a>
            </div>
            <div className="flex items-center gap-4">
              <WouterLink href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Terms</WouterLink>
              <WouterLink href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Privacy</WouterLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
