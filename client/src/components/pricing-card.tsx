import { Check, Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  features: string[];
  maxLinks: number;
  maxPages: number;
  maxTeamMembers: number;
  isActive: boolean;
  isFeatured: boolean;
}

interface PricingCardProps {
  plan: PricingPlan;
  billingCycle: "monthly" | "yearly";
  isCurrentPlan?: boolean;
  onSelect?: (plan: PricingPlan) => void;
  loading?: boolean;
  ctaLabel?: string;
}

export function PricingCard({
  plan,
  billingCycle,
  isCurrentPlan,
  onSelect,
  loading,
  ctaLabel,
}: PricingCardProps) {
  const price = billingCycle === "yearly"
    ? parseFloat(plan.yearlyPrice)
    : parseFloat(plan.monthlyPrice);

  const isFree = price === 0;

  return (
    <Card
      className={cn(
        "relative flex flex-col transition-all duration-200",
        plan.isFeatured
          ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
          : "border hover:border-primary/50 hover:shadow-md",
        isCurrentPlan && "border-primary/50 bg-primary/5"
      )}
    >
      {plan.isFeatured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="px-3 py-0.5 flex items-center gap-1 text-xs shadow">
            <Star className="h-3 w-3" /> Most Popular
          </Badge>
        </div>
      )}

      <CardHeader className="pb-4 pt-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{plan.description}</p>
            )}
          </div>
          {isCurrentPlan && (
            <Badge variant="secondary" className="text-xs">
              Current
            </Badge>
          )}
        </div>

        <div className="mt-4">
          <div className="flex items-end gap-1">
            <span className="text-4xl font-extrabold text-foreground">
              {isFree ? "Free" : `₹${price.toLocaleString("en-IN")}`}
            </span>
            {!isFree && (
              <span className="text-muted-foreground text-sm mb-1">
                /{billingCycle === "yearly" ? "year" : "month"}
              </span>
            )}
          </div>
          {!isFree && billingCycle === "yearly" && (
            <p className="text-xs text-primary mt-1">
              Save {Math.round(100 - (parseFloat(plan.yearlyPrice) / (parseFloat(plan.monthlyPrice) * 12)) * 100)}% vs monthly
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pt-0">
        {/* Limits */}
        <div className="grid grid-cols-3 gap-2 mb-4 text-center">
          {[
            { label: "Links", value: plan.maxLinks >= 999 ? "∞" : plan.maxLinks },
            { label: "Pages", value: plan.maxPages >= 99 ? "∞" : plan.maxPages },
            { label: "Members", value: plan.maxTeamMembers >= 99 ? "∞" : plan.maxTeamMembers },
          ].map((item) => (
            <div key={item.label} className="bg-muted/50 rounded-lg p-2">
              <div className="text-base font-bold text-foreground">{item.value}</div>
              <div className="text-xs text-muted-foreground">{item.label}</div>
            </div>
          ))}
        </div>

        {/* Features */}
        {(plan.features ?? []).length > 0 && (
          <ul className="space-y-2 mb-6 flex-1">
            {plan.features.map((feature, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        )}

        <Button
          className={cn("w-full mt-auto", plan.isFeatured && "shadow-md")}
          variant={plan.isFeatured ? "default" : isCurrentPlan ? "secondary" : "outline"}
          onClick={() => onSelect?.(plan)}
          disabled={loading || isCurrentPlan}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          {isCurrentPlan
            ? "Current Plan"
            : ctaLabel ?? (isFree ? "Get Started Free" : "Upgrade Now")}
        </Button>
      </CardContent>
    </Card>
  );
}
