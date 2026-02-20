import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Link2,
  Palette,
  Users,
  QrCode,
  BarChart3,
  UtensilsCrossed,
  CreditCard,
  Settings,
  Share2,
  Layers,
  Globe,
  BookOpen,
  ChevronRight,
  Shield,
  Smartphone,
  ImageIcon,
  Type,
  Mail,
  Clock,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

const DOC_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    items: [
      {
        title: "Create Your Account",
        content:
          "Sign up with your email and password. Choose a unique username — this becomes your public URL (e.g., linkfolio.com/yourname). Complete the onboarding wizard to set up your display name, bio, and profile picture.",
      },
      {
        title: "Choose Your Template",
        content:
          "Head to the Design section in your dashboard. Browse through our template library and pick one that matches your style. Each template offers different layouts, color schemes, and typography. You can change templates anytime.",
      },
      {
        title: "Share Your Page",
        content:
          "Your public profile is live at linkfolio.com/yourname. Copy the link from the top of your dashboard and share it on your social media bios, email signatures, business cards, or anywhere you want people to find you.",
      },
    ],
  },
  {
    id: "links-blocks",
    title: "Links & Blocks",
    icon: Link2,
    items: [
      {
        title: "Adding Links",
        content:
          "In the Design section, expand the Blocks category and click 'Add Block'. Choose 'Link' as the block type, then enter the title and URL. Links are displayed as clickable buttons on your public profile. You can toggle links on/off without deleting them.",
      },
      {
        title: "Block Types",
        content:
          "Beyond links, you can add various block types: Text blocks for descriptions, Header blocks for section titles, Image blocks for visual content, Video embeds for YouTube/Vimeo, Dividers for visual separation, and more. Each block type has its own settings.",
      },
      {
        title: "Organizing Content",
        content:
          "Use the arrow buttons to reorder blocks. Toggle blocks on/off with the switch to temporarily hide content without deleting it. Use Pages to organize content into separate tabs — perfect for separating personal and professional links.",
      },
    ],
  },
  {
    id: "pages",
    title: "Pages",
    icon: Layers,
    items: [
      {
        title: "Multiple Pages",
        content:
          "Create multiple pages to organize your content into separate tabs. For example, you might have a 'Links' page, a 'Portfolio' page, and a 'Contact' page. One page is always set as your home page.",
      },
      {
        title: "Managing Pages",
        content:
          "Click 'Manage Pages' in the Pages section to add, rename, reorder, or delete pages. Set any page as your home page. Each page has its own set of blocks that you can customize independently.",
      },
    ],
  },
  {
    id: "social-links",
    title: "Social Links",
    icon: Share2,
    items: [
      {
        title: "Portfolio Social Links",
        content:
          "Add your social media profiles in the Socials section of the Design tab. Choose from 50+ platforms including Instagram, TikTok, YouTube, Twitter/X, LinkedIn, GitHub, and many more. These appear as icons on your public profile.",
      },
      {
        title: "Menu Social Links",
        content:
          "If you have the Menu Builder enabled, you can set up separate social links specifically for your menu page. This is useful when your business has different social accounts than your personal ones. Menu socials are managed in the Menu Setup tab under 'Menu Appearance'.",
      },
    ],
  },
  {
    id: "design",
    title: "Design & Customization",
    icon: Palette,
    items: [
      {
        title: "Templates",
        content:
          "Choose from a variety of professionally designed templates. Each template defines the overall look and feel of your page including colors, layout, fonts, and styling. Switch templates anytime — your content stays the same.",
      },
      {
        title: "Profile Header",
        content:
          "Customize your display name, bio, and profile picture from the Header section. Your display name and bio appear prominently at the top of your public page. Upload a profile picture to add a personal touch.",
      },
      {
        title: "Cover Image",
        content:
          "Some templates support a cover/banner image at the top of your profile. Upload a cover image in the Header section to add visual impact to your page.",
      },
    ],
  },
  {
    id: "menu-builder",
    title: "Menu Builder",
    icon: UtensilsCrossed,
    items: [
      {
        title: "Overview",
        content:
          "The Menu Builder lets you create a dedicated digital menu page — perfect for restaurants, cafés, bars, or any business with products to showcase. Your menu lives at linkfolio.com/yourname/menu, separate from your main profile.",
      },
      {
        title: "Menu Appearance",
        content:
          "Customize your menu's branding independently from your portfolio. Set a separate display name (e.g., your restaurant name), upload a dedicated logo, choose a different template, and pick an accent color. Expand the 'Menu Appearance & Info' section in Menu Setup.",
      },
      {
        title: "Sections & Products",
        content:
          "Organize your menu into sections (e.g., Starters, Main Courses, Desserts, Drinks). Each section contains products with a name, description, price, and optional image. Drag sections and products to reorder them.",
      },
      {
        title: "Contact Information",
        content:
          "Add your business contact details including phone number, email, physical address, Google Maps link, WhatsApp number, and website. These appear in a dedicated contact card on your public menu page.",
      },
      {
        title: "Opening Hours",
        content:
          "Set your business hours for each day of the week. Toggle individual days as open or closed, and set opening and closing times. Your hours are displayed on the public menu page so customers always know when you're open.",
      },
      {
        title: "Menu Social Links",
        content:
          "Add social media links specific to your menu/business. These are separate from your portfolio social links, allowing your restaurant's Instagram to be different from your personal one.",
      },
      {
        title: "Live Preview",
        content:
          "While editing your menu, a live preview panel shows exactly how your menu will look to visitors. Toggle between mobile and desktop views to ensure it looks great on all devices. Click the external link button to open the full preview in a new tab.",
      },
    ],
  },
  {
    id: "qr-codes",
    title: "QR Codes",
    icon: QrCode,
    items: [
      {
        title: "Generate QR Codes",
        content:
          "Generate a QR code for your profile from the QR Codes section in your dashboard. Customize the size and download it as an image. Perfect for business cards, flyers, menus, or any printed material.",
      },
      {
        title: "Usage Ideas",
        content:
          "Print your QR code on business cards, add it to restaurant table tents, include it in email signatures, place it on product packaging, or display it at events. Anyone who scans it goes directly to your Linkfolio page.",
      },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    items: [
      {
        title: "Track Performance",
        content:
          "View your page analytics from the Analytics section in your dashboard. See how many people visit your page, which links get the most clicks, and track your growth over time. Analytics is available on paid plans.",
      },
    ],
  },
  {
    id: "team",
    title: "Teams",
    icon: Users,
    items: [
      {
        title: "Team Accounts",
        content:
          "Upgrade to a team account to collaborate with others. Invite team members via email, manage roles and permissions, and share templates across your team. Team features are available on plans that support multiple team members.",
      },
      {
        title: "Team Templates",
        content:
          "Create and share custom templates across your team for consistent branding. Team templates ensure everyone's page follows the same style guidelines.",
      },
      {
        title: "Contacts",
        content:
          "Manage a shared contact directory within your team. Keep track of important contacts and share them with team members.",
      },
    ],
  },
  {
    id: "settings",
    title: "Settings & Account",
    icon: Settings,
    items: [
      {
        title: "Account Settings",
        content:
          "Manage your account settings including username, email, and password from the Settings section. You can also update your profile visibility and notification preferences.",
      },
      {
        title: "Billing & Plans",
        content:
          "View your current plan, usage limits, and billing information in the Billing section. Upgrade or downgrade your plan anytime. Free plans include basic features with generous limits.",
      },
    ],
  },
  {
    id: "plans",
    title: "Plans & Limits",
    icon: CreditCard,
    items: [
      {
        title: "Free Plan",
        content:
          "The free plan includes up to 5 links, 1 page, 10 blocks, and 3 social links. It's perfect for getting started and sharing your basic online presence.",
      },
      {
        title: "Paid Plans",
        content:
          "Paid plans unlock higher limits, premium features like QR codes, analytics, custom templates, and the Menu Builder. Check the Pricing page for detailed plan comparisons and find the right fit for your needs.",
      },
      {
        title: "Usage Tracking",
        content:
          "Your current usage is displayed in the Plan Usage banner on the Design page. It shows how many links, pages, blocks, and social links you're using out of your plan's limits. When you hit a limit, you'll see an upgrade prompt.",
      },
    ],
  },
];

