/**
 * Ultra-optimized profile data loader.
 * Uses a SINGLE SQL query with JSON sub-selects to fetch everything
 * in ONE database round-trip instead of 3 sequential rounds.
 *
 * The query returns: user, team, member, template, owner flags,
 * socials, pages, links, blocks, branches, affiliate, plan status
 * — all via CTEs and correlated JSON subqueries.
 */

import { dbPool } from "./storage";

// ── Types ────────────────────────────────────────────────────────────────────

export interface ProfileResult {
  user: Record<string, any>;
  links: any[];
  blocks: any[];
  socials: any[];
  pages: { id: string; title: string; slug: string; isHome: boolean }[];
  currentPage: { id: string; title: string; slug: string; isHome: boolean } | null;
  teamBranding: Record<string, any> | null;
  affiliateInfo: { isAffiliate: boolean; referralCode?: string };
  whiteLabelEnabled: boolean;
  planRestricted: boolean;
  allowedThemeCategories?: string[];
}

// ── Plan cache ───────────────────────────────────────────────────────────────
const planCache = new Map<string, { data: any; ts: number }>();
const PLAN_TTL = 30_000;

function getCachedPlan(ownerId: string) {
  const c = planCache.get(ownerId);
  return c && Date.now() - c.ts < PLAN_TTL ? c.data : null;
}

function parsePlanRow(row: any) {
  if (!row) return null;
  return {
    isFree: false,
    maxLinks: row.max_links,
    maxPages: row.max_pages,
    maxBlocks: row.max_blocks ?? 20,
    maxSocials: row.max_socials ?? 5,
    menuBuilderEnabled: row.menu_builder_enabled ?? false,
    whiteLabelEnabled: row.white_label_enabled ?? false,
    themeCategories: (row.theme_categories as string[]) ?? ["starter"],
    isTrial: row.is_trial ?? false,
    trialEndsAt: row.trial_ends_at ?? null,
  };
}

const FREE_PLAN = {
  isFree: true,
  maxLinks: 5, maxPages: 1, maxBlocks: 10, maxSocials: 3,
  menuBuilderEnabled: false, whiteLabelEnabled: false,
  themeCategories: ["starter"],
};

// ── Shared helpers ───────────────────────────────────────────────────────────

function buildPublicUser(m: any): Record<string, any> {
  return {
    id: m.user_id,
    username: m.username,
    displayName: m.display_name,
    bio: m.bio,
    profileImage: m.profile_image,
    coverImage: m.cover_image,
    template: m.template,
    accountType: m.account_type,
    teamId: m.team_id,
    onboardingCompleted: m.onboarding_completed,
    emailVerified: m.email_verified ?? false,
    useOriginalSocialColors: m.use_original_social_colors ?? false,
    isDisabled: m.is_disabled,
    businessPhone: m.business_phone,
    contactFormEnabled: m.contact_form_enabled,
    contactFormEmail: m.contact_form_email,
    meetingLink: m.meeting_link,
    showMenuOnProfile: m.show_menu_on_profile,
    showServicesOnProfile: m.show_services_on_profile,
    showProductsOnProfile: m.show_products_on_profile,
    showCompanyOnServices: m.show_company_on_services,
    showCompanyOnProducts: m.show_company_on_products,
    whiteLabelEnabled: m.white_label_enabled,
  };
}

function normalizeLinks(rows: any[]) {
  return (rows || []).map((l: any) => ({
    id: l.id, userId: l.user_id, pageId: l.page_id,
    title: l.title, url: l.url, position: l.position, active: l.active,
  }));
}

function normalizeBlocks(rows: any[]) {
  return (rows || []).map((b: any) => ({
    id: b.id, userId: b.user_id, pageId: b.page_id,
    type: b.type, content: b.content, position: b.position, active: b.active,
  }));
}

