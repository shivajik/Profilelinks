import { useState, useEffect, useCallback } from "react";
import { useLocation, useSearch, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logoPath from "/logo.png";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, ArrowLeft, Loader2, Sparkles, Link2, Palette, Globe, User, Users, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Link as WouterLink } from "wouter";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const FEATURES = [
  { icon: Link2, text: "Unlimited links in one page" },
  { icon: Palette, text: "Fully customizable themes" },
  { icon: Globe, text: "50+ social platform support" },
  { icon: Sparkles, text: "Free forever, no catch" },
];

function useResendTimer() {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  const startTimer = useCallback(() => {
    setCountdown(60);
  }, []);

  return { countdown, startTimer, canResend: countdown <= 0 };
}

function OtpInputField({
  value,
  onChange,
  testId,
}: {
  value: string;
  onChange: (val: string) => void;
  testId: string;
}) {
  return (
    <div className="flex justify-center" data-testid={testId}>
      <InputOTP maxLength={6} value={value} onChange={onChange}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
    </div>
  );
}

export default function AuthPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTab = params.get("tab") === "register" ? "register" : "login";
  const refCode = params.get("ref");
  const [tab, setTab] = useState<"login" | "register">(refCode ? "register" : initialTab);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [, navigate] = useLocation();
  const { login, register, user } = useAuth();
  const { toast } = useToast();
  const [demoLoading, setDemoLoading] = useState<"personal" | "team" | null>(null);

  const handleDemoLogin = async (type: "personal" | "team") => {
    setDemoLoading(type);
    try {
      await apiRequest("POST", "/api/auth/demo-login", { type });
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    } catch (e: any) {
      toast({ title: "Demo login failed", description: e.message, variant: "destructive" });
    } finally {
      setDemoLoading(null);
    }
  };

  if (user) {
    if ((user as any).mustChangePassword) {
      return <Redirect to="/change-password" />;
    }
    if ((user as any).teamId && (user as any).accountType === "team") {
      return <Redirect to="/dashboard" />;
    }
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 auth-left-panel">
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="relative z-10 max-w-md">
          <WouterLink href="/">
            <img src={logoPath} alt="VisiCardly" className="w-16 h-12 object-contain brightness-0 invert cursor-pointer" data-testid="text-auth-logo-side" />
          </WouterLink>
          <h2 className="text-4xl font-extrabold text-primary-foreground leading-tight mb-4">
            Your online presence,{" "}
            <span className="text-white/80">simplified.</span>
          </h2>
          <p className="text-primary-foreground/70 text-lg mb-10 leading-relaxed">
            Create a beautiful link page that connects your audience to everything you do.
          </p>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3 flex-wrap">
                <div className="w-8 h-8 rounded-md bg-white/15 flex items-center justify-center shrink-0">
                  <f.icon className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-sm text-primary-foreground/85 font-medium">{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-6 flex items-center justify-between gap-4 flex-wrap">
          <WouterLink href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </WouterLink>
            <img src={logoPath} alt="VisiCardly" className="lg:hidden w-16 h-12 object-contain" data-testid="text-auth-logo-mobile" />
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            {showForgotPassword ? (
              <ForgotPasswordFlow
                onBack={() => setShowForgotPassword(false)}
                onSuccess={() => {
                  setShowForgotPassword(false);
                  setTab("login");
                  toast({ title: "Password reset successful", description: "You can now log in with your new password." });
                }}
              />
            ) : (
              <>
                <div className="mb-8">
                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-1.5" data-testid="text-auth-heading">
                    {tab === "login" ? "Welcome back" : "Create your account"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {tab === "login"
                      ? "Log in to manage your VisiCardly page."
                      : "Get started for free. No credit card required."}
                  </p>
                </div>

                <div className="flex mb-6 bg-muted rounded-md p-1 gap-1 flex-wrap">
                  <Button
                    variant={tab === "login" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTab("login")}
                    className={`flex-1 ${tab === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    data-testid="button-tab-login"
                  >
                    Log in
                  </Button>
                  <Button
                    variant={tab === "register" ? "secondary" : "ghost"}
                    size="sm"
                    onClick={() => setTab("register")}
                    className={`flex-1 ${tab === "register" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                    data-testid="button-tab-register"
                  >
                    Sign up
                  </Button>
                </div>

                {tab === "login" ? (
                  <>
                    <LoginForm onSubmit={async (email, password) => {
                      try {
                        await login(email, password);
                      } catch (e: any) {
                        toast({ title: "Login failed", description: e.message, variant: "destructive" });
                      }
                    }} />
                    <div className="mt-3 text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="link-forgot-password"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </>
                ) : (
                  <RegisterForm
                    refCode={refCode}
                    register={register}
                  />
                )}

                <p className="text-xs text-muted-foreground text-center mt-8">
                  By continuing, you agree to our Terms of Service and Privacy Policy.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="login-email" className="text-sm font-medium">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="input-login-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            data-testid="input-login-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            data-testid="button-toggle-password-login"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-login">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Log in
      </Button>
    </form>
  );
}

function RegisterForm({
  refCode,
  register,
}: {
  refCode: string | null;
  register: (username: string, email: string, password: string) => Promise<any>;
}) {
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const [step, setStep] = useState<"form" | "otp">("form");
  const [otp, setOtp] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const { countdown, startTimer, canResend } = useResendTimer();

  const checkUsername = (val: string) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (val.length < 3) { setAvailable(null); return; }
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/username-available?username=${encodeURIComponent(val)}`);
        if (res.ok) {
          const data = await res.json();
          setAvailable(data.available);
        }
      } catch { /* ignore */ }
      setChecking(false);
    }, 500);
    setDebounceTimer(timer);
  };

  const sendOtp = async () => {
    const res = await fetch("/api/auth/send-signup-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to send OTP");
    }
    return data;
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.valid) {
        toast({ title: "Invalid email", description: verifyData.message || "Temporary or disposable emails are not allowed.", variant: "destructive" });
        return;
      }

      await sendOtp();
      startTimer();
      setStep("otp");
      toast({ title: "OTP sent", description: "Check your email for the verification code." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpLoading(true);
    try {
      await sendOtp();
      startTimer();
      toast({ title: "OTP resent", description: "Check your email for the new code." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setOtpLoading(true);
    try {
      const verifyRes = await fetch("/api/auth/verify-signup-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        toast({ title: "Verification failed", description: verifyData.message || "Invalid OTP code.", variant: "destructive" });
        return;
      }

      await register(username, email, password);
      if (refCode) {
        try {
          const meRes = await fetch("/api/auth/me");
          if (meRes.ok) {
            const me = await meRes.json();
            await fetch("/api/affiliate/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ referralCode: refCode, userId: me.id }),
            });
          }
        } catch { /* ignore tracking errors */ }
      }
    } catch (e: any) {
      toast({ title: "Registration failed", description: e.message, variant: "destructive" });
    } finally {
      setOtpLoading(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-lg font-semibold text-foreground" data-testid="text-otp-heading">Verify your email</h2>
          <p className="text-sm text-muted-foreground" data-testid="text-otp-description">
            We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <OtpInputField value={otp} onChange={setOtp} testId="input-signup-otp" />

        <Button
          className="w-full"
          onClick={handleVerifyOtp}
          disabled={otp.length !== 6 || otpLoading}
          data-testid="button-verify-signup-otp"
        >
          {otpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
          Verify & Create Account
        </Button>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setStep("form"); setOtp(""); }}
            data-testid="button-back-to-signup-form"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleResendOtp}
            disabled={!canResend || otpLoading}
            data-testid="button-resend-signup-otp"
          >
            {canResend ? "Resend code" : `Resend in ${countdown}s`}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-username" className="text-sm font-medium">Username</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">visicardly.com/</span>
          <Input
            id="reg-username"
            value={username}
            onChange={(e) => {
              const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
              setUsername(val);
              setAvailable(null);
              checkUsername(val);
            }}
            className="pl-[115px]"
            placeholder="yourname"
            required
            minLength={3}
            maxLength={30}
            data-testid="input-register-username"
          />
          {checking && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
          {!checking && available === true && username.length >= 3 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
          )}
          {!checking && available === false && username.length >= 3 && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <XCircle className="w-4 h-4 text-destructive" />
            </div>
          )}
        </div>
        {!checking && available === true && username.length >= 3 && (
          <p className="text-xs text-green-600">Username is available</p>
        )}
        {!checking && available === false && username.length >= 3 && (
          <p className="text-xs text-destructive">Username is already taken</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-email" className="text-sm font-medium">Email</Label>
        <Input
          id="reg-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          data-testid="input-register-email"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="reg-password" className="text-sm font-medium">Password</Label>
        <div className="relative">
          <Input
            id="reg-password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            data-testid="input-register-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            data-testid="button-toggle-password-register"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Must be at least 6 characters</p>
      </div>
      <Button type="submit" className="w-full" disabled={loading || available === false} data-testid="button-submit-register">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}

function ForgotPasswordFlow({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState<"email" | "otp" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { countdown, startTimer, canResend } = useResendTimer();

  const sendForgotOtp = async () => {
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Failed to send reset code");
    }
    return data;
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendForgotOtp();
      startTimer();
      setStep("otp");
      toast({ title: "Code sent", description: "Check your email for the reset code." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      await sendForgotOtp();
      startTimer();
      toast({ title: "Code resent", description: "Check your email for the new code." });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleOtpContinue = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Invalid code", description: data.message || "The code you entered is incorrect.", variant: "destructive" });
        return;
      }
      setStep("reset");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please make sure both passwords match.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Reset failed", description: data.message || "Failed to reset password.", variant: "destructive" });
        return;
      }
      onSuccess();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (step === "email") onBack();
            else if (step === "otp") setStep("email");
            else setStep("otp");
          }}
          data-testid="button-forgot-password-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </div>

      {step === "email" && (
        <>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-foreground" data-testid="text-forgot-password-heading">Forgot Password</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-forgot-password-description">
              Enter your email address and we'll send you a code to reset your password.
            </p>
          </div>
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="forgot-email" className="text-sm font-medium">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                data-testid="input-forgot-email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-send-reset-code">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Send Reset Code
            </Button>
          </form>
        </>
      )}

      {step === "otp" && (
        <>
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mx-auto">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <h2 className="text-lg font-semibold text-foreground" data-testid="text-forgot-otp-heading">Enter reset code</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-forgot-otp-description">
              We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
            </p>
          </div>

          <OtpInputField value={otp} onChange={setOtp} testId="input-forgot-otp" />

          <Button
            className="w-full"
            onClick={handleOtpContinue}
            disabled={otp.length !== 6 || loading}
            data-testid="button-verify-forgot-otp"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue
          </Button>

          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResendOtp}
              disabled={!canResend || loading}
              data-testid="button-resend-forgot-otp"
            >
              {canResend ? "Resend code" : `Resend in ${countdown}s`}
            </Button>
          </div>
        </>
      )}

      {step === "reset" && (
        <>
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold text-foreground" data-testid="text-reset-password-heading">Set new password</h2>
            <p className="text-sm text-muted-foreground" data-testid="text-reset-password-description">
              Choose a new password for your account.
            </p>
          </div>
          <form onSubmit={handleResetSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-sm font-medium">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-new-password"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  data-testid="input-confirm-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  data-testid="button-toggle-confirm-password"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="button-reset-password">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset Password
            </Button>
          </form>
        </>
      )}
    </div>
  );
}
