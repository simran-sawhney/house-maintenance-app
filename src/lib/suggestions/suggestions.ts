import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product } from "@/types/db";
import { computeSuggestion } from "@/lib/suggestions/interval";

export type ProductSuggestion = {
  product: Product;
  typicalIntervalDays: number;
  daysSinceLast: number;
  score: number;
  likelyStoreId: string | null;
  likelyStoreName: string | null;
};

/**
 * Products the household may need soon (build spec §26, §80). Uses purchase
 * history only. Products already on the active list are excluded. Never adds
 * anything automatically — the UI offers an explicit "Add".
 */
export async function getSuggestedProducts(
  supabase: SupabaseClient,
  householdId: string,
  limit = 5,
): Promise<ProductSuggestion[]> {
  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .eq("household_id", householdId)
    .gte("purchase_count", 3);
  const products = (productsData as Product[]) ?? [];
  if (products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  // Names already active — exclude these from suggestions.
  const { data: activeData } = await supabase
    .from("shopping_items")
    .select("normalized_name")
    .eq("household_id", householdId)
    .eq("status", "active");
  const activeNames = new Set(
    (activeData ?? []).map((r) => r.normalized_name as string),
  );

  // All relevant purchase timestamps in one query (avoid N+1).
  const { data: purchaseData } = await supabase
    .from("purchases")
    .select("product_id, purchased_at, store_id")
    .eq("household_id", householdId)
    .in("product_id", productIds);

  const datesByProduct = new Map<string, number[]>();
  const storesByProduct = new Map<string, Map<string, number>>();
  for (const row of purchaseData ?? []) {
    const pid = row.product_id as string;
    if (!pid) continue;
    const arr = datesByProduct.get(pid) ?? [];
    arr.push(new Date(row.purchased_at as string).getTime());
    datesByProduct.set(pid, arr);
    if (row.store_id) {
      const counts = storesByProduct.get(pid) ?? new Map<string, number>();
      counts.set(
        row.store_id as string,
        (counts.get(row.store_id as string) ?? 0) + 1,
      );
      storesByProduct.set(pid, counts);
    }
  }

  const now = Date.now();
  const suggestions: ProductSuggestion[] = [];

  for (const product of products) {
    if (activeNames.has(product.normalized_name)) continue;
    const dates = datesByProduct.get(product.id) ?? [];
    const stats = computeSuggestion(dates, now);
    if (!stats || !stats.eligible) continue;

    // Likely store: default, else most common historical.
    let likelyStoreId = product.default_store_id;
    if (!likelyStoreId) {
      const counts = storesByProduct.get(product.id);
      if (counts) {
        let best: string | null = null;
        let bestN = 0;
        for (const [s, n] of counts)
          if (n > bestN) {
            best = s;
            bestN = n;
          }
        likelyStoreId = best;
      }
    }

    suggestions.push({
      product,
      typicalIntervalDays: stats.typicalIntervalDays,
      daysSinceLast: stats.daysSinceLast,
      score: stats.score,
      likelyStoreId: likelyStoreId ?? null,
      likelyStoreName: null,
    });
  }

  suggestions.sort((a, b) => b.score - a.score);
  const top = suggestions.slice(0, limit);

  // Resolve store names for the top suggestions only.
  const storeIds = [
    ...new Set(top.map((s) => s.likelyStoreId).filter((v): v is string => !!v)),
  ];
  if (storeIds.length > 0) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name")
      .in("id", storeIds);
    const nameById = new Map(
      (stores ?? []).map((s) => [s.id as string, s.name as string]),
    );
    for (const s of top)
      s.likelyStoreName = s.likelyStoreId
        ? (nameById.get(s.likelyStoreId) ?? null)
        : null;
  }

  return top;
}
