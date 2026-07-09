import { useCallback, useEffect, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, RotateCw, ZoomIn } from "lucide-react";

export type CropShape = "round" | "rect";

interface ImageCropDialogProps {
  open: boolean;
  file: File | null;
  aspect: number;
  shape?: CropShape;
  title?: string;
  onCancel: () => void;
  onCropped: (blob: Blob) => void | Promise<void>;
}

/** Convert file → data URL for the cropper canvas */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

/** Load an image element from a data URL */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Produce a JPEG blob of the cropped region, longest side <= 1600px,
 * quality 0.85 — keeps upload under 1MB in almost all cases.
 */
async function getCroppedBlob(
  imageSrc: string,
  crop: Area,
  rotation = 0,
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const rad = (rotation * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));
  const bBoxW = img.width * cos + img.height * sin;
  const bBoxH = img.width * sin + img.height * cos;

  // Rotated canvas
  const canvas = document.createElement("canvas");
  canvas.width = bBoxW;
  canvas.height = bBoxH;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(bBoxW / 2, bBoxH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  // Crop
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = crop.width;
  cropCanvas.height = crop.height;
  const cctx = cropCanvas.getContext("2d")!;
  cctx.drawImage(
    canvas,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height,
  );

  // Resize if longest side > 1600
  const MAX = 1600;
  const longest = Math.max(cropCanvas.width, cropCanvas.height);
  let out = cropCanvas;
  if (longest > MAX) {
    const scale = MAX / longest;
    const rc = document.createElement("canvas");
    rc.width = Math.round(cropCanvas.width * scale);
    rc.height = Math.round(cropCanvas.height * scale);
    rc.getContext("2d")!.drawImage(cropCanvas, 0, 0, rc.width, rc.height);
    out = rc;
  }

  return new Promise((resolve, reject) => {
    out.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/jpeg",
      0.85,
    );
  });
}

export function ImageCropDialog({
  open,
  file,
  aspect,
  shape = "rect",
  title = "Adjust image",
  onCancel,
  onCropped,
}: ImageCropDialogProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (open && file) {
      readFileAsDataURL(file).then((d) => {
        if (!cancelled) {
          setSrc(d);
          setCrop({ x: 0, y: 0 });
          setZoom(1);
          setRotation(0);
        }
      });
    } else {
      setSrc(null);
    }
    return () => {
      cancelled = true;
    };
  }, [open, file]);

  const onCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setPixels(areaPx);
  }, []);

  const apply = async () => {
    if (!src || !pixels) return;
    setBusy(true);
    try {
      const blob = await getCroppedBlob(src, pixels, rotation);
      await onCropped(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-[360px] bg-black">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              rotation={rotation}
              aspect={aspect}
              cropShape={shape}
              showGrid
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onRotationChange={setRotation}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="px-5 py-4 space-y-3 border-t">
          <div className="flex items-center gap-3">
            <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
            <Slider
              value={[zoom]}
              min={1}
              max={4}
              step={0.05}
              onValueChange={([v]) => setZoom(v)}
              className="flex-1"
            />
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="p-2 rounded-md border hover:bg-accent transition-colors"
              aria-label="Rotate 90°"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Drag to reposition · pinch/scroll to zoom · rotate with the button
          </p>
        </div>

        <DialogFooter className="px-5 pb-5">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={apply} disabled={busy || !pixels}>
            {busy ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading…
              </>
            ) : (
              "Apply & Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
