import { useState } from "react";
import { useLocation, Redirect } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Check, ArrowRight, Loader2, X, GripVertical } from "lucide-react";
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

const TEMPLATES = [
  {
    id: "minimal",
    name: "Minimal",
    bg: "bg-[#f5f0eb]",
    cardBg: "bg-[#e8dfd6]",
    textColor: "text-[#4a3f35]",
    cardTextColor: "text-[#4a3f35]",
    accent: "#8b7355",
    description: "Clean and simple",
  },
  {
    id: "ocean",
    name: "Ocean",
    bg: "bg-gradient-to-b from-[#0f2027] via-[#203a43] to-[#2c5364]",
    cardBg: "bg-white/15",
    textColor: "text-white",
    cardTextColor: "text-white",
    accent: "#64ffda",
    description: "Deep blue vibes",
  },
  {
    id: "sunset",
    name: "Sunset",
    bg: "bg-gradient-to-b from-[#f093fb] via-[#f5576c] to-[#fda085]",
    cardBg: "bg-white/20",
    textColor: "text-white",
    cardTextColor: "text-white",
    accent: "#fff",
    description: "Warm gradients",
  },
  {
    id: "dark",
    name: "Midnight",
    bg: "bg-[#0a0a0a]",
    cardBg: "bg-[#1a1a1a]",
    textColor: "text-white",
    cardTextColor: "text-gray-200",
    accent: "#6C5CE7",
    description: "Sleek dark mode",
  },
  {
    id: "forest",
    name: "Forest",
    bg: "bg-gradient-to-b from-[#1a3c2a] to-[#2d5a3e]",
    cardBg: "bg-white/15",
    textColor: "text-white",
    cardTextColor: "text-white",
    accent: "#4ade80",
    description: "Nature inspired",
  },
  {
    id: "lavender",
    name: "Lavender",
    bg: "bg-gradient-to-b from-[#e8dff5] to-[#fce4ec]",
    cardBg: "bg-white/60",
    textColor: "text-[#4a3068]",
    cardTextColor: "text-[#4a3068]",
    accent: "#7c3aed",
    description: "Soft purple tones",
  },
];

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
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState("minimal");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [profileImage, setProfileImage] = useState(user?.profileImage || "");
  const [selectedSocials, setSelectedSocials] = useState<string[]>([]);
  const [socialEntries, setSocialEntries] = useState<SocialEntry[]>([]);
  const [username, setUsername] = useState(user?.username || "");
  const [saving, setSaving] = useState(false);

  if (!user) {
    return <Redirect to="/auth" />;
  }

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
      });

      for (const entry of socialEntries) {
        if (!entry.url.trim()) continue;
        const platform = SOCIAL_PLATFORMS.find((p) => p.id === entry.platformId);
        if (!platform) continue;
        const fullUrl = entry.url.startsWith("http") || entry.url.startsWith("mailto:") || entry.url.startsWith("tel:")
          ? entry.url
          : platform.prefix + entry.url;
        await apiRequest("POST", "/api/links", {
          title: platform.label,
          url: fullUrl,
        });
      }

      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/links"] });
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
    if (step === 4 && username.length < 3) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <span className="text-lg font-bold tracking-tight">
            <span className="text-primary">link</span>folio
          </span>
          <StepIndicator currentStep={step} />
        </div>
      </header>

      <div className="flex-1 flex">
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-xl mx-auto px-6 py-10">
              {step === 1 && (
                <TemplateStep
                  selected={selectedTemplate}
                  onSelect={setSelectedTemplate}
                />
              )}
              {step === 2 && (
                <ProfileStep
                  displayName={displayName}
                  setDisplayName={setDisplayName}
                  bio={bio}
                  setBio={setBio}
                  profileImage={profileImage}
                  setProfileImage={setProfileImage}
                />
              )}
              {step === 3 && (
                <SocialStep
                  selectedSocials={selectedSocials}
                  socialEntries={socialEntries}
                  toggleSocial={toggleSocial}
                  updateSocialUrl={updateSocialUrl}
                  removeSocialEntry={removeSocialEntry}
                />
              )}
              {step === 4 && (
                <UrlStep
                  username={username}
                  setUsername={setUsername}
                />
              )}
            </div>
          </div>

          <div className="border-t bg-background px-6 py-4">
            <div className="max-w-xl mx-auto flex items-center gap-3">
              {step > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  data-testid="button-onboarding-back"
                >
                  Back
                </Button>
              )}
              <div className="flex-1" />
              {step < 4 ? (
                <Button
                  onClick={() => setStep(step + 1)}
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
          />
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [1, 2, 3, 4];
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
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2" data-testid="text-step-title">Customize Profile</h1>
      <p className="text-muted-foreground mb-8">Add a profile picture, name, and bio.</p>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-border">
            <AvatarImage src={profileImage || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg">
              {displayName ? displayName.charAt(0).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Label htmlFor="onb-image" className="text-sm text-muted-foreground">Profile Picture URL</Label>
            <Input
              id="onb-image"
              placeholder="https://example.com/avatar.jpg"
              value={profileImage}
              onChange={(e) => setProfileImage(e.target.value)}
              data-testid="input-onboarding-image"
            />
          </div>
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
          <p className="text-sm text-destructive">Username must be at least 3 characters</p>
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
}: {
  template: (typeof TEMPLATES)[0];
  displayName: string;
  bio: string;
  profileImage: string;
  username: string;
  socialEntries: SocialEntry[];
}) {
  const activeSocials = socialEntries.filter((e) => e.url.trim());

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
