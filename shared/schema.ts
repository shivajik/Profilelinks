import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
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
  coverImage: text("cover_image"),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  template: text("template").default("minimal"),
  accountType: text("account_type").notNull().default("personal"),
  teamId: varchar("team_id"),
  isDisabled: boolean("is_disabled").notNull().default(false),
  menuTemplate: text("menu_template"),
  menuDisplayName: text("menu_display_name"),
  menuProfileImage: text("menu_profile_image"),
  menuAccentColor: text("menu_accent_color"),
  menuDescription: text("menu_description"),
  menuPhone: text("menu_phone"),
  menuEmail: text("menu_email"),
  menuAddress: text("menu_address"),
  menuGoogleMapsUrl: text("menu_google_maps_url"),
  menuWhatsapp: text("menu_whatsapp"),
  menuWebsite: text("menu_website"),
});

// ── Menu Social Links ──────────────────────────────────────────────────────
export const menuSocials = pgTable("menu_socials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  platform: text("platform").notNull(),
  url: text("url").notNull(),
  position: integer("position").notNull().default(0),
});

// ── Menu Opening Hours ──────────────────────────────────────────────────────
export const menuOpeningHours = pgTable("menu_opening_hours", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Monday, 6=Sunday
  openTime: text("open_time"), // "09:00"
  closeTime: text("close_time"), // "22:00"
  isClosed: boolean("is_closed").notNull().default(false),
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

export const TEAM_SIZES = [
  "1-5",
  "6-20",
  "21-50",
  "51-200",
  "201-500",
  "500+",
] as const;

export type TeamSize = typeof TEAM_SIZES[number];

export const TEAM_ROLES = ["owner", "admin", "member"] as const;
export type TeamRole = typeof TEAM_ROLES[number];

export const MEMBER_STATUSES = ["invited", "activated", "deactivated"] as const;
export type MemberStatus = typeof MEMBER_STATUSES[number];

export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  size: text("size"),
  websiteUrl: text("website_url"),
  logoUrl: text("logo_url"),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
});

export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: text("role").notNull().default("member"),
  jobTitle: text("job_title"),
  status: text("status").notNull().default("activated"),
});

export const teamInvites = pgTable("team_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  invitedById: varchar("invited_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  token: text("token").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const teamTemplates = pgTable("team_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  templateData: jsonb("template_data").notNull().default({}),
  isDefault: boolean("is_default").notNull().default(false),
});

// ── Menu Builder Tables ──────────────────────────────────────────────────────
export const menuSections = pgTable("menu_sections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const menuProducts = pgTable("menu_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sectionId: varchar("section_id").notNull().references(() => menuSections.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  price: text("price"),
  imageUrl: text("image_url"),
  position: integer("position").notNull().default(0),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id, { onDelete: "cascade" }),
  ownerId: varchar("owner_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  company: text("company"),
  jobTitle: text("job_title"),
  notes: text("notes"),
  type: text("type").notNull().default("personal"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
  coverImage: z.string().optional().nullable(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  onboardingCompleted: z.boolean().optional(),
  template: z.string().optional(),
  accountType: z.enum(["personal", "team"]).optional(),
  teamId: z.string().optional().nullable(),
  menuTemplate: z.string().optional().nullable(),
  menuDisplayName: z.string().max(100).optional().nullable(),
  menuProfileImage: z.string().optional().nullable(),
  menuAccentColor: z.string().optional().nullable(),
});

export const updateMenuSettingsSchema = z.object({
  menuTemplate: z.string().optional().nullable(),
  menuDisplayName: z.string().max(100).optional().nullable(),
  menuProfileImage: z.string().optional().nullable(),
  menuAccentColor: z.string().optional().nullable(),
  menuDescription: z.string().max(500).optional().nullable(),
  menuPhone: z.string().max(50).optional().nullable(),
  menuEmail: z.string().max(100).optional().nullable(),
  menuAddress: z.string().max(300).optional().nullable(),
  menuGoogleMapsUrl: z.string().max(500).optional().nullable(),
  menuWhatsapp: z.string().max(50).optional().nullable(),
  menuWebsite: z.string().max(300).optional().nullable(),
});

export const upsertOpeningHoursSchema = z.object({
  hours: z.array(z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z.string().nullable(),
    closeTime: z.string().nullable(),
    isClosed: z.boolean(),
  })),
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

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "Password is required to delete account"),
});

