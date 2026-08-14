import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShoppingItem } from "@/types/db";
import { SHOPPING_BUCKET } from "@/lib/storage";

/**
 * Resolve display image URLs for shopping items (spec §21 precedence:
 * item image override -> product default image -> none). Returns a map of
 * itemId -> signed URL. Bucket is private, so we mint short-lived signed URLs.
 */
export async function resolveShoppingImageUrls(
  supabase: SupabaseClient,
  items: Pick<ShoppingItem, "id" | "image_path" | "product_id">[],
): Promise<Record<string, string>> {
  // Effective path per item.
  const productIds = [
    ...new Set(
      items
        .filter((i) => !i.image_path && i.product_id)
        .map((i) => i.product_id as string),
    ),
  ];
  const productImage = new Map<string, string>();
  if (productIds.length > 0) {
    const { data } = await supabase
      .from("products")
      .select("id, image_path")
      .in("id", productIds);
    for (const p of data ?? [])
      if (p.image_path) productImage.set(p.id as string, p.image_path as string);
  }

  const pathByItem = new Map<string, string>();
  for (const item of items) {
    const path =
      item.image_path ??
      (item.product_id ? productImage.get(item.product_id) : undefined);
    if (path) pathByItem.set(item.id, path);
  }

  const paths = [...new Set(pathByItem.values())];
  if (paths.length === 0) return {};

  const { data: signed } = await supabase.storage
    .from(SHOPPING_BUCKET)
    .createSignedUrls(paths, 3600);
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? [])
    if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);

  const result: Record<string, string> = {};
  for (const [itemId, path] of pathByItem) {
    const url = urlByPath.get(path);
    if (url) result[itemId] = url;
  }
  return result;
}
