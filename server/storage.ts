import { eq, asc, and, isNull, sql, gte, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users,
  links,
  socials,
  pages,
  blocks,
  analyticsEvents,
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
} from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL,
  ssl: process.env.SUPABASE_POOLER_URL ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<Pick<User, "displayName" | "bio" | "profileImage" | "username" | "onboardingCompleted" | "template">>): Promise<User | undefined>;

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

  recordAnalyticsEvent(data: { userId: string; eventType: string; blockId?: string; pageSlug?: string; referrer?: string }): Promise<void>;
  getAnalyticsSummary(userId: string): Promise<{ totalViews: number; totalClicks: number; viewsByDay: { date: string; count: number }[]; clicksByDay: { date: string; count: number }[]; topBlocks: { blockId: string; clicks: number }[] }>;
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

  async updateUser(id: string, data: Partial<Pick<User, "displayName" | "bio" | "profileImage" | "username" | "onboardingCompleted" | "template">>): Promise<User | undefined> {
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user;
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

  async recordAnalyticsEvent(data: { userId: string; eventType: string; blockId?: string; pageSlug?: string; referrer?: string }): Promise<void> {
    await db.insert(analyticsEvents).values(data);
  }

  async getAnalyticsSummary(userId: string): Promise<{
    totalViews: number;
    totalClicks: number;
    viewsByDay: { date: string; count: number }[];
    clicksByDay: { date: string; count: number }[];
    topBlocks: { blockId: string; clicks: number }[];
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
    const topBlocks = Array.from(blockClickMap.entries())
      .map(([blockId, clicks]) => ({ blockId, clicks }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);

    return { totalViews, totalClicks, viewsByDay, clicksByDay, topBlocks };
  }
}

export const storage = new DatabaseStorage();