function normalizeSocials(rows: any[]) {
  return (rows || []).map((s: any) => ({
    id: s.id, userId: s.user_id, platform: s.platform,
    url: s.url, position: s.position,
  }));
}

function normalizePages(rows: any[]) {
  return (rows || []).map((p: any) => ({
    id: p.id, title: p.title, slug: p.slug, isHome: p.is_home,
  }));
}

function buildTeamBranding(m: any, branches: any[], isOwner: boolean): Record<string, any> {
  const tData: any = m.template_data || {};
  const headBranch = branches.find((b: any) => b.is_head_branch) || null;
  const memberBranch = m.member_branch_id
    ? branches.find((b: any) => b.id === m.member_branch_id) || null
    : null;

  return {
    companyLogo: tData.companyLogo || m.team_logo || undefined,
    coverPhoto: tData.coverPhoto || undefined,
    companyName: tData.companyName || m.team_name || undefined,
    companyPhone: tData.companyPhone || undefined,
    companyEmail: tData.companyEmail || undefined,
    companyWebsite: tData.companyWebsite || m.team_website || undefined,
    companyAddress: tData.companyAddress || undefined,
    companyContact: tData.companyContact || undefined,
    themeColor: tData.themeColor || undefined,
    font: tData.font || undefined,
    jobTitle: m.member_job_title || undefined,
    teamName: m.team_name || undefined,
    memberEmail: m.member_email || undefined,
    memberPhone: m.member_business_phone || undefined,
    companySocials: tData.companySocials || undefined,
    headBranch: headBranch ? { name: headBranch.name, address: headBranch.address, phone: headBranch.phone, email: headBranch.email } : undefined,
    memberBranch: memberBranch ? { name: memberBranch.name, address: memberBranch.address, phone: memberBranch.phone, email: memberBranch.email } : undefined,
    companyProfileUrl: tData.companyProfileUrl || undefined,
    productProfileUrl: tData.productProfileUrl || undefined,
    productUrls: tData.productUrls || undefined,
    companyBrochureUrl: tData.companyBrochureUrl || undefined,
    contactFormEnabled: tData.contactFormEnabled || false,
    contactFormFields: tData.contactFormFields || undefined,
    meetingLink: tData.meetingLink || undefined,
    meetingLinkLabel: tData.meetingLinkLabel || undefined,
    showServicesOnProfile: (isOwner ? m.show_services_on_profile : m.owner_show_services) || false,
    showProductsOnProfile: (isOwner ? m.show_products_on_profile : m.owner_show_products) || false,
    teamSlug: m.team_slug || undefined,
    menuUrl: (isOwner ? m.show_menu_on_profile : m.owner_show_menu) && m.team_slug ? `/${m.team_slug}/menu` : undefined,
  };
}

function applyMemberOverrides(publicUser: Record<string, any>, m: any) {
  if (m.member_business_name) publicUser.displayName = m.member_business_name;
  if (m.member_business_profile_image) publicUser.profileImage = m.member_business_profile_image;
  if (m.member_business_bio) publicUser.bio = m.member_business_bio;
  const tData: any = m.template_data || {};
  if (tData.template) publicUser.template = tData.template;
}

function applyPlanRestrictions(
  publicUser: Record<string, any>,
  plan: any,
  teamBranding: Record<string, any> | null,
  normalizedLinks: any[], normalizedBlocks: any[],
  normalizedSocials: any[], allPages: any[],
) {
  if (!plan.isFree) {
    return {
      links: normalizedLinks, blocks: normalizedBlocks,
      socials: normalizedSocials, pages: allPages, planRestricted: false,
      allowedThemeCategories: plan.themeCategories,
    };
  }
  publicUser.effectiveTemplate = publicUser.template || "minimal";
  publicUser.template = "minimal";
  publicUser.planRestricted = true;
  if (teamBranding && !plan.menuBuilderEnabled) teamBranding.menuUrl = undefined;
  if (teamBranding?.companySocials && Array.isArray(teamBranding.companySocials)) {
    teamBranding.companySocials = teamBranding.companySocials.slice(0, plan.maxSocials);
  }
  return {
    links: normalizedLinks.slice(0, plan.maxLinks),
    blocks: normalizedBlocks.slice(0, plan.maxBlocks),
    socials: normalizedSocials.slice(0, plan.maxSocials),
    pages: allPages.slice(0, plan.maxPages),
    planRestricted: true,
    allowedThemeCategories: ["starter"],
  };
}

