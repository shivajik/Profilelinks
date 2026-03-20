import { useState, useEffect, useRef } from "react";
import { toPng } from "html-to-image";
import { useLocation, Redirect, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import logoPath from "/logo.png";
import { TEMPLATES, getTemplate, LAYOUT_LABELS, THEME_CATEGORIES } from "@/lib/templates";
import type { LayoutType, ThemeCategory } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  LogOut,
  Copy,
  Check,
  Loader2,
  Link2,
  Camera,
  X,
  Palette,
  Settings,
  BarChart3,
  QrCode,
  Monitor,
  Smartphone,
  ChevronDown,
  HelpCircle,
  FileText,
  Home,
  Mail,
  Type,
  Minus,
  Video,
  Music,
  ImageIcon,
  Download,
  Globe,
  Eye,
  ExternalLink,
  User as UserIcon,
  MousePointerClick,
  Upload,
  Share2,
  Circle,
  Square,
  Shield,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Users,
  LayoutTemplate,
  BookUser,
  Search,
  Phone,
  Building2,
  UserPlus,
  Send,
  CreditCard,
  MoreVertical,
  MapPin,
  UtensilsCrossed,
  Lock,
  Briefcase,
  BadgeCheck,
  Key,
  EyeOff,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  SidebarProvider,
  SidebarTrigger,
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { QRCodeSVG } from "qrcode.react";
import { Slider } from "@/components/ui/slider";
import { QR_TEMPLATES, QR_TEMPLATE_CATEGORIES, type QRTemplate, type QRTemplateCategory } from "@/lib/qr-templates";
import { SOCIAL_PLATFORMS, getPlatform } from "@/lib/social-platforms";
import { SocialIcon } from "@/components/social-icon";
import type { Link, Social, Page, Block, BlockContent, BlockType } from "@shared/schema";
import { BLOCK_TYPES } from "@shared/schema";
import { BillingSection } from "@/components/billing-section";
import { BranchManager } from "@/components/branch-manager";
import { CsvImportExport } from "@/components/csv-import-export";
import { PlanUsageBanner, canPerformAction, LimitReachedDialog } from "@/components/plan-usage-banner";
import { usePlanLimits, type PlanLimits } from "@/hooks/use-plan-limits";
import { MenuBuilder, MenuAppearancePanel } from "@/components/menu-builder";
import { BusinessProfileSection } from "@/components/business-profile-section";
import { TeamProfileLayout } from "@/components/team-profile-layouts";

function normalizeUrl(url: string): string {
  if (!url) return "#";
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    let videoId = "";
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtube-nocookie.com")) {
      videoId = u.searchParams.get("v") || "";
      if (!videoId && u.pathname.startsWith("/embed/")) {
        videoId = u.pathname.split("/embed/")[1];
      }
    } else if (u.hostname === "youtu.be") {
      videoId = u.pathname.slice(1);
    }
    if (videoId) return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {}
  return null;
}

function getVimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return null;
}

