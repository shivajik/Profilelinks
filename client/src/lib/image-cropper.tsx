import { useEffect, useState } from "react";
import { ImageCropDialog, type CropShape } from "@/components/image-crop-dialog";

type CropRequest = {
  file: File;
  aspect: number;
  shape: CropShape;
  title?: string;
  resolve: (blob: Blob | null) => void;
};

let pending: CropRequest | null = null;
let listener: ((r: CropRequest | null) => void) | null = null;

/** Global: open the cropper for `file` and resolve with the cropped JPEG blob (or null if cancelled). */
export function cropImage(
  file: File,
  opts: { aspect?: number; shape?: CropShape; title?: string } = {},
): Promise<Blob | null> {
  return new Promise((resolve) => {
    pending = {
      file,
      aspect: opts.aspect ?? 1,
      shape: opts.shape ?? "rect",
      title: opts.title,
      resolve,
    };
    listener?.(pending);
  });
}

/** Upload a Blob (JPEG) to /api/upload and return its URL. */
export async function uploadBlob(blob: Blob, filename = "upload.jpg"): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], filename, { type: blob.type || "image/jpeg" }));
  const res = await fetch("/api/upload", { method: "POST", credentials: "include", body: fd });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Upload failed");
  }
  const { url } = await res.json();
  return url as string;
}

/** Convenience: crop then upload. Returns URL or null if user cancels. */
export async function cropAndUpload(
  file: File,
  opts: { aspect?: number; shape?: CropShape; title?: string } = {},
): Promise<string | null> {
  const blob = await cropImage(file, opts);
  if (!blob) return null;
  return uploadBlob(blob);
}

/** Mount once (in App root). Renders the crop dialog whenever `cropImage` is called. */
export function ImageCropperHost() {
  const [req, setReq] = useState<CropRequest | null>(null);

  useEffect(() => {
    listener = (r) => setReq(r);
    return () => {
      listener = null;
    };
  }, []);

  const finish = (blob: Blob | null) => {
    req?.resolve(blob);
    pending = null;
    setReq(null);
  };

  return (
    <ImageCropDialog
      open={!!req}
      file={req?.file ?? null}
      aspect={req?.aspect ?? 1}
      shape={req?.shape ?? "rect"}
      title={req?.title}
      onCancel={() => finish(null)}
      onCropped={async (b) => finish(b)}
    />
  );
}
