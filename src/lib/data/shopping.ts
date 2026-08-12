import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ShoppingItem, Store } from "@/types/db";
import { groupShopping, type GroupedShopping } from "@/lib/shopping-group";

export type ShoppingBoard = GroupedShopping & {
  items: ShoppingItem[];
  total: number;
};

/** Active shopping list, grouped for the Buy screen (build spec §14). */
export async function getShoppingBoard(
  supabase: SupabaseClient,
  householdId: string,
  stores: Store[],
): Promise<ShoppingBoard> {
  const { data } = await supabase
    .from("shopping_items")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const items = (data as ShoppingItem[]) ?? [];
  const grouped = groupShopping(items, stores);
  return { ...grouped, items, total: items.length };
}

/** Per-store counts for the dashboard summary (build spec §7). */
export function storeCounts(board: ShoppingBoard): {
  store: Store;
  count: number;
}[] {
  return board.groups
    .filter((g): g is { store: Store; items: ShoppingItem[] } => !!g.store)
    .map((g) => ({ store: g.store, count: g.items.length }))
    .sort((a, b) => b.count - a.count);
}
