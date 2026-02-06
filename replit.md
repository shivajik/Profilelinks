# Linkfolio - Link-in-Bio Application

## Overview
A link-in-bio web application that allows users to create personalized landing pages with multiple links to their social profiles, websites, and content - all accessible through a single custom URL.

## Recent Changes
- 2026-02-06: Added "Add to Contact" (vCard download) and "Share" (QR code, copy URL, social media sharing) buttons to public profile page
- 2026-02-06: Added block-based content system (URL Button, Email Button, Text, Divider, Video, Audio, Image) replacing simple links; block type picker in dashboard, inline editing per type, public profile renders all block types with video/audio embeds
- 2026-02-06: Added multi-page system (Home, About Us, Services, etc.) with page-scoped links, page selector dropdown, manage pages dialog, public page navigation tabs
- 2026-02-06: Switched Vercel deployment to Build Output API v3 (eliminates ncc bundling issues, self-contained .vercel/output/)
- 2026-02-06: Added Vercel deployment compatibility (vercel.json, serverless API entry, memory uploads)
- 2026-02-06: Added social media management (50+ platforms) with inline editing in dashboard
- 2026-02-06: Migrated database to Supabase PostgreSQL (transaction pooler for app, direct URL for migrations)
- 2026-02-06: Added email case normalization (lowercase) in register/login
- 2026-02-06: Secured session cookies (secure flag in production, trust proxy)
- 2026-02-06: Added collapsible category sections (Page, Header, Socials, Blocks) to dashboard center panel
- 2026-02-06: Replaced edit link popup dialog with inline editing (expand card to show title/url inputs)
- 2026-02-06: Redesigned dashboard with shadcn Sidebar primitives (4-column layout)
- 2026-02-06: Added profile picture file upload (multer) in onboarding wizard and dashboard
- 2026-02-06: Added 4-step onboarding wizard with templates, profile, socials, URL claim
- 2026-02-06: Initial MVP built with auth, dashboard, and public profiles

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth (bcryptjs for passwords)
- **Database**: Supabase PostgreSQL with Drizzle ORM
- **DB Connection**: Uses SUPABASE_POOLER_URL (transaction pooler, port 6543) for app, SUPABASE_DIRECT_URL (port 5432) for migrations
- **Routing**: wouter for client-side routing
- **Deployment**: Vercel via Build Output API v3 (build script creates .vercel/output/ with static files + serverless function)

## Key Pages
- `/` - Landing page
- `/auth` - Login/Register (email/password)
- `/dashboard` - Authenticated user's link management
- `/:username` - Public profile view

## API Routes
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile
- `GET /api/pages` - Get user's pages (authenticated)
- `POST /api/pages` - Create page
- `PATCH /api/pages/:id` - Update page (rename, set as home)
- `DELETE /api/pages/:id` - Delete page (not home)
- `GET /api/blocks?pageId=X` - Get page-scoped blocks (authenticated, ownership verified)
- `POST /api/blocks` - Create block (type + content JSON)
- `PATCH /api/blocks/:id` - Update block content/active
- `DELETE /api/blocks/:id` - Delete block
- `POST /api/blocks/reorder` - Reorder blocks
- `GET /api/links?pageId=X` - Get page-scoped links (legacy, authenticated)
- `POST /api/links` - Create link (legacy)
- `PATCH /api/links/:id` - Update link
- `DELETE /api/links/:id` - Delete link
- `POST /api/links/reorder` - Reorder links
- `POST /api/upload` - Upload profile image (multipart/form-data, max 5MB)
- `GET /api/profile/:username?page=slug` - Get public profile + page-scoped links

## Database Schema
- `users` - id, username, email, password, displayName, bio, profileImage, onboardingCompleted, template
- `pages` - id, userId, title, slug, position, isHome (each user has one home page)
- `blocks` - id, userId, pageId, type (url_button/email_button/text/divider/video/audio/image), content (JSONB), position, active
- `links` - id, userId, pageId (FK to pages), title, url, position, active (legacy, migrated to blocks)
- `socials` - id, userId, platform, url, position
- `session` - managed by connect-pg-simple

## User Preferences
- Colors: Primary #6C5CE7 (vibrant purple), teal accents
- Fonts: Inter, DM Sans
- Design: Clean, mobile-first, centered layout
