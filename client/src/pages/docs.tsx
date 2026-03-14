import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoPath from "/logo.png";

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
  Globe,
  ChevronRight,
  Menu,
  X,
  Camera,
  Zap,
  Building2,
  UserPlus,
  Eye,
} from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useState } from "react";

import { SiFacebook, SiX, SiInstagram, SiPinterest, SiTumblr } from "react-icons/si";

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

const DOC_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    screenshot: true,
    items: [
      {
        title: "Create Your Account",
        content:
          "Sign up using your email and password. Choose a unique username which becomes your public page URL. Complete onboarding by adding your display name, profile image, and bio.",
      },
      {
        title: "Choose Your Template",
        content:
          "Open the Design section and choose a template that matches your style. Templates control colors, layout, and fonts. You can change templates anytime without losing content.",
      },
      {
        title: "Complete Your Profile",
        content:
          "Add your display name, bio, and profile picture. Some templates also support cover images which appear at the top of your page.",
      },
      {
        title: "Share Your Page",
        content:
          "Your public page is available at visicardly.com/username. Share it on social media, email signatures, business cards, or anywhere you want people to find you.",
      },
    ],
  },

  {
    id: "links-blocks",
    title: "Links & Blocks",
    icon: Link2,
    screenshot: true,
    items: [
      {
        title: "Adding Links",
        content:
          "In the Design tab, click Add Block and choose Link. Enter the title and destination URL. Links appear as buttons on your public profile.",
      },
      {
        title: "Available Block Types",
        content:
          "You can add many block types including URL buttons, email buttons, text sections, video embeds, images, audio embeds, and dividers.",
      },
      {
        title: "Editing & Reordering",
        content:
          "Edit blocks using the edit icon. Use drag or arrow controls to reorder them. Blocks can be temporarily disabled without deleting them.",
      },
    ],
  },

  {
    id: "pages",
    title: "Pages",
    icon: Layers,
    screenshot: true,
    items: [
      {
        title: "Multiple Pages",
        content:
          "Create multiple pages such as Links, Portfolio, or Contact. Each page contains its own blocks.",
      },
      {
        title: "Managing Pages",
        content:
          "Use Manage Pages to create, rename, reorder, or delete pages. One page is always the homepage.",
      },
    ],
  },

  {
    id: "social-links",
    title: "Social Links",
    icon: Share2,
    screenshot: true,
    items: [
      {
        title: "Adding Social Profiles",
        content:
          "Add links to your social platforms such as Instagram, LinkedIn, GitHub, TikTok, and more. These appear as icons on your public page.",
      },
      {
        title: "Menu Social Links",
        content:
          "If you are using the Menu Builder, you can also configure separate social links for the menu page.",
      },
    ],
  },

  {
    id: "design",
    title: "Design & Customization",
    icon: Palette,
    screenshot: true,
    items: [
      {
        title: "Templates",
        content:
          "Choose from a variety of templates to control your page's appearance including layout, typography, and colors.",
      },
      {
        title: "Profile Header",
        content:
          "Customize your profile header with your display name, bio, profile picture, and optional cover image.",
      },
      {
        title: "Visual Branding",
        content:
          "Templates allow you to create a consistent visual style for your digital presence.",
      },
    ],
  },

  {
    id: "qr-codes",
    title: "QR Codes",
    icon: QrCode,
    screenshot: true,
    items: [
      {
        title: "Generate Profile QR",
        content:
          "Create a QR code that links directly to your profile page. Choose from different styles and frames.",
      },
      {
        title: "QR Templates",
        content:
          "Use predefined QR styles categorized for business, social, events, and more.",
      },
      {
        title: "Custom QR Generator",
        content:
          "Generate QR codes for any URL such as payment pages, websites, or forms.",
      },
      {
        title: "Download & Print",
        content:
          "Download high-resolution QR codes and use them on business cards, product packaging, posters, or tables.",
      },
    ],
  },

  {
    id: "menu-builder",
    title: "Menu Builder",
    icon: UtensilsCrossed,
    screenshot: true,
    items: [
      {
        title: "Digital Menu Page",
        content:
          "Create a dedicated menu page ideal for restaurants or product catalogs.",
      },
      {
        title: "Menu Sections",
        content:
          "Organize menu items into sections like starters, main course, drinks, or desserts.",
      },
      {
        title: "Menu Products",
        content:
          "Each product can include a name, description, price, and image.",
      },
      {
        title: "Contact & Opening Hours",
        content:
          "Add phone number, address, WhatsApp, email, and business hours for visitors.",
      },
    ],
  },

  {
    id: "analytics",
    title: "Analytics",
    icon: BarChart3,
    screenshot: true,
    items: [
      {
        title: "Track Visitors",
        content:
          "See how many people visit your page and track performance over time.",
      },
      {
        title: "Link Click Tracking",
        content:
          "Discover which links receive the most clicks and engagement.",
      },
    ],
  },

  {
    id: "team",
    title: "Teams & Digital Business Cards",
    icon: Users,
    screenshot: true,
    items: [
      {
        title: "Team Accounts",
        content:
          "Create team accounts and invite members using email or CSV import.",
      },
      {
        title: "Digital Business Cards",
        content:
          "Each team member receives a branded digital business card with company details.",
      },
      {
        title: "Company Templates",
        content:
          "Apply consistent branding across all members using company templates.",
      },
      {
        title: "Branches",
        content:
          "Organize members by offices or departments using branches.",
      },
    ],
  },

  {
    id: "business-profile",
    title: "Business Profile",
    icon: Building2,
    items: [
      {
        title: "Personal Business Info",
        content:
          "Team members can customize their business name, phone number, job title, and bio for their digital card.",
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
          "Update your email, password, and username from the Settings page.",
      },
      {
        title: "White Label",
        content:
          "Premium plans allow removing VisiCardly branding for a fully custom experience.",
      },
      {
        title: "API Key",
        content:
          "Generate API keys for integrations with external tools and services.",
      },
    ],
  },

  {
    id: "plans",
    title: "Plans & Billing",
    icon: CreditCard,
    screenshot: true,
    items: [
      {
        title: "Free Plan",
        content:
          "The free plan allows basic usage with limited links, blocks, and pages.",
      },
      {
        title: "Paid Plans",
        content:
          "Paid plans unlock advanced features including QR codes, analytics, and higher limits.",
      },
      {
        title: "Billing Management",
        content:
          "Manage subscriptions, payment history, and upgrades in the billing section.",
      },
    ],
  },
];

export default function DocsPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = searchQuery.trim()
    ? DOC_SECTIONS.map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter((section) => section.items.length > 0)
    : DOC_SECTIONS;

  return (
    <div className="min-h-screen bg-background">
      <main className="pt-24 pb-20 px-6">
        <div className="max-w-5xl mx-auto">

          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">
              VisiCardly Documentation
            </h1>

            <input
              type="text"
              placeholder="Search documentation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md mx-auto px-4 py-2 border rounded-lg"
            />
          </div>

          <div className="space-y-16">
            {filteredSections.map((section) => (
              <div key={section.id}>
                <div className="flex items-center gap-3 mb-6">
                  <section.icon className="w-5 h-5 text-primary" />
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                </div>

                {section.screenshot && (
                  <ScreenshotPlaceholder
                    title={`${section.title} Interface`}
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
                        <p className="text-sm text-muted-foreground">
                          {item.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-20 text-center">
            <Zap className="w-10 h-10 text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-3">
              Ready to get started?
            </h3>

            <div className="flex justify-center gap-4">
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
      </main>
    </div>
  );
}