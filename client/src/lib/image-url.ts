/**
 * Normalizes image URLs so 3rd-party share links (like Google Drive)
 * render correctly in <img> tags without CORS/hotlink issues.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";

  // Google Drive → thumbnail hotlink form.
  // Matches:  /file/d/FILEID/...   ?id=FILEID   /uc?id=FILEID
  const driveMatch =
    trimmed.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?[^#]*[?&]?id=([a-zA-Z0-9_-]+)/) ||
    trimmed.match(/drive\.google\.com\/[^?]*\?id=([a-zA-Z0-9_-]+)/);
  if (driveMatch?.[1]) {
    return `https://drive.google.com/thumbnail?id=${driveMatch[1]}&sz=w1600`;
  }

  // Dropbox share links → direct content
  if (/dropbox\.com\/.+/.test(trimmed) && !/dl=1/.test(trimmed)) {
    return trimmed.replace(/[?&]dl=0/, "").replace(/\?.*$/, "") + "?raw=1";
  }

  return trimmed;
}
