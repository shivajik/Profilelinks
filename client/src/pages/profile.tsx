import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ExternalLink } from "lucide-react";
import { getTemplate } from "@/lib/templates";
import { SocialIcon } from "@/components/social-icon";
import { getPlatform } from "@/lib/social-platforms";
import type { Link, User, Social } from "@shared/schema";

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

type PublicProfile = {
  user: Omit<User, "password" | "email">;
  links: Link[];
  socials: Social[];
};

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();

  const { data, isLoading, error } = useQuery<PublicProfile>({
    queryKey: ["/api/profile", username],
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

  const { user, links, socials = [] } = data;
  const activeLinks = links.filter((l) => l.active).sort((a, b) => a.position - b.position);
  const activeSocials = socials.filter((s) => s.url).sort((a, b) => a.position - b.position);
  const template = getTemplate(user.template);

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
        </div>

        {activeLinks.length === 0 ? (
          <p className={`text-center text-sm ${template.textColor} opacity-60`}>No links yet.</p>
        ) : (
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
