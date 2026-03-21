import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Briefcase, Package, ArrowLeft, Phone, Mail, Globe, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTemplate } from "@/lib/templates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SocialIcon } from "@/components/social-icon";

type ItemType = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  imageUrl: string | null;
  url: string | null;
};

export default function PublicServicesProducts({ type }: { type: "services" | "products" }) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const label = type === "services" ? "Services" : "Products";
  const Icon = type === "services" ? Briefcase : Package;

  const { data, isLoading, error } = useQuery<{
    team: any;
    items: ItemType[];
    template: any;
    showProfile?: boolean;
    profileInfo?: {
      description?: string;
      phone?: string;
      email?: string;
      website?: string;
      address?: string;
      socials?: Array<{ platform: string; url: string }>;
    };
    affiliateInfo?: { isAffiliate: boolean; referralCode?: string };
  }>({
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Not Found</h1>
          <p className="text-muted-foreground">This page doesn't exist.</p>
        </div>
      </div>
    );
  }

  const { team, items, template: templateData, showProfile, profileInfo } = data;
  const templateId = templateData?.template || "minimal";
  const template = getTemplate(templateId);
  const themeColor = templateData?.themeColor || template.accent;
  const companyLogo = templateData?.companyLogo || team.logoUrl;
  const companyName = templateData?.companyName || team.name;
  const font = templateData?.font;
  const coverPhoto = templateData?.coverPhoto;

  return (
    <div className={`min-h-screen ${template.bg}`} style={font ? { fontFamily: font } : undefined}>
      <div className="max-w-2xl mx-auto px-6 py-8">
        {/* Header Card */}
        <div className={`rounded-2xl overflow-hidden ${template.cardBg} backdrop-blur-md shadow-lg border mb-8`} style={{ borderColor: themeColor + "20" }}>
          {coverPhoto && (
            <div className="h-28 relative overflow-hidden">
              <img src={coverPhoto} alt="Cover" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            </div>
          )}
          <div className="p-5">
            <div className="flex items-center gap-4">
              <a href={`/${slug}`}>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </a>
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {companyLogo ? (
                  <Avatar className="w-12 h-12 border-2 shadow-sm shrink-0" style={{ borderColor: themeColor + "30" }}>
                    <AvatarImage src={companyLogo} alt={companyName} />
                    <AvatarFallback style={{ backgroundColor: themeColor + "20", color: themeColor }}>
                      {companyName?.charAt(0)?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: themeColor + "15" }}>
                    <Icon className="w-6 h-6" style={{ color: themeColor }} />
                  </div>
                )}
                <div className="min-w-0">
                  <h1 className={`text-lg font-bold ${template.textColor} truncate`}>{companyName}</h1>
                  <p className={`text-sm ${template.textColor} opacity-60`}>Our {label}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="h-1 w-full" style={{ backgroundColor: themeColor }} />
        </div>

      {showProfile && (
        <a href={`/${slug}`} className="block mt-6 mb-4">
          <div
            className={`group flex items-center justify-between gap-4 rounded-xl p-4 border shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.01]`}
            style={{
              background: `linear-gradient(135deg, ${themeColor}10, ${themeColor}05)`,
              borderColor: themeColor + "25",
            }}
          >
            {/* Left Content */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ backgroundColor: themeColor + "20" }}
              >
                <Globe className="w-5 h-5" style={{ color: themeColor }} />
              </div>
          
              <div>
                <p className="text-sm font-semibold" style={{ color: themeColor }}>
                  Visit Company Profile
                </p>
                <p className="text-xs opacity-60">
                  Explore full details, contact info & more
                </p>
              </div>
            </div>
          
            {/* Right Arrow */}
            <div
              className="transition-transform duration-300 group-hover:translate-x-1"
              style={{ color: themeColor }}
            >
              →
            </div>
          </div>
        </a>
      )}

        {/* Content */}
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: themeColor + "15" }}>
              <Icon className="w-8 h-8" style={{ color: themeColor }} />
            </div>
            <h2 className={`text-lg font-semibold mb-2 ${template.textColor}`}>No {type} available</h2>
            <p className={`${template.textColor} opacity-60`}>Check back later for updates.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {items.map((item) => {
              const card = (
                <div
                  key={item.id}
                  className={`rounded-xl overflow-hidden ${template.cardBg} backdrop-blur-sm shadow-md border transition-all hover:shadow-lg hover:scale-[1.02]`}
                  style={{ borderColor: themeColor + "15" }}
                >
                  {item.imageUrl && (
                    <div className="aspect-video overflow-hidden">
                      <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className={`font-semibold ${template.cardTextColor}`}>{item.title}</h3>
                      {item.price && (
                        <span className="text-sm font-bold shrink-0 px-2 py-0.5 rounded-full" style={{ color: themeColor, backgroundColor: themeColor + "15" }}>
                          {item.price}
                        </span>
                      )}
                    </div>
                    {item.description && (
                      <p className={`text-sm ${template.cardTextColor} opacity-70 leading-relaxed`}>{item.description}</p>
                    )}
                  </div>
                </div>
              );

              if (item.url) {
                return (
                  <a key={item.id} href={item.url.startsWith("http") ? item.url : `https://${item.url}`} target="_blank" rel="noopener noreferrer" className="block">
                    {card}
                  </a>
                );
              }
              return <div key={item.id}>{card}</div>;
            })}
          </div>
        )}

        {/* Footer */}
        <div className="py-8 text-center space-y-1">
          <p className={`text-xs ${template.textColor} opacity-40`}>
            Powered by <span style={{ color: themeColor }}>VisiCardly</span>
          </p>
          <a
            href={data.affiliateInfo?.isAffiliate && data.affiliateInfo.referralCode
              ? `/auth?ref=${data.affiliateInfo.referralCode}`
              : "/auth"}
            className={`text-xs ${template.textColor} opacity-40 hover:opacity-60 transition-opacity block`}
          >
            Create your own digital business card
          </a>
        </div>
      </div>
    </div>
  );
}
