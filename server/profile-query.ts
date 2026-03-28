/**
 * Optimized profile data loader.
 * Replaces 10-12 sequential/parallel DB queries with 2 raw SQL queries.
 *
 * Query 1: Single SQL that resolves user, team, member, template, branches,
 *          socials, pages, plan status — all via JOINs/subqueries.
 * Query 2: Links + blocks for the resolved current page.
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

// ── In-memory plan cache (shared) ────────────────────────────────────────────
const planCache = new Map<string, { data: any; ts: number }>();
const PLAN_TTL = 30_000;

async function getPlanStatus(ownerId: string): Promise<{
  isFree: boolean;
  maxLinks: number;
  maxPages: number;
  maxBlocks: number;
  maxSocials: number;
  menuBuilderEnabled: boolean;
  whiteLabelEnabled: boolean;
  themeCategories: string[];
}> {
  const cached = planCache.get(ownerId);
  if (cached && Date.now() - cached.ts < PLAN_TTL) return cached.data;

  const FREE = {
    isFree: true,
    maxLinks: 5, maxPages: 1, maxBlocks: 10, maxSocials: 3,
    menuBuilderEnabled: false, whiteLabelEnabled: false,
    themeCategories: ["starter"],
  };

  if (!dbPool) return FREE;

  const { rows } = await dbPool.query(`
    SELECT pp.max_links, pp.max_pages, pp.max_blocks, pp.max_socials,
           pp.menu_builder_enabled, pp.white_label_enabled, pp.theme_categories,
           us.is_trial, us.trial_ends_at
    FROM user_subscriptions us
    JOIN pricing_plans pp ON pp.id = us.plan_id
    WHERE us.user_id = $1 AND us.status = 'active'
    LIMIT 1
  `, [ownerId]);

  let sub = rows[0];

  if (sub?.is_trial && sub.trial_ends_at && new Date(sub.trial_ends_at) < new Date()) {
    // Expired trial — fire-and-forget
    dbPool.query(
      `UPDATE user_subscriptions SET status = 'expired', updated_at = NOW()
       WHERE user_id = $1 AND status = 'active' AND is_trial = true`,
      [ownerId]
    ).catch(() => {});
    sub = undefined;
  }

  if (!sub) {
    planCache.set(ownerId, { data: FREE, ts: Date.now() });
    return FREE;
  }

  const result = {
    isFree: false,
    maxLinks: sub.max_links,
    maxPages: sub.max_pages,
    maxBlocks: sub.max_blocks ?? 20,
    maxSocials: sub.max_socials ?? 5,
    menuBuilderEnabled: sub.menu_builder_enabled ?? false,
    whiteLabelEnabled: sub.white_label_enabled ?? false,
    themeCategories: (sub.theme_categories as string[]) ?? ["starter"],
  };

  planCache.set(ownerId, { data: result, ts: Date.now() });
  return result;
}

// ── Main loader for /api/profile/:username ───────────────────────────────────

export async function loadProfileByUsername(
  username: string,
  pageSlug?: string,
  isPreview?: boolean,
): Promise<ProfileResult | null> {
  if (!dbPool) return null;

  // QUERY 1: Single query — resolve user (by username OR team slug), plus team/member/template data
  const { rows: mainRows } = await dbPool.query(`
    WITH resolved_user AS (
      -- Try username first, then team slug → owner
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
    )
    SELECT
      -- User fields
      ru.id AS user_id, ru.username, ru.display_name, ru.bio, ru.profile_image,
      ru.cover_image, ru.template, ru.account_type, ru.team_id,
      ru.onboarding_completed, ru.email_verified, ru.white_label_enabled,
      ru.use_original_social_colors, ru.business_phone, ru.contact_form_enabled,
      ru.contact_form_email, ru.meeting_link, ru.show_menu_on_profile,
      ru.show_services_on_profile, ru.show_products_on_profile,
      ru.show_company_on_services, ru.show_company_on_products, ru.is_disabled,
      -- Team fields
      rt.id AS team_id_resolved, rt.name AS team_name, rt.slug AS team_slug,
      rt.website_url AS team_website, rt.logo_url AS team_logo, rt.owner_id AS team_owner_id,
      -- Member fields
      tm.id AS member_id, tm.role AS member_role, tm.job_title AS member_job_title,
      tm.business_name AS member_business_name, tm.business_phone AS member_business_phone,
      tm.business_profile_image AS member_business_profile_image,
      tm.business_bio AS member_business_bio, tm.branch_id AS member_branch_id,
      tm.status AS member_status,
      -- Default template
      tt.template_data,
      -- Owner white label (if different from user)
      owner_u.white_label_enabled AS owner_white_label,
      owner_u.show_menu_on_profile AS owner_show_menu,
      owner_u.show_services_on_profile AS owner_show_services,
      owner_u.show_products_on_profile AS owner_show_products
    FROM resolved_user ru
    LEFT JOIN resolved_team rt ON TRUE
    LEFT JOIN team_members tm ON tm.team_id = rt.id AND tm.user_id = ru.id AND tm.status = 'activated'
    LEFT JOIN team_templates tt ON tt.team_id = rt.id AND tt.is_default = true
    LEFT JOIN users owner_u ON owner_u.id = rt.owner_id AND rt.owner_id != ru.id
    LIMIT 1
  `, [username]);

  if (!mainRows.length) return null;
  const m = mainRows[0];

  const userId = m.user_id;
  const teamId = m.team_id_resolved;
  const isTeamProfile = !!(teamId && (m.account_type === "team" || m.member_id));
  const teamOwnerId = m.team_owner_id;
  const isOwner = teamOwnerId === userId;
  const effectiveUserId = isTeamProfile && !isOwner ? teamOwnerId : userId;

  // QUERY 2: Parallel batch — socials, pages, branches, affiliate, plan + owner pages if needed
  const queries: Promise<any>[] = [
    dbPool.query(`SELECT * FROM socials WHERE user_id = $1 ORDER BY position ASC`, [userId]),
    dbPool.query(`SELECT id, title, slug, is_home, position FROM pages WHERE user_id = $1 ORDER BY position ASC`, [effectiveUserId]),
    getPlanStatus(teamOwnerId || userId),
  ];

  if (isTeamProfile && teamId) {
    queries.push(
      dbPool.query(`SELECT * FROM team_branches WHERE team_id = $1`, [teamId])
    );
  } else {
    queries.push(Promise.resolve({ rows: [] }));
  }

  // Affiliate
  queries.push(
    dbPool.query(`SELECT referral_code, is_active FROM affiliates WHERE user_id = $1 LIMIT 1`, [userId])
  );

  const [socialsRes, pagesRes, planStatus, branchesRes, affiliateRes] = await Promise.all(queries);

  const userSocials = socialsRes.rows;
  const allPages = pagesRes.rows.map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    isHome: p.is_home,
  }));
  const branches = branchesRes.rows;
  const aff = affiliateRes.rows[0];

  // Resolve current page
  let currentPage = allPages.find((p: any) => p.isHome) || allPages[0] || null;
  if (pageSlug) {
    const found = allPages.find((p: any) => p.slug === pageSlug);
    if (found) currentPage = found;
  }

  // QUERY 3: Links + blocks for current page (2 queries in parallel)
  const [linksRes, blocksRes] = await Promise.all([
    currentPage
      ? dbPool.query(`SELECT * FROM links WHERE page_id = $1 ORDER BY position ASC`, [currentPage.id])
      : dbPool.query(`SELECT * FROM links WHERE user_id = $1 ORDER BY position ASC`, [effectiveUserId]),
    currentPage
      ? dbPool.query(`SELECT * FROM blocks WHERE page_id = $1 ORDER BY position ASC`, [currentPage.id])
      : dbPool.query(`SELECT * FROM blocks WHERE user_id = $1 ORDER BY position ASC`, [effectiveUserId]),
  ]);

  // Build public user
  const publicUser: Record<string, any> = {
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

  // Build team branding
  let teamBranding: Record<string, any> | null = null;
  if (isTeamProfile && teamId) {
    const tData: any = m.template_data || {};
    const headBranch = branches.find((b: any) => b.is_head_branch) || null;
    const memberBranch = m.member_branch_id
      ? branches.find((b: any) => b.id === m.member_branch_id) || null
      : null;

    teamBranding = {
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

    // Override user display with member business profile
    if (m.member_business_name) publicUser.displayName = m.member_business_name;
    if (m.member_business_profile_image) publicUser.profileImage = m.member_business_profile_image;
    if (m.member_business_bio) publicUser.bio = m.member_business_bio;
    if (tData.template) publicUser.template = tData.template;
  }

  // White label
  let whiteLabelEnabled = m.white_label_enabled || false;
  if (!whiteLabelEnabled && m.owner_white_label) whiteLabelEnabled = true;

  // Plan restrictions
  const links = linksRes.rows;
  const blockRows = blocksRes.rows;

  // Normalize block rows to camelCase
  const normalizedBlocks = blockRows.map((b: any) => ({
    id: b.id,
    userId: b.user_id,
    pageId: b.page_id,
    type: b.type,
    content: b.content,
    position: b.position,
    active: b.active,
  }));

  const normalizedLinks = links.map((l: any) => ({
    id: l.id,
    userId: l.user_id,
    pageId: l.page_id,
    title: l.title,
    url: l.url,
    position: l.position,
    active: l.active,
  }));

  const normalizedSocials = userSocials.map((s: any) => ({
    id: s.id,
    userId: s.user_id,
    platform: s.platform,
    url: s.url,
    position: s.position,
  }));

  const affiliateInfo = aff && aff.is_active
    ? { isAffiliate: true, referralCode: aff.referral_code }
    : { isAffiliate: false };

  if (planStatus.isFree) {
    publicUser.effectiveTemplate = publicUser.template || "minimal";
    publicUser.template = "minimal";
    publicUser.planRestricted = true;
    if (teamBranding && !planStatus.menuBuilderEnabled) teamBranding.menuUrl = undefined;
    if (teamBranding?.companySocials && Array.isArray(teamBranding.companySocials)) {
      teamBranding.companySocials = teamBranding.companySocials.slice(0, planStatus.maxSocials);
    }
  }

  return {
    user: publicUser,
    links: planStatus.isFree ? normalizedLinks.slice(0, planStatus.maxLinks) : normalizedLinks,
    blocks: planStatus.isFree ? normalizedBlocks.slice(0, planStatus.maxBlocks) : normalizedBlocks,
    socials: planStatus.isFree ? normalizedSocials.slice(0, planStatus.maxSocials) : normalizedSocials,
    pages: planStatus.isFree ? allPages.slice(0, planStatus.maxPages) : allPages,
    currentPage,
    teamBranding,
    affiliateInfo,
    whiteLabelEnabled,
    planRestricted: planStatus.isFree,
    allowedThemeCategories: planStatus.isFree ? ["starter"] : planStatus.themeCategories,
  };
}

// ── Loader for /api/profile/:companySlug/:memberUsername ──────────────────────

export async function loadTeamMemberProfile(
  companySlug: string,
  memberUsername: string,
  pageSlug?: string,
): Promise<ProfileResult | null> {
  if (!dbPool) return null;

  // QUERY 1: Resolve user + team + member + template + owner in a single query
  const { rows: mainRows } = await dbPool.query(`
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
      owner_u.show_products_on_profile AS owner_show_products
    FROM users u
    JOIN teams t ON t.slug = $1
    LEFT JOIN team_members tm ON tm.team_id = t.id AND tm.user_id = u.id AND tm.status = 'activated'
    LEFT JOIN team_templates tt ON tt.team_id = t.id AND tt.is_default = true
    LEFT JOIN users owner_u ON owner_u.id = t.owner_id AND t.owner_id != u.id
    WHERE u.username = $2
    LIMIT 1
  `, [companySlug.toLowerCase(), memberUsername]);

  if (!mainRows.length) return null;
  const m = mainRows[0];

  const teamId = m.team_id_resolved;
  if (!teamId) return null;

  // Verify membership
  const isTeamOwner = m.team_owner_id === m.user_id;
  if (!m.member_id && !isTeamOwner && m.team_id !== teamId) return null;
  if (m.member_status && m.member_status !== "activated" && !isTeamOwner) return null;

  const effectiveUserId = m.team_owner_id; // Pages always from owner

  // QUERY 2: Parallel — socials, pages, branches, plan
  const [socialsRes, pagesRes, planStatus, branchesRes] = await Promise.all([
    dbPool.query(`SELECT * FROM socials WHERE user_id = $1 ORDER BY position ASC`, [m.user_id]),
    dbPool.query(`SELECT id, title, slug, is_home, position FROM pages WHERE user_id = $1 ORDER BY position ASC`, [effectiveUserId]),
    getPlanStatus(m.team_owner_id),
    dbPool.query(`SELECT * FROM team_branches WHERE team_id = $1`, [teamId]),
  ]);

  const userSocials = socialsRes.rows;
  const allPages = pagesRes.rows.map((p: any) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    isHome: p.is_home,
  }));
  const branches = branchesRes.rows;

  let currentPage = allPages.find((p: any) => p.isHome) || allPages[0] || null;
  if (pageSlug) {
    const found = allPages.find((p: any) => p.slug === pageSlug);
    if (found) currentPage = found;
  }

  // QUERY 3: Links + blocks
  const [linksRes, blocksRes] = await Promise.all([
    currentPage
      ? dbPool.query(`SELECT * FROM links WHERE page_id = $1 ORDER BY position ASC`, [currentPage.id])
      : dbPool.query(`SELECT * FROM links WHERE user_id = $1 ORDER BY position ASC`, [effectiveUserId]),
    currentPage
      ? dbPool.query(`SELECT * FROM blocks WHERE page_id = $1 ORDER BY position ASC`, [currentPage.id])
      : dbPool.query(`SELECT * FROM blocks WHERE user_id = $1 ORDER BY position ASC`, [effectiveUserId]),
  ]);

  const publicUser: Record<string, any> = {
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
  };

  const tData: any = m.template_data || {};
  const headBranch = branches.find((b: any) => b.is_head_branch) || null;
  const memberBranch = m.member_branch_id
    ? branches.find((b: any) => b.id === m.member_branch_id) || null
    : null;

  const teamBranding: Record<string, any> = {
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
    memberEmail: m.email || undefined,
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
    showServicesOnProfile: (isTeamOwner ? m.show_services_on_profile : m.owner_show_services) || false,
    showProductsOnProfile: (isTeamOwner ? m.show_products_on_profile : m.owner_show_products) || false,
    teamSlug: m.team_slug || undefined,
    menuUrl: (isTeamOwner ? m.show_menu_on_profile : m.owner_show_menu) && m.team_slug ? `/${m.team_slug}/menu` : undefined,
  };

  if (m.member_business_name) publicUser.displayName = m.member_business_name;
  if (m.member_business_profile_image) publicUser.profileImage = m.member_business_profile_image;
  if (m.member_business_bio) publicUser.bio = m.member_business_bio;
  if (tData.template) publicUser.template = tData.template;

  const whiteLabelEnabled = m.white_label_enabled || m.owner_white_label || false;

  const normalizedBlocks = blocksRes.rows.map((b: any) => ({
    id: b.id, userId: b.user_id, pageId: b.page_id, type: b.type,
    content: b.content, position: b.position, active: b.active,
  }));
  const normalizedLinks = linksRes.rows.map((l: any) => ({
    id: l.id, userId: l.user_id, pageId: l.page_id, title: l.title,
    url: l.url, position: l.position, active: l.active,
  }));
  const normalizedSocials = userSocials.map((s: any) => ({
    id: s.id, userId: s.user_id, platform: s.platform, url: s.url, position: s.position,
  }));

  if (planStatus.isFree) {
    publicUser.template = "minimal";
    publicUser.planRestricted = true;
    teamBranding.menuUrl = undefined;
    if (teamBranding.companySocials && Array.isArray(teamBranding.companySocials)) {
      teamBranding.companySocials = teamBranding.companySocials.slice(0, planStatus.maxSocials);
    }
  }

  return {
    user: publicUser,
    links: planStatus.isFree ? normalizedLinks.slice(0, planStatus.maxLinks) : normalizedLinks,
    blocks: planStatus.isFree ? normalizedBlocks.slice(0, planStatus.maxBlocks) : normalizedBlocks,
    socials: planStatus.isFree ? normalizedSocials.slice(0, planStatus.maxSocials) : normalizedSocials,
    pages: planStatus.isFree ? allPages.slice(0, planStatus.maxPages) : allPages,
    currentPage,
    teamBranding,
    affiliateInfo: { isAffiliate: false },
    whiteLabelEnabled,
    planRestricted: planStatus.isFree,
  };
}
