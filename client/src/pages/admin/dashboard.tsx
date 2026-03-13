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
  UserCheck, UserX, ChevronRight, Menu, X as XIcon, Search,
  FileText, Eye, User, Mail, AtSign, Calendar, Hash,
  Download, ArrowLeft, Link2, FileStack, Globe, MessageSquare,
  Handshake, Tag, Percent, Copy, Ticket, Key, ToggleLeft, ToggleRight, Send,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// ─── Types ──────────────────────────────────────────────────────────────────
interface AdminUser { id: string; email: string; name: string; }
interface PricingPlan {
  id: string; name: string; description?: string;
  monthlyPrice: string; yearlyPrice: string;
  monthlyPriceUsd: string; yearlyPriceUsd: string;
  features: string[]; maxLinks: number; maxPages: number;
  maxTeamMembers: number; maxBlocks: number; maxSocials: number;
  qrCodeEnabled: boolean; analyticsEnabled: boolean; customTemplatesEnabled: boolean;
  menuBuilderEnabled: boolean; whiteLabelEnabled: boolean; planType: string;
  isActive: boolean; isFeatured: boolean; sortOrder: number;
}
interface AdminStats {
  totalUsers: number; totalRevenue: number; activeSubscriptions: number;
  totalPlans: number; totalPayments: number; successfulPayments: number;
}
interface UserRow {
  id: string; username: string; email: string; displayName?: string;
  accountType: string; onboardingCompleted: boolean; isDisabled: boolean; isLtd: boolean;
  createdAt?: string;
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
interface AffiliateRow {
  id: string; userId: string; referralCode: string; commissionRate: string;
  isActive: boolean; totalEarnings: string; createdAt: string;
  username?: string; email?: string; displayName?: string;
}
interface PromoCodeRow {
  id: string; code: string; discountPercent: string; maxUses: number | null;
  currentUses: number; isActive: boolean; expiresAt?: string; createdAt: string;
}

// ─── Plan Form Schema ────────────────────────────────────────────────────────
const planSchema = z.object({
  name: z.string().min(1, "Name required"),
  description: z.string().optional(),
  monthlyPrice: z.coerce.number().min(0),
  yearlyPrice: z.coerce.number().min(0),
  monthlyPriceUsd: z.coerce.number().min(0).default(0),
  yearlyPriceUsd: z.coerce.number().min(0).default(0),
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
  whiteLabelEnabled: z.boolean().default(false),
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
  { key: "overview",    label: "Overview",       icon: LayoutDashboard },
  { key: "users",       label: "Users",          icon: Users },
  { key: "plans",       label: "Pricing Plans",  icon: Package },
  { key: "payments",    label: "Payments",       icon: CreditCard },
  { key: "affiliates",  label: "Affiliates",     icon: Handshake },
  { key: "promo-codes", label: "Promo Codes",    icon: Tag },
  { key: "ltd-codes",   label: "LTD Codes",      icon: Ticket },
  { key: "email-blast", label: "Email Blast",    icon: Mail },
  { key: "reports",     label: "Reports",        icon: BarChart3 },
  { key: "settings",    label: "Settings",       icon: Settings },
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

  // Assign plan dialog
  const [assignPlanDialog, setAssignPlanDialog] = useState<{ open: boolean; userId?: string; userName?: string }>({ open: false });
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignBillingCycle, setAssignBillingCycle] = useState("monthly");
  const [assignPaymentMethod, setAssignPaymentMethod] = useState("cash");
  const [assignNotes, setAssignNotes] = useState("");
  const [assigningPlan, setAssigningPlan] = useState(false);

  // User filter & search
  const [userTypeFilter, setUserTypeFilter] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchApplied, setUserSearchApplied] = useState("");
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  // Multi-select
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [userPlanFilter, setUserPlanFilter] = useState("all");
  const [exportingUsers, setExportingUsers] = useState(false);

