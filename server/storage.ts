import { eq, asc, and, or, isNull, sql, gte, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users,
  links,
  socials,
  pages,
  blocks,
  analyticsEvents,
  teams,
  teamMembers,
  teamInvites,
  teamTemplates,
  contacts,
  menuSections,
  menuProducts,
  menuOpeningHours,
  menuSocials,
  type User,
  type InsertUser,
  type Link,
  type InsertLink,
  type Social,
  type InsertSocial,
  type Page,
  type InsertPage,
  type Block,
  type InsertBlock,
  type AnalyticsEvent,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type TeamInvite,
  type TeamTemplate,
  type InsertTeamTemplate,
  type Contact,
  type InsertContact,
  type MenuSection,
  type InsertMenuSection,
  type MenuProduct,
  type InsertMenuProduct,
  type MenuOpeningHour,
  type MenuSocial,
  type InsertMenuSocial,
} from "@shared/schema";
import "dotenv/config";

const dbUrl =
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_POOLER_URL ||
  process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "No database URL found. Set SUPABASE_DB_URL, SUPABASE_POOLER_URL, or DATABASE_URL environment variable."
  );
}

const pool = new pg.Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);

// ── Auto-migrate: add missing columns ─────────────────────────────────────
pool.query(`
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS is_disabled boolean NOT NULL DEFAULT false;
  ALTER TABLE IF EXISTS pricing_plans ADD COLUMN IF NOT EXISTS max_blocks integer NOT NULL DEFAULT 20;
  ALTER TABLE IF EXISTS pricing_plans ADD COLUMN IF NOT EXISTS max_socials integer NOT NULL DEFAULT 5;
  ALTER TABLE IF EXISTS pricing_plans ADD COLUMN IF NOT EXISTS qr_code_enabled boolean NOT NULL DEFAULT false;
  ALTER TABLE IF EXISTS pricing_plans ADD COLUMN IF NOT EXISTS analytics_enabled boolean NOT NULL DEFAULT false;
  ALTER TABLE IF EXISTS pricing_plans ADD COLUMN IF NOT EXISTS custom_templates_enabled boolean NOT NULL DEFAULT false;
  ALTER TABLE IF EXISTS pricing_plans ADD COLUMN IF NOT EXISTS menu_builder_enabled boolean NOT NULL DEFAULT false;
  ALTER TABLE IF EXISTS pricing_plans ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'individual';
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_template text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_display_name text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_profile_image text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_accent_color text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_description text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_phone text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_email text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_address text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_google_maps_url text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_whatsapp text;
  ALTER TABLE IF EXISTS users ADD COLUMN IF NOT EXISTS menu_website text;
  
  CREATE TABLE IF NOT EXISTS menu_sections (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    position integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now()
  );
  
  CREATE TABLE IF NOT EXISTS menu_products (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id varchar NOT NULL REFERENCES menu_sections(id) ON DELETE CASCADE,
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price text,
    image_url text,
    position integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    created_at timestamp NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS menu_opening_hours (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week integer NOT NULL,
    open_time text,
    close_time text,
    is_closed boolean NOT NULL DEFAULT false
  );

  CREATE TABLE IF NOT EXISTS menu_socials (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    platform text NOT NULL,
    url text NOT NULL,
    position integer NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS affiliates (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code text NOT NULL UNIQUE,
    commission_rate numeric(5,2) NOT NULL DEFAULT 10,
    is_active boolean NOT NULL DEFAULT true,
    total_earnings numeric(10,2) NOT NULL DEFAULT 0,
    created_at timestamp NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS affiliate_referrals (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    affiliate_id varchar NOT NULL REFERENCES affiliates(id) ON DELETE CASCADE,
    referred_user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_id varchar REFERENCES payments(id),
    commission_amount numeric(10,2) DEFAULT 0,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamp NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS promo_codes (
    id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    discount_percent numeric(5,2) NOT NULL DEFAULT 10,
    max_uses integer DEFAULT 0,
    current_uses integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    expires_at timestamp,
    created_at timestamp NOT NULL DEFAULT now()
  );
`).catch(() => {/* Columns/tables may already exist */});


