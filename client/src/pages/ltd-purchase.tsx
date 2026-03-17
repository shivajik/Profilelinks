import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { Link as WouterLink } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lock, Mail, User, KeyRound, Infinity, Shield, Star, ChevronRight, ArrowLeft, Check, CreditCard, Zap, Crown } from "lucide-react";
import logoPath from "/favicon.png";
import LegalLayout from "@/components/legal-layout";

interface LtdPlan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyPriceUsd: string;
  yearlyPriceUsd: string;
  features: string[];
  maxLinks: number;
  maxPages: number;
  maxTeamMembers: number;
  maxBlocks: number;
  maxSocials: number;
  planType: string;
  isFeatured: boolean;
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

function LtdPurchaseUnavailable() {
  const [, navigate] = useLocation();
  return (
    <LegalLayout>
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 p-8 text-center">
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center">
          <Lock className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">LTD Purchase Unavailable</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Lifetime deal purchase is not currently open. Check back later or contact support.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/")}>Home</Button>
          <Button onClick={() => navigate("/pricing")}>View Pricing</Button>
        </div>
      </div>
    </LegalLayout>
  );
}

type Step = "plans" | "register" | "payment";

export default function LtdPurchasePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const search = useSearch();

  const [pageEnabled, setPageEnabled] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<LtdPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("plans");

  // Registration form
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Payment
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetch("/api/ltd/purchase-status")
      .then(r => r.json())
      .then(d => setPageEnabled(d.enabled))
      .catch(() => setPageEnabled(false));
  }, []);

  useEffect(() => {
    fetch("/api/ltd/plans")
      .then(r => r.json())
      .then(d => { setPlans(d); setLoadingPlans(false); })
      .catch(() => setLoadingPlans(false));
  }, []);

  // Check if planId is in URL
  useEffect(() => {
    const params = new URLSearchParams(search);
    const planId = params.get("planId");
    if (planId) {
      setSelectedPlanId(planId);
      setStep("register");
    }
  }, [search]);

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setStep("register");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters required.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/ltd/purchase-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, displayName, password, planId: selectedPlanId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Account created!", description: "Proceeding to payment..." });
      setStep("payment");
      // Trigger payment immediately
      setTimeout(() => initiatePayment(), 500);
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const initiatePayment = async () => {
    if (!selectedPlanId) return;
    setProcessingPayment(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load payment gateway");

      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selectedPlanId, billingCycle: "yearly", currency: "INR" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.free) {
        toast({ title: "Welcome! 🎉", description: "Your lifetime account is ready." });
        navigate("/dashboard");
        return;
      }

      const options = {
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "VisiCardly",
        description: `Lifetime Deal — ${data.planName}`,
        order_id: data.orderId,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                planId: selectedPlanId,
                billingCycle: "yearly",
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message);
            toast({ title: "Welcome! 🎉", description: "Your lifetime account is active." });
            navigate("/dashboard");
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.message, variant: "destructive" });
          }
        },
        prefill: { email },
        theme: { color: "#6C5CE7" },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
            toast({ title: "Payment cancelled", description: "You can retry anytime.", variant: "destructive" });
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setProcessingPayment(false);
    }
  };

  if (pageEnabled === null || loadingPlans) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pageEnabled) return <LtdPurchaseUnavailable />;

  // Step: Plans selection
  if (step === "plans") {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="text-center mb-10">
            <WouterLink href="/">
              <img src={logoPath} alt="VisiCardly" className="w-14 h-10 mx-auto object-contain mb-4" />
            </WouterLink>
            <h1 className="text-3xl font-bold text-foreground mb-2">Lifetime Deal Plans</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Pay once, use forever. Choose the plan that fits your needs.
            </p>
          </div>

          {plans.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">
              <p>No lifetime plans are currently available.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate("/pricing")}>View Regular Pricing</Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map(plan => (
                <Card key={plan.id} className={`relative overflow-hidden transition-shadow hover:shadow-lg ${plan.isFeatured ? "border-primary ring-2 ring-primary/20" : ""}`}>
                  {plan.isFeatured && (
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                      Popular
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                      {plan.description && <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>}
                      <Badge variant="outline" className="mt-2 text-xs capitalize">{plan.planType}</Badge>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-foreground">₹{parseFloat(plan.yearlyPrice).toLocaleString()}</span>
                        <span className="text-muted-foreground text-sm">one-time</span>
                      </div>
                      {parseFloat(plan.yearlyPriceUsd) > 0 && (
                        <p className="text-xs text-muted-foreground mt-0.5">${parseFloat(plan.yearlyPriceUsd)} USD</p>
                      )}
                    </div>
                    <ul className="space-y-2 mb-6">
                      {(plan.features as string[]).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                          <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" onClick={() => handleSelectPlan(plan.id)}>
                      <CreditCard className="h-4 w-4 mr-2" /> Get This Plan
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <p className="text-sm text-muted-foreground">
              Already have a redemption code?{" "}
              <button onClick={() => navigate("/ltd-register")} className="text-primary hover:underline font-medium">
                Redeem here
              </button>
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              <button onClick={() => navigate("/pricing")} className="text-primary hover:underline font-medium">
                View regular subscription plans →
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Step: Register
  if (step === "register") {
    return (
      <div className="min-h-screen flex flex-col md:flex-row">
        {/* Left panel */}
        <div className="md:w-1/2 bg-gradient-to-br from-primary via-purple-600 to-indigo-700 p-10 flex flex-col justify-center text-white">
          <div className="max-w-md mx-auto">
            <WouterLink href="/">
              <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain mb-4" />
            </WouterLink>
            <h1 className="text-3xl font-black leading-tight mb-3">
              Complete Your Purchase
            </h1>
            {selectedPlan && (
              <div className="border border-white/20 rounded-xl p-5 bg-white/10 backdrop-blur-sm mb-6">
                <div className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Selected Plan</div>
                <div className="text-white text-xl font-bold">{selectedPlan.name}</div>
                <div className="text-white/80 text-lg mt-1">₹{parseFloat(selectedPlan.yearlyPrice).toLocaleString()} <span className="text-sm text-white/60">one-time</span></div>
                {selectedPlan.description && <p className="text-white/70 text-sm mt-2">{selectedPlan.description}</p>}
              </div>
            )}
            <div className="space-y-3">
              {[
                { icon: Infinity, text: "Lifetime access — pay once, use forever" },
                { icon: Zap, text: "All features included" },
                { icon: Shield, text: "Priority support" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="h-7 w-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-white/90 text-sm">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right form panel */}
        <div className="md:w-1/2 flex items-center justify-center p-8 bg-background">
          <div className="w-full max-w-md">
            <Button variant="ghost" size="sm" className="mb-4" onClick={() => setStep("plans")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Back to plans
            </Button>
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
              <p className="text-muted-foreground text-sm mt-1">Register to proceed with your lifetime plan purchase</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="purchase-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="purchase-email" type="email" placeholder="you@example.com" value={email}
                    onChange={e => setEmail(e.target.value)} required className="pl-9" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="purchase-username">Username</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                    <Input id="purchase-username" placeholder="yourname" value={username}
                      onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      required className="pl-7" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purchase-displayname">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="purchase-displayname" placeholder="Your Name" value={displayName}
                      onChange={e => setDisplayName(e.target.value)} className="pl-9" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="purchase-password" type="password" placeholder="Create a password" value={password}
                    onChange={e => setPassword(e.target.value)} required minLength={6} className="pl-9" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-confirm">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="purchase-confirm" type="password" placeholder="Confirm password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)} required className="pl-9" />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Register & Proceed to Payment
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By creating an account, you agree to our{" "}
                <a href="/terms" className="underline hover:text-foreground">Terms</a>{" "}and{" "}
                <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
              </p>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">Sign in</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Step: Payment processing
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div className="text-center space-y-4">
        {processingPayment ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Processing Payment...</h2>
            <p className="text-muted-foreground">Please complete the payment in the popup window.</p>
          </>
        ) : (
          <>
            <CreditCard className="h-10 w-10 text-primary mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Ready to Pay</h2>
            <p className="text-muted-foreground">Click below to open the payment window.</p>
            <Button onClick={initiatePayment}>
              <CreditCard className="h-4 w-4 mr-2" /> Pay Now
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
