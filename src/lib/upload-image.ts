"use client";

import { createClient } from "@/lib/supabase/client";
import { SHOPPING_BUCKET } from "@/lib/storage";

/**
 * Downscale + compress an image in the browser before upload (spec §24).
 * Longest edge ~1400px, JPEG ~0.8 — enough to read packaging, a few hundred KB.
 */
async function compress(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("decode failed"));
    el.src = dataUrl;
  });

  const MAX = 1400;
  let { width, height } = img;
  if (width > MAX || height > MAX) {
    const scale = MAX / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file; // fall back to the original
  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", 0.8),
  );
  return blob ?? file;
}

/**
 * Compress and upload a shopping image. Returns the storage path (to persist)
 * or throws on failure so the caller can offer retry — the item itself is
 * saved independently (spec §25).
 */
export async function uploadShoppingImage(
  householdId: string,
  file: File,
): Promise<string> {
  const supabase = createClient();
  const blob = await compress(file);
  const path = `households/${householdId}/shopping/${crypto.randomUUID()}/photo.jpg`;
  const { error } = await supabase.storage
    .from(SHOPPING_BUCKET)
    .upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw error;
  return path;
}
