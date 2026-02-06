import { useState, useEffect } from "react";
import { useLocation, useSearch, Redirect } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
import { Link as WouterLink } from "wouter";

export default function AuthPage() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const initialTab = params.get("tab") === "register" ? "register" : "login";
  const [tab, setTab] = useState<"login" | "register">(initialTab);
  const [, navigate] = useLocation();
  const { login, register, user } = useAuth();
  const { toast } = useToast();

  if (user) {
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-6">
        <WouterLink href="/">
          <Button variant="ghost" size="sm" data-testid="button-back-home">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </WouterLink>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              <span className="text-primary">link</span>folio
            </h1>
            <p className="text-muted-foreground">
              {tab === "login" ? "Welcome back" : "Create your account"}
            </p>
          </div>

          <Card>
            <CardContent className="pt-6">
              <div className="flex mb-6 bg-muted rounded-lg p-1">
                <button
                  onClick={() => setTab("login")}
                  className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${tab === "login" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                  data-testid="button-tab-login"
                >
                  Log in
                </button>
                <button
                  onClick={() => setTab("register")}
                  className={`flex-1 text-sm font-medium py-2 rounded-md transition-all ${tab === "register" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}
                  data-testid="button-tab-register"
                >
                  Sign up
                </button>
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
            </CardContent>
          </Card>
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
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
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
      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
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
            data-testid="button-toggle-password"
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
      <div className="space-y-2">
        <Label htmlFor="reg-username">Username</Label>
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
      <div className="space-y-2">
        <Label htmlFor="reg-email">Email</Label>
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
      <div className="space-y-2">
        <Label htmlFor="reg-password">Password</Label>
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
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>
      <Button type="submit" className="w-full" disabled={loading} data-testid="button-submit-register">
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        Create account
      </Button>
    </form>
  );
}
