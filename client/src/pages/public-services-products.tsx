import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Briefcase, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getTemplate } from "@/lib/templates";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type ItemType = {
  id: string;
  title: string;
  description: string | null;
  price: string | null;
  imageUrl: string | null;
};

export default function PublicServicesProducts({ type }: { type: "services" | "products" }) {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const label = type === "services" ? "Services" : "Products";
  const Icon = type === "services" ? Briefcase : Package;

  const { data, isLoading, error } = useQuery<{ team: any; items: ItemType[]; template: any }>({
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

  const { team, items, template: templateData } = data;
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
        <div className="rounded-2xl overflow-hidden bg-card/90 backdrop-blur-md shadow-lg border mb-8" style={{ borderColor: themeColor + "20" }}>
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
                  <h1 className="text-lg font-bold text-foreground truncate">{companyName}</h1>
                  <p className="text-sm text-muted-foreground">Our {label}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="h-1 w-full" style={{ backgroundColor: themeColor }} />
        </div>

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
            {items.map((item) => (
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
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="py-8 text-center">
          <a href="/auth" className={`text-xs ${template.textColor} opacity-40 hover:opacity-60 transition-opacity`}>
            Powered by <span style={{ color: themeColor }}>VisiCardly</span>
          </a>
        </div>
      </div>
    </div>
  );
}
