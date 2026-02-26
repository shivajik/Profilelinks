import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema, createLinkSchema, updateLinkSchema, updateProfileSchema, createSocialSchema, updateSocialSchema, createPageSchema, updatePageSchema, createBlockSchema, updateBlockSchema, changePasswordSchema, deleteAccountSchema, createTeamSchema, updateTeamSchema, updateTeamMemberSchema, createTeamInviteSchema, createTeamMemberSchema, createTeamTemplateSchema, updateTeamTemplateSchema, createContactSchema, updateContactSchema, createMenuSectionSchema, updateMenuSectionSchema, createMenuProductSchema, updateMenuProductSchema, updateMenuSettingsSchema, upsertOpeningHoursSchema, createMenuSocialSchema, updateMenuSocialSchema, updateBusinessProfileSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import adminRouter from "./admin-routes";
import paymentRouter from "./payment-routes";
import affiliateRouter from "./affiliate-routes";
import { getUserPlanLimits } from "./plan-limits";
import { sendInviteEmail, sendCredentialsEmail } from "./email";

declare module "express-session" {
  interface SessionData {
    userId: string;
    adminUserId: string;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

const uploadsDir = path.resolve(process.env.VERCEL ? "/tmp/uploads" : path.join(process.cwd(), "uploads"));
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.memoryStorage();

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files (JPEG, PNG, GIF, WEBP) are allowed"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const PgSession = connectPgSimple(session);

  const poolerUrl = process.env.SUPABASE_POOLER_URL || process.env.DATABASE_URL;
  const useSSL = !!(process.env.SUPABASE_POOLER_URL);

  const sessionPool = new pg.Pool({
    connectionString: poolerUrl,
    ssl: useSSL ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: 10000,
    max: 3,
  });

