import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getTemplate } from "@/lib/templates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Copy, Check, Package, QrCode, Phone, Mail, MapPin, Globe, Clock, MessageCircle } from "lucide-react";
import { SocialIcon } from "@/components/social-icon";

interface MenuSection {
  id: string;
  name: string;
  description: string | null;
  position: number;
}

interface MenuProduct {
  id: string;
  sectionId: string;
  name: string;
  description: string | null;
  price: string | null;
  imageUrl: string | null;
  position: number;
}

interface OpeningHour {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
  position: number;
}

interface MenuUser {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  profileImage: string | null;
  template: string | null;
  menuTemplate: string | null;
  menuDisplayName: string | null;
  menuProfileImage: string | null;
  menuAccentColor: string | null;
  menuDescription: string | null;
  menuPhone: string | null;
  menuEmail: string | null;
  menuAddress: string | null;
  menuGoogleMapsUrl: string | null;
  menuWhatsapp: string | null;
  menuWebsite: string | null;
}

interface TeamBranding {
  companyLogo?: string;
  companyName?: string;
  themeColor?: string;
}

interface PublicMenuData {
  user: MenuUser;
  sections: MenuSection[];
  products: MenuProduct[];
  openingHours: OpeningHour[];
  socials: SocialLink[];
  teamBranding: TeamBranding | null;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function PublicMenu() {
  const { username } = useParams<{ username: string }>();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [userClicked, setUserClicked] = useState(false);
  const isEmbed = new URLSearchParams(window.location.search).get("embed") === "1";
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const tabsRef = useRef<HTMLDivElement | null>(null);

  const { data, isLoading, error } = useQuery<PublicMenuData>({
    queryKey: ["/api/menu", username],
    queryFn: async () => {
      const res = await fetch(`/api/menu/${username}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const sortedSections = data?.sections?.sort((a, b) => a.position - b.position) || [];

  // Set initial active tab
  useEffect(() => {
    if (sortedSections.length > 0 && !activeTab) {
      setActiveTab(sortedSections[0].id);
    }
  }, [sortedSections, activeTab]);

  // Scroll spy: update active tab based on scroll position
  const handleScroll = useCallback(() => {
    if (userClicked) return;
    const tabsHeight = tabsRef.current?.getBoundingClientRect().bottom || 0;
    let closest: string | null = null;
    let closestDist = Infinity;
    for (const section of sortedSections) {
      const el = sectionRefs.current[section.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const dist = Math.abs(rect.top - tabsHeight - 10);
      if (rect.top <= tabsHeight + 100 && dist < closestDist) {
        closestDist = dist;
        closest = section.id;
      }
    }
    if (closest && closest !== activeTab) {
      setActiveTab(closest);
    }
  }, [sortedSections, activeTab, userClicked]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const scrollToSection = (sectionId: string) => {
    setActiveTab(sectionId);
    setUserClicked(true);
    const el = sectionRefs.current[sectionId];
    if (el) {
      const tabsHeight = tabsRef.current?.getBoundingClientRect().height || 50;
      const y = el.getBoundingClientRect().top + window.scrollY - tabsHeight - 10;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
    setTimeout(() => setUserClicked(false), 800);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-muted-foreground">🍽️</span>
          </div>
          <h1 className="text-xl font-bold mb-2">Menu not found</h1>
          <p className="text-muted-foreground text-sm">
            The menu for <span className="font-medium">@{username}</span> doesn't exist yet.
          </p>
        </div>
      </div>
    );
  }

  const { user, products, openingHours, socials, teamBranding } = data;
  const template = getTemplate(user.menuTemplate || user.template);
  const displayName = user.menuDisplayName || user.displayName || user.username;
  const profileImage = user.menuProfileImage || user.profileImage;
  const brandColor = user.menuAccentColor || teamBranding?.themeColor || template.accent;
  const menuDescription = user.menuDescription || user.bio;
  const menuUrl = typeof window !== "undefined" ? `${window.location.origin}/${username}/menu` : `/${username}/menu`;

  const hasContact = user.menuPhone || user.menuEmail || user.menuAddress || user.menuWhatsapp || user.menuWebsite || user.menuGoogleMapsUrl;

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`min-h-screen ${template.bg}`}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6">
          {!isEmbed && (
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="ghost" size="icon" onClick={handleCopy} className={template.textColor}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowQr(true)} className={template.textColor}>
                <QrCode className="w-4 h-4" />
              </Button>
            </div>
          )}

          {teamBranding?.companyLogo ? (
            <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-2 border-white/20 shadow-lg">
              <img src={teamBranding.companyLogo} alt={teamBranding.companyName || ""} className="w-full h-full object-cover" />
            </div>
          ) : (
            <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-white/20 shadow-lg">
              <AvatarImage src={profileImage || undefined} alt={displayName} />
              <AvatarFallback className="text-2xl" style={{ backgroundColor: brandColor + "30", color: brandColor }}>
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <h1 className={`text-2xl font-bold ${template.textColor}`}>
            {teamBranding?.companyName || displayName}
          </h1>
          {menuDescription && (
            <p className={`text-sm mt-1 ${template.textColor} opacity-70`}>{menuDescription}</p>
          )}

          <div className="w-16 h-1 rounded-full mx-auto mt-4" style={{ backgroundColor: brandColor }} />
        </div>

        {/* Social Links moved below menu */}

        {/* Sticky Category Tabs */}
        {sortedSections.length > 0 && (
          <div ref={tabsRef} className="sticky top-0 z-10 -mx-4 px-4 py-2" style={{ backgroundColor: 'inherit' }}>
            <div className={`${template.bg} rounded-xl py-2`}>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {sortedSections.map((section) => {
                  const isActive = activeTab === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => scrollToSection(section.id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0 ${
                        isActive
                          ? "shadow-md"
                          : `${template.textColor} opacity-70 hover:opacity-100`
                      }`}
                      style={isActive ? { backgroundColor: brandColor } : {}}
                    >
                      {section.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Menu Sections - All visible, scrollable */}
        {sortedSections.length === 0 ? (
          <div className={`text-center py-12 ${template.textColor} opacity-60`}>
            <p className="text-lg">No menu items yet</p>
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            {sortedSections.map((section) => {
              const sectionProducts = products.filter(p => p.sectionId === section.id).sort((a, b) => a.position - b.position);
              return (
                <div
                  key={section.id}
                  ref={(el) => { sectionRefs.current[section.id] = el; }}
                >
                  <div className="mb-3">
                    <h2 className={`text-lg font-bold ${template.textColor}`}>{section.name}</h2>
                    {section.description && <p className={`text-xs ${template.textColor} opacity-60 mt-0.5`}>{section.description}</p>}
                  </div>
                  {sectionProducts.length > 0 && (
                    <div className="space-y-3">
                      {sectionProducts.map((product) => (
                        <div key={product.id} className={`rounded-xl overflow-hidden ${template.cardBg} backdrop-blur-sm p-3`}>
                          <div className="flex items-start gap-3">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-20 h-20 rounded-lg object-cover shrink-0 shadow-sm" />
                            ) : (
                              <div className="w-20 h-20 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: brandColor + "15" }}>
                                <Package className="w-7 h-7" style={{ color: brandColor + "60" }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className={`text-sm font-semibold ${template.cardTextColor}`}>{product.name}</h3>
                                {product.price && <span className="text-sm font-bold shrink-0" style={{ color: brandColor }}>{product.price}</span>}
                              </div>
                              {product.description && <p className={`text-xs mt-1 ${template.cardTextColor} opacity-60 line-clamp-2`}>{product.description}</p>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Social Links - AFTER menu */}
        {socials.length > 0 && (
          <div className={`rounded-xl overflow-hidden ${template.cardBg} backdrop-blur-sm mt-6 p-4`}>
            <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${template.cardTextColor}`}>
              <span>Follow Us</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {socials.map((social) => {
                const href = social.url.startsWith('http') || social.url.startsWith('mailto:') || social.url.startsWith('tel:') ? social.url : `https://${social.url}`;
                return (
                <a key={social.id} href={href} target="_blank" rel="noopener noreferrer"
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 ${template.cardBg} border border-white/10`}
                  style={{ color: brandColor }}>
                  <SocialIcon platform={social.platform} className="w-4 h-4" />
                </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Contact Info - AFTER menu */}
        {hasContact && (
          <div className={`rounded-xl overflow-hidden ${template.cardBg} backdrop-blur-sm mt-6 p-4`}>
            <h3 className={`text-sm font-semibold mb-3 ${template.cardTextColor}`}>Contact</h3>
            <div className="space-y-2">
              {user.menuPhone && (
                <a href={`tel:${user.menuPhone}`} className={`flex items-center gap-2 text-sm ${template.cardTextColor} opacity-80 hover:opacity-100`}>
                  <Phone className="w-4 h-4 shrink-0" style={{ color: brandColor }} />
                  {user.menuPhone}
                </a>
              )}
              {user.menuEmail && (
                <a href={`mailto:${user.menuEmail}`} className={`flex items-center gap-2 text-sm ${template.cardTextColor} opacity-80 hover:opacity-100`}>
                  <Mail className="w-4 h-4 shrink-0" style={{ color: brandColor }} />
                  {user.menuEmail}
                </a>
              )}
              {user.menuWhatsapp && (
                <a href={`https://wa.me/${user.menuWhatsapp.replace(/[^0-9+]/g, '')}`} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-sm ${template.cardTextColor} opacity-80 hover:opacity-100`}>
                  <MessageCircle className="w-4 h-4 shrink-0" style={{ color: brandColor }} />
                  WhatsApp
                </a>
              )}
              {user.menuWebsite && (
                <a href={user.menuWebsite.startsWith('http') ? user.menuWebsite : `https://${user.menuWebsite}`} target="_blank" rel="noopener noreferrer"
                  className={`flex items-center gap-2 text-sm ${template.cardTextColor} opacity-80 hover:opacity-100`}>
                  <Globe className="w-4 h-4 shrink-0" style={{ color: brandColor }} />
                  {user.menuWebsite.replace(/^https?:\/\//, '')}
                </a>
              )}
              {user.menuAddress && (
                <div className={`flex items-start gap-2 text-sm ${template.cardTextColor} opacity-80`}>
                  <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: brandColor }} />
                  <span>{user.menuAddress}</span>
                </div>
              )}
              {user.menuGoogleMapsUrl && (
                <a href={user.menuGoogleMapsUrl.startsWith('http') ? user.menuGoogleMapsUrl : `https://${user.menuGoogleMapsUrl}`} target="_blank" rel="noopener noreferrer"
                  className="text-xs underline opacity-60 hover:opacity-100 ml-6" style={{ color: brandColor }}>
                  View on Google Maps →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Opening Hours - AFTER menu */}
        {openingHours.length > 0 && (
          <div className={`rounded-xl overflow-hidden ${template.cardBg} backdrop-blur-sm mt-4 p-4`}>
            <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${template.cardTextColor}`}>
              <Clock className="w-4 h-4" style={{ color: brandColor }} /> Opening Hours
            </h3>
            <div className="space-y-1">
              {openingHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek).map((h) => (
                <div key={h.dayOfWeek} className={`flex items-center justify-between text-sm ${template.cardTextColor}`}>
                  <span className="font-medium text-xs w-12">{DAY_NAMES[h.dayOfWeek]}</span>
                  {h.isClosed ? (
                    <span className="text-xs opacity-50">Closed</span>
                  ) : (
                    <span className="text-xs opacity-70">{h.openTime} – {h.closeTime}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className={`text-center mt-10 ${template.textColor} opacity-40`}>
          <a href={`/${username}`} className="text-xs hover:opacity-60 transition-opacity">
            Powered by <span className="font-semibold">linkfolio</span>
          </a>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQr} onOpenChange={setShowQr}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">Menu QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={menuUrl} size={200} fgColor={brandColor} level="M" includeMargin={false} />
            </div>
            <p className="text-xs text-muted-foreground text-center">Scan to view the digital menu</p>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              Copy Menu Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
