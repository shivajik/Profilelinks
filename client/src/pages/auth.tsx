import { useState } from "react";
import { useLocation, useSearch, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, ArrowLeft, Loader2, Sparkles, Link2, Palette, Globe, User, Users } from "lucide-react";
import { Link as WouterLink } from "wouter";

const FEATURES = [
  { icon: Link2, text: "Unlimited links in one page" },
  { icon: Palette, text: "Fully customizable themes" },
  { icon: Globe, text: "50+ social platform support" },
  { icon: Sparkles, text: "Free forever, no catch" },
];

export default function AuthPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTab = params.get("tab") === "register" ? "register" : "login";
  const [tab, setTab] = useState<"login" | "register">(initialTab);
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
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center p-12 auth-left-panel">
        <div className="landing-orb landing-orb-1" />
        <div className="landing-orb landing-orb-2" />
        <div className="relative z-10 max-w-md">
          <WouterLink href="/">
            <span className="text-3xl font-bold tracking-tight mb-8 block cursor-pointer" data-testid="text-auth-logo-side">
              <span className="text-primary-foreground/90">link</span>
              <span className="text-primary-foreground">folio</span>
            </span>
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
          <span className="lg:hidden text-lg font-bold tracking-tight" data-testid="text-auth-logo-mobile">
            <span className="text-primary">link</span>
            <span className="text-foreground">folio</span>
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 pb-16">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground mb-1.5" data-testid="text-auth-heading">
                {tab === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {tab === "login"
                  ? "Log in to manage your Linkfolio page."
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
              <LoginForm onSubmit={async (email, password) => {
                try {
                  await login(email, password);
                } catch (e: any) {
                  toast({ title: "Login failed", description: e.message, variant: "destructive" });
                }
              }} />
            ) : (
              <RegisterForm onSubmit={async (username, email, password) => {
                try {
                  await register(username, email, password);
                } catch (e: any) {
                  toast({ title: "Registration failed", description: e.message, variant: "destructive" });
                }
              }} />
            )}

            <div className="mt-6">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-background px-2 text-muted-foreground">Quick Demo</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={demoLoading !== null}
                  onClick={() => handleDemoLogin("personal")}
                  data-testid="button-demo-personal"
                >
                  {demoLoading === "personal" ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                  Individual
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={demoLoading !== null}
                  onClick={() => handleDemoLogin("team")}
                  data-testid="button-demo-team"
                >
                  {demoLoading === "team" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Team
                </Button>
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-8">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
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

function RegisterForm({ onSubmit }: { onSubmit: (username: string, email: string, password: string) => Promise<void> }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(username, email, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="reg-username" className="text-sm font-medium">Username</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">linkfolio.com/</span>
          <Input
            id="reg-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            className="pl-[115px]"
            placeholder="yourname"
            required
            minLength={3}
            maxLength={30}
            data-testid="input-register-username"
          />
        </div>
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
      <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-register">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
