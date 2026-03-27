import { db } from "./storage";
import { userSubscriptions, pricingPlans, links, pages, blocks, socials, teamMembers, menuSocials, teams, users } from "@shared/schema";
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
  whiteLabelEnabled: boolean;
  themeCategories: string[];
  currentLinks: number;
  currentPages: number;
  currentBlocks: number;
  currentSocials: number;
  currentTeamMembers: number;
  hasActivePlan: boolean;
  isTrial: boolean;
  trialEndsAt: string | null;
  trialExpired: boolean;
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
  whiteLabelEnabled: false,
  themeCategories: ["starter"],
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
  const planSelection = {
    planName: pricingPlans.name,
    monthlyPrice: pricingPlans.monthlyPrice,
    yearlyPrice: pricingPlans.yearlyPrice,
    maxLinks: pricingPlans.maxLinks,
    maxPages: pricingPlans.maxPages,
    maxTeamMembers: pricingPlans.maxTeamMembers,
    maxBlocks: pricingPlans.maxBlocks,
    maxSocials: pricingPlans.maxSocials,
    qrCodeEnabled: pricingPlans.qrCodeEnabled,
    analyticsEnabled: pricingPlans.analyticsEnabled,
    customTemplatesEnabled: pricingPlans.customTemplatesEnabled,
    menuBuilderEnabled: pricingPlans.menuBuilderEnabled,
    whiteLabelEnabled: pricingPlans.whiteLabelEnabled,
    themeCategories: pricingPlans.themeCategories,
    isTrial: userSubscriptions.isTrial,
    trialEndsAt: userSubscriptions.trialEndsAt,
  };

  const subs = await db
    .select(planSelection)
    .from(userSubscriptions)
    .innerJoin(pricingPlans, eq(userSubscriptions.planId, pricingPlans.id))
    .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
    .limit(1);

  let plan = subs[0];
  let hasActivePlan = !!plan;
  let isTrial = plan?.isTrial ?? false;
  let trialEndsAt = plan?.trialEndsAt ?? null;
  let trialExpired = false;
  let freePlanConfig: (typeof subs)[number] | null = null;

  // Check if active trial has just expired
  if (plan && isTrial && trialEndsAt && new Date(trialEndsAt) < new Date()) {
    trialExpired = true;
    // Mark subscription as expired in DB (fire-and-forget)
    db.update(userSubscriptions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active"), eq(userSubscriptions.isTrial, true)))
      .catch(() => {});
    // Clear cache so subsequent requests re-check the DB
    planLimitsCache.delete(userId);
    // Treat as no plan
    plan = undefined as any;
    hasActivePlan = false;
  }

  // If no active plan, check whether the user previously had a trial that is now expired (status = 'expired')
  // Only show trialExpired=true for 24 hours after expiry, then treat as normal free user
  if (!plan && !trialExpired) {
    const expiredTrials = await db
      .select({ trialEndsAt: userSubscriptions.trialEndsAt })
      .from(userSubscriptions)
      .where(and(
        eq(userSubscriptions.userId, userId),
        eq(userSubscriptions.status, "expired"),
        eq(userSubscriptions.isTrial, true),
      ))
      .limit(1);
    if (expiredTrials.length > 0) {
      const expiredAt = expiredTrials[0].trialEndsAt ? new Date(expiredTrials[0].trialEndsAt) : null;
      const hoursSinceExpiry = expiredAt ? (Date.now() - expiredAt.getTime()) / (1000 * 60 * 60) : Infinity;
      // Only show trial expired badge for 24 hours after expiry
      if (hoursSinceExpiry <= 24) {
        trialExpired = true;
      }
      trialEndsAt = expiredTrials[0].trialEndsAt ?? null;
    }
  }

  if (!plan) {
    const activePlans = await db
      .select(planSelection)
      .from(pricingPlans)
      .innerJoin(userSubscriptions, sql`false`) // dummy join to match type, won't return rows
      .where(and(eq(pricingPlans.isActive, true), eq(pricingPlans.isLtd, false)));

    // Fallback: query without join for free plan detection
    const freePlans = await db
      .select({
        planName: pricingPlans.name,
        monthlyPrice: pricingPlans.monthlyPrice,
        yearlyPrice: pricingPlans.yearlyPrice,
        maxLinks: pricingPlans.maxLinks,
        maxPages: pricingPlans.maxPages,
        maxTeamMembers: pricingPlans.maxTeamMembers,
        maxBlocks: pricingPlans.maxBlocks,
        maxSocials: pricingPlans.maxSocials,
        qrCodeEnabled: pricingPlans.qrCodeEnabled,
        analyticsEnabled: pricingPlans.analyticsEnabled,
        customTemplatesEnabled: pricingPlans.customTemplatesEnabled,
        menuBuilderEnabled: pricingPlans.menuBuilderEnabled,
        whiteLabelEnabled: pricingPlans.whiteLabelEnabled,
        themeCategories: pricingPlans.themeCategories,
      })
      .from(pricingPlans)
      .where(and(eq(pricingPlans.isActive, true), eq(pricingPlans.isLtd, false)));

    freePlanConfig = freePlans.find((candidate) => (
      Number(candidate.monthlyPrice ?? 0) === 0 && Number(candidate.yearlyPrice ?? 0) === 0
    )) as any ?? null;
  }

  // Check if user is a team member and inherit ALL owner's plan limits & features
  let ownerPlanLimits: typeof subs[0] | null = null;

  // Always check team membership for feature inheritance (regardless of member's own plan)
  const memberRows = await db
    .select({ teamId: teamMembers.teamId, role: teamMembers.role })
    .from(teamMembers)
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, "activated")))
    .limit(1);

  if (memberRows.length > 0 && memberRows[0].role !== "owner") {
    const teamRow = await db.select({ ownerId: teams.ownerId }).from(teams).where(eq(teams.id, memberRows[0].teamId)).limit(1);
    if (teamRow.length > 0) {
      const ownerSubs = await db
        .select(planSelection)
        .from(userSubscriptions)
        .innerJoin(pricingPlans, eq(userSubscriptions.planId, pricingPlans.id))
        .where(and(eq(userSubscriptions.userId, teamRow[0].ownerId), eq(userSubscriptions.status, "active")))
        .limit(1);
      if (ownerSubs.length > 0) {
        ownerPlanLimits = ownerSubs[0];
      }
    }
  }

  // If team member has owner's plan, use owner's limits entirely
  const effectiveLimits = ownerPlanLimits || plan || freePlanConfig || FREE_LIMITS;

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
    planName: ownerPlanLimits?.planName ?? plan?.planName ?? freePlanConfig?.planName ?? null,
    maxLinks: effectiveLimits.maxLinks,
    maxPages: effectiveLimits.maxPages,
    maxTeamMembers: effectiveLimits.maxTeamMembers,
    maxBlocks: effectiveLimits.maxBlocks ?? FREE_LIMITS.maxBlocks,
    maxSocials: effectiveLimits.maxSocials ?? FREE_LIMITS.maxSocials,
    qrCodeEnabled: effectiveLimits.qrCodeEnabled ?? FREE_LIMITS.qrCodeEnabled,
    analyticsEnabled: effectiveLimits.analyticsEnabled ?? FREE_LIMITS.analyticsEnabled,
    customTemplatesEnabled: effectiveLimits.customTemplatesEnabled ?? FREE_LIMITS.customTemplatesEnabled,
    menuBuilderEnabled: effectiveLimits.menuBuilderEnabled ?? FREE_LIMITS.menuBuilderEnabled,
    whiteLabelEnabled: effectiveLimits.whiteLabelEnabled ?? FREE_LIMITS.whiteLabelEnabled,
    themeCategories: ((effectiveLimits as any)?.themeCategories ?? FREE_LIMITS.themeCategories) as string[],
    currentLinks: Number(linksResult[0]?.count ?? 0),
    currentPages: Number(pagesResult[0]?.count ?? 0),
    currentBlocks: Number(blocksResult[0]?.count ?? 0),
    currentSocials: Number(socialsResult[0]?.count ?? 0) + Number(menuSocialsResult[0]?.count ?? 0),
    currentTeamMembers: teamMembersCount,
    hasActivePlan: !!ownerPlanLimits || hasActivePlan,
    isTrial: ownerPlanLimits ? (ownerPlanLimits as any).isTrial ?? false : isTrial,
    trialEndsAt: ownerPlanLimits ? ((ownerPlanLimits as any).trialEndsAt ? new Date((ownerPlanLimits as any).trialEndsAt).toISOString() : null) : (trialEndsAt ? new Date(trialEndsAt).toISOString() : null),
    trialExpired: ownerPlanLimits ? false : trialExpired,
  };

  // Cache the result
  planLimitsCache.set(userId, { data: result, timestamp: Date.now() });

  return result;
}

