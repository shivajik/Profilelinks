import { useState, useEffect, useCallback } from "react";
import { Link as WouterLink, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { PricingCard } from "@/components/pricing-card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

interface PricingPlan {
  id: string; name: string; description?: string;
  monthlyPrice: string; yearlyPrice: string;
  features: string[]; maxLinks: number; maxPages: number;
  maxTeamMembers: number; isActive: boolean; isFeatured: boolean;
}

declare global {
  interface Window {
    Razorpay: new (opts: Record<string, unknown>) => { open(): void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="razorpay"]')) {
      resolve(true);
      return;
    }
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
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pricing/plans")
      .then((r) => r.json())
      .then((data) => {
        // Guard: only accept an array (DB may not be migrated yet)
        setPlans(Array.isArray(data) ? data : []);
      })
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

  const handleSelectPlan = useCallback(async (plan: PricingPlan) => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (currentPlanId === plan.id) return;

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
        setCurrentPlanId(plan.id);
        setPayingPlanId(null);
        return;
      }

      // Load Razorpay
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
            setCurrentPlanId(plan.id);
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
  }, [user, billingCycle, currentPlanId, navigate, toast]);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <WouterLink href="/">
            <a className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back to home
            </a>
          </WouterLink>
          {user ? (
            <WouterLink href="/dashboard">
              <Button variant="outline" size="sm">Dashboard</Button>
            </WouterLink>
          ) : (
            <WouterLink href="/auth">
              <Button size="sm">Get started</Button>
            </WouterLink>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center px-4">
        <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
          Choose the plan that works for you. Upgrade, downgrade, or cancel anytime.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex items-center gap-1 bg-muted rounded-full p-1 text-sm">
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
            <span className="ml-1.5 text-xs text-primary font-semibold">Save up to 20%</span>
          </button>
        </div>
      </section>

      {/* Plans */}
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
                isCurrentPlan={currentPlanId === plan.id}
                loading={payingPlanId === plan.id}
                onSelect={handleSelectPlan}
              />
            ))}
          </div>
        )}
      </section>

      {/* FAQ */}
      <section className="border-t bg-muted/30 py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {[
              { q: "Can I upgrade or downgrade anytime?", a: "Yes! You can change your plan at any time. Changes take effect immediately." },
              { q: "What payment methods are accepted?", a: "We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay." },
              { q: "Is there a free plan?", a: "Yes, we offer a free plan to get you started. Upgrade when you need more features." },
              { q: "Are prices in INR?", a: "Yes, all prices are in Indian Rupees (₹) and payments are processed securely via Razorpay." },
            ].map((item) => (
              <div key={item.q} className="bg-background border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-1">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
