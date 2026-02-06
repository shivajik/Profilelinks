import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  ExternalLink,
  LogOut,
  Copy,
  Check,
  Loader2,
  Eye,
  Link2,
  User as UserIcon,
  Camera,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Link } from "@shared/schema";

export default function Dashboard() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [editingLink, setEditingLink] = useState<Link | null>(null);
  const [addingLink, setAddingLink] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: links = [], isLoading: linksLoading } = useQuery<Link[]>({
    queryKey: ["/api/links"],
    enabled: !!user,
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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 px-6 py-3">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">link</span>folio
          </span>
          <div className="flex items-center gap-2">
            <a href={`/${user.username}`} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" data-testid="button-preview">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
            </a>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        <section>
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-16 h-16 border-2 border-border">
              <AvatarImage src={user.profileImage || undefined} alt={user.displayName || user.username} />
              <AvatarFallback className="text-lg bg-primary/10 text-primary">
                {(user.displayName || user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold truncate" data-testid="text-display-name">
                {user.displayName || user.username}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm text-muted-foreground truncate" data-testid="text-profile-url">
                  {profileUrl}
                </code>
                <button onClick={copyUrl} className="text-muted-foreground shrink-0" data-testid="button-copy-url">
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)} data-testid="button-edit-profile">
              <UserIcon className="w-4 h-4" />
              Edit
            </Button>
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Your Links
            </h2>
            <Button size="sm" onClick={() => setAddingLink(true)} data-testid="button-add-link">
              <Plus className="w-4 h-4" />
              Add Link
            </Button>
          </div>

          {linksLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : sortedLinks.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Link2 className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">No links yet</h3>
                <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                  Add your first link to start building your profile page.
                </p>
                <Button size="sm" onClick={() => setAddingLink(true)} data-testid="button-add-first-link">
                  <Plus className="w-4 h-4" />
                  Add your first link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sortedLinks.map((link, index) => (
                <Card key={link.id} className={`transition-opacity ${!link.active ? "opacity-50" : ""}`}>
                  <CardContent className="flex items-center gap-3 py-3 px-4">
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        onClick={() => moveLink(index, "up")}
                        disabled={index === 0}
                        className="text-muted-foreground disabled:opacity-30 p-0.5"
                        data-testid={`button-move-up-${link.id}`}
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" data-testid={`text-link-title-${link.id}`}>
                        {link.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate" data-testid={`text-link-url-${link.id}`}>
                        {link.url}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        checked={link.active}
                        onCheckedChange={(checked) => toggleLinkMutation.mutate({ id: link.id, active: checked })}
                        data-testid={`switch-link-active-${link.id}`}
                      />
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" data-testid={`button-open-link-${link.id}`}>
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => setEditingLink(link)} data-testid={`button-edit-link-${link.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteLinkMutation.mutate(link.id)}
                        data-testid={`button-delete-link-${link.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <AddLinkDialog open={addingLink} onClose={() => setAddingLink(false)} />
      <EditLinkDialog link={editingLink} onClose={() => setEditingLink(null)} />
      <EditProfileDialog open={editingProfile} onClose={() => setEditingProfile(false)} user={user} />
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

function EditLinkDialog({ link, onClose }: { link: Link | null; onClose: () => void }) {
  const [title, setTitle] = useState(link?.title || "");
  const [url, setUrl] = useState(link?.url || "");
  const { toast } = useToast();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!link) return;
      await apiRequest("PATCH", `/api/links/${link.id}`, { title, url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/links"] });
      onClose();
      toast({ title: "Link updated!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" });
    },
  });

  if (!link) return null;

  return (
    <Dialog open={!!link} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Link</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              data-testid="input-edit-link-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-url">URL</Label>
            <Input
              id="edit-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              type="url"
              data-testid="input-edit-link-url"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} data-testid="button-confirm-edit-link">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileDialog({ open, onClose, user }: { open: boolean; onClose: () => void; user: any }) {
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Upload failed");
      }
      const data = await res.json();
      setProfileImage(data.url);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", "/api/auth/profile", {
        displayName: displayName || null,
        bio: bio || null,
        profileImage: profileImage || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      onClose();
      toast({ title: "Profile updated!" });
    },
    onError: (e: any) => {
      toast({ title: "Failed to update profile", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="flex items-center gap-4">
            <div className="relative group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                id="profile-avatar-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                data-testid="input-profile-image-file"
              />
              <label htmlFor="profile-avatar-upload" className="cursor-pointer block" data-testid="button-profile-upload-avatar">
                <Avatar className="w-16 h-16 border-2 border-border">
                  <AvatarImage src={profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg">
                    {(displayName || user?.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4 text-white" />
                  )}
                </div>
              </label>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Profile Picture</p>
              <p className="text-xs text-muted-foreground">Click avatar to upload</p>
              {profileImage && (
                <button
                  type="button"
                  onClick={() => setProfileImage("")}
                  className="text-xs text-destructive mt-1 flex items-center gap-1"
                  data-testid="button-profile-remove-avatar"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prof-name">Display Name</Label>
            <Input
              id="prof-name"
              placeholder="Your Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              data-testid="input-profile-display-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="prof-bio">Bio</Label>
            <Textarea
              id="prof-bio"
              placeholder="Tell the world about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={500}
              rows={3}
              data-testid="input-profile-bio"
            />
            <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || uploading} data-testid="button-save-profile">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