export default function DocsPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-[999] bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <WouterLink href="/">
            <span className="text-xl font-bold tracking-tight">
              <span className="text-primary">link</span>
              <span className="text-foreground">folio</span>
            </span>
          </WouterLink>
          <nav className="hidden md:flex items-center gap-6">
            <WouterLink href="/">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Home</span>
            </WouterLink>
            <WouterLink href="/pricing">
              <span className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Pricing</span>
            </WouterLink>
            <span className="text-sm font-medium text-foreground cursor-default">Documentation</span>
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
                  <Button>Sign up free</Button>
                </WouterLink>
              </>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
            <div className="flex flex-col px-6 py-4 gap-3">
              <WouterLink href="/">
                <span className="text-sm font-medium text-muted-foreground py-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)}>Home</span>
              </WouterLink>
              <WouterLink href="/pricing">
                <span className="text-sm font-medium text-muted-foreground py-2 cursor-pointer" onClick={() => setMobileMenuOpen(false)}>Pricing</span>
              </WouterLink>
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
                      <Button onClick={() => setMobileMenuOpen(false)}>Sign up free</Button>
                    </WouterLink>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Documentation
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              How to use <span className="text-primary">link</span>folio
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Everything you need to know to set up and manage your Linkfolio page, menu, and more.
            </p>
          </div>

          {/* Quick Nav */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-16">
            {DOC_SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  setActiveSection(activeSection === section.id ? null : section.id);
                  document.getElementById(`doc-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-colors ${
                  activeSection === section.id
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <section.icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center">{section.title}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="space-y-12">
            {DOC_SECTIONS.map((section) => (
              <div key={section.id} id={`doc-${section.id}`} className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                </div>
                <div className="grid gap-4">
                  {section.items.map((item, i) => (
                    <Card key={i} className="border-border/60">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground leading-relaxed pl-6">
                          {item.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-20 text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4">Ready to get started?</h3>
            <p className="text-muted-foreground mb-8">Create your Linkfolio page in under a minute.</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <WouterLink href="/auth?tab=register">
                <Button size="lg">Create your page</Button>
              </WouterLink>
              <WouterLink href="/pricing">
                <Button size="lg" variant="outline">View pricing</Button>
              </WouterLink>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            <span className="text-primary font-semibold">link</span>folio — All rights reserved.
          </span>
          <div className="flex items-center gap-4">
            <WouterLink href="/terms"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Terms</span></WouterLink>
            <WouterLink href="/privacy"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Privacy</span></WouterLink>
            <WouterLink href="/"><span className="text-sm text-muted-foreground hover:text-foreground cursor-pointer">Home</span></WouterLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
