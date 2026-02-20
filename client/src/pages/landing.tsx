import { useState } from "react";
import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowRight,
  Link2,
  Palette,
  Share2,
  Zap,
  LayoutGrid,
  Users,
  Sparkles,
  Star,
  Globe,
  MousePointerClick,
  Layers,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import heroPhoneImg from "@/assets/images/hero-phone.png";

const STATS = [
  { value: "10K+", label: "Creators" },
  { value: "50+", label: "Platforms" },
  { value: "99.9%", label: "Uptime" },
  { value: "Free", label: "To start" },
];

const STEPS = [
  {
    number: "01",
    title: "Sign up in seconds",
    description: "Create your account with just an email and password. No credit card needed.",
    icon: Zap,
  },
  {
    number: "02",
    title: "Add your content",
    description: "Drop in your links, social profiles, and anything else you want to share.",
    icon: Layers,
  },
  {
    number: "03",
    title: "Share your page",
    description: "Get your custom URL and share it everywhere. Your audience finds everything in one tap.",
    icon: Share2,
  },
];

const BENTO_FEATURES = [
  {
    title: "Unlimited Links",
    description: "Add as many links as you need. Organize them your way with drag-and-drop.",
    icon: Link2,
    span: "sm:col-span-2",
  },
  {
    title: "50+ Platforms",
    description: "Connect Instagram, TikTok, YouTube, Twitter, and dozens more.",
    icon: LayoutGrid,
    span: "",
  },
  {
    title: "Custom Themes",
    description: "Make it yours with colors, fonts, and layout options.",
    icon: Palette,
    span: "",
  },
  {
    title: "Mobile First",
    description: "Looks perfect on every screen size, from phones to desktops.",
    icon: Globe,
    span: "",
  },
  {
    title: "Lightning Fast",
    description: "Optimized for speed. Your page loads instantly, every time.",
    icon: Zap,
    span: "sm:col-span-2",
  },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Content Creator",
    text: "Linkfolio made it so easy to organize all my links in one place. My followers can now find everything instantly!",
  },
  {
    name: "Jason R.",
    role: "Freelance Designer",
    text: "The customization options are incredible. My link page matches my brand perfectly and looks super professional.",
  },
  {
    name: "Priya K.",
    role: "Small Business Owner",
    text: "I switched from Linktree and haven't looked back. Linkfolio is more powerful and so much easier to use.",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-[999] bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <WouterLink href="/">
            <span className="text-xl font-bold tracking-tight" data-testid="text-logo">
              <span className="text-primary">link</span>
              <span className="text-foreground">folio</span>
            </span>
          </WouterLink>
          <nav className="hidden md:flex items-center gap-6 flex-wrap">
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground" data-testid="link-how-it-works">
              How it works
            </a>
            <a href="#features" className="text-sm font-medium text-muted-foreground" data-testid="link-features">
              Features
            </a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground" data-testid="link-testimonials">
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
              <a
                href="#how-it-works"
                className="text-sm font-medium text-muted-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-link-how-it-works"
              >
                How it works
              </a>
              <a
                href="#features"
                className="text-sm font-medium text-muted-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-link-features"
              >
                Features
              </a>
              <a
                href="#testimonials"
                className="text-sm font-medium text-muted-foreground py-2"
                onClick={() => setMobileMenuOpen(false)}
                data-testid="mobile-link-testimonials"
              >
                Testimonials
              </a>
              <WouterLink href="/pricing">
                <span
                  className="text-sm font-medium text-muted-foreground py-2 cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-link-pricing"
                >
                  Pricing
                </span>
              </WouterLink>
              <WouterLink href="/docs">
                <span
                  className="text-sm font-medium text-muted-foreground py-2 cursor-pointer"
                  onClick={() => setMobileMenuOpen(false)}
                  data-testid="mobile-link-docs"
                >
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

      <main>
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="landing-orb landing-orb-1" />
          <div className="landing-orb landing-orb-2" />
          <div className="landing-orb landing-orb-3" />
          <div className="max-w-6xl mx-auto relative">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Your link-in-bio, reimagined
                </div>
                <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mb-6 text-foreground">
                  One link.{" "}
                  <span className="landing-gradient-text">
                    Infinite
                  </span>{" "}
                  possibilities.
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed">
                  Create a beautiful, personalized page that houses all your important links. Share it once, connect everywhere.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 flex-wrap">
                  <WouterLink href="/auth?tab=register">
                    <Button size="lg" data-testid="button-get-started">
                      Get started for free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </WouterLink>
                  <a href="#how-it-works">
                    <Button variant="outline" size="lg" data-testid="button-see-how">
                      See how it works
                    </Button>
                  </a>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end flex-wrap">
                <div className="relative">
                  <div className="absolute -inset-8 rounded-[2rem] landing-phone-glow" />
                  <img
                    src={heroPhoneImg}
                    alt="Linkfolio profile page preview"
                    className="relative w-60 md:w-72 rounded-2xl"
                    data-testid="img-hero-phone"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-4 border-y border-border bg-card">
          <div className="max-w-4xl mx-auto flex items-center justify-around gap-6 flex-wrap px-6">
            {STATS.map((stat, i) => (
              <div key={i} className="text-center px-4 py-2">
                <p className="text-2xl font-extrabold text-foreground" data-testid={`text-stat-value-${i}`}>{stat.value}</p>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Up and running in three steps
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                No technical knowledge required. If you can type a URL, you can use Linkfolio.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((step, i) => (
                <div key={i} className="relative">
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    <span className="text-5xl font-black text-primary/15 leading-none select-none">{step.number}</span>
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="hidden md:block absolute top-6 -right-5 w-5 h-5 text-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="py-24 px-6 bg-card border-y border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Everything you need, nothing you don't
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Powerful tools wrapped in a simple interface. Built for creators who value their time.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {BENTO_FEATURES.map((feature, i) => (
                <Card
                  key={i}
                  className={`p-6 border-border/60 group ${feature.span}`}
                  data-testid={`card-feature-${i}`}
                >
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-bold text-foreground mb-1.5">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Why Linkfolio</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6">
                  Built different, on purpose
                </h2>
                <p className="text-muted-foreground text-lg mb-8 leading-relaxed">
                  We're not another cookie-cutter link tool. Linkfolio gives you real creative control without the learning curve.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: Palette, text: "Full design control with themes, colors, and fonts" },
                    { icon: MousePointerClick, text: "Drag-and-drop simplicity for organizing links" },
                    { icon: Users, text: "50+ social platform integrations" },
                    { icon: Star, text: "Premium features at zero cost" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 flex-wrap">
                      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground text-sm leading-relaxed pt-1.5">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center flex-wrap">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-[2rem] landing-phone-glow opacity-60" />
                  <img
                    src={heroPhoneImg}
                    alt="Linkfolio customization preview"
                    className="relative w-52 md:w-64 rounded-2xl"
                    data-testid="img-why-phone"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-24 px-6 bg-card border-y border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Loved by creators everywhere
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Don't take our word for it. Here's what our community has to say.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <Card key={i} className="p-6 border-border/60" data-testid={`card-testimonial-${i}`}>
                  <div className="flex items-center gap-1 mb-4 flex-wrap">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">{t.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing CTA section */}
        <section className="py-20 px-6 bg-muted/30 border-t border-border">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
              Plans for every creator
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Start free, upgrade when you're ready. No hidden fees.
            </p>
            <WouterLink href="/pricing">
              <Button size="lg" className="mr-4">
                View Pricing
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </WouterLink>
            <WouterLink href="/auth?tab=register">
              <Button size="lg" variant="outline">
                Start for free
              </Button>
            </WouterLink>
          </div>
        </section>

        <section className="py-28 px-6 relative overflow-hidden">
          <div className="landing-orb landing-orb-cta-1" />
          <div className="landing-orb landing-orb-cta-2" />
          <div className="max-w-2xl mx-auto text-center relative">
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6">
              Ready to claim your page?
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-lg mx-auto leading-relaxed">
              Join thousands of creators who use Linkfolio to share their world. Free forever, upgrade anytime.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 flex-wrap">
              <WouterLink href="/auth?tab=register">
                <Button size="lg" data-testid="button-create-page">
                  Create your page
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </WouterLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground mb-4 block">
                <span className="text-primary">link</span>folio
              </span>
              <p className="text-sm text-muted-foreground leading-relaxed">
                The simplest way to share your online presence. One link for everything.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-muted-foreground" data-testid="link-footer-features">Features</a></li>
                <li><a href="#testimonials" className="text-sm text-muted-foreground" data-testid="link-footer-testimonials">Testimonials</a></li>
                <li><a href="#how-it-works" className="text-sm text-muted-foreground" data-testid="link-footer-how">How it works</a></li>
                <li><WouterLink href="/pricing"><a className="text-sm text-muted-foreground hover:text-foreground">Pricing</a></WouterLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-muted-foreground">About</span></li>
                <li><span className="text-sm text-muted-foreground">Blog</span></li>
                <li><span className="text-sm text-muted-foreground">Careers</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/docs"><a className="text-sm text-muted-foreground hover:text-foreground">Documentation</a></WouterLink></li>
                <li><WouterLink href="/privacy"><a className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</a></WouterLink></li>
                <li><WouterLink href="/terms"><a className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</a></WouterLink></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Linkfolio. All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <WouterLink href="/terms"><a className="text-sm text-muted-foreground hover:text-foreground">Terms</a></WouterLink>
              <WouterLink href="/privacy"><a className="text-sm text-muted-foreground hover:text-foreground">Privacy</a></WouterLink>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
