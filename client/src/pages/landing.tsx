import { useState, lazy, Suspense } from "react";
import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoPath from "/logo.png";
import {
  ArrowRight,
  Link2,
  Palette,
  Share2,
  Zap,
  LayoutGrid,
  Users,
  Star,
  Globe,
  MousePointerClick,
  Layers,
  ChevronRight,
  Menu,
  X,
  CreditCard,
  QrCode,
  UtensilsCrossed,
} from "lucide-react";
import { SiFacebook, SiX, SiInstagram, SiPinterest, SiTumblr } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import heroPhoneImg from "@/assets/images/hero-phone.png";
const TemplateShowcase = lazy(() => import("@/components/template-showcase"));

const STATS = [
  { value: "10K+", label: "Creators" },
  { value: "50+", label: "Platforms" },
  { value: "99.9%", label: "Uptime" },
  { value: "Free", label: "To start" },
];

const STEPS = [
  { number: "01", title: "Sign up in seconds", description: "Create your account with just an email and password. No credit card needed.", icon: Zap },
  { number: "02", title: "Add your content", description: "Drop in your links, social profiles, and anything else you want to share.", icon: Layers },
  { number: "03", title: "Share your page", description: "Get your custom URL and share it everywhere. Your audience finds everything in one tap.", icon: Share2 },
];

const BENTO_FEATURES = [
  { title: "Digital Business Cards", description: "Create professional digital business cards with contact info, company branding, and one-tap vCard sharing.", icon: CreditCard, span: "sm:col-span-2" },
  { title: "Team Management", description: "Manage team members with roles, branches, branded templates, and bulk CSV import/export.", icon: Users, span: "" },
  { title: "QR Code Generator", description: "Generate customizable QR codes for your profile, menu, or business card — ready for print.", icon: QrCode, span: "" },
  { title: "Menu Builder", description: "Build beautiful digital menus for restaurants and cafés with sections, products, hours, and contact info.", icon: UtensilsCrossed, span: "" },
  { title: "50+ Social Platforms", description: "Connect Instagram, TikTok, YouTube, LinkedIn, X, and dozens more — displayed as sleek icons.", icon: LayoutGrid, span: "" },
  { title: "Custom Themes & Branding", description: "Choose from professionally designed templates with custom colors, fonts, cover images, and company logos.", icon: Palette, span: "sm:col-span-2" },
];

const TESTIMONIALS = [
  { name: "Sarah M.", role: "Content Creator", text: "VisiCardly made it so easy to organize all my links in one place. My followers can now find everything instantly!" },
  { name: "Jason R.", role: "Freelance Designer", text: "The customization options are incredible. My link page matches my brand perfectly and looks super professional." },
  { name: "Priya K.", role: "Small Business Owner", text: "I switched from Linktree and haven't looked back. VisiCardly is more powerful and so much easier to use." },
];

