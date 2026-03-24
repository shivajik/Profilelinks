import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, ChevronDown, Phone, Mail, Globe, MapPin, Building2, FileText, Download, ImageIcon, BadgeCheck, CalendarDays, Send, Loader2, Briefcase, Package } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { getPlatform } from "@/lib/social-platforms";
import { getAvatarClass, getButtonClass } from "@/lib/templates";
import type { Template } from "@/lib/templates";
import type { Link, Social, Block } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";

type PageInfo = { id: string; title: string; slug: string; isHome: boolean };

type BranchInfo = {
  name: string;
  address: string;
  phone?: string | null;
  email?: string | null;
};

type TeamBranding = {
  companyLogo?: string;
  coverPhoto?: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companyContact?: string;
  themeColor?: string;
  font?: string;
  jobTitle?: string;
  teamName?: string;
  memberEmail?: string;
  memberPhone?: string;
  companySocials?: Array<{ platform: string; url: string }>;
  headBranch?: BranchInfo;
  memberBranch?: BranchInfo;
  companyProfileUrl?: string;
  productProfileUrl?: string;
  productUrls?: Array<{ label: string; url: string }>;
  companyBrochureUrl?: string;
  contactFormEnabled?: boolean;
  contactFormFields?: string[];
  meetingLink?: string;
  meetingLinkLabel?: string;
  menuUrl?: string;
};

interface TeamLayoutProps {
  user: {
    displayName: string | null;
    username: string;
    profileImage: string | null;
    bio: string | null;
    emailVerified?: boolean;
    useOriginalSocialColors?: boolean;
  };
  template: Template;
  teamBranding: TeamBranding;
  brandColor: string;
  activeSocials: Social[];
  activeLinks: Link[];
  activeBlocks: Block[];
  hasBlocks: boolean;
  pages: PageInfo[];
  hasMultiplePages: boolean;
  currentPage: PageInfo | null;
  setActivePageSlug: (slug: string | null) => void;
  isFetching: boolean;
  isLoading: boolean;
  normalizeUrl: (url: string, platform?: string) => string;
  trackClick: (blockId?: string) => void;
  PublicBlock: any;
  mode?: "mobile" | "desktop";
  activePageSlug?: string | null;
  teamSlug?: string;
}

