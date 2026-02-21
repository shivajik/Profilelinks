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
import { Separator } from "@/components/ui/separator";
import {
  Shield, Users, CreditCard, LayoutDashboard, Settings,
  Plus, Pencil, Trash2, LogOut, Loader2, Star, Check,
  TrendingUp, Package, IndianRupee, RefreshCw, BarChart3,
  UserCheck, UserX, ChevronRight, Menu, X as XIcon,
  FileText, Eye, User, Mail, AtSign, Calendar, Hash,
  Download, ArrowLeft, Link2, FileStack, Globe, MessageSquare,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AdminUser { id: string; email: string; name: string; }
interface PricingPlan {
  id: string; name: string; description?: string;
  monthlyPrice: string; yearlyPrice: string;
  features: string[]; maxLinks: number; maxPages: number;
  maxTeamMembers: number; maxBlocks: number; maxSocials: number;
  qrCodeEnabled: boolean; analyticsEnabled: boolean; customTemplatesEnabled: boolean;
  menuBuilderEnabled: boolean; planType: string;
  isActive: boolean; isFeatured: boolean; sortOrder: number;
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
interface UserDetail {
  user: UserRow;
  subscription: { status: string; billingCycle: string; planName?: string; currentPeriodStart?: string; currentPeriodEnd?: string } | null;
  payments: PaymentRow[];
  usage: {
    planName: string | null; maxLinks: number; maxPages: number; maxTeamMembers: number;
    maxBlocks: number; maxSocials: number; currentLinks: number; currentPages: number;
    currentBlocks: number; currentSocials: number; currentTeamMembers: number; hasActivePlan: boolean;
  };
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
  maxBlocks: z.coerce.number().int().min(1).default(20),
  maxSocials: z.coerce.number().int().min(1).default(5),
  qrCodeEnabled: z.boolean().default(false),
  analyticsEnabled: z.boolean().default(false),
  customTemplatesEnabled: z.boolean().default(false),
  menuBuilderEnabled: z.boolean().default(false),
  planType: z.enum(["individual", "team"]).default("individual"),
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

  // Invoice dialog
  const [invoiceDialog, setInvoiceDialog] = useState<{ open: boolean; payment?: PaymentRow }>({ open: false });

   // User profile dialog
  const [userProfileDialog, setUserProfileDialog] = useState<{ open: boolean; user?: UserRow }>({ open: false });

  // User detail page
  const [userDetailData, setUserDetailData] = useState<UserDetail | null>(null);
  const [loadingUserDetail, setLoadingUserDetail] = useState(false);

  // Report filters
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportStatus, setReportStatus] = useState("all");
  const [reportPlanId, setReportPlanId] = useState("all");
  const [downloadingReport, setDownloadingReport] = useState(false);

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
    planForm.reset({ name: "", description: "", monthlyPrice: 0, yearlyPrice: 0, featuresText: "", maxLinks: 10, maxPages: 1, maxTeamMembers: 1, maxBlocks: 20, maxSocials: 5, qrCodeEnabled: false, analyticsEnabled: false, customTemplatesEnabled: false, menuBuilderEnabled: false, planType: "individual", isActive: true, isFeatured: false, sortOrder: 0 });
    setPlanDialog({ open: true });
  };
  const openEditPlan = (plan: PricingPlan) => {
    planForm.reset({ name: plan.name, description: plan.description ?? "", monthlyPrice: parseFloat(plan.monthlyPrice), yearlyPrice: parseFloat(plan.yearlyPrice), featuresText: (plan.features ?? []).join("\n"), maxLinks: plan.maxLinks, maxPages: plan.maxPages, maxTeamMembers: plan.maxTeamMembers, maxBlocks: plan.maxBlocks ?? 20, maxSocials: plan.maxSocials ?? 5, qrCodeEnabled: plan.qrCodeEnabled ?? false, analyticsEnabled: plan.analyticsEnabled ?? false, customTemplatesEnabled: plan.customTemplatesEnabled ?? false, menuBuilderEnabled: plan.menuBuilderEnabled ?? false, planType: (plan.planType as "individual" | "team") ?? "individual", isActive: plan.isActive, isFeatured: plan.isFeatured, sortOrder: plan.sortOrder });
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

  const openUserDetail = async (userId: string) => {
    setLoadingUserDetail(true);
    setActiveSection("user-detail");
    try {
      const r = await fetch(`/api/admin/users/${userId}`);
      if (r.ok) setUserDetailData(await r.json());
    } catch { /* ignore */ }
    setLoadingUserDetail(false);
  };

  const downloadReport = async () => {
    setDownloadingReport(true);
    try {
      const params = new URLSearchParams();
      if (reportStartDate) params.set("startDate", reportStartDate);
      if (reportEndDate) params.set("endDate", reportEndDate);
      if (reportStatus !== "all") params.set("status", reportStatus);
      if (reportPlanId !== "all") params.set("planId", reportPlanId);
      const r = await fetch(`/api/admin/reports/download?${params}`);
      if (!r.ok) throw new Error("Download failed");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payments-report-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Report downloaded!" });
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    }
    setDownloadingReport(false);
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
                            <button
                              className="text-left hover:underline"
                              onClick={() => openUserDetail(u.id)}
                            >
                              <div className="font-medium text-primary">{u.displayName || u.username}</div>
                              <div className="text-muted-foreground text-xs">{u.email}</div>
                            </button>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-xs capitalize">{u.accountType}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{u.subscription?.planName ?? "Free"}</td>
                          <td className="p-3">
                            {u.isDisabled
                              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Disabled</span>
                              : u.subscription
                                ? <StatusBadge status={u.subscription.status} />
                                : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline" size="sm"
                                onClick={() => openUserDetail(u.id)}
                                title="View profile"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
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
                <Button variant="outline" onClick={async () => {
                  try {
                    const r = await fetch("/api/admin/seed-team-packages", { method: "POST" });
                    const j = await r.json();
                    if (!r.ok) throw new Error(j.message);
                    toast({ title: "Team packages seeded!", description: j.message });
                    fetchPlans();
                  } catch (err: any) {
                    toast({ title: "Seed failed", description: err.message, variant: "destructive" });
                  }
                }}>Seed Team Packages</Button>
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
                              <Badge variant={plan.planType === "team" ? "default" : "outline"} className="text-xs capitalize">{plan.planType || "individual"}</Badge>
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
                        <th className="text-left p-3 font-medium text-muted-foreground">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPayments.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No payments yet</td></tr>
                      ) : adminPayments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3"><div className="font-medium text-foreground">{p.username}</div><div className="text-xs text-muted-foreground">{p.userEmail}</div></td>
                          <td className="p-3 text-muted-foreground">{p.planName ?? "—"}</td>
                          <td className="p-3 font-medium text-foreground">₹{parseFloat(p.amount).toLocaleString()}</td>
                          <td className="p-3 text-muted-foreground capitalize">{p.billingCycle ?? "—"}</td>
                          <td className="p-3"><StatusBadge status={p.status} /></td>
                          <td className="p-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                          <td className="p-3">
                            <Button
                              variant="outline" size="sm"
                              onClick={() => setInvoiceDialog({ open: true, payment: p })}
                              title="View Invoice"
                            >
                              <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* ── USER DETAIL ────────────────────────────────────────────────────── */}
          {activeSection === "user-detail" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setActiveSection("users")}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Back to Users
                </Button>
              </div>
              {loadingUserDetail ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : userDetailData ? (() => {
                const d = userDetailData;
                return (
                  <div className="space-y-6">
                    {/* User header */}
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-2xl font-bold text-primary">{(d.user.displayName || d.user.username).charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-foreground">{d.user.displayName || d.user.username}</h2>
                        <p className="text-sm text-muted-foreground">{d.user.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">{d.user.accountType}</Badge>
                          {d.user.isDisabled && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive">Disabled</span>}
                          {d.subscription && <StatusBadge status={d.subscription.status} />}
                        </div>
                      </div>
                    </div>

                    {/* Subscription & Usage */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader><CardTitle className="text-base">Subscription</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-semibold">{d.subscription?.planName ?? "Free"}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Billing</span><span className="capitalize">{d.subscription?.billingCycle ?? "—"}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{d.subscription ? <StatusBadge status={d.subscription.status} /> : <span>—</span>}</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader><CardTitle className="text-base">Usage</CardTitle></CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {[
                            { label: "Links", current: d.usage.currentLinks, max: d.usage.maxLinks },
                            { label: "Pages", current: d.usage.currentPages, max: d.usage.maxPages },
                            { label: "Blocks", current: d.usage.currentBlocks, max: d.usage.maxBlocks },
                            { label: "Socials", current: d.usage.currentSocials, max: d.usage.maxSocials },
                            { label: "Team Members", current: d.usage.currentTeamMembers, max: d.usage.maxTeamMembers },
                          ].map((u) => (
                            <div key={u.label} className="flex justify-between items-center">
                              <span className="text-muted-foreground">{u.label}</span>
                              <span className={`font-semibold ${u.current >= u.max ? "text-destructive" : ""}`}>{u.current} / {u.max}</span>
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Payment History */}
                    <Card>
                      <CardHeader><CardTitle className="text-base">Payment History</CardTitle></CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Amount</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Cycle</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                                <th className="text-left p-3 font-medium text-muted-foreground">Invoice</th>
                              </tr>
                            </thead>
                            <tbody>
                              {d.payments.length === 0 ? (
                                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No payments found</td></tr>
                              ) : d.payments.map((p: any) => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="p-3 text-muted-foreground">{p.planName ?? "—"}</td>
                                  <td className="p-3 font-medium text-foreground">₹{parseFloat(p.amount).toLocaleString()}</td>
                                  <td className="p-3 text-muted-foreground capitalize">{p.billingCycle ?? "—"}</td>
                                  <td className="p-3"><StatusBadge status={p.status} /></td>
                                  <td className="p-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                  <td className="p-3">
                                    <Button variant="outline" size="sm" onClick={() => setInvoiceDialog({ open: true, payment: { ...p, userEmail: d.user.email, username: d.user.username } })}>
                                      <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })() : (
                <p className="text-center text-muted-foreground py-8">User not found</p>
              )}
            </div>
          )}

          {/* ── REPORTS ───────────────────────────────────────────────────────── */}
          {activeSection === "reports" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Reports</h2>
                  <p className="text-muted-foreground text-sm">Platform health and revenue overview.</p>
                </div>
                <Button onClick={downloadReport} disabled={downloadingReport} variant="outline" size="sm">
                  {downloadingReport ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Download className="h-4 w-4 mr-1" />}
                  Download CSV
                </Button>
              </div>

              {/* Filters */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">Start Date</Label>
                      <Input type="date" value={reportStartDate} onChange={(e) => setReportStartDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">End Date</Label>
                      <Input type="date" value={reportEndDate} onChange={(e) => setReportEndDate(e.target.value)} className="w-40" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Status</Label>
                      <Select value={reportStatus} onValueChange={setReportStatus}>
                        <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Plan</Label>
                      <Select value={reportPlanId} onValueChange={setReportPlanId}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Plans</SelectItem>
                          {plans.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => { setReportStartDate(""); setReportEndDate(""); setReportStatus("all"); setReportPlanId("all"); }}>
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Summary cards — computed from filtered payments */}
              {(() => {
                const filtered = adminPayments.filter((p) => {
                  if (reportStatus !== "all" && p.status !== reportStatus) return false;
                  if (reportPlanId !== "all") {
                    const matchPlan = plans.find((pl) => pl.id === reportPlanId);
                    if (matchPlan && p.planName !== matchPlan.name) return false;
                  }
                  if (reportStartDate && new Date(p.createdAt) < new Date(reportStartDate)) return false;
                  if (reportEndDate && new Date(p.createdAt) > new Date(reportEndDate + "T23:59:59")) return false;
                  return true;
                });
                const filteredRevenue = filtered.filter(p => p.status === "success").reduce((sum, p) => sum + parseFloat(p.amount), 0);
                const filteredTotal = filtered.length;
                const filteredSuccess = filtered.filter(p => p.status === "success").length;
                const filteredPending = filtered.filter(p => p.status === "pending").length;
                const filteredFailed = filtered.filter(p => p.status === "failed").length;
                const hasFilters = reportStartDate || reportEndDate || reportStatus !== "all" || reportPlanId !== "all";
                const subLabel = hasFilters ? "Filtered" : "All time";

                return (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: "Total Revenue", value: `₹${filteredRevenue.toLocaleString()}`, sub: subLabel, icon: IndianRupee, color: "text-green-500" },
                        { label: "Conversion Rate", value: stats && stats.totalUsers > 0 ? `${((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(1)}%` : "–", sub: "Paid / Total users", icon: TrendingUp, color: "text-blue-500" },
                        { label: "Payment Success Rate", value: filteredTotal > 0 ? `${((filteredSuccess / filteredTotal) * 100).toFixed(1)}%` : "–", sub: "Successful payments", icon: Check, color: "text-emerald-500" },
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
                            { label: "Successful", value: filteredSuccess, color: "bg-green-500" },
                            { label: "Pending", value: filteredPending, color: "bg-yellow-400" },
                            { label: "Failed", value: filteredFailed, color: "bg-red-500" },
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
                              <span className="font-bold text-foreground">₹{filteredRevenue.toLocaleString()}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Plan-wise breakdown */}
                    <Card>
                      <CardHeader><CardTitle className="text-base">Plan-wise Revenue</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {plans.filter(p => p.isActive).map((plan) => {
                          const planPayments = filtered.filter(p => p.planName === plan.name && p.status === "success");
                          const planRevenue = planPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
                          return (
                            <div key={plan.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">{plan.name}</span>
                                <Badge variant="outline" className="text-xs">{planPayments.length} payments</Badge>
                              </div>
                              <span className="font-semibold text-foreground">₹{planRevenue.toLocaleString()}</span>
                            </div>
                          );
                        })}
                        {plans.filter(p => p.isActive).length === 0 && (
                          <p className="text-sm text-muted-foreground text-center">No active plans</p>
                        )}
                      </CardContent>
                    </Card>

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
                              {filtered.slice(0, 10).map((p) => (
                                <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="p-3"><div className="font-medium text-foreground">{p.username ?? "—"}</div></td>
                                  <td className="p-3 text-muted-foreground">{p.planName ?? "—"}</td>
                                  <td className="p-3 font-medium text-foreground">₹{parseFloat(p.amount).toLocaleString()}</td>
                                  <td className="p-3"><StatusBadge status={p.status} /></td>
                                  <td className="p-3 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td>
                                </tr>
                              ))}
                              {filtered.length === 0 && (
                                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No transactions match the filters</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </>
                );
              })()}
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

      {/* ── Invoice Dialog ───────────────────────────────────────────────────── */}
      <Dialog open={invoiceDialog.open} onOpenChange={(open) => setInvoiceDialog({ open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" /> Invoice
            </DialogTitle>
          </DialogHeader>
          {invoiceDialog.payment && (() => {
            const p = invoiceDialog.payment!;
            const invoiceNo = `INV-${p.id.slice(0, 8).toUpperCase()}`;
            const date = new Date(p.createdAt);
            return (
              <div className="space-y-5" id="invoice-print-area">
                {/* Invoice header */}
                <div className="flex items-start justify-between border-b pb-4">
                  <div>
                    <p className="font-bold text-lg text-foreground">Linkfolio</p>
                    <p className="text-xs text-muted-foreground">linkfolio.app</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">{invoiceNo}</p>
                    <p className="text-xs text-muted-foreground">{date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                </div>

                {/* Billed to */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Billed To</p>
                    <p className="font-medium text-foreground">{p.username ?? "—"}</p>
                    <p className="text-muted-foreground">{p.userEmail ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Payment Info</p>
                    <p className="text-muted-foreground capitalize">{p.billingCycle ?? "—"} billing</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>

                <Separator />

                {/* Line items */}
                <div>
                  <div className="flex justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    <span>Description</span><span>Amount</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <div>
                      <p className="font-medium text-foreground">{p.planName ?? "Subscription"} Plan</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.billingCycle} subscription</p>
                    </div>
                    <p className="font-semibold text-foreground">₹{parseFloat(p.amount).toLocaleString()}</p>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <p className="font-bold text-foreground">Total</p>
                    <p className="text-xl font-bold text-primary">₹{parseFloat(p.amount).toLocaleString()} {p.currency}</p>
                  </div>
                </div>

                <Separator />

                {/* Transaction IDs */}
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  {p.razorpayOrderId && <div className="flex gap-2"><Hash className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Order ID: <span className="font-mono">{p.razorpayOrderId}</span></span></div>}
                  {p.razorpayPaymentId && <div className="flex gap-2"><Hash className="h-3.5 w-3.5 shrink-0 mt-0.5" /><span>Payment ID: <span className="font-mono">{p.razorpayPaymentId}</span></span></div>}
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceDialog({ open: false })}>Close</Button>
            <Button onClick={() => window.print()}>
              <FileText className="h-4 w-4 mr-2" /> Print / Save PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── User Profile Dialog ──────────────────────────────────────────────── */}
      <Dialog open={userProfileDialog.open} onOpenChange={(open) => setUserProfileDialog({ open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" /> User Profile
            </DialogTitle>
          </DialogHeader>
          {userProfileDialog.user && (() => {
            const u = userProfileDialog.user!;
            const fields = [
              { icon: User, label: "Display Name", value: u.displayName || "—" },
              { icon: AtSign, label: "Username", value: `@${u.username}` },
              { icon: Mail, label: "Email", value: u.email },
              { icon: Package, label: "Account Type", value: u.accountType },
              { icon: Check, label: "Onboarding", value: u.onboardingCompleted ? "Completed" : "Pending" },
            ];
            return (
              <div className="space-y-4">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-bold text-primary">
                      {(u.displayName || u.username).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-lg">{u.displayName || u.username}</p>
                    <p className="text-muted-foreground text-sm">{u.email}</p>
                    {u.isDisabled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-destructive/10 text-destructive mt-1">
                        Account Disabled
                      </span>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Fields */}
                <div className="space-y-3">
                  {fields.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 text-sm">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground w-28 shrink-0">{label}</span>
                      <span className="font-medium text-foreground capitalize">{value}</span>
                    </div>
                  ))}
                </div>

                {/* Subscription */}
                {u.subscription && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Subscription</p>
                      <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Plan</span>
                          <span className="font-semibold text-foreground">{u.subscription.planName ?? "—"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Billing</span>
                          <span className="capitalize text-foreground">{u.subscription.billingCycle}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Status</span>
                          <StatusBadge status={u.subscription.status} />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { toggleUserStatus(u); setUserProfileDialog({ open: false }); }}
                    className={u.isDisabled ? "text-green-600" : "text-yellow-600"}
                  >
                    {u.isDisabled ? <><UserCheck className="h-4 w-4 mr-1" /> Enable</> : <><UserX className="h-4 w-4 mr-1" /> Disable</>}
                  </Button>
                  <Button variant="outline" onClick={() => setUserProfileDialog({ open: false })}>Close</Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

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
              <div className="space-y-1.5"><Label>Max Blocks</Label><Input type="number" min="1" {...planForm.register("maxBlocks")} /></div>
              <div className="space-y-1.5"><Label>Max Socials</Label><Input type="number" min="1" {...planForm.register("maxSocials")} /></div>
              <div className="space-y-1.5"><Label>Max Team Members</Label><Input type="number" min="1" {...planForm.register("maxTeamMembers")} /></div>
              <div className="space-y-1.5"><Label>Sort Order</Label><Input type="number" min="0" {...planForm.register("sortOrder")} /></div>
              <div className="col-span-2 space-y-1.5"><Label>Features (one per line)</Label><Textarea placeholder={"Unlimited links\nCustom domain\nAnalytics"} rows={4} {...planForm.register("featuresText")} /></div>
              <div className="col-span-2"><Separator className="my-2" /><p className="text-sm font-medium text-foreground mb-3">Feature Access</p></div>
              <div className="flex items-center gap-3"><Switch checked={planForm.watch("qrCodeEnabled")} onCheckedChange={(v) => planForm.setValue("qrCodeEnabled", v)} /><Label>QR Code</Label></div>
              <div className="flex items-center gap-3"><Switch checked={planForm.watch("analyticsEnabled")} onCheckedChange={(v) => planForm.setValue("analyticsEnabled", v)} /><Label>Analytics</Label></div>
              <div className="flex items-center gap-3"><Switch checked={planForm.watch("customTemplatesEnabled")} onCheckedChange={(v) => planForm.setValue("customTemplatesEnabled", v)} /><Label>Custom Templates</Label></div>
              <div className="flex items-center gap-3"><Switch checked={planForm.watch("menuBuilderEnabled")} onCheckedChange={(v) => planForm.setValue("menuBuilderEnabled", v)} /><Label>Menu Builder</Label></div>
              <div className="col-span-2"><Separator className="my-2" /><p className="text-sm font-medium text-foreground mb-3">Plan Type</p></div>
              <div className="col-span-2 space-y-1.5">
                <Label>Plan Type</Label>
                <Select value={planForm.watch("planType")} onValueChange={(v) => planForm.setValue("planType", v as "individual" | "team")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="team">Team (auto-upgrades buyer to team)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Team plans automatically convert individual users to team accounts upon purchase.</p>
              </div>
              <div className="col-span-2"><Separator className="my-2" /></div>
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
