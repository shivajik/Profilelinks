

## Separate Menu Styling from Portfolio

Currently, the menu page (`/username/menu`) uses the same template/colors as the portfolio profile. You want them to be independent -- for example, a restaurant menu might have warm colors while the owner's portfolio stays dark/professional.

### What Will Change

**For Users (Menu Setup page):**
- A new "Menu Appearance" section at the top of the Menu Builder
- Pick a separate template for the menu (same template library)
- Override specific colors: background accent, text color, card style
- Set a separate menu display name (e.g., restaurant name) and profile image (e.g., restaurant logo)
- Live preview link already shows the menu -- it will reflect the new styling

**For the Public Menu page (`/username/menu`):**
- Will use the menu-specific template instead of the portfolio template
- Independent branding (name, logo, colors) from the portfolio

**For Admin:**
- No changes needed -- this is controlled by the existing `menuBuilderEnabled` plan flag

---

### Technical Details

**1. Database: Add menu settings columns to `users` table**

Add new columns to the `users` table in `shared/schema.ts`:
- `menuTemplate` (text, default null) -- separate template ID for menu
- `menuDisplayName` (text, default null) -- restaurant/business name for menu
- `menuProfileImage` (text, default null) -- separate logo for menu
- `menuAccentColor` (text, default null) -- custom accent color override

When these are null, fall back to the portfolio values (backward compatible).

**2. Schema updates (`shared/schema.ts`)**

- Add fields to `updateProfileSchema` so they can be saved via existing profile update API
- Add a new `updateMenuSettingsSchema` for a dedicated endpoint

**3. Backend: New API endpoint (`server/routes.ts`)**

- `PATCH /api/menu/settings` -- save menu appearance settings (menuTemplate, menuDisplayName, menuProfileImage, menuAccentColor)
- `GET /api/menu/settings` -- fetch current menu appearance settings
- Update `GET /api/menu/:username` public endpoint to return `menuTemplate`, `menuDisplayName`, `menuProfileImage`, `menuAccentColor` so the public page uses them

**4. Storage layer (`server/storage.ts`)**

- Add migration to create the new columns
- Add `updateMenuSettings()` and `getMenuSettings()` methods

**5. Menu Builder UI (`client/src/components/menu-builder.tsx`)**

Add a "Menu Appearance" card at the top with:
- Template selector (grid of template thumbnails, same as Design page)
- Menu display name input
- Menu logo/profile image upload
- Accent color picker
- All saved via `PATCH /api/menu/settings`

**6. Public Menu Page (`client/src/pages/public-menu.tsx`)**

- Use `user.menuTemplate` (falling back to `user.template`) to pick the template
- Use `user.menuDisplayName` (falling back to displayName) for the header
- Use `user.menuProfileImage` (falling back to profileImage) for the avatar
- Use `user.menuAccentColor` (falling back to template accent) for the accent color

**7. Build fix**

- Ensure `index.html` exists at root (already created)
- Remind user to add `build:dev` script to `package.json`

### File Changes Summary

| File | Change |
|------|--------|
| `shared/schema.ts` | Add menu appearance columns + schema |
| `server/storage.ts` | Migration + settings methods |
| `server/routes.ts` | New menu settings endpoints, update public menu API |
| `client/src/components/menu-builder.tsx` | Add appearance/template picker section |
| `client/src/pages/public-menu.tsx` | Use menu-specific template/colors |

