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
  ChevronRight,
  Star,
  Shield,
  Globe,
  MousePointerClick,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import heroPhoneImg from "@/assets/images/hero-phone.png";
import featureOrganizeImg from "@/assets/images/feature-organize.png";
import featureCustomizeImg from "@/assets/images/feature-customize.png";
import featureShareImg from "@/assets/images/feature-share.png";

const TICKER_ITEMS = [
  { icon: Zap, label: "Powerful Link Builder" },
  { icon: Palette, label: "Fully Customizable" },
  { icon: MousePointerClick, label: "Go Live in Minutes" },
  { icon: Shield, label: "Powerful Link Builder" },
  { icon: Sparkles, label: "Fully Customizable" },
  { icon: Globe, label: "Go Live in Minutes" },
  { icon: Zap, label: "Powerful Link Builder" },
  { icon: Palette, label: "Fully Customizable" },
  { icon: MousePointerClick, label: "Go Live in Minutes" },
  { icon: Shield, label: "Powerful Link Builder" },
  { icon: Sparkles, label: "Fully Customizable" },
  { icon: Globe, label: "Go Live in Minutes" },
];

const TESTIMONIALS = [
  {
    name: "Sarah M.",
    role: "Content Creator",
    text: "Linkfolio made it so easy to organize all my links in one place. My followers can now find everything instantly!",
    rating: 5,
  },
  {
    name: "Jason R.",
    role: "Freelance Designer",
    text: "The customization options are incredible. My link page matches my brand perfectly and looks super professional.",
    rating: 5,
  },
  {
    name: "Priya K.",
    role: "Small Business Owner",
    text: "I switched from Linktree and haven't looked back. Linkfolio is more powerful and so much easier to use.",
    rating: 5,
  },
  {
    name: "Alex T.",
    role: "Musician",
    text: "Setup took less than 5 minutes. Now all my streaming links, merch, and tour dates are in one clean page.",
    rating: 5,
  },
];

