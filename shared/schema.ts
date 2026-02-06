import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  bio: text("bio"),
  profileImage: text("profile_image"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  template: text("template").default("minimal"),
});

export const pages = pgTable("pages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  position: integer("position").notNull().default(0),
  isHome: boolean("is_home").notNull().default(false),
});

export const links = pgTable("links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageId: varchar("page_id").references(() => pages.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const socials = pgTable("socials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
});

export const BLOCK_TYPES = [
  "url_button",
  "email_button",
  "text",
  "divider",
  "video",
  "audio",
  "image",
] as const;

export type BlockType = typeof BLOCK_TYPES[number];

export const blocks = pgTable("blocks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  pageId: varchar("page_id").references(() => pages.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  content: jsonb("content").notNull().default({}),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
});

export const analyticsEvents = pgTable("analytics_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  blockId: varchar("block_id"),
  pageSlug: text("page_slug"),
  referrer: text("referrer"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

export const registerSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, hyphens, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const updateProfileSchema = z.object({
  displayName: z.string().max(100).optional().nullable(),
  bio: z.string().max(500).optional().nullable(),
  profileImage: z.string().optional().nullable(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  onboardingCompleted: z.boolean().optional(),
  template: z.string().optional(),
});

export const insertPageSchema = createInsertSchema(pages).omit({
  id: true,
  userId: true,
});

export const createPageSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
});

export const updatePageSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  isHome: z.boolean().optional(),
});

export const insertLinkSchema = createInsertSchema(links).omit({
  id: true,
  userId: true,
});

export const insertSocialSchema = createInsertSchema(socials).omit({
  id: true,
  userId: true,
});

export const createLinkSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  url: z.string().url("Must be a valid URL"),
  pageId: z.string().optional(),
});

export const updateLinkSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  url: z.string().url().optional(),
  active: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
  pageId: z.string().optional(),
});

export const createSocialSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  url: z.string().default(""),
});

export const updateSocialSchema = z.object({
  url: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Page = typeof pages.$inferSelect;
export type InsertPage = z.infer<typeof insertPageSchema>;
export type InsertLink = z.infer<typeof insertLinkSchema>;
export type Link = typeof links.$inferSelect;
export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  userId: true,
});

export const blockContentSchema = z.object({
  title: z.string().optional(),
  url: z.string().optional(),
  email: z.string().optional(),
  text: z.string().optional(),
  imageUrl: z.string().optional(),
  linkUrl: z.string().optional(),
});

export const createBlockSchema = z.object({
  type: z.enum(BLOCK_TYPES),
  content: blockContentSchema.optional().default({}),
  pageId: z.string().optional(),
});

export const updateBlockSchema = z.object({
  content: blockContentSchema.optional(),
  active: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export type InsertSocial = z.infer<typeof insertSocialSchema>;
export type Social = typeof socials.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type BlockContent = z.infer<typeof blockContentSchema>;
export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
