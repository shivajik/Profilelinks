import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Camera, Building2, Briefcase, Phone, Globe, MapPin, Mail } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

type BusinessProfileData = {
  member: {
    id: string;
    businessName: string | null;
    businessPhone: string | null;
    businessProfileImage: string | null;
    businessBio: string | null;
    jobTitle: string | null;
    role: string;
  };
  team: {
    id: string;
    name: string;
    logoUrl: string | null;
    websiteUrl: string | null;
  };
  templateData: Record<string, any>;
};

export function BusinessProfileSection() {
  const { toast } = useToast();
  const [businessName, setBusinessName] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessBio, setBusinessBio] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [businessProfileImage, setBusinessProfileImage] = useState<string | null>(null);

  const { data, isLoading } = useQuery<BusinessProfileData>({
    queryKey: ["/api/auth/business-profile"],
  });

  useEffect(() => {
    if (data?.member) {
      setBusinessName(data.member.businessName || "");
      setBusinessPhone(data.member.businessPhone || "");
      setBusinessBio(data.member.businessBio || "");
      setJobTitle(data.member.jobTitle || "");
      setBusinessProfileImage(data.member.businessProfileImage || null);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (profileData: Record<string, any>) => {
      await apiRequest("PATCH", "/api/auth/business-profile", profileData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/business-profile"] });
      toast({ title: "Business profile updated!" });
    },
    onError: () => {
      toast({ title: "Failed to update business profile", variant: "destructive" });
    },
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      setBusinessProfileImage(url);
      updateMutation.mutate({ businessProfileImage: url });
    } catch {
      toast({ title: "Failed to upload image", variant: "destructive" });
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      businessName: businessName || null,
      businessPhone: businessPhone || null,
      businessBio: businessBio || null,
      jobTitle: jobTitle || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        <p>You are not part of any team yet.</p>
      </div>
    );
  }

  const { team, member, templateData } = data;
  const isOwner = member.role === "owner";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <SidebarTrigger />
        <h2 className="text-xl font-semibold">Business Profile</h2>
        <Badge variant="secondary" className="ml-2">{team.name}</Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        This is your business card profile for <strong>{team.name}</strong>. Changes here will appear on your public profile when viewed as a team member.
      </p>

      {/* Company Info (read-only) — only visible to team owner */}
      {isOwner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Company Info
              <Badge variant="outline" className="ml-auto text-xs">Set by team admin</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              {team.logoUrl && (
                <img src={team.logoUrl} alt={team.name} className="w-10 h-10 rounded-full object-cover" />
              )}
              <div>
                <p className="font-medium">{templateData.companyName || team.name}</p>
                {team.websiteUrl && (
                  <p className="text-xs text-muted-foreground">{team.websiteUrl}</p>
                )}
              </div>
            </div>
            {templateData.companyPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-3.5 h-3.5" /> {templateData.companyPhone}
              </div>
            )}
            {templateData.companyEmail && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-3.5 h-3.5" /> {templateData.companyEmail}
              </div>
            )}
            {templateData.companyAddress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" /> {templateData.companyAddress}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editable Business Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Briefcase className="w-4 h-4" />
            Your Business Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Profile Image */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-16 h-16">
                <AvatarImage src={businessProfileImage || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-lg">
                  {(businessName || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <label className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer shadow-sm">
                <Camera className="w-3 h-3" />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            </div>
            <div>
              <p className="text-sm font-medium">Business Photo</p>
              <p className="text-xs text-muted-foreground">This photo will be shown on your team business card</p>
            </div>
          </div>

          {/* Business Name */}
          <div className="space-y-1.5">
            <Label htmlFor="businessName">Display Name</Label>
            <Input
              id="businessName"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Your name on the business card"
            />
          </div>

          {/* Job Title */}
          <div className="space-y-1.5">
            <Label htmlFor="jobTitle">Job Title</Label>
            <Input
              id="jobTitle"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Developer, Designer, Manager"
            />
          </div>

          {/* Business Phone */}
          <div className="space-y-1.5">
            <Label htmlFor="businessPhone">Phone Number</Label>
            <Input
              id="businessPhone"
              value={businessPhone}
              onChange={(e) => setBusinessPhone(e.target.value)}
              placeholder="Your business phone number"
            />
          </div>

          {/* Business Bio */}
          <div className="space-y-1.5">
            <Label htmlFor="businessBio">Bio</Label>
            <Textarea
              id="businessBio"
              value={businessBio}
              onChange={(e) => setBusinessBio(e.target.value)}
              placeholder="A short bio for your business card..."
              rows={3}
            />
          </div>

          <Button onClick={handleSave} disabled={updateMutation.isPending} className="w-full">
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Business Profile"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