const WHY_CHOOSE = [
  {
    icon: Palette,
    title: "More customizable",
    description: "Full control over your page design with themes, colors, fonts, and layout options.",
    color: "#E8D5F5",
  },
  {
    icon: Zap,
    title: "More powerful",
    description: "Advanced analytics, scheduling, and smart links that adapt to your audience.",
    color: "#D5F0E8",
  },
  {
    icon: Star,
    title: "More affordable",
    description: "Get premium features for free. No hidden fees, no surprise charges.",
    color: "#F5E6D5",
  },
  {
    icon: Users,
    title: "Great for teams",
    description: "Share and collaborate with your team. Perfect for brands and organizations.",
    color: "#D5E5F5",
  },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-white dark:bg-background overflow-x-hidden">
      <header className="fixed top-0 left-0 right-0 z-[999] bg-white/90 dark:bg-background/90 backdrop-blur-md border-b border-gray-100 dark:border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <WouterLink href="/">
            <span className="text-xl font-bold tracking-tight" data-testid="text-logo">
              <span className="text-primary">link</span>folio
            </span>
          </WouterLink>
          <nav className="hidden md:flex items-center gap-6 flex-wrap">
            <a href="#features" className="text-sm font-medium text-gray-600 dark:text-muted-foreground" data-testid="link-features">
              Features
            </a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 dark:text-muted-foreground" data-testid="link-testimonials">
              Testimonials
            </a>
            <a href="#why-choose" className="text-sm font-medium text-gray-600 dark:text-muted-foreground" data-testid="link-why-choose">
              Why Linkfolio
            </a>
          </nav>
          <div className="flex items-center gap-3 flex-wrap">
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
        </div>
      </header>

      <main>
        <section className="relative pt-28 pb-8 px-6" style={{ background: "linear-gradient(180deg, #F3EAFF 0%, #FFF8E1 50%, #E8F5E9 100%)" }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="text-center lg:text-left">
                <div className="flex flex-wrap justify-center lg:justify-start gap-2 mb-6">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "#FFD54F", color: "#5D4037" }}>
                    <Star className="w-3 h-3" /> New
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: "#CE93D8", color: "#4A148C" }}>
                    <Sparkles className="w-3 h-3" /> 50+ Social Platforms
                  </span>
                </div>
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-gray-900">
                  Centralize your{" "}
                  <span className="text-primary">online presence</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-600 max-w-lg mx-auto lg:mx-0 mb-8 leading-relaxed">
                  Gather your social media, videos, articles, and more into a beautiful, customizable link page. Share one URL everywhere.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <WouterLink href="/auth?tab=register">
                    <Button size="lg" data-testid="button-get-started">
                      Get started for free
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </WouterLink>
                  <a href="#features">
                    <Button variant="outline" size="lg" className="bg-white/60 dark:bg-background/60" data-testid="button-learn-more">
                      Learn more
                    </Button>
                  </a>
                </div>
              </div>
              <div className="flex justify-center lg:justify-end flex-wrap">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-3xl opacity-30 blur-2xl" style={{ background: "linear-gradient(135deg, #CE93D8 0%, #FFD54F 50%, #81C784 100%)" }} />
                  <img
                    src={heroPhoneImg}
                    alt="Linkfolio profile page preview"
                    className="relative w-64 md:w-72 rounded-2xl shadow-2xl"
                    data-testid="img-hero-phone"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-4 overflow-hidden" style={{ background: "#6C5CE7" }}>
          <div className="ticker-wrapper">
            <div className="ticker-track">
              {TICKER_ITEMS.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-6 whitespace-nowrap">
                  <item.icon className="w-4 h-4 text-white/80" />
                  <span className="text-sm font-semibold text-white tracking-wide uppercase">{item.label}</span>
                  <ChevronRight className="w-3 h-3 text-white/40" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="testimonials" className="py-20 px-6" style={{ background: "#FFF8E1" }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
                What are people saying<br />about us?
              </h2>
              <p className="text-gray-600 text-lg max-w-md mx-auto">
                Thousands of creators trust Linkfolio to power their online presence.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {TESTIMONIALS.map((t, i) => (
                <Card key={i} className="p-5 bg-white dark:bg-card border-0 shadow-sm">
                  <div className="flex items-center gap-1 mb-3">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-card-foreground mb-4 leading-relaxed">{t.text}</p>
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-card-foreground">{t.name}</p>
                    <p className="text-xs text-gray-500 dark:text-muted-foreground">{t.role}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section id="why-choose" className="py-20 px-6 bg-white dark:bg-background">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              <div className="lg:sticky lg:top-28 z-[999]">
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-foreground mb-6">
                  Why choose<br />Linkfolio?
                </h2>
                <p className="text-gray-600 dark:text-muted-foreground text-lg mb-8 leading-relaxed max-w-md">
                  Built with creators and businesses in mind. We offer the most customizable and powerful link-in-bio tool that grows with you.
                </p>
                <WouterLink href="/auth?tab=register">
                  <Button size="lg" data-testid="button-try-free">
                    Try it free
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </WouterLink>
              </div>
              <div className="grid sm:grid-cols-2 gap-5">
                {WHY_CHOOSE.map((item, i) => (
                  <Card key={i} className="p-6 border-0 shadow-sm" style={{ background: item.color }}>
                    <div className="w-10 h-10 rounded-md bg-white/70 flex items-center justify-center mb-4">
                      <item.icon className="w-5 h-5 text-gray-800" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{item.description}</p>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-20 px-6" style={{ background: "#E8D5F5" }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                  Organize your links beautifully
                </h2>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed max-w-md">
                  Group related links into sections, reorder with drag-and-drop, and keep your page clean and organized for your audience.
                </p>
                <div className="space-y-3 mb-8">
                  {["Drag-and-drop reordering", "Unlimited link blocks", "Custom link titles & descriptions"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <span className="text-gray-800 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <WouterLink href="/auth?tab=register">
                  <Button size="lg" data-testid="button-start-organizing">
                    Start organizing
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </WouterLink>
              </div>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-3xl opacity-20 blur-2xl" style={{ background: "#9C27B0" }} />
                  <img
                    src={featureOrganizeImg}
                    alt="Organize links feature"
                    className="relative w-56 md:w-64 rounded-2xl shadow-xl"
                    data-testid="img-feature-organize"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6" style={{ background: "#D5F0E8" }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="flex justify-center order-2 lg:order-1">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-3xl opacity-20 blur-2xl" style={{ background: "#26A69A" }} />
                  <img
                    src={featureCustomizeImg}
                    alt="Customize your page"
                    className="relative w-56 md:w-64 rounded-2xl shadow-xl"
                    data-testid="img-feature-customize"
                  />
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                  Customize every detail
                </h2>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed max-w-md">
                  Choose from beautiful templates, customize colors and fonts, add your profile picture, and make your page truly yours.
                </p>
                <div className="space-y-3 mb-8">
                  {["Multiple design templates", "Custom colors & fonts", "Profile picture & bio"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <span className="text-gray-800 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <WouterLink href="/auth?tab=register">
                  <Button size="lg" data-testid="button-start-customizing">
                    Start customizing
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </WouterLink>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6" style={{ background: "#FCE4EC" }}>
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-6">
                  Share with the world
                </h2>
                <p className="text-gray-700 text-lg mb-6 leading-relaxed max-w-md">
                  Get your own custom URL and share it everywhere. Connect 50+ social media platforms and let your audience find you instantly.
                </p>
                <div className="space-y-3 mb-8">
                  {["Custom shareable URL", "50+ social platforms", "Works on any device"].map((item, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      <span className="text-gray-800 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <WouterLink href="/auth?tab=register">
                  <Button size="lg" data-testid="button-claim-url">
                    Claim your URL
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </WouterLink>
              </div>
              <div className="flex justify-center">
                <div className="relative">
                  <div className="absolute -inset-6 rounded-3xl opacity-20 blur-2xl" style={{ background: "#E91E63" }} />
                  <img
                    src={featureShareImg}
                    alt="Share everywhere feature"
                    className="relative w-56 md:w-64 rounded-2xl shadow-xl"
                    data-testid="img-feature-share"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-6 bg-white dark:bg-background">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-foreground mb-4">
                Everything you need in one place
              </h2>
              <p className="text-gray-600 dark:text-muted-foreground text-lg max-w-lg mx-auto">
                Simple, powerful tools designed for creators, businesses, and anyone who wants to share their online presence.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Link2 className="w-5 h-5" />}
                title="Unlimited Links"
                description="Add as many links as you want. Organize and customize each one to match your brand."
              />
              <FeatureCard
                icon={<Palette className="w-5 h-5" />}
                title="Beautiful Profiles"
                description="Personalize your page with themes, colors, profile pictures, and your personal bio."
              />
              <FeatureCard
                icon={<Share2 className="w-5 h-5" />}
                title="Share Everywhere"
                description="Get your custom URL to share on social media, email signatures, or anywhere."
              />
              <FeatureCard
                icon={<LayoutGrid className="w-5 h-5" />}
                title="Social Integration"
                description="Connect 50+ social media platforms and display them beautifully on your page."
              />
              <FeatureCard
                icon={<Layers className="w-5 h-5" />}
                title="Drag & Drop"
                description="Reorder your links effortlessly with intuitive drag-and-drop functionality."
              />
              <FeatureCard
                icon={<Globe className="w-5 h-5" />}
                title="Mobile Friendly"
                description="Your page looks stunning on every device, from phones to desktops."
              />
            </div>
          </div>
        </section>

        <section className="py-24 px-6 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #6C5CE7 0%, #A29BFE 50%, #6C5CE7 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <div className="max-w-3xl mx-auto text-center relative">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6">
              Try Linkfolio now!
            </h2>
            <p className="text-white/80 text-lg md:text-xl mb-10 max-w-lg mx-auto leading-relaxed">
              Join thousands of creators who trust Linkfolio to power their online presence. It's free to get started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <WouterLink href="/auth?tab=register">
                <Button size="lg" className="bg-white text-primary border-white" data-testid="button-create-page">
                  Create your page
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </WouterLink>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gray-900 text-gray-300 py-14 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-10 mb-12">
            <div>
              <span className="text-xl font-bold tracking-tight text-white mb-4 block">
                <span className="text-primary">link</span>folio
              </span>
              <p className="text-sm text-gray-400 leading-relaxed">
                The simplest way to share your online presence. One link for everything.
              </p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5">
                <li><a href="#features" className="text-sm text-gray-400" data-testid="link-footer-features">Features</a></li>
                <li><a href="#testimonials" className="text-sm text-gray-400" data-testid="link-footer-testimonials">Testimonials</a></li>
                <li><a href="#why-choose" className="text-sm text-gray-400" data-testid="link-footer-pricing">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-400">About</span></li>
                <li><span className="text-sm text-gray-400">Blog</span></li>
                <li><span className="text-sm text-gray-400">Careers</span></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-400">Help Center</span></li>
                <li><span className="text-sm text-gray-400">Privacy Policy</span></li>
                <li><span className="text-sm text-gray-400">Terms of Service</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 flex-wrap">
            <span className="text-sm text-gray-500">
              Linkfolio. All rights reserved.
            </span>
            <span className="text-sm text-gray-500">
              Built with care
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="flex flex-col items-center text-center p-7 bg-card border-border/50">
      <div className="w-12 h-12 rounded-md bg-primary/10 text-primary flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="font-bold text-base mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </Card>
  );
}
