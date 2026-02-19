import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export interface PlanLimits {
  planName: string | null;
  maxLinks: number;
  maxPages: number;
  maxTeamMembers: number;
  maxBlocks: number;
  maxSocials: number;
  qrCodeEnabled: boolean;
  analyticsEnabled: boolean;
  customTemplatesEnabled: boolean;
  currentLinks: number;
  currentPages: number;
  currentBlocks: number;
  currentSocials: number;
  currentTeamMembers: number;
  hasActivePlan: boolean;
}

export function usePlanLimits() {
  return useQuery<PlanLimits>({
    queryKey: ["/api/auth/plan-limits"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 30000,
  });
}