// ── Main loader for /api/profile/:username ───────────────────────────────────

export async function loadProfileByUsername(
  username: string,
  pageSlug?: string,
  isPreview?: boolean,
): Promise<ProfileResult | null> {
  if (!dbPool) return null;

  // SINGLE MEGA-QUERY: resolve user + team + member + template + all related data via JSON subqueries
  const { rows } = await dbPool.query(`
    WITH resolved_user AS (
      SELECT u.* FROM users u WHERE u.username = $1
      UNION ALL
      SELECT u.* FROM teams t JOIN users u ON u.id = t.owner_id WHERE t.slug = $1
      LIMIT 1
    ),
    resolved_team AS (
      SELECT t.* FROM teams t
      WHERE t.id = (SELECT team_id FROM resolved_user)
         OR t.owner_id = (SELECT id FROM resolved_user)
         OR t.slug = $1
      LIMIT 1
    ),
    effective_ids AS (
      SELECT
        ru.id AS user_id,
        rt.id AS team_id,
        rt.owner_id AS team_owner_id,
        CASE
          WHEN rt.id IS NOT NULL AND rt.owner_id IS NOT NULL AND rt.owner_id != ru.id
          THEN rt.owner_id
          ELSE ru.id
        END AS effective_user_id
      FROM resolved_user ru LEFT JOIN resolved_team rt ON TRUE
      LIMIT 1
    )
    SELECT
      ru.id AS user_id, ru.username, ru.display_name, ru.bio, ru.profile_image,
      ru.cover_image, ru.template, ru.account_type, ru.team_id,
      ru.onboarding_completed, ru.email_verified, ru.white_label_enabled,
      ru.use_original_social_colors, ru.business_phone, ru.contact_form_enabled,
      ru.contact_form_email, ru.meeting_link, ru.show_menu_on_profile,
      ru.show_services_on_profile, ru.show_products_on_profile,
      ru.show_company_on_services, ru.show_company_on_products, ru.is_disabled,
      rt.id AS team_id_resolved, rt.name AS team_name, rt.slug AS team_slug,
      rt.website_url AS team_website, rt.logo_url AS team_logo, rt.owner_id AS team_owner_id,
      tm.id AS member_id, tm.role AS member_role, tm.job_title AS member_job_title,
      tm.business_name AS member_business_name, tm.business_phone AS member_business_phone,
      tm.business_profile_image AS member_business_profile_image,
      tm.business_bio AS member_business_bio, tm.branch_id AS member_branch_id,
      tm.status AS member_status,
      tt.template_data,
      owner_u.white_label_enabled AS owner_white_label,
      owner_u.show_menu_on_profile AS owner_show_menu,
      owner_u.show_services_on_profile AS owner_show_services,
      owner_u.show_products_on_profile AS owner_show_products,
      -- JSON aggregated subqueries: ALL data in one round trip
      (SELECT COALESCE(json_agg(s ORDER BY s.position), '[]'::json) FROM socials s WHERE s.user_id = ru.id) AS socials_json,
      (SELECT COALESCE(json_agg(p ORDER BY p.position), '[]'::json) FROM (SELECT id, title, slug, is_home, position FROM pages WHERE user_id = ei.effective_user_id) p) AS pages_json,
      (SELECT COALESCE(json_agg(l ORDER BY l.position), '[]'::json) FROM links l WHERE l.user_id = ei.effective_user_id) AS links_json,
      (SELECT COALESCE(json_agg(b ORDER BY b.position), '[]'::json) FROM blocks b WHERE b.user_id = ei.effective_user_id) AS blocks_json,
      (SELECT COALESCE(json_agg(tb), '[]'::json) FROM team_branches tb WHERE tb.team_id = rt.id) AS branches_json,
      (SELECT row_to_json(a) FROM affiliates a WHERE a.user_id = ru.id AND a.is_active = true LIMIT 1) AS affiliate_json,
      (SELECT row_to_json(sub) FROM (
        SELECT pp.max_links, pp.max_pages, pp.max_blocks, pp.max_socials,
               pp.menu_builder_enabled, pp.white_label_enabled, pp.theme_categories,
               us.is_trial, us.trial_ends_at
        FROM user_subscriptions us
        JOIN pricing_plans pp ON pp.id = us.plan_id
        WHERE us.user_id = COALESCE(rt.owner_id, ru.id) AND us.status = 'active'
        LIMIT 1
      ) sub) AS plan_json
    FROM resolved_user ru
    LEFT JOIN resolved_team rt ON TRUE
    LEFT JOIN effective_ids ei ON TRUE
    LEFT JOIN team_members tm ON tm.team_id = rt.id AND tm.user_id = ru.id AND tm.status = 'activated'
    LEFT JOIN team_templates tt ON tt.team_id = rt.id AND tt.is_default = true
    LEFT JOIN users owner_u ON owner_u.id = rt.owner_id AND rt.owner_id != ru.id
    LIMIT 1
  `, [username]);

  if (!rows.length) return null;
  const m = rows[0];

  const userId = m.user_id;
  const teamId = m.team_id_resolved;
  const isTeamProfile = !!(teamId && (m.account_type === "team" || m.member_id));
  const teamOwnerId = m.team_owner_id;
  const isOwner = teamOwnerId === userId;

  // Parse JSON aggregated data (already fetched, no extra queries)
  const allPages = normalizePages(m.pages_json || []);
  const allLinksRaw = m.links_json || [];
  const allBlocksRaw = m.blocks_json || [];
  const branches = m.branches_json || [];

  // Resolve current page
  let currentPage = allPages.find((p) => p.isHome) || allPages[0] || null;
  if (pageSlug) {
    const found = allPages.find((p) => p.slug === pageSlug);
    if (found) currentPage = found;
  }

  // Filter links/blocks by page (in JS, not SQL)
  const pageFilteredLinks = currentPage
    ? allLinksRaw.filter((l: any) => l.page_id === currentPage!.id)
    : allLinksRaw;
  const pageFilteredBlocks = currentPage
    ? allBlocksRaw.filter((b: any) => b.page_id === currentPage!.id)
    : allBlocksRaw;

  // Parse plan status
  const ownerId = teamOwnerId || userId;
  let planStatus = getCachedPlan(ownerId);
  if (!planStatus) {
    const planRow = m.plan_json;
    planStatus = parsePlanRow(planRow);
    if (planStatus && planStatus.isTrial && planStatus.trialEndsAt && new Date(planStatus.trialEndsAt) < new Date()) {
      // Expired trial — fire-and-forget
      dbPool.query(
        `UPDATE user_subscriptions SET status = 'expired', updated_at = NOW()
         WHERE user_id = $1 AND status = 'active' AND is_trial = true`,
        [ownerId]
      ).catch(() => {});
      planStatus = null;
    }
    if (!planStatus) planStatus = FREE_PLAN;
    planCache.set(ownerId, { data: planStatus, ts: Date.now() });
  }

  // Build response
  const publicUser = buildPublicUser(m);
  const normalizedSocials = normalizeSocials(m.socials_json || []);
  const normalizedLinks = normalizeLinks(pageFilteredLinks);
  const normalizedBlocks = normalizeBlocks(pageFilteredBlocks);

  // Team branding
  let teamBranding: Record<string, any> | null = null;
  if (isTeamProfile && teamId) {
    teamBranding = buildTeamBranding(m, branches, isOwner);
    applyMemberOverrides(publicUser, m);
  }

  // White label
  let whiteLabelEnabled = m.white_label_enabled || false;
  if (!whiteLabelEnabled && m.owner_white_label) whiteLabelEnabled = true;

  // Affiliate
  const aff = m.affiliate_json;
  const affiliateInfo = aff && aff.is_active
    ? { isAffiliate: true, referralCode: aff.referral_code }
    : { isAffiliate: false };

  // Apply plan restrictions
  const restricted = applyPlanRestrictions(
    publicUser, planStatus, teamBranding,
    normalizedLinks, normalizedBlocks, normalizedSocials, allPages,
  );

  return {
    user: publicUser,
    links: restricted.links,
    blocks: restricted.blocks,
    socials: restricted.socials,
    pages: restricted.pages,
    currentPage,
    teamBranding,
    affiliateInfo,
    whiteLabelEnabled,
    planRestricted: restricted.planRestricted,
    allowedThemeCategories: restricted.allowedThemeCategories,
  };
}