  // Payment search & pagination
  const [paymentSearchQuery, setPaymentSearchQuery] = useState("");
  const [paymentSearchApplied, setPaymentSearchApplied] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentPage, setPaymentPage] = useState(1);
  const PAYMENTS_PER_PAGE = 10;
  const [totalPaymentsCount, setTotalPaymentsCount] = useState(0);
  const [totalPaymentPages, setTotalPaymentPages] = useState(1);
  const [loadingPayments, setLoadingPayments] = useState(false);

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

  // Affiliate state
  const [adminAffiliates, setAdminAffiliates] = useState<AffiliateRow[]>([]);
  const [affiliateUserId, setAffiliateUserId] = useState("");
  const [affiliateRate, setAffiliateRate] = useState("10");
  const [creatingAffiliate, setCreatingAffiliate] = useState(false);
  const [deletingAffiliateId, setDeletingAffiliateId] = useState<string | null>(null);

  // Promo code state
  const [adminPromoCodes, setAdminPromoCodes] = useState<PromoCodeRow[]>([]);
  const [promoDialog, setPromoDialog] = useState<{ open: boolean; promo?: PromoCodeRow }>({ open: false });
  const [promoCode, setPromoCode] = useState("");
  const [promoDiscount, setPromoDiscount] = useState("10");
  const [promoMaxUses, setPromoMaxUses] = useState("0");
  const [promoExpiry, setPromoExpiry] = useState("");
  const [savingPromo, setSavingPromo] = useState(false);
  const [deletingPromoId, setDeletingPromoId] = useState<string | null>(null);

  // LTD codes state
  interface LtdCodeRow { id: string; code: string; planId: string | null; planName: string | null; maxUses: number; currentUses: number; isActive: boolean; notes: string | null; createdAt: string; }
  const [ltdCodes, setLtdCodes] = useState<LtdCodeRow[]>([]);
  const [ltdPageEnabled, setLtdPageEnabled] = useState(false);
  const [ltdPageLoading, setLtdPageLoading] = useState(false);
  const [ltdCreateDialog, setLtdCreateDialog] = useState(false);
  const [ltdNewCode, setLtdNewCode] = useState("");
  const [ltdNewPlanId, setLtdNewPlanId] = useState("__none__");
  const [ltdNewNotes, setLtdNewNotes] = useState("");
  const [ltdSaving, setLtdSaving] = useState(false);
  const [ltdDeletingId, setLtdDeletingId] = useState<string | null>(null);
  const [ltdBulkDialog, setLtdBulkDialog] = useState(false);
  const [ltdBulkCount, setLtdBulkCount] = useState("10");
  const [ltdBulkPrefix, setLtdBulkPrefix] = useState("LTD");
  const [ltdBulkPlanId, setLtdBulkPlanId] = useState("__none__");
  const [ltdBulkNotes, setLtdBulkNotes] = useState("");
  const [ltdBulkResult, setLtdBulkResult] = useState<string[] | null>(null);

  // ── Auth check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setAdmin)
      .catch(() => navigate("/admin/login"));
  }, [navigate]);

  const fetchStats      = useCallback(async () => { const r = await fetch("/api/admin/stats");    if (r.ok) setStats(await r.json()); }, []);
  const fetchPlans      = useCallback(async () => { const r = await fetch("/api/admin/plans");    if (r.ok) setPlans(await r.json()); }, []);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [totalUserPages, setTotalUserPages] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const fetchUsers = useCallback(async (page?: number, search?: string, filter?: string, planFilter?: string) => {
    const p = page ?? 1;
    const s = search ?? "";
    const f = filter ?? "all";
    const pf = planFilter ?? "all";
    const params = new URLSearchParams({ page: String(p), limit: String(USERS_PER_PAGE) });
    if (s) params.set("search", s);
    if (f && f !== "all") params.set("accountType", f);
    if (pf && pf !== "all") params.set("planName", pf);
    setLoadingUsers(true);
    const r = await fetch(`/api/admin/users?${params}`);
    if (r.ok) {
      const d = await r.json();
      setAdminUsers(d.users ?? []);
      setTotalUsersCount(d.total ?? 0);
      const pages = Math.max(1, Math.ceil((d.total ?? 0) / USERS_PER_PAGE));
      setTotalUserPages(pages);
      if (p > pages) {
        setUserPage(pages);
        fetchUsers(pages, s, f, pf);
        return;
      }
    }
    setLoadingUsers(false);
  }, []);
  const fetchPayments = useCallback(async (page?: number, search?: string, status?: string) => {
    const p = page ?? 1;
    const s = search ?? "";
    const f = status ?? "all";
    const params = new URLSearchParams({ page: String(p), limit: String(PAYMENTS_PER_PAGE) });
    if (s) params.set("search", s);
    if (f && f !== "all") params.set("status", f);
    setLoadingPayments(true);
    const r = await fetch(`/api/admin/payments?${params}`);
    if (r.ok) {
      const d = await r.json();
      setAdminPayments(d.payments ?? []);
      setTotalPaymentsCount(d.total ?? 0);
      const pages = Math.max(1, Math.ceil((d.total ?? 0) / PAYMENTS_PER_PAGE));
      setTotalPaymentPages(pages);
      if (p > pages) {
        setPaymentPage(pages);
        fetchPayments(pages, s, f);
        return;
      }
    }
    setLoadingPayments(false);
  }, []);
  const fetchAffiliates = useCallback(async () => { const r = await fetch("/api/admin/affiliates"); if (r.ok) setAdminAffiliates(await r.json()); }, []);
  const fetchPromoCodes = useCallback(async () => { const r = await fetch("/api/admin/promo-codes"); if (r.ok) setAdminPromoCodes(await r.json()); }, []);
  const fetchLtdData = useCallback(async () => {
    const [codesRes, settingsRes] = await Promise.all([fetch("/api/admin/ltd/codes"), fetch("/api/admin/ltd/settings")]);
    if (codesRes.ok) setLtdCodes(await codesRes.json());
    if (settingsRes.ok) { const d = await settingsRes.json(); setLtdPageEnabled(d.ltdPageEnabled); }
  }, []);

  const refreshAll = useCallback(() => {
    setLoadingData(true);
    Promise.all([fetchStats(), fetchPlans(), fetchUsers(), fetchPayments(), fetchAffiliates(), fetchPromoCodes(), fetchLtdData()]).finally(() => setLoadingData(false));
  }, [fetchStats, fetchPlans, fetchUsers, fetchPayments, fetchAffiliates, fetchPromoCodes, fetchLtdData]);

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
      fetchUsers(userPage, userSearchApplied, userTypeFilter);
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
      fetchUsers(userPage, userSearchApplied, userTypeFilter); fetchStats();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally {
      setDeletingUserId(null);
    }
  };

  // ── Bulk user actions ─────────────────────────────────────────────────────
  const bulkDelete = async () => {
    const ids = Array.from(selectedUserIds);
    if (!ids.length) return;
    if (!confirm(`Permanently delete ${ids.length} user(s)? This cannot be undone.`)) return;
    setBulkActionLoading(true);
    try {
      const r = await fetch("/api/admin/users/bulk-delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: j.message });
      setSelectedUserIds(new Set());
      fetchUsers(userPage, userSearchApplied, userTypeFilter); fetchStats();
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBulkActionLoading(false); }
  };

  const bulkToggleStatus = async (disable: boolean) => {
    const ids = Array.from(selectedUserIds);
    if (!ids.length) return;
    setBulkActionLoading(true);
    try {
      const r = await fetch("/api/admin/users/bulk-toggle-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, disable }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: j.message });
      setSelectedUserIds(new Set());
      fetchUsers(userPage, userSearchApplied, userTypeFilter);
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setBulkActionLoading(false); }
  };

  // ── Plan CRUD ──────────────────────────────────────────────────────────────
  const openNewPlan = () => {
    planForm.reset({ name: "", description: "", monthlyPrice: 0, yearlyPrice: 0, monthlyPriceUsd: 0, yearlyPriceUsd: 0, featuresText: "", maxLinks: 10, maxPages: 1, maxTeamMembers: 1, maxBlocks: 20, maxSocials: 5, qrCodeEnabled: false, analyticsEnabled: false, customTemplatesEnabled: false, menuBuilderEnabled: false, whiteLabelEnabled: false, planType: "individual", isActive: true, isFeatured: false, sortOrder: 0 });
    setPlanDialog({ open: true });
  };
  const openEditPlan = (plan: PricingPlan) => {
    planForm.reset({ name: plan.name, description: plan.description ?? "", monthlyPrice: parseFloat(plan.monthlyPrice), yearlyPrice: parseFloat(plan.yearlyPrice), monthlyPriceUsd: parseFloat(plan.monthlyPriceUsd ?? "0"), yearlyPriceUsd: parseFloat(plan.yearlyPriceUsd ?? "0"), featuresText: (plan.features ?? []).join("\n"), maxLinks: plan.maxLinks, maxPages: plan.maxPages, maxTeamMembers: plan.maxTeamMembers, maxBlocks: plan.maxBlocks ?? 20, maxSocials: plan.maxSocials ?? 5, qrCodeEnabled: plan.qrCodeEnabled ?? false, analyticsEnabled: plan.analyticsEnabled ?? false, customTemplatesEnabled: plan.customTemplatesEnabled ?? false, menuBuilderEnabled: plan.menuBuilderEnabled ?? false, whiteLabelEnabled: (plan as any).whiteLabelEnabled ?? false, planType: (plan.planType as "individual" | "team") ?? "individual", isActive: plan.isActive, isFeatured: plan.isFeatured, sortOrder: plan.sortOrder });
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

  const paginatedUsers = adminUsers;

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
            <p className="text-xs text-muted-foreground truncate">VisiCardly</p>
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
                  <p className="text-muted-foreground text-sm">{totalUsersCount} users{userSearchApplied || userTypeFilter !== "all" ? " (filtered)" : ""}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 w-56"
                      placeholder="Search name or email…"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setUserSearchApplied(userSearchQuery);
                          setUserPage(1);
                          fetchUsers(1, userSearchQuery, userTypeFilter);
                        }
                      }}
                    />
                  </div>
                  <Select value={userTypeFilter} onValueChange={(v) => { setUserTypeFilter(v); setUserPage(1); fetchUsers(1, userSearchApplied, v, userPlanFilter); }}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="team">Team</SelectItem>
                      <SelectItem value="disabled">Disabled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userPlanFilter} onValueChange={(v) => { setUserPlanFilter(v); setUserPage(1); fetchUsers(1, userSearchApplied, userTypeFilter, v); }}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by plan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Plans</SelectItem>
                      <SelectItem value="free">Free</SelectItem>
                      {plans.filter((p) => p.name.toLowerCase() !== "free").map((p) => (
                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" disabled={exportingUsers} onClick={async () => {
                    setExportingUsers(true);
                    try {
                      const params = new URLSearchParams({ limit: "10000" });
                      if (userSearchApplied) params.set("search", userSearchApplied);
                      if (userTypeFilter !== "all") params.set("accountType", userTypeFilter);
                      if (userPlanFilter !== "all") params.set("planName", userPlanFilter);
                      const r = await fetch(`/api/admin/users?${params}`);
                      if (!r.ok) throw new Error("Export failed");
                      const d = await r.json();
                      const rows = (d.users || []).map((u: UserRow) => [
                        u.displayName || u.username, u.email, u.accountType, u.subscription?.planName || "Free",
                        u.isLtd ? "Yes" : "No",
                        u.isDisabled ? "Disabled" : (u.subscription?.status || "N/A"),
                        u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"
                      ]);
                      const csv = ["\uFEFFName,Email,Type,Plan,LTD,Status,Registered", ...rows.map((r: string[]) => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url; a.download = `users-export-${new Date().toISOString().split("T")[0]}.csv`; a.click();
                      URL.revokeObjectURL(url);
                      toast({ title: "Users exported!" });
                    } catch (err: any) {
                      toast({ title: "Export failed", description: err.message, variant: "destructive" });
                    }
                    setExportingUsers(false);
                  }}>
                    {exportingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {/* Bulk action toolbar */}
              {selectedUserIds.size > 0 && (() => {
                const selectedUsers = adminUsers.filter(u => selectedUserIds.has(u.id));
                const activeCount = selectedUsers.filter(u => !u.isDisabled).length;
                const disabledCount = selectedUsers.filter(u => u.isDisabled).length;
                return (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/20 rounded-lg flex-wrap">
                    <span className="text-sm font-medium text-foreground">
                      {selectedUserIds.size} selected
                      {activeCount > 0 && disabledCount > 0 && (
                        <span className="ml-1 text-xs text-muted-foreground">({activeCount} active, {disabledCount} disabled)</span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 ml-auto flex-wrap">
                      {activeCount > 0 && (
                        <Button size="sm" variant="outline" disabled={bulkActionLoading}
                          onClick={() => {
                            const ids = adminUsers.filter(u => selectedUserIds.has(u.id) && !u.isDisabled).map(u => u.id);
                            if (ids.length === 0) return;
                            setBulkActionLoading(true);
                            fetch("/api/admin/users/bulk-toggle-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, disable: true }) })
                              .then(r => r.json()).then(d => { toast({ title: d.message ?? "Done" }); setSelectedUserIds(new Set()); fetchUsers(); })
                              .catch(() => toast({ title: "Failed", variant: "destructive" }))
                              .finally(() => setBulkActionLoading(false));
                          }}
                          className="text-yellow-600 hover:bg-yellow-50" data-testid="button-bulk-deactivate">
                          {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserX className="h-3.5 w-3.5 mr-1" />}
                          Deactivate {activeCount > 0 && activeCount < selectedUserIds.size ? `(${activeCount})` : ""}
                        </Button>
                      )}
                      {disabledCount > 0 && (
                        <Button size="sm" variant="outline" disabled={bulkActionLoading}
                          onClick={() => {
                            const ids = adminUsers.filter(u => selectedUserIds.has(u.id) && u.isDisabled).map(u => u.id);
                            if (ids.length === 0) return;
                            setBulkActionLoading(true);
                            fetch("/api/admin/users/bulk-toggle-status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, disable: false }) })
                              .then(r => r.json()).then(d => { toast({ title: d.message ?? "Done" }); setSelectedUserIds(new Set()); fetchUsers(); })
                              .catch(() => toast({ title: "Failed", variant: "destructive" }))
                              .finally(() => setBulkActionLoading(false));
                          }}
                          className="text-green-600 hover:bg-green-50" data-testid="button-bulk-reactivate">
                          {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <UserCheck className="h-3.5 w-3.5 mr-1" />}
                          Reactivate {disabledCount > 0 && disabledCount < selectedUserIds.size ? `(${disabledCount})` : ""}
                        </Button>
                      )}
                      <Button size="sm" variant="outline" disabled={bulkActionLoading} onClick={bulkDelete}
                        className="text-destructive hover:bg-destructive/10" data-testid="button-bulk-delete">
                        {bulkActionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
                        Delete ({selectedUserIds.size})
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSelectedUserIds(new Set())} data-testid="button-clear-selection">
                        <XIcon className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })()}

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 w-10">
                          <input
                            type="checkbox"
                            className="rounded border-border cursor-pointer"
                            checked={paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUserIds.has(u.id))}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds(prev => new Set([...prev, ...paginatedUsers.map(u => u.id)]));
                              } else {
                                setSelectedUserIds(prev => { const next = new Set(prev); paginatedUsers.forEach(u => next.delete(u.id)); return next; });
                              }
                            }}
                            data-testid="checkbox-select-all"
                          />
                        </th>
                        <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Registered</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                     </thead>
                    <tbody>
                       {paginatedUsers.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                      ) : paginatedUsers.map((u) => (
                        <tr key={u.id} className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${u.isDisabled ? "opacity-60" : ""} ${selectedUserIds.has(u.id) ? "bg-primary/5" : ""}`}>
                          <td className="p-3">
                            <input
                              type="checkbox"
                              className="rounded border-border cursor-pointer"
                              checked={selectedUserIds.has(u.id)}
                              onChange={(e) => {
                                setSelectedUserIds(prev => { const next = new Set(prev); e.target.checked ? next.add(u.id) : next.delete(u.id); return next; });
                              }}
                              data-testid={`checkbox-user-${u.id}`}
                            />
                          </td>
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
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Badge variant="outline" className="text-xs capitalize">{u.accountType}</Badge>
                              {u.isLtd && <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">LTD</Badge>}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{u.subscription?.planName ?? "Free"}</td>
                          <td className="p-3 text-muted-foreground text-xs">{u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td>
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
                                title="View admin details"
                                data-testid={`button-view-user-${u.id}`}
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={() => window.open(`/${u.username}`, "_blank")}
                                title="Open public profile"
                                data-testid={`button-open-profile-${u.id}`}
                              >
                                <Link2 className="h-3.5 w-3.5" />
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
              {/* Pagination */}
              {totalUserPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-sm text-muted-foreground">
                    Page {userPage} of {totalUserPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => { const p = userPage - 1; setUserPage(p); fetchUsers(p); }}>Previous</Button>
                    {Array.from({ length: Math.min(totalUserPages, 5) }, (_, i) => {
                      const page = totalUserPages <= 5 ? i + 1 : Math.max(1, Math.min(userPage - 2, totalUserPages - 4)) + i;
                      return (
                        <Button key={page} variant={page === userPage ? "default" : "outline"} size="sm" className="w-8" onClick={() => { setUserPage(page); fetchUsers(page); }}>
                          {page}
                        </Button>
                      );
                    })}
                    <Button variant="outline" size="sm" disabled={userPage >= totalUserPages} onClick={() => { const p = userPage + 1; setUserPage(p); fetchUsers(p); }}>Next</Button>
                  </div>
                </div>
              )}
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
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                              <span>₹{parseFloat(plan.monthlyPrice).toLocaleString()}/mo</span>
                              <span>₹{parseFloat(plan.yearlyPrice).toLocaleString()}/yr</span>
                              {parseFloat(plan.monthlyPriceUsd ?? "0") > 0 && <span className="text-green-600">${parseFloat(plan.monthlyPriceUsd).toLocaleString()}/mo</span>}
                              {parseFloat(plan.yearlyPriceUsd ?? "0") > 0 && <span className="text-green-600">${parseFloat(plan.yearlyPriceUsd).toLocaleString()}/yr</span>}
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
                <p className="text-muted-foreground text-sm">{totalPaymentsCount} transactions</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <form className="flex-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); setPaymentSearchApplied(paymentSearchQuery); setPaymentPage(1); fetchPayments(1, paymentSearchQuery, paymentStatusFilter); }}>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      data-testid="input-payment-search"
                      placeholder="Search by user, email, or plan..."
                      className="pl-9"
                      value={paymentSearchQuery}
                      onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button type="submit" size="sm" data-testid="button-payment-search">
                    <Search className="h-4 w-4" />
                  </Button>
                  {paymentSearchApplied && (
                    <Button type="button" variant="ghost" size="sm" data-testid="button-payment-clear-search" onClick={() => { setPaymentSearchQuery(""); setPaymentSearchApplied(""); setPaymentPage(1); fetchPayments(1, "", paymentStatusFilter); }}>
                      <XIcon className="h-4 w-4" />
                    </Button>
                  )}
                </form>
                <Select value={paymentStatusFilter} onValueChange={(v) => { setPaymentStatusFilter(v); setPaymentPage(1); fetchPayments(1, paymentSearchApplied, v); }}>
                  <SelectTrigger className="w-[160px]" data-testid="select-payment-status">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
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
                      {loadingPayments ? (
                        <tr><td colSpan={7} className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></td></tr>
                      ) : adminPayments.length === 0 ? (
                        <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">{paymentSearchApplied || paymentStatusFilter !== "all" ? "No matching payments" : "No payments yet"}</td></tr>
                      ) : adminPayments.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30" data-testid={`row-payment-${p.id}`}>
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
                              data-testid={`button-invoice-${p.id}`}
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
              {totalPaymentPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Page {paymentPage} of {totalPaymentPages} ({totalPaymentsCount} total)</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={paymentPage <= 1} data-testid="button-payment-prev" onClick={() => { const np = paymentPage - 1; setPaymentPage(np); fetchPayments(np, paymentSearchApplied, paymentStatusFilter); }}>Previous</Button>
                    <Button variant="outline" size="sm" disabled={paymentPage >= totalPaymentPages} data-testid="button-payment-next" onClick={() => { const np = paymentPage + 1; setPaymentPage(np); fetchPayments(np, paymentSearchApplied, paymentStatusFilter); }}>Next</Button>
                  </div>
                </div>
              )}
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
                        <div className="px-6 pb-4">
                          <Button size="sm" variant="outline" className="w-full" onClick={() => {
                            setAssignPlanId("");
                            setAssignBillingCycle("monthly");
                            setAssignPaymentMethod("cash");
                            setAssignNotes("");
                            setAssignPlanDialog({ open: true, userId: d.user.id, userName: d.user.displayName || d.user.username });
                          }}>
                            <Package className="h-4 w-4 mr-1" /> Assign / Change Plan
                          </Button>
                        </div>
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

          {/* ── AFFILIATES ──────────────────────────────────────────────────────── */}
          {activeSection === "affiliates" && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Affiliate Programme</h2>
                <p className="text-muted-foreground text-sm">Assign users as affiliates, set commission rates, and track referrals.</p>
              </div>

              {/* Add affiliate with email autocomplete */}
              <Card>
                <CardContent className="pt-4">
                  <p className="text-sm font-medium text-foreground mb-3">Add New Affiliate</p>
                  <AffiliateEmailSearch
                    adminUsers={adminUsers}
                    affiliateRate={affiliateRate}
                    setAffiliateRate={setAffiliateRate}
                    onAdd={async (userId: string) => {
                      setCreatingAffiliate(true);
                      try {
                        const r = await fetch("/api/admin/affiliates", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId, commissionRate: parseFloat(affiliateRate) }),
                        });
                        const j = await r.json();
                        if (!r.ok) throw new Error(j.message);
                        toast({ title: "Affiliate created!" });
                        fetchAffiliates();
                      } catch (err: any) {
                        toast({ title: "Failed", description: err.message, variant: "destructive" });
                      }
                      setCreatingAffiliate(false);
                    }}
                    creating={creatingAffiliate}
                  />
                </CardContent>
              </Card>

              {/* Affiliates list */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Referral Code</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Commission</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Earnings</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminAffiliates.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No affiliates yet</td></tr>
                      ) : adminAffiliates.map((a) => (
                        <tr key={a.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium text-foreground">{a.displayName || a.username}</div>
                            <div className="text-xs text-muted-foreground">{a.email}</div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <code className="bg-muted px-2 py-0.5 rounded text-xs">{a.referralCode}</code>
                              <button
                                onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${a.referralCode}`); toast({ title: "Link copied!" }); }}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <Copy className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 font-medium">{parseFloat(a.commissionRate)}%</td>
                          <td className="p-3 font-medium text-foreground">₹{parseFloat(a.totalEarnings).toLocaleString()}</td>
                          <td className="p-3">
                            <Badge variant={a.isActive ? "default" : "secondary"} className="text-xs">
                              {a.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline" size="sm"
                                onClick={async () => {
                                  const r = await fetch(`/api/admin/affiliates/${a.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ isActive: !a.isActive }),
                                  });
                                  if (r.ok) { toast({ title: a.isActive ? "Deactivated" : "Activated" }); fetchAffiliates(); }
                                }}
                                title={a.isActive ? "Deactivate" : "Activate"}
                              >
                                {a.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={async () => {
                                  if (!confirm("Delete this affiliate?")) return;
                                  setDeletingAffiliateId(a.id);
                                  const r = await fetch(`/api/admin/affiliates/${a.id}`, { method: "DELETE" });
                                  if (r.ok) { toast({ title: "Affiliate removed" }); fetchAffiliates(); }
                                  setDeletingAffiliateId(null);
                                }}
                                disabled={deletingAffiliateId === a.id}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                {deletingAffiliateId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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

          {/* ── PROMO CODES ──────────────────────────────────────────────────────── */}
          {activeSection === "promo-codes" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">Promo Codes</h2>
                  <p className="text-muted-foreground text-sm">Create discount codes for your customers.</p>
                </div>
                <Button onClick={() => {
                  setPromoCode("");
                  setPromoDiscount("10");
                  setPromoMaxUses("0");
                  setPromoExpiry("");
                  setPromoDialog({ open: true });
                }}>
                  <Plus className="h-4 w-4 mr-2" /> New Promo Code
                </Button>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Discount</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Uses</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Expires</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminPromoCodes.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No promo codes yet</td></tr>
                      ) : adminPromoCodes.map((p) => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3"><code className="bg-muted px-2 py-0.5 rounded text-xs font-bold">{p.code}</code></td>
                          <td className="p-3 font-medium">{parseFloat(p.discountPercent)}%</td>
                          <td className="p-3 text-muted-foreground">{p.currentUses}{p.maxUses ? ` / ${p.maxUses}` : " / ∞"}</td>
                          <td className="p-3 text-muted-foreground text-xs">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString("en-IN") : "Never"}</td>
                          <td className="p-3">
                            <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">
                              {p.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline" size="sm"
                                onClick={async () => {
                                  const r = await fetch(`/api/admin/promo-codes/${p.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ isActive: !p.isActive }),
                                  });
                                  if (r.ok) { toast({ title: p.isActive ? "Deactivated" : "Activated" }); fetchPromoCodes(); }
                                }}
                              >
                                {p.isActive ? <XIcon className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
                              </Button>
                              <Button
                                variant="outline" size="sm"
                                onClick={async () => {
                                  if (!confirm("Delete this promo code?")) return;
                                  setDeletingPromoId(p.id);
                                  const r = await fetch(`/api/admin/promo-codes/${p.id}`, { method: "DELETE" });
                                  if (r.ok) { toast({ title: "Promo code deleted" }); fetchPromoCodes(); }
                                  setDeletingPromoId(null);
                                }}
                                disabled={deletingPromoId === p.id}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                {deletingPromoId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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

          {/* ── LTD CODES ─────────────────────────────────────────────────────── */}
          {activeSection === "ltd-codes" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-2xl font-bold text-foreground">LTD Codes</h2>
                  <p className="text-muted-foreground text-sm">Manage lifetime deal redemption codes and registration page visibility.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => { setLtdBulkDialog(true); setLtdBulkCount("10"); setLtdBulkPrefix("LTD"); setLtdBulkPlanId("__none__"); setLtdBulkNotes(""); setLtdBulkResult(null); }} data-testid="button-bulk-ltd-codes">
                    <Download className="h-4 w-4 mr-2" /> Bulk Generate
                  </Button>
                  <Button onClick={() => { setLtdCreateDialog(true); setLtdNewCode(""); setLtdNewPlanId("__none__"); setLtdNewNotes(""); }} data-testid="button-new-ltd-code">
                    <Plus className="h-4 w-4 mr-2" /> New Code
                  </Button>
                </div>
              </div>

              {/* Page visibility toggle */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Globe className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-foreground">Registration Page</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Controls whether <code className="text-xs bg-muted px-1 py-0.5 rounded">/ltd-register</code> is publicly accessible.
                        When disabled, visitors see a "not available" message.
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-medium ${ltdPageEnabled ? "text-green-600" : "text-muted-foreground"}`}>
                        {ltdPageEnabled ? "Enabled" : "Disabled"}
                      </span>
                      <button
                        disabled={ltdPageLoading}
                        onClick={async () => {
                          setLtdPageLoading(true);
                          try {
                            const r = await fetch("/api/admin/ltd/settings", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ ltdPageEnabled: !ltdPageEnabled }),
                            });
                            if (r.ok) { setLtdPageEnabled(!ltdPageEnabled); toast({ title: !ltdPageEnabled ? "Page enabled" : "Page disabled" }); }
                          } finally { setLtdPageLoading(false); }
                        }}
                        data-testid="button-toggle-ltd-page"
                        className="focus:outline-none"
                      >
                        {ltdPageLoading
                          ? <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                          : ltdPageEnabled
                            ? <ToggleRight className="h-10 w-10 text-primary cursor-pointer" />
                            : <ToggleLeft className="h-10 w-10 text-muted-foreground cursor-pointer" />}
                      </button>
                    </div>
                  </div>
                  {ltdPageEnabled && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">Registration URL:</p>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1">{window.location.origin}/ltd-register</code>
                        <Button variant="ghost" size="sm" className="h-7 px-2"
                          onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/ltd-register`); toast({ title: "URL copied!" }); }}>
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2"
                          onClick={() => window.open("/ltd-register", "_blank")}>
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Codes list */}
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-muted-foreground">Code</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Usage</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Notes</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ltdCodes.length === 0 ? (
                        <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No LTD codes yet. Create one to get started.</td></tr>
                      ) : ltdCodes.map(c => (
                        <tr key={c.id} className={`border-b last:border-0 hover:bg-muted/20 ${!c.isActive ? "opacity-60" : ""}`}>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Key className="h-3.5 w-3.5 text-muted-foreground" />
                              <span className="font-mono font-semibold text-foreground">{c.code}</span>
                              <button onClick={() => { navigator.clipboard.writeText(c.code); toast({ title: "Copied!" }); }}>
                                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{c.planName ?? <span className="italic">None</span>}</td>
                          <td className="p-3">
                            <span className={`font-medium ${c.currentUses >= c.maxUses ? "text-destructive" : "text-foreground"}`}>
                              {c.currentUses}/{c.maxUses}
                            </span>
                            {c.currentUses >= c.maxUses && <span className="ml-1 text-xs text-destructive">(full)</span>}
                          </td>
                          <td className="p-3">
                            {c.isActive && c.currentUses < c.maxUses
                              ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                              : c.isActive && c.currentUses >= c.maxUses
                                ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Exhausted</span>
                                : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">Inactive</span>
                            }
                          </td>
                          <td className="p-3 text-muted-foreground text-xs max-w-[150px] truncate">{c.notes ?? "—"}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <Button variant="outline" size="sm"
                                onClick={async () => {
                                  const r = await fetch(`/api/admin/ltd/codes/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !c.isActive }) });
                                  if (r.ok) { toast({ title: c.isActive ? "Deactivated" : "Activated" }); fetchLtdData(); }
                                }}
                                className={c.isActive ? "text-yellow-600 hover:bg-yellow-50" : "text-green-600 hover:bg-green-50"}
                                data-testid={`button-toggle-ltd-${c.id}`}>
                                {c.isActive ? <ToggleLeft className="h-3.5 w-3.5" /> : <ToggleRight className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="outline" size="sm"
                                disabled={ltdDeletingId === c.id}
                                onClick={async () => {
                                  if (!confirm(`Delete code "${c.code}"?`)) return;
                                  setLtdDeletingId(c.id);
                                  const r = await fetch(`/api/admin/ltd/codes/${c.id}`, { method: "DELETE" });
                                  if (r.ok) { toast({ title: "Code deleted" }); fetchLtdData(); }
                                  setLtdDeletingId(null);
                                }}
                                className="text-destructive hover:bg-destructive/10"
                                data-testid={`button-delete-ltd-${c.id}`}>
                                {ltdDeletingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Create LTD Code Dialog */}
              <Dialog open={ltdCreateDialog} onOpenChange={setLtdCreateDialog}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-primary" /> Create LTD Code
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">Each code can only be redeemed once by a single user.</p>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label>Code <span className="text-destructive">*</span></Label>
                      <Input placeholder="VISI-LTD-2024" value={ltdNewCode}
                        onChange={e => setLtdNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))}
                        data-testid="input-ltd-code" />
                      <p className="text-xs text-muted-foreground">Letters, numbers, hyphens and underscores only</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Linked Plan (optional)</Label>
                      <Select value={ltdNewPlanId} onValueChange={setLtdNewPlanId}>
                        <SelectTrigger data-testid="select-ltd-plan">
                          <SelectValue placeholder="No plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No plan (grant LTD access only)</SelectItem>
                          {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">User will be subscribed to this plan for life on registration</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Notes (optional)</Label>
                      <Textarea placeholder="e.g. AppSumo batch 1" value={ltdNewNotes} onChange={e => setLtdNewNotes(e.target.value)} rows={2} data-testid="input-ltd-notes" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setLtdCreateDialog(false)}>Cancel</Button>
                    <Button disabled={ltdSaving || !ltdNewCode.trim()} onClick={async () => {
                      setLtdSaving(true);
                      try {
                        const resolvedPlanId = ltdNewPlanId && ltdNewPlanId !== "__none__" ? ltdNewPlanId : undefined;
                        const r = await fetch("/api/admin/ltd/codes", {
                          method: "POST", headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ code: ltdNewCode.trim(), planId: resolvedPlanId, notes: ltdNewNotes || undefined }),
                        });
                        const d = await r.json();
                        if (!r.ok) throw new Error(d.message);
                        toast({ title: "Code created!" });
                        setLtdCreateDialog(false);
                        fetchLtdData();
                      } catch (err: any) {
                        toast({ title: "Failed", description: err.message, variant: "destructive" });
                      } finally { setLtdSaving(false); }
                    }} data-testid="button-save-ltd-code">
                      {ltdSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      Create Code
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Bulk Generate Dialog */}
              <Dialog open={ltdBulkDialog} onOpenChange={(o) => { setLtdBulkDialog(o); if (!o) setLtdBulkResult(null); }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-primary" /> Bulk Generate Codes
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">Generate multiple unique single-use LTD codes at once.</p>
                  </DialogHeader>
                  {ltdBulkResult ? (
                    <div className="space-y-3">
                      <p className="text-sm text-green-600 font-medium">{ltdBulkResult.length} codes generated successfully!</p>
                      <div className="bg-muted rounded p-3 max-h-48 overflow-y-auto">
                        <div className="font-mono text-xs space-y-1">
                          {ltdBulkResult.map(c => <div key={c} className="flex items-center justify-between">
                            <span>{c}</span>
                            <button onClick={() => { navigator.clipboard.writeText(c); }}><Copy className="h-3 w-3 text-muted-foreground" /></button>
                          </div>)}
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="w-full" onClick={() => {
                        navigator.clipboard.writeText(ltdBulkResult.join("\n"));
                        toast({ title: "All codes copied to clipboard!" });
                      }}>
                        <Copy className="h-3.5 w-3.5 mr-2" /> Copy All Codes
                      </Button>
                      <Button className="w-full" onClick={() => { setLtdBulkDialog(false); setLtdBulkResult(null); fetchLtdData(); }}>Done</Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label>Number of Codes</Label>
                            <Input type="number" min="1" max="500" value={ltdBulkCount} onChange={e => setLtdBulkCount(e.target.value)} data-testid="input-bulk-count" placeholder="10" />
                          </div>
                          <div className="space-y-1.5">
                            <Label>Code Prefix</Label>
                            <Input value={ltdBulkPrefix} onChange={e => setLtdBulkPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))} placeholder="LTD" data-testid="input-bulk-prefix" />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground -mt-2">Preview: <span className="font-mono font-semibold">{(ltdBulkPrefix || "LTD").toUpperCase()}-A1B2C3D4</span></p>
                        <div className="space-y-1.5">
                          <Label>Linked Plan (optional)</Label>
                          <Select value={ltdBulkPlanId} onValueChange={setLtdBulkPlanId}>
                            <SelectTrigger data-testid="select-bulk-plan">
                              <SelectValue placeholder="No plan" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No plan (grant LTD access only)</SelectItem>
                              {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Notes (optional)</Label>
                          <Input value={ltdBulkNotes} onChange={e => setLtdBulkNotes(e.target.value)} placeholder="e.g. AppSumo batch 1" data-testid="input-bulk-notes" />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLtdBulkDialog(false)}>Cancel</Button>
                        <Button disabled={ltdSaving} onClick={async () => {
                          setLtdSaving(true);
                          try {
                            const resolvedPlanId = ltdBulkPlanId && ltdBulkPlanId !== "__none__" ? ltdBulkPlanId : undefined;
                            const r = await fetch("/api/admin/ltd/codes/bulk", {
                              method: "POST", headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ count: parseInt(ltdBulkCount) || 1, prefix: ltdBulkPrefix || "LTD", planId: resolvedPlanId, notes: ltdBulkNotes || undefined }),
                            });
                            const d = await r.json();
                            if (!r.ok) throw new Error(d.message);
                            setLtdBulkResult(d.generated || []);
                            toast({ title: d.message });
                          } catch (err: any) {
                            toast({ title: "Failed", description: err.message, variant: "destructive" });
                          } finally { setLtdSaving(false); }
                        }} data-testid="button-bulk-generate">
                          {ltdSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
                          Generate Codes
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
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
            <RazorpaySettingsSection admin={admin} />
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
                    <p className="font-bold text-lg text-foreground">VisiCardly</p>
                    <p className="text-xs text-muted-foreground">visicardly.com</p>
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
              <div className="space-y-1.5"><Label>Monthly Price (₹ INR)</Label><Input type="number" min="0" step="0.01" {...planForm.register("monthlyPrice")} /></div>
              <div className="space-y-1.5"><Label>Yearly Price (₹ INR)</Label><Input type="number" min="0" step="0.01" {...planForm.register("yearlyPrice")} /></div>
              <div className="space-y-1.5"><Label>Monthly Price ($ USD)</Label><Input type="number" min="0" step="0.01" {...planForm.register("monthlyPriceUsd")} /></div>
              <div className="space-y-1.5"><Label>Yearly Price ($ USD)</Label><Input type="number" min="0" step="0.01" {...planForm.register("yearlyPriceUsd")} /></div>
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
              <div className="flex items-center gap-3"><Switch checked={planForm.watch("whiteLabelEnabled")} onCheckedChange={(v) => planForm.setValue("whiteLabelEnabled", v)} /><Label>White Label</Label></div>
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

      {/* ── Promo Code Dialog ──────────────────────────────────────────────── */}
      <Dialog open={promoDialog.open} onOpenChange={(open) => setPromoDialog({ open })}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{promoDialog.promo ? "Edit Promo Code" : "New Promo Code"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input
                placeholder="e.g. WELCOME20"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={!!promoDialog.promo}
                className="uppercase"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Discount Percentage (%)</Label>
              <Input type="number" min="1" max="100" value={promoDiscount} onChange={(e) => setPromoDiscount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Max Uses (0 = unlimited)</Label>
              <Input type="number" min="0" value={promoMaxUses} onChange={(e) => setPromoMaxUses(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date (optional)</Label>
              <Input type="date" value={promoExpiry} onChange={(e) => setPromoExpiry(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoDialog({ open: false })}>Cancel</Button>
            <Button
              disabled={savingPromo || !promoCode.trim()}
              onClick={async () => {
                setSavingPromo(true);
                try {
                  const res = await fetch("/api/admin/promo-codes", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      code: promoCode,
                      discountPercent: parseFloat(promoDiscount),
                      maxUses: parseInt(promoMaxUses),
                      expiresAt: promoExpiry || undefined,
                    }),
                  });
                  const j = await res.json();
                  if (!res.ok) throw new Error(j.message);
                  toast({ title: "Promo code created!" });
                  setPromoDialog({ open: false });
                  fetchPromoCodes();
                } catch (err: any) {
                  toast({ title: "Failed", description: err.message, variant: "destructive" });
                }
                setSavingPromo(false);
              }}
            >
              {savingPromo ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Assign Plan Dialog ────────────────────────────────────────────── */}
      <Dialog open={assignPlanDialog.open} onOpenChange={(open) => setAssignPlanDialog({ open })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" /> Assign Plan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign a plan to <span className="font-semibold text-foreground">{assignPlanDialog.userName}</span>
            </p>
            <div className="space-y-1.5">
              <Label>Select Plan</Label>
              <Select value={assignPlanId} onValueChange={setAssignPlanId}>
                <SelectTrigger><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter(p => p.isActive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — ₹{parseFloat(p.monthlyPrice).toLocaleString()}/mo
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Billing Cycle</Label>
              <Select value={assignBillingCycle} onValueChange={setAssignBillingCycle}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment Method</Label>
              <Select value={assignPaymentMethod} onValueChange={setAssignPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="free">Free / Complimentary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes / Reference</Label>
              <Textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="e.g. Payment received via cash on 15-Feb, Receipt #123"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignPlanDialog({ open: false })}>Cancel</Button>
            <Button
              disabled={!assignPlanId || assigningPlan}
              onClick={async () => {
                setAssigningPlan(true);
                try {
                  const r = await fetch(`/api/admin/users/${assignPlanDialog.userId}/assign-plan`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      planId: assignPlanId,
                      billingCycle: assignBillingCycle,
                      paymentMethod: assignPaymentMethod,
                      notes: assignNotes,
                    }),
                  });
                  const j = await r.json();
                  if (!r.ok) throw new Error(j.message);
                  toast({ title: "Plan assigned!", description: j.message });
                  setAssignPlanDialog({ open: false });
                  // Refresh user detail
                  if (assignPlanDialog.userId) {
                    openUserDetail(assignPlanDialog.userId);
                  }
                  fetchUsers();
                  fetchStats();
                  fetchPayments();
                } catch (err: any) {
                  toast({ title: "Failed to assign plan", description: err.message, variant: "destructive" });
                }
                setAssigningPlan(false);
              }}
            >
              {assigningPlan ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Assign Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          {/* ── EMAIL BLAST ──────────────────────────────────────────────────── */}
          {activeSection === "email-blast" && (
            <EmailBlastSection plans={plans} />
          )}

    </div>
  );
}

// ── Email Blast Section ──────────────────────────────────────────────
function EmailBlastSection({ plans }: { plans: PricingPlan[] }) {
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [recipientMode, setRecipientMode] = useState<"all" | "plan" | "manual">("manual");
  const [selectedPlanFilter, setSelectedPlanFilter] = useState("all");
  const [manualEmails, setManualEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; email: string; username: string; displayName?: string }[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; email: string; username: string; displayName?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const r = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}&limit=10`);
      if (r.ok) {
        const d = await r.json();
        setSearchResults((d.users || []).filter((u: any) => !selectedUsers.some(s => s.id === u.id)));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedUsers]);

  const addUser = (user: { id: string; email: string; username: string; displayName?: string }) => {
    if (!selectedUsers.some(s => s.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
    setShowDropdown(false);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Missing fields", description: "Subject and body are required.", variant: "destructive" });
      return;
    }

    let emails: string[] = [];
    if (recipientMode === "manual") {
      emails = selectedUsers.map(u => u.email);
      if (emails.length === 0) {
        toast({ title: "No recipients", description: "Please select at least one user.", variant: "destructive" });
        return;
      }
    }

    setSending(true);
    try {
      const r = await fetch("/api/admin/email-blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          recipientMode,
          planFilter: recipientMode === "plan" ? selectedPlanFilter : undefined,
          emails: recipientMode === "manual" ? emails : undefined,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: "Emails sent!", description: j.message });
    } catch (err: any) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    }
    setSending(false);
  };

  const insertVariable = (variable: string) => {
    setBody(prev => prev + `{{${variable}}}`);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Email Blast</h2>
        <p className="text-muted-foreground text-sm">Compose and send emails to users. Use variables like {"{{username}}"}, {"{{email}}"}, {"{{displayName}}"} in the body.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recipients</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={recipientMode} onValueChange={(v: "all" | "plan" | "manual") => setRecipientMode(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">Select Users</SelectItem>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="plan">By Plan</SelectItem>
            </SelectContent>
          </Select>

          {recipientMode === "plan" && (
            <Select value={selectedPlanFilter} onValueChange={setSelectedPlanFilter}>
              <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                {plans.filter(p => p.name.toLowerCase() !== "free").map(p => (
                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {recipientMode === "manual" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                />
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2 transition-colors"
                        onMouseDown={(e) => { e.preventDefault(); addUser(user); }}
                      >
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="text-foreground truncate block">{user.email}</span>
                          <span className="text-xs text-muted-foreground">@{user.username}{user.displayName ? ` · ${user.displayName}` : ""}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map(u => (
                    <span key={u.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 text-primary text-sm">
                      {u.displayName || u.username} ({u.email})
                      <button onClick={() => removeUser(u.id)} className="shrink-0">
                        <XIcon className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Email Content</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Important update from VisiCardly" />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Body (HTML supported)</Label>
              <div className="flex gap-1">
                {["username", "email", "displayName"].map(v => (
                  <Button key={v} type="button" variant="outline" size="sm" className="text-xs h-6 px-2" onClick={() => insertVariable(v)}>
                    {`{{${v}}}`}
                  </Button>
                ))}
              </div>
            </div>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={`Hello {{username}},\n\nWe have an exciting update for you!\n\nBest regards,\nVisiCardly Team`}
              rows={10}
            />
          </div>
          <Button className="w-full" disabled={sending || !subject.trim() || !body.trim()} onClick={handleSend}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Send Email{recipientMode === "manual" && selectedUsers.length > 0 ? ` to ${selectedUsers.length} user(s)` : ""}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Razorpay Settings Section ──────────────────────────────────────────────
function RazorpaySettingsSection({ admin }: { admin: { name: string; email: string } }) {
  const { toast } = useToast();
  const [keyId, setKeyId] = useState("");
  const [keySecret, setKeySecret] = useState("");
  const [environment, setEnvironment] = useState("test");
  const [saving, setSaving] = useState(false);
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/payment-keys")
      .then(r => r.ok ? r.json() : {})
      .then((data: Record<string, string>) => {
        setMaskedKeys(data);
        if (data.razorpay_environment) setEnvironment(data.razorpay_environment);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, string> = { razorpayEnvironment: environment };
      if (keyId.trim()) body.razorpayKeyId = keyId.trim();
      if (keySecret.trim()) body.razorpayKeySecret = keySecret.trim();
      const r = await fetch("/api/admin/settings/payment-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: "Payment keys saved!" });
      setKeyId("");
      setKeySecret("");
      // Refresh masked keys
      const r2 = await fetch("/api/admin/settings/payment-keys");
      if (r2.ok) setMaskedKeys(await r2.json());
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground text-sm">Manage your admin account and payment integrations.</p>
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
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Environment</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="test">Test (Sandbox)</SelectItem>
                <SelectItem value="live">Live (Production)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {environment === "test" ? "Use test keys for development. No real payments." : "⚠️ Live mode — real payments will be processed."}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Razorpay Key ID</Label>
            {maskedKeys.razorpay_key_id && (
              <p className="text-xs text-muted-foreground mb-1">Current: <code className="bg-muted px-1 rounded">{maskedKeys.razorpay_key_id}</code></p>
            )}
            <Input
              value={keyId}
              onChange={(e) => setKeyId(e.target.value)}
              placeholder={maskedKeys.razorpay_key_id ? "Leave empty to keep current" : "rzp_test_xxxxx or rzp_live_xxxxx"}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Razorpay Key Secret</Label>
            {maskedKeys.razorpay_key_secret && (
              <p className="text-xs text-muted-foreground mb-1">Current: <code className="bg-muted px-1 rounded">{maskedKeys.razorpay_key_secret}</code></p>
            )}
            <Input
              type="password"
              value={keySecret}
              onChange={(e) => setKeySecret(e.target.value)}
              placeholder={maskedKeys.razorpay_key_secret ? "Leave empty to keep current" : "Enter secret key"}
            />
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Payment Gateway Settings
          </Button>
        </CardContent>
      </Card>

      <CleanSignupsSettings />

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
  );
}

// ── CleanSignups Settings ──────────────────────────────────────────────────
function CleanSignupsSettings() {
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [isSet, setIsSet] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/cleansignups-key")
      .then(r => r.ok ? r.json() : { masked: "", isSet: false })
      .then((data: { masked: string; isSet: boolean }) => {
        setMaskedKey(data.masked);
        setIsSet(data.isSet);
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings/cleansignups-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: j.message });
      setApiKey("");
      // Refresh
      const r2 = await fetch("/api/admin/settings/cleansignups-key");
      if (r2.ok) {
        const d = await r2.json();
        setMaskedKey(d.masked);
        setIsSet(d.isSet);
      }
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const handleDisable = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/admin/settings/cleansignups-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "" }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message);
      toast({ title: "Email verification disabled" });
      setMaskedKey("");
      setIsSet(false);
      setApiKey("");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Email Verification (CleanSignups)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Block temporary/disposable emails during sign-up. Get your API key from{" "}
          <a href="https://cleansignups.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">cleansignups.com</a>.
          {!isSet && " If no key is set, verification is skipped."}
        </p>

        {isSet && maskedKey && (
          <p className="text-xs text-muted-foreground">Current key: <code className="bg-muted px-1 rounded">{maskedKey}</code></p>
        )}

        <div className="space-y-1.5">
          <Label className="text-xs">API Key</Label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder={isSet ? "Leave empty to keep current" : "Enter CleanSignups API key"}
          />
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isSet ? "Update Key" : "Enable Verification"}
          </Button>
          {isSet && (
            <Button variant="outline" onClick={handleDisable} disabled={saving}>
              Disable
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Affiliate Email Search with Autocomplete ─────────────────────────────────
function AffiliateEmailSearch({
  adminUsers,
  affiliateRate,
  setAffiliateRate,
  onAdd,
  creating,
}: {
  adminUsers: UserRow[];
  affiliateRate: string;
  setAffiliateRate: (v: string) => void;
  onAdd: (userId: string) => void;
  creating: boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; email: string; username: string; displayName?: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchTimer, setSearchTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = (q: string) => {
    if (q.length < 2) { setResults([]); setShowDropdown(false); return; }
    // Search from loaded users first for instant results
    const local = adminUsers.filter(u =>
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      u.username.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8);
    setResults(local);
    setShowDropdown(true);
    // Also hit server for better results
    fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`)
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: string; email: string; username: string; displayName?: string }[]) => {
        if (data.length > 0) {
          setResults(data);
        }
      })
      .catch(() => {});
  };

  const handleInputChange = (value: string) => {
    setQuery(value);
    setSelectedUserId("");
    if (searchTimer) clearTimeout(searchTimer);
    setSearchTimer(setTimeout(() => doSearch(value), 300));
  };

  const selectUser = (user: { id: string; email: string; username: string; displayName?: string }) => {
    setQuery(user.email);
    setSelectedUserId(user.id);
    setShowDropdown(false);
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="space-y-1 flex-1 min-w-[200px] relative">
        <Label className="text-xs">User ID or Email</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Type email to search..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            className="pl-9"
          />
        </div>
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
            {results.map((user) => (
              <button
                key={user.id}
                className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex items-center gap-2 transition-colors"
                onMouseDown={(e) => { e.preventDefault(); selectUser(user); }}
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <span className="text-foreground truncate block">{user.email}</span>
                  <span className="text-xs text-muted-foreground">@{user.username}{user.displayName ? ` · ${user.displayName}` : ""}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="space-y-1 w-32">
        <Label className="text-xs">Commission %</Label>
        <Input type="number" min="0" max="100" value={affiliateRate} onChange={(e) => setAffiliateRate(e.target.value)} />
      </div>
      <Button
        disabled={creating || (!selectedUserId && !query.trim())}
        onClick={() => {
          const userId = selectedUserId || query.trim();
          if (userId) {
            // If it's an email, try to find from results
            if (!selectedUserId && query.includes("@")) {
              const match = results.find(r => r.email.toLowerCase() === query.toLowerCase());
              if (match) {
                onAdd(match.id);
                setQuery("");
                setSelectedUserId("");
                return;
              }
            }
            onAdd(userId);
            setQuery("");
            setSelectedUserId("");
          }
        }}
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
        Add
      </Button>
    </div>
  );
}
