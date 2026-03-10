import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ExternalLink, ChevronDown } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";
import { getPlatform } from "@/lib/social-platforms";
import { getAvatarClass, getButtonClass } from "@/lib/templates";
import type { Template, LayoutType } from "@/lib/templates";
import type { Link, Social, Block } from "@shared/schema";
import { useState } from "react";

type PageInfo = { id: string; title: string; slug: string; isHome: boolean };

interface PersonalLayoutProps {
  user: {
    displayName: string | null;
    username: string;
    profileImage: string | null;
    coverImage?: string | null;
    bio: string | null;
  };
  template: Template;
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

function PageNav({ pages, currentPage, setActivePageSlug, template }: {
  pages: PageInfo[];
  currentPage: PageInfo | null;
  setActivePageSlug: (slug: string | null) => void;
  template: Template;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <>
      <div className="hidden sm:flex items-center gap-2 mt-5 flex-wrap justify-center" data-testid="page-nav">
        {pages.map((page) => {
          const isActive = currentPage?.slug === page.slug;
          return (
            <Button
              key={page.id}
              variant="ghost"
              size="sm"
              onClick={() => setActivePageSlug(page.isHome ? null : page.slug)}
              className={`rounded-full px-4 ${
                isActive
                  ? `${template.cardBg} ${template.cardTextColor}`
                  : `${template.textColor} opacity-60 hover:opacity-100`
              }`}
              data-testid={`page-tab-${page.slug}`}
            >
              {page.title}
            </Button>
          );
        })}
      </div>
      <div className="sm:hidden mt-5 relative inline-block" data-testid="page-nav-mobile">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium ${template.cardBg} ${template.cardTextColor}`}
          data-testid="button-page-nav-toggle"
        >
          {currentPage?.title || "Home"}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
        </button>
        {mobileOpen && (
          <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 min-w-[140px] rounded-xl ${template.cardBg} backdrop-blur-md py-1 z-50 shadow-lg`}>
            {pages.map((page) => {
              const isActive = currentPage?.slug === page.slug;
              return (
                <button
                  key={page.id}
                  onClick={() => { setActivePageSlug(page.isHome ? null : page.slug); setMobileOpen(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm ${isActive ? `${template.cardTextColor} font-medium` : `${template.cardTextColor} opacity-60`}`}
                  data-testid={`mobile-page-tab-${page.slug}`}
                >
                  {page.title}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function SocialRow({ socials, template, normalizeUrl, className = "" }: {
  socials: Social[];
  template: Template;
  normalizeUrl: (url: string, platform?: string) => string;
  className?: string;
}) {
  if (socials.length === 0) return null;
  return (
    <div className={`flex items-center gap-3 flex-wrap ${className}`} data-testid="social-icons-row">
      {socials.map((social) => (
        <a
          key={social.id}
          href={normalizeUrl(social.url, social.platform)}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-2 rounded-full ${template.textColor} opacity-70 hover-elevate active-elevate-2`}
          title={getPlatform(social.platform)?.name || social.platform}
          data-testid={`social-icon-${social.platform}`}
        >
          <SocialIcon platform={social.platform} className="w-5 h-5" />
        </a>
      ))}
    </div>
  );
}

function ContentBlocks({ hasBlocks, activeBlocks, activeLinks, template, isFetching, isLoading, trackClick, normalizeUrl, PublicBlock }: {
  hasBlocks: boolean;
  activeBlocks: Block[];
  activeLinks: Link[];
  template: Template;
  isFetching: boolean;
  isLoading: boolean;
  trackClick: (blockId?: string) => void;
  normalizeUrl: (url: string, platform?: string) => string;
  PublicBlock: any;
}) {
  const btnClass = getButtonClass(template.buttonStyle);
  const isOutline = template.buttonStyle === "outline";
  return (
    <div
      className="transition-opacity duration-300 ease-in-out"
      style={{ opacity: isFetching && !isLoading ? 0.5 : 1 }}
    >
      {hasBlocks ? (
        <div className="space-y-3">
          {activeBlocks.map((block) => (
            <PublicBlock key={block.id} block={block} template={template} onClickTrack={trackClick} />
          ))}
        </div>
      ) : activeLinks.length > 0 ? (
        <div className="space-y-3">
          {activeLinks.map((link) => (
            <a
              key={link.id}
              href={normalizeUrl(link.url)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick(link.id)}
              className={`block w-full ${btnClass} ${isOutline ? "bg-transparent border-current/20" : template.cardBg} p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group backdrop-blur-sm`}
              style={isOutline ? { borderColor: template.accent + "40" } : undefined}
              data-testid={`link-card-${link.id}`}
            >
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

function ClassicLayout(props: PersonalLayoutProps) {
  const { user, template, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  const avatarClass = getAvatarClass(template.avatarStyle);
  return (
    <>
      <div className="flex flex-col items-center text-center mb-10">
        {user.coverImage && (
          <div className="w-full h-32 rounded-md overflow-hidden mb-[-2.5rem] shadow-md" data-testid="personal-cover-image">
            <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />
          </div>
        )}
        <Avatar className={`w-24 h-24 border-4 border-white/20 shadow-lg ${avatarClass} ${user.coverImage ? "mb-5 relative z-10" : "mb-5"}`}>
          <AvatarImage src={user.profileImage || undefined} alt={displayName} />
          <AvatarFallback className="text-2xl" style={{ backgroundColor: template.accent + "30", color: template.accent }}>
            {displayName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <h1 className={`text-2xl font-bold mb-1 ${template.textColor}`} data-testid="text-profile-name">{displayName}</h1>
        <p className={`text-sm mb-2 ${template.textColor} opacity-70`} data-testid="text-profile-username">@{user.username}</p>
        {user.bio && <p className={`text-sm max-w-sm leading-relaxed ${template.textColor} opacity-80`} data-testid="text-profile-bio">{user.bio}</p>}
        <SocialRow socials={activeSocials} template={template} normalizeUrl={normalizeUrl} className="justify-center mt-4" />
        {hasMultiplePages && <PageNav pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} />}
      </div>
      <ContentBlocks {...props} />
    </>
  );
}

function ModernLayout(props: PersonalLayoutProps) {
  const { user, template, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  const avatarClass = getAvatarClass(template.avatarStyle);
  return (
    <>
      <div className="mb-10">
        <div className={`${template.cardBg} backdrop-blur-md rounded-2xl p-6 shadow-lg`}>
          <div className="flex items-start gap-5">
            <Avatar className={`w-20 h-20 border-2 shadow-md shrink-0 ${avatarClass}`} style={{ borderColor: template.accent + "40" }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-xl" style={{ backgroundColor: template.accent + "30", color: template.accent }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className={`text-xl font-bold ${template.cardTextColor}`} data-testid="text-profile-name">{displayName}</h1>
              <p className={`text-xs mt-0.5 ${template.cardTextColor} opacity-60`} data-testid="text-profile-username">@{user.username}</p>
              {user.bio && <p className={`text-sm mt-2 leading-relaxed ${template.cardTextColor} opacity-80`} data-testid="text-profile-bio">{user.bio}</p>}
              <SocialRow socials={activeSocials} template={template} normalizeUrl={normalizeUrl} className="mt-3" />
            </div>
          </div>
          {hasMultiplePages && (
            <div className="flex justify-center mt-4 pt-4 border-t" style={{ borderColor: template.accent + "15" }}>
              <PageNav pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} />
            </div>
          )}
        </div>
      </div>
      <ContentBlocks {...props} />
    </>
  );
}

function BoldLayout(props: PersonalLayoutProps) {
  const { user, template, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  const avatarClass = getAvatarClass(template.avatarStyle);
  return (
    <>
      <div className="mb-10">
        <div className="relative mb-16">
          <div className="h-40 rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: template.accent + "25" }}>
            {user.coverImage ? (
              <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${template.accent}40 0%, ${template.accent}10 100%)` }} />
            )}
          </div>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
            <Avatar className={`w-28 h-28 border-4 shadow-xl ${avatarClass}`} style={{ borderColor: template.accent }}>
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-3xl font-bold" style={{ backgroundColor: template.accent + "30", color: template.accent }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="text-center">
          <h1 className={`text-3xl font-extrabold tracking-tight mb-1 ${template.textColor}`} data-testid="text-profile-name">{displayName}</h1>
          <p className={`text-sm mb-3 ${template.textColor} opacity-60`} data-testid="text-profile-username">@{user.username}</p>
          {user.bio && <p className={`text-sm max-w-md mx-auto leading-relaxed ${template.textColor} opacity-75`} data-testid="text-profile-bio">{user.bio}</p>}
          <SocialRow socials={activeSocials} template={template} normalizeUrl={normalizeUrl} className="justify-center mt-4" />
          {hasMultiplePages && <PageNav pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} />}
        </div>
      </div>
      <ContentBlocks {...props} />
    </>
  );
}

function ElegantLayout(props: PersonalLayoutProps) {
  const { user, template, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  const avatarClass = getAvatarClass(template.avatarStyle);
  return (
    <>
      <div className="mb-10">
        <div className="h-1.5 rounded-full mb-8 shadow-sm" style={{ backgroundColor: template.accent }} />
        <div className={`${template.cardBg} backdrop-blur-md rounded-2xl overflow-hidden shadow-lg`}>
          <div className="h-1" style={{ backgroundColor: template.accent }} />
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className={`w-20 h-20 border-2 shadow-md mb-4 ${avatarClass}`} style={{ borderColor: template.accent + "50" }}>
                <AvatarImage src={user.profileImage || undefined} alt={displayName} />
                <AvatarFallback className="text-xl" style={{ backgroundColor: template.accent + "20", color: template.accent }}>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h1 className={`text-xl font-semibold tracking-wide mb-0.5 ${template.cardTextColor}`} data-testid="text-profile-name">{displayName}</h1>
              <p className={`text-xs ${template.cardTextColor} opacity-50 tracking-widest uppercase`} data-testid="text-profile-username">@{user.username}</p>
              {user.bio && (
                <p className={`text-sm mt-3 max-w-xs leading-relaxed ${template.cardTextColor} opacity-70`} data-testid="text-profile-bio">{user.bio}</p>
              )}
              <div className="w-12 h-px my-4" style={{ backgroundColor: template.accent + "40" }} />
              <SocialRow socials={activeSocials} template={template} normalizeUrl={normalizeUrl} className="justify-center" />
            </div>
          </div>
        </div>
        {hasMultiplePages && (
          <div className="flex justify-center mt-5">
            <PageNav pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} />
          </div>
        )}
      </div>
      <ContentBlocks {...props} />
    </>
  );
}

function HeroLayout(props: PersonalLayoutProps) {
  const { user, template, activeSocials, pages, hasMultiplePages, currentPage, setActivePageSlug, normalizeUrl } = props;
  const displayName = user.displayName || user.username;
  const avatarClass = getAvatarClass(template.avatarStyle);
  return (
    <>
      <div className="mb-10 -mx-6 -mt-12">
        <div className="relative h-52 overflow-hidden">
          {user.coverImage ? (
            <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(180deg, ${template.accent}30 0%, transparent 100%)` }} />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        </div>
        <div className="px-6 -mt-16 relative z-10">
          <div className={`${template.cardBg} backdrop-blur-xl rounded-2xl p-6 shadow-xl border border-white/10`}>
            <div className="flex flex-col items-center text-center -mt-14 mb-3">
              <Avatar className={`w-24 h-24 border-4 shadow-xl mb-3 ${avatarClass}`} style={{ borderColor: template.accent }}>
                <AvatarImage src={user.profileImage || undefined} alt={displayName} />
                <AvatarFallback className="text-2xl font-bold" style={{ backgroundColor: template.accent + "30", color: template.accent }}>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <h1 className={`text-xl font-bold ${template.cardTextColor}`} data-testid="text-profile-name">{displayName}</h1>
              <p className={`text-xs mt-0.5 ${template.cardTextColor} opacity-50`} data-testid="text-profile-username">@{user.username}</p>
              {user.bio && <p className={`text-sm mt-2 max-w-xs leading-relaxed ${template.cardTextColor} opacity-75`} data-testid="text-profile-bio">{user.bio}</p>}
              <SocialRow socials={activeSocials} template={template} normalizeUrl={normalizeUrl} className="justify-center mt-3" />
            </div>
            {hasMultiplePages && (
              <div className="flex justify-center pt-3 border-t border-white/10">
                <PageNav pages={pages} currentPage={currentPage} setActivePageSlug={setActivePageSlug} template={template} />
              </div>
            )}
            <div className="mt-4">
              <ContentBlocks {...props} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function PersonalProfileLayout(props: PersonalLayoutProps) {
  const layout = props.template.layout;
  switch (layout) {
    case "modern": return <ModernLayout {...props} />;
    case "bold": return <BoldLayout {...props} />;
    case "elegant": return <ElegantLayout {...props} />;
    case "hero": return <HeroLayout {...props} />;
    case "classic":
    default: return <ClassicLayout {...props} />;
  }
}
