import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink, Mail, Play, Music } from "lucide-react";
import { getTemplate } from "@/lib/templates";
import { SocialIcon } from "@/components/social-icon";
import { getPlatform } from "@/lib/social-platforms";
import type { Link, User, Social, Block, BlockContent } from "@shared/schema";

function normalizeUrl(url: string, platform?: string): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (platform === "email" || trimmed.startsWith("mailto:")) {
    return trimmed.startsWith("mailto:") ? trimmed : `mailto:${trimmed}`;
  }
  if (platform === "phone" || trimmed.startsWith("tel:")) {
    return trimmed.startsWith("tel:") ? trimmed : `tel:${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

type PageInfo = { id: string; title: string; slug: string; isHome: boolean };

type PublicProfile = {
  user: Omit<User, "password" | "email">;
  links: Link[];
  blocks: Block[];
  socials: Social[];
  pages: PageInfo[];
  currentPage: PageInfo | null;
};

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [activePageSlug, setActivePageSlug] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ["/api/profile", username, activePageSlug],
    queryFn: async () => {
      const url = activePageSlug
        ? `/api/profile/${username}?page=${activePageSlug}`
        : `/api/profile/${username}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-muted-foreground">?</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Page not found</h1>
          <p className="text-muted-foreground text-sm">
            The profile <span className="font-medium">@{username}</span> doesn't exist yet.
          </p>
        </div>
      </div>
    );
  }

  const { user, links, blocks = [], socials = [], pages = [], currentPage } = data;
  const activeLinks = links.filter((l) => l.active).sort((a, b) => a.position - b.position);
  const activeBlocks = blocks.filter((b) => b.active).sort((a, b) => a.position - b.position);
  const activeSocials = socials.filter((s) => s.url).sort((a, b) => a.position - b.position);
  const template = getTemplate(user.template);
  const hasMultiplePages = pages.length > 1;
  const hasBlocks = activeBlocks.length > 0;

  return (
    <div className={`min-h-screen ${template.bg}`}>
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="flex flex-col items-center text-center mb-10">
          <Avatar className="w-24 h-24 border-4 border-white/20 shadow-lg mb-5">
            <AvatarImage src={user.profileImage || undefined} alt={user.displayName || user.username} />
            <AvatarFallback
              className="text-2xl"
              style={{ backgroundColor: template.accent + "30", color: template.accent }}
            >
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className={`text-2xl font-bold mb-1 ${template.textColor}`} data-testid="text-profile-name">
            {user.displayName || user.username}
          </h1>
          <p className={`text-sm mb-2 ${template.textColor} opacity-70`} data-testid="text-profile-username">
            @{user.username}
          </p>
          {user.bio && (
            <p className={`text-sm max-w-sm leading-relaxed ${template.textColor} opacity-80`} data-testid="text-profile-bio">
              {user.bio}
            </p>
          )}
          {activeSocials.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-4 flex-wrap" data-testid="social-icons-row">
              {activeSocials.map((social) => (
                <a
                  key={social.id}
                  href={normalizeUrl(social.url, social.platform)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`p-2 rounded-full transition-all hover:scale-110 ${template.textColor} opacity-70 hover:opacity-100`}
                  title={getPlatform(social.platform)?.name || social.platform}
                  data-testid={`social-icon-${social.platform}`}
                >
                  <SocialIcon platform={social.platform} className="w-5 h-5" />
                </a>
              ))}
            </div>
          )}

          {hasMultiplePages && (
            <div className="flex items-center gap-2 mt-5 flex-wrap justify-center" data-testid="page-nav">
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
          )}
        </div>

        {hasBlocks ? (
          <div className="space-y-3">
            {activeBlocks.map((block) => (
              <PublicBlock key={block.id} block={block} template={template} />
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
                className={`block w-full rounded-xl ${template.cardBg} p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group backdrop-blur-sm`}
                data-testid={`link-card-${link.id}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className={`truncate ${template.cardTextColor}`}>{link.title}</span>
                  <ExternalLink className={`w-3.5 h-3.5 ${template.cardTextColor} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className={`text-center text-sm ${template.textColor} opacity-60`}>No content yet.</p>
        )}

        <div className="mt-12 text-center">
          <a href="/" className="text-xs transition-opacity hover:opacity-80">
            <span style={{ color: template.accent, opacity: 0.6 }}>link</span>
            <span className={`${template.textColor}`} style={{ opacity: 0.4 }}>folio</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId = "";
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      videoId = u.searchParams.get("v") || "";
      if (!videoId && u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/embed/")[1];
      }
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    }
    if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {}
  return null;
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

function getSpotifyEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("spotify.com")) {
      const path = u.pathname;
      return `https://open.spotify.com/embed${path}`;
    }
  } catch {}
  return null;
}

