// Photo upload helper: client-side resize na max 1600px + upload do Supabase Storage.
//
// Volá sa z `/new` flow. Vracia `storage_path` (nie public URL) — public URL
// si konzument doratá cez `publicPhotoUrl()` z `lib/supabase.ts`.

import {
  createBrowserSupabaseClient,
  STORY_PHOTOS_BUCKET,
} from "@/lib/supabase";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Zmenší fotku, aby najdlhšia strana mala max `MAX_DIMENSION` px.
 * Vracia Blob (JPEG). Pôvodný EXIF orientation rieši `createImageBitmap`.
 */
async function resizeImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });

  const { width, height } = bitmap;
  const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));
  const targetWidth = Math.round(width * scale);
  const targetHeight = Math.round(height * scale);

  const canvas =
    typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(targetWidth, targetHeight)
      : Object.assign(document.createElement("canvas"), {
          width: targetWidth,
          height: targetHeight,
        });

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close?.();

  if (canvas instanceof OffscreenCanvas) {
    return await canvas.convertToBlob({ type: "image/jpeg", quality: JPEG_QUALITY });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Canvas toBlob returned null"))),
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

export type UploadedPhoto = {
  storage_path: string;
  size_bytes: number;
};

/**
 * Resize + upload do `story-photos/{userId}/{storyId}/{index}-{timestamp}.jpg`.
 * Vracia `storage_path` (relatívnu cestu v buckete).
 */
export async function uploadPhoto(
  file: File,
  userId: string,
  storyId: string,
  index: number,
): Promise<UploadedPhoto> {
  const blob = await resizeImage(file);
  const timestamp = Date.now();
  const path = `${userId}/${storyId}/${index}-${timestamp}.jpg`;

  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.storage
    .from(STORY_PHOTOS_BUCKET)
    .upload(path, blob, {
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw new Error(`Photo upload failed: ${error.message}`);
  }

  return { storage_path: path, size_bytes: blob.size };
}
