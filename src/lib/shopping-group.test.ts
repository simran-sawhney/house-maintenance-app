import { describe, it, expect } from "vitest";
import { groupShopping } from "@/lib/shopping-group";
import type { ShoppingItem, Store } from "@/types/db";

const store = (id: string, name: string, sort: number): Store => ({
  id,
  household_id: "h",
  name,
  icon: null,
  sort_order: sort,
  active: true,
  created_at: "2026-08-01T00:00:00Z",
});

const item = (over: Partial<ShoppingItem>): ShoppingItem => ({
  id: Math.random().toString(36),
  household_id: "h",
  product_id: null,
  name: "x",
  normalized_name: "x",
  store_id: null,
  quantity: null,
  unit: null,
  notes: null,
  urgent: false,
  status: "active",
  added_by: null,
  created_at: "2026-08-01T00:00:00Z",
  completed_at: null,
  completed_by: null,
  ...over,
});

describe("groupShopping", () => {
  const woolies = store("w", "Woolworths", 0);
  const veggie = store("v", "Veggie Shop", 1);

  it("puts urgent items in their own group, out of store groups", () => {
    const items = [
      item({ name: "Milk", store_id: "w", urgent: true }),
      item({ name: "Bread", store_id: "w" }),
    ];
    const g = groupShopping(items, [woolies, veggie]);
    expect(g.urgent.map((i) => i.name)).toEqual(["Milk"]);
    const wooliesGroup = g.groups.find((x) => x.store?.id === "w");
    expect(wooliesGroup?.items.map((i) => i.name)).toEqual(["Bread"]);
  });

  it("orders store groups by store sort_order and unassigned last", () => {
    const items = [
      item({ name: "Coriander", store_id: "v" }),
      item({ name: "Milk", store_id: "w" }),
      item({ name: "Mystery", store_id: null }),
    ];
    const g = groupShopping(items, [woolies, veggie]);
    expect(g.groups.map((x) => x.store?.name ?? "none")).toEqual([
      "Woolworths",
      "Veggie Shop",
      "none",
    ]);
  });

  it("ignores non-active items", () => {
    const items = [
      item({ name: "Old", status: "purchased", store_id: "w" }),
      item({ name: "Cancelled", status: "cancelled" }),
    ];
    const g = groupShopping(items, [woolies]);
    expect(g.urgent).toHaveLength(0);
    expect(g.groups).toHaveLength(0);
  });
});