export default function Landing() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden text-foreground">
      {/* NAV */}
      <header className="fixed top-4 left-0 right-0 z-[999] px-4">
        <div className="landing-pill-nav max-w-6xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-2.5 rounded-full">
          <WouterLink href="/">
            <img src={logoPath} alt="VisiCardly" className="w-[58px] h-[44px] object-contain" data-testid="text-logo" />
          </WouterLink>
          <nav className="hidden md:flex items-center gap-1">
            {[
              { href: "#how-it-works", label: "How it works", testid: "link-how-it-works", anchor: true },
              { href: "#features", label: "Features", testid: "link-features", anchor: true },
              { href: "#testimonials", label: "Testimonials", testid: "link-testimonials", anchor: true },
              { href: "/restaurant", label: "Restaurants", testid: "link-restaurant", anchor: false },
              { href: "/pricing", label: "Pricing", testid: "link-pricing", anchor: false },
              { href: "/docs", label: "Docs", testid: "link-docs", anchor: false },
            ].map((item) =>
              item.anchor ? (
                <a key={item.testid} href={item.href} data-testid={item.testid} className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-full hover-elevate">
                  {item.label}
                </a>
              ) : (
                <WouterLink key={item.testid} href={item.href}>
                  <span data-testid={item.testid} className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-3 py-1.5 rounded-full hover-elevate">
                    {item.label}
                  </span>
                </WouterLink>
              )
            )}
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
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} data-testid="button-mobile-menu">
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden mt-2 mx-auto max-w-6xl landing-glass rounded-2xl">
            <div className="flex flex-col px-6 py-4 gap-3">
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-how-it-works">How it works</a>
              <a href="#features" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-features">Features</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-testimonials">Testimonials</a>
              <WouterLink href="/pricing"><span className="text-sm font-medium text-muted-foreground py-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-pricing">Pricing</span></WouterLink>
              <WouterLink href="/restaurant"><span className="text-sm font-medium text-muted-foreground py-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-restaurant">Restaurants</span></WouterLink>
              <WouterLink href="/docs"><span className="text-sm font-medium text-muted-foreground py-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)} data-testid="mobile-link-docs">Docs</span></WouterLink>
              <div className="flex items-center gap-3 pt-2 border-t border-border flex-wrap">
                {user ? (
                  <WouterLink href="/dashboard"><Button data-testid="mobile-button-dashboard" onClick={() => setMobileMenuOpen(false)}>Dashboard</Button></WouterLink>
                ) : (
                  <>
                    <WouterLink href="/auth"><Button variant="ghost" data-testid="mobile-button-login" onClick={() => setMobileMenuOpen(false)}>Log in</Button></WouterLink>
                    <WouterLink href="/auth?tab=register"><Button data-testid="mobile-button-signup" onClick={() => setMobileMenuOpen(false)}>Sign up free</Button></WouterLink>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* HERO */}
        <section className="relative pt-36 pb-24 px-6 overflow-hidden">
          <div className="absolute inset-0 landing-grid-bg pointer-events-none" />
          <div className="landing-orb landing-orb-1" />
          <div className="landing-orb landing-orb-2" />
          <div className="landing-orb landing-orb-3" />
          <div className="max-w-6xl mx-auto relative">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
              <div className="text-center lg:text-left">
                <div className="inline-flex items-center gap-2 rounded-full landing-glass px-3 py-1 text-[11px] font-medium text-muted-foreground mb-8 landing-mono uppercase">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                  Your link-in-bio, reimagined
                </div>
                <h1 className="text-[2.75rem] sm:text-6xl md:text-7xl font-bold tracking-[-0.04em] leading-[0.98] mb-6">
                  <span className="landing-shine">One link.</span>
                  <br />
                  <span className="landing-gradient-text italic font-serif">Infinite</span>
                  <span className="landing-shine"> possibilities.</span>
                </h1>
                <p className="text-base md:text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0 mb-10 leading-relaxed">
                  A beautifully crafted page that holds every link, profile, menu and card you care about. Share it once — connect everywhere.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 flex-wrap">
                  <WouterLink href="/auth?tab=register">
                    <Button size="lg" className="rounded-full px-6 shadow-lg shadow-primary/20" data-testid="button-get-started">
                      Get started for free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </WouterLink>
                  <a href="#how-it-works">
                    <Button variant="ghost" size="lg" className="rounded-full px-6 gap-2" data-testid="button-see-how">
                      <MousePointerClick className="w-4 h-4" />
                      See how it works
                    </Button>
                  </a>
                </div>
                <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-xs text-muted-foreground flex-wrap">
                  <div className="flex -space-x-2">
                    {["S","J","P","M","A"].map((c,i)=>(
                      <div key={i} className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/40 to-chart-2/40 border-2 border-background flex items-center justify-center text-[10px] font-bold text-foreground">{c}</div>
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    {Array.from({length:5}).map((_,i)=>(<Star key={i} className="w-3.5 h-3.5 fill-primary text-primary"/>))}
                    <span className="ml-1.5">10,000+ creators trust us</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end">
                <div className="relative">
                  <div className="absolute -inset-10 rounded-[2.5rem] landing-phone-glow" />
                  <div className="hidden md:flex absolute -left-12 top-10 landing-glass rounded-2xl px-3 py-2 items-center gap-2 shadow-xl z-10">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center"><Link2 className="w-3.5 h-3.5 text-primary"/></div>
                    <div>
                      <p className="text-[10px] landing-mono uppercase text-muted-foreground">+1 click</p>
                      <p className="text-xs font-semibold">linktap</p>
                    </div>
                  </div>
                  <div className="hidden md:flex absolute -right-10 bottom-16 landing-glass rounded-2xl px-3 py-2 items-center gap-2 shadow-xl z-10">
                    <div className="w-7 h-7 rounded-lg bg-chart-2/20 flex items-center justify-center"><QrCode className="w-3.5 h-3.5 text-chart-2"/></div>
                    <div>
                      <p className="text-[10px] landing-mono uppercase text-muted-foreground">scanned</p>
                      <p className="text-xs font-semibold">2.4k today</p>
                    </div>
                  </div>
                  <div className="relative rounded-[2rem] p-2 landing-glass">
                    <span className="landing-glow-ring rounded-[2rem]" />
                    <img src={heroPhoneImg} alt="VisiCardly profile page preview" className="relative w-60 md:w-72 rounded-[1.75rem]" data-testid="img-hero-phone" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <section className="px-6 -mt-6">
          <div className="max-w-5xl mx-auto landing-glass rounded-2xl px-6 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <div key={i} className="flex flex-col items-center md:items-start">
                <p className="text-3xl font-bold tracking-tight landing-shine" data-testid={`text-stat-value-${i}`}>{stat.value}</p>
                <p className="text-[11px] landing-mono uppercase text-muted-foreground mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* MARQUEE */}
        <section className="py-12 overflow-hidden">
          <p className="text-center text-[11px] landing-mono uppercase text-muted-foreground mb-6">Connects with 50+ platforms</p>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
            <div className="landing-marquee">
              {[...Array(2)].map((_,r)=>(
                <div key={r} className="flex items-center gap-12 pr-12 text-muted-foreground">
                  {[SiInstagram, SiFacebook, SiX, SiPinterest, SiTumblr].map((Ic, i)=>(
                    <Ic key={`s${i}`} className="w-6 h-6 opacity-70 hover:opacity-100 transition-opacity"/>
                  ))}
                  {[Link2, Globe, QrCode, CreditCard, UtensilsCrossed, Users, Palette].map((Ic, i)=>(
                    <Ic key={`l${i}`} className="w-6 h-6 opacity-70 hover:opacity-100 transition-opacity"/>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[11px] landing-mono uppercase text-primary mb-3">— How it works</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 landing-shine">
                Up and running in three steps
              </h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                No technical knowledge required. If you can type a URL, you can use VisiCardly.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {STEPS.map((step, i) => (
                <div key={i} className="relative landing-glass landing-card-hover rounded-2xl p-7 overflow-hidden">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
                      <step.icon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs landing-mono text-muted-foreground/70">{step.number}</span>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 tracking-tight">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  {i < STEPS.length - 1 && (
                    <ChevronRight className="hidden md:block absolute top-1/2 -right-3 -translate-y-1/2 w-5 h-5 text-border z-10" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <Suspense fallback={null}>
          <TemplateShowcase />
        </Suspense>

        {/* FEATURES */}
        <section id="features" className="py-24 px-6 relative overflow-hidden">
          <div className="absolute inset-0 landing-grid-bg pointer-events-none opacity-60" />
          <div className="max-w-5xl mx-auto relative">
            <div className="text-center mb-16">
              <p className="text-[11px] landing-mono uppercase text-primary mb-3">— Features</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 landing-shine">
                Everything you need, <span className="italic font-serif text-muted-foreground">nothing you don't</span>
              </h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Powerful tools wrapped in a simple interface. Built for creators who value their time.
              </p>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {BENTO_FEATURES.map((feature, i) => (
                <Card key={i} className={`relative p-6 border-border/60 landing-glass landing-card-hover overflow-hidden ${feature.span}`} data-testid={`card-feature-${i}`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-4">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1.5 tracking-tight">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* WHY */}
        <section className="py-24 px-6 bg-card/30 border-y border-border/60">
          <div className="max-w-5xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <p className="text-[11px] landing-mono uppercase text-primary mb-3">— Why VisiCardly</p>
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 landing-shine">
                  Built different, <span className="italic font-serif text-muted-foreground">on purpose</span>
                </h2>
                <p className="text-muted-foreground text-base mb-8 leading-relaxed">
                  We're not another cookie-cutter link tool. VisiCardly gives you real creative control without the learning curve.
                </p>
                <div className="space-y-3">
                  {[
                    { icon: CreditCard, text: "Digital business cards with company branding and vCard sharing" },
                    { icon: Users, text: "Team management with roles, branches, and branded templates" },
                    { icon: UtensilsCrossed, text: "Menu builder for restaurants with QR code integration" },
                    { icon: QrCode, text: "Custom QR codes for profiles, menus, and business cards" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 landing-glass rounded-xl px-4 py-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
                        <item.icon className="w-4 h-4 text-primary" />
                      </div>
                      <span className="text-foreground text-sm leading-relaxed pt-1">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-[2rem] landing-phone-glow opacity-60" />
                  <div className="relative rounded-[2rem] p-2 landing-glass">
                    <span className="landing-glow-ring rounded-[2rem]" />
                    <img src={heroPhoneImg} alt="VisiCardly customization preview" className="relative w-52 md:w-64 rounded-[1.75rem]" data-testid="img-why-phone" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section id="testimonials" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-[11px] landing-mono uppercase text-primary mb-3">— Testimonials</p>
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 landing-shine">
                Loved by creators <span className="italic font-serif text-muted-foreground">everywhere</span>
              </h2>
              <p className="text-muted-foreground text-base max-w-md mx-auto">
                Don't take our word for it. Here's what our community has to say.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {TESTIMONIALS.map((t, i) => (
                <Card key={i} className="relative p-7 border-border/60 landing-glass landing-card-hover" data-testid={`card-testimonial-${i}`}>
                  <span className="absolute top-3 right-5 text-5xl leading-none text-primary/15 font-serif select-none">"</span>
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-3.5 h-3.5 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-[15px] text-foreground/90 mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-border/60">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-chart-2 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary-foreground">{t.name[0]}</span>
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

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto relative overflow-hidden rounded-3xl landing-cta-gradient border border-border/60 p-10 md:p-16 text-center">
            <div className="landing-orb landing-orb-cta-1" />
            <div className="landing-orb landing-orb-cta-2" />
            <div className="relative">
              <p className="text-[11px] landing-mono uppercase text-primary mb-3">— Start today</p>
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 landing-shine">
                Ready to claim <span className="italic font-serif text-muted-foreground">your page?</span>
              </h2>
              <p className="text-muted-foreground text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed">
                Join thousands of creators who use VisiCardly to share their world. Free forever, upgrade anytime — no hidden fees.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 flex-wrap">
                <WouterLink href="/auth?tab=register">
                  <Button size="lg" className="rounded-full px-7 shadow-lg shadow-primary/20" data-testid="button-create-page">
                    Create your page
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </WouterLink>
                <WouterLink href="/pricing">
                  <Button size="lg" variant="ghost" className="rounded-full px-7">
                    View pricing
                  </Button>
                </WouterLink>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <span className="text-xl font-bold tracking-tight text-foreground mb-4 flex items-center gap-2">
                <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain" />
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
                <li><WouterLink href="/about"><a className="text-sm text-muted-foreground hover:text-foreground">About</a></WouterLink></li>
                <li><WouterLink href="/contact"><a className="text-sm text-muted-foreground hover:text-foreground">Contact Us</a></WouterLink></li>
                <li><WouterLink href="/gdpr"><a className="text-sm text-muted-foreground hover:text-foreground">GDPR Compliance</a></WouterLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/support"><a className="text-sm text-muted-foreground hover:text-foreground">Support</a></WouterLink></li>
                <li><WouterLink href="/docs"><a className="text-sm text-muted-foreground hover:text-foreground">Documentation</a></WouterLink></li>
                <li><WouterLink href="/privacy"><a className="text-sm text-muted-foreground hover:text-foreground">Privacy Policy</a></WouterLink></li>
                <li><WouterLink href="/terms"><a className="text-sm text-muted-foreground hover:text-foreground">Terms of Service</a></WouterLink></li>
                <li><WouterLink href="/refund-policy"><a className="text-sm text-muted-foreground hover:text-foreground">Refund Policy</a></WouterLink></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">
              © 2026 VisiCardly powered by{" "}
              <a href="https://ksoftsolution.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline">KSoft Solution</a>
              . All rights reserved.
            </span>
            <div className="flex items-center gap-4">
              <a href="https://www.facebook.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-facebook"><SiFacebook className="w-4 h-4" /></a>
              <a href="https://x.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-x"><SiX className="w-4 h-4" /></a>
              <a href="https://www.instagram.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-instagram"><SiInstagram className="w-4 h-4" /></a>
              <a href="https://in.pinterest.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-pinterest"><SiPinterest className="w-4 h-4" /></a>
              <a href="https://www.tumblr.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-footer-tumblr"><SiTumblr className="w-4 h-4" /></a>
            </div>
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
