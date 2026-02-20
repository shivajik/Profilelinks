import { db } from "./storage";
import { userSubscriptions, pricingPlans, links, pages, blocks, socials, teamMembers, menuSocials } from "@shared/schema";
import { eq, and, sql, count } from "drizzle-orm";

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
  menuBuilderEnabled: boolean;
  currentLinks: number;
  currentPages: number;
  currentBlocks: number;
  currentSocials: number;
  currentTeamMembers: number;
  hasActivePlan: boolean;
}

// Default free plan limits (when no subscription)
const FREE_LIMITS = {
  maxLinks: 5,
  maxPages: 1,
  maxTeamMembers: 1,
  maxBlocks: 10,
  maxSocials: 3,
  qrCodeEnabled: false,
  analyticsEnabled: false,
  customTemplatesEnabled: false,
  menuBuilderEnabled: false,
};

// Simple in-memory cache to avoid redundant DB queries within same request cycle
const planLimitsCache = new Map<string, { data: PlanLimits; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

export async function getUserPlanLimits(userId: string): Promise<PlanLimits> {
  // Check cache first
  const cached = planLimitsCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Get active subscription with plan details
  const subs = await db
    .select({
      planName: pricingPlans.name,
      maxLinks: pricingPlans.maxLinks,
      maxPages: pricingPlans.maxPages,
      maxTeamMembers: pricingPlans.maxTeamMembers,
      maxBlocks: pricingPlans.maxBlocks,
      maxSocials: pricingPlans.maxSocials,
      qrCodeEnabled: pricingPlans.qrCodeEnabled,
      analyticsEnabled: pricingPlans.analyticsEnabled,
      customTemplatesEnabled: pricingPlans.customTemplatesEnabled,
      menuBuilderEnabled: pricingPlans.menuBuilderEnabled,
    })
    .from(userSubscriptions)
    .innerJoin(pricingPlans, eq(userSubscriptions.planId, pricingPlans.id))
    .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
    .limit(1);

  const plan = subs[0];
  const hasActivePlan = !!plan;

  const limits = plan || FREE_LIMITS;

  // Get all current usage counts in parallel
  const [linksResult, pagesResult, blocksResult, socialsResult, menuSocialsResult] = await Promise.all([
    db.select({ count: count() }).from(links).where(eq(links.userId, userId)),
    db.select({ count: count() }).from(pages).where(eq(pages.userId, userId)),
    db.select({ count: count() }).from(blocks).where(eq(blocks.userId, userId)),
    db.select({ count: count() }).from(socials).where(eq(socials.userId, userId)),
    db.select({ count: count() }).from(menuSocials).where(eq(menuSocials.userId, userId)),
  ]);

  // Team members count (if user has a team)
  let teamMembersCount = 0;
  try {
    const teamResult = await db
      .select({ count: count() })
      .from(teamMembers)
      .where(sql`${teamMembers.teamId} IN (SELECT team_id FROM users WHERE id = ${userId} AND team_id IS NOT NULL)`);
    teamMembersCount = Number(teamResult[0]?.count ?? 0);
  } catch { /* no team */ }

  const result: PlanLimits = {
    planName: plan?.planName ?? null,
    maxLinks: limits.maxLinks,
    maxPages: limits.maxPages,
    maxTeamMembers: limits.maxTeamMembers,
    maxBlocks: limits.maxBlocks ?? FREE_LIMITS.maxBlocks,
    maxSocials: limits.maxSocials ?? FREE_LIMITS.maxSocials,
    qrCodeEnabled: limits.qrCodeEnabled ?? FREE_LIMITS.qrCodeEnabled,
    analyticsEnabled: limits.analyticsEnabled ?? FREE_LIMITS.analyticsEnabled,
    customTemplatesEnabled: limits.customTemplatesEnabled ?? FREE_LIMITS.customTemplatesEnabled,
    menuBuilderEnabled: limits.menuBuilderEnabled ?? FREE_LIMITS.menuBuilderEnabled,
    currentLinks: Number(linksResult[0]?.count ?? 0),
    currentPages: Number(pagesResult[0]?.count ?? 0),
    currentBlocks: Number(blocksResult[0]?.count ?? 0),
    currentSocials: Number(socialsResult[0]?.count ?? 0) + Number(menuSocialsResult[0]?.count ?? 0),
    currentTeamMembers: teamMembersCount,
    hasActivePlan,
  };

  // Cache the result
  planLimitsCache.set(userId, { data: result, timestamp: Date.now() });

  return result;
}