function ContactSection({ teamBranding, brandColor, normalizeUrl, activeSocials, cardStyle = "default", useOriginalSocialColors, trackClick }: {
  teamBranding: TeamBranding;
  brandColor: string;
  activeSocials: Social[];
  normalizeUrl: (url: string, platform?: string) => string;
  cardStyle?: "default" | "accent" | "minimal" | "bordered";
  useOriginalSocialColors?: boolean;
  trackClick?: (blockId?: string) => void;
}) {
  const userContactItems = [
    ...(teamBranding.memberPhone ? [{ icon: Phone, value: teamBranding.memberPhone, type: "phone" as const }] : []),
  ];
  const contactItems = [
    { icon: Phone, value: teamBranding.companyPhone, type: "phone" as const },
    { icon: Phone, value: teamBranding.companyContact, type: "phone" as const },
    { icon: Mail, value: teamBranding.companyEmail, type: "email" as const },
    { icon: Globe, value: teamBranding.companyWebsite, type: "website" as const },
    { icon: MapPin, value: teamBranding.companyAddress, type: "address" as const },
  ].filter(item => item.value);
  const hasBranches = !!(teamBranding.headBranch || teamBranding.memberBranch);
  const hasDocs = !!(teamBranding.companyProfileUrl || teamBranding.productProfileUrl || teamBranding.companyBrochureUrl || (teamBranding.productUrls && teamBranding.productUrls.length > 0));

  if (contactItems.length === 0 && userContactItems.length === 0 && !hasBranches && !hasDocs) return null;

  const iconBg = cardStyle === "accent" ? brandColor + "25" : cardStyle === "minimal" ? "transparent" : brandColor + "15";
  const iconColor = brandColor;
  const sectionLabelClass = cardStyle === "minimal"
    ? "text-[10px] font-bold uppercase tracking-[0.15em]"
    : "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

  function getContactHref(type: string, value: string) {
    if (type === "phone") return `tel:${value}`;
    if (type === "email") return `mailto:${value}`;
    if (type === "website") return value.startsWith("http") ? value : `https://${value}`;
    if (type === "address") return `https://maps.google.com/?q=${encodeURIComponent(value)}`;
    return undefined;
  }

  function ContactItem({ icon: Icon, value, type }: { icon: any; value: string; type: string }) {
    const href = getContactHref(type, value);
    const content = (
      <>
        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
        </div>
        <span className="text-xs text-foreground break-all">{value}</span>
      </>
    );
    if (href) {
      return (
        <a href={href} target={type === "website" ? "_blank" : undefined} rel={type === "website" ? "noopener noreferrer" : undefined}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity cursor-pointer">
          {content}
        </a>
      );
    }
    return <div className="flex items-center gap-2.5">{content}</div>;
  }

  return (
    <div className="space-y-3">
      {userContactItems.length > 0 && (
        <div className="space-y-2" data-testid="user-contact-info">
          {userContactItems.map((item, i) => (
            <ContactItem key={`user-${i}`} icon={item.icon} value={item.value} type={item.type} />
          ))}
          <div className="flex gap-2 pl-9">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={useOriginalSocialColors} trackClick={trackClick} />
          </div>
        </div>
      )}

      {contactItems.length > 0 && (
        <>
          <div className="border-t border-border my-3" />
          <div className="flex items-center gap-1.5 mb-1">
            <Building2 className="w-3 h-3 text-muted-foreground" />
            <span className={sectionLabelClass} style={cardStyle === "minimal" ? { color: brandColor } : undefined}>Company Info</span>
          </div>
          <div className="space-y-2" data-testid="corporate-contact-info">
            {contactItems.map((item, i) => (
              <ContactItem key={i} icon={item.icon} value={item.value!} type={item.type} />
            ))}
          </div>
        </>
      )}

      {hasBranches && (
        <>
          <div className="border-t border-border my-3" />
          <div className="flex items-center gap-1.5 mb-1">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className={sectionLabelClass} style={cardStyle === "minimal" ? { color: brandColor } : undefined}>Locations</span>
          </div>
          <div className="space-y-2.5" data-testid="branch-addresses">
            {teamBranding.headBranch && (
              <div className={`rounded-md ${cardStyle === "bordered" ? "border-2" : "border"} border-border/50 p-2.5 space-y-1`}>
                <div className="flex items-center gap-2 w-full">
                  <Building2 className="w-3 h-3 shrink-0" style={{ color: brandColor }} />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Head Office:
                  </span>
          
                  <span className="text-xs font-medium flex-1 truncate">
                    {teamBranding.headBranch.name}
                  </span>
                </div>
          
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3 shrink-0" style={{ color: brandColor }} />
                  <span className="truncate">
                    {teamBranding.headBranch.address}
                  </span>
                </div>
                {teamBranding.headBranch.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" style={{ color: brandColor }} />
                    <span className="truncate">
                      {teamBranding.headBranch.phone}
                    </span>
                  </div>
                )}
              </div>
            )}
                {teamBranding.memberBranch && teamBranding.memberBranch.name !== teamBranding.headBranch?.name && (
                <div className={`rounded-md ${cardStyle === "bordered" ? "border-2" : "border"
                  } border-border/50 p-2.5 space-y-1`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <MapPin className="w-3 h-3 shrink-0" style={{ color: brandColor }} />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">Branch Office:
                    </span> 
                    <span className="text-xs font-medium flex-1 truncate">
                      {teamBranding.memberBranch.name}
                    </span>
                  </div>
              
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" style={{ color: brandColor }} />
                    <span className="truncate">
                      {teamBranding.memberBranch.address}
                    </span>
                  </div>
                  {teamBranding.memberBranch.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 shrink-0" style={{ color: brandColor }} />
                      <span className="truncate">
                        {teamBranding.memberBranch.phone}
                      </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {hasDocs && (
        <>
          <div className="border-t border-border my-3" />
          <div className="flex items-center gap-1.5 mb-1">
            <FileText className="w-3 h-3 text-muted-foreground" />
            <span className={sectionLabelClass} style={cardStyle === "minimal" ? { color: brandColor } : undefined}>Documents</span>
          </div>
          <div className="space-y-2" data-testid="company-documents">
            {teamBranding.companyProfileUrl && (
              <a href={normalizeUrl(teamBranding.companyProfileUrl)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                  <Building2 className="w-3.5 h-3.5" style={{ color: iconColor }} />
                </div>
                <span className="text-xs font-medium flex-1">Company Profile</span>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            )}
            {teamBranding.productProfileUrl && (
              <a href={normalizeUrl(teamBranding.productProfileUrl)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                  <FileText className="w-3.5 h-3.5" style={{ color: iconColor }} />
                </div>
                <span className="text-xs font-medium flex-1">Product Profile</span>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            )}
            {teamBranding.companyBrochureUrl && (
              <a href={normalizeUrl(teamBranding.companyBrochureUrl)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                  <Download className="w-3.5 h-3.5" style={{ color: iconColor }} />
                </div>
                <span className="text-xs font-medium flex-1">Company Brochure</span>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            )}
            {teamBranding.productUrls && teamBranding.productUrls.filter((p: any) => p.url).map((pu: any, idx: number) => (
              <a key={`product-url-${idx}`} href={normalizeUrl(pu.url)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-md border border-border/50 hover:bg-muted/50 transition-colors">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                  <FileText className="w-3.5 h-3.5" style={{ color: iconColor }} />
                </div>
                <span className="text-xs font-medium flex-1">{pu.label || `Product ${idx + 1}`}</span>
                <Download className="w-3.5 h-3.5 text-muted-foreground" />
              </a>
            ))}
          </div>
        </>
      )}

      {teamBranding.companySocials && teamBranding.companySocials.filter((s: any) => s.platform && s.url).length > 0 && (
        <>
          <div className="border-t border-border my-3" />
          <div className="flex items-center gap-2 flex-wrap" data-testid="company-social-icons-row">
            {teamBranding.companySocials.filter((s: any) => s.platform && s.url).map((social: any, idx: number) => (
              <a key={`company-social-${idx}`} href={normalizeUrl(social.url, social.platform)} target="_blank" rel="noopener noreferrer"
                className={`p-1.5 rounded-full hover-elevate active-elevate-2`} style={useOriginalSocialColors ? undefined : { color: brandColor }}
                title={getPlatform(social.platform)?.name || social.platform} data-testid={`company-social-icon-${social.platform}`}>
                <SocialIcon platform={social.platform} className="w-4 h-4" brandColor={useOriginalSocialColors} />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function SocialRows({ activeSocials, normalizeUrl, useOriginalSocialColors, trackClick }: {
  activeSocials: Social[];
  normalizeUrl: (url: string, platform?: string) => string;
  useOriginalSocialColors?: boolean;
  trackClick?: (blockId?: string) => void;
}) {
  if (activeSocials.length === 0) return null;
  return (
        <div className="flex items-center gap-2 flex-wrap" data-testid="social-icons-row">
          {activeSocials.map((social) => (
            <a key={social.id} href={normalizeUrl(social.url, social.platform)} target="_blank" rel="noopener noreferrer"
              onClick={() => trackClick?.(`social-${social.platform}`)}
              className={`p-1.5 rounded-full ${useOriginalSocialColors ? '' : 'text-muted-foreground'} hover-elevate active-elevate-2`}
              title={getPlatform(social.platform)?.name || social.platform} data-testid={`social-icon-${social.platform}`}>
              <SocialIcon platform={social.platform} className="w-4 h-4" brandColor={useOriginalSocialColors} />
            </a>
          ))}
        </div>
  );
}

function MeetingLinkSection({ teamBranding, brandColor }: { teamBranding: TeamBranding; brandColor: string }) {
  if (!teamBranding.meetingLink) return null;
  const label = teamBranding.meetingLinkLabel || "Book a Meeting";
  return (
    <div className="mt-4" data-testid="meeting-link-section">
      <a
        href={teamBranding.meetingLink}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-medium text-sm text-white transition-all hover:scale-[1.02] hover:shadow-md"
        style={{ backgroundColor: brandColor }}
      >
        <CalendarDays className="w-4 h-4" />
        {label}
      </a>
    </div>
  );
}

function MenuUrlSection({ teamBranding, brandColor }: { teamBranding: TeamBranding; brandColor: string }) {
  if (!teamBranding.menuUrl) return null;
  return (
    <div className="mt-4" data-testid="menu-url-section">
      <a
        href={teamBranding.menuUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-medium text-sm transition-all hover:scale-[1.02] hover:shadow-md border"
        style={{ borderColor: brandColor + "40", color: brandColor }}
      >
        <ExternalLink className="w-4 h-4" />
        View Our Menu
      </a>
    </div>
  );
}

function ContactFormSection({ teamBranding, brandColor }: { teamBranding: TeamBranding; brandColor: string }) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  if (!teamBranding.contactFormEnabled) return null;

  const fields = teamBranding.contactFormFields || ["name", "email", "message"];
  const allFields = [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
    { key: "phone", label: "Phone", type: "tel", required: false },
    { key: "subject", label: "Subject", type: "text", required: false },
    { key: "message", label: "Message", type: "textarea", required: false },
    { key: "company", label: "Company", type: "text", required: false },
  ];
  const activeFields = allFields.filter(f => fields.includes(f.key));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const companyEmail = teamBranding.companyEmail;
      const companyName = teamBranding.companyName || "Company";
      await fetch("/api/contact-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, companyEmail, companyName }),
      });
      setSubmitted(true);
      setFormData({});
    } catch {
      // silent fail
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <div className="mt-3" data-testid="contact-form-toggle">
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={() => setOpen(true)}
          style={{ borderColor: brandColor + "40", color: brandColor }}
        >
          <Mail className="w-4 h-4" />
          Contact Us
        </Button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="mt-3 p-4 rounded-xl border bg-muted/30 text-center" data-testid="contact-form-success">
        <p className="text-sm font-medium text-foreground">Thank you! Your message has been sent.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-xl border bg-card/80 space-y-3" data-testid="contact-form">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Contact Us</h3>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2.5">
        {activeFields.map(field => (
          <div key={field.key}>
            <Label className="text-xs text-muted-foreground">{field.label}{field.required && " *"}</Label>
            {field.type === "textarea" ? (
              <Textarea
                value={formData[field.key] || ""}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                required={field.required}
                className="mt-1 text-sm"
                rows={3}
              />
            ) : (
              <Input
                type={field.type}
                value={formData[field.key] || ""}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                required={field.required}
                className="mt-1 text-sm"
              />
            )}
          </div>
        ))}
        <Button
          type="submit"
          disabled={submitting}
          className="w-full gap-2 text-white"
          style={{ backgroundColor: brandColor }}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          Send Message
        </Button>
      </form>
    </div>
  );
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const fullHex = normalized.length === 3
    ? normalized.split("").map((char) => char + char).join("")
    : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(fullHex)) {
    return `rgba(148, 163, 184, ${alpha})`;
  }

  const r = parseInt(fullHex.slice(0, 2), 16);
  const g = parseInt(fullHex.slice(2, 4), 16);
  const b = parseInt(fullHex.slice(4, 6), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getNavSurfaceStyle(template: Template) {
  return {
    backgroundColor: hexToRgba(template.accent, 0.18),
    borderColor: hexToRgba(template.accent, 0.32),
  };
}

function PageNavSection({ pages, currentPage, setActivePageSlug, template, activePageSlug }: {
  pages: PageInfo[];
  currentPage: PageInfo | null;
  setActivePageSlug: (slug: string | null) => void;
  template: Template;
  activePageSlug?: string | null;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navSurfaceStyle = getNavSurfaceStyle(template);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (mobileOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    }
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    window.addEventListener("wheel", close, { passive: true, capture: true });
    window.addEventListener("touchmove", close, { passive: true, capture: true });
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("wheel", close, true);
      window.removeEventListener("touchmove", close, true);
    };
  }, [mobileOpen]);

  const getIsActive = (page: PageInfo) => {
    if (page.slug === "__services__" || page.slug === "__products__") {
      return activePageSlug === page.slug;
    }
    if (page.isHome) {
      return !activePageSlug || activePageSlug === null;
    }
    return currentPage?.slug === page.slug;
  };

  const activePageTitle = pages.find(p => getIsActive(p))?.title || "Home";

  return (
    <div className="flex flex-col items-center">
      <div className="hidden sm:flex items-center gap-2 flex-wrap justify-center" data-testid="page-nav">
        {pages.map((page) => {
          const isActive = getIsActive(page);
          return (
            <Button key={page.id} variant="ghost" size="sm"
              onClick={() => setActivePageSlug(page.isHome ? null : page.slug)}
              className={`rounded-full px-4 border transition-colors ${isActive ? "text-foreground shadow-sm border-transparent" : "text-foreground/75 hover:text-foreground border-transparent"}`}
              style={isActive ? navSurfaceStyle : undefined}
              data-testid={`page-tab-${page.slug}`}>
              {page.title}
            </Button>
          );
        })}
      </div>
      <div className="sm:hidden relative inline-block" data-testid="page-nav-mobile">
        <button ref={triggerRef} onClick={() => setMobileOpen(!mobileOpen)}
          className="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium text-foreground border shadow-sm"
          style={navSurfaceStyle}
          data-testid="button-page-nav-toggle">
          {activePageTitle}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && createPortal(
          <>
            <div className="fixed inset-0" style={{ zIndex: 99998 }} onClick={() => setMobileOpen(false)} />
            <div className="fixed min-w-[160px] rounded-xl border border-border backdrop-blur-md py-1 shadow-xl"
              style={{ zIndex: 99999, backgroundColor: 'var(--card, #fff)', top: dropdownPos?.top ?? 0, left: (dropdownPos?.left ?? 0), transform: 'translateX(-50%)' }}>
              {pages.map((page) => {
                const isActive = getIsActive(page);
                return (
                  <button key={page.id}
                    onClick={() => { setActivePageSlug(page.isHome ? null : page.slug); setMobileOpen(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm ${isActive ? "text-foreground font-semibold bg-accent/50" : "text-foreground/70 hover:bg-accent/30"}`}
                    data-testid={`mobile-page-tab-${page.slug}`}>
                    {page.title}
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}
      </div>
    </div>
  );
}

function InlineServicesProducts({ slug, type, brandColor }: { slug: string; type: "services" | "products"; brandColor: string }) {
  const label = type === "services" ? "Services" : "Products";
  const Icon = type === "services" ? Briefcase : Package;

  const { data, isLoading } = useQuery<{ items: Array<{ id: string; title: string; description: string | null; price: string | null; imageUrl: string | null; url: string | null }> }>({
    queryKey: ["/api/public", slug, type],
    queryFn: async () => {
      const res = await fetch(`/api/public/${slug}/${type}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const items = data?.items || [];

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <Icon className="w-8 h-8 mx-auto mb-2 opacity-40" style={{ color: brandColor }} />
        <p className="text-sm text-muted-foreground">No {type} available</p>
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-4">
      {items.map((item) => {
        const content = (
          <div
            key={item.id}
            className="rounded-xl overflow-hidden bg-muted/50 backdrop-blur-sm shadow-md border transition-all hover:shadow-lg hover:scale-[1.02]"
            style={{ borderColor: brandColor + "15" }}
          >
            {item.imageUrl && (
              <div className="aspect-video overflow-hidden">
                <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                {item.price && (
                  <span className="text-sm font-bold shrink-0 px-2 py-0.5 rounded-full" style={{ color: brandColor, backgroundColor: brandColor + "15" }}>
                    {item.price}
                  </span>
                )}
              </div>
              {item.description && (
                <p className="text-sm text-foreground opacity-70 leading-relaxed">{item.description}</p>
              )}
            </div>
          </div>
        );

        if (item.url) {
          return (
            <a key={item.id} href={item.url.startsWith("http") ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="block">
              {content}
            </a>
          );
        }
        return <div key={item.id}>{content}</div>;
      })}
    </div>
  );
}

function ContentSection(props: TeamLayoutProps) {
  const { hasBlocks, activeBlocks, activeLinks, template, isFetching, isLoading, trackClick, normalizeUrl, PublicBlock, activePageSlug, teamSlug, brandColor } = props;
  const btnClass = getButtonClass(template.buttonStyle);

  // If services or products tab is active, render inline
  if (activePageSlug === "__services__" && teamSlug) {
    return <InlineServicesProducts slug={teamSlug} type="services" brandColor={brandColor} />;
  }
  if (activePageSlug === "__products__" && teamSlug) {
    return <InlineServicesProducts slug={teamSlug} type="products" brandColor={brandColor} />;
  }

  // Team layouts render content inside bg-card containers (white/light),
  // so override template colors to use card-safe foreground colors
  const cardSafeTemplate = {
    ...template,
    textColor: "text-foreground",
    cardTextColor: "text-foreground",
    cardBg: "bg-muted/50",
  };

  return (
    <div className="transition-opacity duration-300 ease-in-out overflow-hidden" style={{ opacity: isFetching && !isLoading ? 0.5 : 1 }}>
      {hasBlocks ? (
        <div className="space-y-3 mt-4  overflow-hidden">
          {(() => {
            const items: JSX.Element[] = [];
            let i = 0;
            while (i < activeBlocks.length) {
              const block = activeBlocks[i];
              if (block.type === "image") {
                const group: typeof activeBlocks = [block];
                while (i + 1 < activeBlocks.length && activeBlocks[i + 1].type === "image") {
                  i++;
                  group.push(activeBlocks[i]);
                }
                if (group.length === 1) {
                  items.push(<PublicBlock key={group[0].id} block={group[0]} template={cardSafeTemplate} onClickTrack={trackClick} />);
                } else {
                  items.push(
                    <div key={group[0].id} className="grid grid-cols-2 gap-1.5">
                      {group.map((b) => <PublicBlock key={b.id} block={b} template={cardSafeTemplate} onClickTrack={trackClick} />)}
                    </div>
                  );
                }
              } else {
                items.push(<PublicBlock key={block.id} block={block} template={cardSafeTemplate} onClickTrack={trackClick} />);
              }
              i++;
            }
            return items;
          })()}
        </div>
      ) : activeLinks.length > 0 ? (
        <div className="space-y-3 mt-4 overflow-hidden">
          {activeLinks.map((link) => (
            <a key={link.id} href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer"
              onClick={() => trackClick(link.id)}
              className={`block w-full ${btnClass} bg-muted/50 p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group`}
              data-testid={`link-card-${link.id}`}>
              <div className="flex items-center justify-center gap-2">
                <span className="truncate text-foreground">{link.title}</span>
                <ExternalLink className="w-3.5 h-3.5 text-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompanyBadge({ teamBranding, template, compact = false }: { teamBranding: TeamBranding; template: Template; compact?: boolean }) {
  if (!teamBranding.companyName) return null;
  const brandColor = teamBranding.themeColor || template.accent;

  const wrapperClass = compact
    ? "mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg max-w-full"
    : "flex items-center gap-3 px-4 py-2 rounded-full max-w-full";
  const wrapperStyle = {
    border: `1px solid ${brandColor}35`,
    backgroundColor: `${brandColor}12`,
  };
  const logoWrapClass = compact
    ? "w-6 h-6 rounded-md overflow-hidden bg-card/80 flex items-center justify-center shrink-0"
    : "w-11 h-11 rounded-lg overflow-hidden bg-card/80 flex items-center justify-center shrink-0 shadow-sm";

  return (
    <div className={wrapperClass} style={wrapperStyle} data-testid="text-team-brand">
      {teamBranding.companyLogo && (
        <div className={logoWrapClass} data-testid="img-company-logo-badge">
          <img src={teamBranding.companyLogo} alt="Company" className={compact ? "w-5 h-5 object-contain" : "w-9 h-9 object-contain"} />
        </div>
      )}
      <span className={compact ? "text-xs font-semibold truncate" : "text-sm font-bold truncate"} style={{ color: brandColor }}>{teamBranding.companyName}</span>
    </div>
  );
}

function ClassicTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl, trackClick, activePageSlug } = props;
  const displayName = user.displayName || user.username;
  return (
    <div className="mb-10">
      <div className="rounded-md overflow-hidden bg-card/80 backdrop-blur-sm shadow-lg" style={{ overflowX: "hidden" }} data-testid="corporate-profile-card">
        <div className="h-28 relative" style={{ backgroundColor: brandColor + "22" }}>
          {teamBranding.coverPhoto ? (
            <img src={teamBranding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-muted-foreground/30" />
            </div>
          )}
        </div>
        <div className="relative px-5 pb-5">
          <div className="-mt-10 mb-4 flex items-end gap-3">
            <div className="shrink-0">
              <Avatar className="w-20 h-20 border-4 border-card shadow-md">
                <AvatarImage src={user.profileImage || undefined} alt={displayName} />
                <AvatarFallback className="text-xl" style={{ backgroundColor: brandColor + "30", color: brandColor }}>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CompanyBadge teamBranding={teamBranding} template={template} />
          </div>
          <div className="space-y-1 mb-4">
            <h1 className="text-xl font-bold text-foreground flex items-center gap-1.5" data-testid="text-profile-name">{displayName}{user.emailVerified && <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />}</h1>
            {teamBranding.jobTitle && <p className="text-sm text-muted-foreground" data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
            {teamBranding.memberEmail ? (
              <p className="text-sm font-medium" style={{ color: brandColor }} data-testid="text-profile-company">{teamBranding.memberEmail}</p>
            ) : teamBranding.companyName && (
              <p className="text-sm font-medium" style={{ color: brandColor }} data-testid="text-profile-company">{teamBranding.companyName}</p>
            )}
            <p className="text-xs text-muted-foreground" data-testid="text-profile-username">@{user.username}</p>
          </div>
          {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-4" data-testid="text-profile-bio">{user.bio}</p>}
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} useOriginalSocialColors={user.useOriginalSocialColors} trackClick={trackClick} />
          <MeetingLinkSection teamBranding={teamBranding} brandColor={brandColor} />
          <MenuUrlSection teamBranding={teamBranding} brandColor={brandColor} />
          <ContactFormSection teamBranding={teamBranding} brandColor={brandColor} />
          {/* <div className="mt-3">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={user.useOriginalSocialColors} trackClick={trackClick} />
          </div> */}
          {hasMultiplePages && <><div className="border-t border-border mt-4 mb-2" /><div className="mt-2"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} activePageSlug={activePageSlug} /></div></>}
          <ContentSection {...props} />
        </div>
      </div>
    </div>
  );
}

function ModernTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl, trackClick, mode, activePageSlug } = props;
  const displayName = user.displayName || user.username;
  const avatarCls = getAvatarClass(template.avatarStyle);

  // Mobile: horizontal card (avatar LEFT + info RIGHT)
  if (mode === "mobile") {
    return (
      <div className="mb-6" data-testid="corporate-profile-card">
        <div className={`${template.cardBg} rounded-xl shadow-lg border overflow-hidden`} style={{ borderColor: brandColor + "20" }}>
          {teamBranding.coverPhoto ? (
            <div className="h-20 relative">
              <img src={teamBranding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
            </div>
          ) : (
            <div className="h-1 w-full" style={{ backgroundColor: brandColor }} />
          )}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className={`w-14 h-14 border-2 shadow-md shrink-0 ${avatarCls} ${teamBranding.coverPhoto ? "-mt-8 ring-2 ring-card" : ""}`} style={{ borderColor: brandColor + "40" }}>
                <AvatarImage src={user.profileImage || undefined} alt={displayName} />
                <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: brandColor + "30", color: brandColor }}>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h1 className={`text-sm font-bold ${template.cardTextColor} flex items-center gap-1 flex-wrap`} data-testid="text-profile-name">
                  {displayName}{user.emailVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                </h1>
                {teamBranding.jobTitle && <p className={`text-[11px] ${template.cardTextColor} opacity-70 mt-0.5`} data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
                <p className={`text-[10px] ${template.cardTextColor} opacity-50 mt-0.5`} data-testid="text-profile-username">@{user.username}</p>
                <CompanyBadge teamBranding={teamBranding} template={template} compact />
              </div>
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-card/90 backdrop-blur-md p-4 shadow-sm border border-white/10">
          {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-3" data-testid="text-profile-bio">{user.bio}</p>}
           <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="accent" useOriginalSocialColors={user.useOriginalSocialColors} trackClick={trackClick} />
          <MeetingLinkSection teamBranding={teamBranding} brandColor={brandColor} />
          <MenuUrlSection teamBranding={teamBranding} brandColor={brandColor} />
          <ContactFormSection teamBranding={teamBranding} brandColor={brandColor} />
          {hasMultiplePages && <><div className="border-t border-border mt-3 mb-2" /><div className="mt-2"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} activePageSlug={activePageSlug} /></div></>}
          <ContentSection {...props} />
        </div>
      </div>
    );
  }

  // Desktop & public profile: side-by-side two-panel card
  const isDesktop = mode === "desktop";
  const leftWidth = isDesktop ? "w-2/5" : "sm:w-2/5";
  const rightWidth = isDesktop ? "w-3/5" : "sm:w-3/5";
  return (
    <div className="mb-10">
      <div className="rounded-2xl overflow-hidden shadow-xl border" style={{ borderColor: brandColor + "20" }} data-testid="corporate-profile-card">
        {teamBranding.coverPhoto && (
          <div className="relative h-36 w-full">
            <img src={teamBranding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}
        <div className={isDesktop ? "flex flex-row" : `flex flex-col sm:flex-row`}>
          <div className={`${leftWidth} p-6 flex flex-col items-center justify-center text-center ${template.cardBg} ${teamBranding.coverPhoto ? "-mt-10 relative z-10" : ""}`}>
            {!teamBranding.coverPhoto && <div className="w-full h-1 rounded-full mb-4" style={{ backgroundColor: brandColor }} />}
            <Avatar className={`w-24 h-24 border-4 shadow-lg mb-3 ${avatarCls} ${teamBranding.coverPhoto ? "ring-2 ring-card" : ""}`} style={{ borderColor: brandColor + "40" }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl font-bold" style={{ backgroundColor: brandColor + "30", color: brandColor }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className={`text-lg font-bold ${template.cardTextColor} flex items-center gap-1.5 flex-wrap justify-center`} data-testid="text-profile-name">{displayName}{user.emailVerified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}</h1>
            {teamBranding.jobTitle && <p className={`text-xs ${template.cardTextColor} opacity-70 mt-0.5 break-words w-full`} data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
            <p className={`text-xs ${template.cardTextColor} opacity-70 mt-0.5 break-words`} data-testid="text-profile-username">@{user.username}</p>
            <CompanyBadge teamBranding={teamBranding} template={template} compact />
          </div>
          <div className={`${rightWidth} p-6 bg-card/90`}>
            {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-4" data-testid="text-profile-bio">{user.bio}</p>}
            <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="accent" useOriginalSocialColors={user.useOriginalSocialColors} />
          <MeetingLinkSection teamBranding={teamBranding} brandColor={brandColor} />
          <MenuUrlSection teamBranding={teamBranding} brandColor={brandColor} />
          <ContactFormSection teamBranding={teamBranding} brandColor={brandColor} />
            {hasMultiplePages && <><div className="border-t border-border mt-4 mb-2" /><div className="mt-2"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} activePageSlug={activePageSlug} /></div></>}
            <ContentSection {...props} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BoldTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl, trackClick, activePageSlug } = props;
  const displayName = user.displayName || user.username;
  const avatarCls = getAvatarClass(template.avatarStyle);
  return (
    <div className="mb-10">
      <div className="rounded-2xl overflow-hidden shadow-xl" data-testid="corporate-profile-card">
        <div className="relative h-44" style={{ backgroundColor: brandColor + "22" }}>
          {teamBranding.coverPhoto ? (
            <img src={teamBranding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${brandColor}50 0%, ${brandColor}15 100%)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-4 left-5 right-5 flex items-end gap-4">
            <Avatar className={`w-24 h-24 border-4 shadow-xl shrink-0 ${avatarCls}`} style={{ borderColor: "white" }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl font-bold" style={{ backgroundColor: brandColor, color: "white" }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              <h1 className="text-2xl font-extrabold text-white drop-shadow-lg flex items-center gap-1.5" data-testid="text-profile-name">{displayName}{user.emailVerified && <BadgeCheck className="w-5 h-5 text-blue-400 shrink-0" />}</h1>
              {teamBranding.jobTitle && <p className="text-sm text-white/80 font-medium" data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
            </div>
          </div>
        </div>
        <div className="bg-card px-5 py-5">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {teamBranding.companyLogo && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm" style={{ borderColor: brandColor + "30", backgroundColor: brandColor + "08" }} data-testid="text-team-brand">
                <img src={teamBranding.companyLogo} alt="Company" className="w-7 h-7 object-contain" data-testid="img-company-logo-badge" />
                <span className="text-xs font-bold" style={{ color: brandColor }}>{teamBranding.companyName}</span>
              </div>
            )}
            {!teamBranding.companyLogo && teamBranding.companyName && (
              <span className="text-sm font-bold" style={{ color: brandColor }} data-testid="text-team-brand">{teamBranding.companyName}</span>
            )}
            <span className="text-xs text-muted-foreground" data-testid="text-profile-username">@{user.username}</span>
          </div>
          {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-4" data-testid="text-profile-bio">{user.bio}</p>}
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="bordered" useOriginalSocialColors={user.useOriginalSocialColors} trackClick={trackClick} />
          <MeetingLinkSection teamBranding={teamBranding} brandColor={brandColor} />
          <MenuUrlSection teamBranding={teamBranding} brandColor={brandColor} />
          <ContactFormSection teamBranding={teamBranding} brandColor={brandColor} />
          {/* <div className="mt-3">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={user.useOriginalSocialColors} trackClick={trackClick} />
          </div> */}
          {hasMultiplePages && <><div className="border-t border-border mt-4 mb-2" /><div className="mt-2"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} activePageSlug={activePageSlug} /></div></>}
          <ContentSection {...props} />
        </div>
      </div>
    </div>
  );
}

function ElegantTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl, activePageSlug } = props;
  const displayName = user.displayName || user.username;
  const avatarCls = getAvatarClass(template.avatarStyle);
  return (
    <div className="mb-10">
      <div className="h-1.5 rounded-full shadow-sm mb-6" style={{ backgroundColor: brandColor }} />
      <div className="rounded-2xl overflow-hidden shadow-lg bg-card/90 backdrop-blur-md border" style={{ borderColor: brandColor + "15" }} data-testid="corporate-profile-card">
        {teamBranding.coverPhoto ? (
          <div className="relative h-32 overflow-hidden">
            <img src={teamBranding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
          </div>
        ) : (
          <div className="h-1" style={{ backgroundColor: brandColor }} />
        )}
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar className={`w-20 h-20 border-2 shadow-md mb-3 ${avatarCls} ${teamBranding.coverPhoto ? "-mt-14 ring-2 ring-card" : ""}`} style={{ borderColor: brandColor + "50" }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-xl" style={{ backgroundColor: brandColor + "20", color: brandColor }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-semibold tracking-wide flex items-center gap-1.5" data-testid="text-profile-name">{displayName}{user.emailVerified && <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />}</h1>
            {teamBranding.jobTitle && <p className="text-xs text-muted-foreground tracking-widest uppercase mt-0.5" data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider" data-testid="text-profile-username">@{user.username}</p>
            <CompanyBadge teamBranding={teamBranding} template={template} compact />
            <div className="w-16 h-px my-4" style={{ backgroundColor: brandColor + "40" }} />
          </div>
          {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-5 text-center max-w-md mx-auto" data-testid="text-profile-bio">{user.bio}</p>}
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="minimal" useOriginalSocialColors={user.useOriginalSocialColors} />
          <MeetingLinkSection teamBranding={teamBranding} brandColor={brandColor} />
          <MenuUrlSection teamBranding={teamBranding} brandColor={brandColor} />
          <ContactFormSection teamBranding={teamBranding} brandColor={brandColor} />
          {hasMultiplePages && <><div className="border-t border-border mt-4 mb-2" /><div className="mt-2"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} activePageSlug={activePageSlug} /></div></>}
          <ContentSection {...props} />
        </div>
      </div>
    </div>
  );
}

function HeroTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl, trackClick, activePageSlug } = props;
  const displayName = user.displayName || user.username;
  const avatarCls = getAvatarClass(template.avatarStyle);
  return (
    <div className="mb-10 -mx-6 -mt-12">
      <div className="relative h-56 overflow-hidden" data-testid="corporate-profile-card">
        {teamBranding.coverPhoto ? (
          <img src={teamBranding.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(180deg, ${brandColor}35 0%, transparent 100%)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="px-6 -mt-20 relative z-10">
        <div className="rounded-2xl bg-card/95 backdrop-blur-xl p-6 shadow-2xl border border-white/10">
          <div className="flex flex-col items-center text-center -mt-16 mb-4">
            <Avatar className={`w-24 h-24 border-4 shadow-2xl mb-3 ${avatarCls}`} style={{ borderColor: brandColor }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl font-bold" style={{ backgroundColor: brandColor + "30", color: brandColor }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-bold flex items-center gap-1.5" data-testid="text-profile-name">{displayName}{user.emailVerified && <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />}</h1>
            {teamBranding.jobTitle && <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-profile-username">@{user.username}</p>
            <CompanyBadge teamBranding={teamBranding} template={template} compact />
          </div>
          {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-4 text-center" data-testid="text-profile-bio">{user.bio}</p>}
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="accent" useOriginalSocialColors={user.useOriginalSocialColors} trackClick={trackClick} />
          <MeetingLinkSection teamBranding={teamBranding} brandColor={brandColor} />
          <MenuUrlSection teamBranding={teamBranding} brandColor={brandColor} />
          <ContactFormSection teamBranding={teamBranding} brandColor={brandColor} />
          {/* <div className="mt-3 flex justify-center">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={user.useOriginalSocialColors} trackClick={trackClick} />
          </div> */}
          {hasMultiplePages && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} activePageSlug={activePageSlug} />
            </div>
          )}
          <ContentSection {...props} />
        </div>
      </div>
    </div>
  );
}

export function TeamProfileLayout(props: TeamLayoutProps) {
  const layout = props.template.layout;
  switch (layout) {
    case "modern": return <ModernTeamLayout {...props} />;
    case "bold": return <BoldTeamLayout {...props} />;
    case "elegant": return <ElegantTeamLayout {...props} />;
    case "hero": return <HeroTeamLayout {...props} />;
    case "classic":
    default: return <ClassicTeamLayout {...props} />;
  }
}