function PublicBlock({ block, template }: { block: Block; template: ReturnType<typeof getTemplate> }) {
  const content = block.content as BlockContent;

  switch (block.type) {
    case "url_button": {
      const href = content.url ? normalizeUrl(content.url) : "#";
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full rounded-xl ${template.cardBg} p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group backdrop-blur-sm`}
          data-testid={`block-url-${block.id}`}
        >
          <div className="flex items-center justify-center gap-2">
            <span className={`truncate ${template.cardTextColor}`}>{content.title || "Untitled Link"}</span>
            <ExternalLink className={`w-3.5 h-3.5 ${template.cardTextColor} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
          </div>
        </a>
      );
    }
    case "email_button": {
      const href = content.email ? `mailto:${content.email}` : "#";
      return (
        <a
          href={href}
          className={`block w-full rounded-xl ${template.cardBg} p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group backdrop-blur-sm`}
          data-testid={`block-email-${block.id}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Mail className={`w-4 h-4 ${template.cardTextColor} shrink-0`} />
            <span className={`truncate ${template.cardTextColor}`}>{content.title || "Email"}</span>
          </div>
        </a>
      );
    }
    case "text":
      return (
        <div className="py-2 px-1" data-testid={`block-text-${block.id}`}>
          <p className={`text-sm ${template.textColor} opacity-80 leading-relaxed whitespace-pre-wrap`}>
            {content.text || ""}
          </p>
        </div>
      );
    case "divider":
      return (
        <div className="py-3" data-testid={`block-divider-${block.id}`}>
          <hr className={`border-t ${template.textColor} opacity-20`} />
        </div>
      );
    case "video": {
      const ytEmbed = content.url ? getYouTubeEmbedUrl(content.url) : null;
      const vimeoEmbed = content.url ? getVimeoEmbedUrl(content.url) : null;
      const embedUrl = ytEmbed || vimeoEmbed;
      if (embedUrl) {
        return (
          <div className="rounded-xl overflow-hidden" data-testid={`block-video-${block.id}`}>
            {content.title && (
              <p className={`text-sm font-medium ${template.textColor} mb-2`}>{content.title}</p>
            )}
            <iframe
              src={embedUrl}
              className="w-full aspect-video rounded-xl"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={content.title || "Video"}
            />
          </div>
        );
      }
      return (
        <a
          href={content.url ? normalizeUrl(content.url) : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full rounded-xl ${template.cardBg} p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group backdrop-blur-sm`}
          data-testid={`block-video-${block.id}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Play className={`w-4 h-4 ${template.cardTextColor} shrink-0`} />
            <span className={`truncate ${template.cardTextColor}`}>{content.title || "Video"}</span>
          </div>
        </a>
      );
    }
    case "audio": {
      const spotifyEmbed = content.url ? getSpotifyEmbedUrl(content.url) : null;
      if (spotifyEmbed) {
        return (
          <div className="rounded-xl overflow-hidden" data-testid={`block-audio-${block.id}`}>
            {content.title && (
              <p className={`text-sm font-medium ${template.textColor} mb-2`}>{content.title}</p>
            )}
            <iframe
              src={spotifyEmbed}
              className="w-full rounded-xl"
              height="152"
              allow="autoplay; encrypted-media"
              title={content.title || "Audio"}
            />
          </div>
        );
      }
      return (
        <a
          href={content.url ? normalizeUrl(content.url) : "#"}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full rounded-xl ${template.cardBg} p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group backdrop-blur-sm`}
          data-testid={`block-audio-${block.id}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Music className={`w-4 h-4 ${template.cardTextColor} shrink-0`} />
            <span className={`truncate ${template.cardTextColor}`}>{content.title || "Audio"}</span>
          </div>
        </a>
      );
    }
    case "image": {
      const imgElement = content.imageUrl ? (
        <img
          src={content.imageUrl}
          alt={content.title || ""}
          className="w-full h-auto rounded-xl"
        />
      ) : (
        <div className={`w-full ${template.cardBg} rounded-xl p-8 text-center backdrop-blur-sm`}>
          <span className={`text-sm ${template.cardTextColor} opacity-60`}>Image</span>
        </div>
      );

      if (content.linkUrl) {
        return (
          <a
            href={normalizeUrl(content.linkUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-md"
            data-testid={`block-image-${block.id}`}
          >
            {imgElement}
          </a>
        );
      }
      return (
        <div className="rounded-xl overflow-hidden" data-testid={`block-image-${block.id}`}>
          {imgElement}
        </div>
      );
    }
    default:
      return null;
  }
}
