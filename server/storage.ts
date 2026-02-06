import { eq, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import {
  users,
  links,
  type User,
  type InsertUser,
  type Link,
  type InsertLink,
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
  getLinksByUserId(userId: string): Promise<Link[]>;
  createLink(link: InsertLink & { userId: string }): Promise<Link>;
  updateLink(id: string, userId: string, data: Partial<Pick<Link, "title" | "url" | "active" | "position">>): Promise<Link | undefined>;
  deleteLink(id: string, userId: string): Promise<boolean>;
  getMaxLinkPosition(userId: string): Promise<number>;
  reorderLinks(userId: string, linkIds: string[]): Promise<void>;
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

  async getLinksByUserId(userId: string): Promise<Link[]> {
    return db.select().from(links).where(eq(links.userId, userId)).orderBy(asc(links.position));
  }

  async createLink(link: InsertLink & { userId: string }): Promise<Link> {
    const [created] = await db.insert(links).values(link).returning();
    return created;
  }

  async updateLink(id: string, userId: string, data: Partial<Pick<Link, "title" | "url" | "active" | "position">>): Promise<Link | undefined> {
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
}

export const storage = new DatabaseStorage();
