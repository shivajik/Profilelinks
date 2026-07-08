import { Link as WouterLink, useRoute } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LegalLayout from "@/components/legal-layout";
import SEO from "@/components/seo";

import {
  BookOpen,
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
  ChevronRight,
  Camera,
  Zap,
  Building2,
  UserPlus,
  Eye,
  ArrowLeft,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

import { useState, useMemo } from "react";

function ScreenshotPlaceholder({
  title,
  src,
}: {
  title: string;
  src?: string;
}) {
  if (src) {
    return (
      <div className="my-6">
        <img
          src={src}
          alt={title}
          className="rounded-lg border border-border shadow-sm w-full"
        />
        <p className="text-xs text-muted-foreground text-center mt-2">{title}</p>
      </div>
    );
  }

  return (
    <div className="my-6 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center">
      <Camera className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        Add screenshot of this section UI here
      </p>
    </div>
  );
}

type DocSection = {
  id: string;
  title: string;
  icon: LucideIcon;
  description?: string;
  screenshot?: boolean;
  items: { title: string; content: string }[];
};

const DOC_SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    description: "Create your account, pick a template, and share your page.",
    screenshot: true,
    items: [
      { title: "Create Your Account", content: "Sign up using your email and password. Choose a unique username which becomes your public page URL. Complete onboarding by adding your display name, profile image, and bio." },
      { title: "Choose Your Template", content: "Open the Design section and choose a template that matches your style. Templates control colors, layout, and fonts. You can change templates anytime without losing content." },
      { title: "Complete Your Profile", content: "Add your display name, bio, and profile picture. Some templates also support cover images which appear at the top of your page." },
      { title: "Share Your Page", content: "Your public page is available at visicardly.com/username. Share it on social media, email signatures, business cards, or anywhere you want people to find you." },
    ],
  },
  {
    id: "links-blocks",
    title: "Links & Blocks",
    icon: Link2,
    description: "Add, edit and reorder the content blocks on your profile.",
    screenshot: true,
    items: [
      { title: "Adding Links", content: "In the Design tab, click Add Block and choose Link. Enter the title and destination URL. Links appear as buttons on your public profile." },
      { title: "Available Block Types", content: "You can add many block types including URL buttons, email buttons, text sections, video embeds, images, audio embeds, and dividers." },
      { title: "Editing & Reordering", content: "Edit blocks using the edit icon. Use drag or arrow controls to reorder them. Blocks can be temporarily disabled without deleting them." },
    ],
  },
  {
    id: "pages",
    title: "Pages",
    icon: Layers,
    description: "Organise your content across multiple pages.",
    screenshot: true,
    items: [
      { title: "Multiple Pages", content: "Create multiple pages such as Links, Portfolio, or Contact. Each page contains its own blocks." },
      { title: "Managing Pages", content: "Use Manage Pages to create, rename, reorder, or delete pages. One page is always the homepage." },
    ],
  },
  {
    id: "social-links",
    title: "Social Links",
    icon: Share2,
    description: "Connect your social profiles as icons on your page.",
    screenshot: true,
    items: [
      { title: "Adding Social Profiles", content: "Add links to your social platforms such as Instagram, LinkedIn, GitHub, TikTok, and more. These appear as icons on your public page." },
      { title: "Menu Social Links", content: "If you are using the Menu Builder, you can also configure separate social links for the menu page." },
    ],
  },
  {
    id: "design",
    title: "Design & Customization",
    icon: Palette,
    description: "Templates, headers, colors and typography.",
    screenshot: true,
    items: [
      { title: "Templates", content: "Choose from a variety of templates to control your page's appearance including layout, typography, and colors." },
      { title: "Profile Header", content: "Customize your profile header with your display name, bio, profile picture, and optional cover image." },
      { title: "Visual Branding", content: "Templates allow you to create a consistent visual style for your digital presence." },
    ],
  },
  {
    id: "qr-codes",
    title: "QR Codes",
    icon: QrCode,
    description: "Generate branded QR codes for your profile and links.",
    screenshot: true,
    items: [
      { title: "Generate Profile QR", content: "Create a QR code that links directly to your profile page. Choose from different styles and frames." },
      { title: "QR Templates", content: "Use predefined QR styles categorized for business, social, events, and more." },
      { title: "Custom QR Generator", content: "Generate QR codes for any URL such as payment pages, websites, or forms." },
      { title: "Download & Print", content: "Download high-resolution QR codes and use them on business cards, product packaging, posters, or tables." },
    ],
  },
  {
    id: "menu-builder",
    title: "Menu Builder",
    icon: UtensilsCrossed,
    description: "Build digital menus for restaurants and product catalogs.",
    screenshot: true,
    items: [
      { title: "Digital Menu Page", content: "Create a dedicated menu page ideal for restaurants or product catalogs." },
      { title: "Menu Sections", content: "Organize menu items into sections like starters, main course, drinks, or desserts." },
      { title: "Menu Products", content: "Each product can include a name, description, price, and image." },
      { title: "Contact & Opening Hours", content: "Add phone number, address, WhatsApp, email, and business hours for visitors." },
    ],
  },
  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    description: "Track visitors and link engagement.",
    screenshot: true,
    items: [
      { title: "Track Visitors", content: "See how many people visit your page and track performance over time." },
      { title: "Link Click Tracking", content: "Discover which links receive the most clicks and engagement." },
    ],
  },
  {
    id: "team",
    title: "Teams & Digital Business Cards",
    icon: Users,
    description: "Invite members, manage branches and apply company branding.",
    screenshot: true,
    items: [
      { title: "Team Accounts", content: "Create team accounts and invite members using email or CSV import." },
      { title: "Digital Business Cards", content: "Each team member receives a branded digital business card with company details." },
      { title: "Company Templates", content: "Apply consistent branding across all members using company templates." },
      { title: "Branches", content: "Organize members by offices or departments using branches." },
    ],
  },
  {
    id: "business-profile",
    title: "Business Profile",
    icon: Building2,
    description: "Personal business info for each team member.",
    items: [
      { title: "Personal Business Info", content: "Team members can customize their business name, phone number, job title, and bio for their digital card." },
    ],
  },
  {
    id: "settings",
    title: "Settings & Account",
    icon: Settings,
    description: "Account, white-label and API key configuration.",
    items: [
      { title: "Account Settings", content: "Update your email, password, and username from the Settings page." },
      { title: "White Label", content: "Premium plans allow removing VisiCardly branding for a fully custom experience." },
      { title: "API Key", content: "Generate API keys for integrations with external tools and services." },
    ],
  },
  {
    id: "plans",
    title: "Plans & Billing",
    icon: CreditCard,
    description: "Free vs paid plans, subscriptions and billing management.",
    screenshot: true,
    items: [
      { title: "Free Plan", content: "The free plan allows basic usage with limited links, blocks, and pages." },
      { title: "Paid Plans", content: "Paid plans unlock advanced features including QR codes, analytics, and higher limits." },
      { title: "Billing Management", content: "Manage subscriptions, payment history, and upgrades in the billing section." },
    ],
  },
];

