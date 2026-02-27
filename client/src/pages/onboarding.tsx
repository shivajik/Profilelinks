import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { TEMPLATES } from "@/lib/templates";
import { TEAM_SIZES, BUSINESS_TYPES } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Check, ArrowRight, Loader2, X, GripVertical, Camera, Upload, User, Users, Building2 } from "lucide-react";
import {
  SiInstagram,
  SiX,
  SiTiktok,
  SiFacebook,
  SiYoutube,
  SiSpotify,
  SiLinkedin,
  SiGithub,
} from "react-icons/si";
import { Globe, Mail, Phone } from "lucide-react";

const SOCIAL_PLATFORMS = [
  { id: "email", label: "Email", icon: Mail, prefix: "mailto:" },
  { id: "phone", label: "Phone", icon: Phone, prefix: "tel:" },
  { id: "website", label: "Website", icon: Globe, prefix: "https://" },
  { id: "instagram", label: "Instagram", icon: SiInstagram, prefix: "https://instagram.com/" },
  { id: "twitter", label: "X (Twitter)", icon: SiX, prefix: "https://x.com/" },
  { id: "tiktok", label: "TikTok", icon: SiTiktok, prefix: "https://tiktok.com/@" },
  { id: "facebook", label: "Facebook", icon: SiFacebook, prefix: "https://facebook.com/" },
  { id: "youtube", label: "Youtube", icon: SiYoutube, prefix: "https://youtube.com/@" },
  { id: "spotify", label: "Spotify", icon: SiSpotify, prefix: "https://open.spotify.com/" },
  { id: "linkedin", label: "LinkedIn", icon: SiLinkedin, prefix: "https://linkedin.com/in/" },
  { id: "github", label: "GitHub", icon: SiGithub, prefix: "https://github.com/" },
];

type SocialEntry = { platformId: string; url: string };