  try {
    const testClient = await sessionPool.connect();
    await testClient.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      ) WITH (OIDS=FALSE);
    `);
    await testClient.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");`);
    testClient.release();
  } catch (e) {
    console.error("Session table creation failed:", (e as Error).message);
  }

  app.use("/uploads", express.static(uploadsDir));

  const isProduction = process.env.NODE_ENV === "production" || !!process.env.VERCEL;
  if (isProduction) {
    app.set("trust proxy", 1);
  }

  app.use(
    session({
      store: new PgSession({
        pool: sessionPool,
        createTableIfMissing: true,
      }),
      secret: process.env.SESSION_SECRET || "linkfolio-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
      },
    })
  );

  app.post("/api/auth/register", async (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const { username, password } = result.data;
      const email = result.data.email.toLowerCase();

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      await storage.ensureHomePage(user.id);

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/demo-login", async (req, res) => {
    try {
      const { type } = req.body;
      if (!type || !["personal", "team"].includes(type)) {
        return res.status(400).json({ message: "Invalid demo type" });
      }

      const demoEmail = type === "personal" ? "demo@linkfolio.com" : "team-demo@linkfolio.com";
      const demoUsername = type === "personal" ? "demo-user" : "demo-team";
      const demoPassword = "demo123456";

      let user = await storage.getUserByEmail(demoEmail);

      if (!user) {
        const hashedPassword = await bcrypt.hash(demoPassword, 10);
        user = await storage.createUser({
          username: demoUsername,
          email: demoEmail,
          password: hashedPassword,
        });

        await storage.updateUser(user.id, {
          displayName: type === "personal" ? "Alex Johnson" : "Sarah Chen",
          bio: type === "personal"
            ? "Designer & content creator. Sharing my work and inspiration."
            : "CEO at Acme Corp. Building the future of work.",
          template: type === "personal" ? "sunset" : "minimal",
          onboardingCompleted: true,
          accountType: type,
        });

        const homePage = await storage.ensureHomePage(user.id);

        await storage.createSocial({ userId: user.id, platform: "twitter", url: "https://twitter.com/demo", position: 0 });
        await storage.createSocial({ userId: user.id, platform: "instagram", url: "https://instagram.com/demo", position: 1 });
        await storage.createSocial({ userId: user.id, platform: "linkedin", url: "https://linkedin.com/in/demo", position: 2 });
        await storage.createSocial({ userId: user.id, platform: "github", url: "https://github.com/demo", position: 3 });

        await storage.createBlock({ userId: user.id, pageId: homePage.id, type: "url_button", content: { title: "My Portfolio", url: "https://example.com/portfolio" }, position: 0, active: true });
        await storage.createBlock({ userId: user.id, pageId: homePage.id, type: "url_button", content: { title: "Latest Blog Post", url: "https://example.com/blog" }, position: 1, active: true });
        await storage.createBlock({ userId: user.id, pageId: homePage.id, type: "text", content: { text: "Welcome to my Linkfolio page! Explore my links below." }, position: 2, active: true });

        if (type === "team") {
          const team = await storage.createTeam({
            name: "Acme Corp",
            size: "6-20",
            websiteUrl: "https://acme.example.com",
            ownerId: user.id,
          });
          await storage.addTeamMember({
            teamId: team.id,
            userId: user.id,
            role: "owner",
            status: "activated",
          });
          await storage.updateUser(user.id, { teamId: team.id });
          await storage.createTeamTemplate({
            teamId: team.id,
            name: "Standard Profile",
            description: "Default template for all team members",
            isDefault: true,
            templateData: {
              companyName: "Acme Corp",
              companyPhone: "+1 555-0100",
              companyEmail: "hello@acme.example.com",
              companyWebsite: "https://acme.example.com",
              themeColor: "#6C5CE7",
              font: "inter",
            },
          });
          await storage.createContact({
            teamId: team.id,
            name: "John Partner",
            email: "john@partner.com",
            phone: "+1 555-0100",
            company: "Partner Inc",
            jobTitle: "VP Sales",
            type: "company",
          });
          await storage.createContact({
            ownerId: user.id,
            name: "Emily Networking",
            email: "emily@contact.com",
            company: "Freelance",
            jobTitle: "Designer",
            type: "personal",
          });
        }

        user = (await storage.getUser(user.id))!;
      }

      await storage.ensureHomePage(user.id);
      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: "Demo login failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const { password } = result.data;
      const email = result.data.email.toLowerCase();

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      await storage.ensureHomePage(user.id);

      req.session.userId = user.id;
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("connect.sid");
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const result = updateProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      if (result.data.username) {
        const existing = await storage.getUserByUsername(result.data.username);
        if (existing && existing.id !== req.session.userId) {
          return res.status(400).json({ message: "Username already taken" });
        }
      }

      const updated = await storage.updateUser(req.session.userId!, result.data);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, ...safeUser } = updated;
      res.json(safeUser);
    } catch (error: any) {
      res.status(500).json({ message: "Profile update failed" });
    }
  });

  app.get("/api/auth/username-available", requireAuth, async (req, res) => {
    try {
      const username = req.query.username as string;
      if (!username || username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.json({ available: false });
      }
      const existing = await storage.getUserByUsername(username.toLowerCase());
      const available = !existing || existing.id === req.session.userId;
      res.json({ available });
    } catch {
      res.status(500).json({ message: "Check failed" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const result = changePasswordSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(result.data.currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(result.data.newPassword, 10);
      await storage.updateUserPassword(req.session.userId!, hashedPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // Force change password for temp password users
  app.post("/api/auth/force-change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current and new password are required" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return res.status(400).json({ message: "Temporary password is incorrect" });
      }
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUserPassword(req.session.userId!, hashedPassword);
      await storage.updateUser(req.session.userId!, { mustChangePassword: false } as any);
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Password change failed" });
    }
  });

  app.delete("/api/auth/account", requireAuth, async (req, res) => {
    try {
      const result = deleteAccountSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const valid = await bcrypt.compare(result.data.password, user.password);
      if (!valid) {
        return res.status(400).json({ message: "Incorrect password" });
      }

      await storage.deleteUser(req.session.userId!);
      req.session.destroy((err) => {
        res.clearCookie("connect.sid");
        res.json({ message: "Account deleted" });
      });
    } catch (error: any) {
      res.status(500).json({ message: "Account deletion failed" });
    }
  });

  app.post("/api/upload", requireAuth, (req, res) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({ message: "File too large. Maximum size is 5MB." });
          }
          return res.status(400).json({ message: err.message });
        }
        return res.status(400).json({ message: err.message || "Upload failed" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      if (process.env.VERCEL) {
        const base64 = req.file.buffer.toString("base64");
        const dataUri = `data:${req.file.mimetype};base64,${base64}`;
        return res.json({ url: dataUri });
      }
      const filename = crypto.randomUUID() + (path.extname(req.file.originalname) || ".jpg");
      const filepath = path.join(uploadsDir, filename);
      fs.writeFileSync(filepath, req.file.buffer);
      const url = `/uploads/${filename}`;
      res.json({ url });
    });
  });

  // Plan limits API
  app.get("/api/auth/plan-limits", requireAuth, async (req, res) => {
    try {
      const limits = await getUserPlanLimits(req.session.userId!);
      res.json(limits);
    } catch (error: any) {
      console.error("Plan limits error:", error);
      res.status(500).json({ message: "Failed to fetch plan limits" });
    }
  });

  // Pages routes
  app.get("/api/pages", requireAuth, async (req, res) => {
    const userPages = await storage.getPagesByUserId(req.session.userId!);
    res.json(userPages);
  });

  app.post("/api/pages", requireAuth, async (req, res) => {
    try {
      const result = createPageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      // Enforce page limit
      const limits = await getUserPlanLimits(req.session.userId!);
      if (limits.currentPages >= limits.maxPages) {
        return res.status(403).json({ message: `Page limit reached (${limits.maxPages}). Upgrade your plan to create more pages.` });
      }
      const page = await storage.createPage({
        ...result.data,
        slug: "",
        position: 0,
        isHome: false,
        userId: req.session.userId!,
      });
      res.status(201).json(page);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create page" });
    }
  });

  app.patch("/api/pages/:id", requireAuth, async (req, res) => {
    try {
      const result = updatePageSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const updated = await storage.updatePage(req.params.id as string, req.session.userId!, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Page not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update page" });
    }
  });

  app.delete("/api/pages/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deletePage(req.params.id as string, req.session.userId!);
    if (!deleted) {
      return res.status(400).json({ message: "Cannot delete home page or page not found" });
    }
    res.json({ message: "Deleted" });
  });

  // Links routes (page-aware)
  app.get("/api/links", requireAuth, async (req, res) => {
    const pageId = req.query.pageId as string | undefined;
    if (pageId) {
      const userPages = await storage.getPagesByUserId(req.session.userId!);
      const ownsPage = userPages.some((p) => p.id === pageId);
      if (!ownsPage) {
        return res.status(403).json({ message: "Access denied" });
      }
      const pageLinks = await storage.getLinksByPageId(pageId);
      return res.json(pageLinks);
    }
    const allLinks = await storage.getLinksByUserId(req.session.userId!);
    res.json(allLinks);
  });

  app.post("/api/links", requireAuth, async (req, res) => {
    try {
      const result = createLinkSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      // Enforce link limit
      const limits = await getUserPlanLimits(req.session.userId!);
      if (limits.currentLinks >= limits.maxLinks) {
        return res.status(403).json({ message: `Link limit reached (${limits.maxLinks}). Upgrade your plan to add more links.` });
      }

      let pageId = result.data.pageId;
      if (!pageId) {
        const homePage = await storage.ensureHomePage(req.session.userId!);
        pageId = homePage.id;
      }

      const maxPos = await storage.getMaxLinkPositionByPage(pageId);
      const link = await storage.createLink({
        title: result.data.title,
        url: result.data.url,
        userId: req.session.userId!,
        pageId,
        position: maxPos + 1,
        active: true,
      });
      res.status(201).json(link);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create link" });
    }
  });

  app.patch("/api/links/:id", requireAuth, async (req, res) => {
    try {
      const result = updateLinkSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      const updated = await storage.updateLink(req.params.id as string, req.session.userId!, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Link not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update link" });
    }
  });

  app.delete("/api/links/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteLink(req.params.id as string, req.session.userId!);
    if (!deleted) {
      return res.status(404).json({ message: "Link not found" });
    }
    res.json({ message: "Deleted" });
  });

  app.post("/api/links/reorder", requireAuth, async (req, res) => {
    try {
      const { linkIds } = req.body;
      if (!Array.isArray(linkIds)) {
        return res.status(400).json({ message: "linkIds must be an array" });
      }
      await storage.reorderLinks(req.session.userId!, linkIds);
      res.json({ message: "Reordered" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to reorder links" });
    }
  });

  app.get("/api/socials", requireAuth, async (req, res) => {
    const socialsList = await storage.getSocialsByUserId(req.session.userId!);
    res.json(socialsList);
  });

  app.post("/api/socials", requireAuth, async (req, res) => {
    try {
      const result = createSocialSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      // Enforce social limit
      const limits = await getUserPlanLimits(req.session.userId!);
      if (limits.currentSocials >= limits.maxSocials) {
        return res.status(403).json({ message: `Social link limit reached (${limits.maxSocials}). Upgrade your plan to add more.` });
      }
      const social = await storage.createSocial({
        ...result.data,
        userId: req.session.userId!,
      });
      res.status(201).json(social);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create social" });
    }
  });

  app.patch("/api/socials/:id", requireAuth, async (req, res) => {
    try {
      const result = updateSocialSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const updated = await storage.updateSocial(req.params.id as string, req.session.userId!, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Social not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update social" });
    }
  });

  app.delete("/api/socials/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteSocial(req.params.id as string, req.session.userId!);
    if (!deleted) {
      return res.status(404).json({ message: "Social not found" });
    }
    res.json({ message: "Deleted" });
  });

  // Blocks routes
  app.get("/api/blocks", requireAuth, async (req, res) => {
    const pageId = req.query.pageId as string | undefined;
    if (pageId) {
      const userPages = await storage.getPagesByUserId(req.session.userId!);
      const ownsPage = userPages.some((p) => p.id === pageId);
      if (!ownsPage) {
        return res.status(403).json({ message: "Access denied" });
      }
      const pageBlocks = await storage.getBlocksByPageId(pageId);
      return res.json(pageBlocks);
    }
    const allBlocks = await storage.getBlocksByUserId(req.session.userId!);
    res.json(allBlocks);
  });

  app.post("/api/blocks", requireAuth, async (req, res) => {
    try {
      const result = createBlockSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      // Enforce block limit
      const limits = await getUserPlanLimits(req.session.userId!);
      if (limits.currentBlocks >= limits.maxBlocks) {
        return res.status(403).json({ message: `Block limit reached (${limits.maxBlocks}). Upgrade your plan to add more blocks.` });
      }

      let pageId = result.data.pageId;
      if (!pageId) {
        const homePage = await storage.ensureHomePage(req.session.userId!);
        pageId = homePage.id;
      }

      const maxPos = await storage.getMaxBlockPositionByPage(pageId);
      const block = await storage.createBlock({
        type: result.data.type,
        content: result.data.content || {},
        userId: req.session.userId!,
        pageId,
        position: maxPos + 1,
        active: true,
      });
      res.status(201).json(block);
    } catch (error: any) {
      console.error("Block creation error:", error);
      res.status(500).json({ message: "Failed to create block" });
    }
  });

  app.patch("/api/blocks/:id", requireAuth, async (req, res) => {
    try {
      const result = updateBlockSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const updated = await storage.updateBlock(req.params.id as string, req.session.userId!, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Block not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update block" });
    }
  });

  app.delete("/api/blocks/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteBlock(req.params.id as string, req.session.userId!);
    if (!deleted) {
      return res.status(404).json({ message: "Block not found" });
    }
    res.json({ message: "Deleted" });
  });

  app.post("/api/blocks/reorder", requireAuth, async (req, res) => {
    try {
      const { blockIds } = req.body;
      if (!Array.isArray(blockIds)) {
        return res.status(400).json({ message: "blockIds must be an array" });
      }
      await storage.reorderBlocks(req.session.userId!, blockIds);
      res.json({ message: "Reordered" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to reorder blocks" });
    }
  });

  async function getTeamMemberRole(teamId: string, userId: string): Promise<string | null> {
    const member = await storage.getTeamMemberByUserId(teamId, userId);
    return member?.role || null;
  }

  // Teams CRUD
  app.post("/api/teams", requireAuth, async (req, res) => {
    try {
      const result = createTeamSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const team = await storage.createTeam({ ...result.data, ownerId: req.session.userId! });
      await storage.addTeamMember({ teamId: team.id, userId: req.session.userId!, role: "owner", status: "activated" });
      await storage.updateUser(req.session.userId!, { accountType: "team", teamId: team.id });
      try {
        await storage.createTeamTemplate({
          teamId: team.id,
          name: "Default Business Card",
          description: "Standard company business card template",
          templateData: {
            companyName: result.data.name || "",
            companyWebsite: result.data.websiteUrl || "",
            themeColor: "#6C5CE7",
            font: "inter",
          },
          isDefault: true,
        });
      } catch (templateErr) {
        console.error("Failed to create default template for new team:", templateErr);
      }
      res.status(201).json(team);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.get("/api/teams/me", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user || !user.teamId) {
        return res.json(null);
      }
      const team = await storage.getTeam(user.teamId);
      if (!team) {
        return res.json(null);
      }
      const membership = await storage.getTeamMemberByUserId(team.id, user.id);
      res.json({ team, membership });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get team" });
    }
  });

  app.get("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.id as string, req.session.userId!);
      if (!role) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const team = await storage.getTeam(req.params.id as string);
      if (!team) return res.status(404).json({ message: "Team not found" });
      res.json(team);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get team" });
    }
  });

  app.patch("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.id as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const result = updateTeamSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const updated = await storage.updateTeam(req.params.id as string, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Team not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  app.delete("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id as string);
      if (!team || team.ownerId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized" });
      }
      await storage.deleteTeam(req.params.id as string);
      await storage.updateUser(req.session.userId!, { accountType: "personal", teamId: null });
      res.json({ message: "Team deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete team" });
    }
  });

  // Team Members
  app.get("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const members = await storage.getTeamMembers(req.params.teamId as string);
      res.json(members);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get team members" });
    }
  });

  app.post("/api/teams/:teamId/members", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const { userId, role: memberRole, jobTitle } = req.body;
      if (!userId) {
        return res.status(400).json({ message: "userId is required" });
      }
      const member = await storage.addTeamMember({
        teamId: req.params.teamId as string,
        userId,
        role: memberRole || "member",
        jobTitle: jobTitle || null,
        status: "activated",
      });
      await storage.updateUser(userId, { teamId: req.params.teamId as string });
      res.status(201).json(member);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  app.patch("/api/teams/:teamId/members/:id", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const result = updateTeamMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const isAdminOrOwner = ["owner", "admin"].includes(role);
      if (!isAdminOrOwner) {
        const targetMember = (await storage.getTeamMembers(req.params.teamId as string)).find(m => m.id === req.params.id);
        if (!targetMember || targetMember.userId !== req.session.userId) {
          return res.status(403).json({ message: "You can only edit your own profile" });
        }
        const allowedFields = { jobTitle: result.data.jobTitle };
        if (result.data.role) {
          return res.status(403).json({ message: "Only admins can change roles" });
        }
        const updated = await storage.updateTeamMember(req.params.id as string, req.params.teamId as string, allowedFields);
        if (!updated) {
          return res.status(404).json({ message: "Team member not found" });
        }
        return res.json(updated);
      }

      // Handle deactivation: remove team association but keep the member record
      if (result.data.status === "deactivated") {
        const members = await storage.getTeamMembers(req.params.teamId as string);
        const targetMember = members.find(m => m.id === req.params.id);
        if (targetMember && targetMember.role !== "owner") {
          // Remove team association so user can use individual account
          await storage.updateUser(targetMember.userId, { teamId: null, accountType: "personal" });
        }
      }
      // Handle reactivation: restore team association
      if (result.data.status === "activated") {
        const members = await storage.getTeamMembers(req.params.teamId as string);
        const targetMember = members.find(m => m.id === req.params.id);
        if (targetMember) {
          await storage.updateUser(targetMember.userId, { teamId: req.params.teamId as string, accountType: "team" });
        }
      }

      const updated = await storage.updateTeamMember(req.params.id as string, req.params.teamId as string, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  app.delete("/api/teams/:teamId/members/:id", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const members = await storage.getTeamMembers(req.params.teamId as string);
      const targetMember = members.find(m => m.id === req.params.id);
      if (!targetMember) {
        return res.status(404).json({ message: "Team member not found" });
      }
      if (targetMember.role === "owner") {
        return res.status(400).json({ message: "Cannot remove the team owner" });
      }
      await storage.removeTeamMember(req.params.id as string, req.params.teamId as string);
      await storage.updateUser(targetMember.userId, { teamId: null });
      res.json({ message: "Member removed" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  app.post("/api/teams/:teamId/members/create", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      // Enforce team member limit
      const limits = await getUserPlanLimits(req.session.userId!);
      if (limits.currentTeamMembers >= limits.maxTeamMembers) {
        return res.status(403).json({ message: `Team member limit reached (${limits.maxTeamMembers}). Upgrade your plan to add more members.` });
      }
      const result = createTeamMemberSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const { displayName, email, jobTitle, memberRole } = result.data;
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        const existingMember = await storage.getTeamMemberByUserId(req.params.teamId as string, existingUser.id);
        if (existingMember) {
          return res.status(400).json({ message: "This user is already a team member" });
        }
        const member = await storage.addTeamMember({
          teamId: req.params.teamId as string,
          userId: existingUser.id,
          role: memberRole || "member",
          jobTitle: jobTitle || null,
          status: "activated",
        });
        await storage.updateUser(existingUser.id, { teamId: req.params.teamId as string, accountType: "team" });
        // Create invite record as "accepted" (existing user)
        const inviteRecords = await storage.createTeamInvites([{
          teamId: req.params.teamId as string,
          email: normalizedEmail,
          role: memberRole || "member",
          invitedById: req.session.userId!,
          token: crypto.randomUUID(),
        }]);
        // Mark as accepted immediately for existing users
        if (inviteRecords[0]) {
          await storage.updateTeamInviteStatus(inviteRecords[0].id, "accepted");
        }
        // Send invite notification email to existing user
          const team = await storage.getTeam(req.params.teamId as string);
          const inviter = await storage.getUser(req.session.userId!);
          await sendInviteEmail({
            to: normalizedEmail,
            inviterName: inviter?.displayName || inviter?.username || "Team Admin",
            teamName: team?.name || "Team",
            inviteLink: `${req.protocol}://${req.get("host")}/auth`,
            role: memberRole || "member",
          }).catch(() => {}); // Fire and forget
        // Auto-create contact for this team member
        try {
          await storage.createContact({
            teamId: req.params.teamId as string,
            name: existingUser.displayName || existingUser.username || displayName,
            email: normalizedEmail,
            phone: null,
            company: team?.name || "",
            jobTitle: jobTitle || null,
            type: "company",
          });
        } catch (_) { /* contact may already exist */ }

        return res.status(201).json(member);
      }
      const username = normalizedEmail.split("@")[0] + "_" + Date.now().toString(36);
      const tempPassword = crypto.randomUUID().slice(0, 12);
      const hashedPassword = await bcrypt.hash(tempPassword, 10);
      const newUser = await storage.createUser({
        username,
        email: normalizedEmail,
        password: hashedPassword,
        displayName,
        accountType: "team",
        teamId: req.params.teamId as string,
      });
      // Set mustChangePassword flag and mark onboarding as completed (team member inherits company details)
      await storage.updateUser(newUser.id, { mustChangePassword: true, onboardingCompleted: true } as any);
      const member = await storage.addTeamMember({
        teamId: req.params.teamId as string,
        userId: newUser.id,
        role: memberRole || "member",
        jobTitle: jobTitle || null,
        status: "activated",
      });
      // Create invite record as "pending" (new user with temp password)
      await storage.createTeamInvites([{
        teamId: req.params.teamId as string,
        email: normalizedEmail,
        role: memberRole || "member",
        invitedById: req.session.userId!,
        token: crypto.randomUUID(),
      }]);
      const homePage = await storage.createPage({
        userId: newUser.id,
        title: "Home",
        slug: "home",
        position: 0,
        isHome: true,
      });
      // Send credentials email
      const team = await storage.getTeam(req.params.teamId as string);
      const inviter = await storage.getUser(req.session.userId!);
      console.log("Inviter Info:", inviter);
     try {
        await sendCredentialsEmail({
          to: normalizedEmail,
          teamName: team?.name || "Team",
          loginUrl: `${req.protocol}://${req.get("host")}/auth`,
          tempPassword,
        });

        console.log("✅ Email Sent Successfully");
      } catch (emailError) {
        console.log("❌ Email Sending Failed");
        console.error(emailError);
      }
      // Auto-create contact for new team member
      try {
        await storage.createContact({
          teamId: req.params.teamId as string,
          name: displayName || username,
          email: normalizedEmail,
          phone: null,
          company: team?.name || "",
          jobTitle: jobTitle || null,
          type: "company",
        });
      } catch (_) { /* contact may already exist */ }

      res.status(201).json({
        ...member,
        tempPassword,
        tempEmail: normalizedEmail,
        tempUsername: username,
      });

    } catch (error: any) {
      res.status(500).json({ message: "Failed to create member" });
    }
  });

  // Team Invites
  app.post("/api/teams/:teamId/invites", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const result = createTeamInviteSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }

      // Validate each email for duplicates
      const existingInvites = await storage.getTeamInvites(req.params.teamId as string);
      const members = await storage.getTeamMembers(req.params.teamId as string);
      const skipped: string[] = [];
      const validEmails: string[] = [];

      for (const email of result.data.emails) {
        const normalizedEmail = email.toLowerCase().trim();
        // Check if already a team member
        const existingUser = await storage.getUserByEmail(normalizedEmail);
        if (existingUser) {
          const isMember = members.some(m => m.userId === existingUser.id);
          if (isMember) {
            skipped.push(`${normalizedEmail} (already a team member)`);
            continue;
          }
        }
        // Check if already has a pending invite
        const hasPendingInvite = existingInvites.some(
          inv => inv.email.toLowerCase() === normalizedEmail && inv.status === "pending"
        );
        if (hasPendingInvite) {
          skipped.push(`${normalizedEmail} (already has a pending invite)`);
          continue;
        }
        validEmails.push(normalizedEmail);
      }

      if (validEmails.length === 0) {
        return res.status(400).json({ 
          message: skipped.length > 0 
            ? `All emails were skipped: ${skipped.join(", ")}` 
            : "No valid emails to invite" 
        });
      }

      const invites = validEmails.map(email => ({
        teamId: req.params.teamId as string,
        email,
        role: result.data.role || "member",
        invitedById: req.session.userId!,
        token: crypto.randomUUID(),
      }));
      const created = await storage.createTeamInvites(invites);

      // Send invite emails (fire and forget)
      const team = await storage.getTeam(req.params.teamId as string);
      const inviter = await storage.getUser(req.session.userId!);
      for (const invite of created) {
        const inviteLink = `${req.protocol}://${req.get("host")}/invite/${invite.token}`;
        sendInviteEmail({
          to: invite.email,
          inviterName: inviter?.displayName || inviter?.username || "Team Admin",
          teamName: team?.name || "Team",
          inviteLink,
          role: invite.role,
        }).catch(() => {});
      }

      res.status(201).json({ 
        invites: created, 
        skipped: skipped.length > 0 ? skipped : undefined 
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to send invites" });
    }
  });

  app.get("/api/teams/:teamId/invites", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const invites = await storage.getTeamInvites(req.params.teamId as string);
      res.json(invites);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get invites" });
    }
  });

  // Revoke an invite (set status to revoked instead of deleting)
  app.patch("/api/teams/:teamId/invites/:id/revoke", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const invites = await storage.getTeamInvites(req.params.teamId as string);
      const invite = invites.find(i => i.id === req.params.id);
      if (!invite) {
        return res.status(404).json({ message: "Invite not found" });
      }
      if (invite.status !== "pending") {
        return res.status(400).json({ message: `Cannot revoke an invite that is already ${invite.status}` });
      }
      const updated = await storage.updateTeamInviteStatus(req.params.id as string, "revoked");
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to revoke invite" });
    }
  });

  app.delete("/api/teams/:teamId/invites/:id", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const deleted = await storage.deleteTeamInvite(req.params.id as string, req.params.teamId as string);
      if (!deleted) {
        return res.status(404).json({ message: "Invite not found" });
      }
      res.json({ message: "Invite cancelled" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to cancel invite" });
    }
  });

  app.post("/api/teams/join/:token", requireAuth, async (req, res) => {
    try {
      const invite = await storage.getTeamInviteByToken(req.params.token as string);
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }
      await storage.addTeamMember({
        teamId: invite.teamId,
        userId: req.session.userId!,
        role: invite.role,
        status: "activated",
      });
      await storage.updateTeamInviteStatus(invite.id, "accepted");
      await storage.updateUser(req.session.userId!, { teamId: invite.teamId, accountType: "team" });
      const team = await storage.getTeam(invite.teamId);
      res.json({ team });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to join team" });
    }
  });

  // Public invite acceptance (no auth required)
  app.get("/api/invites/:token", async (req, res) => {
    try {
      const invite = await storage.getTeamInviteByToken(req.params.token as string);
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }
      const team = await storage.getTeam(invite.teamId);
      res.json({
        email: invite.email,
        role: invite.role,
        teamName: team?.name || "Team",
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get invite info" });
    }
  });

  app.post("/api/invites/:token/accept", async (req, res) => {
    try {
      const invite = await storage.getTeamInviteByToken(req.params.token as string);
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ message: "Invalid or expired invite" });
      }
      const { username, password } = req.body;
      if (!username || !password || typeof username !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Username and password are required" });
      }
      if (username.length < 3 || username.length > 30) {
        return res.status(400).json({ message: "Username must be 3-30 characters" });
      }
      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, hyphens and underscores" });
      }
      const existingUsername = await storage.getUserByUsername(username.toLowerCase());
      if (existingUsername) {
        return res.status(400).json({ message: "Username is already taken" });
      }
      const existingEmail = await storage.getUserByEmail(invite.email.toLowerCase());
      if (existingEmail) {
        return res.status(400).json({ message: "An account with this email already exists. Please log in and use the invite link." });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await storage.createUser({
        username: username.toLowerCase(),
        email: invite.email.toLowerCase(),
        password: hashedPassword,
        displayName: username,
        accountType: "team",
        teamId: invite.teamId,
      });
      await storage.addTeamMember({
        teamId: invite.teamId,
        userId: newUser.id,
        role: invite.role,
        status: "activated",
      });
      await storage.createPage({
        userId: newUser.id,
        title: "Home",
        slug: "home",
        position: 0,
        isHome: true,
      });
      await storage.updateTeamInviteStatus(invite.id, "accepted");
      // Auto-create contact for newly joined member
      try {
        const team = await storage.getTeam(invite.teamId);
        await storage.createContact({
          teamId: invite.teamId,
          name: username,
          email: invite.email.toLowerCase(),
          phone: null,
          company: team?.name || "",
          jobTitle: null,
          type: "company",
        });
      } catch (_) { /* contact may already exist */ }
      req.session.userId = newUser.id;
      res.json({ message: "Account created and joined team successfully" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // ── Update Team Member Profile (display name) ───────────────────────────────
  app.patch("/api/teams/:teamId/members/:memberId/profile", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      const members = await storage.getTeamMembers(req.params.teamId as string);
      const member = members.find(m => m.id === req.params.memberId);
      if (!member) return res.status(404).json({ message: "Member not found" });
      
      // Allow admin/owner or self-edit
      const isSelf = member.userId === req.session.userId;
      const isTeamAdmin = role && ["owner", "admin"].includes(role);
      if (!isSelf && !isTeamAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const { displayName, profileImage } = req.body;
      const updates: Record<string, any> = {};
      if (displayName !== undefined) updates.displayName = displayName;
      if (profileImage !== undefined) updates.profileImage = profileImage;
      if (Object.keys(updates).length > 0) {
        await storage.updateUser(member.userId, updates);
      }
      res.json({ message: "Profile updated" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update member profile" });
    }
  });

  // Team Templates
  app.get("/api/teams/:teamId/templates", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role) {
        return res.status(403).json({ message: "Not authorized" });
      }
      let templates = await storage.getTeamTemplates(req.params.teamId as string);
      if (templates.length === 0) {
        try {
          const team = await storage.getTeam(req.params.teamId as string);
          const created = await storage.createTeamTemplate({
            teamId: req.params.teamId as string,
            name: "Default Business Card",
            description: "Standard company business card template",
            templateData: {
              companyName: team?.name || "",
              companyWebsite: team?.websiteUrl || "",
              themeColor: "#6C5CE7",
              font: "inter",
            },
            isDefault: true,
          });
          templates = [created];
        } catch (autoCreateErr) {
          console.error("Failed to auto-create default template:", autoCreateErr);
        }
      }
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get templates" });
    }
  });

  app.post("/api/teams/:teamId/templates", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const result = createTeamTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      if (result.data.isDefault) {
        const existing = await storage.getTeamTemplates(req.params.teamId as string);
        for (const t of existing) {
          if (t.isDefault) {
            await storage.updateTeamTemplate(t.id, req.params.teamId as string, { isDefault: false });
          }
        }
      }
      const template = await storage.createTeamTemplate({ ...result.data, teamId: req.params.teamId as string });
      res.status(201).json(template);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.patch("/api/teams/:teamId/templates/:id", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const result = updateTeamTemplateSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      if (result.data.isDefault) {
        const existing = await storage.getTeamTemplates(req.params.teamId as string);
        for (const t of existing) {
          if (t.isDefault && t.id !== req.params.id) {
            await storage.updateTeamTemplate(t.id, req.params.teamId as string, { isDefault: false });
          }
        }
      }
      const updated = await storage.updateTeamTemplate(req.params.id as string, req.params.teamId as string, result.data);
      if (!updated) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update template" });
    }
  });

  app.delete("/api/teams/:teamId/templates/:id", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role || !["owner", "admin"].includes(role)) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const deleted = await storage.deleteTeamTemplate(req.params.id as string, req.params.teamId as string);
      if (!deleted) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.json({ message: "Template deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete template" });
    }
  });

  app.post("/api/teams/:teamId/templates/:id/duplicate", requireAuth, async (req, res) => {
    try {
      const role = await getTeamMemberRole(req.params.teamId as string, req.session.userId!);
      if (!role) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const duplicated = await storage.duplicateTeamTemplate(req.params.id as string, req.params.teamId as string);
      if (!duplicated) {
        return res.status(404).json({ message: "Template not found" });
      }
      res.status(201).json(duplicated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to duplicate template" });
    }
  });

  // Contacts
  app.get("/api/contacts", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const type = req.query.type as string | undefined;
      let contactsList;
      if (type === "company") {
        // For team members, also check businessProfileData teamId
        const teamId = user.teamId || (req.query.teamId as string);
        if (!teamId) {
          return res.status(400).json({ message: "No team associated" });
        }
        contactsList = await storage.getContacts({ teamId, type: "company" });
        // Filter out contacts whose email belongs to a deactivated team member
        const members = await storage.getTeamMembers(teamId);
        const deactivatedMembers = members.filter(m => m.status === "deactivated");
        if (deactivatedMembers.length > 0) {
          const deactivatedEmails = new Set<string>();
          for (const m of deactivatedMembers) {
            const u = await storage.getUser(m.userId);
            if (u?.email) deactivatedEmails.add(u.email.toLowerCase());
          }
          contactsList = contactsList.filter(c => !c.email || !deactivatedEmails.has(c.email.toLowerCase()));
        }
      } else {
        contactsList = await storage.getContacts({ ownerId: user.id, type: type || "personal" });
      }
      const search = req.query.search as string | undefined;
      if (search) {
        const lower = search.toLowerCase();
        contactsList = contactsList.filter(c =>
          c.name.toLowerCase().includes(lower) ||
          (c.email && c.email.toLowerCase().includes(lower))
        );
      }
      res.json(contactsList);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", requireAuth, async (req, res) => {
    try {
      const result = createContactSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      let contactData: any = { ...result.data };
      if (result.data.type === "company") {
        if (!user.teamId) {
          return res.status(400).json({ message: "No team associated" });
        }
        contactData.teamId = user.teamId;
      } else {
        contactData.ownerId = user.id;
      }
      const contact = await storage.createContact(contactData);
      res.status(201).json(contact);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.patch("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const result = updateContactSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const contactId = req.params.id as string;
      let updated = await storage.updateContact(contactId, user.id, result.data);
      if (!updated && user.teamId) {
        const allContacts = await storage.getContacts({ teamId: user.teamId });
        const contact = allContacts.find(c => c.id === contactId);
        if (contact && contact.teamId === user.teamId) {
          updated = await storage.updateContact(contactId, contact.ownerId || user.id, result.data);
        }
      }
      if (!updated) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/contacts/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const delContactId = req.params.id as string;
      // Try personal delete first
      let deleted = await storage.deleteContact(delContactId, user.id);
      // If not found and user has a team, only team owners can delete team contacts
      if (!deleted && user.teamId) {
        const memberRole = await getTeamMemberRole(user.teamId, user.id);
        if (!memberRole || !["owner", "admin"].includes(memberRole)) {
          return res.status(403).json({ message: "Only team owners can delete company contacts" });
        }
        deleted = await storage.deleteContactByTeam(delContactId, user.teamId);
      }
      if (!deleted) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json({ message: "Contact deleted" });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  app.get("/api/profile/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userPages = await storage.getPagesByUserId(user.id);
      const userSocials = await storage.getSocialsByUserId(user.id);

      const pageSlug = req.query.page as string | undefined;
      let currentPage = userPages.find((p) => p.isHome) || userPages[0];
      if (pageSlug) {
        const found = userPages.find((p) => p.slug === pageSlug);
        if (found) currentPage = found;
      }

      const userLinks = currentPage
        ? await storage.getLinksByPageId(currentPage.id)
        : await storage.getLinksByUserId(user.id);

      const pageBlocks = currentPage
        ? await storage.getBlocksByPageId(currentPage.id)
        : await storage.getBlocksByUserId(user.id);

      const { password: _, email: __, ...publicUser } = user;

      let teamBranding: {
        companyLogo?: string;
        coverPhoto?: string;
        companyName?: string;
        companyPhone?: string;
        companyEmail?: string;
        companyWebsite?: string;
        companyAddress?: string;
        companyContact?: string;
        themeColor?: string;
        font?: string;
        jobTitle?: string;
        teamName?: string;
      } | null = null;

      // Check if user is a team owner OR a team member
      let teamId = user.accountType === "team" ? user.teamId : null;
      let member: any = null;

      if (teamId) {
        member = await storage.getTeamMemberByUserId(teamId, user.id);
      } else {
        // Check if user is a member of any team (invited member)
        const memberships = await storage.getTeamMembershipsByUserId(user.id);
        // Only use active memberships
        const activeMembership = memberships.find(m => m.status === "activated");
        if (activeMembership) {
          teamId = activeMembership.teamId;
          member = activeMembership;
        }
      }

      if (teamId) {
        const team = await storage.getTeam(teamId);
        const templates = await storage.getTeamTemplates(teamId);
        const defaultTemplate = templates.find((t) => t.isDefault) || templates[0];
        const tData: any = defaultTemplate?.templateData || {};

        teamBranding = {
          companyLogo: tData.companyLogo || team?.logoUrl || undefined,
          coverPhoto: tData.coverPhoto || undefined,
          companyName: tData.companyName || team?.name || undefined,
          companyPhone: tData.companyPhone || undefined,
          companyEmail: tData.companyEmail || undefined,
          companyWebsite: tData.companyWebsite || team?.websiteUrl || undefined,
          companyAddress: tData.companyAddress || undefined,
          companyContact: tData.companyContact || undefined,
          themeColor: tData.themeColor || undefined,
          font: tData.font || undefined,
          jobTitle: member?.jobTitle || undefined,
          teamName: team?.name || undefined,
        };

        // Override user display info with business profile data if set
        if (member?.businessName) {
          (publicUser as any).displayName = member.businessName;
        }
        if (member?.businessProfileImage) {
          (publicUser as any).profileImage = member.businessProfileImage;
        }
        if (member?.businessBio) {
          (publicUser as any).bio = member.businessBio;
        }

        // Use team's default template theme if set
        if (tData.template) {
          (publicUser as any).template = tData.template;
        }
      }

      res.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.set("CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
      res.set("Vercel-CDN-Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");

      res.json({
        user: publicUser,
        links: userLinks,
        blocks: pageBlocks,
        socials: userSocials,
        pages: userPages.map((p) => ({ id: p.id, title: p.title, slug: p.slug, isHome: p.isHome })),
        currentPage: currentPage ? { id: currentPage.id, title: currentPage.title, slug: currentPage.slug, isHome: currentPage.isHome } : null,
        teamBranding,
      });
    } catch (error: any) {
      console.error("Profile load error:", error);
      res.status(500).json({ message: "Failed to load profile" });
    }
  });

  app.post("/api/analytics/track", async (req, res) => {
    try {
      const { username, eventType, blockId, pageSlug, referrer } = req.body;
      if (!username || !eventType) {
        return res.status(400).json({ message: "username and eventType are required" });
      }
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      await storage.recordAnalyticsEvent({
        userId: user.id,
        eventType,
        blockId: blockId || undefined,
        pageSlug: pageSlug || undefined,
        referrer: referrer || undefined,
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Analytics track error:", error);
      res.status(500).json({ message: "Failed to record event" });
    }
  });

  app.get("/api/analytics", async (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    try {
      const summary = await storage.getAnalyticsSummary(req.session.userId);
      res.json(summary);
    } catch (error: any) {
      console.error("Analytics fetch error:", error);
      res.status(500).json({ message: "Failed to load analytics" });
    }
  });

  // ── Menu Settings (Appearance) ────────────────────────────────────────────
  app.get("/api/menu/settings", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) return res.status(404).json({ message: "User not found" });
      const [openingHours, menuSocialLinks] = await Promise.all([
        storage.getOpeningHoursByUserId(req.session.userId!),
        storage.getMenuSocialsByUserId(req.session.userId!),
      ]);
      res.json({
        menuTemplate: user.menuTemplate,
        menuDisplayName: user.menuDisplayName,
        menuProfileImage: user.menuProfileImage,
        menuAccentColor: user.menuAccentColor,
        menuDescription: user.menuDescription,
        menuPhone: user.menuPhone,
        menuEmail: user.menuEmail,
        menuAddress: user.menuAddress,
        menuGoogleMapsUrl: user.menuGoogleMapsUrl,
        menuWhatsapp: user.menuWhatsapp,
        menuWebsite: user.menuWebsite,
        openingHours,
        menuSocials: menuSocialLinks,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to fetch menu settings" });
    }
  });

  app.patch("/api/menu/settings", requireAuth, async (req, res) => {
    try {
      const result = updateMenuSettingsSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      const updated = await storage.updateUser(req.session.userId!, result.data);
      if (!updated) return res.status(404).json({ message: "User not found" });
      res.json({
        menuTemplate: updated.menuTemplate,
        menuDisplayName: updated.menuDisplayName,
        menuProfileImage: updated.menuProfileImage,
        menuAccentColor: updated.menuAccentColor,
        menuDescription: updated.menuDescription,
        menuPhone: updated.menuPhone,
        menuEmail: updated.menuEmail,
        menuAddress: updated.menuAddress,
        menuGoogleMapsUrl: updated.menuGoogleMapsUrl,
        menuWhatsapp: updated.menuWhatsapp,
        menuWebsite: updated.menuWebsite,
      });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update menu settings" });
    }
  });

  // Opening Hours
  app.put("/api/menu/opening-hours", requireAuth, async (req, res) => {
    try {
      const result = upsertOpeningHoursSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      const hours = await storage.upsertOpeningHours(req.session.userId!, result.data.hours);
      res.json(hours);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to save opening hours" });
    }
  });

  // ── Menu Builder Routes ─────────────────────────────────────────────────────
  app.get("/api/menu/sections", requireAuth, async (req, res) => {
    const sections = await storage.getMenuSectionsByUserId(req.session.userId!);
    res.json(sections);
  });

  app.post("/api/menu/sections", requireAuth, async (req, res) => {
    try {
      const result = createMenuSectionSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      // Check plan permission
      const limits = await getUserPlanLimits(req.session.userId!);
      if (!limits.menuBuilderEnabled) {
        return res.status(403).json({ message: "Menu builder is not available on your plan. Please upgrade." });
      }
      const section = await storage.createMenuSection({ ...result.data, userId: req.session.userId!, active: true });
      res.status(201).json(section);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create section" });
    }
  });

  app.patch("/api/menu/sections/:id", requireAuth, async (req, res) => {
    try {
      const result = updateMenuSectionSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      const updated = await storage.updateMenuSection(req.params.id as string, req.session.userId!, result.data);
      if (!updated) return res.status(404).json({ message: "Section not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update section" });
    }
  });

  app.delete("/api/menu/sections/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteMenuSection(req.params.id as string, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Section not found" });
    res.json({ message: "Deleted" });
  });

  app.get("/api/menu/products", requireAuth, async (req, res) => {
    const sectionId = req.query.sectionId as string | undefined;
    if (sectionId) {
      const products = await storage.getMenuProductsBySectionId(sectionId);
      return res.json(products);
    }
    const products = await storage.getMenuProductsByUserId(req.session.userId!);
    res.json(products);
  });

  app.post("/api/menu/products", requireAuth, async (req, res) => {
    try {
      const result = createMenuProductSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      const limits = await getUserPlanLimits(req.session.userId!);
      if (!limits.menuBuilderEnabled) {
        return res.status(403).json({ message: "Menu builder is not available on your plan. Please upgrade." });
      }
      const product = await storage.createMenuProduct({ ...result.data, userId: req.session.userId!, active: true });
      res.status(201).json(product);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/menu/products/:id", requireAuth, async (req, res) => {
    try {
      const result = updateMenuProductSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      const updated = await storage.updateMenuProduct(req.params.id as string, req.session.userId!, result.data);
      if (!updated) return res.status(404).json({ message: "Product not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/menu/products/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteMenuProduct(req.params.id as string, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Product not found" });
    res.json({ message: "Deleted" });
  });

  // ── Menu Social Links ─────────────────────────────────────────────────────
  app.get("/api/menu/socials", requireAuth, async (req, res) => {
    const menuSocialsList = await storage.getMenuSocialsByUserId(req.session.userId!);
    res.json(menuSocialsList);
  });

  app.post("/api/menu/socials", requireAuth, async (req, res) => {
    try {
      const result = createMenuSocialSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      // Enforce combined social limit
      const limits = await getUserPlanLimits(req.session.userId!);
      if (limits.currentSocials >= limits.maxSocials) {
        return res.status(403).json({ message: `Social link limit reached (${limits.maxSocials}). Upgrade your plan to add more.` });
      }
      const social = await storage.createMenuSocial({ ...result.data, userId: req.session.userId! });
      res.status(201).json(social);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to create menu social" });
    }
  });

  app.patch("/api/menu/socials/:id", requireAuth, async (req, res) => {
    try {
      const result = updateMenuSocialSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ message: fromZodError(result.error).message });
      const updated = await storage.updateMenuSocial(req.params.id as string, req.session.userId!, result.data);
      if (!updated) return res.status(404).json({ message: "Menu social not found" });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: "Failed to update menu social" });
    }
  });

  app.delete("/api/menu/socials/:id", requireAuth, async (req, res) => {
    const deleted = await storage.deleteMenuSocial(req.params.id as string, req.session.userId!);
    if (!deleted) return res.status(404).json({ message: "Menu social not found" });
    res.json({ message: "Deleted" });
  });

  // ── Public Menu Endpoint ────────────────────────────────────────────────────
  app.get("/api/menu/:username", async (req, res) => {
    try {
      const user = await storage.getUserByUsername(req.params.username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const [sections, products, openingHours, menuSocialLinks] = await Promise.all([
        storage.getMenuSectionsByUserId(user.id),
        storage.getMenuProductsByUserId(user.id),
        storage.getOpeningHoursByUserId(user.id),
        storage.getMenuSocialsByUserId(user.id),
      ]);
      const activeSections = sections.filter(s => s.active);
      const activeProducts = products.filter(p => p.active);

      const { password: _, email: __, ...publicUser } = user;

      // Get team branding if applicable
      let teamBranding: any = null;
      if (user.accountType === "team" && user.teamId) {
        const team = await storage.getTeam(user.teamId);
        const templates = await storage.getTeamTemplates(user.teamId);
        const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
        const tData: any = defaultTemplate?.templateData || {};
        teamBranding = {
          companyLogo: team?.logoUrl || tData.companyLogo,
          companyName: tData.companyName || team?.name,
          themeColor: tData.themeColor,
        };
      }

      res.json({
        user: {
          ...publicUser,
          menuTemplate: user.menuTemplate,
          menuDisplayName: user.menuDisplayName,
          menuProfileImage: user.menuProfileImage,
          menuAccentColor: user.menuAccentColor,
          menuDescription: user.menuDescription,
          menuPhone: user.menuPhone,
          menuEmail: user.menuEmail,
          menuAddress: user.menuAddress,
          menuGoogleMapsUrl: user.menuGoogleMapsUrl,
          menuWhatsapp: user.menuWhatsapp,
          menuWebsite: user.menuWebsite,
        },
        sections: activeSections,
        products: activeProducts,
        openingHours,
        socials: menuSocialLinks,
        teamBranding,
      });
    } catch (error: any) {
      console.error("Public menu load error:", error);
      res.status(500).json({ message: "Failed to load menu" });
    }
  });

  // ── Business Profile API (for team members) ──────────────────────────
  app.get("/api/auth/business-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const memberships = await storage.getTeamMembershipsByUserId(userId);
      // Only return active memberships
      const activeMembership = memberships.find(m => m.status === "activated");
      if (!activeMembership) {
        return res.json(null);
      }
      const team = activeMembership.team;
      const templates = await storage.getTeamTemplates(team.id);
      const defaultTemplate = templates.find((t) => t.isDefault) || templates[0];

      res.json({
        member: {
          id: activeMembership.id,
          businessName: activeMembership.businessName,
          businessPhone: activeMembership.businessPhone,
          businessProfileImage: activeMembership.businessProfileImage,
          businessBio: activeMembership.businessBio,
          jobTitle: activeMembership.jobTitle,
          role: activeMembership.role,
        },
        team: {
          id: team.id,
          name: team.name,
          logoUrl: team.logoUrl,
          websiteUrl: team.websiteUrl,
        },
        templateData: defaultTemplate?.templateData || {},
      });
    } catch (error: any) {
      console.error("Business profile fetch error:", error);
      res.status(500).json({ message: "Failed to fetch business profile" });
    }
  });

  app.patch("/api/auth/business-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const memberships = await storage.getTeamMembershipsByUserId(userId);
      if (!memberships.length) {
        return res.status(404).json({ message: "No team membership found" });
      }
      const membership = memberships[0];
      const result = updateBusinessProfileSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: fromZodError(result.error).message });
      }
      const updated = await storage.updateTeamMember(membership.id, membership.teamId, result.data);
      res.json(updated);
    } catch (error: any) {
      console.error("Business profile update error:", error);
      res.status(500).json({ message: "Failed to update business profile" });
    }
  });

  // Register admin, payment, and affiliate routes
  app.use(adminRouter);
  app.use(paymentRouter);
  app.use(affiliateRouter);

  return httpServer;
}
