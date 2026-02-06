# Linkfolio - Link-in-Bio Application

## Overview
A link-in-bio web application that allows users to create personalized landing pages with multiple links to their social profiles, websites, and content - all accessible through a single custom URL.

## Recent Changes
- 2026-02-06: Initial MVP built with auth, dashboard, and public profiles

## Architecture
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js with session-based auth (bcryptjs for passwords)
- **Database**: PostgreSQL with Drizzle ORM
- **Routing**: wouter for client-side routing

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
- `GET /api/links` - Get user's links (authenticated)
- `POST /api/links` - Create link
- `PATCH /api/links/:id` - Update link
- `DELETE /api/links/:id` - Delete link
- `POST /api/links/reorder` - Reorder links
- `GET /api/profile/:username` - Get public profile + links

## Database Schema
- `users` - id, username, email, password, displayName, bio, profileImage
- `links` - id, userId, title, url, position, active
- `session` - managed by connect-pg-simple

## User Preferences
- Colors: Primary #6C5CE7 (vibrant purple), teal accents
- Fonts: Inter, DM Sans
- Design: Clean, mobile-first, centered layout