export default function Onboarding() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(0);
  const [accountType, setAccountType] = useState<"personal" | "team">("personal");
  const [selectedTemplate, setSelectedTemplate] = useState("minimal");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [selectedSocials, setSelectedSocials] = useState<string[]>([]);
  const [socialEntries, setSocialEntries] = useState<SocialEntry[]>([]);
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [companyLogo, setCompanyLogo] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [customBusinessType, setCustomBusinessType] = useState("");
  const [inviteEmails, setInviteEmails] = useState<string[]>([]);

  if (!user) {
    return <Redirect to="/auth" />;
  }

  // Team members skip onboarding entirely — they inherit company details
  if ((user as any).teamId && (user as any).accountType === "team") {
    return <Redirect to="/dashboard" />;
  }

  const totalSteps = accountType === "team" ? 6 : 5;
  const lastStep = totalSteps - 1;

  const toggleSocial = (platformId: string) => {
    if (selectedSocials.includes(platformId)) {
      setSelectedSocials(selectedSocials.filter((s) => s !== platformId));
      setSocialEntries(socialEntries.filter((e) => e.platformId !== platformId));
    } else {
      setSelectedSocials([...selectedSocials, platformId]);
      setSocialEntries([...socialEntries, { platformId, url: "" }]);
    }
  };

  const updateSocialUrl = (platformId: string, url: string) => {
    setSocialEntries(socialEntries.map((e) => (e.platformId === platformId ? { ...e, url } : e)));
  };

  const removeSocialEntry = (platformId: string) => {
    setSelectedSocials(selectedSocials.filter((s) => s !== platformId));
    setSocialEntries(socialEntries.filter((e) => e.platformId !== platformId));
  };

  const finishOnboarding = async () => {
    setSaving(true);
    try {
      await apiRequest("PATCH", "/api/auth/profile", {
        displayName: displayName || null,
        bio: bio || null,
        profileImage: profileImage || null,
        username,
        template: selectedTemplate,
        onboardingCompleted: true,
        accountType,
      });

      if (accountType === "team") {
        const finalBusinessType = businessType === "Other" ? customBusinessType : businessType;
        const teamRes = await apiRequest("POST", "/api/teams", {
          name: companyName,
          size: companySize || undefined,
          websiteUrl: companyUrl || undefined,
          logoUrl: companyLogo || undefined,
          businessType: finalBusinessType || undefined,
        });
        const teamData = await teamRes.json();

        if (inviteEmails.length > 0) {
          await apiRequest("POST", `/api/teams/${teamData.id}/invites`, {
            emails: inviteEmails,
          });
        }
      } else {
        for (const entry of socialEntries) {
          if (!entry.url.trim()) continue;
          const platform = SOCIAL_PLATFORMS.find((p) => p.id === entry.platformId);
          if (!platform) continue;
          const fullUrl = entry.url.startsWith("http") || entry.url.startsWith("mailto:") || entry.url.startsWith("tel:")
            ? entry.url
            : platform.prefix + entry.url;
          await apiRequest("POST", "/api/socials", {
            platform: entry.platformId,
            url: fullUrl,
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/socials"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      await queryClient.refetchQueries({ queryKey: ["/api/auth/me"] });
      navigate("/dashboard");
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const currentTemplate = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];

  const canProceed = () => {
    if (step === lastStep && username.length < 3) return false;
    if (accountType === "team" && step === 2 && !companyName.trim()) return false;
    if (accountType === "team" && step === 2 && companyUrl && !/^https?:\/\/.+\..+/.test(companyUrl)) return false;
    return true;
  };

  const isInviteStep = accountType === "team" && step === 4;

  const renderStep = () => {
    if (step === 0) {
      return <AccountTypeStep accountType={accountType} setAccountType={setAccountType} />;
    }
    if (step === 1) {
      return <TemplateStep selected={selectedTemplate} onSelect={setSelectedTemplate} />;
    }

    if (accountType === "personal") {
      if (step === 2) return <ProfileStep displayName={displayName} setDisplayName={setDisplayName} bio={bio} setBio={setBio} profileImage={profileImage} setProfileImage={setProfileImage} />;
      if (step === 3) return <SocialStep selectedSocials={selectedSocials} socialEntries={socialEntries} toggleSocial={toggleSocial} updateSocialUrl={updateSocialUrl} removeSocialEntry={removeSocialEntry} />;
      if (step === 4) return <UrlStep username={username} setUsername={setUsername} />;
    } else {
      if (step === 2) return <WorkspaceStep companyName={companyName} setCompanyName={setCompanyName} companySize={companySize} setCompanySize={setCompanySize} companyUrl={companyUrl} setCompanyUrl={setCompanyUrl} companyLogo={companyLogo} setCompanyLogo={setCompanyLogo} businessType={businessType} setBusinessType={setBusinessType} customBusinessType={customBusinessType} setCustomBusinessType={setCustomBusinessType} />;
      if (step === 3) return <ProfileStep displayName={displayName} setDisplayName={setDisplayName} bio={bio} setBio={setBio} profileImage={profileImage} setProfileImage={setProfileImage} />;
      if (step === 4) return <InviteMembersStep inviteEmails={inviteEmails} setInviteEmails={setInviteEmails} />;
      if (step === 5) return <UrlStep username={username} setUsername={setUsername} />;
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">link</span>folio
          </span>
          <StepIndicator currentStep={step} totalSteps={totalSteps} />
        </div>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-10">
              {renderStep()}
            </div>
          </div>

          <div className="border-t bg-background px-6 py-4">
            <div className="max-w-xl mx-auto flex items-center gap-3">
              {isInviteStep && (
                <Button
                  variant="ghost"
                  onClick={() => setStep(step + 1)}
                  data-testid="button-onboarding-skip"
                >
                  I'll do this later
                </Button>
              )}
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  data-testid="button-onboarding-back"
                >
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {step < lastStep ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  className="min-w-[140px]"
                  data-testid="button-onboarding-next"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={finishOnboarding}
                  disabled={!canProceed() || saving}
                  className="min-w-[140px]"
                  data-testid="button-onboarding-finish"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Finish
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-[400px] border-l bg-muted/30 items-center justify-center p-8">
          <PhonePreview
            template={currentTemplate}
            displayName={displayName || user.username}
            bio={bio}
            profileImage={profileImage}
            username={username || user.username}
            socialEntries={socialEntries}
            accountType={accountType}
            companyName={companyName}
            companyLogo={companyLogo}
          />
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = Array.from({ length: totalSteps }, (_, i) => i);
  return (
    <div className="flex items-center gap-1" data-testid="step-indicator">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-1">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-all ${
              s === currentStep
                ? "border-primary bg-primary text-primary-foreground"
                : s < currentStep
                ? "border-primary bg-primary/10 text-primary"
                : "border-muted-foreground/30 text-muted-foreground/50"
            }`}
            data-testid={`step-dot-${s}`}
          >
            {s < currentStep ? <Check className="w-4 h-4" /> : s}
          </div>
          {i < steps.length - 1 && (
            <div className={`w-6 h-0.5 ${s < currentStep ? "bg-primary" : "bg-muted-foreground/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function AccountTypeStep({
  accountType,
  setAccountType,
}: {
  accountType: "personal" | "team";
  setAccountType: (v: "personal" | "team") => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Choose your account type</h1>
      <p className="text-muted-foreground mb-8">How will you be using Linkfolio?</p>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setAccountType("personal")}
          className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center ${
            accountType === "personal"
              ? "border-primary ring-2 ring-primary/20"
              : "border-border"
          }`}
          data-testid="card-account-personal"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            accountType === "personal" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-sm">Personal</p>
            <p className="text-xs text-muted-foreground mt-1">For individuals who want a personal link page</p>
          </div>
        </button>
        <button
          onClick={() => setAccountType("team")}
          className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all text-center ${
            accountType === "team"
              ? "border-primary ring-2 ring-primary/20"
              : "border-border"
          }`}
          data-testid="card-account-team"
        >
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            accountType === "team" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="font-semibold text-sm">Team</p>
            <p className="text-xs text-muted-foreground mt-1">For companies and teams who want branded link pages</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function WorkspaceStep({
  companyName,
  setCompanyName,
  companySize,
  setCompanySize,
  companyUrl,
  setCompanyUrl,
  companyLogo,
  setCompanyLogo,
  businessType,
  setBusinessType,
  customBusinessType,
  setCustomBusinessType,
}: {
  companyName: string;
  setCompanyName: (v: string) => void;
  companySize: string;
  setCompanySize: (v: string) => void;
  companyUrl: string;
  setCompanyUrl: (v: string) => void;
  companyLogo: string;
  setCompanyLogo: (v: string) => void;
  businessType: string;
  setBusinessType: (v: string) => void;
  customBusinessType: string;
  setCustomBusinessType: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (JPEG, PNG, GIF, or WEBP)", variant: "destructive" });
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 1MB", variant: "destructive" });
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
      setCompanyLogo(data.url);
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Let's set up your workspace</h1>
      <p className="text-muted-foreground mb-8">Tell us about your company or team.</p>
      <div className="space-y-6">
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">Company Logo</Label>
          <div className="flex items-start gap-5">
            <div className="relative group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                id="logo-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                data-testid="input-workspace-logo-file"
              />
              <label htmlFor="logo-upload" className="cursor-pointer block" data-testid="button-upload-logo">
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={companyLogo || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    <Building2 className="w-8 h-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </label>
            </div>
            <div
              className="flex-1 border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-center min-h-[80px] transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              data-testid="dropzone-logo"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-1" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground mb-1" />
              )}
              <p className="text-xs text-muted-foreground">
                Drag & drop an image here, or{" "}
                <label htmlFor="logo-upload" className="text-primary cursor-pointer font-medium">browse</label>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">JPEG, PNG, GIF, WEBP up to 5MB</p>
            </div>
          </div>
          {companyLogo && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate flex-1">{companyLogo}</p>
              <button onClick={() => setCompanyLogo("")} className="text-destructive shrink-0 p-1" data-testid="button-remove-logo">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-company-name">Company Name</Label>
          <Input
            id="onb-company-name"
            placeholder="Acme Inc."
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            data-testid="input-workspace-company-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-company-size">Company Size</Label>
          <Select value={companySize} onValueChange={setCompanySize}>
            <SelectTrigger data-testid="select-workspace-company-size">
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              {TEAM_SIZES.map((size) => (
                <SelectItem key={size} value={size} data-testid={`select-item-size-${size}`}>
                  {size} employees
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-company-url">Company URL</Label>
          <Input
            id="onb-company-url"
            placeholder="https://example.com"
            value={companyUrl}
            onChange={(e) => setCompanyUrl(e.target.value)}
            data-testid="input-workspace-company-url"
          />
          {companyUrl && !/^https?:\/\/.+\..+/.test(companyUrl) && (
            <p className="text-xs text-destructive">Enter a valid URL (e.g. https://example.com)</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-business-type">Business Type</Label>
          <Select value={businessType} onValueChange={setBusinessType}>
            <SelectTrigger data-testid="select-workspace-business-type">
              <SelectValue placeholder="Select business type" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_TYPES.map((type) => (
                <SelectItem key={type} value={type} data-testid={`select-item-type-${type}`}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {businessType === "Other" && (
            <Input
              placeholder="Enter your business type"
              value={customBusinessType}
              onChange={(e) => setCustomBusinessType(e.target.value)}
              data-testid="input-workspace-custom-business-type"
              className="mt-2"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function InviteMembersStep({
  inviteEmails,
  setInviteEmails,
}: {
  inviteEmails: string[];
  setInviteEmails: (v: string[]) => void;
}) {
  const [emailInput, setEmailInput] = useState("");

  const addEmail = (raw: string) => {
    const email = raw.trim().toLowerCase();
    if (!email) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return;
    if (inviteEmails.includes(email)) return;
    if (inviteEmails.length >= 10) return;
    setInviteEmails([...inviteEmails, email]);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addEmail(emailInput.replace(",", ""));
      setEmailInput("");
    }
    if (e.key === "Backspace" && !emailInput && inviteEmails.length > 0) {
      setInviteEmails(inviteEmails.slice(0, -1));
    }
  };

  const removeEmail = (email: string) => {
    setInviteEmails(inviteEmails.filter((e) => e !== email));
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Invite team members</h1>
      <p className="text-muted-foreground mb-8">Send invites to your team (up to 10)</p>
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="onb-invite-email">Email addresses</Label>
            <span className="text-xs text-muted-foreground" data-testid="text-invite-count">{inviteEmails.length}/10</span>
          </div>
          <Input
            id="onb-invite-email"
            type="email"
            placeholder="name@company.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (emailInput.trim()) {
                addEmail(emailInput);
                setEmailInput("");
              }
            }}
            disabled={inviteEmails.length >= 10}
            data-testid="input-invite-email"
          />
        </div>
        {inviteEmails.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="invite-email-chips">
            {inviteEmails.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-primary/10 text-primary text-sm"
                data-testid={`chip-email-${email}`}
              >
                {email}
                <button
                  onClick={() => removeEmail(email)}
                  className="shrink-0"
                  data-testid={`button-remove-email-${email}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemplateStep({ selected, onSelect }: { selected: string; onSelect: (id: string) => void }) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Pick a Template</h1>
      <p className="text-muted-foreground mb-8">You'll be able to change styles and content later!</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`relative rounded-xl overflow-hidden aspect-[3/4] p-4 flex flex-col items-center justify-center text-center transition-all border-2 ${
              selected === t.id ? "border-primary ring-2 ring-primary/20" : "border-transparent"
            } ${t.bg}`}
            data-testid={`template-${t.id}`}
          >
            {selected === t.id && (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Check className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="w-10 h-10 rounded-full bg-white/20 mb-3" />
            <span className={`text-sm font-semibold ${t.textColor}`}>{t.name}</span>
            <div className="mt-3 space-y-1.5 w-full">
              <div className={`h-6 rounded-md ${t.cardBg} w-full`} />
              <div className={`h-6 rounded-md ${t.cardBg} w-full`} />
              <div className={`h-6 rounded-md ${t.cardBg} w-3/4 mx-auto`} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileStep({
  displayName,
  setDisplayName,
  bio,
  setBio,
  profileImage,
  setProfileImage,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  profileImage: string;
  setProfileImage: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (JPEG, PNG, GIF, or WEBP)", variant: "destructive" });
      return;
    }
    if (file.size > 1 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 1MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Customize Profile</h1>
      <p className="text-muted-foreground mb-8">Add a profile picture, name, and bio.</p>
      <div className="space-y-6">
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">Profile Picture</Label>
          <div className="flex items-start gap-5">
            <div className="relative group">
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                id="avatar-upload"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                data-testid="input-onboarding-image-file"
              />
              <label
                htmlFor="avatar-upload"
                className="cursor-pointer block"
                data-testid="button-upload-avatar"
              >
                <Avatar className="w-20 h-20 border-2 border-border">
                  <AvatarImage src={profileImage || undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                    {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </div>
              </label>
            </div>
            <div
              className="flex-1 border-2 border-dashed border-border rounded-lg p-4 flex flex-col items-center justify-center text-center min-h-[80px] transition-colors hover:border-primary/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              data-testid="dropzone-avatar"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-muted-foreground animate-spin mb-1" />
              ) : (
                <Upload className="w-5 h-5 text-muted-foreground mb-1" />
              )}
              <p className="text-xs text-muted-foreground">
                Drag & drop an image here, or{" "}
                <label htmlFor="avatar-upload" className="text-primary cursor-pointer font-medium">
                  browse
                </label>
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">JPEG, PNG, GIF, WEBP up to 5MB</p>
            </div>
          </div>
          {profileImage && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-xs text-muted-foreground truncate flex-1">{profileImage}</p>
              <button
                onClick={() => setProfileImage("")}
                className="text-destructive shrink-0 p-1"
                data-testid="button-remove-avatar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-name">Name</Label>
          <Input
            id="onb-name"
            placeholder="Your Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            data-testid="input-onboarding-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="onb-bio">Bio</Label>
          <Textarea
            id="onb-bio"
            placeholder="Tell the world about yourself..."
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
            data-testid="input-onboarding-bio"
          />
          <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
        </div>
      </div>
    </div>
  );
}

function SocialStep({
  selectedSocials,
  socialEntries,
  toggleSocial,
  updateSocialUrl,
  removeSocialEntry,
}: {
  selectedSocials: string[];
  socialEntries: SocialEntry[];
  toggleSocial: (id: string) => void;
  updateSocialUrl: (id: string, url: string) => void;
  removeSocialEntry: (id: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Add Social Icons</h1>
      <p className="text-muted-foreground mb-8">Link out to your online channels.</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {SOCIAL_PLATFORMS.map((p) => {
          const isSelected = selectedSocials.includes(p.id);
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => toggleSocial(p.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
              data-testid={`social-chip-${p.id}`}
            >
              <Icon className="w-4 h-4" />
              {p.label}
            </button>
          );
        })}
      </div>

      {socialEntries.length > 0 && (
        <div className="space-y-3">
          {socialEntries.map((entry) => {
            const platform = SOCIAL_PLATFORMS.find((p) => p.id === entry.platformId);
            if (!platform) return null;
            const Icon = platform.icon;
            return (
              <div key={entry.platformId} className="flex items-center gap-3">
                <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                <div className="flex-1 relative">
                  <Input
                    placeholder={`${platform.label} URL`}
                    value={entry.url}
                    onChange={(e) => updateSocialUrl(entry.platformId, e.target.value)}
                    data-testid={`input-social-${entry.platformId}`}
                  />
                </div>
                <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                <button
                  onClick={() => removeSocialEntry(entry.platformId)}
                  className="text-destructive shrink-0 p-1"
                  data-testid={`button-remove-social-${entry.platformId}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UrlStep({
  username,
  setUsername,
}: {
  username: string;
  setUsername: (v: string) => void;
}) {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Claim a URL</h1>
      <p className="text-muted-foreground mb-8">A unique web address for your Linkfolio profile.</p>
      <div className="space-y-2">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
            linkfolio/
          </span>
          <Input
            className="pl-[85px] text-lg py-6"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
            placeholder="yourname"
            minLength={3}
            maxLength={30}
            data-testid="input-onboarding-username"
          />
        </div>
        {username.length > 0 && username.length < 3 && (
          <p className="text-sm text-destructive" data-testid="text-username-error">Username must be at least 3 characters</p>
        )}
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
  socialEntries,
  accountType,
  companyName,
  companyLogo,
}: {
  template: (typeof TEMPLATES)[0];
  displayName: string;
  bio: string;
  profileImage: string;
  username: string;
  socialEntries: SocialEntry[];
  accountType: "personal" | "team";
  companyName: string;
  companyLogo: string;
}) {
  const activeSocials = socialEntries.filter((e) => e.url.trim());
  const showTeamBranding = accountType === "team" && companyName;

  return (
    <div className="w-[280px] mx-auto">
      <div className="rounded-[2rem] border-4 border-foreground/10 overflow-hidden shadow-xl">
        <div className="bg-foreground/10 h-7 flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground font-medium truncate px-4">
            linkfolio/{username}
          </span>
        </div>
        <div className={`min-h-[480px] ${template.bg} p-5`}>
          <div className="flex flex-col items-center text-center">
            {showTeamBranding ? (
              <>
                <Avatar className="w-16 h-16 border-2 border-white/30 mb-3">
                  <AvatarImage src={companyLogo || undefined} />
                  <AvatarFallback className="bg-white/20 text-lg" style={{ color: template.accent }}>
                    <Building2 className="w-6 h-6" />
                  </AvatarFallback>
                </Avatar>
                <p className={`font-bold text-sm ${template.textColor}`}>{companyName}</p>
              </>
            ) : (
              <>
                <Avatar className="w-16 h-16 border-2 border-white/30 mb-3">
                  <AvatarImage src={profileImage || undefined} />
                  <AvatarFallback className="bg-white/20 text-lg" style={{ color: template.accent }}>
                    {displayName ? displayName.charAt(0).toUpperCase() : "?"}
                  </AvatarFallback>
                </Avatar>
                <p className={`font-bold text-sm ${template.textColor}`}>{displayName || "Your Name"}</p>
              </>
            )}
            {bio && (
              <p className={`text-[11px] mt-1 ${template.textColor} opacity-80 leading-relaxed max-w-[200px]`}>
                {bio.length > 100 ? bio.slice(0, 100) + "..." : bio}
              </p>
            )}

            {activeSocials.length > 0 && (
              <div className="flex items-center gap-2 mt-3">
                {activeSocials.slice(0, 5).map((entry) => {
                  const platform = SOCIAL_PLATFORMS.find((p) => p.id === entry.platformId);
                  if (!platform) return null;
                  const Icon = platform.icon;
                  return (
                    <div
                      key={entry.platformId}
                      className={`w-6 h-6 flex items-center justify-center ${template.textColor} opacity-70`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="w-full mt-5 space-y-2">
              {(activeSocials.length > 0 ? activeSocials.slice(0, 4) : [{ platformId: "placeholder1" }, { platformId: "placeholder2" }, { platformId: "placeholder3" }]).map(
                (entry, i) => {
                  const platform = SOCIAL_PLATFORMS.find((p) => p.id === entry.platformId);
                  return (
                    <div
                      key={i}
                      className={`${template.cardBg} rounded-lg py-2.5 px-4 text-center`}
                    >
                      <span className={`text-xs font-medium ${template.cardTextColor}`}>
                        {platform?.label || `Link ${i + 1}`}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
