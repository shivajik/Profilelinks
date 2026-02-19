import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield, Users, CreditCard, LayoutDashboard, Settings,
  Plus, Pencil, Trash2, LogOut, Loader2, Star, Check,
  TrendingUp, Package, IndianRupee, X, RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AdminUser { id: string; email: string; name: string; }
interface PricingPlan {
  id: string; name: string; description?: string;
  monthlyPrice: string; yearlyPrice: string;
  features: string[]; maxLinks: number; maxPages: number;
  maxTeamMembers: number; isActive: boolean; isFeatured: boolean; sortOrder: number;
}
interface AdminStats {
  totalUsers: number; totalRevenue: number; activeSubscriptions: number;
  totalPlans: number; totalPayments: number; successfulPayments: number;
}
interface UserRow {
  id: string; username: string; email: string; displayName?: string;
  accountType: string; onboardingCompleted: boolean;
  subscription?: { status: string; billingCycle: string; planName?: string } | null;
}
interface PaymentRow {
  id: string; amount: string; currency: string; status: string;
  billingCycle?: string; razorpayOrderId?: string; razorpayPaymentId?: string;
  createdAt: string; userEmail?: string; username?: string; planName?: string;
}

// ─── Plan Form Schema ────────────────────────────────────────────────────────
const planSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  featuresText: z.string().optional(), // newline-separated
  maxLinks: z.coerce.number().int().min(1).default(10),
  maxPages: z.coerce.number().int().min(1).default(1),
  maxTeamMembers: z.coerce.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
type PlanForm = z.infer<typeof planSchema>;

