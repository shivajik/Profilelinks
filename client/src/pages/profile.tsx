import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ExternalLink } from "lucide-react";
import type { Link, User } from "@shared/schema";

type PublicProfile = {
  user: Omit<User, "password" | "email">;
  links: Link[];
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

  const { user, links } = data;
  const activeLinks = links.filter((l) => l.active).sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="flex flex-col items-center text-center mb-10">
          <Avatar className="w-24 h-24 border-4 border-background shadow-lg mb-5">
            <AvatarImage src={user.profileImage || undefined} alt={user.displayName || user.username} />
            <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
              {(user.displayName || user.username).charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-bold mb-1" data-testid="text-profile-name">
            {user.displayName || user.username}
          </h1>
          <p className="text-sm text-muted-foreground mb-2" data-testid="text-profile-username">
            @{user.username}
          </p>
          {user.bio && (
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed" data-testid="text-profile-bio">
              {user.bio}
            </p>
          )}
        </div>

        {activeLinks.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">No links yet.</p>
        ) : (
          <div className="space-y-3">
            {activeLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full rounded-xl border bg-card p-4 text-center font-medium transition-all hover:scale-[1.02] hover:shadow-md group"
                data-testid={`link-card-${link.id}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span className="truncate">{link.title}</span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <a href="/" className="text-xs text-muted-foreground/60 transition-colors">
            <span className="text-primary/60">link</span>folio
          </a>
        </div>
      </div>
    </div>
  );
}