export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "displayName" | "bio" | "profileImage" | "coverImage" | "username" | "onboardingCompleted" | "template" | "accountType" | "teamId" | "menuTemplate" | "menuDisplayName" | "menuProfileImage" | "menuAccentColor" | "menuDescription" | "menuPhone" | "menuEmail" | "menuAddress" | "menuGoogleMapsUrl" | "menuWhatsapp" | "menuWebsite">>): Promise<User | undefined>;

  getPagesByUserId(userId: string): Promise<Page[]>;
  getPageById(id: string): Promise<Page | undefined>;
  getHomePageByUserId(userId: string): Promise<Page | undefined>;
  createPage(page: InsertPage & { userId: string }): Promise<Page>;
  updatePage(id: string, userId: string, data: Partial<Pick<Page, "title" | "slug" | "isHome">>): Promise<Page | undefined>;
  deletePage(id: string, userId: string): Promise<boolean>;
  ensureHomePage(userId: string): Promise<Page>;

  getLinksByUserId(userId: string): Promise<Link[]>;
  getLinksByPageId(pageId: string): Promise<Link[]>;
  createLink(link: InsertLink & { userId: string }): Promise<Link>;
  updateLink(id: string, userId: string, data: Partial<Pick<Link, "title" | "url" | "active" | "position" | "pageId">>): Promise<Link | undefined>;
  deleteLink(id: string, userId: string): Promise<boolean>;
  getMaxLinkPosition(userId: string): Promise<number>;
  getMaxLinkPositionByPage(pageId: string): Promise<number>;
  reorderLinks(userId: string, linkIds: string[]): Promise<void>;

  getSocialsByUserId(userId: string): Promise<Social[]>;
  createSocial(social: InsertSocial & { userId: string }): Promise<Social>;
  updateSocial(id: string, userId: string, data: Partial<Pick<Social, "url" | "position">>): Promise<Social | undefined>;
  deleteSocial(id: string, userId: string): Promise<boolean>;

  getBlocksByPageId(pageId: string): Promise<Block[]>;
  getBlocksByUserId(userId: string): Promise<Block[]>;
  createBlock(block: InsertBlock & { userId: string }): Promise<Block>;
  updateBlock(id: string, userId: string, data: Partial<Pick<Block, "content" | "active" | "position">>): Promise<Block | undefined>;
  deleteBlock(id: string, userId: string): Promise<boolean>;
  getMaxBlockPositionByPage(pageId: string): Promise<number>;
  reorderBlocks(userId: string, blockIds: string[]): Promise<void>;

  updateUserPassword(id: string, hashedPassword: string): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;

  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: string): Promise<Team | undefined>;
  getTeamByOwnerId(ownerId: string): Promise<Team | undefined>;
  updateTeam(id: string, data: Partial<Pick<Team, "name" | "size" | "websiteUrl" | "logoUrl">>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<boolean>;

  getTeamMembers(teamId: string): Promise<(TeamMember & { user: Pick<User, "id" | "username" | "email" | "displayName" | "profileImage"> })[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: string, teamId: string, data: Partial<Pick<TeamMember, "role" | "jobTitle" | "status">>): Promise<TeamMember | undefined>;
  removeTeamMember(id: string, teamId: string): Promise<boolean>;
  getTeamMemberByUserId(teamId: string, userId: string): Promise<TeamMember | undefined>;

  createTeamInvites(invites: { teamId: string; email: string; role: string; invitedById: string; token: string }[]): Promise<TeamInvite[]>;
  getTeamInvites(teamId: string): Promise<TeamInvite[]>;
  getTeamInviteByToken(token: string): Promise<TeamInvite | undefined>;
  updateTeamInviteStatus(id: string, status: string): Promise<TeamInvite | undefined>;
  deleteTeamInvite(id: string, teamId: string): Promise<boolean>;

  getTeamTemplates(teamId: string): Promise<TeamTemplate[]>;
  createTeamTemplate(template: InsertTeamTemplate): Promise<TeamTemplate>;
  updateTeamTemplate(id: string, teamId: string, data: Partial<Pick<TeamTemplate, "name" | "description" | "templateData" | "isDefault">>): Promise<TeamTemplate | undefined>;
  deleteTeamTemplate(id: string, teamId: string): Promise<boolean>;
  duplicateTeamTemplate(id: string, teamId: string): Promise<TeamTemplate | undefined>;

  getContacts(params: { teamId?: string; ownerId?: string; type?: string }): Promise<Contact[]>;
  createContact(contact: InsertContact): Promise<Contact>;
  updateContact(id: string, ownerId: string, data: Partial<Pick<Contact, "name" | "email" | "phone" | "company" | "jobTitle" | "notes" | "type">>): Promise<Contact | undefined>;
  deleteContact(id: string, ownerId: string): Promise<boolean>;

  // Menu Builder
  getMenuSectionsByUserId(userId: string): Promise<MenuSection[]>;
  createMenuSection(section: InsertMenuSection & { userId: string }): Promise<MenuSection>;
  updateMenuSection(id: string, userId: string, data: Partial<Pick<MenuSection, "name" | "description" | "active" | "position">>): Promise<MenuSection | undefined>;
  deleteMenuSection(id: string, userId: string): Promise<boolean>;
  getMenuProductsBySectionId(sectionId: string): Promise<MenuProduct[]>;
  getMenuProductsByUserId(userId: string): Promise<MenuProduct[]>;
  createMenuProduct(product: InsertMenuProduct & { userId: string }): Promise<MenuProduct>;
  updateMenuProduct(id: string, userId: string, data: Partial<Pick<MenuProduct, "name" | "description" | "price" | "imageUrl" | "active" | "position">>): Promise<MenuProduct | undefined>;
  deleteMenuProduct(id: string, userId: string): Promise<boolean>;

  // Opening Hours
  getOpeningHoursByUserId(userId: string): Promise<MenuOpeningHour[]>;
  upsertOpeningHours(userId: string, hours: { dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }[]): Promise<MenuOpeningHour[]>;

  // Menu Socials
  getMenuSocialsByUserId(userId: string): Promise<MenuSocial[]>;
  createMenuSocial(social: InsertMenuSocial & { userId: string }): Promise<MenuSocial>;
  updateMenuSocial(id: string, userId: string, data: Partial<Pick<MenuSocial, "url" | "position">>): Promise<MenuSocial | undefined>;
  deleteMenuSocial(id: string, userId: string): Promise<boolean>;

  recordAnalyticsEvent(data: { userId: string; eventType: string; blockId?: string; pageSlug?: string; referrer?: string }): Promise<void>;
  getAnalyticsSummary(userId: string): Promise<{
    totalViews: number;
    totalClicks: number;
    viewsByDay: { date: string; count: number }[];
    clicksByDay: { date: string; count: number }[];
    topBlocks: { blockId: string; title: string; type: string; clicks: number }[];
    topReferrers: { referrer: string; count: number }[];
    topPages: { pageSlug: string; views: number }[];
  }>;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    || "page";
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<Pick<User, "displayName" | "bio" | "profileImage" | "coverImage" | "username" | "onboardingCompleted" | "template" | "accountType" | "teamId" | "menuTemplate" | "menuDisplayName" | "menuProfileImage" | "menuAccentColor" | "menuDescription" | "menuPhone" | "menuEmail" | "menuAddress" | "menuGoogleMapsUrl" | "menuWhatsapp" | "menuWebsite">>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
  }

  async updateUserPassword(id: string, hashedPassword: string): Promise<boolean> {
    const result = await db.update(users).set({ password: hashedPassword }).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async getPagesByUserId(userId: string): Promise<Page[]> {
    return db.select().from(pages).where(eq(pages.userId, userId)).orderBy(asc(pages.position));
  }

  async getPageById(id: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(eq(pages.id, id));
    return page;
  }

  async getHomePageByUserId(userId: string): Promise<Page | undefined> {
    const [page] = await db.select().from(pages).where(and(eq(pages.userId, userId), eq(pages.isHome, true)));
    return page;
  }

  async createPage(page: InsertPage & { userId: string }): Promise<Page> {
    const existing = await this.getPagesByUserId(page.userId);
    const maxPos = existing.length > 0 ? Math.max(...existing.map((p) => p.position)) : -1;
    let slug = slugify(page.title);
    const existingSlugs = new Set(existing.map((p) => p.slug));
    let suffix = 1;
    while (existingSlugs.has(slug)) {
      slug = `${slugify(page.title)}-${suffix++}`;
    }
    const isHome = existing.length === 0;
    const [created] = await db.insert(pages).values({
      ...page,
      slug,
      position: maxPos + 1,
      isHome,
    }).returning();
    return created;
  }

  async updatePage(id: string, userId: string, data: Partial<Pick<Page, "title" | "slug" | "isHome">>): Promise<Page | undefined> {
    const existing = await db.select().from(pages).where(eq(pages.id, id));
    if (!existing.length || existing[0].userId !== userId) return undefined;

    const updateData: any = { ...data };
    if (data.title && !data.slug) {
      let slug = slugify(data.title);
      const allPages = await this.getPagesByUserId(userId);
      const existingSlugs = new Set(allPages.filter((p) => p.id !== id).map((p) => p.slug));
      let suffix = 1;
      while (existingSlugs.has(slug)) {
        slug = `${slugify(data.title)}-${suffix++}`;
      }
      updateData.slug = slug;
    }

    if (data.isHome) {
      await db.update(pages).set({ isHome: false }).where(eq(pages.userId, userId));
    }

    const [updated] = await db.update(pages).set(updateData).where(eq(pages.id, id)).returning();
    return updated;
  }

  async deletePage(id: string, userId: string): Promise<boolean> {
    const existing = await db.select().from(pages).where(eq(pages.id, id));
    if (!existing.length || existing[0].userId !== userId) return false;
    if (existing[0].isHome) return false;
    await db.delete(links).where(eq(links.pageId, id));
    await db.delete(pages).where(eq(pages.id, id));
    return true;
  }

  async ensureHomePage(userId: string): Promise<Page> {
    const home = await this.getHomePageByUserId(userId);
    if (home) return home;
    return this.createPage({ title: "Home", slug: "home", position: 0, isHome: true, userId });
  }

  async getLinksByUserId(userId: string): Promise<Link[]> {
    return db.select().from(links).where(eq(links.userId, userId)).orderBy(asc(links.position));
  }

  async getLinksByPageId(pageId: string): Promise<Link[]> {
    return db.select().from(links).where(eq(links.pageId, pageId)).orderBy(asc(links.position));
  }

  async createLink(link: InsertLink & { userId: string }): Promise<Link> {
    const [created] = await db.insert(links).values(link).returning();
    return created;
  }

  async updateLink(id: string, userId: string, data: Partial<Pick<Link, "title" | "url" | "active" | "position" | "pageId">>): Promise<Link | undefined> {
    const existing = await db.select().from(links).where(eq(links.id, id));
    if (!existing.length || existing[0].userId !== userId) return undefined;
    const [updated] = await db
      .update(links)
      .set(data)
      .where(eq(links.id, id))
      .returning();
    return updated;
  }

  async deleteLink(id: string, userId: string): Promise<boolean> {
    const existing = await db.select().from(links).where(eq(links.id, id));
    if (!existing.length || existing[0].userId !== userId) return false;
    await db.delete(links).where(eq(links.id, id));
    return true;
  }

  async getMaxLinkPosition(userId: string): Promise<number> {
    const userLinks = await this.getLinksByUserId(userId);
    if (userLinks.length === 0) return -1;
    return Math.max(...userLinks.map((l) => l.position));
  }

  async getMaxLinkPositionByPage(pageId: string): Promise<number> {
    const pageLinks = await this.getLinksByPageId(pageId);
    if (pageLinks.length === 0) return -1;
    return Math.max(...pageLinks.map((l) => l.position));
  }

  async reorderLinks(userId: string, linkIds: string[]): Promise<void> {
    const userLinks = await this.getLinksByUserId(userId);
    const userLinkIds = new Set(userLinks.map((l) => l.id));
    for (const id of linkIds) {
      if (!userLinkIds.has(id)) return;
    }
    for (let i = 0; i < linkIds.length; i++) {
      await db
        .update(links)
        .set({ position: i })
        .where(eq(links.id, linkIds[i]));
    }
  }

  async getSocialsByUserId(userId: string): Promise<Social[]> {
    return db.select().from(socials).where(eq(socials.userId, userId)).orderBy(asc(socials.position));
  }

  async createSocial(social: InsertSocial & { userId: string }): Promise<Social> {
    const existing = await this.getSocialsByUserId(social.userId);
    const maxPos = existing.length > 0 ? Math.max(...existing.map((s) => s.position)) : -1;
    const [created] = await db.insert(socials).values({ ...social, position: maxPos + 1 }).returning();
    return created;
  }

  async updateSocial(id: string, userId: string, data: Partial<Pick<Social, "url" | "position">>): Promise<Social | undefined> {
    const existing = await db.select().from(socials).where(eq(socials.id, id));
    if (!existing.length || existing[0].userId !== userId) return undefined;
    const [updated] = await db.update(socials).set(data).where(eq(socials.id, id)).returning();
    return updated;
  }

  async deleteSocial(id: string, userId: string): Promise<boolean> {
    const existing = await db.select().from(socials).where(eq(socials.id, id));
    if (!existing.length || existing[0].userId !== userId) return false;
    await db.delete(socials).where(eq(socials.id, id));
    return true;
  }

  async getBlocksByPageId(pageId: string): Promise<Block[]> {
    return db.select().from(blocks).where(eq(blocks.pageId, pageId)).orderBy(asc(blocks.position));
  }

  async getBlocksByUserId(userId: string): Promise<Block[]> {
    return db.select().from(blocks).where(eq(blocks.userId, userId)).orderBy(asc(blocks.position));
  }

  async createBlock(block: InsertBlock & { userId: string }): Promise<Block> {
    const [created] = await db.insert(blocks).values(block).returning();
    return created;
  }

  async updateBlock(id: string, userId: string, data: Partial<Pick<Block, "content" | "active" | "position">>): Promise<Block | undefined> {
    const existing = await db.select().from(blocks).where(eq(blocks.id, id));
    if (!existing.length || existing[0].userId !== userId) return undefined;
    const [updated] = await db.update(blocks).set(data).where(eq(blocks.id, id)).returning();
    return updated;
  }

  async deleteBlock(id: string, userId: string): Promise<boolean> {
    const existing = await db.select().from(blocks).where(eq(blocks.id, id));
    if (!existing.length || existing[0].userId !== userId) return false;
    await db.delete(blocks).where(eq(blocks.id, id));
    return true;
  }

  async getMaxBlockPositionByPage(pageId: string): Promise<number> {
    const pageBlocks = await this.getBlocksByPageId(pageId);
    if (pageBlocks.length === 0) return -1;
    return Math.max(...pageBlocks.map((b) => b.position));
  }

  async reorderBlocks(userId: string, blockIds: string[]): Promise<void> {
    const userBlocks = await this.getBlocksByUserId(userId);
    const userBlockIds = new Set(userBlocks.map((b) => b.id));
    for (const id of blockIds) {
      if (!userBlockIds.has(id)) return;
    }
    for (let i = 0; i < blockIds.length; i++) {
      await db.update(blocks).set({ position: i }).where(eq(blocks.id, blockIds[i]));
    }
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [created] = await db.insert(teams).values(team).returning();
    return created;
  }

  async getTeam(id: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeamByOwnerId(ownerId: string): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.ownerId, ownerId));
    return team;
  }

  async updateTeam(id: string, data: Partial<Pick<Team, "name" | "size" | "websiteUrl" | "logoUrl">>): Promise<Team | undefined> {
    const [updated] = await db.update(teams).set(data).where(eq(teams.id, id)).returning();
    return updated;
  }

  async deleteTeam(id: string): Promise<boolean> {
    const result = await db.delete(teams).where(eq(teams.id, id)).returning();
    return result.length > 0;
  }

  async getTeamMembers(teamId: string): Promise<(TeamMember & { user: Pick<User, "id" | "username" | "email" | "displayName" | "profileImage"> })[]> {
    const rows = await db
      .select({
        id: teamMembers.id,
        teamId: teamMembers.teamId,
        userId: teamMembers.userId,
        role: teamMembers.role,
        jobTitle: teamMembers.jobTitle,
        status: teamMembers.status,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
          displayName: users.displayName,
          profileImage: users.profileImage,
        },
      })
      .from(teamMembers)
      .leftJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, teamId));
    return rows as (TeamMember & { user: Pick<User, "id" | "username" | "email" | "displayName" | "profileImage"> })[];
  }

  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [created] = await db.insert(teamMembers).values(member).returning();
    return created;
  }

  async updateTeamMember(id: string, teamId: string, data: Partial<Pick<TeamMember, "role" | "jobTitle" | "status">>): Promise<TeamMember | undefined> {
    const [updated] = await db
      .update(teamMembers)
      .set(data)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.teamId, teamId)))
      .returning();
    return updated;
  }

  async removeTeamMember(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.id, id), eq(teamMembers.teamId, teamId)))
      .returning();
    return result.length > 0;
  }

  async getTeamMemberByUserId(teamId: string, userId: string): Promise<TeamMember | undefined> {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return member;
  }

  async createTeamInvites(invites: { teamId: string; email: string; role: string; invitedById: string; token: string }[]): Promise<TeamInvite[]> {
    const created = await db.insert(teamInvites).values(invites).returning();
    return created;
  }

  async getTeamInvites(teamId: string): Promise<TeamInvite[]> {
    return db.select().from(teamInvites).where(eq(teamInvites.teamId, teamId)).orderBy(asc(teamInvites.createdAt));
  }

  async getTeamInviteByToken(token: string): Promise<TeamInvite | undefined> {
    const [invite] = await db.select().from(teamInvites).where(eq(teamInvites.token, token));
    return invite;
  }

  async updateTeamInviteStatus(id: string, status: string): Promise<TeamInvite | undefined> {
    const [updated] = await db.update(teamInvites).set({ status }).where(eq(teamInvites.id, id)).returning();
    return updated;
  }

  async deleteTeamInvite(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .delete(teamInvites)
      .where(and(eq(teamInvites.id, id), eq(teamInvites.teamId, teamId)))
      .returning();
    return result.length > 0;
  }

  async getTeamTemplates(teamId: string): Promise<TeamTemplate[]> {
    return db.select().from(teamTemplates).where(eq(teamTemplates.teamId, teamId));
  }

  async createTeamTemplate(template: InsertTeamTemplate): Promise<TeamTemplate> {
    const [created] = await db.insert(teamTemplates).values(template).returning();
    return created;
  }

  async updateTeamTemplate(id: string, teamId: string, data: Partial<Pick<TeamTemplate, "name" | "description" | "templateData" | "isDefault">>): Promise<TeamTemplate | undefined> {
    const [updated] = await db
      .update(teamTemplates)
      .set(data)
      .where(and(eq(teamTemplates.id, id), eq(teamTemplates.teamId, teamId)))
      .returning();
    return updated;
  }

  async deleteTeamTemplate(id: string, teamId: string): Promise<boolean> {
    const result = await db
      .delete(teamTemplates)
      .where(and(eq(teamTemplates.id, id), eq(teamTemplates.teamId, teamId)))
      .returning();
    return result.length > 0;
  }

  async duplicateTeamTemplate(id: string, teamId: string): Promise<TeamTemplate | undefined> {
    const [existing] = await db
      .select()
      .from(teamTemplates)
      .where(and(eq(teamTemplates.id, id), eq(teamTemplates.teamId, teamId)));
    if (!existing) return undefined;
    const [created] = await db
      .insert(teamTemplates)
      .values({
        teamId: existing.teamId,
        name: `${existing.name} (Copy)`,
        description: existing.description,
        templateData: existing.templateData,
        isDefault: false,
      })
      .returning();
    return created;
  }

  async getContacts(params: { teamId?: string; ownerId?: string; type?: string }): Promise<Contact[]> {
    const conditions = [];
    if (params.teamId) conditions.push(eq(contacts.teamId, params.teamId));
    if (params.ownerId) conditions.push(eq(contacts.ownerId, params.ownerId));
    if (params.type) conditions.push(eq(contacts.type, params.type));

    if (conditions.length === 0) return [];

    const filterConditions = [];
    if (params.teamId && params.ownerId) {
      filterConditions.push(or(eq(contacts.teamId, params.teamId), eq(contacts.ownerId, params.ownerId)));
    } else if (params.teamId) {
      filterConditions.push(eq(contacts.teamId, params.teamId));
    } else if (params.ownerId) {
      filterConditions.push(eq(contacts.ownerId, params.ownerId));
    }
    if (params.type) {
      filterConditions.push(eq(contacts.type, params.type));
    }

    return db.select().from(contacts).where(and(...filterConditions)).orderBy(asc(contacts.createdAt));
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [created] = await db.insert(contacts).values(contact).returning();
    return created;
  }

  async updateContact(id: string, ownerId: string, data: Partial<Pick<Contact, "name" | "email" | "phone" | "company" | "jobTitle" | "notes" | "type">>): Promise<Contact | undefined> {
    const [updated] = await db
      .update(contacts)
      .set(data)
      .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)))
      .returning();
    return updated;
  }

  async deleteContact(id: string, ownerId: string): Promise<boolean> {
    const result = await db
      .delete(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.ownerId, ownerId)))
      .returning();
    return result.length > 0;
  }

  async recordAnalyticsEvent(data: { userId: string; eventType: string; blockId?: string; pageSlug?: string; referrer?: string }): Promise<void> {
    await db.insert(analyticsEvents).values(data);
  }

  async getAnalyticsSummary(userId: string): Promise<{
    totalViews: number;
    totalClicks: number;
    viewsByDay: { date: string; count: number }[];
    clicksByDay: { date: string; count: number }[];
    topBlocks: { blockId: string; title: string; type: string; clicks: number }[];
    topReferrers: { referrer: string; count: number }[];
    topPages: { pageSlug: string; views: number }[];
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allEvents = await db
      .select()
      .from(analyticsEvents)
      .where(and(eq(analyticsEvents.userId, userId), gte(analyticsEvents.createdAt, thirtyDaysAgo)));

    const totalViews = allEvents.filter((e) => e.eventType === "page_view").length;
    const totalClicks = allEvents.filter((e) => e.eventType === "click").length;

    const viewsByDayMap = new Map<string, number>();
    const clicksByDayMap = new Map<string, number>();

    for (const event of allEvents) {
      const day = event.createdAt.toISOString().slice(0, 10);
      if (event.eventType === "page_view") {
        viewsByDayMap.set(day, (viewsByDayMap.get(day) || 0) + 1);
      } else if (event.eventType === "click") {
        clicksByDayMap.set(day, (clicksByDayMap.get(day) || 0) + 1);
      }
    }

    const viewsByDay = Array.from(viewsByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const clicksByDay = Array.from(clicksByDayMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const blockClickMap = new Map<string, number>();
    for (const event of allEvents) {
      if (event.eventType === "click" && event.blockId) {
        blockClickMap.set(event.blockId, (blockClickMap.get(event.blockId) || 0) + 1);
      }
    }
    const topBlockIds = Array.from(blockClickMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const userBlocks = await db.select().from(blocks).where(eq(blocks.userId, userId));
    const blockMap = new Map(userBlocks.map((b) => [b.id, b]));

    const topBlocks = topBlockIds.map(([blockId, clicks]) => {
      const block = blockMap.get(blockId);
      const content = block?.content as any;
      let title = "Deleted block";
      if (block) {
        if (block.type === "url_button") title = content?.title || content?.url || "Link";
        else if (block.type === "email_button") title = content?.title || content?.email || "Email";
        else if (block.type === "text") title = (content?.text || "Text").slice(0, 40);
        else if (block.type === "video") title = content?.title || "Video";
        else if (block.type === "audio") title = content?.title || "Audio";
        else if (block.type === "image") title = content?.alt || "Image";
        else if (block.type === "divider") title = "Divider";
        else title = block.type;
      }
      return { blockId, title, type: block?.type || "unknown", clicks };
    });

    const referrerMap = new Map<string, number>();
    for (const event of allEvents) {
      if (event.referrer) {
        let ref = event.referrer;
        try { ref = new URL(event.referrer).hostname; } catch {}
        referrerMap.set(ref, (referrerMap.get(ref) || 0) + 1);
      }
    }
    const topReferrers = Array.from(referrerMap.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const pageViewMap = new Map<string, number>();
    for (const event of allEvents) {
      if (event.eventType === "page_view" && event.pageSlug) {
        pageViewMap.set(event.pageSlug, (pageViewMap.get(event.pageSlug) || 0) + 1);
      }
    }
    const topPages = Array.from(pageViewMap.entries())
      .map(([pageSlug, views]) => ({ pageSlug, views }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return { totalViews, totalClicks, viewsByDay, clicksByDay, topBlocks, topReferrers, topPages };
  }

  // ── Menu Builder ──────────────────────────────────────────────────────────
  async getMenuSectionsByUserId(userId: string): Promise<MenuSection[]> {
    return db.select().from(menuSections).where(eq(menuSections.userId, userId)).orderBy(asc(menuSections.position));
  }

  async createMenuSection(section: InsertMenuSection & { userId: string }): Promise<MenuSection> {
    const existing = await this.getMenuSectionsByUserId(section.userId);
    const maxPos = existing.length > 0 ? Math.max(...existing.map(s => s.position)) : -1;
    const [created] = await db.insert(menuSections).values({ ...section, position: maxPos + 1 }).returning();
    return created;
  }

  async updateMenuSection(id: string, userId: string, data: Partial<Pick<MenuSection, "name" | "description" | "active" | "position">>): Promise<MenuSection | undefined> {
    const [existing] = await db.select().from(menuSections).where(eq(menuSections.id, id));
    if (!existing || existing.userId !== userId) return undefined;
    const [updated] = await db.update(menuSections).set(data).where(eq(menuSections.id, id)).returning();
    return updated;
  }

  async deleteMenuSection(id: string, userId: string): Promise<boolean> {
    const [existing] = await db.select().from(menuSections).where(eq(menuSections.id, id));
    if (!existing || existing.userId !== userId) return false;
    await db.delete(menuProducts).where(eq(menuProducts.sectionId, id));
    await db.delete(menuSections).where(eq(menuSections.id, id));
    return true;
  }

  async getMenuProductsBySectionId(sectionId: string): Promise<MenuProduct[]> {
    return db.select().from(menuProducts).where(eq(menuProducts.sectionId, sectionId)).orderBy(asc(menuProducts.position));
  }

  async getMenuProductsByUserId(userId: string): Promise<MenuProduct[]> {
    return db.select().from(menuProducts).where(eq(menuProducts.userId, userId)).orderBy(asc(menuProducts.position));
  }

  async createMenuProduct(product: InsertMenuProduct & { userId: string }): Promise<MenuProduct> {
    const existing = await this.getMenuProductsBySectionId(product.sectionId);
    const maxPos = existing.length > 0 ? Math.max(...existing.map(p => p.position)) : -1;
    const [created] = await db.insert(menuProducts).values({ ...product, position: maxPos + 1 }).returning();
    return created;
  }

  async updateMenuProduct(id: string, userId: string, data: Partial<Pick<MenuProduct, "name" | "description" | "price" | "imageUrl" | "active" | "position">>): Promise<MenuProduct | undefined> {
    const [existing] = await db.select().from(menuProducts).where(eq(menuProducts.id, id));
    if (!existing || existing.userId !== userId) return undefined;
    const [updated] = await db.update(menuProducts).set(data).where(eq(menuProducts.id, id)).returning();
    return updated;
  }

  async deleteMenuProduct(id: string, userId: string): Promise<boolean> {
    const [existing] = await db.select().from(menuProducts).where(eq(menuProducts.id, id));
    if (!existing || existing.userId !== userId) return false;
    await db.delete(menuProducts).where(eq(menuProducts.id, id));
    return true;
  }

  // ── Opening Hours ──────────────────────────────────────────────────────────
  async getOpeningHoursByUserId(userId: string): Promise<MenuOpeningHour[]> {
    return db.select().from(menuOpeningHours).where(eq(menuOpeningHours.userId, userId)).orderBy(asc(menuOpeningHours.dayOfWeek));
  }

  async upsertOpeningHours(userId: string, hours: { dayOfWeek: number; openTime: string | null; closeTime: string | null; isClosed: boolean }[]): Promise<MenuOpeningHour[]> {
    // Delete existing and re-insert
    await db.delete(menuOpeningHours).where(eq(menuOpeningHours.userId, userId));
    if (hours.length === 0) return [];
    const rows = hours.map(h => ({ userId, dayOfWeek: h.dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed }));
    const created = await db.insert(menuOpeningHours).values(rows).returning();
    return created;
  }

  // ── Menu Socials ──────────────────────────────────────────────────────────
  async getMenuSocialsByUserId(userId: string): Promise<MenuSocial[]> {
    return db.select().from(menuSocials).where(eq(menuSocials.userId, userId)).orderBy(asc(menuSocials.position));
  }

  async createMenuSocial(social: InsertMenuSocial & { userId: string }): Promise<MenuSocial> {
    const existing = await this.getMenuSocialsByUserId(social.userId);
    const maxPos = existing.length > 0 ? Math.max(...existing.map((s) => s.position)) : -1;
    const [created] = await db.insert(menuSocials).values({ ...social, position: maxPos + 1 }).returning();
    return created;
  }

  async updateMenuSocial(id: string, userId: string, data: Partial<Pick<MenuSocial, "url" | "position">>): Promise<MenuSocial | undefined> {
    const [existing] = await db.select().from(menuSocials).where(eq(menuSocials.id, id));
    if (!existing || existing.userId !== userId) return undefined;
    const [updated] = await db.update(menuSocials).set(data).where(eq(menuSocials.id, id)).returning();
    return updated;
  }

  async deleteMenuSocial(id: string, userId: string): Promise<boolean> {
    const [existing] = await db.select().from(menuSocials).where(eq(menuSocials.id, id));
    if (!existing || existing.userId !== userId) return false;
    await db.delete(menuSocials).where(eq(menuSocials.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
