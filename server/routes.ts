import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import { registerSchema, loginSchema, createLinkSchema, updateLinkSchema, updateProfileSchema, createSocialSchema, updateSocialSchema, createPageSchema, updatePageSchema, createBlockSchema, updateBlockSchema, changePasswordSchema, deleteAccountSchema } from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: string;
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
      res.json({
        user: publicUser,
        links: userLinks,
        blocks: pageBlocks,
        socials: userSocials,
        pages: userPages.map((p) => ({ id: p.id, title: p.title, slug: p.slug, isHome: p.isHome })),
        currentPage: currentPage ? { id: currentPage.id, title: currentPage.title, slug: currentPage.slug, isHome: currentPage.isHome } : null,
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

  return httpServer;
}