function FeatureLockedPanel({ feature, description, onNavigateBilling }: { feature: string; description: string; onNavigateBilling?: () => void }) {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{feature} — Locked</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      <p className="text-sm text-muted-foreground mb-4">Upgrade your plan to unlock this feature.</p>
      <Button onClick={() => onNavigateBilling ? onNavigateBilling() : navigate("/pricing")}>View Plans</Button>
    </div>
  );
}

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [addingBlock, setAddingBlock] = useState(false);
  const [addingSocial, setAddingSocial] = useState(false);
  const [copied, setCopied] = useState(false);
  const search = useSearch();
  const [activeSection, setActiveSection] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("section") || "design";
  });

  // Reactively sync section from URL (handles navigation from onboarding, etc.)
  useEffect(() => {
    const section = new URLSearchParams(search).get("section");
    if (section) {
      setActiveSection(section);
    }
  }, [search]);
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const handlePreviewMode = (mode: "mobile" | "desktop") => {
    setPreviewMode(mode);
    if (mode === "desktop") {
      setSidebarOpen(false);
    }
  };
  const [headerName, setHeaderName] = useState("");
  const [headerBio, setHeaderBio] = useState("");
  const [headerDirty, setHeaderDirty] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [managingPages, setManagingPages] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    theme: true,
    page: true,
    header: true,
    socials: true,
    blocks: true,
  });

  const { data: userPages = [] } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
    enabled: !!user,
  });

  const currentPage = selectedPageId
    ? userPages.find((p) => p.id === selectedPageId)
    : userPages.find((p) => p.isHome) || userPages[0];

  useEffect(() => {
    if (userPages.length > 0 && !selectedPageId) {
      const home = userPages.find((p) => p.isHome) || userPages[0];
      setSelectedPageId(home.id);
    }
  }, [userPages, selectedPageId]);

  const { data: pageBlocks = [], isLoading: blocksLoading } = useQuery<Block[]>({
    queryKey: ["/api/blocks", { pageId: currentPage?.id }],
    queryFn: async () => {
      if (!currentPage) return [];
      const res = await fetch(`/api/blocks?pageId=${currentPage.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch blocks");
      return res.json();
    },
    enabled: !!user && !!currentPage,
  });

  const { data: userSocials = [] } = useQuery<Social[]>({
    queryKey: ["/api/socials"],
    enabled: !!user,
  });

  const { data: planLimits } = usePlanLimits();

  // Fetch team data for business type
  const { data: teamData } = useQuery<any>({
    queryKey: ["/api/teams", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return null;
      const res = await fetch(`/api/teams/${user.teamId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.teamId,
  });

  // Check if user is a member of any team (for non-owners)
  const { data: businessProfileData } = useQuery<any>({
    queryKey: ["/api/auth/business-profile"],
    enabled: !!user,
  });

  // Fetch team templates for live preview (team owners)
  const { data: teamTemplatesForPreview } = useQuery<any[]>({
    queryKey: ["/api/teams", user?.teamId, "templates"],
    queryFn: async () => {
      if (!user?.teamId) return [];
      const res = await fetch(`/api/teams/${user.teamId}/templates`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.teamId,
  });

  const [isAffiliate, setIsAffiliate] = useState(false);
  const [affiliateData, setAffiliateData] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/affiliate/dashboard", { credentials: "include" })
      .then(r => { if (r.ok) return r.json(); throw new Error(); })
      .then(d => { setIsAffiliate(true); setAffiliateData(d); })
      .catch(() => setIsAffiliate(false));
  }, [user]);

  useEffect(() => {
    if (user) {
      // For team members, use business profile data instead of personal profile
      if (user.accountType === "team" && user.teamId && businessProfileData?.member) {
        setHeaderName(businessProfileData.member.businessName || user.displayName || "");
        setHeaderBio(businessProfileData.member.businessBio || user.bio || "");
      } else {
        setHeaderName(user.displayName || "");
        setHeaderBio(user.bio || "");
      }
    }
  }, [user, businessProfileData]);

  const profileMutation = useMutation({
    mutationFn: async (data: { displayName?: string | null; bio?: string | null; profileImage?: string | null; coverImage?: string | null; useOriginalSocialColors?: boolean }) => {
      await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/business-profile"] });
      setHeaderDirty(false);
      toast({ title: "Profile updated!" });
    },
  });

  const addSocialMutation = useMutation({
    mutationFn: async (data: { platform: string; url: string }) => {
      await apiRequest("POST", "/api/socials", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
      adjustPlanLimit('currentSocials', 1);
    },
  });

  const updateSocialMutation = useMutation({
    mutationFn: async ({ id, url }: { id: string; url: string }) => {
      await apiRequest("PATCH", `/api/socials/${id}`, { url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
      toast({ title: "Social updated!" });
    },
  });

  const deleteSocialMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/socials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
      adjustPlanLimit('currentSocials', -1);
      toast({ title: "Social removed!" });
    },
  });

  const adjustPlanLimit = (field: keyof Pick<PlanLimits, 'currentLinks' | 'currentPages' | 'currentBlocks' | 'currentSocials' | 'currentTeamMembers'>, delta: number) => {
    queryClient.setQueryData<PlanLimits>(["/api/auth/plan-limits"], (old) => {
      if (!old) return old;
      return { ...old, [field]: Math.max(0, old[field] + delta) };
    });
  };

  const invalidateBlocks = () => {
    queryClient.invalidateQueries({ predicate: (query) => {
      const key = query.queryKey;
      return Array.isArray(key) && key[0] === "/api/blocks";
    }});
    adjustPlanLimit('currentBlocks', -1);
  };

  const deleteBlockMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/blocks/${id}`);
    },
    onSuccess: () => {
      invalidateBlocks();
      toast({ title: "Block deleted" });
    },
  });

  const toggleBlockMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await apiRequest("PATCH", `/api/blocks/${id}`, { active });
    },
    onSuccess: () => {
      invalidateBlocks();
    },
  });

  const reorderBlocksMutation = useMutation({
    mutationFn: async (blockIds: string[]) => {
      await apiRequest("POST", "/api/blocks/reorder", { blockIds });
    },
    onSuccess: () => {
      invalidateBlocks();
    },
  });

  const reorderSocialsMutation = useMutation({
    mutationFn: async (socialIds: string[]) => {
      await apiRequest("POST", "/api/socials/reorder", { socialIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
    },
  });

  const templateMutation = useMutation({
    mutationFn: async (template: string) => {
      await apiRequest("PATCH", "/api/auth/profile", { template });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "Template updated!" });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Team members skip onboarding (they inherit company details)
  if (!user.onboardingCompleted && !(user.accountType === "team" && user.teamId)) {
    return <Redirect to="/onboarding" />;
  }

  const currentTemplate = getTemplate(user.template);

  const copyUrl = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const moveBlock = (index: number, direction: "up" | "down") => {
    const sorted = [...pageBlocks].sort((a, b) => a.position - b.position);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;
    const newOrder = [...sorted];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    reorderBlocksMutation.mutate(newOrder.map((b) => b.id));
  };

  const sortedBlocks = [...pageBlocks].sort((a, b) => a.position - b.position);

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isTeamAccount = user.accountType === "team" && user.teamId;
  const isTeamOwner = isTeamAccount && teamData && teamData.ownerId === user.id;
  const isTeamMember = isTeamAccount && !isTeamOwner;
  const isRestaurant = teamData?.businessType?.toLowerCase() === "restaurant";

  // Build branding data for team owner live preview
  const defaultTeamTemplate = teamTemplatesForPreview?.find((t: any) => t.isDefault) || teamTemplatesForPreview?.[0];
  const ownerMember = businessProfileData?.member;
  const teamOwnerBusinessData = isTeamOwner ? {
    templateData: defaultTeamTemplate?.templateData || {},
    team: { id: teamData?.id, name: teamData?.name, logoUrl: teamData?.logoUrl, websiteUrl: teamData?.websiteUrl },
    member: {
      businessName: ownerMember?.businessName || user.displayName,
      businessProfileImage: ownerMember?.businessProfileImage || null,
      businessBio: ownerMember?.businessBio || user.bio,
      jobTitle: ownerMember?.jobTitle,
      businessPhone: ownerMember?.businessPhone,
    },
  } : null;

  // Build profile URL based on team membership
  const teamSlug = teamData?.slug;
  const profileUrl = isTeamMember && teamSlug
    ? `${window.location.origin}/${teamSlug}/${user.username}`
    : `${window.location.origin}/${user.username}`;

  const isIndividual = !isTeamAccount;

  const sidebarItems = [
    { id: "design", label: "Design", icon: Palette, active: true },
    ...(isTeamAccount ? [{ id: "business-profile", label: "Business Profile", icon: Briefcase }] : []),
    ...(isTeamAccount && isRestaurant ? [{ id: "menu-setup", label: "Menu Setup", icon: UtensilsCrossed }] : []),
    ...(isTeamAccount && !isRestaurant && isTeamOwner ? [{ id: "services", label: "Services", icon: Briefcase }] : []),
    ...(isTeamAccount && !isRestaurant && isTeamOwner ? [{ id: "products", label: "Products", icon: UtensilsCrossed }] : []),
    { id: "settings", label: "Settings", icon: Settings },
    { id: "qrcodes", label: "QR Codes", icon: QrCode },
    { id: "qr-generator", label: "QR Generator", icon: Link2 },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    ...(!isTeamMember ? [{ id: "billing", label: "Billing", icon: CreditCard }] : []),
    ...(!isTeamMember ? [{ id: "usage", label: "Usage", icon: Eye }] : []),
    ...(isIndividual ? [{ id: "invite-friend", label: "Invite a Friend", icon: Share2 }] : []),
    ...(isAffiliate ? [{ id: "affiliate", label: "Affiliate", icon: Share2 }] : []),
  ];

  const teamSidebarItems = [
    ...(isTeamOwner ? [{ id: "team-members", label: "Team Members", icon: Users }] : []),
    ...(isTeamOwner ? [{ id: "team-templates", label: "Team Templates", icon: LayoutTemplate }] : []),
    { id: "contacts", label: "Contacts", icon: BookUser },
  ];

  const sidebarStyle = {
    "--sidebar-width": "11rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <div className="px-4 py-4 flex flex-col gap-1">
              <img src={logoPath} alt="VisiCardly" className="w-14 h-10 object-contain" />
              <p className="text-xs text-foreground font-medium truncate" title={user.username}>{user.username}</p>
              {isTeamMember ? (
                <Badge variant="outline" className="text-[10px] w-fit border-primary/30 text-primary">Team Member</Badge>
              ) : (
                <div className="flex items-center gap-1 flex-wrap">
                  <Badge variant="secondary" className="text-[10px] w-fit capitalize">{planLimits?.planName || "Free"}</Badge>
                  {(user as any).isLtd && planLimits?.hasActivePlan && (
                    <Badge className="text-[10px] w-fit bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">Lifetime</Badge>
                  )}
                </div>
              )}
            </div>
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sidebarItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        isActive={activeSection === item.id}
                        data-testid={`sidebar-${item.id}`}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            {isTeamAccount && (
              <>
                <SidebarSeparator />
                <SidebarGroup>
                  <SidebarGroupLabel>Team</SidebarGroupLabel>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {teamSidebarItems.map((item) => (
                        <SidebarMenuItem key={item.id}>
                          <SidebarMenuButton
                            onClick={() => setActiveSection(item.id)}
                            isActive={activeSection === item.id}
                            data-testid={`sidebar-${item.id}`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </SidebarGroup>
              </>
            )}
          </SidebarContent>
          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4" />
                  <span>Log Out</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 flex overflow-hidden">
             <div className={`overflow-y-auto border-r bg-background w-full ${activeSection === "design" ? "flex-1 md:min-w-[300px] md:max-w-[420px]" : ""} ${activeSection === "menu-setup" ? "shrink-0 md:w-[380px]" : ""} ${["team-members", "team-templates", "contacts", "billing", "usage", "affiliate", "business-profile"].includes(activeSection) ? "flex-1 md:max-w-none" : ""} ${!["design", "menu-setup", "team-members", "team-templates", "contacts", "billing", "usage", "affiliate", "business-profile"].includes(activeSection) ? "flex-1" : ""}`}>
              {activeSection === "billing" && <BillingSection autoSelectPlanId={new URLSearchParams(search).get("planId")} />}
              {activeSection === "business-profile" && <BusinessProfileSection onNavigateToTemplates={isTeamOwner ? () => setActiveSection("team-templates") : undefined} />}
              {activeSection === "affiliate" && affiliateData && (
                <div className="p-6 max-w-4xl mx-auto space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <SidebarTrigger />
                    <h2 className="text-xl font-semibold">Affiliate Dashboard</h2>
                    <Badge variant={affiliateData.affiliate.isActive ? "default" : "secondary"} className="ml-2">
                      {affiliateData.affiliate.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Commission rate: <span className="font-semibold text-primary">{affiliateData.affiliate.commissionRate}%</span>
                  </p>

                  {/* Referral Link */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Your Referral Link</CardTitle></CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Input value={`${window.location.origin}/auth?ref=${affiliateData.affiliate.referralCode}`} readOnly className="font-mono text-xs" />
                        <Button variant="outline" size="sm" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/auth?ref=${affiliateData.affiliate.referralCode}`);
                          toast({ title: "Copied!", description: "Referral link copied." });
                        }}>
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Stats */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Referrals</p>
                      <p className="text-2xl font-bold mt-1">{affiliateData.stats.totalReferrals}</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Pending</p>
                      <p className="text-2xl font-bold mt-1">{affiliateData.stats.pendingReferrals}</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Converted</p>
                      <p className="text-2xl font-bold mt-1">{affiliateData.stats.convertedReferrals}</p>
                    </CardContent></Card>
                    <Card><CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Total Earnings</p>
                      <p className="text-2xl font-bold mt-1">₹{affiliateData.stats.totalEarnings.toLocaleString()}</p>
                    </CardContent></Card>
                  </div>

                  {/* Referrals Table */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Referral History</CardTitle></CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Commission</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {affiliateData.referrals.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No referrals yet. Share your link to start earning!</TableCell></TableRow>
                          ) : affiliateData.referrals.map((r: any) => (
                            <TableRow key={r.id}>
                              <TableCell>
                                <div className="font-medium">{r.username ?? "Unknown"}</div>
                                <div className="text-xs text-muted-foreground">{r.email ?? ""}</div>
                              </TableCell>
                              <TableCell><Badge variant={r.status === "converted" ? "default" : "secondary"} className="capitalize text-xs">{r.status}</Badge></TableCell>
                              <TableCell className="font-medium">{parseFloat(r.commissionAmount) > 0 ? `₹${parseFloat(r.commissionAmount).toLocaleString()}` : "—"}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              )}
              {activeSection === "usage" && (
                <div className="p-6 max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <SidebarTrigger />
                    <h2 className="text-xl font-semibold">Usage Analytics</h2>
                  </div>
                  <PlanUsageBanner />
                </div>
              )}
              {activeSection === "invite-friend" && (
                <div className="p-6 max-w-2xl mx-auto space-y-6">
                  <div className="flex items-center gap-2 mb-2">
                    <SidebarTrigger />
                    <h2 className="text-xl font-semibold">Invite a Friend</h2>
                  </div>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Share VisiCardly</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Love using VisiCardly? Share it with your friends and help us grow! Copy the link below and send it to anyone who might find it useful.
                      </p>
                      <div className="flex gap-2">
                        <Input
                          value={`${window.location.origin}/auth`}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/auth`);
                            toast({ title: "Link copied!", description: "Share it with your friends." });
                          }}
                        >
                          <Copy className="h-4 w-4 mr-1" /> Copy
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
              {activeSection === "menu-setup" && <MenuBuilder />}
              {activeSection === "design" && (
              <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <SidebarTrigger data-testid="button-sidebar-toggle" />
                  <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 flex-1 min-w-0 cursor-pointer" onClick={copyUrl}>
                    <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground break-all line-clamp-2 block" data-testid="text-profile-url" title={profileUrl}>
                      {profileUrl}
                    </span>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); copyUrl(); }} className="shrink-0 ml-auto" data-testid="button-copy-url">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

                {isTeamMember && (
                  <div className="bg-primary/5 border-2 border-primary/20 rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <UserIcon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">Team Member Profile</p>
                        <p className="text-xs text-muted-foreground">Some settings are managed by your organization</p>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <button 
                        onClick={() => setActiveSection("business-profile")}
                        className="flex items-center gap-2 w-full p-2.5 rounded-md border bg-background hover:bg-muted/50 transition-colors text-left"
                      >
                        <Briefcase className="w-4 h-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">Edit Your Profile</p>
                          <p className="text-xs text-muted-foreground">Update your name, bio, phone & profile picture</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                      </button>
                    </div>
                  </div>
                )}

                <CategorySection
                  id="header"
                  label="Header"
                  icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />}
                  open={openCategories.header}
                  onToggle={() => toggleCategory("header")}
                  trailing={
                    <Avatar className="w-6 h-6 border border-border">
                      <AvatarImage src={user.profileImage || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">
                        {(user.displayName || user.username).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  }
                >
                  <div className="px-4 pb-4 pt-1 space-y-4">
                    <div className="flex items-center justify-between gap-4 border rounded-md p-3">
                      <div>
                        <span className="text-sm font-medium">Profile Picture <span className="text-[10px] text-muted-foreground font-normal">(Max 1MB)</span></span>
                        {isTeamOwner && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>
                            For your business card, update photo in{" "}
                            <button type="button" onClick={() => setActiveSection("business-profile")} className="underline font-medium hover:text-amber-700">Business Profile</button>
                            </span>
                          </p>
                        )}
                      </div>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          id="dash-avatar-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 1 * 1024 * 1024) {
                              toast({ title: "File too large", description: "Maximum file size is 1MB.", variant: "destructive" });
                              return;
                            }
                            const label = document.getElementById('dash-avatar-upload-label');
                            if (label) label.setAttribute('data-uploading', 'true');
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/upload", { method: "POST", body: formData });
                              if (res.ok) {
                                const data = await res.json();
                                await apiRequest("PATCH", "/api/auth/profile", { profileImage: data.url });
                                queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                                toast({ title: "Profile picture updated!" });
                              } else {
                                const errData = await res.json().catch(() => ({}));
                                toast({ title: "Upload failed", description: errData.message || "Max 1MB", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Upload failed", variant: "destructive" });
                            }
                            if (label) label.removeAttribute('data-uploading');
                          }}
                          data-testid="input-header-avatar-upload"
                        />
                        <label htmlFor="dash-avatar-upload" id="dash-avatar-upload-label" className="cursor-pointer block relative [&[data-uploading]]:pointer-events-none">
                          <Avatar className="w-12 h-12 border-2 border-border">
                            <AvatarImage src={user.profileImage || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {(user.displayName || user.username).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity [label[data-uploading]>&]:opacity-100">
                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin hidden [label[data-uploading]>&]:block" />
                            <Camera className="w-3.5 h-3.5 text-white [label[data-uploading]>&]:hidden" />
                          </div>
                        </label>
                      </div>
                    </div>
                    {!isTeamMember && (
                    <div className="border rounded-md p-3 space-y-2">
                      <span className="text-sm font-medium">Cover Image <span className="text-[10px] text-muted-foreground font-normal">(Max 1MB)</span></span>
                      {isTeamOwner && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          For your business card, update cover in{" "}
                          <button type="button" className="underline font-medium hover:text-amber-700" onClick={() => setActiveSection("team-templates")}>Team Templates</button>
                        </p>
                      )}
                       <div className="relative group w-full h-20 rounded-md overflow-hidden bg-muted" id="dash-cover-container">
                        {user.coverImage ? (
                          <>
                            <img src={user.coverImage} alt="Cover" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity [div[data-uploading]>&]:opacity-100">
                              <Loader2 className="w-5 h-5 text-white animate-spin hidden [div[data-uploading]>&]:block" />
                              <label htmlFor="dash-cover-upload" className="cursor-pointer p-1.5 rounded-full bg-white/20 hover-elevate [div[data-uploading]>&]:hidden">
                                <Camera className="w-3.5 h-3.5 text-white" />
                              </label>
                              <button
                                onClick={() => {
                                  profileMutation.mutate({ coverImage: null });
                                }}
                                className="p-1.5 rounded-full bg-white/20 hover-elevate [div[data-uploading]>&]:hidden"
                                data-testid="button-cover-remove"
                              >
                                <X className="w-3.5 h-3.5 text-white" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <label htmlFor="dash-cover-upload" className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground hover-elevate [div[data-uploading]>&]:pointer-events-none">
                            <Loader2 className="w-5 h-5 animate-spin hidden [div[data-uploading]>&]:block" />
                            <ImageIcon className="w-5 h-5 [div[data-uploading]>&]:hidden" />
                            <span className="text-xs [div[data-uploading]>&]:hidden">Add cover image</span>
                            <span className="text-xs hidden [div[data-uploading]>&]:block">Uploading...</span>
                          </label>
                        )}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          id="dash-cover-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 1 * 1024 * 1024) {
                              toast({ title: "File too large", description: "Maximum file size is 1MB. Please choose a smaller image.", variant: "destructive" });
                              return;
                            }
                            const coverContainer = document.getElementById('dash-cover-container');
                            if (coverContainer) coverContainer.setAttribute('data-uploading', 'true');
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/upload", { method: "POST", body: formData });
                              if (res.ok) {
                                const data = await res.json();
                                await apiRequest("PATCH", "/api/auth/profile", { coverImage: data.url });
                                queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                                toast({ title: "Cover image updated!" });
                              } else {
                                const errData = await res.json().catch(() => ({}));
                                toast({ title: "Upload failed", description: errData.message || "Please try a smaller image (max 1MB)", variant: "destructive" });
                              }
                            } catch {
                              toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
                            }
                            if (coverContainer) coverContainer.removeAttribute('data-uploading');
                          }}
                          data-testid="input-header-cover-upload"
                        />
                      </div>
                    </div>
                    )}
                    <div className="space-y-1.5">
                      <Label htmlFor="header-name" className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        id="header-name"
                        value={headerName}
                        onChange={(e) => { if (!isTeamMember) { setHeaderName(e.target.value); setHeaderDirty(true); } }}
                        onBlur={() => {
                          if (!isTeamMember && headerDirty && headerName !== (user.displayName || "")) {
                            profileMutation.mutate({ displayName: headerName || null });
                          }
                        }}
                        placeholder="Your name"
                        readOnly={!!isTeamMember}
                        className={isTeamMember ? "opacity-60 cursor-not-allowed" : ""}
                        data-testid="input-header-name"
                      />
                      {isTeamMember && <p className="text-xs text-muted-foreground">Managed by team owner</p>}
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="header-bio" className="text-xs text-muted-foreground">Bio</Label>
                        <span className={`text-[11px] ${headerBio.length >= 450 ? "text-destructive" : "text-muted-foreground"}`}>{headerBio.length}/500</span>
                      </div>
                      <Textarea
                        id="header-bio"
                        value={headerBio}
                        onChange={(e) => { if (!isTeamMember) { setHeaderBio(e.target.value); setHeaderDirty(true); } }}
                        onBlur={() => {
                          if (!isTeamMember && headerDirty && headerBio !== (user.bio || "")) {
                            profileMutation.mutate({ bio: headerBio || null });
                          }
                        }}
                        placeholder="Tell the world about yourself..."
                        maxLength={500}
                        rows={3}
                        readOnly={!!isTeamMember}
                        className={isTeamMember ? "opacity-60 cursor-not-allowed" : ""}
                        data-testid="input-header-bio"
                      />
                      {isTeamMember && <p className="text-xs text-muted-foreground">Managed by team owner</p>}
                    </div>
                  </div>
                </CategorySection>

                {/* Show Menu on Profile Toggle - for restaurant team owners */}
                {isTeamAccount && isRestaurant && (
                  <div className="border rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Show Menu on Profile</h3>
                      <p className="text-xs text-muted-foreground">Display a "View Our Menu" button on your business card profile</p>
                    </div>
                    <Switch
                      checked={user?.showMenuOnProfile || false}
                      onCheckedChange={async (checked) => {
                        try {
                          await fetch("/api/auth/profile", {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            credentials: "include",
                            body: JSON.stringify({ showMenuOnProfile: checked }),
                          });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          toast({ title: checked ? "Menu will show on profile" : "Menu hidden from profile" });
                        } catch {
                          toast({ title: "Failed to update", variant: "destructive" });
                        }
                      }}
                    />
                  </div>
                )}

                <CategorySection
                  id="socials"
                  label="Socials"
                  icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />}
                  open={openCategories.socials}
                  onToggle={() => toggleCategory("socials")}
                  trailing={
                    userSocials.length > 0 ? (
                      <div className="flex items-center gap-1.5">
                        {userSocials.slice(0, 3).map((s) => (
                          <SocialIcon key={s.id} platform={s.platform} className="w-3.5 h-3.5 text-muted-foreground" />
                        ))}
                      </div>
                    ) : undefined
                  }
                >
                  <div className="px-4 pb-4 pt-1 space-y-2">
                    {[...userSocials].sort((a, b) => a.position - b.position).map((social, index, sorted) => (
                      <SocialLinkRow
                        key={social.id}
                        social={social}
                        onUpdate={(url) => updateSocialMutation.mutate({ id: social.id, url })}
                        onDelete={() => deleteSocialMutation.mutate(social.id)}
                        onMoveUp={index > 0 ? () => {
                          const newOrder = [...sorted];
                          [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                          reorderSocialsMutation.mutate(newOrder.map(s => s.id));
                        } : undefined}
                        onMoveDown={index < sorted.length - 1 ? () => {
                          const newOrder = [...sorted];
                          [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
                          reorderSocialsMutation.mutate(newOrder.map(s => s.id));
                        } : undefined}
                      />
                    ))}
                    <div className="border rounded-md">
                      <Button
                        variant="ghost"
                        className="w-full justify-center gap-2"
                        onClick={() => {
                          const check = canPerformAction(planLimits, "addSocial");
                          if (!check.allowed) { setLimitMessage(check.message || ""); setLimitDialogOpen(true); return; }
                          setAddingSocial(true);
                        }}
                        data-testid="button-add-social"
                      >
                        Add Social
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="border rounded-md p-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Use original brand colors</p>
                        <p className="text-xs text-muted-foreground">Show social icons in their real brand colors (e.g. Facebook blue)</p>
                      </div>
                      <Switch
                        checked={user.useOriginalSocialColors || false}
                        onCheckedChange={(checked) => profileMutation.mutate({ useOriginalSocialColors: checked })}
                        data-testid="toggle-original-social-colors"
                      />
                    </div>
                  </div>
                </CategorySection>

                <CategorySection
                  id="page"
                  label="Page:"
                  icon={<FileText className="w-4 h-4 text-muted-foreground" />}
                  open={openCategories.page}
                  onToggle={() => toggleCategory("page")}
                  trailing={
                    <div className="flex items-center gap-2 flex-wrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="gap-1" data-testid="button-page-selector">
                            {currentPage?.title || "Home"}
                            <ChevronDown className="w-3.5 h-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {userPages.map((page) => (
                            <DropdownMenuItem
                              key={page.id}
                              onClick={() => setSelectedPageId(page.id)}
                              data-testid={`page-option-${page.id}`}
                            >
                              <span className="flex items-center gap-2">
                                {page.isHome && <Home className="w-3.5 h-3.5 text-muted-foreground" />}
                                {page.title}
                              </span>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button
                        size="sm"
                        onClick={() => {
                          const check = canPerformAction(planLimits, "addPage");
                          if (!check.allowed) { setLimitMessage(check.message || ""); setLimitDialogOpen(true); return; }
                          setAddingPage(true);
                        }}
                        data-testid="button-add-new-page"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add Page
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setManagingPages(true)} data-testid="button-manage-pages">
                        Manage
                      </Button>
                    </div>
                  }
                >
                  <div className="px-4 pb-3 pt-1">
                    <p className="text-sm text-muted-foreground">
                      Editing: <span className="font-medium">{currentPage?.title || "Home"}</span>
                      {currentPage?.isHome && <span className="text-xs ml-1 text-muted-foreground">(Home page)</span>}
                    </p>
                    {userPages.length > 1 && (
                      <p className="text-xs text-muted-foreground mt-2 bg-muted/50 p-2 rounded-md">
                        💡 Each page has its own blocks. Blogs you add will appear on the page you're currently editing.
                      </p>
                    )}
                  </div>
                </CategorySection>

                <CategorySection
                  id="blocks"
                  label="Blocks"
                  icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />}
                  open={openCategories.blocks}
                  onToggle={() => toggleCategory("blocks")}
                  action={
                    <Button size="sm" onClick={() => {
                      const check = canPerformAction(planLimits, "addBlock");
                      if (!check.allowed) { toast({ title: "Limit reached", description: check.message, variant: "destructive" }); return; }
                      setAddingBlock(true);
                    }} data-testid="button-add-block">
                      New Block +
                    </Button>
                  }
                >
                  <div className="px-4 pb-3 pt-1">
                    {blocksLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : sortedBlocks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Link2 className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-1">No blocks yet</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                          Add your first content block to start building this page.
                        </p>
                        <Button size="sm" onClick={() => {
                          const check = canPerformAction(planLimits, "addBlock");
                          if (!check.allowed) { toast({ title: "Limit reached", description: check.message, variant: "destructive" }); return; }
                          setAddingBlock(true);
                        }} data-testid="button-add-first-block">
                          <Plus className="w-4 h-4" />
                          Add your first block
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortedBlocks.map((block, index) => (
                          <InlineBlockCard
                            key={block.id}
                            block={block}
                            isEditing={editingBlockId === block.id}
                            onStartEdit={() => setEditingBlockId(block.id)}
                            onStopEdit={() => setEditingBlockId(null)}
                            onDelete={() => deleteBlockMutation.mutate(block.id)}
                            onToggle={(active) => toggleBlockMutation.mutate({ id: block.id, active })}
                            onMoveUp={index > 0 ? () => moveBlock(index, "up") : undefined}
                            onMoveDown={index < sortedBlocks.length - 1 ? () => moveBlock(index, "down") : undefined}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CategorySection>
              </div>
              )}
              {activeSection === "settings" && (
                <SettingsPanel user={user} profileUrl={profileUrl} onLogout={handleLogout} onNavigateBilling={() => setActiveSection("billing")} isTeamMember={!!isTeamMember} onNavigateBusinessProfile={() => setActiveSection("business-profile")} />
              )}
              {activeSection === "analytics" && (
                planLimits?.analyticsEnabled === false ? (
                  <FeatureLockedPanel feature="Analytics" description="Track profile views, link clicks, and visitor insights." onNavigateBilling={() => setActiveSection("billing")} />
                ) : (
                  <AnalyticsPanel username={user.username} />
                )
              )}
              {activeSection === "qrcodes" && (
                planLimits?.qrCodeEnabled === false ? (
                  <FeatureLockedPanel feature="QR Codes" description="Generate QR codes for your profile and share them anywhere." onNavigateBilling={() => setActiveSection("billing")} />
                ) : (
                  <QRCodePanel profileUrl={profileUrl} username={user.username} />
                )
              )}
              {activeSection === "qr-generator" && (
                <URLQRGeneratorPanel username={user.username} />
              )}
              {activeSection === "team-members" && isTeamAccount && (
                <TeamMembersPanel teamId={user.teamId!} currentUserId={user.id} teamSlug={teamSlug} />
              )}
              {activeSection === "team-templates" && isTeamAccount && isTeamOwner && (
                <TeamTemplatesPanel teamId={user.teamId!} />
              )}
              {activeSection === "contacts" && isTeamAccount && (
                <ContactsPanel teamId={user.teamId!} userId={user.id} isTeamMember={!!isTeamMember} />
              )}
              {activeSection === "services" && isTeamAccount && !isRestaurant && isTeamOwner && (
                <ServicesProductsPanel teamId={user.teamId!} teamSlug={teamSlug || ''} type="services" />
              )}
              {activeSection === "products" && isTeamAccount && !isRestaurant && isTeamOwner && (
                <ServicesProductsPanel teamId={user.teamId!} teamSlug={teamSlug || ''} type="products" />
              )}
            </div>

            <div className={`${activeSection === "design" ? "hidden md:flex" : "hidden"} flex-1 bg-muted/30 items-center justify-center p-6`}>
              <div className="flex flex-col items-center gap-3">
              {isTeamAccount ? (
                  isTeamMember ? (
                    /* Team members get live template preview */
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreviewMode("mobile")}
                          className={`toggle-elevate ${previewMode === "mobile" ? "toggle-elevated" : ""}`}
                        >
                          <Smartphone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreviewMode("desktop")}
                          className={`toggle-elevate ${previewMode === "desktop" ? "toggle-elevated" : ""}`}
                        >
                          <Monitor className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/auth/business-profile"] });
                            toast({ title: "Preview refreshed!" });
                          }}
                          title="Refresh preview"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        </Button>
                      </div>
                      <TeamPhonePreview
                        template={currentTemplate}
                        user={user}
                        businessProfileData={businessProfileData}
                        socials={userSocials}
                        blocks={sortedBlocks}
                        pages={userPages}
                        currentPage={currentPage || null}
                        mode={previewMode}
                        onPageChange={(pageId) => setSelectedPageId(pageId)}
                      />
                    </>
                  ) : (
                    /* Team owners also get live template preview */
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreviewMode("mobile")}
                          className={`toggle-elevate ${previewMode === "mobile" ? "toggle-elevated" : ""}`}
                        >
                          <Smartphone className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreviewMode("desktop")}
                          className={`toggle-elevate ${previewMode === "desktop" ? "toggle-elevated" : ""}`}
                        >
                          <Monitor className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                            queryClient.invalidateQueries({ queryKey: ["/api/teams", user.teamId, "templates"] });
                            toast({ title: "Preview refreshed!" });
                          }}
                          title="Refresh preview"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                        </Button>
                      </div>
                      <TeamPhonePreview
                        template={currentTemplate}
                        user={user}
                        businessProfileData={teamOwnerBusinessData}
                        socials={userSocials}
                        blocks={sortedBlocks}
                        pages={userPages}
                        currentPage={currentPage || null}
                        mode={previewMode}
                        onPageChange={(pageId) => setSelectedPageId(pageId)}
                      />
                    </>
                  )
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreviewMode("mobile")}
                        className={`toggle-elevate ${previewMode === "mobile" ? "toggle-elevated" : ""}`}
                        data-testid="button-preview-mobile"
                      >
                        <Smartphone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handlePreviewMode("desktop")}
                        className={`toggle-elevate ${previewMode === "desktop" ? "toggle-elevated" : ""}`}
                        data-testid="button-preview-desktop"
                      >
                        <Monitor className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          queryClient.invalidateQueries({ queryKey: ["/api/blocks"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          toast({ title: "Preview refreshed!" });
                        }}
                        title="Refresh preview"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
                      </Button>
                    </div>
                    <PhonePreview
                      template={currentTemplate}
                      displayName={headerName || user.username}
                      bio={headerBio}
                      profileImage={user.profileImage || ""}
                      coverImage={user.coverImage || ""}
                      username={user.username}
                      blocks={sortedBlocks}
                      socials={userSocials}
                      pages={userPages}
                      currentPage={currentPage || null}
                      mode={previewMode}
                      useOriginalSocialColors={user.useOriginalSocialColors}
                      onPageChange={(pageId) => setSelectedPageId(pageId)}
                    />
                  </>
                )}
              </div>
            </div>

            {/* Menu Setup - middle Column: Preview */}
            {planLimits?.menuBuilderEnabled && (
            <div className={`${activeSection === "menu-setup" ? "hidden md:flex" : "hidden"} flex-1 min-w-0 border-l bg-muted/20 flex-col items-center justify-start overflow-y-auto`}>
              {/* Preview header */}
              <div className="w-full flex items-center justify-between px-4 py-2.5 border-b bg-background sticky top-0 z-10">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Menu Preview</span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 toggle-elevate ${previewMode === "mobile" ? "toggle-elevated" : ""}`}
                    onClick={() => handlePreviewMode("mobile")}
                    title="Mobile preview"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-7 w-7 toggle-elevate ${previewMode === "desktop" ? "toggle-elevated" : ""}`}
                    onClick={() => handlePreviewMode("desktop")}
                    title="Desktop preview"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => isTeamAccount ? window.open(`/${teamSlug || user.username}/menu`, "_blank") : toast({ title: "Team account required", variant: "destructive" })}
                    title="Open menu"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              {/* Preview iframe */}
              <div className="flex-1 w-full p-4 flex justify-center">
                <div className="bg-background rounded-2xl shadow-md overflow-hidden border w-full h-full" style={{ maxWidth: "400px", minHeight: "60vh" }}>
                  <iframe
                    src={`/${teamSlug || user.username}/menu?embed=1`}
                    className="w-full h-full border-0"
                    title="Menu Preview"
                    key={`menu-preview-${previewMode}`}
                    style={{ minHeight: "60vh" }}
                  />
                </div>
              </div>
            </div>
            )}
            {/* Menu Setup - right Column: Appearance & Info */}
            {planLimits?.menuBuilderEnabled && (
            <div className={`${activeSection === "menu-setup" ? "hidden md:flex" : "hidden"} flex-col overflow-y-auto border-l bg-background shrink-0`} style={{ width: "280px" }}>
              <MenuAppearancePanel />
            </div>
            )}

           

            {/* Design panel - always visible when design section is active */}
            {activeSection === "design" && (
              <div className="w-[280px] border-l bg-background overflow-y-auto shrink-0">
                <DesignPanel
                  currentTemplateId={user.template || "minimal"}
                  onSelectTemplate={(id) => templateMutation.mutate(id)}
                  saving={templateMutation.isPending}
                  disabled={false}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <AddBlockDialog open={addingBlock} onClose={() => setAddingBlock(false)} pageId={currentPage?.id} />
      <AddSocialDialog
        open={addingSocial}
        onClose={() => setAddingSocial(false)}
        onSelect={(platform) => {
          addSocialMutation.mutate({ platform, url: "" });
          setAddingSocial(false);
        }}
        existingPlatforms={userSocials.map((s) => s.platform)}
      />
      <AddPageDialog open={addingPage} onClose={() => setAddingPage(false)} />
      <ManagePagesDialog
        open={managingPages}
        onClose={() => setManagingPages(false)}
        pages={userPages}
        onSelectPage={(id) => { setSelectedPageId(id); setManagingPages(false); }}
      />
      <LimitReachedDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        message={limitMessage}
        onUpgrade={() => setActiveSection("billing")}
      />
    </SidebarProvider>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <SidebarTrigger data-testid="button-sidebar-toggle" />
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

function SettingsPanel({
  user,
  profileUrl,
  onLogout,
  onNavigateBilling,
  isTeamMember = false,
  onNavigateBusinessProfile,
}: {
  user: { id: string; username: string; email: string; displayName: string | null; bio: string | null; profileImage: string | null; template: string | null; accountType: string };
  profileUrl: string;
  onLogout: () => void;
  onNavigateBilling?: () => void;
  isTeamMember?: boolean;
  onNavigateBusinessProfile?: () => void;
}) {
  const { toast } = useToast();
  const [editUsername, setEditUsername] = useState(user.username);
  const [editName, setEditName] = useState(user.displayName || "");
  const [editBio, setEditBio] = useState(user.bio || "");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(user.template || "minimal");
  const { data: settingsPlanLimits } = usePlanLimits();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");

  useEffect(() => {
    setEditUsername(user.username);
    setEditName(user.displayName || "");
    setEditBio(user.bio || "");
    setSelectedTemplate(user.template || "minimal");
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: async (data: { displayName?: string | null; bio?: string | null; profileImage?: string | null; username?: string; template?: string }) => {
      await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setUsernameAvailable(null);
      toast({ title: "Profile updated!" });
    },
    onError: (err: any) => {
      setUsernameAvailable(null);
      setEditUsername(user.username);
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
      const res = await apiRequest("POST", "/api/auth/change-password", data);
      return res;
    },
    onSuccess: () => {
      toast({ title: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => {
      toast({ title: "Password change failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (password: string) => {
      await apiRequest("DELETE", "/api/auth/account", { password });
    },
    onSuccess: () => {
      window.location.href = "/";
    },
    onError: (err: any) => {
      toast({ title: "Deletion failed", description: err.message, variant: "destructive" });
    },
  });

  const checkUsername = async (username: string) => {
    if (username === user.username) {
      setUsernameAvailable(null);
      return;
    }
    if (username.length < 3 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameAvailable(false);
      return;
    }
    setCheckingUsername(true);
    try {
      const res = await fetch(`/api/auth/username-available?username=${encodeURIComponent(username)}`, { credentials: "include" });
      const data = await res.json();
      setUsernameAvailable(data.available);
    } catch {
      setUsernameAvailable(null);
    }
    setCheckingUsername(false);
  };

  return (
    <div className="p-4 space-y-5 overflow-y-auto max-w-5xl mx-auto">
      <SectionHeader title="Settings" />

      {/* Top two cards: Profile + Theme side by side on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

      {/* Profile Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <UserIcon className="w-4 h-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative group shrink-0">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                id="settings-avatar-upload"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 1 * 1024 * 1024) {
                    toast({ title: "File too large", description: "Maximum file size is 1MB.", variant: "destructive" });
                    return;
                  }
                  const label = document.getElementById('settings-avatar-upload-label');
                  if (label) label.setAttribute('data-uploading', 'true');
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    if (res.ok) {
                      const data = await res.json();
                      profileMutation.mutate({ profileImage: data.url });
                    } else {
                      toast({ title: "Upload failed", description: "Max 1MB", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Upload failed", variant: "destructive" });
                  }
                  if (label) label.removeAttribute('data-uploading');
                }}
                data-testid="input-settings-avatar-upload"
              />
              <label htmlFor="settings-avatar-upload" id="settings-avatar-upload-label" className="cursor-pointer block relative [&[data-uploading]]:pointer-events-none">
                <Avatar className="w-12 h-12 border border-border">
                  <AvatarImage src={user.profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity [label[data-uploading]>&]:opacity-100">
                  <Loader2 className="w-3.5 h-3.5 text-white animate-spin hidden [label[data-uploading]>&]:block" />
                  <Camera className="w-3.5 h-3.5 text-white [label[data-uploading]>&]:hidden" />
                </div>
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              {isTeamMember && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  <span>
                    For your business card, update photo in{" "}
                    <button type="button" onClick={() => onNavigateBusinessProfile?.()} className="underline font-medium hover:text-amber-700">Business Profile</button>
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="settings-name" className="text-xs text-muted-foreground">Display Name</Label>
              <Input
                id="settings-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => {
                  if (editName !== (user.displayName || "")) {
                    profileMutation.mutate({ displayName: editName || null });
                  }
                }}
                placeholder="Your name"
                className="h-9 text-sm"
                data-testid="input-settings-name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="settings-username" className="text-xs text-muted-foreground">Username</Label>
              <div className="relative">
                <Input
                  id="settings-username"
                  value={editUsername}
                  onChange={(e) => {
                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "");
                    setEditUsername(val);
                    setUsernameAvailable(null);
                  }}
                  onBlur={() => {
                    if (editUsername !== user.username && editUsername.length >= 3) {
                      checkUsername(editUsername);
                    }
                  }}
                  placeholder="username"
                  className="h-9 text-sm"
                  data-testid="input-settings-username"
                />
                {checkingUsername && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {!checkingUsername && usernameAvailable === true && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  </div>
                )}
                {!checkingUsername && usernameAvailable === false && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <XCircle className="w-3.5 h-3.5 text-destructive" />
                  </div>
                )}
              </div>
              {usernameAvailable === false && (
                <p className="text-[11px] text-destructive">Username not available</p>
              )}
              {usernameAvailable === true && editUsername !== user.username && (
                <Button
                  size="sm"
                  className="h-7 text-xs mt-1"
                  onClick={() => {
                    profileMutation.mutate({ username: editUsername });
                    setUsernameAvailable(null);
                  }}
                  disabled={profileMutation.isPending}
                  data-testid="button-save-username"
                >
                  Save Username
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="settings-bio" className="text-xs text-muted-foreground">Bio</Label>
              <span className={`text-[11px] ${editBio.length >= 450 ? "text-destructive" : "text-muted-foreground"}`}>{editBio.length}/500</span>
            </div>
            <Textarea
              id="settings-bio"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              onBlur={() => {
                if (editBio !== (user.bio || "")) {
                  profileMutation.mutate({ bio: editBio || null });
                }
              }}
              placeholder="Tell the world about yourself..."
              maxLength={500}
              rows={2}
              className="text-sm resize-none"
              data-testid="input-settings-bio"
            />
          </div>

          {/* Public URL inline */}
          <div className="flex items-center gap-2 p-2.5 rounded-md bg-muted/50 border">
            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs font-medium break-all line-clamp-2 flex-1" data-testid="text-settings-url">{profileUrl}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => window.open(profileUrl, "_blank")}
              data-testid="button-settings-visit"
            >
              <ExternalLink className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Theme Card - hidden for team members */}
      {!isTeamMember && (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4" /> Theme
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {TEMPLATES.filter((t) => {
              const allowedCategories = settingsPlanLimits?.themeCategories ?? ["starter"];
              return allowedCategories.includes(t.category);
            }).map((t) => {
              const layoutLabel = LAYOUT_LABELS[t.layout as LayoutType] || "Classic";
              return (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTemplate(t.id);
                    profileMutation.mutate({ template: t.id });
                  }}
                  className={`relative rounded-lg border-2 p-1.5 text-center transition-all hover:scale-105 ${
                    selectedTemplate === t.id ? "border-primary ring-1 ring-primary/30" : "border-border"
                  }`}
                  title={`${t.name} - ${layoutLabel} layout`}
                  data-testid={`template-${t.id}`}
                >
                  <div className={`w-full aspect-[3/2] rounded-sm ${t.bg} relative`}>
                    <span className="absolute bottom-0.5 left-0.5 text-[6px] font-bold px-1 py-px rounded-full bg-black/30 text-white backdrop-blur-sm">{layoutLabel}</span>
                  </div>
                  <p className="text-[10px] font-medium mt-1 truncate">{t.name}</p>
                  <span className="absolute top-0.5 right-0.5 text-[5px] font-bold px-1 py-px rounded-full bg-primary/10 text-primary capitalize">{t.category}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
      )}

      </div>{/* end 2-col grid */}

      {/* Upgrade to Team - only show for individual users */}
      {user.accountType !== "team" && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-md bg-primary/10 shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Upgrade to Team</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Unlock public menu links, QR codes, team members, company branding & shared templates.
                </p>
                <Button size="sm" className="h-7 text-xs mt-2" onClick={() => onNavigateBilling?.()}>
                  View Team Plans
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <KeyRound className="w-4 h-4" /> Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label htmlFor="current-password" className="text-xs text-muted-foreground">Current</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Current password"
                className="h-9 text-sm"
                data-testid="input-current-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="new-password" className="text-xs text-muted-foreground">New</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password"
                className="h-9 text-sm"
                data-testid="input-new-password"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">Confirm</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="h-9 text-sm"
                data-testid="input-confirm-password"
              />
            </div>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
          <Button
            onClick={() => {
              passwordMutation.mutate({ currentPassword, newPassword, confirmPassword });
            }}
            disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordMutation.isPending}
            size="sm"
            className="w-full sm:w-auto"
            data-testid="button-change-password"
          >
            {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
          </Button>
        </CardContent>
      </Card>

      {/* Email Verification */}
      <EmailVerificationCard user={user} />

      {/* White Label - hidden for team members */}
      {!isTeamMember && <WhiteLabelCard onNavigateBilling={onNavigateBilling} />}

      {/* API Access */}
      {user?.accountType === "team" && <ApiAccessCard />}

      {/* Account Actions */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1 pb-4">
        <Button variant="outline" className="flex-1 gap-2 h-9 text-sm" onClick={onLogout} data-testid="button-settings-logout">
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </Button>
        <Button
          variant="outline"
          className="flex-1 gap-2 h-9 text-sm text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => setShowDeleteDialog(true)}
          data-testid="button-delete-account"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Delete Account
        </Button>
      </div>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This action is permanent and cannot be undone. All your pages, blocks, social links, and analytics data will be permanently deleted.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="delete-password" className="text-xs text-muted-foreground">Enter your password to confirm</Label>
              <Input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Your password"
                data-testid="input-delete-password"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowDeleteDialog(false); setDeletePassword(""); }}
                data-testid="button-cancel-delete"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                disabled={!deletePassword || deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletePassword)}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Forever"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmailVerificationCard({ user }: { user: { id: string; email: string; emailVerified?: boolean } }) {
  const { toast } = useToast();
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const sendOtpMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/send-verification-otp");
    },
    onSuccess: () => {
      setOtpSent(true);
      setResendTimer(60);
      toast({ title: "OTP sent!", description: `Verification code sent to ${user.email}` });
    },
    onError: (err: any) => {
      toast({ title: "Failed to send OTP", description: err.message, variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/verify-email-otp", { otp });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setOtpSent(false);
      setOtp("");
      toast({ title: "Email verified!", description: "You now have a verified badge on your profile." });
    },
    onError: (err: any) => {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    },
  });

  if ((user as any).emailVerified) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">Email Verified</p>
              <p className="text-xs text-green-600 dark:text-green-400">Your verified badge is visible on your public profile.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BadgeCheck className="w-4 h-4" /> Email Verification
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Verify your email to get a verified badge on your public profile card.
        </p>
        {!otpSent ? (
          <Button
            size="sm"
            onClick={() => sendOtpMutation.mutate()}
            disabled={sendOtpMutation.isPending}
          >
            {sendOtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-3.5 h-3.5 mr-1" />}
            Send Verification Code
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Verification code sent to <span className="font-medium text-foreground">{user.email}</span>
            </p>
            <div className="flex items-center gap-2">
              <Input
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="h-9 text-sm font-mono tracking-widest w-40"
              />
              <Button
                size="sm"
                onClick={() => verifyOtpMutation.mutate()}
                disabled={otp.length < 6 || verifyOtpMutation.isPending}
              >
                {verifyOtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Verify"}
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => sendOtpMutation.mutate()} disabled={sendOtpMutation.isPending || resendTimer > 0}>
              {resendTimer > 0 ? `Resend Code (${resendTimer}s)` : "Resend Code"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhiteLabelCard({ onNavigateBilling }: { onNavigateBilling?: () => void }) {
  const { toast } = useToast();
  const { data: planLimits } = usePlanLimits();

  const whiteLabelMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      await apiRequest("PATCH", "/api/auth/white-label", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "White label setting updated!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const isWhiteLabelEnabled = planLimits?.whiteLabelEnabled ?? false;
  const currentlyEnabled = user?.whiteLabelEnabled ?? false;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="w-4 h-4" /> White Label
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Remove VisiCardly branding from your public profile pages and QR codes.
        </p>
        {isWhiteLabelEnabled ? (
          <div className="flex items-center justify-between">
            <span className="text-sm">White Label Branding</span>
            <Switch
              checked={currentlyEnabled}
              onCheckedChange={(checked) => whiteLabelMutation.mutate(checked)}
              disabled={whiteLabelMutation.isPending}
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Available on Enterprise plans.</span>
            <Button variant="ghost" size="sm" className="text-xs p-0 h-auto" onClick={() => onNavigateBilling?.()}>
              Upgrade
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ApiAccessCard() {
  const { toast } = useToast();
  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const { data: teamData } = useQuery<any>({
    queryKey: ["/api/teams", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return null;
      const res = await fetch(`/api/teams/${user.teamId}`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user?.teamId,
  });
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/generate-api-key");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "API key generated!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/auth/revoke-api-key");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({ title: "API key revoked" });
    },
    onError: (err: any) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const apiKey = user?.apiKey;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const curlExample = `curl -H "X-API-Key: ${apiKey || 'YOUR_API_KEY'}" ${baseUrl}/api/v1/data`;

  const copyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlExample);
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  if (!teamData || teamData.ownerId !== user?.id) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Key className="w-4 h-4" /> API Access
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Generate an API key to access your team's contacts and member information programmatically.
        </p>

        {apiKey ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">API Key</Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={showKey ? apiKey : "••••••••••••••••••••••••••••••••"}
                  className="text-xs font-mono"
                  data-testid="input-api-key"
                />
                <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setShowKey(!showKey)} data-testid="button-toggle-api-key">
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0" onClick={copyKey} data-testid="button-copy-api-key">
                  {copiedKey ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">cURL Example</Label>
              <div className="relative">
                <pre className="text-[10px] bg-muted p-3 rounded-md overflow-x-auto font-mono whitespace-pre-wrap break-all" data-testid="text-curl-example">
                  {curlExample}
                </pre>
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={copyCurl} data-testid="button-copy-curl">
                  {copiedCurl ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              This API returns your team's contact list and team member details (name, email, public URL).
            </p>

            <Button variant="destructive" size="sm" className="w-full" onClick={() => revokeMutation.mutate()} disabled={revokeMutation.isPending} data-testid="button-revoke-api-key">
              {revokeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Revoke API Key"}
            </Button>
          </div>
        ) : (
          <Button className="w-full" size="sm" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending} data-testid="button-generate-api-key">
            {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate API Key"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface AnalyticsSummary {
  totalViews: number;
  totalClicks: number;
  viewsByDay: { date: string; count: number }[];
  clicksByDay: { date: string; count: number }[];
  topBlocks: { blockId: string; title: string; type: string; clicks: number }[];
  topReferrers: { referrer: string; count: number }[];
  topPages: { pageSlug: string; views: number }[];
}

function getBlockTypeIcon(type: string) {
  switch (type) {
    case "url_button": return <Link2 className="w-3.5 h-3.5" />;
    case "email_button": return <Mail className="w-3.5 h-3.5" />;
    case "text": return <Type className="w-3.5 h-3.5" />;
    case "video": return <Video className="w-3.5 h-3.5" />;
    case "audio": return <Music className="w-3.5 h-3.5" />;
    case "image": return <ImageIcon className="w-3.5 h-3.5" />;
    default: return <Link2 className="w-3.5 h-3.5" />;
  }
}

function AnalyticsPanel({ username }: { username: string }) {
  const { data, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics"],
    refetchInterval: 30000,
  });

  const allDays: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    allDays.push(d.toISOString().slice(0, 10));
  }

  const viewsMap = new Map(data?.viewsByDay?.map((d) => [d.date, d.count]) || []);
  const clicksMap = new Map(data?.clicksByDay?.map((d) => [d.date, d.count]) || []);

  const chartData = allDays.map((date) => ({
    date,
    label: new Date(date + "T00:00:00").toLocaleDateString("en", { weekday: "short" }),
    fullDate: new Date(date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" }),
    views: viewsMap.get(date) || 0,
    clicks: clicksMap.get(date) || 0,
  }));

  const chartMax = Math.max(...chartData.map((d) => Math.max(d.views, d.clicks)), 1);

  const totalViews = data?.totalViews ?? 0;
  const totalClicks = data?.totalClicks ?? 0;
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";
  const hasData = totalViews > 0 || totalClicks > 0;

  return (
    <div className="p-4 space-y-6">
      <SectionHeader title="Analytics" />
      <div>
        <h3 className="text-sm font-semibold mb-1">Performance</h3>
        <p className="text-xs text-muted-foreground mb-4">Real-time stats from the last 30 days.</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-6 text-center">
            <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">No visitors yet</p>
            <p className="text-xs text-muted-foreground mb-3">
              Share your profile link to start tracking real views and clicks.
            </p>
            <div className="flex items-center gap-2 justify-center">
              <code className="text-xs bg-muted px-2 py-1 rounded" data-testid="text-profile-url-analytics">
                {window.location.origin}/{username}
              </code>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <Eye className="w-4 h-4 text-primary mb-1" />
                <p className="text-xl font-bold" data-testid="text-analytics-views">{totalViews}</p>
                <p className="text-[10px] text-muted-foreground">Views</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <MousePointerClick className="w-4 h-4 text-primary mb-1" />
                <p className="text-xl font-bold" data-testid="text-analytics-clicks">{totalClicks}</p>
                <p className="text-[10px] text-muted-foreground">Clicks</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 flex flex-col items-center text-center">
                <BarChart3 className="w-4 h-4 text-primary mb-1" />
                <p className="text-xl font-bold" data-testid="text-analytics-ctr">{ctr}%</p>
                <p className="text-[10px] text-muted-foreground">CTR</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <h4 className="text-sm font-semibold mb-3">Last 7 Days</h4>
              <div className="space-y-2">
                {chartData.map((day) => (
                  <div key={day.date} className="flex items-center gap-2" data-testid={`chart-row-${day.date}`}>
                    <div className="text-right shrink-0 w-14">
                      <span className="text-[10px] text-muted-foreground">{day.fullDate}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2.5 rounded-sm bg-primary transition-all"
                          style={{ width: `${Math.max((day.views / chartMax) * 100, day.views > 0 ? 4 : 1)}%` }}
                          data-testid={`bar-views-${day.date}`}
                        />
                        {day.views > 0 && <span className="text-[10px] font-medium">{day.views}</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <div
                          className="h-2.5 rounded-sm bg-primary/40 transition-all"
                          style={{ width: `${Math.max((day.clicks / chartMax) * 100, day.clicks > 0 ? 4 : 1)}%` }}
                          data-testid={`bar-clicks-${day.date}`}
                        />
                        {day.clicks > 0 && <span className="text-[10px] font-medium">{day.clicks}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded-sm bg-primary" />
                  <span>Views</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-2 rounded-sm bg-primary/40" />
                  <span>Clicks</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {data?.topBlocks && data.topBlocks.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Top Clicked</h4>
                <div className="space-y-2">
                  {data.topBlocks.slice(0, 5).map((item, idx) => (
                    <div key={item.blockId} className="flex items-center gap-2 text-sm" data-testid={`top-block-${idx}`}>
                      <span className="text-muted-foreground text-xs w-4 shrink-0">{idx + 1}.</span>
                      <span className="text-muted-foreground shrink-0">{getBlockTypeIcon(item.type)}</span>
                      <span className="flex-1 truncate text-xs">{item.title}</span>
                      <span className="font-semibold text-xs tabular-nums">{item.clicks}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data?.topPages && data.topPages.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Top Pages</h4>
                <div className="space-y-2">
                  {data.topPages.map((p, idx) => (
                    <div key={p.pageSlug} className="flex items-center gap-2 text-sm" data-testid={`top-page-${idx}`}>
                      <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-xs capitalize">{p.pageSlug === "home" ? "Home" : p.pageSlug}</span>
                      <span className="font-semibold text-xs tabular-nums">{p.views} views</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {data?.topReferrers && data.topReferrers.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold mb-3">Traffic Sources</h4>
                <div className="space-y-2">
                  {data.topReferrers.map((r, idx) => (
                    <div key={r.referrer} className="flex items-center gap-2 text-sm" data-testid={`referrer-${idx}`}>
                      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="flex-1 truncate text-xs">{r.referrer}</span>
                      <span className="font-semibold text-xs tabular-nums">{r.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

type QRStyle = "circle" | "square" | "stripe" | "full" | "gradient" | "elegant" | "badge" | "modern" | "ticket" | "heart" | "bubble" | "tag" | "poster";

interface SavedQRCode {
  id: string;
  label: string;
  targetUrl: string | null;
  style: QRStyle;
  color: string;
  color2: string;
  borderRadius: number;
  borderWidth: number;
  logoUrl: string | null;
  scanText: boolean;
  qrType: string;
}

function QRCodePanel({ profileUrl, username }: { profileUrl: string; username: string }) {
  const { toast } = useToast();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: currentUser } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const isWhiteLabel = currentUser?.whiteLabelEnabled ?? false;

  const { data: savedQRCodes = [], isLoading: qrLoading } = useQuery<SavedQRCode[]>({
    queryKey: ["/api/qrcodes", { type: "profile" }],
    queryFn: async () => {
      const res = await fetch("/api/qrcodes?type=profile", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const [qrStyle, setQrStyle] = useState<QRStyle>("circle");
  const [qrColor, setQrColor] = useState("#6C5CE7");
  const [qrColor2, setQrColor2] = useState("#FF6B6B");
  const [borderRadius, setBorderRadius] = useState(0);
  const [borderWidth, setBorderWidth] = useState(2);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [scanText, setScanText] = useState(false);
  const [customText, setCustomText] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState<QRTemplateCategory>("all");
  const [downloadingQrId, setDownloadingQrId] = useState<string | null>(null);

  const applyTemplate = (template: QRTemplate) => {
    setSelectedTemplateId(template.id);
    setQrStyle(template.style);
    setQrColor(template.color);
    setQrColor2(template.color2);
    setBorderRadius(template.borderRadius);
    setBorderWidth(template.borderWidth);
    setScanText(template.scanText);
  };

  const clearTemplate = () => {
    setSelectedTemplateId(null);
  };

  const filteredTemplates = templateCategory === "all" ? QR_TEMPLATES : QR_TEMPLATES.filter(t => t.category === templateCategory);

  const createQrMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/qrcodes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qrcodes"] });
      toast({ title: "QR code created!" });
      setShowCreateForm(false);
      resetForm();
    },
  });

  const updateQrMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/qrcodes/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qrcodes"] });
      toast({ title: "QR code updated!" });
      setShowCreateForm(false);
      resetForm();
    },
  });

  const deleteQrMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/qrcodes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/qrcodes"] });
      toast({ title: "QR code deleted" });
    },
  });

  const resetForm = () => {
    setQrStyle("circle");
    setQrColor("#6C5CE7");
    setQrColor2("#FF6B6B");
    setBorderRadius(0);
    setBorderWidth(2);
    setLogoPreview(null);
    setScanText(false);
    setCustomText("");
    setSelectedTemplateId(null);
    setTemplateCategory("all");
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const openEdit = (qr: SavedQRCode) => {
    setQrStyle(qr.style as QRStyle);
    setQrColor(qr.color);
    setQrColor2(qr.color2 || "#FF6B6B");
    setBorderRadius(qr.borderRadius);
    setBorderWidth(qr.borderWidth);
    setLogoPreview(qr.logoUrl);
    setScanText(qr.scanText || false);
    setCustomText(qr.label && qr.label !== "Profile QR" && qr.label !== "QR Code" ? qr.label : "");
    setEditingId(qr.id);
    setShowCreateForm(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    const qrData = { style: qrStyle, color: qrColor, color2: qrColor2, borderRadius, borderWidth, logoUrl: logoPreview, scanText, qrType: "profile", label: customText.trim() || "Profile QR" };
    if (editingId) {
      updateQrMutation.mutate({ id: editingId, data: qrData });
    } else {
      createQrMutation.mutate(qrData);
    }
  };

  const handleDelete = (id: string) => {
    deleteQrMutation.mutate(id);
  };

  const downloadQR = async (elementId: string, filename: string, _qrConfig?: SavedQRCode, trackingId?: string) => {
    const container = document.getElementById(`qr-download-wrap-${elementId}`);
    if (!container) return;
    if (trackingId) setDownloadingQrId(trackingId);
    try {
      const dataUrl = await toPng(container, {
        pixelRatio: 4,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = filename;
      a.click();
      toast({ title: "QR code downloaded!" });
    } catch (err) {
      console.error("QR download failed", err);
      toast({ title: "Download failed", description: "Please try again" });
    } finally {
      if (trackingId) setDownloadingQrId(null);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(profileUrl);
    toast({ title: "Profile link copied!" });
  };

  const getQRProps = (qr: { style: QRStyle; color: string; logoUrl: string | null }) => {
    const base = {
      value: profileUrl,
      level: "H" as const,
      fgColor: qr.style === "full" ? "#ffffff" : qr.color,
      bgColor: "transparent",
      imageSettings: qr.logoUrl
        ? { src: qr.logoUrl, height: 30, width: 30, excavate: true }
        : undefined,
    };
    return base;
  };

  const getContainerStyle = (qr: { style: QRStyle; borderRadius: number; borderWidth: number; color: string; color2?: string; scanText?: boolean }) => {
    const style: React.CSSProperties = {
      overflow: "visible",
      padding: "16px",
      background: "white",
      position: "relative",
      transition: "all 0.3s ease",
    };
    switch (qr.style) {
      case "circle":
        style.borderRadius = "50%";
        style.border = `${Math.max(qr.borderWidth, 3)}px solid ${qr.color}`;
        style.overflow = "hidden";
        style.boxShadow = `0 4px 20px ${qr.color}25, 0 0 0 4px ${qr.color}08`;
        break;
      case "square":
        style.borderRadius = `${qr.borderRadius}px`;
        style.border = `${qr.borderWidth}px solid ${qr.color}`;
        style.boxShadow = `0 4px 16px ${qr.color}20`;
        break;
      case "stripe":
        style.borderRadius = `${qr.borderRadius}px`;
        style.borderTop = `${Math.max(qr.borderWidth, 4)}px solid ${qr.color}`;
        style.borderBottom = `${Math.max(qr.borderWidth, 4)}px solid ${qr.color}`;
        style.boxShadow = `0 4px 16px rgba(0,0,0,0.06)`;
        break;
      case "full":
        style.borderRadius = `${qr.borderRadius}px`;
        style.background = qr.color;
        style.padding = "20px";
        style.boxShadow = `0 8px 32px ${qr.color}40, inset 0 1px 0 rgba(255,255,255,0.1)`;
        break;
      case "gradient":
        style.borderRadius = `${qr.borderRadius || 16}px`;
        style.border = `${Math.max(qr.borderWidth, 4)}px solid transparent`;
        style.backgroundImage = `linear-gradient(white, white), linear-gradient(135deg, ${qr.color}, ${qr.color2 || "#FF6B6B"})`;
        style.backgroundOrigin = "border-box";
        style.backgroundClip = "padding-box, border-box";
        style.boxShadow = `0 8px 32px ${qr.color}30, 0 0 0 1px ${qr.color}10`;
        break;
      case "elegant":
        style.borderRadius = `${qr.borderRadius || 12}px`;
        style.border = `${Math.max(qr.borderWidth, 2)}px solid ${qr.color}`;
        style.boxShadow = `0 0 0 ${Math.max(qr.borderWidth, 2) + 3}px white, 0 0 0 ${Math.max(qr.borderWidth, 2) + 5}px ${qr.color}, 0 8px 24px ${qr.color}20`;
        break;
      case "badge":
        style.borderRadius = `${qr.borderRadius || 20}px`;
        style.border = `${Math.max(qr.borderWidth, 3)}px solid ${qr.color}`;
        style.padding = "18px 14px 28px 14px";
        style.boxShadow = `0 6px 24px ${qr.color}25`;
        break;
      case "modern":
        style.borderRadius = `${qr.borderRadius || 20}px`;
        style.boxShadow = `0 12px 40px ${qr.color}25, 0 4px 12px rgba(0,0,0,0.06)`;
        style.border = `2px solid ${qr.color}15`;
        style.padding = "18px 14px 28px 14px";
        break;
      case "ticket":
        style.borderRadius = `${qr.borderRadius || 16}px`;
        style.border = `${Math.max(qr.borderWidth, 2)}px dashed ${qr.color}`;
        style.padding = "18px 14px 28px 14px";
        style.boxShadow = `0 4px 16px ${qr.color}15`;
        break;
      case "heart":
        style.background = qr.color;
        style.width = "fit-content";
        style.padding = "0";
        style.overflow = "visible";
        style.borderRadius = "0";
        style.border = "none";
        style.filter = `drop-shadow(0 8px 24px ${qr.color}40)`;
        break;
      case "bubble":
        style.borderRadius = `${qr.borderRadius || 24}px`;
        style.border = `${Math.max(qr.borderWidth, 3)}px solid ${qr.color}`;
        style.padding = "18px 14px 28px 14px";
        style.marginBottom = "16px";
        style.boxShadow = `0 6px 24px ${qr.color}20`;
        break;
      case "tag":
        style.borderRadius = "50%";
        style.border = `${Math.max(qr.borderWidth, 4)}px solid ${qr.color}`;
        style.background = "white";
        style.padding = "18px";
        style.marginTop = "16px";
        style.overflow = "visible";
        style.boxShadow = `0 8px 28px ${qr.color}35`;
        break;
    }
    return style;
  };

  const renderScanText = (qr: { style: QRStyle; color: string; scanText?: boolean }, size: number) => {
    const showText = qr.scanText || ["badge", "modern", "ticket", "bubble", "tag"].includes(qr.style);
    if (!showText) return null;
    const fontSize = Math.max(size * 0.08, 9);
    return (
      <div
        className="text-center font-extrabold tracking-[0.15em] uppercase mt-2"
        style={{ color: qr.style === "heart" ? "#ffffff" : qr.color, fontSize: `${fontSize}px` }}
        data-testid="text-scan-me"
      >
        SCAN ME
      </div>
    );
  };

  const renderFrameDecorations = (qr: { style: QRStyle; color: string; borderWidth: number }) => {
    if (qr.style === "bubble") {
      return (
        <div style={{
          position: "absolute",
          bottom: "-14px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderTop: `14px solid ${qr.color}`,
          filter: `drop-shadow(0 2px 4px ${qr.color}30)`,
        }} />
      );
    }
    if (qr.style === "tag") {
      return (
        <div style={{
          position: "absolute",
          top: "-12px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          border: `3px solid ${qr.color}`,
          background: "white",
          boxShadow: `0 2px 8px ${qr.color}30`,
        }} />
      );
    }
    return null;
  };

  // Render heart SVG wrapper for the QR code
  const renderHeartQR = (qrElement: React.ReactNode, qr: { color: string; scanText?: boolean; customText?: string }, size: number) => {
    const heartW = size * 1.8;
    const heartH = size * 2.0;
    const qrPad = size * 0.08;
    const textAreaH = (qr.scanText || qr.customText) ? size * 0.35 : 0;
    const totalH = heartH + textAreaH;
    return (
      <div style={{ position: "relative", width: heartW, height: totalH, filter: `drop-shadow(0 8px 24px ${qr.color}40)` }}>
        <svg viewBox="0 0 100 100" width={heartW} height={heartH} style={{ position: "absolute", top: 0, left: 0 }} preserveAspectRatio="none">
          <path d="M50 88 C25 65, 2 45, 2 28 C2 14, 14 2, 28 2 C36 2, 44 6, 50 14 C56 6, 64 2, 72 2 C86 2, 98 14, 98 28 C98 45, 75 65, 50 88Z" fill={qr.color} />
        </svg>
        <div style={{ position: "absolute", top: "16%", left: "50%", transform: "translateX(-50%)", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ background: "white", borderRadius: "8px", padding: `${qrPad}px`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {qrElement}
          </div>
        </div>
        {(qr.scanText || qr.customText) && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
            {qr.scanText && (
              <div className="font-extrabold tracking-[0.15em] uppercase" style={{ color: qr.color, fontSize: `${Math.max(size * 0.09, 8)}px` }}>
                SCAN ME
              </div>
            )}
            {qr.customText && (
              <div className="font-bold" style={{ color: qr.color, fontSize: `${Math.max(size * 0.08, 7)}px`, marginTop: "2px" }}>
                {qr.customText}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render poster-style QR: rectangular layout with text on left, QR on right
  const renderPosterQR = (qrElement: React.ReactNode, qr: { color: string; scanText?: boolean; customText?: string }, size: number) => {
    const textContent = qr.customText || "";
    const lines = textContent.split("\n");
    return (
      <div style={{
        display: "flex",
        alignItems: "stretch",
        border: `3px solid ${qr.color}`,
        borderRadius: "12px",
        overflow: "hidden",
        minWidth: size * 2.2,
        background: "#ffffff",
      }}>
        <div style={{
          flex: "1 1 0",
          padding: `${size * 0.12}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: size * 0.8,
          background: `linear-gradient(135deg, ${qr.color}08, ${qr.color}15)`,
        }}>
          {lines.map((line, i) => (
            <div key={i} style={{
              fontSize: i === 0 ? `${Math.max(size * 0.13, 11)}px` : `${Math.max(size * 0.09, 8)}px`,
              fontWeight: i === 0 ? 700 : 400,
              color: i === 0 ? qr.color : "#374151",
              lineHeight: 1.4,
              marginTop: line === "" ? `${size * 0.06}px` : "0",
              whiteSpace: "pre-wrap",
            }}>
              {line || "\u00A0"}
            </div>
          ))}
          {qr.scanText && (
            <div style={{
              marginTop: `${size * 0.08}px`,
              fontSize: `${Math.max(size * 0.07, 7)}px`,
              fontWeight: 800,
              color: qr.color,
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
            }}>
              SCAN ME →
            </div>
          )}
        </div>
        <div style={{
          padding: `${size * 0.1}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderLeft: `2px solid ${qr.color}20`,
        }}>
          {qrElement}
        </div>
      </div>
    );
  };

  const styleOptions: { value: QRStyle; label: string; icon: string }[] = [
    { value: "circle", label: "Circle", icon: "○" },
    { value: "square", label: "Square", icon: "□" },
    { value: "stripe", label: "Stripe", icon: "≡" },
    { value: "full", label: "Solid", icon: "■" },
    { value: "gradient", label: "Gradient", icon: "◈" },
    { value: "elegant", label: "Elegant", icon: "◇" },
    { value: "badge", label: "Badge", icon: "⬡" },
    { value: "modern", label: "Modern", icon: "◉" },
    { value: "ticket", label: "Ticket", icon: "⎕" },
    { value: "heart", label: "Heart", icon: "♥" },
    { value: "bubble", label: "Bubble", icon: "💬" },
    { value: "tag", label: "Tag", icon: "⏣" },
    { value: "poster", label: "Poster", icon: "📋" },
  ];

  return (
    <div className="p-4 space-y-6">
      <SectionHeader title="QR Codes" />
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold" data-testid="text-qr-title">QR Codes</h2>
        <p className="text-sm text-muted-foreground">Create unlimited dynamic QR codes and track their usage.</p>
      </div>
      <div className="flex justify-center">
        <Button onClick={openCreate} className="gap-2" data-testid="button-create-qr">
          Create QR Code
          <Plus className="w-4 h-4" />
        </Button>
      </div>
{showCreateForm && (
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold" data-testid="text-create-qr-title">{editingId ? "Edit QR Code" : "Create QR Code"}</h3>
                <p className="text-sm text-muted-foreground">Choose a template or customize from scratch.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setShowCreateForm(false); resetForm(); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>

          {/* Template Picker */}
          <div className="space-y-3 mb-6">
            <span className="text-xs font-medium text-muted-foreground block">Quick Templates</span>
            <div className="flex flex-wrap gap-1.5">
              {QR_TEMPLATE_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setTemplateCategory(cat.value)}
                  className={`text-xs px-2.5 py-1 rounded-full transition-all border ${
                    templateCategory === cat.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2 max-h-[160px] overflow-y-auto pr-1">
              <button
                type="button"
                onClick={clearTemplate}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all text-xs ${
                  !selectedTemplateId
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-muted"
                }`}
              >
                <div className="w-10 h-10 rounded-md border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                  <Settings className="w-4 h-4 text-muted-foreground/50" />
                </div>
                <span className="font-medium text-muted-foreground truncate w-full text-center">Custom</span>
              </button>
              {filteredTemplates.map((t) => {
                const getTemplateThumbStyle = (): React.CSSProperties => {
                  const base: React.CSSProperties = { width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", transition: "all 0.2s ease" };
                  if (t.style === "heart") return { ...base, background: "transparent", border: "none", color: t.color };
                  if (t.style === "circle") return { ...base, borderRadius: "50%", border: `2px solid ${t.color}`, background: `${t.color}08`, boxShadow: `0 2px 8px ${t.color}20` };
                  if (t.style === "full") return { ...base, borderRadius: "8px", background: t.color, color: "#fff", boxShadow: `0 3px 12px ${t.color}35` };
                  if (t.style === "gradient") return { ...base, borderRadius: "8px", background: `linear-gradient(135deg, ${t.color}, ${t.color2})`, color: "#fff", boxShadow: `0 3px 12px ${t.color}30` };
                  if (t.style === "elegant") return { ...base, borderRadius: "6px", border: `2px solid ${t.color}`, boxShadow: `0 0 0 3px white, 0 0 0 5px ${t.color}40, 0 2px 8px ${t.color}20` };
                  if (t.style === "ticket") return { ...base, borderRadius: "6px", border: `2px dashed ${t.color}`, background: `${t.color}05` };
                  if (t.style === "modern") return { ...base, borderRadius: "10px", border: `1px solid ${t.color}20`, boxShadow: `0 4px 16px ${t.color}20`, background: "white" };
                  if (t.style === "badge") return { ...base, borderRadius: "10px", border: `2px solid ${t.color}`, background: `${t.color}06`, boxShadow: `0 2px 8px ${t.color}15` };
                  if (t.style === "bubble") return { ...base, borderRadius: "10px", border: `2px solid ${t.color}`, background: `${t.color}06` };
                  if (t.style === "tag") return { ...base, borderRadius: "50%", background: t.color, color: "#fff", boxShadow: `0 3px 12px ${t.color}35` };
                  if (t.style === "stripe") return { ...base, borderRadius: "4px", borderTop: `3px solid ${t.color}`, borderBottom: `3px solid ${t.color}` };
                  return { ...base, borderRadius: "6px", border: `2px solid ${t.color}`, background: `${t.color}08` };
                };
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => applyTemplate(t)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-xs group ${
                      selectedTemplateId === t.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-transparent hover:bg-muted/60 hover:shadow-sm"
                    }`}
                  >
                    <div style={getTemplateThumbStyle()} className="group-hover:scale-110 transition-transform">
                      {t.style === "heart" ? (
                        <svg viewBox="0 0 40 40" width="40" height="40">
                          <path d="M20 35 C10 25, 2 18, 2 12 C2 6, 7 2, 12 2 C15 2, 18 4, 20 8 C22 4, 25 2, 28 2 C33 2, 38 6, 38 12 C38 18, 30 25, 20 35Z" fill={t.color} />
                          <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="10" fill="white">{t.icon}</text>
                        </svg>
                      ) : t.style === "bubble" ? (
                        <div style={{ position: "relative" }}>
                          <span>{t.icon}</span>
                          <div style={{ position: "absolute", bottom: "-6px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `5px solid ${t.color}` }} />
                        </div>
                      ) : t.style === "tag" ? (
                        <div style={{ position: "relative" }}>
                          <span>{t.icon}</span>
                          <div style={{ position: "absolute", top: "-6px", left: "50%", transform: "translateX(-50%)", width: "8px", height: "8px", borderRadius: "50%", border: `2px solid rgba(255,255,255,0.8)` }} />
                        </div>
                      ) : (
                        <span>{t.icon}</span>
                      )}
                    </div>
                    <span className="font-medium text-foreground truncate w-full text-center">{t.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

            <div className="flex flex-col lg:flex-row gap-6">
              {/* Controls */}
              <div className="flex-1 space-y-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground mb-2 block">Frame Style</span>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5" data-testid="tabs-qr-style">
                    {styleOptions.map((opt) => (
                      <button
                        type="button"
                        key={opt.value}
                        onClick={() => setQrStyle(opt.value)}
                        className={`flex flex-col items-center gap-0.5 text-xs py-2 px-1 rounded-lg transition-all border-2 ${
                          qrStyle === opt.value
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                        data-testid={`button-qr-style-${opt.value}`}
                      >
                        <span className="text-base leading-none">{opt.icon}</span>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-md border">
                    <span className="text-sm flex-1">Primary Color</span>
                    <input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)}
                      className="w-8 h-8 rounded-full border-0 cursor-pointer" style={{ padding: 0, background: "transparent" }} data-testid="input-qr-color" />
                  </div>
                  {qrStyle === "gradient" && (
                    <div className="flex items-center gap-3 p-3 rounded-md border">
                      <span className="text-sm flex-1">Secondary Color</span>
                      <input type="color" value={qrColor2} onChange={(e) => setQrColor2(e.target.value)}
                        className="w-8 h-8 rounded-full border-0 cursor-pointer" style={{ padding: 0, background: "transparent" }} data-testid="input-qr-color2" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-md border">
                    <span className="text-sm shrink-0">Radius</span>
                    <Slider value={[borderRadius]} onValueChange={(val) => setBorderRadius(val[0])} min={0} max={50} step={1} className="flex-1" data-testid="slider-border-radius" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md border">
                    <span className="text-sm shrink-0">Width</span>
                    <Slider value={[borderWidth]} onValueChange={(val) => setBorderWidth(val[0])} min={0} max={10} step={1} className="flex-1" data-testid="slider-border-width" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-md border">
                    <span className="text-sm flex-1">Scan Me Text</span>
                    <Switch checked={scanText} onCheckedChange={setScanText} data-testid="switch-scan-text" />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-md border">
                    <span className="text-sm flex-1">Logo</span>
                    <label className="cursor-pointer" data-testid="button-upload-logo">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <div className="w-9 h-9 rounded-md border flex items-center justify-center hover:bg-muted transition-colors">
                        <Upload className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </label>
                  </div>
                </div>

                {logoPreview && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <img src={logoPreview} alt="Logo preview" className="w-6 h-6 rounded object-cover" />
                    <span>Logo added</span>
                    <Button size="icon" variant="ghost" onClick={() => setLogoPreview(null)} data-testid="button-remove-logo">
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <div className="space-y-1.5 p-3 rounded-md border">
                  <span className="text-sm">{qrStyle === "poster" ? "Poster Text (multi-line)" : "Custom Text (Name / Company)"}</span>
                  {qrStyle === "poster" ? (
                    <Textarea value={customText} onChange={(e) => setCustomText(e.target.value)}
                      placeholder={"e.g.\nJohn Doe\nSoftware Engineer\n\nScan to connect!"} className="text-sm min-h-[80px]" maxLength={200} data-testid="input-qr-custom-text" />
                  ) : (
                    <Input value={customText} onChange={(e) => setCustomText(e.target.value)}
                      placeholder="e.g. John Doe or Acme Inc." className="text-sm" maxLength={50} data-testid="input-qr-custom-text" />
                  )}
                </div>

                <Button onClick={handleCreate} className="w-full" data-testid="button-save-qr">
                  {editingId ? "Save Changes" : "Create"}
                </Button>
              </div>

              {/* Live Preview */}
              <div className="flex items-start justify-center lg:w-[280px] lg:sticky lg:top-4">
                <div className="rounded-2xl bg-gradient-to-br from-muted/40 to-muted/20 p-6 flex items-center justify-center">
                  {qrStyle === "heart" ? (
                    renderHeartQR(
                      <QRCodeSVG id="create-qr-preview" {...getQRProps({ style: qrStyle, color: qrColor, logoUrl: logoPreview })} size={100} data-testid="preview-qr-code" />,
                      { color: qrColor, scanText, customText: customText.trim() || undefined }, 100
                    )
                  ) : qrStyle === "poster" ? (
                    renderPosterQR(
                      <QRCodeSVG id="create-qr-preview" {...getQRProps({ style: qrStyle, color: qrColor, logoUrl: logoPreview })} size={120} data-testid="preview-qr-code" />,
                      { color: qrColor, scanText, customText: customText.trim() || undefined }, 120
                    )
                  ) : (
                    <div style={getContainerStyle({ style: qrStyle, borderRadius, borderWidth, color: qrColor, color2: qrColor2, scanText })} data-testid="preview-qr-container">
                      <QRCodeSVG id="create-qr-preview" {...getQRProps({ style: qrStyle, color: qrColor, logoUrl: logoPreview })} size={160} data-testid="preview-qr-code" />
                      {renderScanText({ style: qrStyle, color: qrColor, scanText }, 160)}
                      {renderFrameDecorations({ style: qrStyle, color: qrColor, borderWidth })}
                      {customText.trim() && (
                        <div className="text-center font-bold mt-1" style={{ color: qrColor, fontSize: "10px" }}>{customText.trim()}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {qrLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                  <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                  <div className="flex gap-1 pt-2">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j} className="h-8 w-8 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                </div>
                <div className="w-[100px] h-[100px] bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : savedQRCodes.length === 0 ? (
        <div className="text-center py-8">
          <QrCode className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No QR codes yet. Create your first one!</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {savedQRCodes.map((qr) => (
          <Card key={qr.id}>
            <CardContent className="p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-[120px] space-y-1">
                <p className="text-sm font-semibold" data-testid={`text-qr-views-${qr.id}`}>Total Views: 0</p>
                <p className="text-sm text-muted-foreground">Code Type: Profile</p>
                <div className="flex gap-1 pt-2">
                  <Button size="icon" variant="outline" onClick={() => openEdit(qr)} data-testid={`button-edit-qr-${qr.id}`}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={copyLink} data-testid={`button-share-qr-${qr.id}`}>
                    <Share2 className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => downloadQR(`qr-saved-${qr.id}`, `${username}-qrcode-${qr.id}.png`, qr, qr.id)}
                    disabled={downloadingQrId === qr.id}
                    data-testid={`button-download-qr-${qr.id}`}
                  >
                    {downloadingQrId === qr.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => handleDelete(qr.id)} data-testid={`button-delete-qr-${qr.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div id={`qr-download-wrap-qr-saved-${qr.id}`} style={{ display: "inline-block", padding: "12px", background: "#ffffff" }}>
              {qr.style === "heart" ? (
                renderHeartQR(
                  <QRCodeSVG id={`qr-saved-${qr.id}`} {...getQRProps(qr)} size={60} data-testid={`display-qr-${qr.id}`} />,
                  { color: qr.color, scanText: qr.scanText, customText: qr.label && qr.label !== "Profile QR" && qr.label !== "QR Code" ? qr.label : undefined },
                  60
                )
              ) : qr.style === "poster" ? (
                renderPosterQR(
                  <QRCodeSVG id={`qr-saved-${qr.id}`} {...getQRProps(qr)} size={80} data-testid={`display-qr-${qr.id}`} />,
                  { color: qr.color, scanText: qr.scanText, customText: qr.label && qr.label !== "Profile QR" && qr.label !== "QR Code" ? qr.label : undefined },
                  80
                )
              ) : (
                <div style={getContainerStyle(qr)} className="shrink-0" data-qr-container>
                  <QRCodeSVG
                    id={`qr-saved-${qr.id}`}
                    {...getQRProps(qr)}
                    size={100}
                    data-testid={`display-qr-${qr.id}`}
                  />
                  {renderScanText(qr, 100)}
                  {renderFrameDecorations(qr)}
                  {qr.label && qr.label !== "Profile QR" && qr.label !== "QR Code" && (
                    <div className="text-center font-bold mt-1" style={{ color: qr.color, fontSize: "8px" }}>
                      {qr.label}
                    </div>
                  )}
                </div>
              )}
              {!isWhiteLabel && <p style={{ color: "#9ca3af", fontSize: "6px", textAlign: "center", marginTop: "4px" }}>Powered by VisiCardly</p>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

    </div>
  );
}

function DesignPanel({
  currentTemplateId,
  onSelectTemplate,
  saving,
  disabled = false,
}: {
  currentTemplateId: string;
  onSelectTemplate: (id: string) => void;
  saving: boolean;
  disabled?: boolean;
}) {
  const currentTemplate = getTemplate(currentTemplateId);
  const { data: designPlanLimits } = usePlanLimits();
  const allowedThemeCategories = designPlanLimits?.themeCategories ?? ["starter"];

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-4">General Styles</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Primary Text Color</span>
            <div
              className="w-6 h-6 rounded-full border border-border shrink-0"
              style={{ backgroundColor: currentTemplate.accent }}
              data-testid="display-primary-text-color"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Primary Background</span>
            <div
              className={`w-6 h-6 rounded-full border border-border shrink-0 ${currentTemplate.bg.includes("gradient") ? currentTemplate.bg : ""}`}
              style={!currentTemplate.bg.includes("gradient") ? { backgroundColor: currentTemplate.bg.match(/#[0-9a-fA-F]{6}/)?.[0] || "#f5f0eb" } : {}}
              data-testid="display-primary-bg"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Card Background</span>
            <div
              className={`w-6 h-6 rounded-full border border-border shrink-0 ${currentTemplate.cardBg}`}
              data-testid="display-card-bg"
            />
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.filter((t) => allowedThemeCategories.includes(t.category)).map((t) => {
            const layoutLabel = LAYOUT_LABELS[t.layout as LayoutType] || "Classic";
            const avatarShape = t.avatarStyle === "circle" ? "rounded-full" : t.avatarStyle === "rounded" ? "rounded-md" : "rounded-sm";
            const btnShape = t.buttonStyle === "rounded" ? "rounded-full" : t.buttonStyle === "sharp" ? "rounded-none" : t.buttonStyle === "outline" ? "rounded-md border border-current/20 bg-transparent" : "rounded-lg";
            return (
              <button
                key={t.id}
                onClick={() => onSelectTemplate(t.id)}
                disabled={saving || disabled}
                className={`relative rounded-md overflow-hidden aspect-[3/4] p-2 flex flex-col items-center justify-center text-center transition-all border-2 ${
                  currentTemplateId === t.id ? "border-primary ring-1 ring-primary/20" : "border-transparent"
                } ${t.bg}`}
                data-testid={`theme-${t.id}`}
              >
                {currentTemplateId === t.id && (
                  <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="w-2.5 h-2.5" />
                  </div>
                )}
                <div className="absolute top-1 left-1">
                  <span className="text-[7px] font-bold px-1.5 py-0.5 rounded-full bg-black/30 text-white backdrop-blur-sm">{layoutLabel}</span>
                </div>
                {t.layout === "bold" ? (
                  <>
                    <div className="w-full h-4 rounded-sm mb-1" style={{ backgroundColor: t.accent + "30" }} />
                    <div className={`w-5 h-5 ${avatarShape} bg-white/30 -mt-3 mb-1 relative z-10 border border-white/30`} />
                    <span className={`text-[9px] font-semibold ${t.textColor}`}>{t.name}</span>
                    <div className="mt-1 space-y-0.5 w-full">
                      <div className={`h-2.5 ${btnShape} ${t.buttonStyle === "outline" ? "" : t.cardBg} w-full`} />
                      <div className={`h-2.5 ${btnShape} ${t.buttonStyle === "outline" ? "" : t.cardBg} w-full`} />
                    </div>
                  </>
                ) : t.layout === "modern" ? (
                  <>
                    {/* Split-panel card thumbnail */}
                    <div className="w-full rounded-md overflow-hidden mb-1" style={{ border: `1px solid ${t.accent}25` }}>
                      <div className="flex h-10">
                        <div className={`w-2/5 flex flex-col items-center justify-center gap-0.5 ${t.cardBg} relative`}>
                          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: t.accent }} />
                          <div className={`w-4 h-4 ${avatarShape} bg-white/30 border border-white/20`} />
                          <div className={`h-0.5 w-5 rounded-full opacity-40 bg-current ${t.cardTextColor}`} />
                        </div>
                        <div className="w-3/5 p-1.5 flex flex-col justify-center gap-0.5" style={{ backgroundColor: `${t.accent}08` }}>
                          <div className={`h-1 w-7 rounded-full opacity-50 bg-current ${t.cardTextColor}`} />
                          <div className={`h-0.5 w-5 rounded-full opacity-30 bg-current ${t.cardTextColor}`} />
                          <div className="mt-0.5 h-1.5 rounded-sm w-full opacity-25" style={{ backgroundColor: t.accent }} />
                        </div>
                      </div>
                    </div>
                    <span className={`text-[9px] font-semibold ${t.textColor}`}>{t.name}</span>
                    <div className="mt-1 space-y-0.5 w-full">
                      <div className={`h-2.5 ${btnShape} ${t.buttonStyle === "outline" ? "" : t.cardBg} w-full`} />
                    </div>
                  </>
                ) : t.layout === "elegant" ? (
                  <>
                    <div className="w-full h-0.5 rounded-full mb-1.5" style={{ backgroundColor: t.accent }} />
                    <div className={`w-full ${t.cardBg} rounded-md p-1.5 mb-1`}>
                      <div className={`w-5 h-5 ${avatarShape} bg-white/30 mx-auto mb-1`} />
                      <div className={`h-1 w-8 rounded-full ${t.cardTextColor} opacity-40 bg-current mx-auto mb-0.5`} />
                      <div className="w-4 h-px mx-auto my-1" style={{ backgroundColor: t.accent + "60" }} />
                    </div>
                    <span className={`text-[9px] font-semibold ${t.textColor}`}>{t.name}</span>
                    <div className="mt-1 space-y-0.5 w-full">
                      <div className={`h-2.5 ${btnShape} ${t.buttonStyle === "outline" ? "" : t.cardBg} w-full`} />
                    </div>
                  </>
                ) : t.layout === "hero" ? (
                  <>
                    <div className="w-full h-5 rounded-sm mb-1 relative" style={{ background: `linear-gradient(180deg, ${t.accent}30, transparent)` }}>
                      <div className={`w-5 h-5 ${avatarShape} bg-white/30 absolute -bottom-2 left-1/2 -translate-x-1/2 border border-white/30`} />
                    </div>
                    <div className={`w-full ${t.cardBg} rounded-md p-1 mt-2`}>
                      <span className={`text-[8px] font-semibold ${t.cardTextColor} block`}>{t.name}</span>
                      <div className="mt-0.5 space-y-0.5">
                        <div className={`h-2 ${btnShape} ${t.buttonStyle === "outline" ? "" : t.cardBg} w-full`} style={t.buttonStyle === "outline" ? { border: `1px solid ${t.accent}40` } : undefined} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`w-5 h-5 ${avatarShape} bg-white/20 mb-1.5`} />
                    <span className={`text-[9px] font-semibold ${t.textColor}`}>{t.name}</span>
                    <div className="mt-1.5 space-y-0.5 w-full">
                      <div className={`h-2.5 ${btnShape} ${t.buttonStyle === "outline" ? "" : t.cardBg} w-full`} />
                      <div className={`h-2.5 ${btnShape} ${t.buttonStyle === "outline" ? "" : t.cardBg} w-full`} />
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold mb-4">Header Styles</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Profile Picture Shadow</span>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="0"
              className="w-20 h-1 accent-primary"
              data-testid="slider-profile-shadow"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Profile Picture Border</span>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="30"
              className="w-20 h-1 accent-primary"
              data-testid="slider-profile-border"
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Collapse Long Bio</span>
            <Switch defaultChecked={false} data-testid="switch-collapse-bio" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPageNav({
  pages,
  currentPage,
  template,
  onPageChange,
}: {
  pages: Page[];
  currentPage: Page | null;
  template: (typeof TEMPLATES)[0];
  onPageChange?: (pageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-3 inline-block">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${template.cardBg} ${template.cardTextColor}`}
        data-testid="preview-page-nav-toggle"
      >
        {currentPage?.title || "Home"}
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className={`absolute top-full mt-1 left-1/2 -translate-x-1/2 min-w-[100px] rounded-lg ${template.cardBg} backdrop-blur-md py-0.5 z-50 shadow-lg`}>
          {pages.map((page) => {
            const isActive = currentPage?.id === page.id;
            return (
              <button
                key={page.id}
                onClick={() => { onPageChange?.(page.id); setOpen(false); }}
                className={`block w-full text-left px-3 py-1 text-[10px] ${
                  isActive
                    ? `${template.cardTextColor} font-medium`
                    : `${template.textColor} opacity-50 hover:opacity-80`
                }`}
              >
                {page.title}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PhonePreview({
  template,
  displayName,
  bio,
  profileImage,
  coverImage,
  username,
  blocks,
  socials,
  pages,
  currentPage,
  mode,
  useOriginalSocialColors,
  onPageChange,
}: {
  template: (typeof TEMPLATES)[0];
  displayName: string;
  bio: string;
  profileImage: string;
  coverImage: string;
  username: string;
  blocks: Block[];
  socials: Social[];
  pages: Page[];
  currentPage: Page | null;
  mode: "mobile" | "desktop";
  useOriginalSocialColors?: boolean;
  onPageChange?: (pageId: string) => void;
}) {
  const activeBlocks = blocks.filter((b) => b.active);
  const activeSocials = socials.filter((s) => s.url);
  const layout = template.layout || "classic";
  const avatarCls = template.avatarStyle === "circle" ? "rounded-full" : template.avatarStyle === "rounded" ? "rounded-xl" : "rounded-md";
  const btnCls = template.buttonStyle === "rounded" ? "rounded-full" : template.buttonStyle === "sharp" ? "rounded-none" : template.buttonStyle === "outline" ? "rounded-xl border-2" : "rounded-xl";
  const isOutline = template.buttonStyle === "outline";
  const name = displayName || "Your Name";
  const shortBio = bio && bio.length > 100 ? bio.slice(0, 100) + "..." : bio;

  const socialIcons = activeSocials.length > 0 ? (
    <div className="flex items-center gap-2 flex-wrap">
      {activeSocials.map((social) => (
        <div key={social.id} className={`${useOriginalSocialColors ? '' : template.textColor} opacity-70`}>
          <SocialIcon platform={social.platform} className="w-3.5 h-3.5" brandColor={useOriginalSocialColors} />
        </div>
      ))}
    </div>
  ) : null;

  const blocksList = (
    <div className="w-full space-y-2">
      {activeBlocks.length > 0 ? (
        activeBlocks.map((block) => (
          <PreviewBlock key={block.id} block={block} template={template} btnCls={btnCls} isOutline={isOutline} />
        ))
      ) : (
        <>
          <div className={`${isOutline ? "bg-transparent" : template.cardBg} ${btnCls} py-2.5 px-4 text-center backdrop-blur-sm`} style={isOutline ? { borderColor: template.accent + "40" } : undefined}>
            <span className={`text-xs font-medium ${isOutline ? template.textColor : template.cardTextColor}`}>Block 1</span>
          </div>
          <div className={`${isOutline ? "bg-transparent" : template.cardBg} ${btnCls} py-2.5 px-4 text-center backdrop-blur-sm`} style={isOutline ? { borderColor: template.accent + "40" } : undefined}>
            <span className={`text-xs font-medium ${isOutline ? template.textColor : template.cardTextColor}`}>Block 2</span>
          </div>
        </>
      )}
    </div>
  );

  const pageNav = pages.length > 1 ? (
    <PreviewPageNav pages={pages} currentPage={currentPage} template={template} onPageChange={onPageChange} />
  ) : null;

  const renderClassic = () => (
    <div className="flex flex-col items-center text-center">
      {coverImage && (
        <div className="w-full h-16 rounded-md overflow-hidden mb-[-1.5rem] shadow-sm">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}
      <Avatar className={`w-16 h-16 border-2 border-white/30 mb-3 ${avatarCls} ${coverImage ? "relative z-10" : ""}`}>
        <AvatarImage src={profileImage || undefined} />
        <AvatarFallback className="bg-white/20 text-lg" style={{ color: template.accent }}>
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <p className={`font-bold text-sm ${template.textColor}`}>{name}</p>
      {shortBio && <p className={`text-[11px] mt-1 ${template.textColor} opacity-80 leading-relaxed max-w-[200px]`}>{shortBio}</p>}
      <div className="justify-center mt-3">{socialIcons}</div>
      {pageNav && <div className="mt-3">{pageNav}</div>}
      <div className="w-full mt-5">{blocksList}</div>
    </div>
  );

  const renderModern = () => (
    <div className="flex flex-col">
      {coverImage && (
        <div className="w-full h-20 rounded-lg overflow-hidden mb-3 shadow-sm">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}
      <div className={`${template.cardBg} backdrop-blur-md rounded-xl p-4 shadow-md`}>
        <div className="flex items-start gap-3">
          <Avatar className={`w-12 h-12 border-2 shadow-md shrink-0 ${avatarCls}`} style={{ borderColor: template.accent + "40" }}>
            <AvatarImage src={profileImage || undefined} />
            <AvatarFallback className="text-sm" style={{ backgroundColor: template.accent + "30", color: template.accent }}>
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-sm ${template.cardTextColor}`}>{name}</p>
            <p className={`text-[9px] ${template.cardTextColor} opacity-50`}>@{username}</p>
            {shortBio && <p className={`text-[10px] mt-1 ${template.cardTextColor} opacity-75 leading-relaxed`}>{shortBio}</p>}
            <div className="mt-2">{socialIcons}</div>
          </div>
        </div>
        {pageNav && <div className="flex justify-center mt-3 pt-3 border-t border-white/10">{pageNav}</div>}
      </div>
      <div className="mt-4">{blocksList}</div>
    </div>
  );

  const renderBold = () => (
    <div className="flex flex-col">
      <div className="relative mb-10">
        <div className="h-24 rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: template.accent + "25" }}>
          {coverImage ? (
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full" style={{ background: `linear-gradient(135deg, ${template.accent}40 0%, ${template.accent}10 100%)` }} />
          )}
        </div>
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2">
          <Avatar className={`w-16 h-16 border-[3px] shadow-lg ${avatarCls}`} style={{ borderColor: template.accent }}>
            <AvatarImage src={profileImage || undefined} />
            <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: template.accent + "30", color: template.accent }}>
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
      <div className="text-center">
        <p className={`text-lg font-extrabold tracking-tight ${template.textColor}`}>{name}</p>
        <p className={`text-[9px] ${template.textColor} opacity-50`}>@{username}</p>
        {shortBio && <p className={`text-[10px] mt-1 max-w-[200px] mx-auto leading-relaxed ${template.textColor} opacity-70`}>{shortBio}</p>}
        <div className="flex justify-center mt-2">{socialIcons}</div>
        {pageNav && <div className="mt-2">{pageNav}</div>}
      </div>
      <div className="mt-4">{blocksList}</div>
    </div>
  );

  const renderElegant = () => (
    <div className="flex flex-col">
      {coverImage && (
        <div className="w-full h-20 rounded-lg overflow-hidden mb-3 shadow-sm">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="h-1 rounded-full mb-4 shadow-sm" style={{ backgroundColor: template.accent }} />
      <div className={`${template.cardBg} backdrop-blur-md rounded-xl overflow-hidden shadow-md`}>
        <div className="h-0.5" style={{ backgroundColor: template.accent }} />
        <div className="p-4 flex flex-col items-center text-center">
          <Avatar className={`w-14 h-14 border-2 shadow-md mb-3 ${avatarCls}`} style={{ borderColor: template.accent + "50" }}>
            <AvatarImage src={profileImage || undefined} />
            <AvatarFallback className="text-sm" style={{ backgroundColor: template.accent + "20", color: template.accent }}>
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <p className={`font-semibold text-sm tracking-wide ${template.cardTextColor}`}>{name}</p>
          <p className={`text-[8px] ${template.cardTextColor} opacity-50 tracking-widest uppercase`}>@{username}</p>
          {shortBio && <p className={`text-[10px] mt-2 leading-relaxed ${template.cardTextColor} opacity-70 max-w-[180px]`}>{shortBio}</p>}
          <div className="w-8 h-px my-3" style={{ backgroundColor: template.accent + "40" }} />
          <div className="justify-center">{socialIcons}</div>
        </div>
      </div>
      {pageNav && <div className="flex justify-center mt-3">{pageNav}</div>}
      <div className="mt-4">{blocksList}</div>
    </div>
  );

  const renderHero = () => (
    <div className="flex flex-col -mx-5 -mt-5">
      <div className="relative h-32 overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: `linear-gradient(180deg, ${template.accent}30 0%, transparent 100%)` }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>
      <div className="px-4 -mt-10 relative z-10">
        <div className={`${template.cardBg} backdrop-blur-xl rounded-xl p-4 shadow-lg border border-white/10`}>
          <div className="flex flex-col items-center text-center -mt-10 mb-2">
            <Avatar className={`w-14 h-14 border-[3px] shadow-lg mb-2 ${avatarCls}`} style={{ borderColor: template.accent }}>
              <AvatarImage src={profileImage || undefined} />
              <AvatarFallback className="text-lg font-bold" style={{ backgroundColor: template.accent + "30", color: template.accent }}>
                {name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className={`font-bold text-sm ${template.cardTextColor}`}>{name}</p>
            <p className={`text-[9px] ${template.cardTextColor} opacity-50`}>@{username}</p>
            {shortBio && <p className={`text-[10px] mt-1 max-w-[180px] leading-relaxed ${template.cardTextColor} opacity-75`}>{shortBio}</p>}
            <div className="justify-center mt-2">{socialIcons}</div>
          </div>
          {pageNav && <div className="flex justify-center pt-2 border-t border-white/10">{pageNav}</div>}
          <div className="mt-3">{blocksList}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`mx-auto transition-all duration-300 ${
        mode === "desktop" ? "w-[380px]" : "w-[280px]"
      }`}
      data-testid="phone-preview"
    >
      <div className="rounded-[2rem] border-4 border-foreground/10 overflow-hidden shadow-xl">
        <div className="bg-foreground/10 h-7 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground font-medium truncate px-4">
            visicardly.com/{username}
          </span>
        </div>
        <div className={`min-h-[480px] ${template.bg} p-5`}>
          {layout === "modern" ? renderModern()
           : layout === "bold" ? renderBold()
           : layout === "elegant" ? renderElegant()
           : layout === "hero" ? renderHero()
           : renderClassic()}
          <div className="mt-6 text-center">
            <p className={`text-[10px] ${template.textColor} opacity-50`}>VisiCardly</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamPhonePreview({
  template,
  user,
  businessProfileData,
  socials,
  blocks,
  pages,
  currentPage,
  mode,
  onPageChange,
}: {
  template: (typeof TEMPLATES)[0];
  user: { displayName: string | null; username: string; profileImage: string | null; bio: string | null; useOriginalSocialColors?: boolean };
  businessProfileData: any;
  socials: Social[];
  blocks: Block[];
  pages: Page[];
  currentPage: Page | null;
  mode: "mobile" | "desktop";
  onPageChange?: (pageId: string) => void;
}) {
  const tData = businessProfileData?.templateData || {};
  const team = businessProfileData?.team || {};
  const member = businessProfileData?.member || {};

  const teamBranding = {
    companyLogo: tData.companyLogo || team.logoUrl,
    coverPhoto: tData.coverPhoto,
    companyName: tData.companyName || team.name,
    companyPhone: tData.companyPhone,
    companyEmail: tData.companyEmail,
    companyWebsite: tData.companyWebsite || team.websiteUrl,
    companyAddress: tData.companyAddress,
    companyContact: tData.companyContact,
    themeColor: tData.themeColor,
    font: tData.font,
    jobTitle: member.jobTitle,
    memberPhone: member.businessPhone,
    companySocials: tData.companySocials,
    headBranch: tData.headBranch,
    memberBranch: tData.memberBranch,
    companyProfileUrl: tData.companyProfileUrl,
    productProfileUrl: tData.productProfileUrl,
    productUrls: tData.productUrls,
    companyBrochureUrl: tData.companyBrochureUrl,
  };

  const brandColor = teamBranding.themeColor || template.accent;
  const activeSocials = socials.filter((s) => s.url);
  const activeBlocks = blocks.filter((b) => b.active);
  const hasBlocks = activeBlocks.length > 0;
  const hasMultiplePages = pages.length > 1;

  const previewUser = {
    displayName: member.businessName || user.displayName,
    username: user.username,
    profileImage: member.businessProfileImage || user.profileImage,
    bio: member.businessBio || user.bio,
    useOriginalSocialColors: user.useOriginalSocialColors,
  };

  const resolveUrl = (url: string) =>
    url && !url.startsWith("http") ? `https://${url}` : url;

  const TeamPreviewBlock = ({ block, template: t }: { block: Block; template: (typeof TEMPLATES)[0] }) => {
    const content = block.content as any;
    const btnCls =
      t.buttonStyle === "rounded"
        ? "rounded-full"
        : t.buttonStyle === "sharp"
        ? "rounded-none"
        : t.buttonStyle === "outline"
        ? "rounded-xl border-2"
        : "rounded-xl";
    if (block.type === "divider") return <div className="border-t border-border/50 my-2" />;
    if (block.type === "image" && content?.imageUrl) {
      return (
        <div className="rounded-xl overflow-hidden">
          <img src={content.imageUrl} alt={content.title || ""} className="w-full max-h-48 object-cover" />
        </div>
      );
    }
    if (block.type === "video" && content?.url) {
      const ytMatch = content.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (ytMatch) {
        return (
          <div className="rounded-lg overflow-hidden">
            <iframe src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}`} className="w-full aspect-video rounded-lg" allowFullScreen title={content.title || "Video"} />
          </div>
        );
      }
    }
    if (block.type === "text") {
      return (
        <div className="px-2 py-1.5">
          <p className="text-xs text-foreground/80 text-left leading-relaxed">
            {content?.text || "Text block"}
          </p>
        </div>
      );
    }
    const title = content?.title || content?.url || block.type;
    return (
      <div className={`${btnCls} bg-muted/50 py-2.5 px-4 text-center`}>
        <span className="text-xs font-medium text-foreground">{title}</span>
      </div>
    );
  };

  const pageInfos = pages.map((p) => ({
    id: String(p.id),
    title: p.title,
    slug: p.slug,
    isHome: p.isHome,
  }));
  const currentPageInfo = currentPage
    ? { id: String(currentPage.id), title: currentPage.title, slug: currentPage.slug, isHome: currentPage.isHome }
    : null;

  const containerWidth = mode === "mobile" ? 375 : 900;

  return (
    <div
      className="rounded-2xl overflow-hidden border shadow-lg"
      style={{ width: containerWidth, height: 700 }}
    >
      <div className={`${template.bg} h-full overflow-y-auto`}>
        <div className="max-w-2xl mx-auto px-6 py-12">
          <TeamProfileLayout
            user={previewUser}
            template={template}
            teamBranding={teamBranding}
            brandColor={brandColor}
            activeSocials={activeSocials}
            activeLinks={[]}
            activeBlocks={activeBlocks}
            hasBlocks={hasBlocks}
            pages={pageInfos}
            hasMultiplePages={hasMultiplePages}
            currentPage={currentPageInfo}
            setActivePageSlug={(slug) => {
              const page = pages.find(p => slug === null ? p.isHome : p.slug === slug);
              if (page && onPageChange) onPageChange(String(page.id));
            }}
            isFetching={false}
            isLoading={false}
            normalizeUrl={resolveUrl}
            trackClick={() => {}}
            PublicBlock={TeamPreviewBlock}
            mode={mode}
          />
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({ block, template, btnCls = "rounded-lg", isOutline = false }: { block: Block; template: (typeof TEMPLATES)[0]; btnCls?: string; isOutline?: boolean }) {
  const content = block.content as BlockContent;
  const blockBg = isOutline ? "bg-transparent" : template.cardBg;
  const blockText = isOutline ? template.textColor : template.cardTextColor;
  const outlineStyle = isOutline ? { borderColor: template.accent + "40" } : undefined;
  switch (block.type) {
    case "url_button":
      return (
        <div className={`${blockBg} ${btnCls} py-2.5 px-4 text-center backdrop-blur-sm`} style={outlineStyle}>
          <span className={`text-xs font-medium ${blockText}`}>
            {content.title || "Untitled Link"}
          </span>
        </div>
      );
    case "email_button":
      return (
        <div className={`${blockBg} ${btnCls} py-2.5 px-4 text-center backdrop-blur-sm`} style={outlineStyle}>
          <span className={`text-xs font-medium ${blockText}`}>
            {content.title || "Email"}
          </span>
        </div>
      );
    case "text":
      return (
        <div className="px-2 py-1.5">
          <p className={`text-[11px] ${template.textColor} opacity-80 text-left leading-relaxed`}>
            {content.text || "Text block"}
          </p>
        </div>
      );
    case "divider":
      return (
        <div className="py-2">
          <hr className={`border-t ${template.textColor} opacity-20`} />
        </div>
      );
    case "video": {
      const ytEmbed = content.url ? getYouTubeEmbedUrl(content.url) : null;
      const vimeoEmbed = content.url ? getVimeoEmbedUrl(content.url) : null;
      const embedUrl = ytEmbed || vimeoEmbed;
      if (embedUrl) {
        return (
          <div className="rounded-lg overflow-hidden">
            {content.title && (
              <p className={`text-xs font-medium ${template.cardTextColor} mb-1`}>{content.title}</p>
            )}
            <iframe
              src={embedUrl}
              className="w-full aspect-video rounded-lg"
              allowFullScreen
              allow="autoplay; encrypted-media"
              title={content.title || "Video"}
            />
          </div>
        );
      }
      if (content.url) {
        const normalizedUrl = normalizeUrl(content.url);
        return (
          <div className="rounded-lg overflow-hidden">
            {content.title && (
              <p className={`text-xs font-medium ${template.cardTextColor} mb-1`}>{content.title}</p>
            )}
            <video
              src={normalizedUrl}
              className="w-full aspect-video rounded-lg bg-black"
              controls
              preload="metadata"
              title={content.title || "Video"}
            />
          </div>
        );
      }
      return (
        <div className={`${blockBg} ${btnCls} py-2.5 px-4 text-center backdrop-blur-sm`} style={outlineStyle}>
          <span className={`text-xs font-medium ${blockText}`}>
            {content.title || "Video"}
          </span>
        </div>
      );
    }
    case "audio":
      return (
        <div className={`${blockBg} ${btnCls} py-2.5 px-4 text-center backdrop-blur-sm`} style={outlineStyle}>
          <span className={`text-xs font-medium ${blockText}`}>
            {content.title || "Audio"}
          </span>
        </div>
      );
    case "image":
      if (content.imageUrl) {
        return (
          <div className="rounded-xl overflow-hidden">
            <img src={content.imageUrl} alt={content.title || ""} className="w-full max-h-48 object-cover" />
          </div>
        );
      }
      return (
        <div className={`${blockBg} ${btnCls} py-4 px-4 text-center backdrop-blur-sm`} style={outlineStyle}>
          <span className={`text-xs ${blockText} opacity-60`}>Image</span>
        </div>
      );
    default:
      return null;
  }
}

const BLOCK_TYPE_CONFIG: Record<string, { label: string; description: string; icon: typeof Link2 }> = {
  url_button: { label: "URL Button", description: "Opens a web page to the specified URL.", icon: Link2 },
  email_button: { label: "Email Button", description: "Opens an email to the specified address.", icon: Mail },
  text: { label: "Text", description: "Tell your page's story with a text section.", icon: Type },
  divider: { label: "Divider", description: "Organize your content with dividers.", icon: Minus },
  video: { label: "Video", description: "Embed YouTube, Vimeo, and more...", icon: Video },
  audio: { label: "Audio", description: "Embed Spotify, Apple Music and more...", icon: Music },
  image: { label: "Image", description: "Display an image on your page.", icon: ImageIcon },
};

function AddBlockDialog({ open, onClose, pageId }: { open: boolean; onClose: () => void; pageId?: string }) {
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async (type: string) => {
      const defaultContent: Record<string, any> = {
        url_button: { title: "My Link", url: "" },
        email_button: { title: "Email Me", email: "" },
        text: { text: "" },
        divider: {},
        video: { title: "Video", url: "" },
        audio: { title: "Audio", url: "" },
        image: { title: "", imageUrl: "", linkUrl: "" },
      };
      await apiRequest("POST", "/api/blocks", { type, content: defaultContent[type] || {}, pageId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/blocks" });
      queryClient.setQueryData<PlanLimits>(["/api/auth/plan-limits"], (old) => old ? { ...old, currentBlocks: old.currentBlocks + 1 } : old);
      onClose();
      toast({ title: "Block added!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to add block", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Block</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(BLOCK_TYPE_CONFIG).map(([type, config]) => {
            const Icon = config.icon;
            return (
              <button
                key={type}
                onClick={() => mutation.mutate(type)}
                disabled={mutation.isPending}
                className="border rounded-md p-3 text-center hover-elevate transition-all flex flex-col items-center gap-1.5"
                data-testid={`block-type-${type}`}
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs font-semibold">{config.label}</span>
                <span className="text-[10px] text-muted-foreground leading-tight">{config.description}</span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddPageDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/pages", { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      queryClient.setQueryData<PlanLimits>(["/api/auth/plan-limits"], (old) => old ? { ...old, currentPages: old.currentPages + 1 } : old);
      setTitle("");
      onClose();
      toast({ title: "Page created!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to create page", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Page</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="page-title">Page Title</Label>
            <Input
              id="page-title"
              placeholder="About Us"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="input-page-title"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-confirm-add-page">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Page
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ManagePagesDialog({
  open,
  onClose,
  pages,
  onSelectPage,
}: {
  open: boolean;
  onClose: () => void;
  pages: Page[];
  onSelectPage: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { title?: string; isHome?: boolean } }) => {
      await apiRequest("PATCH", `/api/pages/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setEditingId(null);
      toast({ title: "Page updated!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update page", description: e.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/pages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      queryClient.setQueryData<PlanLimits>(["/api/auth/plan-limits"], (old) => old ? { ...old, currentPages: Math.max(0, old.currentPages - 1) } : old);
      toast({ title: "Page deleted!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to delete page", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Pages</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {pages.map((page) => (
            <div
              key={page.id}
              className="flex items-center gap-2 border rounded-md p-3"
              data-testid={`manage-page-${page.id}`}
            >
              {editingId === page.id ? (
                <div className="flex-1 flex items-center gap-2 flex-wrap">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="flex-1"
                    data-testid={`input-rename-page-${page.id}`}
                  />
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: page.id, data: { title: editTitle } })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-save-rename-${page.id}`}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="flex-1 justify-start gap-2 p-0 h-auto"
                    onClick={() => onSelectPage(page.id)}
                    data-testid={`button-select-page-${page.id}`}
                  >
                    {page.isHome && <Home className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                    <span className="truncate">{page.title}</span>
                    {page.isHome && (
                      <span className="text-xs text-muted-foreground ml-1">(Home)</span>
                    )}
                  </Button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {!page.isHome && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => updateMutation.mutate({ id: page.id, data: { isHome: true } })}
                        title="Set as home page"
                        data-testid={`button-set-home-${page.id}`}
                      >
                        <Home className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingId(page.id); setEditTitle(page.title); }}
                      data-testid={`button-rename-page-${page.id}`}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!page.isHome && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(page.id)}
                        data-testid={`button-delete-page-${page.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CategorySection({
  id,
  label,
  sublabel,
  icon,
  open,
  onToggle,
  trailing,
  action,
  children,
}: {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <div className="border rounded-md bg-card">
        <div className="flex items-center gap-2 py-3 px-4">
          {icon}
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="p-0 h-auto font-semibold text-sm gap-1" data-testid={`category-toggle-${id}`}>
              {label}
              {sublabel && <span className="text-muted-foreground font-normal">{sublabel}</span>}
              <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ml-0.5 ${open ? "" : "-rotate-90"}`} />
            </Button>
          </CollapsibleTrigger>
          {trailing && <div className="ml-1">{trailing}</div>}
          <div className="flex-1" />
          {action && <div>{action}</div>}
        </div>
        <CollapsibleContent>
          {children}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

function InlineBlockCard({
  block,
  isEditing,
  onStartEdit,
  onStopEdit,
  onDelete,
  onToggle,
  onMoveUp,
  onMoveDown,
}: {
  block: Block;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const content = block.content as BlockContent;
  const [editContent, setEditContent] = useState<BlockContent>({ ...content });
  const { toast } = useToast();

  useEffect(() => {
    setEditContent({ ...(block.content as BlockContent) });
  }, [block.content]);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/blocks/${block.id}`, { content: editContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => Array.isArray(query.queryKey) && query.queryKey[0] === "/api/blocks" });
      onStopEdit();
      toast({ title: "Block updated!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    mutation.mutate();
  };

  const handleCancel = () => {
    setEditContent({ ...(block.content as BlockContent) });
    onStopEdit();
  };

  const typeConfig = BLOCK_TYPE_CONFIG[block.type];
  const TypeIcon = typeConfig?.icon || Link2;
  const blockTitle = content.title || content.text?.slice(0, 30) || typeConfig?.label || block.type;

  return (
    <Card className={`overflow-visible transition-opacity ${!block.active ? "opacity-50" : ""}`}>
      <CardContent className="p-0">
        <div className="flex items-center gap-0">
          <div className={`w-1 self-stretch shrink-0 rounded-l-md ${!block.active ? "bg-muted-foreground/20" : "bg-primary"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 py-2.5 px-3">
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  type="button"
                  className={`p-0.5 rounded hover:bg-muted transition-colors ${!onMoveUp ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}`}
                  onClick={onMoveUp}
                  disabled={!onMoveUp}
                  title="Move up"
                  data-testid={`button-move-up-${block.id}`}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground rotate-180" />
                </button>
                <button
                  type="button"
                  className={`p-0.5 rounded hover:bg-muted transition-colors ${!onMoveDown ? "opacity-20 cursor-not-allowed" : "cursor-pointer"}`}
                  onClick={onMoveDown}
                  disabled={!onMoveDown}
                  title="Move down"
                  data-testid={`button-move-down-${block.id}`}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-medium text-sm truncate justify-start"
                  onClick={onStartEdit}
                  data-testid={`text-block-title-${block.id}`}
                >
                  {blockTitle}
                </Button>
                <p className="text-xs text-muted-foreground" data-testid={`text-block-type-${block.id}`}>
                  {typeConfig?.label || block.type}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Switch
                  checked={block.active}
                  onCheckedChange={(checked) => onToggle(checked)}
                  data-testid={`switch-block-active-${block.id}`}
                />
                <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-block-${block.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={isEditing ? onStopEdit : onStartEdit} data-testid={`button-edit-block-${block.id}`}>
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {isEditing && (
              <div className="border-t px-3 py-3 space-y-3" data-testid={`inline-edit-block-${block.id}`}>
                <BlockEditFields
                  type={block.type}
                  content={editContent}
                  onChange={setEditContent}
                  blockId={block.id}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel} data-testid={`button-cancel-edit-block-${block.id}`}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={mutation.isPending} data-testid={`button-save-edit-block-${block.id}`}>
                    {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Save
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BlockEditFields({
  type,
  content,
  onChange,
  blockId,
}: {
  type: string;
  content: BlockContent;
  onChange: (content: BlockContent) => void;
  blockId: string;
}) {
  switch (type) {
    case "url_button":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`block-title-${blockId}`} className="text-xs">Title</Label>
            <Input
              id={`block-title-${blockId}`}
              value={content.title || ""}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="Link title"
              data-testid={`input-block-title-${blockId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`block-url-${blockId}`} className="text-xs">URL</Label>
            <Input
              id={`block-url-${blockId}`}
              value={content.url || ""}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
              placeholder="https://example.com"
              data-testid={`input-block-url-${blockId}`}
            />
          </div>
        </>
      );
    case "email_button":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`block-title-${blockId}`} className="text-xs">Button Label</Label>
            <Input
              id={`block-title-${blockId}`}
              value={content.title || ""}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="Email Me"
              data-testid={`input-block-title-${blockId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`block-email-${blockId}`} className="text-xs">Email Address</Label>
            <Input
              id={`block-email-${blockId}`}
              value={content.email || ""}
              onChange={(e) => onChange({ ...content, email: e.target.value })}
              placeholder="you@example.com"
              type="email"
              data-testid={`input-block-email-${blockId}`}
            />
          </div>
        </>
      );
    case "text":
      return (
        <div className="space-y-1.5">
          <Label htmlFor={`block-text-${blockId}`} className="text-xs">Text Content</Label>
          <Textarea
            id={`block-text-${blockId}`}
            value={content.text || ""}
            onChange={(e) => onChange({ ...content, text: e.target.value })}
            placeholder="Write your text here..."
            rows={4}
            data-testid={`input-block-text-${blockId}`}
          />
        </div>
      );
    case "divider":
      return (
        <p className="text-xs text-muted-foreground">
          A horizontal divider line. No settings needed.
        </p>
      );
    case "video":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`block-title-${blockId}`} className="text-xs">Title</Label>
            <Input
              id={`block-title-${blockId}`}
              value={content.title || ""}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="Video title"
              data-testid={`input-block-title-${blockId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`block-url-${blockId}`} className="text-xs">Video URL</Label>
            <Input
              id={`block-url-${blockId}`}
              value={content.url || ""}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
              placeholder="https://youtube.com/watch?v=..."
              data-testid={`input-block-url-${blockId}`}
            />
          </div>
        </>
      );
    case "audio":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`block-title-${blockId}`} className="text-xs">Title</Label>
            <Input
              id={`block-title-${blockId}`}
              value={content.title || ""}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="Track title"
              data-testid={`input-block-title-${blockId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`block-url-${blockId}`} className="text-xs">Audio URL</Label>
            <Input
              id={`block-url-${blockId}`}
              value={content.url || ""}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
              placeholder="https://open.spotify.com/track/..."
              data-testid={`input-block-url-${blockId}`}
            />
          </div>
        </>
      );
    case "image":
      return (
        <>
          <div className="space-y-1.5">
            <Label htmlFor={`block-title-${blockId}`} className="text-xs">Alt Text</Label>
            <Input
              id={`block-title-${blockId}`}
              value={content.title || ""}
              onChange={(e) => onChange({ ...content, title: e.target.value })}
              placeholder="Image description"
              data-testid={`input-block-title-${blockId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`block-imageUrl-${blockId}`} className="text-xs">Image URL</Label>
            <Input
              id={`block-imageUrl-${blockId}`}
              value={content.imageUrl || ""}
              onChange={(e) => onChange({ ...content, imageUrl: e.target.value })}
              placeholder="https://example.com/image.jpg"
              data-testid={`input-block-imageUrl-${blockId}`}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`block-linkUrl-${blockId}`} className="text-xs">Link URL (optional)</Label>
            <Input
              id={`block-linkUrl-${blockId}`}
              value={content.linkUrl || ""}
              onChange={(e) => onChange({ ...content, linkUrl: e.target.value })}
              placeholder="https://example.com"
              data-testid={`input-block-linkUrl-${blockId}`}
            />
          </div>
        </>
      );
    default:
      return <p className="text-xs text-muted-foreground">No editable fields for this block type.</p>;
  }
}

function SocialLinkRow({
  social,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  social: Social;
  onUpdate: (url: string) => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}) {
  const [url, setUrl] = useState(social.url);
  const [saving, setSaving] = useState(false);
  const platform = getPlatform(social.platform);

  useEffect(() => {
    setUrl(social.url);
    setSaving(false);
  }, [social.url]);

  return (
    <div className="flex items-center gap-1 border rounded-md px-2 py-2">
      <div className="flex flex-col shrink-0">
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveUp} disabled={!onMoveUp}>
          <ChevronDown className="w-3 h-3 rotate-180" />
        </Button>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onMoveDown} disabled={!onMoveDown}>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </div>
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => {
          if (url !== social.url) {
            setSaving(true);
            onUpdate(url);
          }
        }}
        placeholder={platform?.placeholder || "Enter URL"}
        className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm"
        data-testid={`input-social-url-${social.id}`}
      />
      {saving ? (
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />
      ) : (
        <SocialIcon platform={social.platform} className="w-5 h-5 text-muted-foreground shrink-0" />
      )}
      <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-social-${social.id}`}>
        <Trash2 className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </div>
  );
}

function AddSocialDialog({
  open,
  onClose,
  onSelect,
  existingPlatforms,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (platform: string) => void;
  existingPlatforms: string[];
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Social</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2">
          {SOCIAL_PLATFORMS.map((platform) => {
            const isAdded = existingPlatforms.includes(platform.id);
            return (
              <Button
                key={platform.id}
                variant="outline"
                size="sm"
                className="justify-start gap-2 text-xs"
                disabled={isAdded}
                onClick={() => onSelect(platform.id)}
                data-testid={`social-option-${platform.id}`}
              >
                <SocialIcon platform={platform.id} className="w-4 h-4 shrink-0" />
                <span className="truncate">{platform.name}</span>
              </Button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditMemberDialog({ member, isOpen, onClose, teamId, isAdmin, isSelf, toast }: { member: any; isOpen: boolean; onClose: () => void; teamId: string; isAdmin: boolean; isSelf: boolean; toast: any }) {
  const [editJobTitle, setEditJobTitle] = useState(member?.jobTitle || "");
  const [editDisplayName, setEditDisplayName] = useState(member?.businessName || member?.user?.displayName || "");
  const [editRole, setEditRole] = useState(member?.role || "member");
  const [editPhone, setEditPhone] = useState(member?.businessPhone || "");
  const [editBio, setEditBio] = useState(member?.businessBio || "");
  const [editProfileImage, setEditProfileImage] = useState(member?.businessProfileImage || member?.user?.profileImage || "");
  const [editBranchId, setEditBranchId] = useState(member?.branchId || "");
  const [uploadingImage, setUploadingImage] = useState(false);

  const { data: editBranches = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "branches"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/branches`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: isOpen,
  });

  useEffect(() => {
    if (member) {
      setEditJobTitle(member.jobTitle || "");
      setEditDisplayName(member.businessName || member.user?.displayName || "");
      setEditRole(member.role || "member");
      setEditPhone(member.businessPhone || "");
      setEditBio(member.businessBio || "");
      setEditProfileImage(member.businessProfileImage || member.user?.profileImage || "");
      setEditBranchId(member.branchId || "");
    }
  }, [member]);

  const updateMemberMut = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/members/${data.memberId}`, data.payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
    },
  });

  const updateRoleMut = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 1MB.", variant: "destructive" });
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      if (res.ok) {
        const { url } = await res.json();
        setEditProfileImage(url);
        await apiRequest("PATCH", `/api/teams/${teamId}/members/${member.id}`, { businessProfileImage: url });
        queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/business-profile"] });
        toast({ title: "Profile image updated!" });
      }
    } catch {} finally { setUploadingImage(false); }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto" aria-describedby="edit-member-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            Edit Member
          </DialogTitle>
          <DialogDescription id="edit-member-desc">
            {isAdmin ? "Edit this member's business card information. Changes will reflect on their public profile." : "Update your business card details."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {/* Profile Image - editable */}
          <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
            <div className="relative group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                id="edit-member-avatar"
                onChange={handleImageUpload}
              />
              <label htmlFor="edit-member-avatar" className="cursor-pointer block">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src={editProfileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {(editDisplayName || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadingImage ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                </div>
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.businessName || member.user?.displayName || "Unknown"}</p>
              <p className="text-xs text-muted-foreground truncate">{member.user?.email || ""}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Click photo to change</p>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Business Card Details
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-display-name" className="text-xs">Display Name</Label>
                <Input id="edit-display-name" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Full Name" className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-job-title" className="text-xs">Job Title</Label>
                <Input id="edit-job-title" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="e.g. Software Engineer" className="h-9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-phone" className="text-xs">Phone Number</Label>
              <Input id="edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Business phone number" className="h-9" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-bio" className="text-xs">Bio</Label>
              <Textarea id="edit-bio" value={editBio} onChange={(e) => setEditBio(e.target.value)} placeholder="Short bio for business card..." rows={2} className="resize-none" />
            </div>
          </div>

          {/* Admin-only: Role */}
          {isAdmin && member.role !== "owner" && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Permissions
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor="edit-role" className="text-xs">Role</Label>
                <Select value={editRole} onValueChange={setEditRole}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Branch Assignment */}
          {isAdmin && editBranches.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Branch Assignment
              </h4>
              <div className="space-y-1.5">
                <Label htmlFor="edit-branch" className="text-xs">Branch</Label>
                <Select value={editBranchId || "none"} onValueChange={(v) => setEditBranchId(v === "none" ? "" : v)}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No branch assigned</SelectItem>
                    {editBranches.map((b: any) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name} {b.isHeadBranch ? "(Head Office)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Profile URL */}
          {member.user?.username && (
            <div className="space-y-1.5">
              <Label className="text-xs">Public Profile URL</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/${member.user.username}`} className="text-xs h-9 bg-muted/50" />
                <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${member.user.username}`);
                  toast({ title: "Profile URL copied" });
                }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={async () => {
                const payload: Record<string, any> = {
                  jobTitle: editJobTitle || null,
                  businessName: editDisplayName || null,
                  businessPhone: editPhone || null,
                  businessBio: editBio || null,
                  branchId: editBranchId || null,
                };
                await updateMemberMut.mutateAsync({ memberId: member.id, payload });
                if (editRole !== member.role && isAdmin && member.role !== "owner") {
                  await updateRoleMut.mutateAsync({ memberId: member.id, role: editRole });
                }
                queryClient.invalidateQueries({ queryKey: ["/api/auth/business-profile"] });
                onClose();
                toast({ title: "Member updated" });
              }}
              disabled={updateMemberMut.isPending}
            >
              {updateMemberMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TeamMembersPanel({ teamId, currentUserId, teamSlug }: { teamId: string; currentUserId: string; teamSlug?: string }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [cardPreviewMember, setCardPreviewMember] = useState<any>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteBranchId, setInviteBranchId] = useState("");
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createJobTitle, setCreateJobTitle] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createBio, setCreateBio] = useState("");
  const [createRole, setCreateRole] = useState("member");
  const [createTemplateId, setCreateTemplateId] = useState<string>("");
  const [createBranchId, setCreateBranchId] = useState("");
  const [removeConfirmMember, setRemoveConfirmMember] = useState<any>(null);
  const [editMember, setEditMember] = useState<any>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; username: string } | null>(null);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");
  const [analyticsMember, setAnalyticsMember] = useState<any>(null);

  const { data: members = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "members"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/members`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "templates"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/templates`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: branches = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "branches"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/branches`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const { data: invitations = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "invites"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/invites`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const defaultTemplate = templates.find((t: any) => t.isDefault) || templates[0] || null;
  const currentMember = members.find((m: any) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "owner" || currentMember?.role === "admin";

  const pendingInvites = invitations.filter((i: any) => i.status === "pending");

  const [inviteLink, setInviteLink] = useState<string | null>(null);

  const inviteMutation = useMutation({
    mutationFn: async (data: { emails: string[]; role: string }) => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/invites`, data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "invites"] });
      setInviteEmail("");
      setInviteRole("member");
      if (data.invites && data.invites[0]?.token) {
        const link = `${window.location.origin}/invite/${data.invites[0].token}`;
        setInviteLink(link);
      } else {
        setInviteOpen(false);
        toast({ title: "Invitation created!" });
      }
    },
    onError: (err: any) => {
      toast({ title: "Failed to send invite", description: err.message, variant: "destructive" });
    },
  });

  const createMemberMutation = useMutation({
    mutationFn: async (data: { displayName: string; email: string; jobTitle?: string; memberRole: string; phone?: string; bio?: string; branchId?: string }) => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/members/create`, data);
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "invites"] });
      setCreateOpen(false);
      setCreateName("");
      setCreateEmail("");
      setCreateJobTitle("");
      setCreatePhone("");
      setCreateBio("");
      setCreateRole("member");
      if (data.tempPassword) {
        setCreatedCredentials({ email: data.tempEmail, password: data.tempPassword, username: data.tempUsername });
      } else {
        toast({ title: "Member created!" });
      }
    },
    onError: (err: any) => {
      // Parse limit reached errors to show upgrade dialog
      const msg = err.message || "";
      let parsedMsg = msg;
      try {
        const jsonMatch = msg.match(/\{.*\}/);
        if (jsonMatch) parsedMsg = JSON.parse(jsonMatch[0]).message || msg;
      } catch {}
      if (parsedMsg.toLowerCase().includes("limit reached") || parsedMsg.toLowerCase().includes("upgrade")) {
        setLimitMessage(parsedMsg);
        setLimitDialogOpen(true);
      } else {
        toast({ title: "Failed to create member", description: parsedMsg, variant: "destructive" });
      }
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (memberId: string) => {
      await apiRequest("DELETE", `/api/teams/${teamId}/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      setRemoveConfirmMember(null);
      toast({ title: "Member removed" });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/members/${memberId}`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      toast({ title: "Role updated" });
    },
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ memberId, jobTitle }: { memberId: string; jobTitle: string }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/members/${memberId}`, { jobTitle: jobTitle || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      setEditMember(null);
      toast({ title: "Member updated" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async ({ memberId, status }: { memberId: string; status: string }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/members/${memberId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
      toast({ title: "Member status updated" });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/invites/${inviteId}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "invites"] });
      toast({ title: "Invitation revoked" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to revoke invite", description: err.message, variant: "destructive" });
    },
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <h2 className="text-base font-semibold">Team Members</h2>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <CsvImportExport teamId={teamId} teamSlug={teamSlug} members={members} branches={branches} />
            <Button variant="outline" size="sm" onClick={() => setInviteOpen(true)} data-testid="button-invite-member">
              <Send className="w-4 h-4" />
              Invite
            </Button>
            <Button variant="default" size="sm" onClick={() => setCreateOpen(true)} data-testid="button-create-member">
              <UserPlus className="w-4 h-4" />
              Create
            </Button>
          </div>
        )}
      </div>

      {/* Tabs for Members / Invitations */}
      <div className="flex gap-1 border-b">
        <button
          className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "members" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setActiveTab("members")}
        >
          Members ({members.length})
        </button>
        {isAdmin && (
          <button
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "invitations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setActiveTab("invitations")}
          >
            Invitations ({pendingInvites.length} pending)
          </button>
        )}
      </div>

      {activeTab === "members" ? (
        <>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8" data-testid="text-no-members">No team members yet. Invite or create members to get started.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Job Title</TableHead>
              <TableHead className="hidden md:table-cell">Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member: any) => (
              <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9 border border-border">
                      <AvatarImage src={member.businessProfileImage || member.user?.profileImage || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(member.businessName || member.user?.displayName || member.user?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" data-testid={`text-member-name-${member.id}`}>
                        {member.businessName || member.user?.displayName || member.user?.username || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground truncate" data-testid={`text-member-email-${member.id}`}>
                        {member.user?.email || ""}
                      </div>
                      {member.businessBio && (
                        <div className="text-[11px] text-muted-foreground/70 truncate max-w-[200px] mt-0.5">
                          {member.businessBio}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm" data-testid={`text-member-jobtitle-${member.id}`}>
                    {member.jobTitle || "—"}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <span className="text-sm text-muted-foreground">
                    {member.businessPhone || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" data-testid={`badge-member-role-${member.id}`}>
                    {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : "Member"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={member.status === "activated" ? "secondary" : member.status === "deactivated" ? "destructive" : "outline"}
                    className={member.status === "activated" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate" : member.status === "pending" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300" : ""}
                    data-testid={`badge-member-status-${member.id}`}
                  >
                    {member.status === "activated" ? "Joined" : member.status === "deactivated" ? "Deactivated" : "Not Joined"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {member.user?.username && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.open(teamSlug ? `/${teamSlug}/${member.user.username}` : `/${member.user.username}`, "_blank")}
                        data-testid={`button-view-profile-${member.id}`}
                        title="View public profile"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCardPreviewMember(member)}
                      data-testid={`button-view-card-${member.id}`}
                    >
                      <CreditCard className="w-4 h-4" />
                    </Button>
                    {(isAdmin || member.userId === currentUserId) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditMember(member)}
                        data-testid={`button-edit-member-${member.id}`}
                        title="Edit member"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && member.userId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAnalyticsMember(member)}
                        title="View analytics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                    )}
                    {isAdmin && member.role !== "owner" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" data-testid={`button-member-actions-${member.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => updateRoleMutation.mutate({ memberId: member.id, role: member.role === "admin" ? "member" : "admin" })}
                            data-testid={`button-edit-role-${member.id}`}
                          >
                            {member.role === "admin" ? "Demote to Member" : "Promote to Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deactivateMutation.mutate({ memberId: member.id, status: member.status === "deactivated" ? "activated" : "deactivated" })}
                          >
                            {member.status === "deactivated" ? "Reactivate Member" : "Deactivate Member"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setRemoveConfirmMember(member)}
                            data-testid={`button-remove-member-${member.id}`}
                          >
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
        </>
      ) : (
        /* Invitations Tab */
        <div className="space-y-3">
          {invitations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No invitations sent yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invite: any) => (
                  <TableRow key={invite.id}>
                    <TableCell className="font-medium text-sm">{invite.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">{invite.role}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={invite.status === "accepted" ? "default" : invite.status === "revoked" ? "destructive" : "secondary"}
                      >
                        {invite.status === "pending" ? "Invitation Sent" : invite.status === "accepted" ? "Active" : "Revoked"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {invite.status === "pending" && (
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const link = `${window.location.origin}/invite/${invite.token}`;
                                navigator.clipboard.writeText(link);
                                toast({ title: "Invite link copied!" });
                              }}
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Copy Link
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => revokeMutation.mutate(invite.id)}
                              disabled={revokeMutation.isPending}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Revoke
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={(v) => { if (!v) { setInviteOpen(false); setInviteLink(null); } }}>
        <DialogContent aria-describedby="invite-member-desc">
          <DialogHeader>
            <DialogTitle>{inviteLink ? "Invite Link Created" : "Invite Team Member"}</DialogTitle>
            <DialogDescription id="invite-member-desc">
              {inviteLink ? "Share this link with your team member so they can create their account and join." : "Create an invite link for a team member to self-register."}
            </DialogDescription>
          </DialogHeader>
          {inviteLink ? (
            <div className="space-y-3">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1">Invite Link</p>
                <p className="text-sm font-mono break-all" data-testid="text-invite-link">{inviteLink}</p>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(inviteLink);
                  toast({ title: "Link copied!" });
                }}
                data-testid="button-copy-invite-link"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Invite Link
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => { setInviteOpen(false); setInviteLink(null); }}
                data-testid="button-close-invite-link"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  data-testid="input-invite-email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger data-testid="select-invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {branches.length > 0 && (
                <div className="space-y-1.5">
                  <Label htmlFor="invite-branch">Branch</Label>
                  <Select value={inviteBranchId || "none"} onValueChange={(v) => setInviteBranchId(v === "none" ? "" : v)}>
                    <SelectTrigger data-testid="select-invite-branch">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No branch</SelectItem>
                      {branches.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} {b.isHeadBranch ? "(Head Office)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <Button
                className="w-full"
                disabled={!inviteEmail || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate({ emails: [inviteEmail], role: inviteRole, ...(inviteBranchId ? { branchId: inviteBranchId } : {}) })}
                data-testid="button-send-invite"
              >
                {inviteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Invite Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={(v) => { if (!v) setCreateOpen(false); }}>
        <DialogContent aria-describedby="create-member-desc">
          <DialogHeader>
            <DialogTitle>Create Team Member</DialogTitle>
            <DialogDescription id="create-member-desc">Create an account and add them to the team directly.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5" />
                Basic Information
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-name" className="text-xs">Full Name</Label>
                  <Input
                    id="create-name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="John Doe"
                    className="h-9"
                    data-testid="input-create-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-email" className="text-xs">Email</Label>
                  <Input
                    id="create-email"
                    type="email"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    placeholder="john@company.com"
                    className="h-9"
                    data-testid="input-create-email"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-jobtitle" className="text-xs">Job Title</Label>
                  <Input
                    id="create-jobtitle"
                    value={createJobTitle}
                    onChange={(e) => setCreateJobTitle(e.target.value)}
                    placeholder="Software Engineer"
                    className="h-9"
                    data-testid="input-create-jobtitle"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-phone" className="text-xs">Phone Number</Label>
                  <Input
                    id="create-phone"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    placeholder="+91 1234567890"
                    className="h-9"
                    data-testid="input-create-phone"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="create-bio" className="text-xs">Bio</Label>
                <Textarea
                  id="create-bio"
                  value={createBio}
                  onChange={(e) => setCreateBio(e.target.value)}
                  placeholder="Short bio for business card..."
                  rows={2}
                  className="resize-none text-sm"
                  data-testid="input-create-bio"
                />
              </div>
            </div>

            {/* Permissions & Assignment */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                Permissions & Assignment
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="create-role" className="text-xs">Role</Label>
                  <Select value={createRole} onValueChange={setCreateRole}>
                    <SelectTrigger className="h-9" data-testid="select-create-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {branches.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="create-branch" className="text-xs">Branch</Label>
                    <Select value={createBranchId || "none"} onValueChange={(v) => setCreateBranchId(v === "none" ? "" : v)}>
                      <SelectTrigger className="h-9" data-testid="select-create-branch">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No branch</SelectItem>
                        {branches.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.isHeadBranch ? "(Head Office)" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              {templates.length > 1 && (
                <div className="space-y-1.5">
                  <Label htmlFor="create-template" className="text-xs">Assign Template</Label>
                  <Select value={createTemplateId || (defaultTemplate?.id ?? "")} onValueChange={setCreateTemplateId}>
                    <SelectTrigger className="h-9" data-testid="select-create-template">
                      <SelectValue placeholder="Select a template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((t: any) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} {t.isDefault ? "(Default)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Choose which business card template to assign.</p>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!createName || !createEmail || createMemberMutation.isPending}
              onClick={() => createMemberMutation.mutate({ displayName: createName, email: createEmail, jobTitle: createJobTitle || undefined, memberRole: createRole, phone: createPhone || undefined, bio: createBio || undefined, ...(createBranchId ? { branchId: createBranchId } : {}) })}
              data-testid="button-submit-create-member"
            >
              {createMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdCredentials} onOpenChange={(v) => { if (!v) setCreatedCredentials(null); }}>
        <DialogContent aria-describedby="credentials-desc">
          <DialogHeader>
            <DialogTitle>Member Created Successfully</DialogTitle>
            <DialogDescription id="credentials-desc">Share these login credentials with the new team member so they can sign in.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-md border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-mono" data-testid="text-cred-email">{createdCredentials?.email}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.email || "");
                    toast({ title: "Email copied!" });
                  }}
                  data-testid="button-copy-cred-email"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Temporary Password</p>
                  <p className="text-sm font-mono" data-testid="text-cred-password">{createdCredentials?.password}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(createdCredentials?.password || "");
                    toast({ title: "Password copied!" });
                  }}
                  data-testid="button-copy-cred-password"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-1">
              <p className="text-xs font-medium text-primary">How to login</p>
              <p className="text-xs text-muted-foreground">
                We have sent an email to <span className="font-medium text-foreground">{createdCredentials?.email}</span> with the login credentials and temporary password.
                The team member can also log in at{" "}
                <span className="font-mono font-medium text-foreground">{window.location.origin}/auth</span>{" "}
                using the email and temporary password above. They can change their password after logging in via Settings.
              </p>
            </div>
            <Button className="w-full" onClick={() => setCreatedCredentials(null)} data-testid="button-close-credentials">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!removeConfirmMember} onOpenChange={(v) => { if (!v) setRemoveConfirmMember(null); }}>
        <DialogContent aria-describedby="remove-member-desc">
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription id="remove-member-desc">This will remove the member from your team.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove {removeConfirmMember?.user?.displayName || removeConfirmMember?.user?.username || "this member"} from the team? They will lose access to the team workspace.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setRemoveConfirmMember(null)} data-testid="button-cancel-remove-member">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={removeMutation.isPending}
              onClick={() => removeConfirmMember && removeMutation.mutate(removeConfirmMember.id)}
              data-testid="button-confirm-remove-member"
            >
              {removeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!cardPreviewMember} onOpenChange={(v) => { if (!v) setCardPreviewMember(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Member Card</DialogTitle>
          </DialogHeader>
          {cardPreviewMember && (
            <MemberCardPreview
              member={cardPreviewMember}
              templateData={defaultTemplate?.templateData || {}}
              themeColor={defaultTemplate?.templateData?.themeColor || "#6C5CE7"}
            />
          )}
        </DialogContent>
      </Dialog>

      <EditMemberDialog member={editMember} isOpen={!!editMember} onClose={() => setEditMember(null)} teamId={teamId} isAdmin={isAdmin} isSelf={editMember?.userId === currentUserId} toast={toast} />

      {/* Member Analytics Dialog */}
      <Dialog open={!!analyticsMember} onOpenChange={(v) => { if (!v) setAnalyticsMember(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics — {analyticsMember?.businessName || analyticsMember?.user?.displayName || "Member"}
            </DialogTitle>
          </DialogHeader>
          {analyticsMember && <MemberAnalyticsContent userId={analyticsMember.userId} />}
        </DialogContent>
      </Dialog>

      <LimitReachedDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        message={limitMessage}
        onUpgrade={() => navigate("/dashboard?section=billing")}
      />
    </div>
  );
}

function MemberAnalyticsContent({ userId }: { userId: string }) {
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/analytics/member", userId],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/member/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  if (!data) {
    return <p className="text-sm text-muted-foreground text-center py-8">No analytics data available.</p>;
  }

  const totalViews = data.totalViews ?? 0;
  const totalClicks = data.totalClicks ?? 0;
  const ctr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  const allDays: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    allDays.push(d.toISOString().slice(0, 10));
  }

  const viewsMap = new Map(data.viewsByDay?.map((d: any) => [d.date, d.count]) || []);
  const clicksMap = new Map(data.clicksByDay?.map((d: any) => [d.date, d.count]) || []);
  const chartData = allDays.map((date) => ({
    date,
    label: new Date(date + "T00:00:00").toLocaleDateString("en", { weekday: "short" }),
    fullDate: new Date(date + "T00:00:00").toLocaleDateString("en", { month: "short", day: "numeric" }),
    views: (viewsMap.get(date) as number) || 0,
    clicks: (clicksMap.get(date) as number) || 0,
  }));
  const chartMax = Math.max(...chartData.map((d) => Math.max(d.views, d.clicks)), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Card><CardContent className="p-3 flex flex-col items-center text-center">
          <Eye className="w-4 h-4 text-primary mb-1" />
          <p className="text-xl font-bold">{totalViews}</p>
          <p className="text-[10px] text-muted-foreground">Views</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex flex-col items-center text-center">
          <MousePointerClick className="w-4 h-4 text-primary mb-1" />
          <p className="text-xl font-bold">{totalClicks}</p>
          <p className="text-[10px] text-muted-foreground">Clicks</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 flex flex-col items-center text-center">
          <BarChart3 className="w-4 h-4 text-primary mb-1" />
          <p className="text-xl font-bold">{ctr}%</p>
          <p className="text-[10px] text-muted-foreground">CTR</p>
        </CardContent></Card>
      </div>
      {totalViews > 0 && (
        <Card><CardContent className="p-4">
          <h4 className="text-sm font-semibold mb-3">Last 7 Days</h4>
          <div className="space-y-2">
            {chartData.map((day) => (
              <div key={day.date} className="flex items-center gap-2">
                <div className="text-right shrink-0 w-14">
                  <span className="text-[10px] text-muted-foreground">{day.fullDate}</span>
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1">
                    <div className="h-2.5 rounded-sm bg-primary transition-all" style={{ width: `${Math.max((day.views / chartMax) * 100, day.views > 0 ? 4 : 1)}%` }} />
                    {day.views > 0 && <span className="text-[10px] font-medium">{day.views}</span>}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2.5 rounded-sm bg-primary/40 transition-all" style={{ width: `${Math.max((day.clicks / chartMax) * 100, day.clicks > 0 ? 4 : 1)}%` }} />
                    {day.clicks > 0 && <span className="text-[10px] font-medium">{day.clicks}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-primary" /><span className="text-[10px] text-muted-foreground">Views</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-2 rounded-sm bg-primary/40" /><span className="text-[10px] text-muted-foreground">Clicks</span></div>
          </div>
        </CardContent></Card>
      )}
    </div>
  );
}

function MemberCardPreview({ member, templateData, themeColor }: { member: any; templateData: any; themeColor: string }) {
  const memberName = member.businessName || member.user?.displayName || member.user?.username || "Team Member";
  const memberEmail = member.user?.email || "";
  const memberJobTitle = member.jobTitle || "";
  const memberPhone = member.businessPhone || "";
  const companyName = templateData.companyName || "";
  const companyPhone = templateData.companyPhone || "";
  const companyWebsite = templateData.companyWebsite || "";
  const companyContact = templateData.companyContact || "";
  const companyAddress = templateData.companyAddress || "";

  return (
    <div className="rounded-md overflow-hidden border bg-card shadow-sm" data-testid="member-card-preview">
      <div className="h-20 relative" style={{ backgroundColor: themeColor + "22" }}>
        {templateData.coverPhoto ? (
          <img src={templateData.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="relative px-4 pb-4">
        <div className="-mt-8 mb-3 flex items-end gap-3">
          <div className="shrink-0">
            <div className="w-16 h-16 rounded-full bg-muted border-4 border-card flex items-center justify-center overflow-hidden">
              {(member.businessProfileImage || member.user?.profileImage) ? (
                <img src={member.businessProfileImage || member.user.profileImage} alt={memberName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">{memberName.charAt(0).toUpperCase()}</span>
              )}
            </div>
          </div>
          {templateData.companyLogo && companyName && (
            <div className="mb-1 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm" data-testid="preview-member-logo-badge">
              <div className="w-4 h-4 rounded-sm overflow-hidden bg-white flex items-center justify-center shrink-0 border">
                <img src={templateData.companyLogo} alt="Company" className="w-5 h-5 object-contain" />
              </div>
              <span className="text-[10px] font-semibold text-foreground/70 truncate max-w-[80px]">{companyName}</span>
            </div>
          )}
        </div>
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-bold" data-testid="preview-member-name">{memberName}</p>
            {memberJobTitle && (
              <p className="text-xs text-muted-foreground" data-testid="preview-member-jobtitle">{memberJobTitle}</p>
            )}
            {companyName && (
              <p className="text-xs font-medium" style={{ color: themeColor }} data-testid="preview-member-company">{companyName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              { icon: Mail, value: memberEmail, placeholder: "" },
              { icon: Phone, value: memberPhone, placeholder: "" },
              { icon: Phone, value: companyPhone, placeholder: "" },
              { icon: Phone, value: companyContact, placeholder: "" },
              { icon: Globe, value: companyWebsite, placeholder: "" },
              { icon: MapPin, value: companyAddress, placeholder: "" },
            ].filter(item => item.value).map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: themeColor + "20" }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: themeColor }} />
                </div>
                <span className="text-xs text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const THEME_COLORS = [
  { name: "Purple", value: "#6C5CE7" },
  { name: "Pink", value: "#E84393" },
  { name: "Red", value: "#D63031" },
  { name: "Orange", value: "#E17055" },
  { name: "Yellow", value: "#FDCB6E" },
  { name: "Green", value: "#00B894" },
  { name: "Mint", value: "#55EFC4" },
  { name: "Teal", value: "#00CEC9" },
  { name: "Blue", value: "#0984E3" },
  { name: "Indigo", value: "#6C5CE7" },
  { name: "Violet", value: "#A29BFE" },
  { name: "Magenta", value: "#FD79A8" },
  { name: "Dark", value: "#2D3436" },
  { name: "Gray", value: "#636E72" },
];

const TEMPLATE_FONTS = [
  { name: "Inter", value: "inter" },
  { name: "DM Sans", value: "dm-sans" },
  { name: "Poppins", value: "poppins" },
  { name: "Roboto", value: "roboto" },
  { name: "Playfair", value: "playfair" },
  { name: "Montserrat", value: "montserrat" },
];

interface TemplateData {
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyWebsite?: string;
  companyAddress?: string;
  companyContact?: string;
  companyLogo?: string | null;
  coverPhoto?: string | null;
  themeColor?: string;
  font?: string;
  companySocials?: Array<{ platform: string; url: string }>;
  companyProfileUrl?: string;
  productProfileUrl?: string;
  productUrls?: Array<{ label: string; url: string }>;
  companyBrochureUrl?: string;
  contactFormEnabled?: boolean;
  contactFormFields?: string[];
  meetingLink?: string;
  meetingLinkLabel?: string;
}

function TeamTemplatesPanel({ teamId }: { teamId: string }) {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createIsDefault, setCreateIsDefault] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "templates"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/templates`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
  });

  const selectedTemplate = templates.find((t: any) => t.id === selectedTemplateId) || templates[0] || null;

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string; isDefault?: boolean; templateData?: TemplateData }) => {
      const res = await apiRequest("POST", `/api/teams/${teamId}/templates`, data);
      return res.json();
    },
    onSuccess: (created: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "templates"] });
      if (created?.id) setSelectedTemplateId(created.id);
      setCreateDialogOpen(false);
      setCreateName("");
      setCreateDescription("");
      setCreateIsDefault(false);
      toast({ title: "Template created!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create template", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "templates"] });
      toast({ title: "Saved" });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/teams/${teamId}/templates/${id}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "templates"] });
      toast({ title: "Template duplicated!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/teams/${teamId}/templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "templates"] });
      setDeleteConfirmOpen(false);
      setSelectedTemplateId(null);
      toast({ title: "Template deleted!" });
    },
  });

  const updateField = (field: string, value: any) => {
    if (!selectedTemplate) return;
    // Send only the changed field - server merges with existing templateData
    updateMutation.mutate({ id: selectedTemplate.id, data: { templateData: { [field]: value } } });
  };

  const updateTemplateMeta = (field: string, value: any) => {
    if (!selectedTemplate) return;
    updateMutation.mutate({ id: selectedTemplate.id, data: { [field]: value } });
  };

  const tDataRef: TemplateData = selectedTemplate?.templateData || {};
  const themeColorRef = tDataRef.themeColor || "#6C5CE7";
  const [localFont, setLocalFont] = useState(tDataRef.font || "inter");
  const [localThemeColor, setLocalThemeColor] = useState(themeColorRef);
  const [templateDirty, setTemplateDirty] = useState(false);

  useEffect(() => {
    if (selectedTemplate) {
      setLocalFont(tDataRef.font || "inter");
      setLocalThemeColor(tDataRef.themeColor || "#6C5CE7");
      setTemplateDirty(false);
    }
  }, [selectedTemplate?.id]);

  const handleSaveTemplate = () => {
    if (!selectedTemplate) return;
    // Only send text fields - server merges with existing data (preserving images)
    const newTemplateData: Record<string, any> = {
      companyName: localCompanyName,
      companyPhone: localPhone,
      companyEmail: localEmail,
      companyWebsite: localWebsite,
      companyAddress: localAddress,
      companyContact: localContact,
      font: localFont,
      themeColor: localThemeColor,
      companySocials: localSocials.filter(s => s.platform && s.url),
      companyProfileUrl: localCompanyProfileUrl || undefined,
      productProfileUrl: localProductProfileUrl || undefined,
      productUrls: localProductUrls.filter(p => p.url.trim()) || undefined,
      companyBrochureUrl: localBrochureUrl || undefined,
      contactFormEnabled: localContactFormEnabled,
      contactFormFields: localContactFormFields,
      meetingLink: localMeetingLink || undefined,
      meetingLinkLabel: localMeetingLinkLabel || undefined,
    };
    const metaUpdates: Record<string, any> = { templateData: newTemplateData };
    if (localName.trim() && localName !== selectedTemplate.name) metaUpdates.name = localName;
    if (localDesc !== (selectedTemplate.description || "")) metaUpdates.description = localDesc;
    updateMutation.mutate({ id: selectedTemplate.id, data: metaUpdates });
    setTemplateDirty(false);
  };

  const markDirty = () => setTemplateDirty(true);

  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const handleUpload = async (file: File, field: "coverPhoto" | "companyLogo") => {
    if (!selectedTemplate) return;
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 1MB. Please choose a smaller image.", variant: "destructive" });
      return;
    }
    setUploadingField(field);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
      if (res.ok) {
        const { url } = await res.json();
        updateField(field, url);
      } else {
        const errData = await res.json().catch(() => ({}));
        toast({ title: "Upload failed", description: errData.message || "Max 1MB", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    }
    setUploadingField(null);
  };

  const tData: TemplateData = selectedTemplate?.templateData || {};
  const themeColor = localThemeColor;

  const [localName, setLocalName] = useState("");
  const [localDesc, setLocalDesc] = useState("");
  const [localCompanyName, setLocalCompanyName] = useState("");
  const [localPhone, setLocalPhone] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [localWebsite, setLocalWebsite] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [localContact, setLocalContact] = useState("");
  const [localSocials, setLocalSocials] = useState<Array<{ platform: string; url: string }>>([]);
  const [localCompanyProfileUrl, setLocalCompanyProfileUrl] = useState("");
  const [localProductProfileUrl, setLocalProductProfileUrl] = useState("");
  const [localProductUrls, setLocalProductUrls] = useState<Array<{ label: string; url: string }>>([]);
  const [localBrochureUrl, setLocalBrochureUrl] = useState("");
  const [localContactFormEnabled, setLocalContactFormEnabled] = useState(false);
  const [localContactFormFields, setLocalContactFormFields] = useState<string[]>(["name", "email", "subject", "message"]);
  const [localMeetingLink, setLocalMeetingLink] = useState("");
  const [localMeetingLinkLabel, setLocalMeetingLinkLabel] = useState("");

  useEffect(() => {
    if (selectedTemplate) {
      setLocalName(selectedTemplate.name || "");
      setLocalDesc(selectedTemplate.description || "");
      setLocalCompanyName(tData.companyName || "");
      setLocalPhone(tData.companyPhone || "");
      setLocalEmail(tData.companyEmail || "");
      setLocalWebsite(tData.companyWebsite || "");
      setLocalAddress(tData.companyAddress || "");
      setLocalContact(tData.companyContact || "");
      setLocalSocials(tData.companySocials || []);
      setLocalCompanyProfileUrl(tData.companyProfileUrl || "");
      setLocalProductProfileUrl(tData.productProfileUrl || "");
      setLocalProductUrls(tData.productUrls || []);
      setLocalBrochureUrl(tData.companyBrochureUrl || "");
      setLocalContactFormEnabled(tData.contactFormEnabled || false);
      setLocalContactFormFields(tData.contactFormFields || ["name", "email", "subject", "message"]);
      setLocalMeetingLink(tData.meetingLink || "");
      setLocalMeetingLinkLabel(tData.meetingLinkLabel || "");
    }
  }, [selectedTemplate?.id, selectedTemplate?.name, selectedTemplate?.description, tData.companyName, tData.companyPhone, tData.companyEmail, tData.companyWebsite, tData.companyAddress, tData.companyContact, JSON.stringify(tData.companySocials), tData.companyProfileUrl, tData.productProfileUrl, JSON.stringify(tData.productUrls), tData.companyBrochureUrl, tData.contactFormEnabled, JSON.stringify(tData.contactFormFields), tData.meetingLink, tData.meetingLinkLabel]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <h2 className="text-base font-semibold" data-testid="text-team-templates-heading">Team Templates</h2>
        </div>
        <Button variant="default" size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-template">
          <Plus className="w-4 h-4" />
          Create template
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4" data-testid="text-no-templates">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <LayoutTemplate className="w-7 h-7 text-muted-foreground/50" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="text-sm font-medium">No templates yet</p>
            <p className="text-xs text-muted-foreground max-w-[260px]">Create a business card template with your company branding, logo, and contact details.</p>
          </div>
          <Button variant="default" size="sm" onClick={() => setCreateDialogOpen(true)} data-testid="button-create-first-template">
            <Plus className="w-4 h-4" />
            Create your first template
          </Button>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-[320px] shrink-0 space-y-4">
            <TemplateCardPreview data={{ ...tData, companySocials: localSocials }} themeColor={themeColor} />
            {templates.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {templates.map((t: any) => (
                  <Button
                    key={t.id}
                    variant={selectedTemplate?.id === t.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedTemplateId(t.id)}
                    data-testid={`button-select-template-${t.id}`}
                  >
                    {t.name}
                    {t.isDefault && <Badge variant="secondary" className="ml-1.5 text-[10px]">Default</Badge>}
                  </Button>
                ))}
              </div>
            )}

            {/* Company Social Links - in left panel */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-muted-foreground">Company Social Links</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setLocalSocials([...localSocials, { platform: "", url: "" }]);
                      markDirty();
                    }}
                    data-testid="button-add-company-social"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add
                  </Button>
                </div>
                {localSocials.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No social links added yet.</p>
                ) : (
                  <div className="space-y-2">
                    {localSocials.map((social, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={idx === 0}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                            onClick={() => {
                              const updated = [...localSocials];
                              [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
                              setLocalSocials(updated);
                              markDirty();
                            }}
                          >
                            <ChevronDown className="w-3 h-3 rotate-180" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === localSocials.length - 1}
                            className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                            onClick={() => {
                              const updated = [...localSocials];
                              [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
                              setLocalSocials(updated);
                              markDirty();
                            }}
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        <Select
                          value={social.platform}
                          onValueChange={(val) => {
                            const updated = [...localSocials];
                            updated[idx] = { ...updated[idx], platform: val };
                            setLocalSocials(updated);
                            markDirty();
                          }}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue placeholder="Platform" />
                          </SelectTrigger>
                          <SelectContent>
                            {SOCIAL_PLATFORMS.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <div className="flex items-center gap-2">
                                  <SocialIcon platform={p.id} className="w-3.5 h-3.5" />
                                  <span className="text-xs">{p.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={social.url}
                          onChange={(e) => {
                            const updated = [...localSocials];
                            updated[idx] = { ...updated[idx], url: e.target.value };
                            setLocalSocials(updated);
                            markDirty();
                          }}
                          placeholder={getPlatform(social.platform)?.placeholder || "https://..."}
                          className="flex-1 text-xs"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => {
                            setLocalSocials(localSocials.filter((_, i) => i !== idx));
                            markDirty();
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Branch Manager */}
            <BranchManager teamId={teamId} />
          </div>

          {selectedTemplate && (
            <div className="flex-1 min-w-0 space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium flex-1 min-w-0 truncate" data-testid="text-selected-template-name">
                  {selectedTemplate.isDefault && (
                    <span className="inline-block w-1 h-4 rounded-full mr-2 align-middle" style={{ backgroundColor: themeColor }} />
                  )}
                  {selectedTemplate.name}
                </span>
                <div className="flex items-center gap-1.5">
                  <Label htmlFor="tpl-default-toggle" className="text-xs text-muted-foreground">Default</Label>
                  <Switch
                    id="tpl-default-toggle"
                    checked={selectedTemplate.isDefault || false}
                    onCheckedChange={(v) => updateTemplateMeta("isDefault", v)}
                    data-testid="switch-template-default"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={() => duplicateMutation.mutate(selectedTemplate.id)} data-testid="button-duplicate-selected-template">
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(true)} data-testid="button-delete-selected-template">
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Template Info</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        value={localName}
                        onChange={(e) => { setLocalName(e.target.value); markDirty(); }}
                        placeholder="Template name"
                        data-testid="input-template-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <Input
                        value={localDesc}
                        onChange={(e) => { setLocalDesc(e.target.value); markDirty(); }}
                        placeholder="Optional description"
                        data-testid="input-template-description"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Company Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Company Name</Label>
                      <Input
                        value={localCompanyName}
                        onChange={(e) => { setLocalCompanyName(e.target.value); markDirty(); }}
                        placeholder="Acme Corp"
                        data-testid="input-tpl-company-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Phone</Label>
                      <Input
                        value={localPhone}
                        onChange={(e) => { setLocalPhone(e.target.value); markDirty(); }}
                        placeholder="+1 555-0100"
                        data-testid="input-tpl-company-phone"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Email</Label>
                      <Input
                        type="email"
                        value={localEmail}
                        onChange={(e) => { setLocalEmail(e.target.value); markDirty(); }}
                        placeholder="info@company.com"
                        data-testid="input-tpl-company-email"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Website</Label>
                      <Input
                        value={localWebsite}
                        onChange={(e) => { setLocalWebsite(e.target.value); markDirty(); }}
                        placeholder="https://company.com"
                        data-testid="input-tpl-company-website"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Contact Number</Label>
                      <Input
                        value={localContact}
                        onChange={(e) => { setLocalContact(e.target.value); markDirty(); }}
                        placeholder="+1 555-0200"
                        data-testid="input-tpl-company-contact"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Address</Label>
                      <Input
                        value={localAddress}
                        onChange={(e) => { setLocalAddress(e.target.value); markDirty(); }}
                        placeholder="123 Main St, City, Country"
                        data-testid="input-tpl-company-address"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Links */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Document Links</h3>
                    <div className="group relative inline-block">
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[250px] rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
                        Add links to your company profile, product catalog, or brochure. These will be visible on your team members' public profiles as downloadable/viewable documents.
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Company Profile URL</Label>
                      <Input
                        value={localCompanyProfileUrl}
                        onChange={(e) => { setLocalCompanyProfileUrl(e.target.value); markDirty(); }}
                        placeholder="https://drive.google.com/file/..."
                        data-testid="input-tpl-company-profile-url"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Product Profile URL (Legacy)</Label>
                      <Input
                        value={localProductProfileUrl}
                        onChange={(e) => { setLocalProductProfileUrl(e.target.value); markDirty(); }}
                        placeholder="https://drive.google.com/file/..."
                        data-testid="input-tpl-product-profile-url"
                      />
                    </div>

                    {/* Multiple Product URLs */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs text-muted-foreground">Product URLs</Label>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => { setLocalProductUrls([...localProductUrls, { label: "", url: "" }]); markDirty(); }}
                          data-testid="button-add-product-url"
                        >
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                      </div>
                      {localProductUrls.map((pu, idx) => (
                        <div key={idx} className="flex items-center gap-2" data-testid={`product-url-row-${idx}`}>
                          <Input
                            value={pu.label}
                            onChange={(e) => {
                              const updated = [...localProductUrls];
                              updated[idx] = { ...updated[idx], label: e.target.value };
                              setLocalProductUrls(updated);
                              markDirty();
                            }}
                            placeholder="Label (e.g. Catalog 2026)"
                            className="w-[140px] text-xs"
                          />
                          <Input
                            value={pu.url}
                            onChange={(e) => {
                              const updated = [...localProductUrls];
                              updated[idx] = { ...updated[idx], url: e.target.value };
                              setLocalProductUrls(updated);
                              markDirty();
                            }}
                            placeholder="https://..."
                            className="flex-1 text-xs"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                              setLocalProductUrls(localProductUrls.filter((_, i) => i !== idx));
                              markDirty();
                            }}
                            data-testid={`button-remove-product-url-${idx}`}
                          >
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      ))}
                      {localProductUrls.length === 0 && (
                        <p className="text-[10px] text-muted-foreground italic">No product URLs added yet. Click "Add" to add one.</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Company Brochure URL</Label>
                      <Input
                        value={localBrochureUrl}
                        onChange={(e) => { setLocalBrochureUrl(e.target.value); markDirty(); }}
                        placeholder="https://drive.google.com/file/..."
                        data-testid="input-tpl-brochure-url"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Paste links to hosted documents (Google Drive, Dropbox, etc.). These will appear on public profiles.</p>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Form Settings */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Contact Form</h3>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">Enable Contact Form</p>
                      <p className="text-xs text-muted-foreground">Show a contact form on public profiles. Submissions will be emailed to the company email.</p>
                    </div>
                    <Switch
                      checked={localContactFormEnabled}
                      onCheckedChange={(v) => { setLocalContactFormEnabled(v); markDirty(); }}
                      data-testid="switch-contact-form-enabled"
                    />
                  </div>
                  {localContactFormEnabled && (
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Form Fields</Label>
                      {["name", "email", "phone", "subject", "message", "company"].map((field) => (
                        <label key={field} className="flex items-center gap-2 text-sm capitalize cursor-pointer">
                          <input
                            type="checkbox"
                            checked={localContactFormFields.includes(field)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setLocalContactFormFields([...localContactFormFields, field]);
                              } else {
                                setLocalContactFormFields(localContactFormFields.filter(f => f !== field));
                              }
                              markDirty();
                            }}
                            disabled={field === "name" || field === "email"}
                          />
                          {field} {(field === "name" || field === "email") && <span className="text-xs text-muted-foreground">(required)</span>}
                        </label>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Meeting / Booking Link */}
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Meeting / Booking Link</h3>
                  <p className="text-[10px] text-muted-foreground">Add your Calendly, Google Calendar, or any booking link. It will show on your public profile.</p>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Meeting URL</Label>
                    <Input
                      value={localMeetingLink}
                      onChange={(e) => { setLocalMeetingLink(e.target.value); markDirty(); }}
                      placeholder="https://calendly.com/your-name"
                      data-testid="input-tpl-meeting-link"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Button Label</Label>
                    <Input
                      value={localMeetingLinkLabel}
                      onChange={(e) => { setLocalMeetingLinkLabel(e.target.value); markDirty(); }}
                      placeholder="Book a Meeting"
                      data-testid="input-tpl-meeting-label"
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Branding</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cover Image <span className="text-[10px]">(Max 1MB)</span></Label>
                      <div className="relative h-24 rounded-md border border-dashed bg-muted/30 overflow-hidden group">
                        {uploadingField === "coverPhoto" ? (
                          <div className="flex flex-col items-center justify-center h-full gap-1.5">
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            <span className="text-[11px] text-muted-foreground">Uploading...</span>
                          </div>
                        ) : tData.coverPhoto ? (
                          <>
                            <img src={tData.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                              <label className="cursor-pointer">
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(file, "coverPhoto");
                                }} data-testid="input-inline-cover-upload" />
                                <Upload className="w-4 h-4 text-white" />
                              </label>
                              <button onClick={() => updateField("coverPhoto", null)} data-testid="button-inline-cover-remove">
                                <XCircle className="w-4 h-4 text-white" />
                              </button>
                            </div>
                          </>
                        ) : (
                          <label className="flex flex-col items-center justify-center h-full cursor-pointer gap-1.5">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleUpload(file, "coverPhoto");
                            }} data-testid="input-inline-cover-upload-empty" />
                            <Upload className="w-4 h-4 text-muted-foreground/50" />
                            <span className="text-[11px] text-muted-foreground/50">Upload cover</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Company Logo <span className="text-[10px]">(Max 1MB)</span></Label>
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-lg border bg-muted/30 overflow-hidden group shrink-0">
                          {uploadingField === "companyLogo" ? (
                            <div className="flex items-center justify-center w-full h-full">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                          ) : tData.companyLogo ? (
                            <>
                              <img src={tData.companyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                <label className="cursor-pointer">
                                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUpload(file, "companyLogo");
                                  }} data-testid="input-inline-logo-upload" />
                                  <Upload className="w-3 h-3 text-white" />
                                </label>
                                <button onClick={() => updateField("companyLogo", null)} data-testid="button-inline-logo-remove">
                                  <XCircle className="w-3 h-3 text-white" />
                                </button>
                              </div>
                            </>
                          ) : (
                            <label className="flex flex-col items-center justify-center w-full h-full cursor-pointer">
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleUpload(file, "companyLogo");
                              }} data-testid="input-inline-logo-upload-empty" />
                              <Upload className="w-4 h-4 text-muted-foreground/50" />
                            </label>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground/50">{tData.companyLogo ? "Hover to change" : "Upload logo"}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Theme</h3>
                  <div className="flex gap-2 flex-wrap">
                    {THEME_COLORS.map((c) => (
                      <Button
                        key={c.value + c.name}
                        variant="ghost"
                        size="icon"
                        className={`w-7 min-h-7 h-7 p-0 rounded-md ${themeColor === c.value ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
                        style={{ backgroundColor: c.value }}
                        onClick={() => updateField("themeColor", c.value)}
                        data-testid={`button-theme-color-${c.name.toLowerCase()}`}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Font</h3>
                  <div className="flex gap-2 flex-wrap">
                    {TEMPLATE_FONTS.map((f) => (
                      <Button
                        key={f.value}
                        variant={(tData.font || "inter") === f.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateField("font", f.value)}
                        data-testid={`button-font-${f.value}`}
                      >
                        {f.name}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Company Social Links moved to left panel */}

              {templateDirty && (
                <div className="sticky bottom-4 z-10">
                  <Button
                    onClick={handleSaveTemplate}
                    disabled={updateMutation.isPending}
                    className="w-full shadow-lg"
                    data-testid="button-save-template-changes"
                  >
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-sm" aria-describedby="create-template-desc-text">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription id="create-template-desc-text">Set up a new business card template for your team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-template-name">Template Name</Label>
              <Input
                id="create-template-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="e.g. Default Card"
                data-testid="input-create-template-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-template-desc">Description</Label>
              <Input
                id="create-template-desc"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Optional description"
                data-testid="input-create-template-desc"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="create-template-default">Set as default</Label>
              <Switch
                id="create-template-default"
                checked={createIsDefault}
                onCheckedChange={setCreateIsDefault}
                data-testid="switch-create-template-default"
              />
            </div>
            <Button
              className="w-full"
              disabled={!createName.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate({ name: createName, description: createDescription, isDefault: createIsDefault })}
              data-testid="button-submit-create-template"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Template
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent aria-describedby="delete-template-desc-text">
          <DialogHeader>
            <DialogTitle>Delete Template</DialogTitle>
            <DialogDescription id="delete-template-desc-text">This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedTemplate?.name}"?
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)} data-testid="button-cancel-delete-template">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteMutation.isPending}
              onClick={() => selectedTemplate && deleteMutation.mutate(selectedTemplate.id)}
              data-testid="button-confirm-delete-template"
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplateCardPreview({ data, themeColor }: { data: TemplateData; themeColor: string }) {
  return (
    <div className="rounded-md overflow-hidden border bg-card shadow-sm" data-testid="template-card-preview">
      <div className="h-20 relative" style={{ backgroundColor: themeColor + "22" }}>
        {data.coverPhoto ? (
          <img src={data.coverPhoto} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="relative px-4 pb-4">
        <div className="-mt-8 mb-3 flex items-end gap-3">
          <div className="w-16 h-16 rounded-full bg-muted border-4 border-card flex items-center justify-center overflow-hidden shrink-0">
            <UserIcon className="w-6 h-6 text-muted-foreground/50" />
          </div>
          {data.companyLogo && (
            <div className="mb-1 flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm border shadow-sm">
              <div className="w-4 h-4 rounded-sm overflow-hidden bg-white flex items-center justify-center shrink-0 border">
                <img src={data.companyLogo} alt="Logo" className="w-3.5 h-3.5 object-contain" />
              </div>
              {data.companyName && <span className="text-[10px] font-semibold text-foreground/70 truncate max-w-[80px]">{data.companyName}</span>}
            </div>
          )}
        </div>
        <div className="space-y-2.5">
          <div>
            <p className="text-sm font-bold" data-testid="preview-name"><span className="text-muted-foreground">Full Name</span></p>
            <p className="text-xs text-muted-foreground" data-testid="preview-jobtitle"><span className="text-muted-foreground">Job Title</span></p>
            {data.companyName ? (
              <p className="text-xs font-medium" style={{ color: themeColor }} data-testid="preview-company">{data.companyName}</p>
            ) : (
              <p className="text-xs text-muted-foreground" data-testid="preview-company"><span className="text-muted-foreground">Company</span></p>
            )}
          </div>
          <div className="space-y-1.5">
            {[
              { icon: Mail, value: data.companyEmail, placeholder: "Email" },
              { icon: Phone, value: data.companyPhone, placeholder: "Phone" },
              { icon: Phone, value: data.companyContact, placeholder: "Contact" },
              { icon: Globe, value: data.companyWebsite, placeholder: "Website" },
              { icon: MapPin, value: data.companyAddress, placeholder: "Address" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: themeColor + "20" }}>
                  <item.icon className="w-3.5 h-3.5" style={{ color: themeColor }} />
                </div>
                <span className={`text-xs ${item.value ? "text-foreground" : "text-muted-foreground"}`}>
                  {item.value || item.placeholder}
                </span>
              </div>
            ))}
          </div>
          {/* Company Social Icons */}
          {data.companySocials && data.companySocials.filter(s => s.platform && s.url).length > 0 && (
            <div className="flex items-center gap-2 pt-2">
              {data.companySocials.filter(s => s.platform && s.url).map((social, i) => (
                <a key={i} href={social.url} target="_blank" rel="noopener noreferrer"
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: themeColor + "20" }}>
                  <SocialIcon platform={social.platform} className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function URLQRGeneratorPanel({ username }: { username: string }) {
  const { toast } = useToast();
  const { data: currentUser } = useQuery<any>({ queryKey: ["/api/auth/me"] });
  const isWhiteLabel = currentUser?.whiteLabelEnabled ?? false;
  const [url, setUrl] = useState("");
  const [qrStyle, setQrStyle] = useState<QRStyle>("square");
  const [qrColor, setQrColor] = useState("#6C5CE7");
  const [qrColor2, setQrColor2] = useState("#FF6B6B");
  const [borderRadius, setBorderRadius] = useState(8);
  const [borderWidth, setBorderWidth] = useState(3);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [scanText, setScanText] = useState(false);
  const [customText, setCustomText] = useState("");
  const [generated, setGenerated] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState<QRTemplateCategory>("all");
  const [generatorDownloading, setGeneratorDownloading] = useState(false);

  const applyTemplate = (template: QRTemplate) => {
    setSelectedTemplateId(template.id);
    setQrStyle(template.style);
    setQrColor(template.color);
    setQrColor2(template.color2);
    setBorderRadius(template.borderRadius);
    setBorderWidth(template.borderWidth);
    setScanText(template.scanText);
    setGenerated(false);
  };

  const filteredUrlTemplates = templateCategory === "all" ? QR_TEMPLATES : QR_TEMPLATES.filter(t => t.category === templateCategory);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const urlStyleOptions: { value: QRStyle; label: string }[] = [
    { value: "circle", label: "Circle" },
    { value: "square", label: "Square" },
    { value: "stripe", label: "Stripe" },
    { value: "full", label: "Solid" },
    { value: "gradient", label: "Gradient" },
    { value: "elegant", label: "Elegant" },
    { value: "badge", label: "Badge" },
    { value: "modern", label: "Modern" },
    { value: "ticket", label: "Ticket" },
    { value: "heart", label: "Heart" },
    { value: "bubble", label: "Bubble" },
    { value: "tag", label: "Tag" },
    { value: "poster", label: "Poster" },
  ];

  const getContainerStyle = (): React.CSSProperties => {
    const style: React.CSSProperties = { overflow: "visible", padding: "16px", background: "white", position: "relative", transition: "all 0.3s ease" };
    switch (qrStyle) {
      case "circle": style.borderRadius = "50%"; style.border = `${Math.max(borderWidth, 3)}px solid ${qrColor}`; style.overflow = "hidden"; style.boxShadow = `0 4px 20px ${qrColor}25`; break;
      case "square": style.borderRadius = `${borderRadius}px`; style.border = `${borderWidth}px solid ${qrColor}`; style.boxShadow = `0 4px 16px ${qrColor}20`; break;
      case "stripe": style.borderRadius = `${borderRadius}px`; style.borderTop = `${Math.max(borderWidth, 4)}px solid ${qrColor}`; style.borderBottom = `${Math.max(borderWidth, 4)}px solid ${qrColor}`; style.boxShadow = `0 4px 16px rgba(0,0,0,0.06)`; break;
      case "full": style.borderRadius = `${borderRadius}px`; style.background = qrColor; style.padding = "20px"; style.boxShadow = `0 8px 32px ${qrColor}40`; break;
      case "gradient":
        style.borderRadius = `${borderRadius || 16}px`;
        style.border = `${Math.max(borderWidth, 4)}px solid transparent`;
        style.backgroundImage = `linear-gradient(white, white), linear-gradient(135deg, ${qrColor}, ${qrColor2})`;
        style.backgroundOrigin = "border-box";
        style.backgroundClip = "padding-box, border-box";
        style.boxShadow = `0 8px 32px ${qrColor}30`;
        break;
      case "elegant":
        style.borderRadius = `${borderRadius || 12}px`;
        style.border = `${Math.max(borderWidth, 2)}px solid ${qrColor}`;
        style.boxShadow = `0 0 0 ${Math.max(borderWidth, 2) + 3}px white, 0 0 0 ${Math.max(borderWidth, 2) + 5}px ${qrColor}, 0 8px 24px ${qrColor}20`;
        break;
      case "badge":
        style.borderRadius = `${borderRadius || 20}px`;
        style.border = `${Math.max(borderWidth, 3)}px solid ${qrColor}`;
        style.padding = "20px 16px 28px 16px";
        style.boxShadow = `0 6px 24px ${qrColor}25`;
        break;
      case "modern":
        style.borderRadius = `${borderRadius || 20}px`;
        style.boxShadow = `0 12px 40px ${qrColor}25, 0 4px 12px rgba(0,0,0,0.06)`;
        style.border = `2px solid ${qrColor}15`;
        style.padding = "20px 16px 28px 16px";
        break;
      case "ticket":
        style.borderRadius = `${borderRadius || 16}px`;
        style.border = `${Math.max(borderWidth, 2)}px dashed ${qrColor}`;
        style.padding = "20px 16px 28px 16px";
        style.boxShadow = `0 4px 16px ${qrColor}15`;
        break;
      case "heart":
        style.background = "transparent";
        style.padding = "0";
        style.overflow = "visible";
        style.border = "none";
        break;
      case "bubble":
        style.borderRadius = `${borderRadius || 24}px`;
        style.border = `${Math.max(borderWidth, 3)}px solid ${qrColor}`;
        style.padding = "20px 16px 28px 16px";
        style.marginBottom = "16px";
        style.boxShadow = `0 6px 24px ${qrColor}20`;
        break;
      case "tag":
        style.borderRadius = "50%";
        style.border = `${Math.max(borderWidth, 4)}px solid ${qrColor}`;
        style.background = "white";
        style.padding = "20px";
        style.marginTop = "16px";
        style.overflow = "visible";
        style.boxShadow = `0 8px 28px ${qrColor}35`;
        break;
    }
    return style;
  };

  // Heart SVG renderer for URL QR panel
  const renderUrlHeartQR = (qrElement: React.ReactNode, size: number) => {
    const heartW = size * 1.8;
    const heartH = size * 2.0;
    const hasText = showScanText || customText.trim();
    const textAreaH = hasText ? size * 0.35 : 0;
    const totalH = heartH + textAreaH;
    return (
      <div style={{ position: "relative", width: heartW, height: totalH, filter: `drop-shadow(0 8px 24px ${qrColor}40)` }}>
        <svg viewBox="0 0 100 100" width={heartW} height={heartH} style={{ position: "absolute", top: 0, left: 0 }} preserveAspectRatio="none">
          <path d="M50 88 C25 65, 2 45, 2 28 C2 14, 14 2, 28 2 C36 2, 44 6, 50 14 C56 6, 64 2, 72 2 C86 2, 98 14, 98 28 C98 45, 75 65, 50 88Z" fill={qrColor} />
        </svg>
        <div style={{ position: "absolute", top: "16%", left: "50%", transform: "translateX(-50%)", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ background: "white", borderRadius: "8px", padding: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {qrElement}
          </div>
        </div>
        {hasText && (
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, textAlign: "center", zIndex: 2 }}>
            {showScanText && (
              <div className="font-extrabold tracking-[0.15em] uppercase" style={{ color: qrColor, fontSize: "11px" }}>
                SCAN ME
              </div>
            )}
            {customText.trim() && (
              <div className="font-bold" style={{ color: qrColor, fontSize: "10px", marginTop: "2px" }}>
                {customText.trim()}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Poster-style renderer for URL QR panel
  const renderUrlPosterQR = (qrElement: React.ReactNode, size: number) => {
    const textContent = customText.trim() || "";
    const lines = textContent.split("\n");
    return (
      <div style={{
        display: "flex",
        alignItems: "stretch",
        border: `3px solid ${qrColor}`,
        borderRadius: "12px",
        overflow: "hidden",
        minWidth: size * 2.2,
        background: "#ffffff",
      }}>
        <div style={{
          flex: "1 1 0",
          padding: `${size * 0.12}px`,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          minWidth: size * 0.8,
          background: `linear-gradient(135deg, ${qrColor}08, ${qrColor}15)`,
        }}>
          {lines.map((line: string, i: number) => (
            <div key={i} style={{
              fontSize: i === 0 ? `${Math.max(size * 0.11, 11)}px` : `${Math.max(size * 0.08, 9)}px`,
              fontWeight: i === 0 ? 700 : 400,
              color: i === 0 ? qrColor : "#374151",
              lineHeight: 1.4,
              marginTop: line === "" ? `${size * 0.06}px` : "0",
              whiteSpace: "pre-wrap",
            }}>
              {line || "\u00A0"}
            </div>
          ))}
          {showScanText && (
            <div style={{
              marginTop: `${size * 0.08}px`,
              fontSize: `${Math.max(size * 0.07, 8)}px`,
              fontWeight: 800,
              color: qrColor,
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
            }}>
              SCAN ME →
            </div>
          )}
        </div>
        <div style={{
          padding: `${size * 0.1}px`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderLeft: `2px solid ${qrColor}20`,
        }}>
          {qrElement}
        </div>
      </div>
    );
  };

  const showScanText = scanText || ["badge", "modern", "ticket", "bubble", "tag"].includes(qrStyle);

  const downloadQR = async () => {
    const container = document.getElementById("url-qr-download-wrap");
    if (!container) return;
    setGeneratorDownloading(true);
    try {
      const dataUrl = await toPng(container, {
        pixelRatio: 4,
        backgroundColor: "#ffffff",
        cacheBust: true,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `qrcode-${Date.now()}.png`;
      a.click();
      toast({ title: "QR code downloaded!" });
    } catch (err) {
      console.error("QR download failed", err);
      toast({ title: "Download failed", description: "Please try again" });
    } finally {
      setGeneratorDownloading(false);
    }
  };

  const isValidUrl = url.trim().length > 0;
  const qrValue = url.startsWith("http") ? url : `https://${url}`;

  // Helper to render QR preview (reused for live preview and download)
  const renderQRPreview = (size: number, id: string) => {
    const qrProps = {
      id,
      value: qrValue || "https://example.com",
      size,
      level: "H" as const,
      fgColor: qrStyle === "full" ? "#ffffff" : qrColor,
      bgColor: "transparent",
      imageSettings: logoPreview ? { src: logoPreview, height: Math.round(size * 0.2), width: Math.round(size * 0.2), excavate: true } : undefined,
    };

    if (qrStyle === "heart") {
      return renderUrlHeartQR(<QRCodeSVG {...qrProps} />, size);
    }
    if (qrStyle === "poster") {
      return renderUrlPosterQR(<QRCodeSVG {...qrProps} />, size);
    }
    return (
      <div style={getContainerStyle()} data-qr-container>
        <QRCodeSVG {...qrProps} />
        {showScanText && (
          <div className="text-center font-extrabold tracking-[0.15em] uppercase mt-2" style={{ color: qrStyle === "tag" ? "#ffffff" : qrColor, fontSize: `${Math.max(size * 0.06, 10)}px` }}>
            SCAN ME
          </div>
        )}
        {qrStyle === "bubble" && (
          <div style={{ position: "absolute", bottom: "-14px", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: `14px solid ${qrColor}`, filter: `drop-shadow(0 2px 4px ${qrColor}30)` }} />
        )}
        {qrStyle === "tag" && (
          <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", width: "20px", height: "20px", borderRadius: "50%", border: `3px solid ${qrColor}`, background: "white", boxShadow: `0 2px 8px ${qrColor}30` }} />
        )}
        {customText.trim() && (
          <div className="text-center font-bold mt-1" style={{ color: qrStyle === "tag" ? "#ffffff" : qrColor, fontSize: `${Math.max(size * 0.055, 9)}px` }}>
            {customText.trim()}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-6">
      <SectionHeader title="QR Generator" />
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold">URL QR Code Generator</h2>
        <p className="text-sm text-muted-foreground">Enter any website link and generate a branded QR code instantly.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Controls */}
        <div className="flex-1 space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>Website URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  data-testid="input-qr-url"
                />
              </div>

              {/* Template Picker */}
              <div className="space-y-2">
                <Label className="text-xs">Quick Templates</Label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {QR_TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setTemplateCategory(cat.value)}
                      className={`text-[10px] px-2 py-0.5 rounded-full transition-all border ${
                        templateCategory === cat.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-[120px] overflow-y-auto">
                  {filteredUrlTemplates.map((t) => {
                    const getThumbStyle = (): React.CSSProperties => {
                      const base: React.CSSProperties = { width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", transition: "all 0.2s ease" };
                      if (t.style === "heart") return { ...base, background: "transparent", border: "none", color: t.color };
                      if (t.style === "circle") return { ...base, borderRadius: "50%", border: `2px solid ${t.color}`, background: `${t.color}08`, boxShadow: `0 2px 6px ${t.color}20` };
                      if (t.style === "full") return { ...base, borderRadius: "6px", background: t.color, color: "#fff", boxShadow: `0 2px 8px ${t.color}35` };
                      if (t.style === "gradient") return { ...base, borderRadius: "6px", background: `linear-gradient(135deg, ${t.color}, ${t.color2})`, color: "#fff", boxShadow: `0 2px 8px ${t.color}30` };
                      if (t.style === "elegant") return { ...base, borderRadius: "4px", border: `2px solid ${t.color}`, boxShadow: `0 0 0 2px white, 0 0 0 4px ${t.color}40` };
                      if (t.style === "ticket") return { ...base, borderRadius: "4px", border: `2px dashed ${t.color}` };
                      if (t.style === "modern") return { ...base, borderRadius: "8px", border: `1px solid ${t.color}20`, boxShadow: `0 3px 12px ${t.color}20` };
                      if (t.style === "tag") return { ...base, borderRadius: "50%", background: t.color, color: "#fff", boxShadow: `0 2px 8px ${t.color}35` };
                      return { ...base, borderRadius: "4px", border: `2px solid ${t.color}`, background: `${t.color}08` };
                    };
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl border-2 transition-all text-[10px] group ${
                          selectedTemplateId === t.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-transparent hover:bg-muted/60"
                        }`}
                      >
                        <div style={getThumbStyle()} className="group-hover:scale-110 transition-transform">
                          {t.style === "heart" ? (
                            <svg viewBox="0 0 32 32" width="32" height="32">
                              <path d="M16 28 C8 20, 2 15, 2 10 C2 5, 6 2, 10 2 C12 2, 14 3, 16 6 C18 3, 20 2, 22 2 C26 2, 30 5, 30 10 C30 15, 24 20, 16 28Z" fill={t.color} />
                              <text x="16" y="15" textAnchor="middle" dominantBaseline="central" fontSize="8" fill="white">{t.icon}</text>
                            </svg>
                          ) : (
                            <span>{t.icon}</span>
                          )}
                        </div>
                        <span className="font-medium text-foreground truncate w-full text-center leading-tight">{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visual Frame Style Picker */}
              <div className="space-y-2">
                <Label className="text-xs">Frame Style</Label>
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                  {urlStyleOptions.map((opt) => {
                    const getStyleThumb = (): React.CSSProperties => {
                      const base: React.CSSProperties = { width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease" };
                      const c = qrColor;
                      switch (opt.value) {
                        case "circle": return { ...base, borderRadius: "50%", border: `2px solid ${c}`, background: `${c}10` };
                        case "square": return { ...base, borderRadius: "4px", border: `2px solid ${c}`, background: `${c}10` };
                        case "stripe": return { ...base, borderRadius: "4px", borderTop: `3px solid ${c}`, borderBottom: `3px solid ${c}` };
                        case "full": return { ...base, borderRadius: "6px", background: c };
                        case "gradient": return { ...base, borderRadius: "6px", background: `linear-gradient(135deg, ${c}, ${qrColor2})` };
                        case "elegant": return { ...base, borderRadius: "4px", border: `2px solid ${c}`, boxShadow: `0 0 0 2px white, 0 0 0 3px ${c}60` };
                        case "badge": return { ...base, borderRadius: "8px", border: `2px solid ${c}`, background: `${c}08` };
                        case "modern": return { ...base, borderRadius: "8px", boxShadow: `0 3px 12px ${c}30`, border: `1px solid ${c}20` };
                        case "ticket": return { ...base, borderRadius: "6px", border: `2px dashed ${c}` };
                        case "heart": return { ...base, background: "transparent" };
                        case "bubble": return { ...base, borderRadius: "8px", border: `2px solid ${c}`, background: `${c}08` };
                        case "tag": return { ...base, borderRadius: "50%", background: c };
                        case "poster": return { ...base, borderRadius: "4px", border: `2px solid ${c}`, background: `linear-gradient(90deg, ${c}10, white)` };
                        default: return base;
                      }
                    };
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setQrStyle(opt.value as any)}
                        className={`flex flex-col items-center gap-0.5 text-[10px] py-1.5 px-1 rounded-lg transition-all border-2 ${
                          qrStyle === opt.value
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <div style={getStyleThumb()}>
                          {opt.value === "heart" ? (
                            <svg viewBox="0 0 24 24" width="20" height="20">
                              <path d="M12 21 C6 15, 2 11, 2 7 C2 4, 4 2, 7 2 C9 2, 11 3, 12 5 C13 3, 15 2, 17 2 C20 2, 22 4, 22 7 C22 11, 18 15, 12 21Z" fill={qrColor} />
                            </svg>
                          ) : (
                            <div style={{ width: 12, height: 12, background: opt.value === "full" || opt.value === "tag" ? "white" : qrColor, borderRadius: 2, opacity: opt.value === "full" || opt.value === "tag" ? 0.9 : 0.4 }} />
                          )}
                        </div>
                        <span className="font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={qrColor} onChange={(e) => setQrColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                    <Input value={qrColor} onChange={(e) => setQrColor(e.target.value)} className="font-mono text-xs flex-1" />
                  </div>
                </div>
                {qrStyle === "gradient" ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Secondary Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={qrColor2} onChange={(e) => setQrColor2(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0" />
                      <Input value={qrColor2} onChange={(e) => setQrColor2(e.target.value)} className="font-mono text-xs flex-1" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-xs">Border Width: {borderWidth}px</Label>
                    <Slider value={[borderWidth]} onValueChange={([v]) => setBorderWidth(v)} min={0} max={8} step={1} />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Border Radius: {borderRadius}px</Label>
                  <Slider value={[borderRadius]} onValueChange={([v]) => setBorderRadius(v)} min={0} max={30} step={1} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={scanText} onCheckedChange={setScanText} data-testid="switch-url-scan-text" />
                  <Label className="text-xs">Scan Me Text</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Logo (optional)</Label>
                <div className="flex items-center gap-3">
                  {logoPreview ? (
                    <img src={logoPreview} alt="Logo" className="w-10 h-10 rounded object-cover border" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center border">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <input type="file" accept="image/*" className="hidden" id="url-qr-logo" onChange={handleLogoUpload} />
                  <Button variant="outline" size="sm" onClick={() => document.getElementById("url-qr-logo")?.click()}>
                    <Upload className="w-3.5 h-3.5 mr-1" /> Upload
                  </Button>
                  {logoPreview && <Button variant="ghost" size="sm" onClick={() => setLogoPreview(null)}>Remove</Button>}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">{qrStyle === "poster" ? "Poster Text (multi-line)" : "Custom Text (Name / Company)"}</Label>
                {qrStyle === "poster" ? (
                  <Textarea value={customText} onChange={(e) => setCustomText(e.target.value)}
                    placeholder={"e.g.\nJohn Doe\nSoftware Engineer\n\nScan to connect!"} className="text-sm min-h-[80px]" maxLength={200} data-testid="input-url-qr-custom-text" />
                ) : (
                  <Input value={customText} onChange={(e) => setCustomText(e.target.value)}
                    placeholder="e.g. John Doe or Acme Inc." maxLength={50} data-testid="input-url-qr-custom-text" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Live Preview */}
        <div className="lg:w-[320px] lg:sticky lg:top-4 self-start">
          <Card>
            <CardContent className="p-6 flex flex-col items-center gap-4">
              <h3 className="text-sm font-semibold text-muted-foreground">Live Preview</h3>
              <div id="url-qr-download-wrap" style={{ display: "inline-block", padding: "16px", background: "#ffffff" }}>
                {renderQRPreview(160, "url-qr-code")}
                {!isWhiteLabel && <p style={{ color: "#9ca3af", fontSize: "8px", textAlign: "center", marginTop: "6px" }}>Powered by VisiCardly</p>}
              </div>
              <div className="flex items-center gap-2 w-full">
                <Button variant="outline" className="flex-1" onClick={downloadQR} disabled={!isValidUrl || generatorDownloading}>
                  {generatorDownloading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Download className="w-4 h-4 mr-1" />} Download
                </Button>
                <Button variant="outline" className="flex-1" disabled={!isValidUrl} onClick={() => { navigator.clipboard.writeText(url); toast({ title: "URL copied!" }); }}>
                  <Copy className="w-4 h-4 mr-1" /> Copy URL
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}



function ContactsPanel({ teamId, userId, isTeamMember = false }: { teamId: string; userId: string; isTeamMember?: boolean }) {
  const { toast } = useToast();
  const [contactType, setContactType] = useState<"company" | "personal">("company");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCompany, setEditCompany] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newJobTitle, setNewJobTitle] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newType, setNewType] = useState<"personal" | "company">("personal");

  const { data: contacts = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/contacts", { type: contactType }],
    queryFn: async () => {
      const res = await fetch(`/api/contacts?type=${contactType}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; email?: string; phone?: string; company?: string; jobTitle?: string; notes?: string; type?: string }) => {
      const res = await apiRequest("POST", "/api/contacts", data);
      return await res.json();
    },
    onSuccess: (newContact: any) => {
      // Optimistically add to cache instead of refetching
      queryClient.setQueryData(["/api/contacts", { type: contactType }], (old: any[] | undefined) => {
        return old ? [...old, newContact] : [newContact];
      });
      // Also invalidate the other tab's cache so it refreshes when switched
      const otherType = contactType === "company" ? "personal" : "company";
      queryClient.invalidateQueries({ queryKey: ["/api/contacts", { type: otherType }] });
      closeCreateDialog();
      toast({ title: "Contact created!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to create contact", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/contacts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setDeleteConfirmId(null);
      toast({ title: "Contact deleted!" });
    },
    onError: (err: any) => {
      setDeleteConfirmId(null);
      toast({ title: "Only team owners can delete company contacts", variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const res = await apiRequest("PATCH", `/api/contacts/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
      setEditContact(null);
      toast({ title: "Contact updated!" });
    },
    onError: (err: any) => {
      toast({ title: "Failed to update contact", description: err.message, variant: "destructive" });
    },
  });

  const openEditContact = (contact: any) => {
    setEditContact(contact);
    setEditName(contact.name || "");
    setEditEmail(contact.email || "");
    setEditPhone(contact.phone || "");
    setEditCompany(contact.company || "");
    setEditJobTitle(contact.jobTitle || "");
    setEditNotes(contact.notes || "");
  };

  const closeCreateDialog = () => {
    setCreateOpen(false);
    setNewName("");
    setNewEmail("");
    setNewPhone("");
    setNewCompany("");
    setNewJobTitle("");
    setNewNotes("");
    setNewType("personal");
  };

  const filteredContacts = contacts.filter((c: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SidebarTrigger data-testid="button-sidebar-toggle" />
          <h2 className="text-base font-semibold">Contacts</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" disabled={contacts.length === 0} onClick={() => {
            const csvContent = "Name,Email,Phone,Company,Job Title,Notes,Type\n";
            const rows = contacts.map((c: any) => [c.name, c.email || "", c.phone || "", c.company || "", c.jobTitle || "", (c.notes || "").replace(/,/g, ";"), c.type || "personal"].join(","));
            const blob = new Blob([csvContent + rows.join("\n")], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `contacts-${contactType}-${new Date().toISOString().split("T")[0]}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Contacts exported!" });
          }}>
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".csv";
            input.onchange = async (e: any) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const lines = text.split("\n").filter((l: string) => l.trim());
              if (lines.length < 2) { toast({ title: "Empty CSV", variant: "destructive" }); return; }
              const headers = lines[0].toLowerCase().split(",").map((h: string) => h.trim());
              let imported = 0;
              let skipped = 0;
              const totalRows = lines.length - 1;
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(",").map((v: string) => v.trim());
                const row: any = {};
                headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ""; });
                const name = row.name || row["full name"] || row["contact name"];
                if (!name) continue;
                try {
                  await apiRequest("POST", "/api/contacts", {
                    name,
                    email: row.email || undefined,
                    phone: row.phone || row.mobile || row["phone number"] || undefined,
                    company: row.company || row.organization || undefined,
                    jobTitle: row["job title"] || row.title || row.designation || undefined,
                    notes: row.notes || undefined,
                    type: row.type === "company" ? "company" : "personal",
                  });
                  imported++;
                } catch {
                  skipped++;
                }
              }
              queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
              const description = skipped > 0 ? `${skipped} contact${skipped > 1 ? "s" : ""} skipped (duplicate email or invalid data)` : undefined;
              toast({ title: `Imported ${imported} contacts!`, description });
            };
            input.click();
          }}>
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const template = "Name,Email,Phone,Company,Job Title,Notes,Type\nJohn Doe,john@example.com,+1234567890,Acme Inc,Manager,Sample note,personal\nJane Smith,jane@company.com,+0987654321,Global Corp,Director,Company contact example,company";
            const blob = new Blob([template], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "contacts-template.csv";
            a.click();
            URL.revokeObjectURL(url);
            toast({ title: "Template downloaded!" });
          }}>
            <FileText className="w-4 h-4 mr-1" /> Template
          </Button>
          <Button variant="default" size="sm" onClick={() => setCreateOpen(true)} data-testid="button-create-contact">
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={contactType === "company" ? "default" : "outline"}
          size="sm"
          onClick={() => setContactType("company")}
          data-testid="button-tab-company"
        >
          All company contacts
        </Button>
        <Button
          variant={contactType === "personal" ? "default" : "outline"}
          size="sm"
          onClick={() => setContactType("personal")}
          data-testid="button-tab-personal"
        >
          My contacts
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search contacts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          data-testid="input-search-contacts"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filteredContacts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No contacts yet.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Job Title</TableHead>
                {!isTeamMember && <TableHead className="w-12"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContacts.map((contact: any) => (
                <TableRow key={contact.id} data-testid={`row-contact-${contact.id}`}>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>
                    {contact.email ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Mail className="w-3 h-3 shrink-0 text-muted-foreground" />
                        <span>{contact.email}</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {contact.phone ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Phone className="w-3 h-3 shrink-0 text-muted-foreground" />
                        <span>{contact.phone}</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>
                    {contact.company ? (
                      <div className="flex items-center gap-1.5 text-sm">
                        <Building2 className="w-3 h-3 shrink-0 text-muted-foreground" />
                        <span>{contact.company}</span>
                      </div>
                    ) : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell>{contact.jobTitle || <span className="text-muted-foreground">—</span>}</TableCell>
                  {!isTeamMember && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Edit: company contacts only editable by team owner (non-team-member), personal always editable */}
                        {(contactType === "personal" || !isTeamMember) && (
                          <Button variant="ghost" size="icon" onClick={() => openEditContact(contact)} title="Edit contact">
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {deleteConfirmId === contact.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(contact.id)}>
                              <Check className="w-4 h-4 text-destructive" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(null)}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(contact.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(v) => !v && closeCreateDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="contact-name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="contact-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contact name"
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="contact-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                data-testid="input-contact-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Phone <span className="text-destructive">*</span></Label>
              <Input
                id="contact-phone"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                data-testid="input-contact-phone"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-company">Company</Label>
              <Input
                id="contact-company"
                value={newCompany}
                onChange={(e) => setNewCompany(e.target.value)}
                placeholder="Company name"
                data-testid="input-contact-company"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-jobtitle">Job Title <span className="text-destructive">*</span></Label>
              <Input
                id="contact-jobtitle"
                value={newJobTitle}
                onChange={(e) => setNewJobTitle(e.target.value)}
                placeholder="Job title"
                data-testid="input-contact-jobtitle"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-notes">Notes</Label>
              <Textarea
                id="contact-notes"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={3}
                data-testid="input-contact-notes"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contact-type"
                    value="personal"
                    checked={newType === "personal"}
                    onChange={() => setNewType("personal")}
                    data-testid="radio-contact-personal"
                  />
                  <span className="text-sm">Personal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="contact-type"
                    value="company"
                    checked={newType === "company"}
                    onChange={() => setNewType("company")}
                    data-testid="radio-contact-company"
                  />
                  <span className="text-sm">Company</span>
                </label>
              </div>
            </div>
            <Button
              className="w-full"
              disabled={!newName || !newEmail || !newPhone || !newJobTitle || createMutation.isPending}
              onClick={() => createMutation.mutate({
                name: newName,
                email: newEmail || undefined,
                phone: newPhone || undefined,
                company: newCompany || undefined,
                jobTitle: newJobTitle || undefined,
                notes: newNotes || undefined,
                type: newType,
              })}
              data-testid="button-submit-contact"
            >
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editContact} onOpenChange={(v) => { if (!v) setEditContact(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Contact name" />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="+1 (555) 123-4567" />
            </div>
            <div className="space-y-1.5">
              <Label>Company</Label>
              <Input value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="Company name" />
            </div>
            <div className="space-y-1.5">
              <Label>Job Title</Label>
              <Input value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="Job title" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="Additional notes..." rows={3} />
            </div>
            <Button
              className="w-full"
              disabled={!editName || editMutation.isPending}
              onClick={() => editContact && editMutation.mutate({
                id: editContact.id,
                data: {
                  name: editName,
                  email: editEmail || undefined,
                  phone: editPhone || undefined,
                  company: editCompany || undefined,
                  jobTitle: editJobTitle || undefined,
                  notes: editNotes || undefined,
                },
              })}
            >
              {editMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Services & Products Panel ──────────────────────────────────────────────
function ServicesProductsPanel({ teamId, teamSlug, type }: { teamId: string; teamSlug: string; type: "services" | "products" }) {
  const { toast } = useToast();
  const label = type === "services" ? "Services" : "Products";
  const Icon = type === "services" ? Briefcase : UtensilsCrossed;
  const pageUrl = `${window.location.origin}/${teamSlug}/${type === "services" ? "service" : "product"}`;
  const [copied, setCopied] = useState(false);

  // Fetch the team's templates to get default branding
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, "templates"],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/templates`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  // Items state
  const [items, setItems] = useState<Array<{ id: string; title: string; description: string; price?: string; imageUrl?: string; active: boolean }>>([]);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formImage, setFormImage] = useState("");

  // Fetch items
  const { data: fetchedItems = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/teams", teamId, type],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${teamId}/${type}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  useEffect(() => {
    setItems(fetchedItems);
  }, [fetchedItems]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) {
        await apiRequest("PATCH", `/api/teams/${teamId}/${type}/${data.id}`, data);
      } else {
        await apiRequest("POST", `/api/teams/${teamId}/${type}`, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, type] });
      setAddDialogOpen(false);
      setEditItem(null);
      resetForm();
      toast({ title: `${label.slice(0, -1)} saved!` });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/teams/${teamId}/${type}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, type] });
      toast({ title: `${label.slice(0, -1)} deleted` });
    },
  });

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormPrice("");
    setFormImage("");
  };

  const openAdd = () => {
    resetForm();
    setEditItem(null);
    setAddDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setFormTitle(item.title);
    setFormDesc(item.description || "");
    setFormPrice(item.price || "");
    setFormImage(item.imageUrl || "");
    setEditItem(item);
    setAddDialogOpen(true);
  };

  const handleSave = () => {
    if (!formTitle.trim()) return;
    saveMutation.mutate({
      ...(editItem ? { id: editItem.id } : {}),
      title: formTitle,
      description: formDesc || undefined,
      price: formPrice || undefined,
      imageUrl: formImage || undefined,
    });
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(pageUrl);
    setCopied(true);
    toast({ title: "Link copied!" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <SidebarTrigger />
        <h2 className="text-xl font-semibold">{label}</h2>
      </div>

      {/* URL Bar */}
      <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
        <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-sm text-muted-foreground break-all line-clamp-2 flex-1">{pageUrl}</span>
        <Button variant="ghost" size="icon" className="shrink-0" onClick={copyUrl}>
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add your {type} to showcase on your public page.
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add {label.slice(0, -1)}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold mb-1">No {type} yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-xs">
              Add your first {type === "services" ? "service" : "product"} to get started.
            </p>
            <Button size="sm" onClick={openAdd}>
              <Plus className="w-4 h-4 mr-1" /> Add {label.slice(0, -1)}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt={item.title} className="w-16 h-16 rounded-md object-cover shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      {item.price && <span className="text-sm font-medium text-primary">{item.price}</span>}
                    </div>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editItem ? "Edit" : "Add"} {label.slice(0, -1)}</DialogTitle>
            <DialogDescription>
              {editItem ? "Update the details below." : `Add a new ${type === "services" ? "service" : "product"}.`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={`${label.slice(0, -1)} name`} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={formDesc} onChange={(e) => setFormDesc(e.target.value)} placeholder="Brief description" rows={3} />
            </div>
            <div>
              <Label>Price</Label>
              <Input value={formPrice} onChange={(e) => setFormPrice(e.target.value)} placeholder="e.g. ₹999 or Free" />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={formImage} onChange={(e) => setFormImage(e.target.value)} placeholder="https://..." />
            </div>
            <Button className="w-full" disabled={!formTitle.trim() || saveMutation.isPending} onClick={handleSave}>
              {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editItem ? "Save Changes" : `Add ${label.slice(0, -1)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
