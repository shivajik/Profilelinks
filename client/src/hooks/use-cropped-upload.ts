import { useCallback, useRef, useState } from "react";

/** Hook to open the crop dialog once and receive a cropped Blob via a promise. */
export function useCropTarget() {
  const [file, setFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((b: Blob | null) => void) | null>(null);

  const openCrop = useCallback((f: File) => {
    setFile(f);
    setOpen(true);
    return new Promise<Blob | null>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const cancel = useCallback(() => {
    setOpen(false);
    setFile(null);
    resolveRef.current?.(null);
    resolveRef.current = null;
  }, []);

  const finish = useCallback((blob: Blob) => {
    setOpen(false);
    setFile(null);
    resolveRef.current?.(blob);
    resolveRef.current = null;
  }, []);

  return { file, open, openCrop, cancel, finish };
}

/** Upload a cropped Blob (JPEG) to /api/upload and return its URL. */
export async function uploadBlob(blob: Blob, filename = "upload.jpg"): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type: blob.type || "image/jpeg" }));
  const res = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}
