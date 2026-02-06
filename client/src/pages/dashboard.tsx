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
import { Card, CardContent } from "@/components/ui/card";
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
  MessageSquare,
  AtSign,
  FileText,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "@/components/ui/sidebar";
import { SOCIAL_PLATFORMS, getPlatform } from "@/lib/social-platforms";
import { SocialIcon } from "@/components/social-icon";
import type { Link, Social } from "@shared/schema";

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [addingSocial, setAddingSocial] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("design");
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [headerName, setHeaderName] = useState("");
  const [headerBio, setHeaderBio] = useState("");
  const [headerDirty, setHeaderDirty] = useState(false);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    page: true,
    header: true,
    socials: true,
    blocks: true,
  });

  const { data: links = [], isLoading: linksLoading } = useQuery<Link[]>({
    queryKey: ["/api/links"],
    enabled: !!user,
  });

  const { data: userSocials = [] } = useQuery<Social[]>({
    queryKey: ["/api/socials"],
    enabled: !!user,
  });

  useEffect(() => {
    if (user) {
      setHeaderName(user.displayName || "");
      setHeaderBio(user.bio || "");
    }
  }, [user]);

  const profileMutation = useMutation({
    mutationFn: async (data: { displayName?: string | null; bio?: string | null; profileImage?: string | null }) => {
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
      toast({ title: "Social removed!" });
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      toast({ title: "Link deleted" });
    },
  });

  const toggleLinkMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      await apiRequest("PATCH", `/api/links/${id}`, { active });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (linkIds: string[]) => {
      await apiRequest("POST", "/api/links/reorder", { linkIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
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

  if (!user.onboardingCompleted) {
    return <Redirect to="/onboarding" />;
  }

  const profileUrl = `${window.location.origin}/${user.username}`;
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

  const moveLink = (index: number, direction: "up" | "down") => {
    const sorted = [...links].sort((a, b) => a.position - b.position);
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= sorted.length) return;
    const newOrder = [...sorted];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    reorderMutation.mutate(newOrder.map((l) => l.id));
  };

  const sortedLinks = [...links].sort((a, b) => a.position - b.position);

  const toggleCategory = (key: string) => {
    setOpenCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sidebarItems = [
    { id: "design", label: "Design", icon: Palette, active: true },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "analytics", label: "Analytics", icon: BarChart3 },
    { id: "qrcodes", label: "QR Codes", icon: QrCode },
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
            <div className="flex-1 overflow-y-auto border-r bg-background min-w-[300px] max-w-[420px]">
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
                  id="page"
                  label="Page:"
                  sublabel="Home"
                  icon={<FileText className="w-4 h-4 text-muted-foreground" />}
                  open={openCategories.page}
                  onToggle={() => toggleCategory("page")}
                >
                  <div className="px-4 pb-3 pt-1">
                    <p className="text-sm text-muted-foreground">Your main profile page configuration.</p>
                  </div>
                </CategorySection>

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
                      <span className="text-sm font-medium">Profile Picture</span>
                      <div className="relative group">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          className="hidden"
                          id="dash-avatar-upload"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/upload", { method: "POST", body: formData });
                              const data = await res.json();
                              if (res.ok) {
                                await apiRequest("PATCH", "/api/auth/profile", { profileImage: data.url });
                                queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                                toast({ title: "Profile picture updated!" });
                              }
                            } catch {}
                          }}
                          data-testid="input-header-avatar-upload"
                        />
                        <label htmlFor="dash-avatar-upload" className="cursor-pointer block">
                          <Avatar className="w-12 h-12 border-2 border-border">
                            <AvatarImage src={user.profileImage || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {(user.displayName || user.username).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Camera className="w-3.5 h-3.5 text-white" />
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="header-name" className="text-xs text-muted-foreground">Name</Label>
                      <Input
                        id="header-name"
                        value={headerName}
                        onChange={(e) => { setHeaderName(e.target.value); setHeaderDirty(true); }}
                        onBlur={() => {
                          if (headerDirty && headerName !== (user.displayName || "")) {
                            profileMutation.mutate({ displayName: headerName || null });
                          }
                        }}
                        placeholder="Your name"
                        data-testid="input-header-name"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="header-bio" className="text-xs text-muted-foreground">Bio</Label>
                      <Textarea
                        id="header-bio"
                        value={headerBio}
                        onChange={(e) => { setHeaderBio(e.target.value); setHeaderDirty(true); }}
                        onBlur={() => {
                          if (headerDirty && headerBio !== (user.bio || "")) {
                            profileMutation.mutate({ bio: headerBio || null });
                          }
                        }}
                        placeholder="Tell the world about yourself..."
                        maxLength={500}
                        rows={3}
                        data-testid="input-header-bio"
                      />
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
                        onClick={() => setAddingSocial(true)}
                        data-testid="button-add-social"
                      >
                        Add Social
                        <Link2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CategorySection>

                <CategorySection
                  id="blocks"
                  label="Blocks"
                  icon={<HelpCircle className="w-4 h-4 text-muted-foreground" />}
                  open={openCategories.blocks}
                  onToggle={() => toggleCategory("blocks")}
                  action={
                    <Button size="sm" onClick={() => setAddingLink(true)} data-testid="button-add-link">
                      New Block +
                    </Button>
                  }
                >
                  <div className="px-4 pb-3 pt-1">
                    {linksLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : sortedLinks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Link2 className="w-6 h-6 text-primary" />
                        </div>
                        <h3 className="font-semibold mb-1">No blocks yet</h3>
                        <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                          Add your first link block to start building your profile page.
                        </p>
                        <Button size="sm" onClick={() => setAddingLink(true)} data-testid="button-add-first-link">
                          <Plus className="w-4 h-4" />
                          Add your first link
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {sortedLinks.map((link) => (
                          <InlineLinkBlock
                            key={link.id}
                            link={link}
                            isEditing={editingLinkId === link.id}
                            onStartEdit={() => setEditingLinkId(link.id)}
                            onStopEdit={() => setEditingLinkId(null)}
                            onDelete={() => deleteLinkMutation.mutate(link.id)}
                            onCopy={() => {
                              navigator.clipboard.writeText(link.url);
                              toast({ title: "URL copied!" });
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CategorySection>
              </div>
            </div>

            <div className="hidden md:flex flex-1 bg-muted/30 items-center justify-center p-6">
              <div className="flex flex-col items-center gap-3">
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
                  displayName={user.displayName || user.username}
                  bio={user.bio || ""}
                  profileImage={user.profileImage || ""}
                  username={user.username}
                  links={sortedLinks}
                  socials={userSocials}
                  mode={previewMode}
                />
              </div>
            </div>

            <div className="hidden lg:block w-[280px] border-l bg-background overflow-y-auto shrink-0">
              <DesignPanel
                currentTemplateId={user.template || "minimal"}
                onSelectTemplate={(id) => templateMutation.mutate(id)}
                saving={templateMutation.isPending}
              />
            </div>
          </div>
        </div>
      </div>

      <AddLinkDialog open={addingLink} onClose={() => setAddingLink(false)} />
      <AddSocialDialog
        open={addingSocial}
        onClose={() => setAddingSocial(false)}
        onSelect={(platform) => {
          const p = getPlatform(platform);
          addSocialMutation.mutate({ platform, url: "" });
          setAddingSocial(false);
        }}
        existingPlatforms={userSocials.map((s) => s.platform)}
      />
    </SidebarProvider>
  );
}

function DesignPanel({
  currentTemplateId,
  onSelectTemplate,
  saving,
}: {
  currentTemplateId: string;
  onSelectTemplate: (id: string) => void;
  saving: boolean;
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
              disabled={saving}
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

function PhonePreview({
  template,
  displayName,
  bio,
  profileImage,
  username,
  links,
  socials,
  mode,
}: {
  template: (typeof TEMPLATES)[0];
  displayName: string;
  bio: string;
  profileImage: string;
  username: string;
  links: Link[];
  socials: Social[];
  mode: "mobile" | "desktop";
}) {
  const activeLinks = links.filter((l) => l.active);
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
            <Avatar className="w-16 h-16 border-2 border-white/30 mb-3">
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

            <div className="w-full mt-5 space-y-2">
              {activeLinks.length > 0 ? (
                activeLinks.map((link) => (
                  <div
                    key={link.id}
                    className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center backdrop-blur-sm`}
                  >
                    <span className={`text-xs font-medium ${template.cardTextColor}`}>
                      {link.title}
                    </span>
                  </div>
                ))
              ) : (
                <>
                  <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center`}>
                    <span className={`text-xs font-medium ${template.cardTextColor}`}>Link 1</span>
                  </div>
                  <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center`}>
                    <span className={`text-xs font-medium ${template.cardTextColor}`}>Link 2</span>
                  </div>
                  <div className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center`}>
                    <span className={`text-xs font-medium ${template.cardTextColor}`}>Link 3</span>
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

function AddLinkDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/links", { title, url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      setTitle("");
      setUrl("");
      onClose();
      toast({ title: "Link added!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to add link", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Link</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="add-title">Title</Label>
            <Input
              id="add-title"
              placeholder="My Website"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="input-add-link-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="add-url">URL</Label>
            <Input
              id="add-url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              type="url"
              data-testid="input-add-link-url"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-confirm-add-link">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add Link
            </Button>
          </div>
        </form>
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

function InlineLinkBlock({
  link,
  isEditing,
  onStartEdit,
  onStopEdit,
  onDelete,
  onCopy,
}: {
  link: Link;
  isEditing: boolean;
  onStartEdit: () => void;
  onStopEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
}) {
  const [title, setTitle] = useState(link.title);
  const [url, setUrl] = useState(link.url);
  const { toast } = useToast();

  useEffect(() => {
    setTitle(link.title);
    setUrl(link.url);
  }, [link.title, link.url]);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/links/${link.id}`, { title, url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      onStopEdit();
      toast({ title: "Link updated!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    if (title !== link.title || url !== link.url) {
      mutation.mutate();
    } else {
      onStopEdit();
    }
  };

  const handleCancel = () => {
    setTitle(link.title);
    setUrl(link.url);
    onStopEdit();
  };

  return (
    <Card className={`overflow-hidden transition-opacity ${!link.active ? "opacity-50" : ""}`}>
      <CardContent className="p-0">
        <div className="flex items-center gap-0">
          <div className={`w-1 self-stretch shrink-0 ${!link.active ? "bg-muted-foreground/20" : "bg-primary"}`} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 py-2.5 px-3">
              <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0 cursor-grab" />
              <div className="flex-1 min-w-0">
                <Button
                  variant="ghost"
                  className="p-0 h-auto font-medium text-sm text-primary truncate justify-start"
                  onClick={onStartEdit}
                  data-testid={`text-link-title-${link.id}`}
                >
                  {link.title}
                </Button>
                <p className="text-xs text-muted-foreground" data-testid={`text-link-type-${link.id}`}>
                  URL Button
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <Button variant="ghost" size="icon" onClick={onCopy} data-testid={`button-copy-link-${link.id}`}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onDelete} data-testid={`button-delete-link-${link.id}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={isEditing ? onStopEdit : onStartEdit} data-testid={`button-edit-link-${link.id}`}>
                  <Settings className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
            {isEditing && (
              <div className="border-t px-3 py-3 space-y-3" data-testid={`inline-edit-${link.id}`}>
                <div className="space-y-1.5">
                  <Label htmlFor={`edit-title-${link.id}`} className="text-xs">Title</Label>
                  <Input
                    id={`edit-title-${link.id}`}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Link title"
                    data-testid={`input-edit-link-title-${link.id}`}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`edit-url-${link.id}`} className="text-xs">URL</Label>
                  <Input
                    id={`edit-url-${link.id}`}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                    type="url"
                    data-testid={`input-edit-link-url-${link.id}`}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel} data-testid={`button-cancel-edit-${link.id}`}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={mutation.isPending} data-testid={`button-save-edit-${link.id}`}>
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