/**
 * Get the effective plan limits for a user considering trial expiry.
 * Used by public profile routes to determine what features to show.
 */
export async function getEffectivePlanForPublicProfile(userId: string): Promise<{
  isFree: boolean;
  allowedThemeCategories: string[];
  analyticsEnabled: boolean;
  qrCodeEnabled: boolean;
  menuBuilderEnabled: boolean;
  whiteLabelEnabled: boolean;
}> {
  const limits = await getUserPlanLimits(userId);
  const isFree = !limits.hasActivePlan || limits.trialExpired;
  return {
    isFree,
    allowedThemeCategories: isFree ? ["starter"] : limits.themeCategories,
    analyticsEnabled: !isFree && limits.analyticsEnabled,
    qrCodeEnabled: !isFree && limits.qrCodeEnabled,
    menuBuilderEnabled: !isFree && limits.menuBuilderEnabled,
    whiteLabelEnabled: !isFree && limits.whiteLabelEnabled,
  };
}

/**
 * Lightweight plan status check for PUBLIC profile rendering.
 * Skips all count queries (currentLinks, currentPages, etc.) since
 * public profiles only need to know plan features, not usage counts.
 * Reduces DB queries from ~12 to ~2-4.
 */

// Separate cache for public plan status (longer TTL since it changes rarely)
const publicPlanCache = new Map<string, { data: PublicPlanStatus; timestamp: number }>();
const PUBLIC_CACHE_TTL = 30000; // 30 seconds

