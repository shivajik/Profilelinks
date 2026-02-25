import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Users, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function InviteAccept() {
  const [, params] = useRoute("/invite/:token");
  const [, setLocation] = useLocation();
  const token = params?.token || "";
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const { data: invite, isLoading, error } = useQuery<{ email: string; role: string; teamName: string }>({
    queryKey: ["/api/invites", token],
    queryFn: async () => {
      const res = await fetch(`/api/invites/${token}`);
      if (!res.ok) throw new Error("Invalid or expired invite");
      return res.json();
    },
    enabled: !!token,
    retry: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (username.length < 3) {
      toast({ title: "Username must be at least 3 characters", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", `/api/invites/${token}/accept`, { username, password });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.message || "Failed to create account", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      setSuccess(true);
      setTimeout(() => setLocation("/dashboard"), 2000);
    } catch (err: any) {
      toast({ title: err.message || "Something went wrong", variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>This invite link is invalid or has expired.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => setLocation("/auth")} data-testid="button-go-login">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Welcome to {invite.teamName}!</CardTitle>
            <CardDescription>Your account has been created. Redirecting to your dashboard...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <Users className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle>Join {invite.teamName}</CardTitle>
          <CardDescription>
            You've been invited to join as a {invite.role}. Create your account to get started.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={invite.email} disabled data-testid="input-invite-email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                maxLength={30}
                data-testid="input-invite-username"
              />
              <p className="text-xs text-muted-foreground">This will be your public profile URL: /{username || "username"}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  data-testid="input-invite-password"
                />
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground hover:text-foreground"
                  data-testid="button-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-invite-confirm-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting} data-testid="button-accept-invite">
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Create Account & Join Team
            </Button>
          </form>
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <a href="/auth" className="text-primary hover:underline" data-testid="link-login-instead">
                Log in
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
