import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { getTemplate, TEMPLATES } from "@/lib/templates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Loader2, Share2, QrCode, Copy, Check, ChevronDown, ChevronRight, Package } from "lucide-react";

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

interface MenuUser {
  id: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  profileImage: string | null;
  template: string | null;
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
  teamBranding: TeamBranding | null;
}

export default function PublicMenu() {
  const { username } = useParams<{ username: string }>();
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const { data, isLoading, error } = useQuery<PublicMenuData>({
    queryKey: ["/api/menu", username],
    queryFn: async () => {
      const res = await fetch(`/api/menu/${username}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

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

  const { user, sections, products, teamBranding } = data;
  const template = getTemplate(user.template);
  const displayName = user.displayName || user.username;
  const brandColor = teamBranding?.themeColor || template.accent;
  const menuUrl = typeof window !== "undefined" ? `${window.location.origin}/${username}/menu` : `/${username}/menu`;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: prev[id] === false ? true : prev[id] === undefined ? false : !prev[id] }));
  };

  const isSectionExpanded = (id: string) => expandedSections[id] !== false; // default open

  const handleCopy = () => {
    navigator.clipboard.writeText(menuUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`min-h-screen ${template.bg}`}>
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header / Branding */}
        <div className="text-center mb-8">
          {/* Share + QR buttons */}
          <div className="flex justify-end gap-2 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              className={template.textColor}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowQr(true)}
              className={template.textColor}
            >
              <QrCode className="w-4 h-4" />
            </Button>
          </div>

          {/* Restaurant branding */}
          {teamBranding?.companyLogo ? (
            <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-2 border-white/20 shadow-lg">
              <img src={teamBranding.companyLogo} alt={teamBranding.companyName || ""} className="w-full h-full object-cover" />
            </div>
          ) : (
            <Avatar className="w-20 h-20 mx-auto mb-3 border-2 border-white/20 shadow-lg">
              <AvatarImage src={user.profileImage || undefined} alt={displayName} />
              <AvatarFallback
                className="text-2xl"
                style={{ backgroundColor: brandColor + "30", color: brandColor }}
              >
                {displayName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}

          <h1 className={`text-2xl font-bold ${template.textColor}`}>
            {teamBranding?.companyName || displayName}
          </h1>
          {user.bio && (
            <p className={`text-sm mt-1 ${template.textColor} opacity-70`}>{user.bio}</p>
          )}

          {/* Color theme indicator line */}
          <div
            className="w-16 h-1 rounded-full mx-auto mt-4"
            style={{ backgroundColor: brandColor }}
          />
        </div>

        {/* Menu Sections */}
        {sections.length === 0 ? (
          <div className={`text-center py-12 ${template.textColor} opacity-60`}>
            <p className="text-lg">No menu items yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections
              .sort((a, b) => a.position - b.position)
              .map((section) => {
                const sectionProducts = products
                  .filter(p => p.sectionId === section.id)
                  .sort((a, b) => a.position - b.position);
                const expanded = isSectionExpanded(section.id);

                return (
                  <div
                    key={section.id}
                    className={`rounded-xl overflow-hidden ${template.cardBg} backdrop-blur-sm`}
                  >
                    {/* Section header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center justify-between px-5 py-4 ${template.cardTextColor}`}
                    >
                      <div className="text-left">
                        <h2 className="text-base font-semibold">{section.name}</h2>
                        {section.description && (
                          <p className="text-xs opacity-60 mt-0.5">{section.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs opacity-50">{sectionProducts.length} items</span>
                        {expanded ? (
                          <ChevronDown className="w-4 h-4 opacity-50" />
                        ) : (
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        )}
                      </div>
                    </button>

                    {/* Products */}
                    {expanded && sectionProducts.length > 0 && (
                      <div className="px-5 pb-4 space-y-3">
                        {sectionProducts.map((product) => (
                          <div
                            key={product.id}
                            className="flex items-start gap-3"
                          >
                            {product.imageUrl ? (
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-16 h-16 rounded-lg object-cover shrink-0 shadow-sm"
                              />
                            ) : (
                              <div
                                className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0"
                                style={{ backgroundColor: brandColor + "15" }}
                              >
                                <Package className="w-6 h-6" style={{ color: brandColor + "60" }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h3 className={`text-sm font-medium ${template.cardTextColor}`}>
                                  {product.name}
                                </h3>
                                {product.price && (
                                  <span
                                    className="text-sm font-bold shrink-0"
                                    style={{ color: brandColor }}
                                  >
                                    {product.price}
                                  </span>
                                )}
                              </div>
                              {product.description && (
                                <p className={`text-xs mt-0.5 ${template.cardTextColor} opacity-60 line-clamp-2`}>
                                  {product.description}
                                </p>
                              )}
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
              <QRCodeSVG
                value={menuUrl}
                size={200}
                fgColor={brandColor}
                level="M"
                includeMargin={false}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Scan to view the digital menu
            </p>
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