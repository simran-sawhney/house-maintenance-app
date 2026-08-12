import type { ShoppingItem, Store } from "@/types/db";

export type StoreGroup = { store: Store | null; items: ShoppingItem[] };
export type GroupedShopping = { urgent: ShoppingItem[]; groups: StoreGroup[] };

/**
 * Group active shopping items: urgent first, then by store (sort order), then
 * unassigned. Pure so it can run on the server (initial render) and the client
 * (optimistic updates) identically. (build spec §14)
 */
export function groupShopping(
  items: ShoppingItem[],
  stores: Store[],
): GroupedShopping {
  const active = items.filter((i) => i.status === "active");
  const urgent = active.filter((i) => i.urgent);

  const storeById = new Map(stores.map((s) => [s.id, s]));
  const grouped = new Map<string, ShoppingItem[]>();
  const noStore: ShoppingItem[] = [];

  for (const item of active) {
    if (item.urgent) continue;
    if (item.store_id && storeById.has(item.store_id)) {
      const arr = grouped.get(item.store_id) ?? [];
      arr.push(item);
      grouped.set(item.store_id, arr);
    } else {
      noStore.push(item);
    }
  }

  const groups: StoreGroup[] = [];
  for (const store of stores) {
    const arr = grouped.get(store.id);
    if (arr && arr.length > 0) groups.push({ store, items: arr });
  }
  if (noStore.length > 0) groups.push({ store: null, items: noStore });

  return { urgent, groups };
}
