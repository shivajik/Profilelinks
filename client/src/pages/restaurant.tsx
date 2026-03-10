import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import logoPath from "/logo.png";
import {
  ArrowRight,
  UtensilsCrossed,
  QrCode,
  Smartphone,
  Clock,
  Palette,
  LayoutGrid,
  ChevronRight,
  Menu,
  X,
  Star,
  Globe,
  Phone,
  MapPin,
  Share2,
  CheckCircle2,
} from "lucide-react";
import { SiFacebook, SiX, SiInstagram, SiPinterest, SiTumblr } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const RESTAURANT_FEATURES = [
  {
    icon: UtensilsCrossed,
    title: "Beautiful Digital Menus",
    description: "Create organized menus with categories like Appetizers, Main Course, Desserts — each with photos, prices, and descriptions.",
  },
  {
    icon: QrCode,
    title: "Branded QR Codes",
    description: "Generate stunning QR codes with your restaurant's branding. Print them on tables, receipts, and marketing materials.",
  },
  {
    icon: Clock,
    title: "Opening Hours & Contact",
    description: "Display your opening hours for each day of the week, along with phone, email, address, and WhatsApp for reservations.",
  },
  {
    icon: Palette,
    title: "Custom Themes & Colors",
    description: "Match your menu page to your restaurant's identity. Choose from multiple themes with custom accent colors.",
  },
  {
    icon: Smartphone,
    title: "Mobile-First Experience",
    description: "Your customers scan the QR and instantly see a gorgeous mobile-optimized menu — no app install needed.",
  },
  {
    icon: LayoutGrid,
    title: "Section-Based Organization",
    description: "Organize items into sections with descriptions. Toggle sections on/off for seasonal menus or special events.",
  },
];

const RESTAURANT_STEPS = [
  {
    number: "01",
    title: "Sign up & select Restaurant",
    description: "Create your team account and select 'Restaurant' as your business type during onboarding.",
  },
  {
    number: "02",
    title: "Build your menu",
    description: "Add categories, products with photos and prices. Import default items to get started quickly.",
  },
  {
    number: "03",
    title: "Print your QR code",
    description: "Generate a branded QR code, download it, and place it on every table. Customers scan and browse instantly.",
  },
];

const RESTAURANT_BENEFITS = [
  "No more reprinting paper menus for price changes",
  "Update your menu in real-time from any device",
  "Track how many customers scan your QR code",
  "Social media links for your restaurant's pages",
  "Google Maps integration for directions",
  "WhatsApp integration for reservations",
];

const RESTAURANT_TESTIMONIALS = [
  {
    name: "Marco R.",
    role: "Café Owner",
    text: "We replaced all our paper menus with VisiCardly QR codes. Customers love the convenience, and we save on printing costs every month.",
  },
  {
    name: "Priya S.",
    role: "Restaurant Manager",
    text: "The menu builder is incredibly easy to use. We update prices and specials in seconds, and every table has a branded QR code.",
  },
  {
    name: "Ahmed K.",
    role: "Food Truck Owner",
    text: "Perfect for my food truck! I change my menu daily and customers just scan the QR. The opening hours feature is a lifesaver.",
  },
];

