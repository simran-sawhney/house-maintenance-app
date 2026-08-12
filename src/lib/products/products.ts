import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/types/db";
import { normalizeItemName } from "@/lib/utils";

/** Find a household product by normalized name, or null. */
export async function findProductByName(
  supabase: SupabaseClient,
  householdId: string,
  name: string,
): Promise<Product | null> {
  const normalized = normalizeItemName(name);
  if (!normalized) return null;
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("household_id", householdId)
    .eq("normalized_name", normalized)
    .maybeSingle();
  return (data as Product | null) ?? null;
}

/**
 * Resolve an existing product or create a new reusable one (build spec §48).
 * Matched on normalized name within the household.
 */
export async function resolveOrCreateProduct(
  supabase: SupabaseClient,
  householdId: string,
  input: {
    name: string;
    storeId?: string | null;
    quantity?: number | null;
    unit?: string | null;
  },
): Promise<Product | null> {
  const existing = await findProductByName(supabase, householdId, input.name);
  if (existing) return existing;

  const normalized = normalizeItemName(input.name);
  if (!normalized) return null;

  const { data } = await supabase
    .from("products")
    .insert({
      household_id: householdId,
      name: input.name.trim(),
      normalized_name: normalized,
      default_store_id: input.storeId ?? null,
      default_quantity: input.quantity ?? null,
      default_unit: input.unit ?? null,
    })
    .select("*")
    .maybeSingle();

  return (data as Product | null) ?? null;
}

/**
 * Determine the most likely store for a product (build spec §49):
 *   1. product.default_store_id
 *   2. most common historical store
 *   3. last purchase store
 */
export async function likelyStoreForProduct(
  supabase: SupabaseClient,
  householdId: string,
  product: Pick<Product, "id" | "default_store_id">,
): Promise<string | null> {
  if (product.default_store_id) return product.default_store_id;

  const { data: rows } = await supabase
    .from("purchases")
    .select("store_id, purchased_at")
    .eq("household_id", householdId)
    .eq("product_id", product.id)
    .not("store_id", "is", null)
    .order("purchased_at", { ascending: false })
    .limit(50);

  if (!rows || rows.length === 0) return null;

  const counts = new Map<string, number>();
  for (const r of rows as { store_id: string }[]) {
    counts.set(r.store_id, (counts.get(r.store_id) ?? 0) + 1);
  }
  let best: string | null = null;
  let bestCount = 0;
  for (const [store, count] of counts) {
    if (count > bestCount) {
      best = store;
      bestCount = count;
    }
  }
  // Falls back to most-recent (first row) if counts tie at 1 each.
  return best ?? (rows[0] as { store_id: string }).store_id;
}
