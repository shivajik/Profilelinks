import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown, Phone, Mail, Globe, MapPin, Building2, FileText, Download, ImageIcon, BadgeCheck } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { getPlatform } from "@/lib/social-platforms";
import { getAvatarClass, getButtonClass } from "@/lib/templates";
import type { Template } from "@/lib/templates";
import type { Link, Social, Block } from "@shared/schema";
import { useState } from "react";

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
  companyBrochureUrl?: string;
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
}

function ContactSection({ teamBranding, brandColor, normalizeUrl, activeSocials, cardStyle = "default", useOriginalSocialColors }: {
  teamBranding: TeamBranding;
  brandColor: string;
  activeSocials: Social[];
  normalizeUrl: (url: string, platform?: string) => string;
  cardStyle?: "default" | "accent" | "minimal" | "bordered";
  useOriginalSocialColors?: boolean;
}) {
  const userContactItems = [
    ...(teamBranding.memberPhone ? [{ icon: Phone, value: teamBranding.memberPhone }] : []),
  ];
  const contactItems = [
    { icon: Phone, value: teamBranding.companyPhone },
    { icon: Phone, value: teamBranding.companyContact },
    { icon: Mail, value: teamBranding.companyEmail },
    { icon: Globe, value: teamBranding.companyWebsite },
    { icon: MapPin, value: teamBranding.companyAddress },
  ].filter(item => item.value);
  const hasBranches = !!(teamBranding.headBranch || teamBranding.memberBranch);
  const hasDocs = !!(teamBranding.companyProfileUrl || teamBranding.productProfileUrl || teamBranding.companyBrochureUrl);

  if (contactItems.length === 0 && userContactItems.length === 0 && !hasBranches && !hasDocs) return null;

  const iconBg = cardStyle === "accent" ? brandColor + "25" : cardStyle === "minimal" ? "transparent" : brandColor + "15";
  const iconColor = brandColor;
  const sectionLabelClass = cardStyle === "minimal"
    ? "text-[10px] font-bold uppercase tracking-[0.15em]"
    : "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-3">
      {userContactItems.length > 0 && (
        <div className="space-y-2" data-testid="user-contact-info">
          {userContactItems.map((item, i) => (
            <div key={`user-${i}`} className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                <item.icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
              </div>
              <span className="text-xs text-foreground">{item.value}</span>
            </div>
          ))}
          <div className="flex gap-2 pl-9">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={useOriginalSocialColors} />
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
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
                </div>
                <span className="text-xs text-foreground">{item.value}</span>
              </div>
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

function SocialRows({ activeSocials, normalizeUrl, useOriginalSocialColors }: {
  activeSocials: Social[];
  normalizeUrl: (url: string, platform?: string) => string;
  useOriginalSocialColors?: boolean;
}) {
  if (activeSocials.length === 0) return null;
  return (
        <div className="flex items-center gap-2 flex-wrap" data-testid="social-icons-row">
          {activeSocials.map((social) => (
            <a key={social.id} href={normalizeUrl(social.url, social.platform)} target="_blank" rel="noopener noreferrer"
              className={`p-1.5 rounded-full ${useOriginalSocialColors ? '' : 'text-muted-foreground'} hover-elevate active-elevate-2`}
              title={getPlatform(social.platform)?.name || social.platform} data-testid={`social-icon-${social.platform}`}>
              <SocialIcon platform={social.platform} className="w-4 h-4" brandColor={useOriginalSocialColors} />
            </a>
          ))}
        </div>
  );
}

function PageNavSection({ pages, currentPage, setActivePageSlug, template }: {
  pages: PageInfo[];
  currentPage: PageInfo | null;
  setActivePageSlug: (slug: string | null) => void;
  template: Template;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex flex-col items-center">
      <div className="hidden sm:flex items-center gap-2 flex-wrap justify-center" data-testid="page-nav">
        {pages.map((page) => {
          const isActive = currentPage?.slug === page.slug;
          return (
            <Button key={page.id} variant="ghost" size="sm"
              onClick={() => setActivePageSlug(page.isHome ? null : page.slug)}
              className={`rounded-full px-4 ${isActive ? `${template.cardBg} ${template.cardTextColor}` : `${template.textColor} opacity-60 hover:opacity-100`}`}
              data-testid={`page-tab-${page.slug}`}>
              {page.title}
            </Button>
          );
        })}
      </div>
      <div className="sm:hidden relative inline-block" data-testid="page-nav-mobile">
        <button onClick={() => setMobileOpen(!mobileOpen)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${template.cardBg} ${template.cardTextColor}`}
          data-testid="button-page-nav-toggle">
          {currentPage?.title || "Home"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[140px] rounded-xl bg-card backdrop-blur-md py-1 z-50 shadow-lg`}>
            {pages.map((page) => {
              const isActive = currentPage?.slug === page.slug;
              return (
                <button key={page.id}
                  onClick={() => { setActivePageSlug(page.isHome ? null : page.slug); setMobileOpen(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm ${isActive ? "font-medium" : "opacity-60"}`}
                  data-testid={`mobile-page-tab-${page.slug}`}>
                  {page.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentSection(props: TeamLayoutProps) {
  const { hasBlocks, activeBlocks, activeLinks, template, isFetching, isLoading, trackClick, normalizeUrl, PublicBlock } = props;
  const btnClass = getButtonClass(template.buttonStyle);
  const isOutline = template.buttonStyle === "outline";
  return (
    <div className="transition-opacity duration-300 ease-in-out" style={{ opacity: isFetching && !isLoading ? 0.5 : 1 }}>
      {hasBlocks ? (
        <div className="space-y-3 mt-4">
          {activeBlocks.map((block) => (
            <PublicBlock key={block.id} block={block} template={template} onClickTrack={trackClick} />
          ))}
        </div>
      ) : activeLinks.length > 0 ? (
        <div className="space-y-3 mt-4">
          {activeLinks.map((link) => (
            <a key={link.id} href={normalizeUrl(link.url)} target="_blank" rel="noopener noreferrer"
              onClick={() => trackClick(link.id)}
              className={`block w-full ${btnClass} ${isOutline ? "bg-transparent border-current/20" : template.cardBg} p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group backdrop-blur-sm`}
              style={isOutline ? { borderColor: template.accent + "40" } : undefined}
              data-testid={`link-card-${link.id}`}>
              <div className="flex items-center justify-center gap-2">
                <span className={`truncate ${template.cardTextColor}`}>{link.title}</span>
                <ExternalLink className={`w-3.5 h-3.5 ${template.cardTextColor} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
              </div>
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CompanyBadge({ teamBranding, brandColor }: { teamBranding: TeamBranding; brandColor: string }) {
  if (teamBranding.companyLogo) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm border shadow-md" data-testid="text-team-brand">
        <div className="w-11 h-11 rounded-lg overflow-hidden bg-white flex items-center justify-center shrink-0 border shadow-sm" data-testid="img-company-logo-badge">
          <img src={teamBranding.companyLogo} alt="Company" className="w-9 h-9 object-contain" />
        </div>
        <span className="text-sm font-bold text-foreground/90">{teamBranding.companyName}</span>
      </div>
    );
  }
  if (teamBranding.companyName) {
    return (
      <div className="px-4 py-2 rounded-full bg-background/90 backdrop-blur-sm border shadow-md" data-testid="text-team-brand">
        <span className="text-sm font-bold text-foreground/90">{teamBranding.companyName}</span>
      </div>
    );
  }
  return null;
}

function ClassicTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  return (
    <div className="mb-10">
      <div className="rounded-md overflow-hidden bg-card/80 backdrop-blur-sm shadow-lg" data-testid="corporate-profile-card">
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
            <CompanyBadge teamBranding={teamBranding} brandColor={brandColor} />
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
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} useOriginalSocialColors={user.useOriginalSocialColors} />
          <div className="mt-3">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={user.useOriginalSocialColors} />
          </div>
          {hasMultiplePages && <div className="mt-4"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} /></div>}
          <ContentSection {...props} />
        </div>
      </div>
    </div>
  );
}

function ModernTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  const avatarCls = getAvatarClass(template.avatarStyle);
  return (
    <div className="mb-10">
      <div className="rounded-2xl overflow-hidden shadow-xl border" style={{ borderColor: brandColor + "20" }} data-testid="corporate-profile-card">
        <div className="flex flex-col sm:flex-row">
          <div className="sm:w-1/3 p-6 flex flex-col items-center justify-center text-center" style={{ backgroundColor: brandColor + "10" }}>
            <Avatar className={`w-24 h-24 border-4 shadow-lg mb-3 ${avatarCls}`} style={{ borderColor: brandColor + "40" }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl font-bold" style={{ backgroundColor: brandColor + "30", color: brandColor }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5" data-testid="text-profile-name">{displayName}{user.emailVerified && <BadgeCheck className="w-4 h-4 text-blue-500 shrink-0" />}</h1>
            {teamBranding.jobTitle && <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
            <p className="text-xs text-muted-foreground mt-0.5" data-testid="text-profile-username">@{user.username}</p>
            {teamBranding.companyLogo && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 border shadow-sm">
                <img src={teamBranding.companyLogo} alt="Company" className="w-6 h-6 object-contain" data-testid="img-company-logo-badge" />
                <span className="text-xs font-semibold">{teamBranding.companyName}</span>
              </div>
            )}
            {!teamBranding.companyLogo && teamBranding.companyName && (
              <p className="text-xs font-semibold mt-2" style={{ color: brandColor }} data-testid="text-team-brand">{teamBranding.companyName}</p>
            )}
            <div className="mt-3">
              <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={user.useOriginalSocialColors} />
            </div>
          </div>
          <div className="sm:w-2/3 p-6 bg-card/90">
            {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-4" data-testid="text-profile-bio">{user.bio}</p>}
            <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="accent" useOriginalSocialColors={user.useOriginalSocialColors} />
            {hasMultiplePages && <div className="mt-4"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} /></div>}
            <ContentSection {...props} />
          </div>
        </div>
      </div>
    </div>
  );
}

function BoldTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
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
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="bordered" useOriginalSocialColors={user.useOriginalSocialColors} />
          <div className="mt-3">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={user.useOriginalSocialColors} />
          </div>
          {hasMultiplePages && <div className="mt-4"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} /></div>}
          <ContentSection {...props} />
        </div>
      </div>
    </div>
  );
}

function ElegantTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  const avatarCls = getAvatarClass(template.avatarStyle);
  return (
    <div className="mb-10">
      <div className="h-1.5 rounded-full shadow-sm mb-6" style={{ backgroundColor: brandColor }} />
      <div className="rounded-2xl overflow-hidden shadow-lg bg-card/90 backdrop-blur-md border" style={{ borderColor: brandColor + "15" }} data-testid="corporate-profile-card">
        <div className="h-1" style={{ backgroundColor: brandColor }} />
        <div className="p-6">
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar className={`w-20 h-20 border-2 shadow-md mb-3 ${avatarCls}`} style={{ borderColor: brandColor + "50" }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-xl" style={{ backgroundColor: brandColor + "20", color: brandColor }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <h1 className="text-xl font-semibold tracking-wide flex items-center gap-1.5" data-testid="text-profile-name">{displayName}{user.emailVerified && <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />}</h1>
            {teamBranding.jobTitle && <p className="text-xs text-muted-foreground tracking-widest uppercase mt-0.5" data-testid="text-profile-jobtitle">{teamBranding.jobTitle}</p>}
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider" data-testid="text-profile-username">@{user.username}</p>
            {teamBranding.companyLogo && (
              <div className="mt-3 flex items-center gap-2 px-4 py-2 rounded-lg bg-background border" style={{ borderColor: brandColor + "20" }} data-testid="text-team-brand">
                <img src={teamBranding.companyLogo} alt="Company" className="w-8 h-8 object-contain" data-testid="img-company-logo-badge" />
                <span className="text-sm font-semibold" style={{ color: brandColor }}>{teamBranding.companyName}</span>
              </div>
            )}
            {!teamBranding.companyLogo && teamBranding.companyName && (
              <p className="text-sm font-medium mt-2" style={{ color: brandColor }} data-testid="text-team-brand">{teamBranding.companyName}</p>
            )}
            <div className="w-16 h-px my-4" style={{ backgroundColor: brandColor + "40" }} />
          </div>
          {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-5 text-center max-w-md mx-auto" data-testid="text-profile-bio">{user.bio}</p>}
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="minimal" useOriginalSocialColors={user.useOriginalSocialColors} />
          {hasMultiplePages && <div className="mt-4"><PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} /></div>}
          <ContentSection {...props} />
        </div>
      </div>
    </div>
  );
}

function HeroTeamLayout(props: TeamLayoutProps) {
  const { user, template, teamBranding, brandColor, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
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
            {teamBranding.companyLogo && (
              <div className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border shadow-sm" data-testid="text-team-brand">
                <img src={teamBranding.companyLogo} alt="Company" className="w-7 h-7 object-contain" data-testid="img-company-logo-badge" />
                <span className="text-xs font-bold">{teamBranding.companyName}</span>
              </div>
            )}
            {!teamBranding.companyLogo && teamBranding.companyName && (
              <p className="text-sm font-semibold mt-2" style={{ color: brandColor }} data-testid="text-team-brand">{teamBranding.companyName}</p>
            )}
          </div>
          {user.bio && <p className="text-sm text-muted-foreground leading-relaxed mb-4 text-center" data-testid="text-profile-bio">{user.bio}</p>}
          <ContactSection teamBranding={teamBranding} brandColor={brandColor} normalizeUrl={normalizeUrl} activeSocials={activeSocials} cardStyle="accent" useOriginalSocialColors={user.useOriginalSocialColors} />
          <div className="mt-3 flex justify-center">
            <SocialRows activeSocials={activeSocials} normalizeUrl={normalizeUrl} useOriginalSocialColors={user.useOriginalSocialColors} />
          </div>
          {hasMultiplePages && (
            <div className="mt-4 pt-3 border-t border-border/50">
              <PageNavSection pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} />
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
