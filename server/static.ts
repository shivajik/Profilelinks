import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { db } from "./storage";
import { sql } from "drizzle-orm";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const indexHtml = fs.readFileSync(path.resolve(distPath, "index.html"), "utf-8");

  app.use(express.static(distPath));

  // Dynamic OG meta tags for profile pages
  app.use("/{*path}", async (req, res) => {
    const urlPath = req.path;
    const host = (req.get("host") || "").toLowerCase().replace(/:\d+$/, '');

    // Check if request is from a custom domain
    const mainDomains = ["localhost", "visicardly.com", "www.visicardly.com"];
    const isCustomDomain = !mainDomains.some(d => host.includes(d)) && host.includes('.');

    if (isCustomDomain) {
      try {
        const result = await db.execute(sql`
          SELECT cd.user_id, u.username, u.display_name, u.bio, u.profile_image
          FROM custom_domains cd
          JOIN users u ON cd.user_id = u.id
          WHERE cd.domain = ${host} AND cd.status = 'active'
          LIMIT 1
        `);
        const rows = result.rows as any[];

        if (rows.length > 0) {
          const user = rows[0];
          // For custom domain root or profile paths, inject domain context
          const customDomainMeta = `<script>window.__CUSTOM_DOMAIN__=${JSON.stringify({
            domain: host,
            userId: user.user_id,
            username: user.username,
          })};</script>`;

          // Inject OG tags for the domain owner
          const displayName = user.display_name || user.username;
          const bio = user.bio || `${displayName}'s profile`;
          const profileImage = user.profile_image || "/logo.png";
          const origin = `${req.protocol}://${host}`;
          const title = `${displayName}`;

          let modifiedHtml = indexHtml
            .replace("</head>", `${customDomainMeta}</head>`)
            .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
            .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(title)}" />`)
            .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(bio)}" />`)
            .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeAttr(origin)}" />`)
            .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeAttr(profileImage.startsWith("http") ? profileImage : origin + profileImage)}" />`);

          return res.send(modifiedHtml);
        }
      } catch {
        // Fall through
      }
    }

    // Check if it's a profile URL pattern (single username or company/member)
    const singleMatch = urlPath.match(/^\/([a-z0-9_-]+)$/i);
    const teamMatch = urlPath.match(/^\/([a-z0-9_-]+)\/([a-z0-9_-]+)$/i);

    // Skip known routes
    const skipPrefixes = ["/auth", "/dashboard", "/onboarding", "/pricing", "/about", "/contact", "/docs", "/support", "/terms", "/privacy", "/gdpr", "/refund-policy", "/admin", "/change-password", "/invite", "/api"];
    if (skipPrefixes.some(p => urlPath.startsWith(p))) {
      return res.sendFile(path.resolve(distPath, "index.html"));
    }

    try {
      let user: any = null;
      let teamName = "";

      if (teamMatch) {
        const [, companySlug, memberUsername] = teamMatch;
        user = await storage.getUserByUsername(memberUsername);
        const team = await storage.getTeamBySlug(companySlug);
        if (team) teamName = team.name;
      } else if (singleMatch) {
        const [, username] = singleMatch;
        user = await storage.getUserByUsername(username);
      }

      if (user) {
        const displayName = user.displayName || user.username;
        const bio = user.bio || `Check out ${displayName}'s profile on VisiCardly`;
        const profileImage = user.profileImage || "/logo.png";
        const origin = `${req.protocol}://${req.get("host")}`;
        const fullUrl = `${origin}${urlPath}`;
        const title = teamName
          ? `${displayName} — ${teamName} | VisiCardly`
          : `VisiCardly — ${displayName} (@${user.username})`;

        const ogHtml = indexHtml
          .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
          .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(title)}" />`)
          .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(bio)}" />`)
          .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeAttr(fullUrl)}" />`)
          .replace(/<meta property="og:image"[^>]*>/, `<meta property="og:image" content="${escapeAttr(profileImage.startsWith("http") ? profileImage : origin + profileImage)}" />`)
          .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeAttr(title)}" />`)
          .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeAttr(bio)}" />`)
          .replace(/<meta name="twitter:image"[^>]*>/, `<meta name="twitter:image" content="${escapeAttr(profileImage.startsWith("http") ? profileImage : origin + profileImage)}" />`)
          .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttr(bio)}" />`);

        return res.send(ogHtml);
      }
    } catch {
      // Fall through to default
    }

    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
