import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { PricingCard } from "@/components/pricing-card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, CalendarDays, CheckCircle2 } from "lucide-react";

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

interface Subscription {
  id: string;
  status: string;
  billingCycle: string;
  currentPeriodEnd: string | null;
  planId: string;
  planName: string;
}

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="razorpay"]')) { resolve(true); return; }
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export function BillingSection() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const plansFetch = fetch("/api/pricing/plans").then((r) => r.json()).catch(() => []);
    const subFetch = fetch("/api/payments/subscription").then((r) => r.json()).catch(() => null);
    Promise.all([plansFetch, subFetch]).then(([plansData, subData]) => {
      setPlans(Array.isArray(plansData) ? plansData : []);
      setSubscription(subData ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSelectPlan = useCallback(async (plan: PricingPlan) => {
    if (!user) return;
    if (subscription?.planId === plan.id && subscription?.status === "active") return;

    setPayingPlanId(plan.id);
    try {
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, billingCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.free) {
        toast({ title: "Subscribed!", description: `You're now on the ${plan.name} plan.` });
        fetchData();
        setPayingPlanId(null);
        return;
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Razorpay failed to load. Please refresh and try again.");

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "Linkfolio",
        description: `${plan.name} Plan — ${billingCycle}`,
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
              }),
            });
            const vData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(vData.message);
            toast({ title: "Payment successful! 🎉", description: `You're now on the ${plan.name} plan.` });
            fetchData();
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
  }, [user, billingCycle, subscription, fetchData, toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-primary" /> Billing &amp; Plans
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage your subscription and upgrade to unlock more features.
        </p>
      </div>

      {/* Current subscription banner */}
      {subscription && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">
              You're on the <span className="text-primary">{subscription.planName}</span> plan
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {subscription.billingCycle} billing &bull; Status:{" "}
              <span className={subscription.status === "active" ? "text-green-600" : "text-amber-600"}>
                {subscription.status}
              </span>
            </p>
          </div>
          {subscription.currentPeriodEnd && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <CalendarDays className="h-3.5 w-3.5" />
              Renews {new Date(subscription.currentPeriodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
            </div>
          )}
        </div>
      )}

      {/* Billing toggle */}
      <div className="flex items-center gap-1 bg-muted rounded-full p-1 text-sm w-fit">
        <button
          className={`px-4 py-1.5 rounded-full font-medium transition-all ${billingCycle === "monthly" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setBillingCycle("monthly")}
        >
          Monthly
        </button>
        <button
          className={`px-4 py-1.5 rounded-full font-medium transition-all ${billingCycle === "yearly" ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
          onClick={() => setBillingCycle("yearly")}
        >
          Yearly
          <span className="ml-1.5 text-xs text-primary font-semibold">Save 20%</span>
        </button>
      </div>

      {/* Plans grid */}
      {plans.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border rounded-xl">
          <p className="font-medium">No plans available yet.</p>
          <p className="text-sm mt-1">Contact support for enterprise pricing.</p>
        </div>
      ) : (
        <div className={`grid gap-5 ${plans.length === 1 ? "max-w-sm" : plans.length === 2 ? "grid-cols-1 sm:grid-cols-2 max-w-2xl" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"}`}>
          {plans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billingCycle={billingCycle}
              isCurrentPlan={subscription?.planId === plan.id && subscription?.status === "active"}
              loading={payingPlanId === plan.id}
              onSelect={handleSelectPlan}
            />
          ))}
        </div>
      )}

      {/* FAQ strip */}
      <div className="border-t pt-6 grid sm:grid-cols-2 gap-4">
        {[
          { q: "Can I upgrade or downgrade anytime?", a: "Yes — changes take effect immediately." },
          { q: "What payment methods are accepted?", a: "Cards, UPI, net banking, and wallets via Razorpay." },
          { q: "Are prices in INR?", a: "Yes, all prices are in Indian Rupees (₹)." },
          { q: "How do I cancel?", a: "Contact support and we'll process your cancellation promptly." },
        ].map((item) => (
          <div key={item.q} className="rounded-lg border bg-muted/30 p-3">
            <p className="text-sm font-semibold text-foreground">{item.q}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{item.a}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