function DocsSidebar({ activeId }: { activeId?: string }) {
  return (
    <aside className="hidden lg:block self-start sticky top-24">
      <nav className="space-y-1 border-l border-border pl-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
        <p className="text-[11px] landing-mono uppercase text-muted-foreground mb-3 tracking-wider">
          Documentation
        </p>
        <WouterLink
          href="/docs"
          className={`flex items-center gap-2 py-1.5 text-sm transition-colors ${
            !activeId ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Overview
        </WouterLink>
        {DOC_SECTIONS.map((section) => {
          const Icon = section.icon;
          const active = activeId === section.id;
          return (
            <WouterLink
              key={section.id}
              href={`/docs/${section.id}`}
              className={`flex items-center gap-2 py-1.5 text-sm transition-colors ${
                active ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {section.title}
            </WouterLink>
          );
        })}
      </nav>
    </aside>
  );
}

function DocsIndex() {
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return DOC_SECTIONS;
    return DOC_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(query) ||
        s.description?.toLowerCase().includes(query) ||
        s.items.some(
          (i) =>
            i.title.toLowerCase().includes(query) ||
            i.content.toLowerCase().includes(query),
        ),
    );
  }, [query]);

  return (
    <>
      <SEO
        title="Documentation & Guides — VisiCardly"
        description="Full VisiCardly documentation: digital business cards, link-in-bio pages, digital menus, QR codes, teams, analytics and more. Step-by-step guides."
        path="/docs"
      />
      <div className="text-center mb-12">
        <div className="aurora-chip mb-6 mx-auto">— Documentation</div>
        <h1 className="aurora-display text-5xl md:text-6xl mb-5">
          Everything you need to <em>ship</em>.
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto mb-8">
          Guides, references and how-tos for every part of VisiCardly.
        </p>
        <input
          type="text"
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md mx-auto px-4 py-3 rounded-full landing-glass text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {filtered.map((section) => {
          const Icon = section.icon;
          return (
            <WouterLink key={section.id} href={`/docs/${section.id}`}>
              <Card className="h-full hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-4 h-4 text-primary" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    {section.description ?? `${section.items.length} topics`}
                  </p>
                  <span className="text-xs text-primary inline-flex items-center gap-1">
                    Read guide <ArrowRight className="w-3 h-3" />
                  </span>
                </CardContent>
              </Card>
            </WouterLink>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-12">
          No sections match "{searchQuery}".
        </p>
      )}
    </>
  );
}

function DocsSection({ section }: { section: DocSection }) {
  const idx = DOC_SECTIONS.findIndex((s) => s.id === section.id);
  const prev = idx > 0 ? DOC_SECTIONS[idx - 1] : null;
  const next = idx < DOC_SECTIONS.length - 1 ? DOC_SECTIONS[idx + 1] : null;
  const Icon = section.icon;

  return (
    <>
      <SEO
        title={`${section.title} — VisiCardly Docs`}
        description={section.description ?? `Learn about ${section.title} in VisiCardly.`}
        path={`/docs/${section.id}`}
      />

      <WouterLink
        href="/docs"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All documentation
      </WouterLink>

      <div className="flex items-center gap-3 mb-3">
        <Icon className="w-6 h-6 text-primary" />
        <h1 className="text-3xl md:text-4xl font-bold">{section.title}</h1>
      </div>
      {section.description && (
        <p className="text-muted-foreground mb-8">{section.description}</p>
      )}

      {section.screenshot && (
        <ScreenshotPlaceholder
          title={`${section.title} Interface`}
          src={`/docs/${section.id}.png`}
        />
      )}

      <div className="grid gap-5">
        {section.items.map((item, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-primary" />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-12 flex items-center justify-between gap-4 border-t border-border pt-6">
        {prev ? (
          <WouterLink
            href={`/docs/${prev.id}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>
              <span className="block text-[11px] uppercase tracking-wider">Previous</span>
              <span className="block text-foreground">{prev.title}</span>
            </span>
          </WouterLink>
        ) : <span />}
        {next ? (
          <WouterLink
            href={`/docs/${next.id}`}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground text-right"
          >
            <span>
              <span className="block text-[11px] uppercase tracking-wider">Next</span>
              <span className="block text-foreground">{next.title}</span>
            </span>
            <ArrowRight className="w-4 h-4" />
          </WouterLink>
        ) : <span />}
      </div>
    </>
  );
}

export default function DocsPage() {
  const [, params] = useRoute<{ section?: string }>("/docs/:section");
  const activeId = params?.section;
  const section = activeId ? DOC_SECTIONS.find((s) => s.id === activeId) : undefined;

  return (
    <LegalLayout>
      <div className="pt-8 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-10 items-start">
            <DocsSidebar activeId={activeId} />

            <div className="min-w-0">
              {activeId && !section ? (
                <div className="text-center py-16">
                  <p className="text-muted-foreground mb-4">Section not found.</p>
                  <WouterLink href="/docs">
                    <Button variant="outline">Back to docs</Button>
                  </WouterLink>
                </div>
              ) : section ? (
                <DocsSection section={section} />
              ) : (
                <DocsIndex />
              )}

              <div className="mt-20 text-center">
                <Zap className="w-10 h-10 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-3">Ready to get started?</h3>
                <div className="flex justify-center gap-4 flex-wrap">
                  <WouterLink href="/auth?tab=register">
                    <Button size="lg">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create your page
                    </Button>
                  </WouterLink>
                  <WouterLink href="/pricing">
                    <Button variant="outline" size="lg">
                      <Eye className="w-4 h-4 mr-2" />
                      View pricing
                    </Button>
                  </WouterLink>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LegalLayout>
  );
}