// ─── Status badge helper ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    cancelled: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [adminPayments, setAdminPayments] = useState<PaymentRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Plan dialog
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan?: PricingPlan }>({ open: false });
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const planForm = useForm<PlanForm>({ resolver: zodResolver(planSchema) });

  // ── Auth check ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => {
        if (!r.ok) throw new Error("Not authenticated");
        return r.json();
      })
      .then(setAdmin)
      .catch(() => navigate("/admin/login"));
  }, [navigate]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const fetchPlans = useCallback(async () => {
    const res = await fetch("/api/admin/plans");
    if (res.ok) setPlans(await res.json());
  }, []);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const d = await res.json();
      setAdminUsers(d.users ?? []);
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    const res = await fetch("/api/admin/payments");
    if (res.ok) {
      const d = await res.json();
      setAdminPayments(d.payments ?? []);
    }
  }, []);

  useEffect(() => {
    if (!admin) return;
    setLoadingData(true);
    Promise.all([fetchStats(), fetchPlans(), fetchUsers(), fetchPayments()]).finally(() =>
      setLoadingData(false)
    );
  }, [admin, fetchStats, fetchPlans, fetchUsers, fetchPayments]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  };

  // ── Plan CRUD ─────────────────────────────────────────────────────────────
  const openNewPlan = () => {
    planForm.reset({
      name: "", description: "", monthlyPrice: 0, yearlyPrice: 0,
      featuresText: "", maxLinks: 10, maxPages: 1, maxTeamMembers: 1,
      isActive: true, isFeatured: false, sortOrder: 0,
    });
    setPlanDialog({ open: true });
  };

  const openEditPlan = (plan: PricingPlan) => {
    planForm.reset({
      name: plan.name,
      description: plan.description ?? "",
      monthlyPrice: parseFloat(plan.monthlyPrice),
      yearlyPrice: parseFloat(plan.yearlyPrice),
      featuresText: (plan.features ?? []).join("\n"),
      maxLinks: plan.maxLinks,
      maxPages: plan.maxPages,
      maxTeamMembers: plan.maxTeamMembers,
      isActive: plan.isActive,
      isFeatured: plan.isFeatured,
      sortOrder: plan.sortOrder,
    });
    setPlanDialog({ open: true, plan });
  };

  const onSavePlan = async (data: PlanForm) => {
    setSavingPlan(true);
    const features = (data.featuresText ?? "")
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    const payload = { ...data, features, featuresText: undefined };

    try {
      const isEdit = !!planDialog.plan;
      const url = isEdit ? `/api/admin/plans/${planDialog.plan!.id}` : "/api/admin/plans";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast({ title: isEdit ? "Plan updated" : "Plan created", description: `"${data.name}" saved successfully.` });
      setPlanDialog({ open: false });
      fetchPlans();
      fetchStats();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSavingPlan(false);
    }
  };

  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    setDeletingPlanId(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast({ title: "Plan deleted" });
      fetchPlans();
      fetchStats();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingPlanId(null);
    }
  };

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top navbar */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Shield className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-semibold text-foreground">Admin Dashboard</span>
              <span className="text-xs text-muted-foreground ml-2">Linkfolio</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{admin.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6 flex-wrap h-auto gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" /> Overview
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Pricing Plans
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Payments
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" /> Settings
            </TabsTrigger>
          </TabsList>

          {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
          <TabsContent value="overview">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Welcome back, {admin.name}!</h2>
                <p className="text-muted-foreground text-sm">Here's what's happening on your platform.</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { fetchStats(); fetchPlans(); fetchUsers(); fetchPayments(); }} disabled={loadingData}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingData ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Users", value: stats?.totalUsers ?? "–", icon: Users, color: "text-blue-500" },
                { label: "Total Revenue", value: stats ? `₹${stats.totalRevenue.toLocaleString()}` : "–", icon: IndianRupee, color: "text-green-500" },
                { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? "–", icon: TrendingUp, color: "text-purple-500" },
                { label: "Total Payments", value: stats?.totalPayments ?? "–", icon: CreditCard, color: "text-orange-500" },
              ].map((s) => (
                <Card key={s.label}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">{s.label}</p>
                        <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                      </div>
                      <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${s.color}`}>
                        <s.icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Recent plans preview */}
            <div className="mt-8">
              <h3 className="font-semibold text-foreground mb-3">Active Pricing Plans</h3>
              {plans.filter((p) => p.isActive).length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No active plans yet. Create one in the Pricing Plans tab.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.filter((p) => p.isActive).slice(0, 3).map((plan) => (
                    <Card key={plan.id} className={plan.isFeatured ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          {plan.isFeatured && <Badge variant="default" className="text-xs">Featured</Badge>}
                        </div>
                        <p className="text-2xl font-bold text-foreground">
                          ₹{parseFloat(plan.monthlyPrice).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span>
                        </p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── PRICING PLANS ─────────────────────────────────────────────── */}
          <TabsContent value="plans">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Pricing Plans</h2>
                <p className="text-muted-foreground text-sm">Create and manage subscription plans.</p>
              </div>
              <Button onClick={openNewPlan}>
                <Plus className="h-4 w-4 mr-2" /> New Plan
              </Button>
            </div>

            {plans.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pricing plans yet.</p>
                  <Button className="mt-4" onClick={openNewPlan}>Create your first plan</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`transition-colors ${!plan.isActive ? "opacity-60" : ""}`}>
                    <CardContent className="py-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{plan.name}</span>
                            {plan.isFeatured && <Badge variant="default" className="text-xs">Featured</Badge>}
                            {!plan.isActive && <Badge variant="secondary" className="text-xs">Inactive</Badge>}
                          </div>
                          {plan.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 truncate">{plan.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span>₹{parseFloat(plan.monthlyPrice).toLocaleString()}/mo</span>
                            <span>₹{parseFloat(plan.yearlyPrice).toLocaleString()}/yr</span>
                            <span>{plan.maxLinks} links</span>
                            <span>{plan.maxPages} pages</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline" size="sm"
                            onClick={() => deletePlan(plan.id)}
                            disabled={deletingPlanId === plan.id}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            {deletingPlanId === plan.id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── USERS ─────────────────────────────────────────────────────── */}
          <TabsContent value="users">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Users</h2>
                <p className="text-muted-foreground text-sm">{adminUsers.length} registered users</p>
              </div>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-muted-foreground">No users found</td>
                      </tr>
                    ) : (
                      adminUsers.map((u) => (
                        <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium text-foreground">{u.displayName || u.username}</div>
                            <div className="text-muted-foreground text-xs">{u.email}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs capitalize">{u.accountType}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {u.subscription?.planName ?? "Free"}
                          </td>
                          <td className="p-3">
                            {u.subscription ? (
                              <StatusBadge status={u.subscription.status} />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── PAYMENTS ──────────────────────────────────────────────────── */}
          <TabsContent value="payments">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Payments</h2>
                <p className="text-muted-foreground text-sm">{adminPayments.length} transactions</p>
              </div>
            </div>

            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Cycle</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminPayments.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-muted-foreground">No payments yet</td>
                      </tr>
                    ) : (
                      adminPayments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium text-foreground">{p.username}</div>
                            <div className="text-xs text-muted-foreground">{p.userEmail}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">{p.planName ?? "—"}</td>
                          <td className="p-3 font-medium text-foreground">
                            ₹{parseFloat(p.amount).toLocaleString()}
                          </td>
                          <td className="p-3 text-muted-foreground capitalize">{p.billingCycle ?? "—"}</td>
                          <td className="p-3"><StatusBadge status={p.status} /></td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {new Date(p.createdAt).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", year: "numeric"
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── SETTINGS ──────────────────────────────────────────────────── */}
          <TabsContent value="settings">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-foreground">Settings</h2>
              <p className="text-muted-foreground text-sm">Manage your admin account and integrations.</p>
            </div>
            <div className="grid gap-4 max-w-xl">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Admin Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Name</Label>
                    <p className="font-medium text-foreground">{admin.name}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Email</Label>
                    <p className="font-medium text-foreground">{admin.email}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Razorpay Integration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Configure Razorpay by adding secrets in your Lovable Cloud settings:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><code className="bg-muted px-1 rounded">RAZORPAY_KEY_ID</code> — your Razorpay Key ID</li>
                    <li><code className="bg-muted px-1 rounded">RAZORPAY_KEY_SECRET</code> — your Razorpay Key Secret</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Get these from Razorpay Dashboard → Settings → API Keys.
                    Use Test Mode keys during development.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* ── Plan Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={planDialog.open} onOpenChange={(open) => setPlanDialog({ open })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{planDialog.plan ? "Edit Plan" : "New Pricing Plan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={planForm.handleSubmit(onSavePlan)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Plan Name</Label>
                <Input placeholder="e.g. Pro" {...planForm.register("name")} />
                {planForm.formState.errors.name && (
                  <p className="text-xs text-destructive">{planForm.formState.errors.name.message}</p>
                )}
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Description</Label>
                <Input placeholder="Short description" {...planForm.register("description")} />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly Price (₹)</Label>
                <Input type="number" min="0" step="0.01" {...planForm.register("monthlyPrice")} />
              </div>
              <div className="space-y-1.5">
                <Label>Yearly Price (₹)</Label>
                <Input type="number" min="0" step="0.01" {...planForm.register("yearlyPrice")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Links</Label>
                <Input type="number" min="1" {...planForm.register("maxLinks")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Pages</Label>
                <Input type="number" min="1" {...planForm.register("maxPages")} />
              </div>
              <div className="space-y-1.5">
                <Label>Max Team Members</Label>
                <Input type="number" min="1" {...planForm.register("maxTeamMembers")} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input type="number" min="0" {...planForm.register("sortOrder")} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label>Features (one per line)</Label>
                <Textarea
                  placeholder={"Unlimited links\nCustom domain\nAnalytics"}
                  rows={4}
                  {...planForm.register("featuresText")}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={planForm.watch("isActive")}
                  onCheckedChange={(v) => planForm.setValue("isActive", v)}
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={planForm.watch("isFeatured")}
                  onCheckedChange={(v) => planForm.setValue("isFeatured", v)}
                />
                <Label>Featured</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanDialog({ open: false })}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingPlan}>
                {savingPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {planDialog.plan ? "Save Changes" : "Create Plan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
