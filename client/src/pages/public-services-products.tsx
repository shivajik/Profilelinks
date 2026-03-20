import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, Briefcase, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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

  const { team, items, template } = data;
  const themeColor = template?.themeColor || "hsl(var(--primary))";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4">
            <a href={`/${slug}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </a>
            <div className="flex items-center gap-3">
              {team.logoUrl && (
                <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded-full object-cover" />
              )}
              <div>
                <h1 className="text-xl font-bold text-foreground">{team.name}</h1>
                <p className="text-sm text-muted-foreground">Our {label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {items.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Icon className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-2">No {type} available</h2>
            <p className="text-muted-foreground">Check back later for updates.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Card key={item.id} className="overflow-hidden">
                {item.imageUrl && (
                  <div className="aspect-video overflow-hidden">
                    <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground">{item.title}</h3>
                    {item.price && (
                      <span className="text-sm font-medium shrink-0" style={{ color: themeColor }}>
                        {item.price}
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border py-6 text-center">
        <a href="/auth" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          Powered by <span style={{ color: themeColor }}>VisiCardly</span>
        </a>
      </div>
    </div>
  );
}
