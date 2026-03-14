import { Link as WouterLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import logoPath from "/logo.png";
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
  FileText,
  Camera,
  Zap,
  Download,
  Building2,
  UserPlus,
  Eye,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { SiFacebook, SiX, SiInstagram, SiPinterest, SiTumblr } from "react-icons/si";

// Screenshot placeholder component
function ScreenshotPlaceholder({ label, guide }: { label: string; guide: string }) {
  return (
    <div className="my-4 rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 text-center">
      <Camera className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground/70 mt-1 max-w-md mx-auto">{guide}</p>
    </div>
  );
}

const DOC_SECTIONS = [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: BookOpen,
    items: [
      {
        title: "Create Your Account",
        content:
          "Sign up with your email and password. Choose a unique username — this becomes your public URL (e.g., visicardly.com/yourname). Complete the onboarding wizard to set up your display name, bio, and profile picture.",
        screenshot: {
          label: "📸 Screenshot: Registration Page",
          guide: "Take a screenshot of the Sign Up form at /auth?tab=register showing the email, password, and username fields.",
        },
      },
      {
        title: "Choose Your Template",
        content:
          "Head to the Design section in your dashboard. Browse through our template library and pick one that matches your style. Each template offers different layouts, color schemes, and typography. You can change templates anytime.",
        screenshot: {
          label: "📸 Screenshot: Template Selection",
          guide: "Take a screenshot of the Design tab in the dashboard showing the template grid with multiple template options.",
        },
      },
      {
        title: "Complete Your Profile",
        content:
          "Fill in your display name, write a short bio, and upload a professional profile picture. You can also add a cover image for supported templates. These details appear at the top of your public page.",
        screenshot: {
          label: "📸 Screenshot: Profile Header Setup",
          guide: "Take a screenshot of the Design tab showing the Header section with display name, bio, and profile picture upload fields.",
        },
      },
      {
        title: "Share Your Page",
        content:
          "Your public profile is live at visicardly.com/yourname. Copy the link from the top of your dashboard and share it on your social media bios, email signatures, business cards, or anywhere you want people to find you.",
        screenshot: {
          label: "📸 Screenshot: Public Profile Page",
          guide: "Take a screenshot of a completed public profile page (e.g., visicardly.com/yourname) showing how it looks to visitors.",
        },
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
        screenshot: {
          label: "📸 Screenshot: Add Block Dialog",
          guide: "Take a screenshot of the 'Add Block' dialog or the block type selection showing URL Button, Text, Divider, Video, etc.",
        },
      },
      {
        title: "Block Types",
        content:
          "Beyond links, you can add various block types: URL Buttons for links, Email Buttons for email addresses, Text blocks for descriptions, Video embeds for YouTube/Vimeo, Audio embeds, Image blocks for visual content, and Dividers for visual separation. Each block type has its own settings.",
        screenshot: {
          label: "📸 Screenshot: Block Types Overview",
          guide: "Take a screenshot showing multiple different blocks on a profile — links, text, images, dividers — to demonstrate the variety.",
        },
      },
      {
        title: "Editing & Reordering Blocks",
        content:
          "Click the edit icon on any block to modify its content. Use the up/down arrows to reorder blocks. Toggle blocks on/off with the switch to temporarily hide content without deleting it. Changes are saved immediately.",
        screenshot: {
          label: "📸 Screenshot: Block Editing",
          guide: "Take a screenshot of the Design tab showing blocks with edit, delete, and toggle controls visible.",
        },
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
        screenshot: {
          label: "📸 Screenshot: Pages Management",
          guide: "Take a screenshot of the Pages section showing multiple page tabs and the 'Manage Pages' option.",
        },
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
        screenshot: {
          label: "📸 Screenshot: Social Links Section",
          guide: "Take a screenshot of the Socials section in the Design tab showing the platform dropdown and added social links.",
        },
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
        screenshot: {
          label: "📸 Screenshot: Template Gallery",
          guide: "Take a screenshot of the Design section showing the full template grid with different template previews and their names.",
        },
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
        screenshot: {
          label: "📸 Screenshot: Cover Image Upload",
          guide: "Take a screenshot showing the cover image upload area in the Header section, ideally with a cover image already uploaded.",
        },
      },
    ],
  },
  {
    id: "qr-codes",
    title: "QR Codes",
    icon: QrCode,
    items: [
      {
        title: "Profile QR Codes",
        content:
          "Generate beautiful QR codes for your profile from the QR Codes section. Choose from 12 unique frame styles including Circle, Square, Elegant, Badge, Heart, Bubble, and Tag shapes. Each style creates a distinct, eye-catching QR code.",
        screenshot: {
          label: "📸 Screenshot: QR Code Creator",
          guide: "Take a screenshot of the QR Code creation dialog showing the style options (circle, heart, badge, etc.) and the color picker.",
        },
      },
      {
        title: "QR Templates",
        content:
          "Use pre-designed QR templates organized by category — Business, Social, Events, Food & Dining, Feedback, Health, and General. Each template provides a curated combination of frame style, colors, and settings. Simply click a template to apply it, then customize further if needed.",
        screenshot: {
          label: "📸 Screenshot: QR Template Gallery",
          guide: "Take a screenshot of the QR Code creation dialog showing the template grid with category filter buttons (All, Business, Social, Events, etc.).",
        },
      },
      {
        title: "URL QR Generator",
        content:
          "Generate QR codes for any URL — not just your profile. Navigate to the QR Generator section in the sidebar, enter any URL, and create a styled QR code. Great for linking to websites, Google Forms, payment pages, or any web address.",
        screenshot: {
          label: "📸 Screenshot: URL QR Generator",
          guide: "Take a screenshot of the QR Generator panel showing the URL input field and a generated QR code with custom styling.",
        },
      },
      {
        title: "Custom Styling",
        content:
          "Fine-tune your QR code's appearance with primary and secondary colors, border radius, border width, scan text toggle, and custom text (company name or label). Download your QR code as a high-resolution PNG image.",
      },
      {
        title: "Usage Ideas",
        content:
          "Print your QR code on business cards, add it to restaurant table tents, include it in email signatures, place it on product packaging, or display it at events. Anyone who scans it goes directly to your VisiCardly page or chosen URL.",
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
          "The Menu Builder lets you create a dedicated digital menu page — perfect for restaurants, cafés, bars, or any business with products to showcase. Your menu lives at visicardly.com/yourname/menu, separate from your main profile.",
        screenshot: {
          label: "📸 Screenshot: Menu Builder Overview",
          guide: "Take a screenshot of the Menu Setup tab showing the menu appearance settings and a few menu sections/products.",
        },
      },
      {
        title: "Menu Appearance",
        content:
          "Customize your menu's branding independently from your portfolio. Set a separate display name (e.g., your restaurant name), upload a dedicated logo, choose a different template, and pick an accent color. Expand the 'Menu Appearance & Info' section in Menu Setup.",
        screenshot: {
          label: "📸 Screenshot: Menu Appearance Settings",
          guide: "Take a screenshot of the Menu Appearance section showing the display name, logo upload, accent color picker, and template selection.",
        },
      },
      {
        title: "Sections & Products",
        content:
          "Organize your menu into sections (e.g., Starters, Main Courses, Desserts, Drinks). Each section contains products with a name, description, price, and optional image. Reorder sections and products to match your preferred layout.",
        screenshot: {
          label: "📸 Screenshot: Menu Sections & Products",
          guide: "Take a screenshot showing menu sections with products inside them — name, price, description, and product images visible.",
        },
      },
      {
        title: "Contact & Opening Hours",
        content:
          "Add your business contact details including phone number, email, physical address, Google Maps link, WhatsApp number, and website. Set business hours for each day of the week with open/close times. These appear on your public menu page.",
        screenshot: {
          label: "📸 Screenshot: Opening Hours",
          guide: "Take a screenshot of the Opening Hours section showing the day-by-day time settings with open/closed toggles.",
        },
      },
      {
        title: "Live Preview",
        content:
          "While editing your menu, a live preview panel shows exactly how your menu will look to visitors. Toggle between mobile and desktop views to ensure it looks great on all devices. Click the external link button to open the full preview in a new tab.",
        screenshot: {
          label: "📸 Screenshot: Menu Live Preview",
          guide: "Take a screenshot showing the menu preview panel alongside the editor, demonstrating the split-view editing experience.",
        },
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
        screenshot: {
          label: "📸 Screenshot: Analytics Dashboard",
          guide: "Take a screenshot of the Analytics section showing the visit chart, click counts, and any other performance metrics.",
        },
      },
    ],
  },
  {
    id: "team",
    title: "Teams & Digital Business Cards",
    icon: Users,
    items: [
      {
        title: "Team Accounts",
        content:
          "Create a team account to manage your organization's digital presence. Invite team members via email or CSV bulk import, assign roles (Owner, Admin, Member), and organize members into branches.",
        screenshot: {
          label: "📸 Screenshot: Team Members List",
          guide: "Take a screenshot of the Team Members section showing the member list with names, roles, status badges, and action buttons.",
        },
      },
      {
        title: "Digital Business Cards",
        content:
          "Each team member gets a professional digital business card with company branding, logo, job title, and contact details. Visitors can download a vCard with one tap. Company branding is applied consistently across all member profiles.",
        screenshot: {
          label: "📸 Screenshot: Team Member Public Profile",
          guide: "Take a screenshot of a team member's public profile showing company branding, logo, job title, contact card, and social links.",
        },
      },
      {
        title: "Team Templates & Branding",
        content:
          "Create branded templates with your company logo, cover photo, colors, and fonts. Templates are automatically applied to all team members for consistent branding. Only team owners and admins can manage templates. Add document links (company profile, product catalogs, brochures) that appear on all member profiles.",
        screenshot: {
          label: "📸 Screenshot: Team Template Editor",
          guide: "Take a screenshot of the Team Templates section showing template settings — company name, logo, cover image, theme color, document links, and social links.",
        },
      },
      {
        title: "Branches",
        content:
          "Organize team members into branches (e.g., offices, departments, locations). Each branch has its own name, address, and contact details. Assign members to branches for location-based organization. One branch can be marked as the Head Office.",
        screenshot: {
          label: "📸 Screenshot: Branch Management",
          guide: "Take a screenshot of the Branch Addresses section showing multiple branches with name, address, phone, and the Head Office badge.",
        },
      },
      {
        title: "Company Social Links",
        content:
          "Add company-level social media links that appear on all team members' public profiles. These are separate from individual social links and ensure consistent company branding across all digital business cards.",
        screenshot: {
          label: "📸 Screenshot: Company Social Links",
          guide: "Take a screenshot of the Company Social Links section in the Team Templates showing the platform dropdown and added links.",
        },
      },
      {
        title: "Document Links & Product URLs",
        content:
          "Add links to your company profile, product catalogs, brochures, and other documents. You can add multiple product URLs with custom labels. These documents appear on all team members' public profiles as downloadable links, making it easy for visitors to access your company materials.",
        screenshot: {
          label: "📸 Screenshot: Document Links Section",
          guide: "Take a screenshot of the Document Links section in Team Templates showing Company Profile URL, Product URLs (with Add button), and Company Brochure URL fields.",
        },
      },
      {
        title: "CSV Import & Export",
        content:
          "Bulk import team members using a CSV file with name, email, phone, and job title columns. Export your entire team directory as a CSV including profile URLs, roles, branches, and status. Perfect for onboarding large teams quickly.",
        screenshot: {
          label: "📸 Screenshot: CSV Import Dialog",
          guide: "Take a screenshot of the CSV Import/Export dialog showing the file upload area and the column mapping fields.",
        },
      },
      {
        title: "Contacts",
        content:
          "Manage a shared contact directory within your team. Contacts are collected from profile visitors who use the 'Add to Contact' feature on public profiles.",
      },
    ],
  },
  {
    id: "business-profile",
    title: "Business Profile",
    icon: Building2,
    items: [
      {
        title: "Personal Business Details",
        content:
          "Team members can customize their individual business details including business name, phone number, job title, and a separate business bio. These override or supplement the company template on their public profile.",
        screenshot: {
          label: "📸 Screenshot: Business Profile Section",
          guide: "Take a screenshot of the Business Profile section in the dashboard showing fields for Business Name, Job Title, Phone, Bio, and profile image upload.",
        },
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
          "Manage your account settings including username, email, and password from the Settings section. You can change your password, update your email, and manage your account security.",
        screenshot: {
          label: "📸 Screenshot: Settings Page",
          guide: "Take a screenshot of the Settings section showing the Change Password form, account info, and any other account management options.",
        },
      },
      {
        title: "White Label",
        content:
          "Premium users can enable white-label mode to remove VisiCardly branding from their public profiles and QR codes. This creates a fully branded experience for your visitors.",
      },
      {
        title: "API Key",
        content:
          "Generate an API key from the Settings section to integrate VisiCardly with external tools and services. Your API key provides programmatic access to manage your profile.",
      },
    ],
  },
  {
    id: "plans",
    title: "Plans & Billing",
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
        screenshot: {
          label: "📸 Screenshot: Pricing Page",
          guide: "Take a screenshot of the /pricing page showing the plan comparison cards with features, prices, and CTA buttons.",
        },
      },
      {
        title: "Usage Tracking",
        content:
          "Your current usage is displayed in the Plan Usage banner on the Design page. It shows how many links, pages, blocks, and social links you're using out of your plan's limits. When you hit a limit, you'll see an upgrade prompt.",
        screenshot: {
          label: "📸 Screenshot: Plan Usage Banner",
          guide: "Take a screenshot of the Plan Usage banner on the Design tab showing usage bars for links, pages, blocks, and social links.",
        },
      },
      {
        title: "Billing Management",
        content:
          "View your current plan, payment history, and manage your subscription from the Billing section in your dashboard. Upgrade or downgrade your plan at any time.",
      },
    ],
  },
];

