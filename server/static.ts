import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { getAnalyticsSnippets, injectAnalytics } from "./analytics";

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

    // Check if it's a profile URL pattern (single username or company/member)
    const singleMatch = urlPath.match(/^\/([a-z0-9_-]+)$/i);
    const teamMatch = urlPath.match(/^\/([a-z0-9_-]+)\/([a-z0-9_-]+)$/i);

    // Skip known routes
    const skipPrefixes = ["/auth", "/dashboard", "/onboarding", "/pricing", "/about", "/contact", "/docs", "/support", "/terms", "/privacy", "/gdpr", "/refund-policy", "/admin", "/change-password", "/invite", "/api"];

    // Inject analytics scripts from DB (GA4 in <head>, FB noscript in <body>)
    const analyticsSnippets = await getAnalyticsSnippets();
    const baseHtml = injectAnalytics(indexHtml, analyticsSnippets);

    if (skipPrefixes.some(p => urlPath.startsWith(p))) {
      return res.send(baseHtml);
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

        const ogHtml = baseHtml
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

    res.send(baseHtml);
  });
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