export default function RestaurantLanding() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-[999] bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <WouterLink href="/">
            <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain" />
          </WouterLink>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it works</a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            <WouterLink href="/pricing">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Pricing</span>
            </WouterLink>
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <WouterLink href="/dashboard">
                <Button>Dashboard</Button>
              </WouterLink>
            ) : (
              <>
                <WouterLink href="/auth">
                  <Button variant="ghost">Log in</Button>
                </WouterLink>
                <WouterLink href="/auth?tab=register">
                  <Button>Get Started Free</Button>
                </WouterLink>
              </>
            )}
          </div>
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="flex flex-col px-6 py-4 gap-3">
              <a href="#features" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>How it works</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground py-2" onClick={() => setMobileMenuOpen(false)}>Testimonials</a>
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                {user ? (
                  <WouterLink href="/dashboard">
                    <Button onClick={() => setMobileMenuOpen(false)}>Dashboard</Button>
                  </WouterLink>
                ) : (
                  <>
                    <WouterLink href="/auth">
                      <Button variant="ghost" onClick={() => setMobileMenuOpen(false)}>Log in</Button>
                    </WouterLink>
                    <WouterLink href="/auth?tab=register">
                      <Button onClick={() => setMobileMenuOpen(false)}>Get Started</Button>
                    </WouterLink>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 px-6 overflow-hidden">
          <div className="landing-orb landing-orb-1" />
          <div className="landing-orb landing-orb-2" />
          <div className="max-w-5xl mx-auto relative text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-8">
              <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
              Built for Restaurants & Cafés
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] mb-6 text-foreground">
              Your restaurant menu,{" "}
              <span className="landing-gradient-text">digitized</span>{" "}
              & QR-ready
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Create a beautiful digital menu, generate branded QR codes, and let customers browse your offerings from their phones. No app needed — just scan and explore.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <WouterLink href="/auth?tab=register">
                <Button size="lg">
                  Create Your Menu Free
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </WouterLink>
              <a href="#how-it-works">
                <Button variant="outline" size="lg">
                  See How It Works
                </Button>
              </a>
            </div>

            {/* QR Code Demo */}
            <div className="mt-16 flex items-center justify-center gap-8 flex-wrap">
              <div className="relative">
                <div className="w-48 h-48 rounded-2xl border-4 border-primary/20 bg-card flex items-center justify-center shadow-xl">
                  <div className="text-center space-y-2">
                    <QrCode className="w-20 h-20 text-primary mx-auto" />
                    <p className="text-xs font-medium text-muted-foreground">Scan to view menu</p>
                  </div>
                </div>
                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow-lg">
                  QR
                </div>
              </div>
              <ChevronRight className="w-8 h-8 text-muted-foreground hidden sm:block" />
              <div className="w-56 rounded-2xl border shadow-xl overflow-hidden bg-card">
                <div className="h-16 bg-primary/10 flex items-center justify-center">
                  <UtensilsCrossed className="w-6 h-6 text-primary" />
                </div>
                <div className="p-4 space-y-2">
                  <p className="text-sm font-bold text-foreground">Your Restaurant</p>
                  <div className="space-y-1.5">
                    {["🥗 Caesar Salad — ₹299", "🍝 Pasta Arrabbiata — ₹449", "🍰 Tiramisu — ₹349"].map((item, i) => (
                      <div key={i} className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2.5 py-1.5">{item}</div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center pt-1">Powered by VisiCardly</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 px-6 bg-card border-y border-border">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Everything your restaurant needs
              </h2>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                From digital menus to QR codes, we've got your restaurant covered.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {RESTAURANT_FEATURES.map((feature, i) => (
                <Card key={i} className="p-6 border-border/60">
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

        {/* How it works */}
        <section id="how-it-works" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">How it works</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Go digital in three steps
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {RESTAURANT_STEPS.map((step, i) => (
                <div key={i} className="relative">
                  <span className="text-5xl font-black text-primary/15 leading-none select-none">{step.number}</span>
                  <h3 className="text-lg font-bold text-foreground mb-2 mt-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  {i < RESTAURANT_STEPS.length - 1 && (
                    <ChevronRight className="hidden md:block absolute top-6 -right-5 w-5 h-5 text-border" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits checklist */}
        <section className="py-24 px-6 bg-card border-y border-border">
          <div className="max-w-4xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Why go digital</p>
                <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-6">
                  Replace paper menus forever
                </h2>
                <div className="space-y-3">
                  {RESTAURANT_BENEFITS.map((benefit, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground leading-relaxed">{benefit}</span>
                    </div>
                  ))}
                </div>
                <WouterLink href="/auth?tab=register">
                  <Button size="lg" className="mt-8">
                    Start Building Your Menu
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </WouterLink>
              </div>
              <div className="flex justify-center">
                <div className="w-64 rounded-2xl border-4 border-primary/10 shadow-xl overflow-hidden bg-background">
                  <div className="h-20 bg-gradient-to-r from-primary/20 to-primary/5 flex items-center justify-center">
                    <div className="text-center">
                      <UtensilsCrossed className="w-8 h-8 text-primary mx-auto mb-1" />
                      <p className="text-xs font-bold text-foreground">Digital Menu</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {["Appetizers", "Main Course", "Desserts", "Beverages"].map((cat, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs border rounded-md px-3 py-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="font-medium text-foreground">{cat}</span>
                        <span className="ml-auto text-muted-foreground">{3 + i} items</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Mon-Sun: 9AM - 10PM</span>
                    </div>
                    <div className="flex items-center justify-center gap-3 pt-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      <Globe className="w-3 h-3 text-muted-foreground" />
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section id="testimonials" className="py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Testimonials</p>
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4">
                Restaurants love VisiCardly
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {RESTAURANT_TESTIMONIALS.map((t, i) => (
                <Card key={i} className="p-6 border-border/60">
                  <div className="flex items-center gap-1 mb-4">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-3">
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

        {/* CTA */}
        <section className="py-28 px-6 relative overflow-hidden bg-card border-t border-border">
          <div className="landing-orb landing-orb-cta-1" />
          <div className="max-w-2xl mx-auto text-center relative">
            <h2 className="text-3xl md:text-5xl font-extrabold text-foreground mb-6">
              Ready to digitize your menu?
            </h2>
            <p className="text-muted-foreground text-lg md:text-xl mb-10 max-w-lg mx-auto leading-relaxed">
              Join hundreds of restaurants using VisiCardly to serve their menus digitally. Free to start.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <WouterLink href="/auth?tab=register">
                <Button size="lg">
                  Create Your Menu
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </WouterLink>
              <WouterLink href="/pricing">
                <Button size="lg" variant="outline">
                  View Pricing
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
              <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain mb-4" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                The simplest way to create digital menus with QR codes for your restaurant.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-muted-foreground hover:text-foreground">Features</a></li>
                <li><WouterLink href="/pricing"><a className="text-sm text-muted-foreground hover:text-foreground">Pricing</a></WouterLink></li>
                <li><WouterLink href="/docs"><a className="text-sm text-muted-foreground hover:text-foreground">Documentation</a></WouterLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/about"><a className="text-sm text-muted-foreground hover:text-foreground">About</a></WouterLink></li>
                <li><WouterLink href="/contact"><a className="text-sm text-muted-foreground hover:text-foreground">Contact</a></WouterLink></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2.5">
                <li><WouterLink href="/terms"><a className="text-sm text-muted-foreground hover:text-foreground">Terms</a></WouterLink></li>
                <li><WouterLink href="/privacy"><a className="text-sm text-muted-foreground hover:text-foreground">Privacy</a></WouterLink></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">VisiCardly. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <a href="https://www.facebook.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiFacebook className="w-4 h-4" /></a>
              <a href="https://x.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiX className="w-4 h-4" /></a>
              <a href="https://www.instagram.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors"><SiInstagram className="w-4 h-4" /></a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
