"use server";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import { normalizeItemName } from "@/lib/utils";

export type AutocompleteSuggestion = {
  productId: string;
  name: string;
  storeId: string | null;
  storeName: string | null;
  quantity: number | null;
  unit: string | null;
};

/**
 * Autocomplete over reusable products (build spec §20). Prefix + substring
 * match on normalized name, most-purchased first. Also prefills the likely
 * store so the user can just press Add.
 */
export async function searchProductsForAutocomplete(
  query: string,
): Promise<AutocompleteSuggestion[]> {
  const q = query.trim();
  if (q.length < 1) return [];
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const normalized = normalizeItemName(q);
    if (!normalized) return [];

    const { data: products } = await supabase
      .from("products")
      .select(
        "id, name, default_store_id, default_quantity, default_unit, purchase_count, normalized_name",
      )
      .eq("household_id", household.id)
      .ilike("normalized_name", `%${normalized}%`)
      .order("purchase_count", { ascending: false })
      .limit(6);

    if (!products || products.length === 0) return [];

    // Rank prefix matches ahead of substring matches.
    const ranked = [...products].sort((a, b) => {
      const ap = (a.normalized_name as string).startsWith(normalized) ? 0 : 1;
      const bp = (b.normalized_name as string).startsWith(normalized) ? 0 : 1;
      if (ap !== bp) return ap - bp;
      return (b.purchase_count as number) - (a.purchase_count as number);
    });

    const storeIds = [
      ...new Set(
        ranked
          .map((p) => p.default_store_id as string | null)
          .filter((s): s is string => !!s),
      ),
    ];
    const storeNames = new Map<string, string>();
    if (storeIds.length > 0) {
      const { data: stores } = await supabase
        .from("stores")
        .select("id, name")
        .in("id", storeIds);
      for (const s of stores ?? [])
        storeNames.set(s.id as string, s.name as string);
    }

    return ranked.map((p) => ({
      productId: p.id as string,
      name: p.name as string,
      storeId: (p.default_store_id as string | null) ?? null,
      storeName: p.default_store_id
        ? (storeNames.get(p.default_store_id as string) ?? null)
        : null,
      quantity: (p.default_quantity as number | null) ?? null,
      unit: (p.default_unit as string | null) ?? null,
    }));
  } catch {
    return [];
  }
}