export const insertTeamSchema = createInsertSchema(teams).omit({ id: true });
export const createTeamSchema = z.object({
  name: z.string().min(1, "Company name is required").max(100),
  size: z.enum(TEAM_SIZES).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().optional(),
});
export const updateTeamSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  size: z.enum(TEAM_SIZES).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().optional().nullable(),
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true });
export const updateTeamMemberSchema = z.object({
  role: z.enum(TEAM_ROLES).optional(),
  jobTitle: z.string().max(100).optional().nullable(),
  status: z.enum(MEMBER_STATUSES).optional(),
});

export const createTeamInviteSchema = z.object({
  emails: z.array(z.string().email()).min(1).max(10),
  role: z.enum(TEAM_ROLES).optional().default("member"),
});

export const createTeamMemberSchema = z.object({
  displayName: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Valid email is required"),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  memberRole: z.enum(["admin", "member"]).optional().default("member"),
});

export const insertTeamTemplateSchema = createInsertSchema(teamTemplates).omit({ id: true });
export const createTeamTemplateSchema = z.object({
  name: z.string().min(1, "Template name is required").max(100),
  description: z.string().max(500).optional(),
  templateData: z.record(z.any()).optional().default({}),
  isDefault: z.boolean().optional(),
});
export const updateTeamTemplateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  templateData: z.record(z.any()).optional(),
  isDefault: z.boolean().optional(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({ id: true, createdAt: true });
export const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(50).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  jobTitle: z.string().max(100).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  type: z.enum(["personal", "company"]).optional().default("personal"),
});
export const updateContactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().max(50).optional().or(z.literal("")).nullable(),
  company: z.string().max(100).optional().or(z.literal("")).nullable(),
  jobTitle: z.string().max(100).optional().or(z.literal("")).nullable(),
  notes: z.string().max(1000).optional().or(z.literal("")).nullable(),
  type: z.enum(["personal", "company"]).optional(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamInvite = typeof teamInvites.$inferSelect;
export type TeamTemplate = typeof teamTemplates.$inferSelect;
export type InsertTeamTemplate = z.infer<typeof insertTeamTemplateSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;

// ── Menu Builder Schemas ──────────────────────────────────────────────────────
export const insertMenuSectionSchema = createInsertSchema(menuSections).omit({ id: true, createdAt: true });
export const createMenuSectionSchema = z.object({
  name: z.string().min(1, "Section name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
});
export const updateMenuSectionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  active: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export const insertMenuProductSchema = createInsertSchema(menuProducts).omit({ id: true, createdAt: true });
export const createMenuProductSchema = z.object({
  sectionId: z.string().min(1, "Section is required"),
  name: z.string().min(1, "Product name is required").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  price: z.string().max(50).optional().or(z.literal("")),
  imageUrl: z.string().optional().or(z.literal("")),
});
export const updateMenuProductSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  price: z.string().max(50).optional().nullable(),
  imageUrl: z.string().optional().nullable(),
  active: z.boolean().optional(),
  position: z.number().int().min(0).optional(),
});

export type MenuSection = typeof menuSections.$inferSelect;
export type InsertMenuSection = z.infer<typeof insertMenuSectionSchema>;
export type MenuProduct = typeof menuProducts.$inferSelect;
export type InsertMenuProduct = z.infer<typeof insertMenuProductSchema>;
export type MenuOpeningHour = typeof menuOpeningHours.$inferSelect;
export type MenuSocial = typeof menuSocials.$inferSelect;
export type InsertMenuSocial = z.infer<typeof insertMenuSocialSchema>;

export const insertMenuSocialSchema = createInsertSchema(menuSocials).omit({ id: true });
export const createMenuSocialSchema = z.object({
  platform: z.string().min(1, "Platform is required"),
  url: z.string().default(""),
});
export const updateMenuSocialSchema = z.object({
  url: z.string().min(1).optional(),
  position: z.number().int().min(0).optional(),
});

