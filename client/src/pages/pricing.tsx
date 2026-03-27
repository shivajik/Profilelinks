import { useState, useEffect, useCallback } from "react";
import { Link as WouterLink, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PricingCard } from "@/components/pricing-card";
import { Loader2, Tag, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import LegalLayout from "@/components/legal-layout";

interface PricingPlan {
  id: string; name: string; description?: string;
  monthlyPrice: string; yearlyPrice: string;
  monthlyPriceUsd?: string; yearlyPriceUsd?: string;
  features: string[]; maxLinks: number; maxPages: number;
  maxTeamMembers: number; isActive: boolean; isFeatured: boolean;
  planType?: string;
}

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="razorpay"]')) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PricingPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("yearly");
  const [currency, setCurrency] = useState<"INR" | "USD">("INR");
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number; discountType?: string; discountMonthlyAmount?: number; discountYearlyAmount?: number; planId?: string | null; billingCycleScope?: string } | null>(null);

  useEffect(() => {
    fetch("/api/pricing/plans")
      .then((r) => r.json())
      .then((data) => { setPlans(Array.isArray(data) ? data : []); })
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    fetch("/api/payments/subscription")
      .then((r) => r.json())
      .then((sub) => { if (sub?.planId) setCurrentPlanId(sub.planId); })
      .catch(() => {});
  }, [user]);

  const validatePromo = async () => {
    if (!promoInput.trim()) return;
    setPromoValidating(true);
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAppliedPromo({
        code: data.code,
        discountPercent: data.discountPercent,
        discountType: data.discountType || "percentage",
        discountMonthlyAmount: data.discountMonthlyAmount || 0,
        discountYearlyAmount: data.discountYearlyAmount || 0,
        planId: data.planId || null,
        billingCycleScope: data.billingCycleScope || "both",
      });
      const desc = data.discountType === "money"
        ? `₹${billingCycle === "yearly" ? data.discountYearlyAmount : data.discountMonthlyAmount} off will be applied.`
        : `${data.discountPercent}% discount will be applied.`;
      toast({ title: "Promo code applied! 🎉", description: desc });
    } catch (err: any) {
      toast({ title: "Invalid promo code", description: err.message, variant: "destructive" });
      setAppliedPromo(null);
    } finally {
      setPromoValidating(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
  };

  const handleSelectPlan = useCallback(async (plan: PricingPlan) => {
    if (!user) {
      navigate(`/auth?tab=register&planId=${plan.id}&planName=${encodeURIComponent(plan.name)}`);
      return;
    }

    setPayingPlanId(plan.id);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          billingCycle,
          promoCode: appliedPromo?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.free) {
        toast({ title: "Subscribed!", description: `You're now on the ${plan.name} plan.` });
        setCurrentPlanId(plan.id);
        setPayingPlanId(null);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay failed to load. Please refresh and try again.");

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "VisiCardly",
        description: `${plan.name} Plan — ${billingCycle}${appliedPromo ? ` (${appliedPromo.discountPercent}% off)` : ""}`,
        order_id: data.orderId,
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planId: plan.id,
                billingCycle,
                promoCode: appliedPromo?.code || undefined,
              }),
            });
            const vData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vData.message);
            toast({ title: "Payment successful! 🎉", description: `You're now on the ${plan.name} plan.` });
            setCurrentPlanId(plan.id);
            setAppliedPromo(null);
            setPromoInput("");
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.message, variant: "destructive" });
          } finally {
            setPayingPlanId(null);
          }
        },
        prefill: { email: user.email },
        theme: { color: "hsl(var(--primary))" },
        modal: { ondismiss: () => setPayingPlanId(null) },
      });
      rzp.open();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setPayingPlanId(null);
    }
  }, [user, billingCycle, currentPlanId, navigate, toast, appliedPromo]);

  return (
    <LegalLayout>
      <section className="py-12 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-3">
          Simple, Transparent Pricing
        </h1>
        <p className="text-md text-muted-foreground max-w-xl mx-auto mb-6">
          Choose the plan that works for you. Upgrade, downgrade, or cancel anytime.
        </p>

      {/* COMPACT CONTROL BAR */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-3 flex-wrap">

        {/* Billing Toggle */}
        <div className="inline-flex items-center bg-muted rounded-full p-1 text-sm">
            <button
              className={`px-3 py-1.5 rounded-full font-medium transition ${
                billingCycle === "monthly"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setBillingCycle("monthly")}
            >
              Monthly
            </button>
            <button
              className={`px-3 py-1.5 rounded-full font-medium transition ${billingCycle === "yearly" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setBillingCycle("yearly")}
            >
              Yearly
              <span className="ml-1 text-xs text-primary font-semibold">Save up to 20%</span>
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="inline-flex items-center bg-muted rounded-full p-1 text-sm">
            <button
              className={`px-3 py-1.5 rounded-full font-medium ${
                currency === "INR"
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setCurrency("INR")}
            >
              ₹ INR
            </button>
            <button
              className={`px-3 py-1.5 rounded-full font-medium ${currency === "USD" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}
              onClick={() => setCurrency("USD")}
            >
              $ USD
            </button>
          </div>
            
        {/* PROMO INLINE */}
        <div className="flex items-center gap-2 bg-muted/50 border rounded-full px-3 py-1.5">
          <Tag className="h-4 w-4 text-primary" />
          
          {appliedPromo ? (
            <>
              <span className="text-sm font-medium text-primary">
                {appliedPromo.code} ({appliedPromo.discountType === "money"
                  ? `₹${billingCycle === "yearly" ? appliedPromo.discountYearlyAmount : appliedPromo.discountMonthlyAmount} off`
                  : `-${appliedPromo.discountPercent}%`})
              </span>
              <button onClick={removePromo}>
                <X className="h-4 w-4 text-muted-foreground hover:text-red-500" />
              </button>
            </>
          ) : (
            <>
              <Input
                placeholder="Promo"
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && validatePromo()}
                className="h-7 w-36 border-0 bg-transparent focus-visible:ring-0 text-sm uppercase"
              />
              <Button
                size="sm"
                className="h-7 px-3"
                onClick={validatePromo}
                disabled={promoValidating || !promoInput.trim()}
              >
                {promoValidating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  "Apply"
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
      <section className="max-w-5xl mx-auto px-4 pb-20">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : plans.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No pricing plans available yet.</p>
            <p className="text-sm mt-1">Check back soon or contact us for enterprise pricing.</p>
          </div>
        ) : (
          <div className={`grid gap-6 ${plans.length === 1 ? "max-w-sm mx-auto" : plans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                billingCycle={billingCycle}
                currency={currency}
                isCurrentPlan={currentPlanId === plan.id}
                loading={payingPlanId === plan.id}
                onSelect={handleSelectPlan}
                discountPercent={appliedPromo && appliedPromo.discountType !== "money" && (!appliedPromo.planId || appliedPromo.planId === plan.id) && (!appliedPromo.billingCycleScope || appliedPromo.billingCycleScope === "both" || appliedPromo.billingCycleScope === billingCycle) ? appliedPromo.discountPercent : undefined}
                discountAmount={appliedPromo && appliedPromo.discountType === "money" && (!appliedPromo.planId || appliedPromo.planId === plan.id) && (!appliedPromo.billingCycleScope || appliedPromo.billingCycleScope === "both" || appliedPromo.billingCycleScope === billingCycle)
                  ? (billingCycle === "yearly" ? appliedPromo.discountYearlyAmount : appliedPromo.discountMonthlyAmount)
                  : undefined}
              />
            ))}
          </div>
        )}
      </section>

      <section className="border-t bg-muted/30 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I upgrade or downgrade anytime?", a: "Yes! You can change your plan at any time. Changes take effect immediately." },
              { q: "What payment methods are accepted?", a: "We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay." },
              { q: "Is there a free plan?", a: "Yes, we offer a free plan to get you started. Upgrade when you need more features." },
              { q: "What currencies are supported?", a: "Prices can be displayed in INR (₹) or USD ($) — use the currency toggle to switch. Payments are processed in INR via Razorpay." },
              { q: "How do promo codes work?", a: "Enter a valid promo code before selecting a plan to get a percentage discount on your purchase." },
            ].map((item) => (
              <div key={item.q} className="bg-background border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-1">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </LegalLayout>
  );
}
