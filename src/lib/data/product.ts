import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Product, Purchase, Store } from "@/types/db";
import { median } from "@/lib/suggestions/interval";

export type PriceStats = {
  count: number;
  lastPrice: number | null;
  averagePrice: number | null;
  lowestPrice: number | null;
  highestPrice: number | null;
  typicalStoreName: string | null;
  averageIntervalDays: number | null;
  lastPurchasedAt: string | null;
};

export type PurchaseRow = Purchase & { storeName: string | null };

export type ProductDetail = {
  product: Product;
  purchases: PurchaseRow[];
  stats: PriceStats;
};

export async function getProductDetail(
  supabase: SupabaseClient,
  householdId: string,
  productId: string,
): Promise<ProductDetail | null> {
  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("household_id", householdId)
    .maybeSingle();
  if (!product) return null;

  const { data: purchaseData } = await supabase
    .from("purchases")
    .select("*")
    .eq("household_id", householdId)
    .eq("product_id", productId)
    .order("purchased_at", { ascending: false });
  const purchases = (purchaseData as Purchase[]) ?? [];

  // Resolve store names.
  const storeIds = [
    ...new Set(purchases.map((p) => p.store_id).filter((v): v is string => !!v)),
  ];
  const storeName = new Map<string, string>();
  if (storeIds.length > 0) {
    const { data: stores } = await supabase
      .from("stores")
      .select("id, name")
      .in("id", storeIds);
    for (const s of (stores as Store[]) ?? []) storeName.set(s.id, s.name);
  }

  const prices = purchases
    .map((p) => p.price)
    .filter((v): v is number => v != null);
  const times = purchases
    .map((p) => new Date(p.purchased_at).getTime())
    .sort((a, b) => a - b);
  const intervals: number[] = [];
  for (let i = 1; i < times.length; i++)
    intervals.push((times[i] - times[i - 1]) / 86_400_000);

  // Typical store = most frequent.
  const storeCounts = new Map<string, number>();
  for (const p of purchases)
    if (p.store_id)
      storeCounts.set(p.store_id, (storeCounts.get(p.store_id) ?? 0) + 1);
  let typicalStore: string | null = null;
  let best = 0;
  for (const [s, n] of storeCounts)
    if (n > best) {
      best = n;
      typicalStore = s;
    }

  const stats: PriceStats = {
    count: purchases.length,
    lastPrice: purchases.find((p) => p.price != null)?.price ?? null,
    averagePrice:
      prices.length > 0
        ? prices.reduce((a, b) => a + b, 0) / prices.length
        : null,
    lowestPrice: prices.length > 0 ? Math.min(...prices) : null,
    highestPrice: prices.length > 0 ? Math.max(...prices) : null,
    typicalStoreName: typicalStore ? storeName.get(typicalStore) ?? null : null,
    averageIntervalDays: intervals.length > 0 ? median(intervals) : null,
    lastPurchasedAt: purchases[0]?.purchased_at ?? null,
  };

  return {
    product: product as Product,
    purchases: purchases.map((p) => ({
      ...p,
      storeName: p.store_id ? storeName.get(p.store_id) ?? null : null,
    })),
    stats,
  };
}
