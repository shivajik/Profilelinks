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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Shield, Users, CreditCard, LayoutDashboard, Settings,
  Plus, Pencil, Trash2, LogOut, Loader2, Star, Check,
  TrendingUp, Package, IndianRupee, RefreshCw, BarChart3,
  UserCheck, UserX, ChevronRight, Menu, X as XIcon,
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
  accountType: string; onboardingCompleted: boolean; isDisabled: boolean;
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
  featuresText: z.string().optional(),
  maxLinks: z.coerce.number().int().min(1).default(10),
  maxPages: z.coerce.number().int().min(1).default(1),
  maxTeamMembers: z.coerce.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
});
type PlanForm = z.infer<typeof planSchema>;

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-green-100 text-green-800",
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    cancelled: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

// ─── Sidebar Nav Items ───────────────────────────────────────────────────────
const NAV_ITEMS = [
  { key: "overview",  label: "Overview",       icon: LayoutDashboard },
  { key: "users",     label: "Users",          icon: Users },
  { key: "plans",     label: "Pricing Plans",  icon: Package },
  { key: "payments",  label: "Payments",       icon: CreditCard },
  { key: "reports",   label: "Reports",        icon: BarChart3 },
  { key: "settings",  label: "Settings",       icon: Settings },
];

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [adminUsers, setAdminUsers] = useState<UserRow[]>([]);
  const [adminPayments, setAdminPayments] = useState<PaymentRow[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // User filter
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Plan dialog
  const [planDialog, setPlanDialog] = useState<{ open: boolean; plan?: PricingPlan }>({ open: false });
  const [savingPlan, setSavingPlan] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const planForm = useForm<PlanForm>({ resolver: zodResolver(planSchema) });

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setAdmin)
      .catch(() => navigate("/admin/login"));
  }, [navigate]);

  const fetchStats   = useCallback(async () => { const r = await fetch("/api/admin/stats");    if (r.ok) setStats(await r.json()); }, []);
  const fetchPlans   = useCallback(async () => { const r = await fetch("/api/admin/plans");    if (r.ok) setPlans(await r.json()); }, []);
  const fetchUsers   = useCallback(async () => { const r = await fetch("/api/admin/users");    if (r.ok) { const d = await r.json(); setAdminUsers(d.users ?? []); } }, []);
  const fetchPayments= useCallback(async () => { const r = await fetch("/api/admin/payments"); if (r.ok) { const d = await r.json(); setAdminPayments(d.payments ?? []); } }, []);

  const refreshAll = useCallback(() => {
    setLoadingData(true);
    Promise.all([fetchStats(), fetchPlans(), fetchUsers(), fetchPayments()]).finally(() => setLoadingData(false));
  }, [fetchStats, fetchPlans, fetchUsers, fetchPayments]);

  useEffect(() => { if (admin) refreshAll(); }, [admin, refreshAll]);

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    navigate("/admin/login");
  };

  // ── User actions ───────────────────────────────────────────────────────────
  const toggleUserStatus = async (u: UserRow) => {
    setTogglingUserId(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}/toggle-status`, { method: "PATCH" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: j.message });
      fetchUsers();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setTogglingUserId(null);
    }
  };

  const deleteUser = async (u: UserRow) => {
    if (!confirm(`Permanently delete user "${u.username}"? This cannot be undone.`)) return;
    setDeletingUserId(u.id);
    try {
      const r = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: "User deleted" });
      fetchUsers(); fetchStats();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
  };

  // ── Plan CRUD ──────────────────────────────────────────────────────────────
  const openNewPlan = () => {
    planForm.reset({ name: "", description: "", monthlyPrice: 0, yearlyPrice: 0, featuresText: "", maxLinks: 10, maxPages: 1, maxTeamMembers: 1, isActive: true, isFeatured: false, sortOrder: 0 });
    setPlanDialog({ open: true });
  };
  const openEditPlan = (plan: PricingPlan) => {
    planForm.reset({ name: plan.name, description: plan.description ?? "", monthlyPrice: parseFloat(plan.monthlyPrice), yearlyPrice: parseFloat(plan.yearlyPrice), featuresText: (plan.features ?? []).join("\n"), maxLinks: plan.maxLinks, maxPages: plan.maxPages, maxTeamMembers: plan.maxTeamMembers, isActive: plan.isActive, isFeatured: plan.isFeatured, sortOrder: plan.sortOrder });
    setPlanDialog({ open: true, plan });
  };
  const onSavePlan = async (data: PlanForm) => {
    setSavingPlan(true);
    const features = (data.featuresText ?? "").split("\n").map((f) => f.trim()).filter(Boolean);
    try {
      const isEdit = !!planDialog.plan;
      const res = await fetch(isEdit ? `/api/admin/plans/${planDialog.plan!.id}` : "/api/admin/plans", {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, features, featuresText: undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast({ title: isEdit ? "Plan updated" : "Plan created" });
      setPlanDialog({ open: false }); fetchPlans(); fetchStats();
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSavingPlan(false); }
  };
  const deletePlan = async (id: string) => {
    if (!confirm("Delete this plan?")) return;
    setDeletingPlanId(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast({ title: "Plan deleted" }); fetchPlans(); fetchStats();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally { setDeletingPlanId(null); }
  };

  const filteredUsers = adminUsers.filter((u) => {
    if (userTypeFilter === "all") return true;
    if (userTypeFilter === "team") return u.accountType === "team";
    if (userTypeFilter === "personal") return u.accountType === "personal";
    if (userTypeFilter === "disabled") return u.isDisabled;
    return true;
  });

  if (!admin) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Mobile overlay ─────────────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-60 bg-sidebar border-r border-sidebar-border flex flex-col
        transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sidebar-foreground text-sm truncate">Admin Panel</p>
            <p className="text-xs text-muted-foreground truncate">Linkfolio</p>
          </div>
          <button className="ml-auto lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setActiveSection(key); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                ${activeSection === key
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
              {activeSection === key && <ChevronRight className="h-3 w-3 ml-auto" />}
            </button>
          ))}
        </nav>

        {/* Admin info */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2 px-2 py-2">
            <div className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-primary">{admin.name.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{admin.name}</p>
              <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full mt-1 justify-start text-muted-foreground" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 border-b bg-card flex items-center gap-3 px-4 sticky top-0 z-20">
          <button className="lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-semibold text-foreground text-sm">
              {NAV_ITEMS.find((n) => n.key === activeSection)?.label}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshAll} disabled={loadingData}>
              <RefreshCw className={`h-4 w-4 ${loadingData ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* ── OVERVIEW ─────────────────────────────────────────────────────── */}
          {activeSection === "overview" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Welcome back, {admin.name}!</h2>
                <p className="text-muted-foreground text-sm">Here's what's happening on your platform.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: "Total Users", value: stats?.totalUsers ?? "–", icon: Users, color: "text-blue-500" },
                  { label: "Total Revenue", value: stats ? `₹${stats.totalRevenue.toLocaleString()}` : "–", icon: IndianRupee, color: "text-green-500" },
                  { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? "–", icon: TrendingUp, color: "text-purple-500" },
                  { label: "Total Payments", value: stats?.totalPayments ?? "–", icon: CreditCard, color: "text-orange-500" },
                  { label: "Successful Payments", value: stats?.successfulPayments ?? "–", icon: Check, color: "text-emerald-500" },
                  { label: "Pricing Plans", value: stats?.totalPlans ?? "–", icon: Package, color: "text-pink-500" },
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
              <div>
                <h3 className="font-semibold text-foreground mb-3">Active Pricing Plans</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.filter((p) => p.isActive).slice(0, 3).map((plan) => (
                    <Card key={plan.id} className={plan.isFeatured ? "border-primary" : ""}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          {plan.isFeatured && <Badge variant="default" className="text-xs">Featured</Badge>}
                        </div>
                        <p className="text-2xl font-bold text-foreground">₹{parseFloat(plan.monthlyPrice).toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ──────────────────────────────────────────────────────────── */}
          {activeSection === "users" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Users</h2>
                  <p className="text-muted-foreground text-sm">{adminUsers.length} registered users</p>
                </div>
                <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
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
                        <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                      ) : filteredUsers.map((u) => (
                        <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${u.isDisabled ? "opacity-60" : ""}`}>
                          <td className="p-3">
                            <div className="font-medium text-foreground">{u.displayName || u.username}</div>
                            <div className="text-muted-foreground text-xs">{u.email}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs capitalize">{u.accountType}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{u.subscription?.planName ?? "Free"}</td>
                          <td className="p-3">
                            {u.isDisabled
                              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Disabled</span>
                              : u.subscription
                                ? <StatusBadge status={u.subscription.status} />
                                : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline" size="sm"
                                onClick={() => toggleUserStatus(u)}
                                disabled={togglingUserId === u.id}
                                title={u.isDisabled ? "Enable user" : "Disable user"}
                                className={u.isDisabled ? "text-green-600 hover:bg-green-50" : "text-yellow-600 hover:bg-yellow-50"}
                              >
                                {togglingUserId === u.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : u.isDisabled ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => deleteUser(u)}
                                disabled={deletingUserId === u.id}
                                title="Delete user"
                                className="text-destructive hover:bg-destructive/10"
                              >
                                {deletingUserId === u.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── PRICING PLANS ──────────────────────────────────────────────────── */}
          {activeSection === "plans" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Pricing Plans</h2>
                  <p className="text-muted-foreground text-sm">Create and manage subscription plans.</p>
                </div>
                <Button onClick={openNewPlan}><Plus className="h-4 w-4 mr-2" /> New Plan</Button>
              </div>
              {plans.length === 0 ? (
                <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><p className="text-muted-foreground">No pricing plans yet.</p><Button className="mt-4" onClick={openNewPlan}>Create your first plan</Button></CardContent></Card>
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
                            {plan.description && <p className="text-sm text-muted-foreground mt-0.5 truncate">{plan.description}</p>}
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span>₹{parseFloat(plan.monthlyPrice).toLocaleString()}/mo</span>
                              <span>₹{parseFloat(plan.yearlyPrice).toLocaleString()}/yr</span>
                              <span>{plan.maxLinks} links</span>
                              <span>{plan.maxPages} pages</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => deletePlan(plan.id)} disabled={deletingPlanId === plan.id} className="text-destructive hover:bg-destructive/10">
                              {deletingPlanId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PAYMENTS ──────────────────────────────────────────────────────── */}
          {activeSection === "payments" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Payments</h2>
                <p className="text-muted-foreground text-sm">{adminPayments.length} transactions</p>
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
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments yet</td></tr>
                      ) : adminPayments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3"><div className="font-medium text-foreground">{p.username}</div><div className="text-xs text-muted-foreground">{p.userEmail}</div></td>
                          <td className="p-3 text-muted-foreground">{p.planName ?? "—"}</td>
                          <td className="p-3 font-medium text-foreground">₹{parseFloat(p.amount).toLocaleString()}</td>
                          <td className="p-3 text-muted-foreground capitalize">{p.billingCycle ?? "—"}</td>
                          <td className="p-3"><StatusBadge status={p.status} /></td>
                          <td className="p-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── REPORTS ───────────────────────────────────────────────────────── */}
          {activeSection === "reports" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Reports</h2>
                <p className="text-muted-foreground text-sm">Platform health and revenue overview.</p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Revenue", value: stats ? `₹${stats.totalRevenue.toLocaleString()}` : "–", sub: "All time", icon: IndianRupee, color: "text-green-500" },
                  { label: "Conversion Rate", value: stats && stats.totalUsers > 0 ? `${((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}%` : "–", sub: "Paid / Total users", icon: TrendingUp, color: "text-blue-500" },
                  { label: "Payment Success Rate", value: stats && stats.totalPayments > 0 ? `${((stats.successfulPayments / stats.totalPayments) * 100).toFixed(1)}%` : "–", sub: "Successful payments", icon: Check, color: "text-emerald-500" },
                  { label: "Active Subscribers", value: stats?.activeSubscriptions ?? "–", sub: "Currently active", icon: Star, color: "text-purple-500" },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{s.label}</p>
                          <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>
                        </div>
                        <div className={`h-9 w-9 rounded-full bg-muted flex items-center justify-center ${s.color}`}>
                          <s.icon className="h-4 w-4" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* User breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">User Breakdown</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Personal accounts", value: adminUsers.filter(u => u.accountType === "personal").length, color: "bg-blue-500" },
                      { label: "Team accounts", value: adminUsers.filter(u => u.accountType === "team").length, color: "bg-purple-500" },
                      { label: "Disabled accounts", value: adminUsers.filter(u => u.isDisabled).length, color: "bg-red-400" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                        <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
                        <span className="font-semibold text-foreground">{row.value}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="text-base">Payment Summary</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Successful", value: adminPayments.filter(p => p.status === "success").length, color: "bg-green-500" },
                      { label: "Pending", value: adminPayments.filter(p => p.status === "pending").length, color: "bg-yellow-400" },
                      { label: "Failed", value: adminPayments.filter(p => p.status === "failed").length, color: "bg-red-500" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${row.color}`} />
                        <span className="text-sm text-muted-foreground flex-1">{row.label}</span>
                        <span className="font-semibold text-foreground">{row.value}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">Total Collected</span>
                        <span className="font-bold text-foreground">₹{stats?.totalRevenue.toLocaleString() ?? "–"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent payments table */}
              <Card>
                <CardHeader><CardTitle className="text-base">Recent Transactions</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                          <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adminPayments.slice(0, 5).map((p) => (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                            <td className="p-3"><div className="font-medium text-foreground">{p.username ?? "—"}</div></td>
                            <td className="p-3 text-muted-foreground">{p.planName ?? "—"}</td>
                            <td className="p-3 font-medium text-foreground">₹{parseFloat(p.amount).toLocaleString()}</td>
                            <td className="p-3"><StatusBadge status={p.status} /></td>
                            <td className="p-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          </tr>
                        ))}
                        {adminPayments.length === 0 && (
                          <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── SETTINGS ──────────────────────────────────────────────────────── */}
          {activeSection === "settings" && (
            <div className="space-y-4 max-w-xl">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Settings</h2>
                <p className="text-muted-foreground text-sm">Manage your admin account and integrations.</p>
              </div>
              <Card>
                <CardHeader><CardTitle className="text-base">Admin Account</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div><Label className="text-xs text-muted-foreground">Name</Label><p className="font-medium text-foreground">{admin.name}</p></div>
                  <div><Label className="text-xs text-muted-foreground">Email</Label><p className="font-medium text-foreground">{admin.email}</p></div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Razorpay Integration</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Configure Razorpay by adding secrets in your Lovable Cloud settings:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    <li><code className="bg-muted px-1 rounded">RAZORPAY_KEY_ID</code> — your Razorpay Key ID</li>
                    <li><code className="bg-muted px-1 rounded">RAZORPAY_KEY_SECRET</code> — your Razorpay Key Secret</li>
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base">Legal Pages</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">Your platform's legal documents are publicly accessible:</p>
                  <div className="flex gap-2 flex-wrap">
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Terms of Service ↗</a>
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">Privacy Policy ↗</a>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ── Plan Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={planDialog.open} onOpenChange={(open) => setPlanDialog({ open })}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{planDialog.plan ? "Edit Plan" : "New Pricing Plan"}</DialogTitle></DialogHeader>
          <form onSubmit={planForm.handleSubmit(onSavePlan)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5"><Label>Plan Name</Label><Input placeholder="e.g. Pro" {...planForm.register("name")} />{planForm.formState.errors.name && <p className="text-xs text-destructive">{planForm.formState.errors.name.message}</p>}</div>
              <div className="col-span-2 space-y-1.5"><Label>Description</Label><Input placeholder="Short description" {...planForm.register("description")} /></div>
              <div className="space-y-1.5"><Label>Monthly Price (₹)</Label><Input type="number" min="0" step="0.01" {...planForm.register("monthlyPrice")} /></div>
              <div className="space-y-1.5"><Label>Yearly Price (₹)</Label><Input type="number" min="0" step="0.01" {...planForm.register("yearlyPrice")} /></div>
              <div className="space-y-1.5"><Label>Max Links</Label><Input type="number" min="1" {...planForm.register("maxLinks")} /></div>
              <div className="space-y-1.5"><Label>Max Pages</Label><Input type="number" min="1" {...planForm.register("maxPages")} /></div>
              <div className="space-y-1.5"><Label>Max Team Members</Label><Input type="number" min="1" {...planForm.register("maxTeamMembers")} /></div>
              <div className="space-y-1.5"><Label>Sort Order</Label><Input type="number" min="0" {...planForm.register("sortOrder")} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Features (one per line)</Label><Textarea placeholder={"Unlimited links\nCustom domain\nAnalytics"} rows={4} {...planForm.register("featuresText")} /></div>
              <div className="flex items-center gap-3"><Switch checked={planForm.watch("isActive")} onCheckedChange={(v) => planForm.setValue("isActive", v)} /><Label>Active</Label></div>
              <div className="flex items-center gap-3"><Switch checked={planForm.watch("isFeatured")} onCheckedChange={(v) => planForm.setValue("isFeatured", v)} /><Label>Featured</Label></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPlanDialog({ open: false })}>Cancel</Button>
              <Button type="submit" disabled={savingPlan}>{savingPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{planDialog.plan ? "Save Changes" : "Create Plan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
