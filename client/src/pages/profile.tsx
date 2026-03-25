import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, ExternalLink, Mail, Play, Music, UserPlus, Share2, QrCode, Copy, Check, Wallet, Briefcase, Package } from "lucide-react";
import { SiFacebook, SiX, SiPinterest, SiReddit, SiLinkedin } from "react-icons/si";
import { QRCodeSVG } from "qrcode.react";
import { getTemplate } from "@/lib/templates";
import { PersonalProfileLayout } from "@/components/profile-layouts";
import { TeamProfileLayout } from "@/components/team-profile-layouts";
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
  showServicesOnProfile?: boolean;
  showProductsOnProfile?: boolean;
  teamSlug?: string;
};

type PublicProfile = {
  user: Omit<User, "password" | "email">;
  links: Link[];
  blocks: Block[];
  socials: Social[];
  pages: PageInfo[];
  currentPage: PageInfo | null;
  teamBranding?: TeamBranding | null;
  affiliateInfo?: { isAffiliate: boolean; referralCode?: string };
};

export default function PublicProfile(props?: any) {
  const params = useParams<{ username?: string; companySlug?: string }>();
  const username = props?.username || props?.params?.username || params.username;
  const companySlug = props?.companySlug || props?.params?.companySlug || params.companySlug;
  const [activePageSlug, setActivePageSlug] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [appleWalletLoading, setAppleWalletLoading] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  const { data, isLoading, isFetching, error } = useQuery<PublicProfile>({
    queryKey: ["/api/profile", companySlug, username, activePageSlug],
    queryFn: async () => {
      const basePath = companySlug
        ? `/api/profile/${companySlug}/${username}`
        : `/api/profile/${username}`;
      const isPreview = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("preview") === "1";
      const params = new URLSearchParams();
      if (activePageSlug) params.set("page", activePageSlug);
      if (isPreview) params.set("preview", "1");
      const url = params.toString() ? `${basePath}?${params.toString()}` : basePath;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    placeholderData: keepPreviousData,
  });

  // Check white-label status
  const { data: whiteLabelData } = useQuery<{ whiteLabelEnabled: boolean }>({
    queryKey: ["/api/white-label", username],
    queryFn: async () => {
      const res = await fetch(`/api/white-label/${username}`);
      return res.json();
    },
    enabled: !!username,
  });

  const viewTracked = useRef<string | null>(null);
  const currentPage = data?.currentPage ?? null;

  useEffect(() => {
    if (!data) return;
    const slug = currentPage?.slug || "home";
    if (username && viewTracked.current !== slug) {
      viewTracked.current = slug;
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          eventType: "page_view",
          pageSlug: slug,
          referrer: document.referrer || null,
        }),
      }).catch(() => {});
    }
  }, [username, currentPage?.slug, data]);

  const trackClick = useCallback((blockId?: string) => {
    if (!username) return;
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        eventType: "click",
        blockId: blockId || null,
        pageSlug: currentPage?.slug || null,
      }),
    }).catch(() => {});
  }, [username, currentPage?.slug]);

  // Dynamic page title and meta tags — must be before conditional returns
  useEffect(() => {
    if (!data) return;
    const { user: u, teamBranding: tb } = data;
    const dn = u.displayName || u.username;
    const tn = tb?.teamName || tb?.companyName;
    const title = tn
      ? `${dn} — ${tn} | VisiCardly`
      : `${dn} (@${u.username}) | VisiCardly`;
    document.title = title;

    const bio = u.bio || `Check out ${dn}'s profile on VisiCardly`;
    const pUrl = typeof window !== "undefined" ? `${window.location.origin}/${username}` : `/${username}`;
    const updateMeta = (selector: string, attr: string, value: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute(attr, value);
    };
    updateMeta('meta[property="og:title"]', 'content', title);
    updateMeta('meta[property="og:description"]', 'content', bio);
    updateMeta('meta[property="og:url"]', 'content', pUrl);
    updateMeta('meta[name="twitter:title"]', 'content', title);
    updateMeta('meta[name="twitter:description"]', 'content', bio);
    if (u.profileImage) {
      const imgUrl = u.profileImage.startsWith('http') ? u.profileImage : `${window.location.origin}${u.profileImage}`;
      updateMeta('meta[property="og:image"]', 'content', imgUrl);
      updateMeta('meta[name="twitter:image"]', 'content', imgUrl);
    }
    updateMeta('meta[name="description"]', 'content', bio);

    return () => { document.title = 'VisiCardly — Digital Business Cards & Link-in-Bio Pages'; };
  }, [data, username]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#1a1625] via-[#2d1f4e] to-[#1a1625] flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-lg">
            <span className="text-3xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Profile Not Found</h1>
          <p className="text-white/60 text-sm leading-relaxed mb-8">
            The profile <span className="font-semibold text-white/80">@{username}</span> doesn't exist or may have been removed.
          </p>
          <a
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-all border border-white/10 backdrop-blur-sm"
          >
            ← Back to Home
          </a>
          <div className="mt-10">
            <a href="/" className="text-xs transition-opacity hover:opacity-80">
              <span className="text-white/40">Powered by </span>
              <span className="text-purple-400/70">Visi</span>
              <span className="text-white/40">Cardly</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { user, links, blocks = [], socials = [], pages = [], teamBranding, affiliateInfo } = data;
  const activeLinks = links.filter((l) => l.active).sort((a, b) => a.position - b.position);
  const activeBlocks = blocks.filter((b) => b.active).sort((a, b) => a.position - b.position);
  const activeSocials = socials.filter((s) => s.url).sort((a, b) => a.position - b.position);
  const template = getTemplate(user.template);
  const isTeamProfile = !!(teamBranding && typeof teamBranding === "object");
  const brandColor = teamBranding?.themeColor || template.accent;

  // Build pages with dynamic Services/Products tabs
  const showServices = teamBranding?.showServicesOnProfile;
  const showProducts = teamBranding?.showProductsOnProfile;
  const teamSlug = teamBranding?.teamSlug;
  const dynamicPages = [...pages];
  if (showServices) dynamicPages.push({ id: "__services__", title: "Services", slug: "__services__", isHome: false });
  if (showProducts) dynamicPages.push({ id: "__products__", title: "Products", slug: "__products__", isHome: false });
  const hasMultiplePages = dynamicPages.length > 0;
  const hasBlocks = activeBlocks.length > 0;

  const profileUrl = typeof window !== "undefined" ? `${window.location.origin}/${username}` : `/${username}`;
  const displayName = user.displayName || user.username;

  function handleCopyUrl() {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSaveToWallet() {
    setWalletLoading(true);
    try {
      const res = await fetch("/api/google-wallet/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      window.open(data.walletUrl, "_blank");
    } catch (err) {
      console.error("Google Wallet error:", err);
    } finally {
      setWalletLoading(false);
    }
  }


  async function handleSaveToAppleWallet() {
    setAppleWalletLoading(true);
    try {
      const res = await fetch("/api/apple-wallet/pass", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${username}.pkpass`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Apple Wallet error:", err);
    } finally {
      setAppleWalletLoading(false);
    }
  }

  function handleAddContact() {
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${displayName}`,
      teamBranding?.jobTitle ? `TITLE:${teamBranding.jobTitle}` : "",
      teamBranding?.companyName ? `ORG:${teamBranding.companyName}` : "",
      teamBranding?.companyPhone ? `TEL:${teamBranding.companyPhone}` : "",
      teamBranding?.companyContact ? `TEL;TYPE=CELL:${teamBranding.companyContact}` : "",
      teamBranding?.companyEmail ? `EMAIL:${teamBranding.companyEmail}` : "",
      teamBranding?.companyWebsite ? `URL:${teamBranding.companyWebsite}` : "",
      !teamBranding?.companyWebsite ? `URL:${profileUrl}` : "",
      teamBranding?.companyAddress ? `ADR:;;${teamBranding.companyAddress};;;;` : "",
      user.bio ? `NOTE:${user.bio}` : "",
      "END:VCARD",
    ].filter(Boolean).join("\n");

    const blob = new Blob([vcard], { type: "text/vcard" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const socialShareItems = [
    { icon: SiFacebook, color: "#1877F2", label: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}` },
    { icon: SiX, color: "#000000", label: "X", url: `https://x.com/intent/tweet?url=${encodeURIComponent(profileUrl)}&text=${encodeURIComponent(`Check out ${displayName}'s profile`)}` },
    { icon: SiPinterest, color: "#E60023", label: "Pinterest", url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(profileUrl)}&description=${encodeURIComponent(displayName)}` },
    { icon: SiReddit, color: "#FF4500", label: "Reddit", url: `https://reddit.com/submit?url=${encodeURIComponent(profileUrl)}&title=${encodeURIComponent(displayName)}` },
    { icon: SiLinkedin, color: "#0A66C2", label: "LinkedIn", url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}` },
  ];

  return (
    <div className={`min-h-screen ${template.bg}`}>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setContactOpen(true)}
            className={`${template.textColor}`}
            data-testid="button-add-contact"
          >
            <UserPlus className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShareOpen(true)}
            className={`${template.textColor}`}
            data-testid="button-share"
          >
            <Share2 className="w-5 h-5" />
          </Button>
          {/* <Button
            variant="ghost"
            size="icon"
            onClick={() => setWalletOpen(true)}
            className={`${template.textColor}`}
            data-testid="button-wallet"
          >
            <Wallet className="w-5 h-5" />
          </Button> */}
        </div>

        {/* Lightbox overlay */}
        {lightboxUrl && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
            onClick={() => setLightboxUrl(null)}
          >
            <button
              type="button"
              className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 hover:bg-black/70 transition-colors"
              onClick={() => setLightboxUrl(null)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <img
              src={lightboxUrl}
              alt="Full size"
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        {isTeamProfile ? (
          <TeamProfileLayout
            user={user}
            template={template}
            teamBranding={teamBranding!}
            brandColor={brandColor}
            activeSocials={activeSocials}
            activeLinks={activeLinks}
            activeBlocks={activeBlocks}
            hasBlocks={hasBlocks}
            pages={dynamicPages}
            hasMultiplePages={hasMultiplePages}
            currentPage={currentPage}
            setActivePageSlug={setActivePageSlug}
            isFetching={isFetching}
            isLoading={isLoading}
            normalizeUrl={normalizeUrl}
            trackClick={trackClick}
            PublicBlock={(p: any) => <PublicBlock {...p} onImageClick={setLightboxUrl} />}
            activePageSlug={activePageSlug}
            teamSlug={teamSlug}
          />
        ) : (
          <PersonalProfileLayout
            user={user}
            template={template}
            activeSocials={activeSocials}
            activeLinks={activeLinks}
            activeBlocks={activeBlocks}
            hasBlocks={hasBlocks}
            pages={dynamicPages}
            hasMultiplePages={hasMultiplePages}
            currentPage={currentPage}
            setActivePageSlug={setActivePageSlug}
            isFetching={isFetching}
            isLoading={isLoading}
            normalizeUrl={normalizeUrl}
            trackClick={trackClick}
            PublicBlock={(p: any) => <PublicBlock {...p} onImageClick={setLightboxUrl} />}
          />
        )}

        {whiteLabelData !== undefined && !whiteLabelData.whiteLabelEnabled && (
          <div className="mt-12 text-center space-y-1">
            <p className="text-xs" style={{ opacity: 0.4 }}>
              <span className={template.textColor}>Powered by </span>
              <span style={{ color: template.accent }}>Visi</span>
              <span className={template.textColor}>Cardly</span>
            </p>
            <a
              href={affiliateInfo?.isAffiliate && affiliateInfo.referralCode
                ? `/auth?ref=${affiliateInfo.referralCode}`
                : "/auth"}
              target="_blank" rel="noopener noreferrer" className="text-xs transition-opacity hover:opacity-80 block"
            >
              <span className={`${template.textColor}`} style={{ opacity: 0.5 }}>
                Create your own digital business card with
              </span>
              <span style={{ color: template.accent, opacity: 0.6 }}> Visi</span>
              <span className={`${template.textColor}`} style={{ opacity: 0.4 }}>Cardly</span>
            </a>
          </div>
        )}
      </div>

      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-add-contact">
          <DialogHeader className="items-center text-center">
            <div className="flex justify-center mb-3">
              <UserPlus className="w-8 h-8 text-muted-foreground" />
            </div>
            <DialogTitle>Add {displayName} as a contact.</DialogTitle>
            <DialogDescription className="sr-only">Download contact card</DialogDescription>
          </DialogHeader>
          <Button
            onClick={handleAddContact}
            className="w-full"
            data-testid="button-download-contact"
          >
            Add Contact
          </Button>
                    </DialogContent>
      </Dialog>

      <Dialog open={walletOpen} onOpenChange={setWalletOpen}>
        <DialogContent className="max-w-sm" data-testid="dialog-wallet">
          <DialogHeader className="items-center text-center">
            <div className="flex justify-center mb-3">
              <Wallet className="w-8 h-8 text-muted-foreground" />
            </div>
            <DialogTitle>Save to Wallet</DialogTitle>
            <DialogDescription>
              Save {displayName}'s business card to your digital wallet for quick access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              variant="outline"
              onClick={handleSaveToWallet}
              disabled={walletLoading}
              className="w-full gap-2"
              data-testid="button-save-google-wallet"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              {walletLoading ? "Generating..." : "Save to Google Wallet"}
            </Button>
            <Button
              variant="outline"
              onClick={handleSaveToAppleWallet}
              disabled={appleWalletLoading}
              className="w-full gap-2"
              data-testid="button-save-apple-wallet"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
              {appleWalletLoading ? "Generating..." : "Save to Apple Wallet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shareOpen} onOpenChange={(open) => { setShareOpen(open); if (!open) setShowQr(false); }}>
        <DialogContent className="max-w-sm" data-testid="dialog-share">
          <DialogHeader className="items-center text-center">
            <DialogTitle>{displayName}</DialogTitle>
            <DialogDescription className="sr-only">Share this profile</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center">
            <Avatar className="w-24 h-24 border-4 border-primary/20 shadow-lg">
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback
                className="text-2xl"
                style={{ backgroundColor: template.accent + "30", color: template.accent }}
              >
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {showQr ? (
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 rounded-md">
                <QRCodeSVG value={profileUrl} size={180} />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowQr(false)}
                className="w-full"
                data-testid="button-back-from-qr"
              >
                Back
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                variant="secondary"
                className="w-full justify-center gap-2"
                onClick={() => setShowQr(true)}
                data-testid="button-view-qr"
              >
                View QR Code
                <QrCode className="w-4 h-4" />
              </Button>
              <Button
                variant="secondary"
                className="w-full justify-center gap-2"
                onClick={handleCopyUrl}
                data-testid="button-copy-url"
              >
                {copied ? "Copied!" : "Copy Page URL"}
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <div className="flex items-center justify-center gap-3 pt-2" data-testid="share-social-row">
                {socialShareItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white hover-elevate active-elevate-2"
                    style={{ backgroundColor: item.color }}
                    title={`Share on ${item.label}`}
                    data-testid={`share-${item.label.toLowerCase()}`}
                  >
                    <item.icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
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

function PublicBlock({ block, template, onClickTrack, onImageClick }: { block: Block; template: ReturnType<typeof getTemplate>; onClickTrack?: (blockId: string) => void; onImageClick?: (url: string) => void }) {
  const content = block.content as BlockContent;

  switch (block.type) {
    case "url_button": {
      const href = content.url ? normalizeUrl(content.url) : "#";
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onClickTrack?.(block.id)}
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
          onClick={() => onClickTrack?.(block.id)}
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
      if (content.url) {
        const normalizedUrl = normalizeUrl(content.url);
        return (
          <div className="rounded-xl overflow-hidden" data-testid={`block-video-${block.id}`}>
            {content.title && (
              <p className={`text-sm font-medium ${template.textColor} mb-2`}>{content.title}</p>
            )}
            <video
              src={normalizedUrl}
              className="w-full aspect-video rounded-xl bg-black"
              controls
              preload="metadata"
              title={content.title || "Video"}
            />
          </div>
        );
      }
      return (
        <div
          className={`block w-full rounded-xl ${template.cardBg} p-4 text-center font-medium backdrop-blur-sm`}
          data-testid={`block-video-${block.id}`}
        >
          <div className="flex items-center justify-center gap-2">
            <Play className={`w-4 h-4 ${template.cardTextColor} shrink-0`} />
            <span className={`truncate ${template.cardTextColor}`}>{content.title || "Video"}</span>
          </div>
        </div>
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
      if (!content.imageUrl) {
        return (
          <div className={`w-full ${template.cardBg} rounded-xl p-8 text-center backdrop-blur-sm`} data-testid={`block-image-${block.id}`}>
            <span className={`text-sm ${template.cardTextColor} opacity-60`}>Image</span>
          </div>
        );
      }
      return (
        <button
          type="button"
          className="block w-full rounded-lg overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg cursor-zoom-in group relative aspect-[4/3]"
          data-testid={`block-image-${block.id}`}
          onClick={() => onImageClick?.(content.imageUrl!)}
        >
          <img
            src={content.imageUrl}
            alt={content.title || ""}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full p-1.5">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>
            </div>
          </div>
        </button>
      );
    }
    default:
      return null;
  }
}