// =============================================
// ADMIN + PRICING + PAYMENTS SCHEMA
// =============================================

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const pricingPlans = pgTable("pricing_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  yearlyPrice: numeric("yearly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  features: jsonb("features").notNull().default([]),
  maxLinks: integer("max_links").notNull().default(10),
  maxPages: integer("max_pages").notNull().default(1),
  maxTeamMembers: integer("max_team_members").notNull().default(1),
  maxBlocks: integer("max_blocks").notNull().default(20),
  maxSocials: integer("max_socials").notNull().default(5),
  qrCodeEnabled: boolean("qr_code_enabled").notNull().default(false),
  analyticsEnabled: boolean("analytics_enabled").notNull().default(false),
  customTemplatesEnabled: boolean("custom_templates_enabled").notNull().default(false),
  menuBuilderEnabled: boolean("menu_builder_enabled").notNull().default(false),
  planType: text("plan_type").notNull().default("individual"), // "individual" | "team"
  isActive: boolean("is_active").notNull().default(true),
  isFeatured: boolean("is_featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const userSubscriptions = pgTable("user_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").notNull().references(() => pricingPlans.id),
  status: text("status").notNull().default("active"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end"),
  razorpaySubscriptionId: text("razorpay_subscription_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: varchar("plan_id").references(() => pricingPlans.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("INR"),
  status: text("status").notNull().default("pending"),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  razorpaySignature: text("razorpay_signature"),
  billingCycle: text("billing_cycle").default("monthly"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const adminLoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const createAdminSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
});

export const createPricingPlanSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  monthlyPrice: z.number().min(0, "Price must be non-negative"),
  yearlyPrice: z.number().min(0, "Price must be non-negative"),
  features: z.array(z.string()).default([]),
  maxLinks: z.number().int().min(1).default(10),
  maxPages: z.number().int().min(1).default(1),
  maxTeamMembers: z.number().int().min(1).default(1),
  maxBlocks: z.number().int().min(1).default(20),
  maxSocials: z.number().int().min(1).default(5),
  qrCodeEnabled: z.boolean().default(false),
  analyticsEnabled: z.boolean().default(false),
  customTemplatesEnabled: z.boolean().default(false),
  menuBuilderEnabled: z.boolean().default(false),
  planType: z.enum(["individual", "team"]).default("individual"),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const updatePricingPlanSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  monthlyPrice: z.number().min(0).optional(),
  yearlyPrice: z.number().min(0).optional(),
  features: z.array(z.string()).optional(),
  maxLinks: z.number().int().min(1).optional(),
  maxPages: z.number().int().min(1).optional(),
  maxTeamMembers: z.number().int().min(1).optional(),
  maxBlocks: z.number().int().min(1).optional(),
  maxSocials: z.number().int().min(1).optional(),
  qrCodeEnabled: z.boolean().optional(),
  analyticsEnabled: z.boolean().optional(),
  customTemplatesEnabled: z.boolean().optional(),
  menuBuilderEnabled: z.boolean().optional(),
  planType: z.enum(["individual", "team"]).optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const createPaymentOrderSchema = z.object({
  planId: z.string().min(1, "Plan ID is required"),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string(),
  planId: z.string(),
  billingCycle: z.enum(["monthly", "yearly"]).default("monthly"),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export const insertPricingPlanSchema = createInsertSchema(pricingPlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, updatedAt: true });

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type PricingPlan = typeof pricingPlans.$inferSelect;
export type InsertPricingPlan = z.infer<typeof insertPricingPlanSchema>;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// =============================================
// AFFILIATES & PROMO CODES
// =============================================

export const affiliates = pgTable("affiliates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referralCode: text("referral_code").notNull().unique(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("10"), // percentage
  isActive: boolean("is_active").notNull().default(true),
  totalEarnings: numeric("total_earnings", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateId: varchar("affiliate_id").notNull().references(() => affiliates.id, { onDelete: "cascade" }),
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  paymentId: varchar("payment_id").references(() => payments.id),
  commissionAmount: numeric("commission_amount", { precision: 10, scale: 2 }).default("0"),
  status: text("status").notNull().default("pending"), // pending | converted | paid
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const promoCodes = pgTable("promo_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }).notNull().default("10"),
  maxUses: integer("max_uses").default(0), // 0 = unlimited
  currentUses: integer("current_uses").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const createAffiliateSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  commissionRate: z.number().min(0).max(100).default(10),
});

export const updateAffiliateSchema = z.object({
  commissionRate: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const createPromoCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(50).regex(/^[A-Z0-9_-]+$/i, "Only letters, numbers, hyphens and underscores"),
  discountPercent: z.number().min(1).max(100),
  maxUses: z.number().int().min(0).default(0),
  expiresAt: z.string().optional(),
});

export const updatePromoCodeSchema = z.object({
  discountPercent: z.number().min(1).max(100).optional(),
  maxUses: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().optional().nullable(),
});

export const validatePromoCodeSchema = z.object({
  code: z.string().min(1),
});

export type Affiliate = typeof affiliates.$inferSelect;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;
export type PromoCode = typeof promoCodes.$inferSelect;
