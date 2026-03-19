import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Link as WouterLink } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  Lock,
  Mail,
  User,
  KeyRound,
  Infinity,
  Shield,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Check,
  CreditCard,
  Zap,
  CheckCircle2,
  XCircle,
  Home,
  Tag,
  X,
} from "lucide-react";
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

type Step = "plans" | "register" | "payment";
type BillingCycle = "monthly" | "yearly";

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
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function formatInr(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

function LtdPurchaseUnavailable() {
  const [, navigate] = useLocation();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate("/pricing");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [navigate]);

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
        <p className="text-sm text-muted-foreground">
          Redirecting to pricing in <span className="font-bold text-primary">{countdown}</span> seconds...
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="h-4 w-4 mr-2" /> Home
          </Button>
          <Button onClick={() => navigate("/pricing")}>
            <ArrowRight className="h-4 w-4 mr-2" /> View Pricing
          </Button>
        </div>
      </div>
    </LegalLayout>
  );
}

export default function LtdPurchasePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const search = useSearch();

  const [pageEnabled, setPageEnabled] = useState<boolean | null>(null);
  const [plans, setPlans] = useState<LtdPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("plans");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameDebounce, setUsernameDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discountPercent: number } | null>(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    fetch("/api/ltd/purchase-status")
      .then((r) => r.json())
      .then((d) => setPageEnabled(d.enabled))
      .catch(() => setPageEnabled(false));
  }, []);

  useEffect(() => {
    fetch("/api/ltd/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(Array.isArray(d) ? d : []);
        setLoadingPlans(false);
      })
      .catch(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(search);
    const planId = params.get("planId");
    if (planId) {
      setSelectedPlanId(planId);
      setStep("register");
    }
  }, [search]);

  const selectedPlan = useMemo(() => plans.find((plan) => plan.id === selectedPlanId) ?? null, [plans, selectedPlanId]);

  const getBasePrice = (plan: LtdPlan) => {
    const raw = billingCycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    return parseFloat(raw || "0");
  };

  const getDiscountedPrice = (plan: LtdPlan) => {
    const base = getBasePrice(plan);
    if (!appliedPromo) return base;
    return Math.max(0, Math.round(base * (1 - appliedPromo.discountPercent / 100)));
  };

  const getMonthlyEquivalent = (plan: LtdPlan) => Math.round(getDiscountedPrice(plan) / 12);

  const checkUsernameAvailability = (val: string) => {
    if (usernameDebounce) clearTimeout(usernameDebounce);
    if (val.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username-available?username=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setUsernameAvailable(data.available);
        }
      } catch {
        // ignore
      }
      setCheckingUsername(false);
    }, 500);
    setUsernameDebounce(timer);
  };

  const validatePromo = async () => {
    if (!promoInput.trim()) return;
    if (!selectedPlanId) {
      toast({ title: "Select a plan first", description: "Choose your LTD plan before applying a coupon.", variant: "destructive" });
      return;
    }

    setPromoValidating(true);
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim(), planId: selectedPlanId, isLtd: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setAppliedPromo({ code: data.code, discountPercent: data.discountPercent });
      toast({ title: "Coupon applied!", description: `${data.discountPercent}% discount will be applied.` });
    } catch (err: any) {
      setAppliedPromo(null);
      toast({ title: "Invalid coupon", description: err.message, variant: "destructive" });
    } finally {
      setPromoValidating(false);
    }
  };

  const removePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
  };

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    setAppliedPromo(null);
    setPromoInput("");
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
        body: JSON.stringify({
          planId: selectedPlanId,
          billingCycle,
          currency: "INR",
          promoCode: appliedPromo?.code || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      if (data.free) {
        toast({ title: "Welcome! 🎉", description: "Your LTD account is ready." });
        navigate("/dashboard");
        return;
      }

      const rzp = new window.Razorpay({
        key: data.keyId,
        amount: data.amount,
        currency: data.currency,
        name: "VisiCardly",
        description: `${data.planName} — ${billingCycle === "yearly" ? "Annual" : "Monthly"}${appliedPromo ? ` (${appliedPromo.discountPercent}% off)` : ""}`,
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
                billingCycle,
                promoCode: appliedPromo?.code || undefined,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.message);
            toast({ title: "Welcome! 🎉", description: "Your account is active." });
            navigate("/dashboard");
          } catch (err: any) {
            toast({ title: "Verification failed", description: err.message, variant: "destructive" });
          }
        },
        prefill: { email },
        theme: { color: "#1f7a5c" },
        modal: {
          ondismiss: () => {
            setProcessingPayment(false);
            toast({ title: "Payment cancelled", description: "You can retry anytime.", variant: "destructive" });
          },
        },
      });

      rzp.open();
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
      setProcessingPayment(false);
    }
  };

  if (pageEnabled === null || loadingPlans) {
    return (
      <LegalLayout>
        <div className="min-h-[70vh] flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </LegalLayout>
    );
  }

  if (!pageEnabled) return <LtdPurchaseUnavailable />;

  if (step === "plans") {
    return (
      <LegalLayout>
        <section className="px-4 py-14">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="text-center space-y-4">
              <WouterLink href="/">
                <img src={logoPath} alt="VisiCardly" className="w-14 h-10 mx-auto object-contain" />
              </WouterLink>
              <Badge variant="outline" className="mx-auto">Annual selected by default</Badge>
              <div className="space-y-2">
                <h1 className="text-4xl font-black text-foreground">LTD purchase plans</h1>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Pick your plan, keep annual billing selected by default, and apply a coupon before checkout.
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="inline-flex items-center gap-1 rounded-full bg-muted p-1 text-sm">
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
                  Annual
                  <span className="ml-1.5 text-xs font-semibold text-primary">Discounted</span>
                </button>
              </div>
              <p className="text-sm text-muted-foreground">
                {billingCycle === "yearly" ? "Per month, billed annually." : "Billed every month."}
              </p>
            </div>

            {plans.length === 0 ? (
              <div className="text-center text-muted-foreground py-16">
                <p>No lifetime plans are currently available.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/pricing")}>View Regular Pricing</Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => {
                  const basePrice = getBasePrice(plan);
                  const discountedPrice = getDiscountedPrice(plan);
                  const monthlyEquivalent = getMonthlyEquivalent(plan);
                  const savings = billingCycle === "yearly" && parseFloat(plan.monthlyPrice) > 0
                    ? Math.max(0, Math.round(100 - (parseFloat(plan.yearlyPrice) / (parseFloat(plan.monthlyPrice) * 12)) * 100))
                    : 0;

                  return (
                    <Card key={plan.id} className={`relative overflow-hidden transition-shadow hover:shadow-lg ${plan.isFeatured ? "border-primary ring-2 ring-primary/20" : ""}`}>
                      {plan.isFeatured && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                          Popular
                        </div>
                      )}
                      <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                          <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                          {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                          <Badge variant="outline" className="text-xs capitalize">{plan.planType}</Badge>
                        </div>

                        <div className="space-y-1">
                          {billingCycle === "yearly" ? (
                            <>
                              <div className="flex items-end gap-1">
                                <span className="text-4xl font-black text-foreground">{formatInr(monthlyEquivalent)}</span>
                                <span className="text-sm text-muted-foreground mb-1">/month</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Billed annually at {formatInr(discountedPrice)}</p>
                              {appliedPromo && basePrice > discountedPrice && (
                                <p className="text-xs text-muted-foreground line-through">{formatInr(basePrice)} annual</p>
                              )}
                              {savings > 0 && !appliedPromo && <p className="text-xs text-primary">Save {savings}% vs monthly</p>}
                            </>
                          ) : (
                            <>
                              <div className="flex items-end gap-1">
                                <span className="text-4xl font-black text-foreground">{formatInr(discountedPrice)}</span>
                                <span className="text-sm text-muted-foreground mb-1">/month</span>
                              </div>
                              <p className="text-sm text-muted-foreground">Billed monthly</p>
                              {appliedPromo && basePrice > discountedPrice && (
                                <p className="text-xs text-muted-foreground line-through">{formatInr(basePrice)} /month</p>
                              )}
                            </>
                          )}
                        </div>

                        <ul className="space-y-2 min-h-36">
                          {(plan.features as string[]).map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        <Button className="w-full" onClick={() => handleSelectPlan(plan.id)}>
                          <CreditCard className="h-4 w-4 mr-2" /> Continue with this plan
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Already have a redemption code?{" "}
                <button onClick={() => navigate("/ltd-register")} className="text-primary hover:underline font-medium">
                  Redeem here
                </button>
              </p>
              <p className="text-sm text-muted-foreground">
                <button onClick={() => navigate("/pricing")} className="text-primary hover:underline font-medium">
                  View regular subscription plans →
                </button>
              </p>
            </div>
          </div>
        </section>
      </LegalLayout>
    );
  }

  if (step === "register") {
    return (
      <LegalLayout>
        <section className="px-4 py-10">
          <div className="max-w-6xl mx-auto grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-3xl border border-border bg-primary text-primary-foreground p-8 md:p-10">
              <div className="max-w-xl space-y-6">
                <WouterLink href="/">
                  <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain" />
                </WouterLink>
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-primary-foreground/70 mb-3">LTD checkout</p>
                  <h1 className="text-3xl font-black leading-tight">Create your account and finish checkout</h1>
                </div>

                {selectedPlan && (
                  <div className="rounded-2xl border border-primary-foreground/20 bg-primary-foreground/10 p-5 space-y-4">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wider text-primary-foreground/70">Selected Plan</div>
                      <div className="text-2xl font-bold">{selectedPlan.name}</div>
                    </div>
                    <div>
                      {billingCycle === "yearly" ? (
                        <>
                          <div className="text-3xl font-black">{formatInr(getMonthlyEquivalent(selectedPlan))}<span className="text-base font-medium text-primary-foreground/70"> /month</span></div>
                          <p className="text-sm text-primary-foreground/80">Billed annually at {formatInr(getDiscountedPrice(selectedPlan))}</p>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-black">{formatInr(getDiscountedPrice(selectedPlan))}<span className="text-base font-medium text-primary-foreground/70"> /month</span></div>
                          <p className="text-sm text-primary-foreground/80">Billed monthly</p>
                        </>
                      )}
                      {selectedPlan.description && <p className="text-sm text-primary-foreground/70 mt-2">{selectedPlan.description}</p>}
                    </div>

                    <div className="space-y-2 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Tag className="h-4 w-4" /> Coupon code
                      </div>
                      {appliedPromo ? (
                        <div className="flex items-center justify-between rounded-md bg-primary-foreground/10 px-3 py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4" />
                            <span className="font-semibold">{appliedPromo.code}</span>
                            <span className="text-primary-foreground/70">— {appliedPromo.discountPercent}% off</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={removePromo} className="h-7 w-7 p-0 text-primary-foreground hover:bg-primary-foreground/10">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter coupon code"
                            value={promoInput}
                            onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === "Enter" && validatePromo()}
                            className="uppercase border-primary-foreground/20 bg-primary-foreground/5 text-primary-foreground placeholder:text-primary-foreground/50"
                          />
                          <Button variant="secondary" onClick={validatePromo} disabled={promoValidating || !promoInput.trim()}>
                            {promoValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {[
                    { icon: Infinity, text: "Keep annual billing selected for the discounted rate" },
                    { icon: Zap, text: "Apply LTD-only coupons without affecting regular plans" },
                    { icon: Shield, text: "Complete payment securely via Razorpay" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-start gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary-foreground/15 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="text-sm text-primary-foreground/85">{text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 md:p-8">
              <Button variant="ghost" size="sm" className="mb-4" onClick={() => setStep("plans")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to plans
              </Button>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
                <p className="text-muted-foreground text-sm mt-1">Register to proceed with your LTD plan purchase</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="purchase-email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="pl-9" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="purchase-username">Username</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input
                        id="purchase-username"
                        placeholder="yourname"
                        value={username}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                          setUsername(val);
                          setUsernameAvailable(null);
                          checkUsernameAvailability(val);
                        }}
                        required
                        className="pl-7"
                      />
                      {checkingUsername && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                      {!checkingUsername && usernameAvailable === true && username.length >= 3 && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />}
                      {!checkingUsername && usernameAvailable === false && username.length >= 3 && <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-destructive" />}
                    </div>
                    {!checkingUsername && usernameAvailable === true && username.length >= 3 && <p className="text-xs text-primary">Username is available</p>}
                    {!checkingUsername && usernameAvailable === false && username.length >= 3 && <p className="text-xs text-destructive">Username is already taken</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="purchase-displayname">Display Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="purchase-displayname" placeholder="Your Name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-9" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-password">Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="purchase-password" type="password" placeholder="Create a password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="pl-9" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchase-confirm">Confirm Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="purchase-confirm" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="pl-9" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || usernameAvailable === false}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Register & proceed to payment
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree to our <a href="/terms" className="underline hover:text-foreground">Terms</a> and <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
                </p>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Already have an account? <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">Sign in</button>
                </p>
              </div>
            </div>
          </div>
        </section>
      </LegalLayout>
    );
  }

  return (
    <LegalLayout>
      <section className="px-4 py-16">
        <div className="max-w-xl mx-auto">
          <Card>
            <CardContent className="p-8 text-center space-y-5">
              {processingPayment ? (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Processing payment…</h1>
                    <p className="text-muted-foreground">Please complete the payment in the Razorpay popup window.</p>
                  </div>
                </>
              ) : (
                <>
                  <CreditCard className="h-10 w-10 text-primary mx-auto" />
                  <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-foreground">Ready to pay</h1>
                    <p className="text-muted-foreground">
                      {selectedPlan ? `${selectedPlan.name} • ${billingCycle === "yearly" ? "Billed annually" : "Billed monthly"}` : "Open the payment window to continue."}
                    </p>
                    {selectedPlan && (
                      <p className="text-sm font-medium text-foreground">
                        Pay {formatInr(getDiscountedPrice(selectedPlan))}
                        {appliedPromo ? ` after ${appliedPromo.discountPercent}% coupon` : ""}
                      </p>
                    )}
                  </div>

                  <div className="mx-auto max-w-md space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-left">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Tag className="h-4 w-4 text-primary" /> Coupon code
                    </div>
                    {appliedPromo ? (
                      <div className="flex items-center justify-between rounded-md bg-primary/10 px-3 py-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-primary">{appliedPromo.code}</span>
                          <span className="text-muted-foreground">— {appliedPromo.discountPercent}% off</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={removePromo} className="h-7 w-7 p-0">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter coupon code"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === "Enter" && validatePromo()}
                          className="uppercase"
                        />
                        <Button onClick={validatePromo} disabled={promoValidating || !promoInput.trim()}>
                          {promoValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button variant="outline" onClick={() => setStep("register")}>
                      <ArrowLeft className="h-4 w-4 mr-2" /> Back
                    </Button>
                    <Button onClick={initiatePayment}>
                      <CreditCard className="h-4 w-4 mr-2" /> Pay now
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </LegalLayout>
  );
}