export interface PublicPlanStatus {
  isFree: boolean;
  maxLinks: number;
  maxPages: number;
  maxBlocks: number;
  maxSocials: number;
  menuBuilderEnabled: boolean;
  whiteLabelEnabled: boolean;
  themeCategories: string[];
}

export async function getPublicPlanStatus(userId: string): Promise<PublicPlanStatus> {
  const cached = publicPlanCache.get(userId);
  if (cached && Date.now() - cached.timestamp < PUBLIC_CACHE_TTL) {
    return cached.data;
  }

  const FREE_RESULT: PublicPlanStatus = {
    isFree: true,
    maxLinks: 5, maxPages: 1, maxBlocks: 10, maxSocials: 3,
    menuBuilderEnabled: false, whiteLabelEnabled: false,
    themeCategories: ["starter"],
  };

  // Single query: get active subscription + plan details
  const subs = await db
    .select({
      maxLinks: pricingPlans.maxLinks,
      maxPages: pricingPlans.maxPages,
      maxBlocks: pricingPlans.maxBlocks,
      maxSocials: pricingPlans.maxSocials,
      menuBuilderEnabled: pricingPlans.menuBuilderEnabled,
      whiteLabelEnabled: pricingPlans.whiteLabelEnabled,
      themeCategories: pricingPlans.themeCategories,
      isTrial: userSubscriptions.isTrial,
      trialEndsAt: userSubscriptions.trialEndsAt,
    })
    .from(userSubscriptions)
    .innerJoin(pricingPlans, eq(userSubscriptions.planId, pricingPlans.id))
    .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active")))
    .limit(1);

  let sub = subs[0];

  // Check trial expiry
  if (sub?.isTrial && sub.trialEndsAt && new Date(sub.trialEndsAt) < new Date()) {
    // Expired trial — fire-and-forget status update
    db.update(userSubscriptions)
      .set({ status: "expired", updatedAt: new Date() })
      .where(and(eq(userSubscriptions.userId, userId), eq(userSubscriptions.status, "active"), eq(userSubscriptions.isTrial, true)))
      .catch(() => {});
    sub = undefined as any;
  }

  if (!sub) {
    // Check if user is a team MEMBER and should inherit owner's plan
    const memberRow = await db
      .select({ teamId: teamMembers.teamId, role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.userId, userId), eq(teamMembers.status, "activated")))
      .limit(1);

    if (memberRow.length > 0 && memberRow[0].role !== "owner") {
      const teamRow = await db.select({ ownerId: teams.ownerId }).from(teams).where(eq(teams.id, memberRow[0].teamId)).limit(1);
      if (teamRow.length > 0 && teamRow[0].ownerId !== userId) {
        // Recurse for owner (will hit cache on second call)
        const ownerStatus = await getPublicPlanStatus(teamRow[0].ownerId);
        publicPlanCache.set(userId, { data: ownerStatus, timestamp: Date.now() });
        return ownerStatus;
      }
    }

    publicPlanCache.set(userId, { data: FREE_RESULT, timestamp: Date.now() });
    return FREE_RESULT;
  }

  const result: PublicPlanStatus = {
    isFree: false,
    maxLinks: sub.maxLinks,
    maxPages: sub.maxPages,
    maxBlocks: sub.maxBlocks ?? 20,
    maxSocials: sub.maxSocials ?? 5,
    menuBuilderEnabled: sub.menuBuilderEnabled ?? false,
    whiteLabelEnabled: sub.whiteLabelEnabled ?? false,
    themeCategories: (sub.themeCategories as string[]) ?? ["starter"],
  };

  publicPlanCache.set(userId, { data: result, timestamp: Date.now() });
  return result;
}