// ── Loader for /api/profile/:companySlug/:memberUsername ──────────────────────

export async function loadTeamMemberProfile(
  companySlug: string,
  memberUsername: string,
  pageSlug?: string,
): Promise<ProfileResult | null> {
  if (!dbPool) return null;

  // SINGLE MEGA-QUERY for team member profiles
  const { rows } = await dbPool.query(`
    WITH base AS (
      SELECT
        u.id AS user_id, u.username, u.display_name, u.bio, u.profile_image,
        u.cover_image, u.template, u.account_type, u.team_id, u.email,
        u.email_verified, u.white_label_enabled, u.use_original_social_colors,
        u.business_phone, u.contact_form_enabled, u.contact_form_email,
        u.meeting_link, u.show_menu_on_profile, u.show_services_on_profile,
        u.show_products_on_profile, u.is_disabled, u.onboarding_completed,
        t.id AS team_id_resolved, t.name AS team_name, t.slug AS team_slug,
        t.website_url AS team_website, t.logo_url AS team_logo, t.owner_id AS team_owner_id,
        tm.id AS member_id, tm.role AS member_role, tm.job_title AS member_job_title,
        tm.business_name AS member_business_name, tm.business_phone AS member_business_phone,
        tm.business_profile_image AS member_business_profile_image,
        tm.business_bio AS member_business_bio, tm.branch_id AS member_branch_id,
        tm.status AS member_status,
        tt.template_data,
        owner_u.white_label_enabled AS owner_white_label,
        owner_u.show_menu_on_profile AS owner_show_menu,
        owner_u.show_services_on_profile AS owner_show_services,
        owner_u.show_products_on_profile AS owner_show_products,
        t.owner_id AS effective_user_id
      FROM users u
      JOIN teams t ON t.slug = $1
      LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = u.id AND tm.status = 'activated'
      LEFT JOIN team_templates tt ON tt.team_id = t.id AND tt.is_default = true
      LEFT JOIN users owner_u ON owner_u.id = t.owner_id AND t.owner_id != u.id
      WHERE u.username = $2
      LIMIT 1
    )
    SELECT b.*,
      (SELECT COALESCE(json_agg(s ORDER BY s.position), '[]'::json) FROM socials s WHERE s.user_id = b.user_id) AS socials_json,
      (SELECT COALESCE(json_agg(p ORDER BY p.position), '[]'::json) FROM (SELECT id, title, slug, is_home, position FROM pages WHERE user_id = b.effective_user_id) p) AS pages_json,
      (SELECT COALESCE(json_agg(l ORDER BY l.position), '[]'::json) FROM links l WHERE l.user_id = b.effective_user_id) AS links_json,
      (SELECT COALESCE(json_agg(bl ORDER BY bl.position), '[]'::json) FROM blocks bl WHERE bl.user_id = b.effective_user_id) AS blocks_json,
      (SELECT COALESCE(json_agg(tb), '[]'::json) FROM team_branches tb WHERE tb.team_id = b.team_id_resolved) AS branches_json,
      (SELECT row_to_json(sub) FROM (
        SELECT pp.max_links, pp.max_pages, pp.max_blocks, pp.max_socials,
               pp.menu_builder_enabled, pp.white_label_enabled, pp.theme_categories,
               us.is_trial, us.trial_ends_at
        FROM user_subscriptions us
        JOIN pricing_plans pp ON pp.id = us.plan_id
        WHERE us.user_id = b.team_owner_id AND us.status = 'active'
        LIMIT 1
      ) sub) AS plan_json
    FROM base b
    LIMIT 1
  `, [companySlug.toLowerCase(), memberUsername]);

  if (!rows.length) return null;
  const m = rows[0];

  const teamId = m.team_id_resolved;
  if (!teamId) return null;

  // Verify membership
  const isTeamOwner = m.team_owner_id === m.user_id;
  if (!m.member_id && !isTeamOwner && m.team_id !== teamId) return null;
  if (m.member_status && m.member_status !== "activated" && !isTeamOwner) return null;

  // Parse data
  const allPages = normalizePages(m.pages_json || []);
  const allLinksRaw = m.links_json || [];
  const allBlocksRaw = m.blocks_json || [];
  const branches = m.branches_json || [];

  let currentPage = allPages.find((p) => p.isHome) || allPages[0] || null;
  if (pageSlug) {
    const found = allPages.find((p) => p.slug === pageSlug);
    if (found) currentPage = found;
  }

  const pageFilteredLinks = currentPage
    ? allLinksRaw.filter((l: any) => l.page_id === currentPage!.id)
    : allLinksRaw;
  const pageFilteredBlocks = currentPage
    ? allBlocksRaw.filter((b: any) => b.page_id === currentPage!.id)
    : allBlocksRaw;

  // Plan status
  const ownerId = m.team_owner_id;
  let planStatus = getCachedPlan(ownerId);
  if (!planStatus) {
    planStatus = parsePlanRow(m.plan_json);
    if (planStatus && planStatus.isTrial && planStatus.trialEndsAt && new Date(planStatus.trialEndsAt) < new Date()) {
      dbPool.query(
        `UPDATE user_subscriptions SET status = 'expired', updated_at = NOW()
         WHERE user_id = $1 AND status = 'active' AND is_trial = true`,
        [ownerId]
      ).catch(() => {});
      planStatus = null;
    }
    if (!planStatus) planStatus = FREE_PLAN;
    planCache.set(ownerId, { data: planStatus, ts: Date.now() });
  }

  // Build response
  const publicUser = buildPublicUser(m);
  publicUser.emailVerified = m.email_verified ?? false;

  const teamBranding = buildTeamBranding(m, branches, isTeamOwner);
  applyMemberOverrides(publicUser, m);

  const whiteLabelEnabled = m.white_label_enabled || m.owner_white_label || false;

  const normalizedSocials = normalizeSocials(m.socials_json || []);
  const normalizedLinks = normalizeLinks(pageFilteredLinks);
  const normalizedBlocks = normalizeBlocks(pageFilteredBlocks);

  const restricted = applyPlanRestrictions(
    publicUser, planStatus, teamBranding,
    normalizedLinks, normalizedBlocks, normalizedSocials, allPages,
  );

  return {
    user: publicUser,
    links: restricted.links,
    blocks: restricted.blocks,
    socials: restricted.socials,
    pages: restricted.pages,
    currentPage,
    teamBranding,
    affiliateInfo: { isAffiliate: false },
    whiteLabelEnabled,
    planRestricted: restricted.planRestricted,
    allowedThemeCategories: restricted.allowedThemeCategories,
  };
}