export default function DocsPage() {
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSections = searchQuery.trim()
    ? DOC_SECTIONS.map(section => ({
        ...section,
        items: section.items.filter(item =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.content.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(section => section.items.length > 0)
    : DOC_SECTIONS;

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-[999] bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <WouterLink href="/">
              <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain" />
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
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
              <BookOpen className="w-3.5 h-3.5 text-primary" />
              Documentation
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
              How to use <span className="text-primary">Visi</span>Cardly
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto mb-8">
              Everything you need to know to set up and manage your VisiCardly page, menu, teams, and more.
            </p>

            {/* Search */}
            <div className="max-w-md mx-auto relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documentation..."
                className="w-full px-4 py-2.5 pl-10 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
              <Globe className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Nav */}
          {!searchQuery && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-16">
              {DOC_SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(activeSection === section.id ? null : section.id);
                    document.getElementById(`doc-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all hover:scale-[1.02] ${
                    activeSection === section.id
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <section.icon className="w-5 h-5" />
                  <span className="text-xs font-medium text-center leading-tight">{section.title}</span>
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="space-y-16">
            {filteredSections.map((section) => (
              <div key={section.id} id={`doc-${section.id}`} className="scroll-mt-24">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 shadow-sm">
                    <section.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
                    <div className="h-0.5 w-12 bg-primary/30 rounded-full mt-1" />
                  </div>
                </div>
                <div className="grid gap-5">
                  {section.items.map((item, i) => (
                    <Card key={i} className="border-border/60 overflow-hidden hover:shadow-sm transition-shadow">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                            <ChevronRight className="w-3.5 h-3.5 text-primary" />
                          </div>
                          {item.title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-0">
                        <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                          {item.content}
                        </p>
                        {(item as any).screenshot && (
                          <div className="pl-8">
                            <ScreenshotPlaceholder
                              label={(item as any).screenshot.label}
                              guide={(item as any).screenshot.guide}
                            />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {searchQuery && filteredSections.length === 0 && (
            <div className="text-center py-16">
              <Globe className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No results found for "{searchQuery}"</p>
              <Button variant="ghost" onClick={() => setSearchQuery("")} className="mt-2">
                Clear search
              </Button>
            </div>
          )}

          {/* CTA */}
          <div className="mt-20 text-center">
            <div className="rounded-2xl border border-border bg-card p-10">
              <Zap className="w-10 h-10 text-primary mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-foreground mb-3">Ready to get started?</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">Create your VisiCardly page in under a minute. No credit card required.</p>
              <div className="flex items-center justify-center gap-4 flex-wrap">
                <WouterLink href="/auth?tab=register">
                  <Button size="lg" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Create your page
                  </Button>
                </WouterLink>
                <WouterLink href="/pricing">
                  <Button size="lg" variant="outline" className="gap-2">
                    <Eye className="w-4 h-4" />
                    View pricing
                  </Button>
                </WouterLink>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <img src={logoPath} alt="VisiCardly" className="w-14 h-10 object-contain" />
            <span>— All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://www.facebook.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-facebook"><SiFacebook className="w-4 h-4" /></a>
            <a href="https://x.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-x"><SiX className="w-4 h-4" /></a>
            <a href="https://www.instagram.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-instagram"><SiInstagram className="w-4 h-4" /></a>
            <a href="https://in.pinterest.com/visicardly/" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-pinterest"><SiPinterest className="w-4 h-4" /></a>
            <a href="https://www.tumblr.com/visicardly" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" data-testid="link-social-tumblr"><SiTumblr className="w-4 h-4" /></a>
          </div>
        </div>
      </footer>
    </div>
  );
}