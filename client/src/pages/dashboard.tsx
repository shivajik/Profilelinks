import { useState, useEffect } from "react";
import { useLocation, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { TEMPLATES, getTemplate } from "@/lib/templates";
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
import { SOCIAL_PLATFORMS, getPlatform } from "@/lib/social-platforms";
import { SocialIcon } from "@/components/social-icon";
import type { Link, Social, Page, Block, BlockContent, BlockType } from "@shared/schema";
import { BLOCK_TYPES } from "@shared/schema";
import { BillingSection } from "@/components/billing-section";
import { PlanUsageBanner, canPerformAction, LimitReachedDialog } from "@/components/plan-usage-banner";
import { usePlanLimits, type PlanLimits } from "@/hooks/use-plan-limits";
import { MenuBuilder } from "@/components/menu-builder";
import { BusinessProfileSection } from "@/components/business-profile-section";

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

function FeatureLockedPanel({ feature, description }: { feature: string; description: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Shield className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{feature} — Locked</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
      <p className="text-sm text-muted-foreground mb-4">Upgrade your plan to unlock this feature.</p>
      <Button onClick={() => navigate("/pricing")}>View Plans</Button>
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
  const [activeSection, setActiveSection] = useState<string>("design");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [headerName, setHeaderName] = useState("");
  const [headerBio, setHeaderBio] = useState("");
  const [headerDirty, setHeaderDirty] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [addingPage, setAddingPage] = useState(false);
  const [managingPages, setManagingPages] = useState(false);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
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
    mutationFn: async (data: { displayName?: string | null; bio?: string | null; profileImage?: string | null; coverImage?: string | null }) => {
      await apiRequest("PATCH", "/api/auth/profile", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
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

  // Build profile URL based on team membership
  const teamSlug = teamData?.slug;
  const profileUrl = isTeamOwner && teamSlug
    ? `${window.location.origin}/${teamSlug}`
    : isTeamMember && teamSlug
      ? `${window.location.origin}/${teamSlug}/${user.username}`
      : `${window.location.origin}/${user.username}`;

  const isIndividual = !isTeamAccount;

  const sidebarItems = [
    { id: "design", label: "Design", icon: Palette, active: true },
    ...(isTeamAccount ? [{ id: "business-profile", label: "Business Profile", icon: Briefcase }] : []),
    ...(isTeamAccount && isRestaurant ? [{ id: "menu-setup", label: "Menu Setup", icon: UtensilsCrossed }] : []),
    { id: "settings", label: "Settings", icon: Settings },
    { id: "qrcodes", label: "QR Codes", icon: QrCode },
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
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <Sidebar>
          <SidebarContent>
            <div className="px-4 py-4">
              <span className="text-lg font-bold tracking-tight">
                <span className="text-primary">link</span>folio
              </span>
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
             <div className={`flex-1 overflow-y-auto border-r bg-background w-full ${activeSection === "design" ? "md:min-w-[300px] md:max-w-[420px]" : ""} ${activeSection === "menu-setup" ? "md:min-w-[300px] md:max-w-[420px]" : ""} ${["team-members", "team-templates", "contacts", "billing", "usage", "affiliate", "business-profile"].includes(activeSection) ? "md:max-w-none" : ""}`}>
              {activeSection === "billing" && <BillingSection />}
              {activeSection === "business-profile" && <BusinessProfileSection />}
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
                      <CardTitle className="text-base">Share Linkfolio</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Love using Linkfolio? Share it with your friends and help us grow! Copy the link below and send it to anyone who might find it useful.
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
                  <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-1.5 flex-1">
                    <Link2 className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground truncate" data-testid="text-profile-url">
                      {profileUrl}
                    </span>
                    <Button variant="ghost" size="icon" onClick={copyUrl} className="shrink-0 ml-auto" data-testid="button-copy-url">
                      {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </div>

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
                      <span className="text-sm font-medium">Profile Picture <span className="text-[10px] text-muted-foreground font-normal">(Max 10MB)</span></span>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          id="dash-avatar-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 10 * 1024 * 1024) {
                              toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
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
                                toast({ title: "Upload failed", description: errData.message || "Max 10MB", variant: "destructive" });
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
                      <span className="text-sm font-medium">Cover Image <span className="text-[10px] text-muted-foreground font-normal">(Max 10MB)</span></span>
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
                            if (file.size > 10 * 1024 * 1024) {
                              toast({ title: "File too large", description: "Maximum file size is 10MB. Please choose a smaller image.", variant: "destructive" });
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
                                toast({ title: "Upload failed", description: errData.message || "Please try a smaller image (max 10MB)", variant: "destructive" });
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
                      <Label htmlFor="header-bio" className="text-xs text-muted-foreground">Bio</Label>
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
                    {userSocials.map((social) => (
                      <SocialLinkRow
                        key={social.id}
                        social={social}
                        onUpdate={(url) => updateSocialMutation.mutate({ id: social.id, url })}
                        onDelete={() => deleteSocialMutation.mutate(social.id)}
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
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => {
                            const check = canPerformAction(planLimits, "addPage");
                            if (!check.allowed) { setLimitMessage(check.message || ""); setLimitDialogOpen(true); return; }
                            setAddingPage(true);
                          }} data-testid="button-add-new-page">
                            <Plus className="w-3.5 h-3.5" />
                            Add New Page +
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                        {sortedBlocks.map((block) => (
                          <InlineBlockCard
                            key={block.id}
                            block={block}
                            isEditing={editingBlockId === block.id}
                            onStartEdit={() => setEditingBlockId(block.id)}
                            onStopEdit={() => setEditingBlockId(null)}
                            onDelete={() => deleteBlockMutation.mutate(block.id)}
                            onToggle={(active) => toggleBlockMutation.mutate({ id: block.id, active })}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CategorySection>
              </div>
              )}
              {activeSection === "settings" && (
                <SettingsPanel user={user} profileUrl={profileUrl} onLogout={handleLogout} />
              )}
              {activeSection === "analytics" && (
                planLimits?.analyticsEnabled === false ? (
                  <FeatureLockedPanel feature="Analytics" description="Track profile views, link clicks, and visitor insights." />
                ) : (
                  <AnalyticsPanel username={user.username} />
                )
              )}
              {activeSection === "qrcodes" && (
                planLimits?.qrCodeEnabled === false ? (
                  <FeatureLockedPanel feature="QR Codes" description="Generate QR codes for your profile and share them anywhere." />
                ) : (
                  <QRCodePanel profileUrl={profileUrl} username={user.username} />
                )
              )}
              {activeSection === "team-members" && isTeamAccount && (
                <TeamMembersPanel teamId={user.teamId!} currentUserId={user.id} teamSlug={teamSlug} />
              )}
              {activeSection === "team-templates" && isTeamAccount && (
                <TeamTemplatesPanel teamId={user.teamId!} />
              )}
              {activeSection === "contacts" && isTeamAccount && (
                <ContactsPanel teamId={user.teamId!} userId={user.id} isTeamMember={!!isTeamMember} />
              )}
            </div>

            <div className={`${activeSection === "design" ? "hidden md:flex" : "hidden"} flex-1 bg-muted/30 items-center justify-center p-6`}>
              <div className="flex flex-col items-center gap-3">
              {isTeamAccount ? (
                  /* Team accounts (owner & member) see their actual public profile via iframe */
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewMode("mobile")}
                        className={`toggle-elevate ${previewMode === "mobile" ? "toggle-elevated" : ""}`}
                      >
                        <Smartphone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewMode("desktop")}
                        className={`toggle-elevate ${previewMode === "desktop" ? "toggle-elevated" : ""}`}
                      >
                        <Monitor className="w-4 h-4" />
                      </Button>
                    </div>
                    <div
                      className={`rounded-2xl overflow-hidden border shadow-lg bg-background ${
                        previewMode === "mobile" ? "w-[375px] h-[700px]" : "w-[900px] h-[700px]"
                      }`}
                    >
                      <iframe
                        src={`${isTeamOwner && teamSlug ? `/${teamSlug}` : isTeamMember && teamSlug ? `/${teamSlug}/${user.username}` : `/${user.username}`}?preview=1`}
                        className="w-full h-full border-0"
                        title="Profile Preview"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewMode("mobile")}
                        className={`toggle-elevate ${previewMode === "mobile" ? "toggle-elevated" : ""}`}
                        data-testid="button-preview-mobile"
                      >
                        <Smartphone className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPreviewMode("desktop")}
                        className={`toggle-elevate ${previewMode === "desktop" ? "toggle-elevated" : ""}`}
                        data-testid="button-preview-desktop"
                      >
                        <Monitor className="w-4 h-4" />
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
                    />
                  </>
                )}
              </div>
            </div>

            {/* Menu Preview Panel - only show if menu builder is enabled */}
            {planLimits?.menuBuilderEnabled && (
            <div className={`${activeSection === "menu-setup" ? "hidden md:flex" : "hidden"} flex-1 bg-muted/30 items-center justify-center p-6`}>
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewMode("mobile")}
                    className={`toggle-elevate ${previewMode === "mobile" ? "toggle-elevated" : ""}`}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setPreviewMode("desktop")}
                    className={`toggle-elevate ${previewMode === "desktop" ? "toggle-elevated" : ""}`}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!isTeamAccount) {
                        toast({ title: "Upgrade Required", description: "Copy menu link is available for team accounts.", variant: "destructive" });
                        return;
                      }
                      navigator.clipboard.writeText(`${window.location.origin}/${user.username}/menu`);
                      toast({ title: "Menu link copied!" });
                    }}
                    className={!isTeamAccount ? "opacity-50 cursor-not-allowed" : ""}
                    title={!isTeamAccount ? "Upgrade to Team to copy menu link" : "Copy menu link"}
                  >
                    {!isTeamAccount ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (!isTeamAccount) {
                        toast({ title: "Upgrade Required", description: "QR code is available for team accounts.", variant: "destructive" });
                        return;
                      }
                      window.open(`/${user.username}/menu`, "_blank");
                    }}
                    className={!isTeamAccount ? "opacity-50 cursor-not-allowed" : ""}
                    title={!isTeamAccount ? "Upgrade to Team to use QR code" : "Open menu in new tab"}
                  >
                    {!isTeamAccount ? (
                      <Lock className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ExternalLink className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <div className={`bg-background rounded-2xl shadow-lg overflow-hidden border ${previewMode === "mobile" ? "w-[375px]" : "w-full max-w-[800px]"}`} style={{ height: "70vh" }}>
                  <iframe
                    src={`/${user.username}/menu?embed=1`}
                    className="w-full h-full border-0"
                    title="Menu Preview"
                    key={`menu-preview-${previewMode}`}
                  />
                </div>
              </div>
            </div>
            )}

            <div className={`${activeSection === "design" ? "hidden lg:block" : "hidden"} w-[280px] border-l bg-background overflow-y-auto shrink-0`}>
              <DesignPanel
                currentTemplateId={user.template || "minimal"}
                onSelectTemplate={(id) => templateMutation.mutate(id)}
                saving={templateMutation.isPending}
                disabled={!!isTeamMember}
              />
            </div>
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
        onUpgrade={() => navigate("/pricing")}
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
}: {
  user: { id: string; username: string; email: string; displayName: string | null; bio: string | null; profileImage: string | null; template: string | null; accountType: string };
  profileUrl: string;
  onLogout: () => void;
}) {
  const { toast } = useToast();
  const [editUsername, setEditUsername] = useState(user.username);
  const [editName, setEditName] = useState(user.displayName || "");
  const [editBio, setEditBio] = useState(user.bio || "");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(user.template || "minimal");

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
    <div className="p-4 space-y-6 overflow-y-auto">
      <SectionHeader title="Settings" />

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <UserIcon className="w-4 h-4" />
          Profile
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-4 p-3 rounded-md border">
            <div className="relative group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                id="settings-avatar-upload"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 10 * 1024 * 1024) {
                    toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
                    return;
                  }
                  const formData = new FormData();
                  formData.append("file", file);
                  try {
                    const res = await fetch("/api/upload", { method: "POST", body: formData });
                    if (res.ok) {
                      const data = await res.json();
                      profileMutation.mutate({ profileImage: data.url });
                    } else {
                      toast({ title: "Upload failed", description: "Max 10MB", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Upload failed", variant: "destructive" });
                  }
                }}
                data-testid="input-settings-avatar-upload"
              />
              <label htmlFor="settings-avatar-upload" className="cursor-pointer block">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src={user.profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {(user.displayName || user.username).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="w-4 h-4 text-white" />
                </div>
              </label>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.displayName || user.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
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
              data-testid="input-settings-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="settings-bio" className="text-xs text-muted-foreground">Bio</Label>
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
              rows={3}
              data-testid="input-settings-bio"
            />
          </div>

          <div className="space-y-1.5">
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
                data-testid="input-settings-username"
              />
              {checkingUsername && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!checkingUsername && usernameAvailable === true && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              )}
              {!checkingUsername && usernameAvailable === false && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
              )}
            </div>
            {usernameAvailable === false && (
              <p className="text-xs text-destructive">Username is not available or invalid</p>
            )}
            {usernameAvailable === true && editUsername !== user.username && (
              <Button
                size="sm"
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
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Public URL
        </h3>
        <div className="flex items-center gap-3 p-3 rounded-md border">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate" data-testid="text-settings-url">{profileUrl}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.open(`/${user.username}`, "_blank")}
            data-testid="button-settings-visit"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Upgrade to Team - only show for individual users */}
      {user.accountType !== "team" && (
        <div>
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Upgrade to Team
          </h3>
          <div className="p-4 rounded-md border border-primary/20 bg-primary/5">
            <p className="text-sm text-foreground mb-2 font-medium">Want team features?</p>
            <p className="text-xs text-muted-foreground mb-3">
              Upgrade to a team account to unlock public menu links, QR codes, team member management, company branding, and shared templates.
            </p>
            <Button size="sm" onClick={() => window.location.href = "/pricing"}>
              View Team Plans
            </Button>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Palette className="w-4 h-4" />
          Theme
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setSelectedTemplate(t.id);
                profileMutation.mutate({ template: t.id });
              }}
              className={`relative rounded-md border-2 p-2 text-center transition-colors ${
                selectedTemplate === t.id ? "border-primary" : "border-border"
              }`}
              data-testid={`template-${t.id}`}
            >
              <div className={`w-full h-8 rounded-sm mb-1.5 ${t.bg}`} />
              <p className="text-xs font-medium">{t.name}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <KeyRound className="w-4 h-4" />
          Change Password
        </h3>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-xs text-muted-foreground">Current Password</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              data-testid="input-current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs text-muted-foreground">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new password"
              data-testid="input-new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs text-muted-foreground">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm new password"
              data-testid="input-confirm-password"
            />
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
          <Button
            onClick={() => {
              passwordMutation.mutate({ currentPassword, newPassword, confirmPassword });
            }}
            disabled={!currentPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || passwordMutation.isPending}
            className="w-full"
            data-testid="button-change-password"
          >
            {passwordMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change Password"}
          </Button>
        </div>
      </div>

      <div className="pt-2 space-y-3">
        <Button variant="outline" className="w-full gap-2" onClick={onLogout} data-testid="button-settings-logout">
          <LogOut className="w-4 h-4" />
          Sign Out
        </Button>
        <Button
          variant="outline"
          className="w-full gap-2 text-destructive border-destructive/30"
          onClick={() => setShowDeleteDialog(true)}
          data-testid="button-delete-account"
        >
          <AlertTriangle className="w-4 h-4" />
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

type QRStyle = "circle" | "square" | "stripe" | "full";

interface SavedQRCode {
  id: string;
  style: QRStyle;
  color: string;
  borderRadius: number;
  borderWidth: number;
  logoUrl: string | null;
}

function QRCodePanel({ profileUrl, username }: { profileUrl: string; username: string }) {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedQRCodes, setSavedQRCodes] = useState<SavedQRCode[]>(() => {
    try {
      const stored = localStorage.getItem(`qrcodes-${username}`);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const [qrStyle, setQrStyle] = useState<QRStyle>("circle");
  const [qrColor, setQrColor] = useState("#6C5CE7");
  const [borderRadius, setBorderRadius] = useState(0);
  const [borderWidth, setBorderWidth] = useState(2);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(`qrcodes-${username}`, JSON.stringify(savedQRCodes));
  }, [savedQRCodes, username]);

  const resetForm = () => {
    setQrStyle("circle");
    setQrColor("#6C5CE7");
    setBorderRadius(0);
    setBorderWidth(2);
    setLogoPreview(null);
    setEditingId(null);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const openEdit = (qr: SavedQRCode) => {
    setQrStyle(qr.style);
    setQrColor(qr.color);
    setBorderRadius(qr.borderRadius);
    setBorderWidth(qr.borderWidth);
    setLogoPreview(qr.logoUrl);
    setEditingId(qr.id);
    setShowCreateDialog(true);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = () => {
    if (editingId) {
      setSavedQRCodes((prev) =>
        prev.map((qr) =>
          qr.id === editingId
            ? { ...qr, style: qrStyle, color: qrColor, borderRadius, borderWidth, logoUrl: logoPreview }
            : qr
        )
      );
      toast({ title: "QR code updated!" });
    } else {
      const newQR: SavedQRCode = {
        id: Date.now().toString(),
        style: qrStyle,
        color: qrColor,
        borderRadius,
        borderWidth,
        logoUrl: logoPreview,
      };
      setSavedQRCodes((prev) => [...prev, newQR]);
      toast({ title: "QR code created!" });
    }
    setShowCreateDialog(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    setSavedQRCodes((prev) => prev.filter((qr) => qr.id !== id));
    toast({ title: "QR code deleted" });
  };

  const downloadQR = (elementId: string, filename: string) => {
    const svg = document.getElementById(elementId);
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = 1024;
      canvas.height = 1024;
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.drawImage(img, 0, 0, 1024, 1024);
      }
      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = filename;
      a.click();
      toast({ title: "QR code downloaded!" });
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
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

  const getContainerStyle = (qr: { style: QRStyle; borderRadius: number; borderWidth: number; color: string }) => {
    const style: React.CSSProperties = {
      overflow: "hidden",
      padding: "12px",
      background: "white",
    };
    switch (qr.style) {
      case "circle":
        style.borderRadius = "50%";
        style.border = `${qr.borderWidth}px solid ${qr.color}`;
        break;
      case "square":
        style.borderRadius = `${qr.borderRadius}px`;
        style.border = `${qr.borderWidth}px solid ${qr.color}`;
        break;
      case "stripe":
        style.borderRadius = `${qr.borderRadius}px`;
        style.borderTop = `${Math.max(qr.borderWidth, 3)}px solid ${qr.color}`;
        style.borderBottom = `${Math.max(qr.borderWidth, 3)}px solid ${qr.color}`;
        break;
      case "full":
        style.borderRadius = `${qr.borderRadius}px`;
        style.background = qr.color;
        style.padding = "16px";
        break;
    }
    return style;
  };

  const styleOptions: { value: QRStyle; label: string }[] = [
    { value: "circle", label: "Circle" },
    { value: "square", label: "Square" },
    { value: "stripe", label: "Stripe" },
    { value: "full", label: "Full" },
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

      {savedQRCodes.length === 0 && (
        <div className="text-center py-8">
          <QrCode className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No QR codes yet. Create your first one!</p>
        </div>
      )}

      <div className="space-y-4">
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
                    onClick={() => downloadQR(`qr-saved-${qr.id}`, `${username}-qrcode-${qr.id}.png`)}
                    data-testid={`button-download-qr-${qr.id}`}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="outline" onClick={() => handleDelete(qr.id)} data-testid={`button-delete-qr-${qr.id}`}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div style={getContainerStyle(qr)} className="shrink-0">
                <QRCodeSVG
                  id={`qr-saved-${qr.id}`}
                  {...getQRProps(qr)}
                  size={100}
                  data-testid={`display-qr-${qr.id}`}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle data-testid="text-create-qr-title">{editingId ? "Edit QR Code" : "Create QR Code"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Create a dynamic QR Code and track its usage over time.</p>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row gap-6 mt-4">
            <div className="flex-1 space-y-5">
              <div className="flex gap-1 rounded-md border p-1" data-testid="tabs-qr-style">
                {styleOptions.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setQrStyle(opt.value)}
                    className={`flex-1 text-sm py-1.5 px-2 rounded transition-colors ${
                      qrStyle === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover-elevate"
                    }`}
                    data-testid={`button-qr-style-${opt.value}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md border">
                <span className="text-sm flex-1">Color</span>
                <input
                  type="color"
                  value={qrColor}
                  onChange={(e) => setQrColor(e.target.value)}
                  className="w-8 h-8 rounded-full border-0 cursor-pointer"
                  style={{ padding: 0, background: "transparent" }}
                  data-testid="input-qr-color"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md border">
                <span className="text-sm shrink-0 w-28">Border Radius</span>
                <Slider
                  value={[borderRadius]}
                  onValueChange={(val) => setBorderRadius(val[0])}
                  min={0}
                  max={50}
                  step={1}
                  className="flex-1"
                  data-testid="slider-border-radius"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md border">
                <span className="text-sm shrink-0 w-28">Border Width</span>
                <Slider
                  value={[borderWidth]}
                  onValueChange={(val) => setBorderWidth(val[0])}
                  min={0}
                  max={10}
                  step={1}
                  className="flex-1"
                  data-testid="slider-border-width"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-md border">
                <span className="text-sm flex-1">Logo</span>
                <label className="cursor-pointer" data-testid="button-upload-logo">
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  <div className="w-9 h-9 rounded-md border flex items-center justify-center hover-elevate">
                    <Upload className="w-4 h-4 text-muted-foreground" />
                  </div>
                </label>
              </div>

              {logoPreview && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <img src={logoPreview} alt="Logo preview" className="w-6 h-6 rounded object-cover" />
                  <span>Logo added</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setLogoPreview(null)}
                    data-testid="button-remove-logo"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              <Button onClick={handleCreate} className="w-full" data-testid="button-save-qr">
                {editingId ? "Save Changes" : "Create"}
              </Button>
            </div>

            <div className="flex items-center justify-center sm:w-[200px]">
              <div
                style={getContainerStyle({ style: qrStyle, borderRadius, borderWidth, color: qrColor })}
                data-testid="preview-qr-container"
              >
                <QRCodeSVG
                  id="create-qr-preview"
                  {...getQRProps({ style: qrStyle, color: qrColor, logoUrl: logoPreview })}
                  size={160}
                  data-testid="preview-qr-code"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
          {TEMPLATES.map((t) => (
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
              <div className="w-5 h-5 rounded-full bg-white/20 mb-1.5" />
              <span className={`text-[10px] font-semibold ${t.textColor}`}>{t.name}</span>
              <div className="mt-1.5 space-y-1 w-full">
                <div className={`h-3 rounded-sm ${t.cardBg} w-full`} />
                <div className={`h-3 rounded-sm ${t.cardBg} w-full`} />
              </div>
            </button>
          ))}
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
}: {
  pages: Page[];
  currentPage: Page | null;
  template: (typeof TEMPLATES)[0];
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
              <div
                key={page.id}
                className={`px-3 py-1 text-[10px] cursor-default ${
                  isActive
                    ? `${template.cardTextColor} font-medium`
                    : `${template.textColor} opacity-50`
                }`}
              >
                {page.title}
              </div>
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
}) {
  const activeBlocks = blocks.filter((b) => b.active);
  const activeSocials = socials.filter((s) => s.url);

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
            linkfolio/{username}
          </span>
        </div>
        <div className={`min-h-[480px] ${template.bg} p-5`}>
          <div className="flex flex-col items-center text-center">
            {coverImage && (
              <div className="w-full h-16 rounded-md overflow-hidden mb-[-1.5rem] shadow-sm">
                <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
              </div>
            )}
            <Avatar className={`w-16 h-16 border-2 border-white/30 mb-3 ${coverImage ? "relative z-10" : ""}`}>
              <AvatarImage src={profileImage || undefined} />
              <AvatarFallback className="bg-white/20 text-lg" style={{ color: template.accent }}>
                {displayName ? displayName.charAt(0).toUpperCase() : "?"}
              </AvatarFallback>
            </Avatar>
            <p className={`font-bold text-sm ${template.textColor}`}>{displayName || "Your Name"}</p>
            {bio && (
              <p className={`text-[11px] mt-1 ${template.textColor} opacity-80 leading-relaxed max-w-[200px]`}>
                {bio.length > 100 ? bio.slice(0, 100) + "..." : bio}
              </p>
            )}

            {activeSocials.length > 0 && (
              <div className="flex items-center justify-center gap-2 mt-3 flex-wrap">
                {activeSocials.map((social) => (
                  <div key={social.id} className={`${template.textColor} opacity-70`}>
                    <SocialIcon platform={social.platform} className="w-3.5 h-3.5" />
                  </div>
                ))}
              </div>
            )}

            {pages.length > 1 && (
              <PreviewPageNav pages={pages} currentPage={currentPage} template={template} />
            )}

            <div className="w-full mt-5 space-y-2">
              {activeBlocks.length > 0 ? (
                activeBlocks.map((block) => (
                  <PreviewBlock key={block.id} block={block} template={template} />
                ))
              ) : (
                <>
                  <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center`}>
                    <span className={`text-xs font-medium ${template.cardTextColor}`}>Block 1</span>
                  </div>
                  <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center`}>
                    <span className={`text-xs font-medium ${template.cardTextColor}`}>Block 2</span>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6">
              <p className={`text-[10px] ${template.textColor} opacity-50`}>
                linkfolio
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewBlock({ block, template }: { block: Block; template: (typeof TEMPLATES)[0] }) {
  const content = block.content as BlockContent;
  switch (block.type) {
    case "url_button":
      return (
        <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center backdrop-blur-sm`}>
          <span className={`text-xs font-medium ${template.cardTextColor}`}>
            {content.title || "Untitled Link"}
          </span>
        </div>
      );
    case "email_button":
      return (
        <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center backdrop-blur-sm`}>
          <span className={`text-xs font-medium ${template.cardTextColor}`}>
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
        <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center backdrop-blur-sm`}>
          <span className={`text-xs font-medium ${template.cardTextColor}`}>
            {content.title || "Video"}
          </span>
        </div>
      );
    }
    case "audio":
      return (
        <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center backdrop-blur-sm`}>
          <span className={`text-xs font-medium ${template.cardTextColor}`}>
            {content.title || "Audio"}
          </span>
        </div>
      );
    case "image":
      if (content.imageUrl) {
        return (
          <div className="rounded-lg overflow-hidden">
            <img src={content.imageUrl} alt={content.title || ""} className="w-full h-auto" />
          </div>
        );
      }
      return (
        <div className={`${template.cardBg} rounded-lg py-4 px-4 text-center backdrop-blur-sm`}>
          <span className={`text-xs ${template.cardTextColor} opacity-60`}>Image</span>
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
}: {
  block: Block;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDelete: () => void;
  onToggle: (active: boolean) => void;
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
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
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
}: {
  social: Social;
  onUpdate: (url: string) => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState(social.url);
  const platform = getPlatform(social.platform);

  useEffect(() => {
    setUrl(social.url);
  }, [social.url]);

  return (
    <div className="flex items-center gap-2 border rounded-md px-3 py-2">
      <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onBlur={() => {
          if (url !== social.url) onUpdate(url);
        }}
        placeholder={platform?.placeholder || "Enter URL"}
        className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm"
        data-testid={`input-social-url-${social.id}`}
      />
      <SocialIcon platform={social.platform} className="w-5 h-5 text-muted-foreground shrink-0" />
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setUrl(social.url);
        }}
        data-testid={`button-edit-social-${social.id}`}
      >
        <Pencil className="w-3.5 h-3.5" />
      </Button>
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
  const [editDisplayName, setEditDisplayName] = useState(member?.user?.displayName || "");
  const [editRole, setEditRole] = useState(member?.role || "member");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (member) {
      setEditJobTitle(member.jobTitle || "");
      setEditDisplayName(member.user?.displayName || "");
      setEditRole(member.role || "member");
    }
  }, [member]);

  const updateMemberMut = useMutation({
    mutationFn: async ({ memberId, jobTitle }: { memberId: string; jobTitle: string }) => {
      await apiRequest("PATCH", `/api/teams/${teamId}/members/${memberId}`, { jobTitle: jobTitle || null });
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

  // For non-admin self-edit: only name and profile image
  const isMemberSelfEdit = isSelf && !isAdmin;

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md" aria-describedby="edit-member-desc">
        <DialogHeader>
          <DialogTitle>Edit Member</DialogTitle>
          <DialogDescription id="edit-member-desc">Update team member details.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative group">
              {isMemberSelfEdit ? (
                <>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    id="edit-member-avatar"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 10 * 1024 * 1024) {
                        toast({ title: "File too large", description: "Maximum file size is 10MB.", variant: "destructive" });
                        return;
                      }
                      setUploadingImage(true);
                      try {
                        const fd = new FormData();
                        fd.append("file", file);
                        const res = await fetch("/api/upload", { method: "POST", body: fd, credentials: "include" });
                        if (res.ok) {
                          const { url } = await res.json();
                          await apiRequest("PATCH", `/api/teams/${teamId}/members/${member.id}/profile`, { profileImage: url });
                          queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
                          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                          toast({ title: "Profile image updated!" });
                        }
                      } catch {} finally { setUploadingImage(false); }
                    }}
                  />
                  <label htmlFor="edit-member-avatar" className="cursor-pointer block">
                    <Avatar className="w-14 h-14 border border-border">
                      <AvatarImage src={member.user?.profileImage || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-sm">
                        {(member.user?.displayName || member.user?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingImage ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                    </div>
                  </label>
                </>
              ) : (
                <Avatar className="w-10 h-10 border border-border">
                  <AvatarImage src={member.businessProfileImage || member.user?.profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-sm">
                    {(member.businessName || member.user?.displayName || member.user?.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            <div>
              <div className="text-sm font-medium">{member.businessName || member.user?.displayName || member.user?.username || "Unknown"}</div>
              <div className="text-xs text-muted-foreground">{member.user?.email || ""}</div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-display-name">Display Name</Label>
            <Input id="edit-display-name" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} placeholder="Full Name" />
          </div>
          {!isMemberSelfEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-job-title">Job Title</Label>
              <Input id="edit-job-title" value={editJobTitle} onChange={(e) => setEditJobTitle(e.target.value)} placeholder="e.g. Software Engineer" />
            </div>
          )}
          {isAdmin && member.role !== "owner" && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={setEditRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          {member.user?.username && (
            <div className="space-y-1.5">
              <Label>Profile URL</Label>
              <div className="flex items-center gap-2">
                <Input readOnly value={`${window.location.origin}/${member.user.username}`} className="text-xs" />
                <Button variant="outline" size="icon" onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/${member.user.username}`);
                  toast({ title: "Profile URL copied" });
                }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              onClick={async () => {
                await updateMemberMut.mutateAsync({ memberId: member.id, jobTitle: editJobTitle });
                if (editRole !== member.role && isAdmin && member.role !== "owner") {
                  await updateRoleMut.mutateAsync({ memberId: member.id, role: editRole });
                }
                if (editDisplayName !== (member.user?.displayName || "")) {
                  try {
                    await apiRequest("PATCH", `/api/teams/${teamId}/members/${member.id}/profile`, { displayName: editDisplayName });
                    queryClient.invalidateQueries({ queryKey: ["/api/teams", teamId, "members"] });
                  } catch {}
                }
                onClose();
                toast({ title: "Member updated" });
              }}
              disabled={updateMemberMut.isPending}
            >
              {updateMemberMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
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
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createJobTitle, setCreateJobTitle] = useState("");
  const [createRole, setCreateRole] = useState("member");
  const [createTemplateId, setCreateTemplateId] = useState<string>("");
  const [removeConfirmMember, setRemoveConfirmMember] = useState<any>(null);
  const [editMember, setEditMember] = useState<any>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; username: string } | null>(null);
  const [limitDialogOpen, setLimitDialogOpen] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"members" | "invitations">("members");

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
    mutationFn: async (data: { displayName: string; email: string; jobTitle?: string; memberRole: string }) => {
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
          <div className="flex items-center gap-2">
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
                    <Avatar className="w-8 h-8 border border-border">
                      <AvatarImage src={member.businessProfileImage || member.user?.profileImage || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {(member.businessName || member.user?.displayName || member.user?.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="text-sm font-medium" data-testid={`text-member-name-${member.id}`}>
                        {member.businessName || member.user?.displayName || member.user?.username || "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground" data-testid={`text-member-email-${member.id}`}>
                        {member.user?.email || ""}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm" data-testid={`text-member-jobtitle-${member.id}`}>
                    {member.jobTitle || "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" data-testid={`badge-member-role-${member.id}`}>
                    {member.role ? member.role.charAt(0).toUpperCase() + member.role.slice(1) : "Member"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={member.status === "activated" ? "secondary" : member.status === "deactivated" ? "destructive" : "default"}
                    className={member.status === "activated" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate" : member.status === "deactivated" ? "" : ""}
                    data-testid={`badge-member-status-${member.id}`}
                  >
                    {member.status === "activated" ? "Active" : member.status === "deactivated" ? "Deactivated" : "Invited"}
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
              <Button
                className="w-full"
                disabled={!inviteEmail || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate({ emails: [inviteEmail], role: inviteRole })}
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
            <div className="space-y-1.5">
              <Label htmlFor="create-name">Full Name</Label>
              <Input
                id="create-name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="John Doe"
                data-testid="input-create-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="john@company.com"
                data-testid="input-create-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-jobtitle">Job Title</Label>
              <Input
                id="create-jobtitle"
                value={createJobTitle}
                onChange={(e) => setCreateJobTitle(e.target.value)}
                placeholder="Software Engineer"
                data-testid="input-create-jobtitle"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-role">Role</Label>
              <Select value={createRole} onValueChange={setCreateRole}>
                <SelectTrigger data-testid="select-create-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {templates.length > 1 && (
              <div className="space-y-1.5">
                <Label htmlFor="create-template">Assign Template</Label>
                <Select value={createTemplateId || (defaultTemplate?.id ?? "")} onValueChange={setCreateTemplateId}>
                  <SelectTrigger data-testid="select-create-template">
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
                <p className="text-xs text-muted-foreground">Choose which business card template to assign to this member.</p>
              </div>
            )}
            <Button
              className="w-full"
              disabled={!createName || !createEmail || createMemberMutation.isPending}
              onClick={() => createMemberMutation.mutate({ displayName: createName, email: createEmail, jobTitle: createJobTitle || undefined, memberRole: createRole })}
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
                The team member can log in at{" "}
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

      <LimitReachedDialog
        open={limitDialogOpen}
        onOpenChange={setLimitDialogOpen}
        message={limitMessage}
        onUpgrade={() => navigate("/pricing")}
      />
    </div>
  );
}

function MemberCardPreview({ member, templateData, themeColor }: { member: any; templateData: any; themeColor: string }) {
  const memberName = member.businessName || member.user?.displayName || member.user?.username || "Team Member";
  const memberEmail = member.user?.email || "";
  const memberJobTitle = member.jobTitle || "";
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
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-full bg-muted border-4 border-card flex items-center justify-center overflow-hidden">
              {member.user?.profileImage ? (
                <img src={member.user.profileImage} alt={memberName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-lg font-bold text-muted-foreground">{memberName.charAt(0).toUpperCase()}</span>
              )}
            </div>
            {templateData.companyLogo && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full border-2 border-card bg-white shadow-sm flex items-center justify-center overflow-hidden" data-testid="preview-member-logo-badge">
                <img src={templateData.companyLogo} alt="Company" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
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
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB. Please choose a smaller image.", variant: "destructive" });
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
        toast({ title: "Upload failed", description: errData.message || "Max 10MB", variant: "destructive" });
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
    }
  }, [selectedTemplate?.id, selectedTemplate?.name, selectedTemplate?.description, tData.companyName, tData.companyPhone, tData.companyEmail, tData.companyWebsite, tData.companyAddress, tData.companyContact, JSON.stringify(tData.companySocials)]);

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
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={social.platform}
                          onValueChange={(val) => {
                            const updated = [...localSocials];
                            updated[idx] = { ...updated[idx], platform: val };
                            setLocalSocials(updated);
                            markDirty();
                          }}
                        >
                          <SelectTrigger className="w-[120px]">
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

              <Card>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Branding</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Cover Image <span className="text-[10px]">(Max 10MB)</span></Label>
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
                      <Label className="text-xs text-muted-foreground">Company Logo <span className="text-[10px]">(Max 10MB)</span></Label>
                      <div className="flex items-center gap-3">
                        <div className="relative w-16 h-16 rounded-full border bg-muted/30 overflow-hidden group shrink-0">
                          {uploadingField === "companyLogo" ? (
                            <div className="flex items-center justify-center w-full h-full">
                              <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                          ) : tData.companyLogo ? (
                            <>
                              <img src={tData.companyLogo} alt="Logo" className="w-full h-full object-cover" />
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
            {data.companyLogo ? (
              <img src={data.companyLogo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-6 h-6 text-muted-foreground/50" />
            )}
          </div>
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

function ContactsPanel({ teamId, userId, isTeamMember = false }: { teamId: string; userId: string; isTeamMember?: boolean }) {
  const { toast } = useToast();
  const [contactType, setContactType] = useState<"company" | "personal">("company");
  const [searchQuery, setSearchQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      await apiRequest("POST", "/api/contacts", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
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
        <Button variant="default" size="sm" onClick={() => setCreateOpen(true)} data-testid="button-create-contact">
          <Plus className="w-4 h-4 mr-1" />
          Create new contact
        </Button>
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
              <Label htmlFor="contact-name">Name</Label>
              <Input
                id="contact-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Contact name"
                data-testid="input-contact-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
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
              <Label htmlFor="contact-phone">Phone</Label>
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
              <Label htmlFor="contact-jobtitle">Job Title</Label>
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
              disabled={!newName || createMutation.isPending}
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
    </div>
  );
}
