## Already shipped this turn
- **Task 1 (phone mockup)** — notch reduced from 24–26px to 14–16px and moved inside the screen with a dark status-bar strip covering the top region, so the white gap that flickered during the float animation is gone. File: `client/src/components/hero-right-composition.tsx`.

## Task 2 — Personal cover image not showing on public profile

**Diagnosis**
- `users.cover_image` is written correctly by dashboard upload (`PATCH /api/auth/profile`).
- `server/profile-query.ts` selects `u.cover_image` and returns it as `coverImage` on the user (line 113).
- `client/src/pages/profile.tsx` never reads `user.coverImage`, but hands `user` to `PersonalProfileLayout`, which does render it in every layout branch.
- Screenshot 4 shows a purple placeholder rectangle with an image icon on `/uday` — this is the browser's broken-image chrome, i.e. `user.coverImage` is a string but the URL is unreachable from the public profile. The dashboard preview (screenshot 3) loads fine because it's on the same session/origin as upload.

**Fix**
- Same treatment as `profileImage`: in `PersonalProfileLayout` (and Team layout), if `user.coverImage` starts with `/`, resolve to `${window.location.origin}${coverImage}` so relative upload paths work when the profile is embedded, previewed, or the CDN prefix changes.
- Add `onError` handler on every `<img src={user.coverImage}>` in `client/src/components/profile-layouts.tsx` and `client/src/components/team-profile-layouts.tsx` that hides the cover instead of leaving a broken icon.
- Verify the returned URL by hitting `/api/profile/uday` after the fix.

## Task 3 — Better upload loaders

**Current state**
- Dashboard already has `data-uploading` markers on avatar + cover, but the loader is only visible on hover (opacity-0 → opacity-100 needs group-hover). It's easy to miss.

**Fix**
- Force the overlay visible whenever `data-uploading` is set (independent of hover) on dashboard avatar, dashboard cover, business-profile avatar, team-template cover, team-template logo.
- Add centered spinner + "Uploading…" caption (already partly wired).
- Disable file input + buttons while uploading (`pointer-events-none` + `disabled`).

## Task 4 — Instagram-style crop/adjust on every image upload

**Scope (all 5 spots)**
1. Dashboard → Profile picture
2. Dashboard → Cover image
3. Business Profile → Business photo
4. Team Templates → Company logo
5. Team Templates → Cover photo

**Approach**
- `bun add react-easy-crop` (7kb, no deps, MIT). Uses pointer events, supports pinch/zoom, aspect ratio lock.
- New shared component `client/src/components/image-crop-dialog.tsx`:
  - Props: `open`, `file`, `aspect` (1 for avatars/logos, 3 for cover), `shape` ('round' | 'rect'), `onCancel`, `onCropped(blob)`.
  - Renders a modal with `<Cropper>`, zoom slider, rotate button, Cancel / Apply buttons.
  - Uses canvas to produce a cropped JPEG Blob at max 1600px longest side (keeps <1MB).
- New shared hook `client/src/hooks/use-cropped-upload.ts`:
  - Wraps `openCropDialog(file, aspect)` → returns cropped `File`.
  - Wraps `uploadCroppedFile(blob)` → POSTs to `/api/upload`, returns `{ url }`.
- Rewire the 5 spots: instead of uploading directly on `<input onChange>`, open the crop dialog first with the correct aspect, then upload the cropper's Blob.
- Backend `/api/upload` unchanged — same 1MB limit, same multipart contract (blob already resized/compressed client-side).

**Aspects**
| Spot | Aspect | Shape |
| --- | --- | --- |
| Profile picture | 1:1 | round |
| Cover image | 3:1 | rect |
| Business photo | 1:1 | round |
| Company logo | 1:1 | rect |
| Team cover photo | 3:1 | rect |

**Files touched**
- `client/src/components/image-crop-dialog.tsx` (new)
- `client/src/hooks/use-cropped-upload.ts` (new)
- `client/src/pages/dashboard.tsx` — 2 spots (avatar, cover) + settings avatar (3 spots)
- `client/src/components/business-profile-section.tsx` — 1 spot
- `client/src/components/team-templates-section.tsx` (or wherever team template covers/logos live — I'll locate)
- `client/src/components/profile-layouts.tsx` + `team-profile-layouts.tsx` — cover URL resolution + onError (Task 2)

## Order of execution
1. Task 2 fix (small, 2 files)
2. Task 3 loader visibility fix (dashboard.tsx, business-profile, team-templates)
3. Task 4 install + shared components + wire the 5 spots
4. Manual verify: upload cover on dashboard → open `/uday` → cover appears; upload avatar → crop dialog appears with round mask; apply → uploaded

## Notes for you
- Cropper output is a JPEG at ~85% quality, always ≤ 1MB regardless of the source file. This means the existing "Max 1MB" copy will effectively never trigger — I can remove those hints, but I'll keep them for now to avoid surprising you.
- No backend/DB changes required. No new secrets.
