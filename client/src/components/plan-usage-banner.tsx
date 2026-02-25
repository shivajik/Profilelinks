import { usePlanLimits, type PlanLimits } from "@/hooks/use-plan-limits";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const percent = Math.min((current / max) * 100, 100);
  const isAtLimit = current >= max;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={isAtLimit ? "text-destructive font-medium" : "text-foreground"}>
          {current}/{max}
        </span>
      </div>
      <Progress value={percent} className={`h-1.5 ${isAtLimit ? "[&>div]:bg-destructive" : ""}`} />
    </div>
  );
}

export function PlanUsageBanner() {
  const { data: limits, isLoading } = usePlanLimits();
  const [, navigate] = useLocation();

  if (isLoading || !limits) return null;

  const anyAtLimit =
    limits.currentLinks >= limits.maxLinks ||
    limits.currentPages >= limits.maxPages ||
    limits.currentBlocks >= limits.maxBlocks ||
    limits.currentSocials >= limits.maxSocials;

  return (
    <Card className={`${anyAtLimit ? "border-destructive/50" : "border-border"}`}>
      <CardContent className="pt-4 pb-3 px-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {limits.hasActivePlan ? (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Crown className="w-3 h-3" />
                {limits.planName}
              </Badge>
            ) : (
              <Badge variant="outline" className="gap-1 text-xs">Free Plan</Badge>
            )}
          </div>
          {anyAtLimit && (
            <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => navigate("/pricing")}>
              <AlertTriangle className="w-3 h-3 mr-1" />
              Upgrade
            </Button>
          )}
        </div>
        <div className="space-y-2">
          <UsageBar label="Links" current={limits.currentLinks} max={limits.maxLinks} />
          <UsageBar label="Pages" current={limits.currentPages} max={limits.maxPages} />
          <UsageBar label="Blocks" current={limits.currentBlocks} max={limits.maxBlocks} />
          <UsageBar label="Socials" current={limits.currentSocials} max={limits.maxSocials} />
          <UsageBar label="Team Members" current={limits.currentTeamMembers} max={limits.maxTeamMembers} />
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <FeatureBadge label="QR Code" enabled={limits.qrCodeEnabled} />
          <FeatureBadge label="Analytics" enabled={limits.analyticsEnabled} />
          <FeatureBadge label="Templates" enabled={limits.customTemplatesEnabled} />
        </div>
      </CardContent>
    </Card>
  );
}

function FeatureBadge({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <Badge variant={enabled ? "default" : "outline"} className={`text-[10px] ${!enabled ? "opacity-50" : ""}`}>
      {enabled ? "✓" : "✗"} {label}
    </Badge>
  );
}

export function canPerformAction(
  limits: PlanLimits | undefined,
  action: "addLink" | "addPage" | "addBlock" | "addSocial" | "addTeamMember" | "useQrCode" | "useAnalytics"
): { allowed: boolean; message?: string } {
  if (!limits) return { allowed: true };
  switch (action) {
    case "addLink":
      return limits.currentLinks >= limits.maxLinks
        ? { allowed: false, message: `You've reached your link limit (${limits.currentLinks}/${limits.maxLinks}). Would you like to upgrade your plan for more links?` }
        : { allowed: true };
    case "addPage":
      return limits.currentPages >= limits.maxPages
        ? { allowed: false, message: `You've reached your page limit (${limits.currentPages}/${limits.maxPages}). Would you like to upgrade your plan for more pages?` }
        : { allowed: true };
    case "addBlock":
      return limits.currentBlocks >= limits.maxBlocks
        ? { allowed: false, message: `You've reached your block limit (${limits.currentBlocks}/${limits.maxBlocks}). Would you like to upgrade your plan for more blocks?` }
        : { allowed: true };
    case "addSocial":
      return limits.currentSocials >= limits.maxSocials
        ? { allowed: false, message: `You've reached your social link limit (${limits.currentSocials}/${limits.maxSocials}). Would you like to upgrade your plan for more social links?` }
        : { allowed: true };
    case "addTeamMember":
      return limits.currentTeamMembers >= limits.maxTeamMembers
        ? { allowed: false, message: `You've reached your team member limit (${limits.currentTeamMembers}/${limits.maxTeamMembers}). Would you like to upgrade your plan to add more members?` }
        : { allowed: true };
    case "useQrCode":
      return !limits.qrCodeEnabled
        ? { allowed: false, message: "QR Code feature requires a paid plan. Would you like to upgrade?" }
        : { allowed: true };
    case "useAnalytics":
      return !limits.analyticsEnabled
        ? { allowed: false, message: "Analytics feature requires a paid plan. Would you like to upgrade?" }
        : { allowed: true };
    default:
      return { allowed: true };
  }
}

export function LimitReachedDialog({ open, onOpenChange, message, onUpgrade }: { open: boolean; onOpenChange: (v: boolean) => void; message: string; onUpgrade: () => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Limit Reached
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Not Now</Button>
          <Button size="sm" onClick={() => { onOpenChange(false); onUpgrade(); }}>
            <Crown className="w-4 h-4 mr-1" /> Upgrade Plan
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
