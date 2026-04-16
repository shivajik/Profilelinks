import { apiFetch } from "@/lib/queryClient";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Link as WouterLink } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, XCircle, Lock, Mail, User, KeyRound, Zap, Infinity, Shield, Star, ChevronRight, ArrowRight, Home } from "lucide-react";
import logoPath from "/favicon.png";
import LegalLayout from "@/components/legal-layout";

function LtdUnavailablePage() {
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
          <h1 className="text-3xl font-bold text-foreground mb-2">LTD Registration Unavailable</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Lifetime deal registration is not currently open. Check back later or contact support.
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

const BENEFITS = [
  { icon: Infinity, text: "Lifetime access — pay once, use forever" },
  { icon: Zap, text: "All current and future features included" },
  { icon: Shield, text: "Priority support for LTD members" },
  { icon: Star, text: "Early access to new features" },
];

export default function LtdRegisterPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [pageEnabled, setPageEnabled] = useState<boolean | null>(null);
  const [code, setCode] = useState("");
  const [codeValidated, setCodeValidated] = useState(false);
  const [codeInfo, setCodeInfo] = useState<{ planName?: string | null; usesRemaining?: number } | null>(null);
  const [validating, setValidating] = useState(false);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameDebounce, setUsernameDebounce] = useState<ReturnType<typeof setTimeout> | null>(null);

  const checkUsernameAvailability = (val: string) => {
    if (usernameDebounce) clearTimeout(usernameDebounce);
    if (val.length < 3) { setUsernameAvailable(null); return; }
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/auth/username-available?username=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setUsernameAvailable(data.available);
        }
      } catch { /* ignore */ }
      setCheckingUsername(false);
    }, 500);
    setUsernameDebounce(timer);
  };

  useEffect(() => {
    fetch("/api/ltd/status")
      .then(r => r.json())
      .then(d => setPageEnabled(d.enabled))
      .catch(() => setPageEnabled(false));
  }, []);

  const validateCode = async () => {
    if (!code.trim()) return;
    setValidating(true);
    try {
      const res = await apiFetch("/api/ltd/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setCodeValidated(true);
      setCodeInfo({ planName: data.planName, usesRemaining: data.usesRemaining });
      toast({ title: "Code verified!", description: data.planName ? `Includes ${data.planName} plan.` : "Valid lifetime deal code." });
    } catch (err: any) {
      toast({ title: "Invalid code", description: err.message, variant: "destructive" });
      setCodeValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      const res = await apiFetch("/api/ltd/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim(), email, username, displayName, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Welcome! 🎉", description: "Your lifetime account is ready." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (pageEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pageEnabled) {
    return (
      <LtdUnavailablePage />
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left marketing panel */}
      <div className="md:w-1/2 bg-gradient-to-br from-primary via-purple-600 to-indigo-700 p-10 flex flex-col justify-center text-white">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
          <WouterLink href="/">
            <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain" data-testid="text-logo" />
          </WouterLink>
            <div className="text-white/70 text-sm">Link-in-Bio Platform</div>
          </div>

          <h1 className="text-4xl font-black leading-tight mb-3">
            Lifetime Deal
          </h1>
          <p className="text-white/80 text-lg mb-2">
            One-time payment. Lifetime access. No subscriptions.
          </p>
          <p className="text-white/60 text-sm mb-8">
            Join our community of early supporters and get unlimited access to everything VisiCardly offers — forever.
          </p>

          <div className="space-y-4 mb-10">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <p className="text-white/90 text-sm">{text}</p>
              </div>
            ))}
          </div>

          <div className="border border-white/20 rounded-xl p-5 bg-white/10 backdrop-blur-sm">
            <div className="text-xs text-white/60 font-semibold uppercase tracking-wider mb-1">What's included</div>
            <div className="text-white font-semibold">Full platform access</div>
            <div className="text-white/70 text-sm mt-1">Create unlimited profiles, manage teams, track analytics, custom domains, and more.</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="md:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">Create Account</h2>
            <p className="text-muted-foreground text-sm mt-1">Register with your redemption code for lifetime access</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Redemption code */}
            <div className="space-y-2">
              <Label htmlFor="ltd-code">Redemption Code</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="ltd-code"
                    placeholder="e.g. VISI-LTD-2024"
                    value={code}
                    onChange={e => { setCode(e.target.value.toUpperCase()); setCodeValidated(false); setCodeInfo(null); }}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !codeValidated) {
                        e.preventDefault();
                        validateCode();
                      }
                    }}
                    className="pl-9 uppercase"
                    disabled={codeValidated}
                    data-testid="input-ltd-code"
                  />
                </div>
                {codeValidated ? (
                  <Button type="button" variant="outline" className="text-green-600 border-green-300" disabled>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Verified
                  </Button>
                ) : (
                  <Button type="button" onClick={validateCode} disabled={!code.trim() || validating} data-testid="button-validate-code">
                    {validating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Validate"}
                  </Button>
                )}
              </div>
              {codeInfo?.planName && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Includes <strong>{codeInfo.planName}</strong> plan
                </p>
              )}
            </div>

            {/* Only show rest of form after code is validated */}
            {codeValidated && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ltd-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="ltd-email" type="email" placeholder="you@example.com" value={email}
                      onChange={e => setEmail(e.target.value)} required className="pl-9" data-testid="input-email" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ltd-username">Username</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                      <Input id="ltd-username" placeholder="yourname" value={username}
                        onChange={e => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                          setUsername(val);
                          setUsernameAvailable(null);
                          checkUsernameAvailability(val);
                        }}
                        required className="pl-7 pr-9" data-testid="input-username" />
                      {checkingUsername && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        </div>
                      )}
                      {!checkingUsername && usernameAvailable === false && username.length >= 3 && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <XCircle className="w-4 h-4 text-destructive" />
                        </div>
                      )}
                    </div>
                    {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                      <p className="text-xs text-green-600">Username is available</p>
                    )}
                    {!checkingUsername && usernameAvailable === false && username.length >= 3 && (
                      <p className="text-xs text-destructive">Username is already taken</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ltd-displayname">Display Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="ltd-displayname" placeholder="Your Name" value={displayName}
                        onChange={e => setDisplayName(e.target.value)} className="pl-9" data-testid="input-display-name" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ltd-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="ltd-password" type="password" placeholder="Create a password" value={password}
                      onChange={e => setPassword(e.target.value)} required minLength={6} className="pl-9" data-testid="input-password" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ltd-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="ltd-confirm-password" type="password" placeholder="Confirm your password" value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)} required className="pl-9" data-testid="input-confirm-password" />
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={submitting || usernameAvailable === false} data-testid="button-create-ltd-account">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                  Create Lifetime Account
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By creating an account, you agree to our{" "}
                  <a href="/terms" className="underline hover:text-foreground">Terms of Service</a>{" "}
                  and{" "}
                  <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
                </p>
              </>
            )}

            {!codeValidated && (
              <div className="space-y-3">
                <p className="text-xs text-center text-muted-foreground">
                  Enter and validate your redemption code to proceed with registration.
                </p>
                <div className="border-t pt-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Don't have a redemption code?{" "}
                    <button type="button" onClick={() => navigate("/ltd-purchase")} className="text-primary hover:underline font-medium">
                      Purchase a lifetime plan
                    </button>
                  </p>
                </div>
              </div>
            )}
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button onClick={() => navigate("/auth")} className="text-primary hover:underline font-medium">
                Sign in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
