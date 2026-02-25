import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff, KeyRound } from "lucide-react";

export default function ForceChangePassword() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // If user doesn't need to change password, redirect
  if (!(user as any).mustChangePassword) {
    return <Redirect to={user.onboardingCompleted ? "/dashboard" : "/onboarding"} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (currentPassword === newPassword) {
      toast({ title: "New password must be different from temporary password", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/force-change-password", {
        currentPassword,
        newPassword,
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.message || "Failed to change password", variant: "destructive" });
        setSubmitting(false);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Password changed successfully!" });
      navigate(user.onboardingCompleted ? "/dashboard" : "/onboarding");
    } catch (err: any) {
      toast({ title: err.message || "Something went wrong", variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="rounded-full bg-primary/10 p-3">
              <KeyRound className="w-6 h-6 text-primary" />
            </div>
          </div>
          <CardTitle>Change Your Password</CardTitle>
          <CardDescription>
            You're using a temporary password. Please set a new password to secure your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Temporary Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your temporary password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Choose a new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting || !currentPassword || !newPassword || !confirmPassword}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Set New Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
