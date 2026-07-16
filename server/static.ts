import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { getAnalyticsSnippets, injectAnalytics } from "./analytics";

const SITE_ORIGIN = "https://visicardly.com";

type RouteSeo = { title: string; description: string; path: string };

const ROUTE_SEO: Record<string, RouteSeo> = {
  "/": {
    title: "VisiCardly — Digital Business Cards, Link-in-Bio & Digital Menus",
    description:
      "VisiCardly is an all-in-one platform for digital business cards, link-in-bio pages, digital menus, and team card portals. One custom link, one QR code. Free to start.",
    path: "/",
  },
  "/pricing": {
    title: "Pricing & Plans — VisiCardly Digital Business Cards",
    description:
      "Compare VisiCardly plans: free digital business card, Pro link-in-bio, and Team portals with QR codes, analytics, and branded templates.",
    path: "/pricing",
  },
  "/restaurant": {
    title: "Digital Restaurant Menus with QR Codes — VisiCardly",
    description:
      "Create a digital restaurant menu with sections, prices, photos, opening hours and a QR code your guests scan at the table. Free to start with VisiCardly.",
    path: "/restaurant",
  },
  "/about": {
    title: "About VisiCardly — The team behind digital business cards",
    description:
      "Meet the team behind VisiCardly and learn why we're building a modern platform for digital business cards, link-in-bio pages and digital menus.",
    path: "/about",
  },
  "/contact": {
    title: "Contact VisiCardly — Support, sales & partnerships",
    description:
      "Get in touch with VisiCardly for support, sales, partnerships, or press. We usually reply within one business day.",
    path: "/contact",
  },
  "/docs": {
    title: "VisiCardly Documentation — Guides & product reference",
    description:
      "Guides and reference documentation for VisiCardly digital business cards, link-in-bio pages, digital menus, QR codes, teams and analytics.",
    path: "/docs",
  },
  "/support": {
    title: "VisiCardly Help Center — Support articles & how-tos",
    description:
      "Search VisiCardly help articles and how-to guides for digital business cards, link-in-bio pages, digital menus, QR codes and team accounts.",
    path: "/support",
  },
  "/terms": {
    title: "Terms of Service — VisiCardly",
    description:
      "Read the VisiCardly Terms of Service covering account use, subscriptions, content, and acceptable use for our digital business card platform.",
    path: "/terms",
  },
  "/privacy": {
    title: "Privacy Policy — VisiCardly",
    description:
      "How VisiCardly collects, uses, and protects personal data across our digital business cards, link-in-bio pages, and digital menus.",
    path: "/privacy",
  },
  "/gdpr": {
    title: "GDPR — VisiCardly data protection & user rights",
    description:
      "VisiCardly's GDPR statement: your rights, our lawful bases, data processors, and how to exercise data subject requests.",
    path: "/gdpr",
  },
  "/refund-policy": {
    title: "Refund Policy — VisiCardly",
    description:
      "VisiCardly refund policy for subscriptions and lifetime deal purchases, including how to request a refund and eligibility conditions.",
    path: "/refund-policy",
  },
};

function applyRouteSeo(html: string, route: RouteSeo, origin: string): string {
  const fullUrl = `${origin}${route.path}`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(route.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${escapeAttr(route.description)}" />`)
    .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeAttr(fullUrl)}" />`)
    .replace(/<meta property="og:title"[^>]*>/, `<meta property="og:title" content="${escapeAttr(route.title)}" />`)
    .replace(/<meta property="og:description"[^>]*>/, `<meta property="og:description" content="${escapeAttr(route.description)}" />`)
    .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeAttr(fullUrl)}" />`)
    .replace(/<meta name="twitter:title"[^>]*>/, `<meta name="twitter:title" content="${escapeAttr(route.title)}" />`)
    .replace(/<meta name="twitter:description"[^>]*>/, `<meta name="twitter:description" content="${escapeAttr(route.description)}" />`);
}

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
    const origin = `${req.protocol}://${req.get("host")}`;

    // Per-route SEO: rewrite canonical, title, description, og:*, twitter:*
    // so /pricing, /restaurant, /about … don't inherit the homepage canonical.
    const routeKey = urlPath.replace(/\/+$/, "") || "/";
    const routeSeo = ROUTE_SEO[routeKey];
    if (routeSeo) {
      return res.send(applyRouteSeo(baseHtml, routeSeo, SITE_ORIGIN));
    }

    if (skipPrefixes.some(p => urlPath.startsWith(p))) {
      // Fallback for known-app routes without dedicated SEO: still rewrite
      // canonical/og:url so they point to the actual path, never to "/".
      const fullUrl = `${SITE_ORIGIN}${urlPath}`;
      const withUrl = baseHtml
        .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeAttr(fullUrl)}" />`)
        .replace(/<meta property="og:url"[^>]*>/, `<meta property="og:url" content="${escapeAttr(fullUrl)}" />`);
      return res.send(withUrl);
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
        // First try as a username
        user = await storage.getUserByUsername(username);
        // If not found, try as a team slug and use the team owner
        if (!user) {
          const team = await storage.getTeamBySlug(username);
          if (team) {
            teamName = team.name;
            user = await storage.getUser(team.ownerId);
          }
        }
      }

      if (user) {
        const displayName = user.displayName || user.username;
        const bio = user.bio || `Check out ${displayName}'s profile on VisiCardly`;
        const profileImage = user.profileImage || "/logo.png";
        const fullUrl = `${origin}${urlPath}`;
        const title = teamName
          ? `${displayName} — ${teamName} | VisiCardly`
          : `VisiCardly — ${displayName} (@${user.username})`;

        const ogHtml = baseHtml
          .replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(title)}</title>`)
          .replace(/<link rel="canonical"[^>]*>/, `<link rel="canonical" href="${escapeAttr(fullUrl)}" />`)
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
