import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});
type LoginForm = z.infer<typeof loginSchema>;

const seedSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
type SeedForm = z.infer<typeof seedSchema>;

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [isSetupMode, setIsSetupMode] = useState(false);

  const loginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const seedForm = useForm<SeedForm>({ resolver: zodResolver(seedSchema) });

  useEffect(() => {
    fetch("/api/admin/exists")
      .then((r) => r.json())
      .then((d) => {
        setAdminExists(d.exists);
        setIsSetupMode(!d.exists);
      })
      .catch(() => setAdminExists(true));
  }, []);

  const onLogin = async (data: LoginForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast({ title: "Welcome back!", description: "Logged into admin dashboard." });
      navigate("/admin/dashboard");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const onSetup = async (data: SeedForm) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast({ title: "Admin created!", description: "You can now log in with your credentials." });
      setAdminExists(true);
      setIsSetupMode(false);
    } catch (err: any) {
      toast({ title: "Setup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (adminExists === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Linkfolio</h1>
            <p className="text-xs text-muted-foreground">Super Admin Panel</p>
          </div>
        </div>

        <Card className="border shadow-xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">
              {isSetupMode ? "Create Admin Account" : "Admin Sign In"}
            </CardTitle>
            <CardDescription>
              {isSetupMode
                ? "Set up your super admin credentials to get started."
                : "Sign in to manage your platform."}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {isSetupMode ? (
              <form onSubmit={seedForm.handleSubmit(onSetup)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="setup-name">Full Name</Label>
                  <Input id="setup-name" placeholder="Super Admin" {...seedForm.register("name")} />
                  {seedForm.formState.errors.name && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {seedForm.formState.errors.name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-email">Email Address</Label>
                  <Input id="setup-email" type="email" placeholder="admin@example.com" {...seedForm.register("email")} />
                  {seedForm.formState.errors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {seedForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="setup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="setup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 8 characters"
                      {...seedForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {seedForm.formState.errors.password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {seedForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Create Admin Account
                </Button>
              </form>
            ) : (
              <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="admin@example.com" {...loginForm.register("email")} />
                  {loginForm.formState.errors.email && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {loginForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Your password"
                      {...loginForm.register("password")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {loginForm.formState.errors.password && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {loginForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>
              </form>
            )}

            <p className="text-center text-xs text-muted-foreground mt-6">
              This is a restricted admin area. Unauthorized access is prohibited.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
