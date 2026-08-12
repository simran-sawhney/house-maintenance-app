import type { Metadata } from "next";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { ShoppingMode } from "@/components/shopping/shopping-mode";
import type { ShoppingItem, Store } from "@/types/db";

export const metadata: Metadata = { title: "Shopping" };

export default async function ShopModePage() {
  const { household } = await requireHousehold();
  const supabase = await createClient();

  const [{ data: stores }, { data: items }] = await Promise.all([
    supabase
      .from("stores")
      .select("*")
      .eq("household_id", household.id)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("shopping_items")
      .select("*")
      .eq("household_id", household.id)
      .eq("status", "active")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <ShoppingMode
      initialItems={(items as ShoppingItem[]) ?? []}
      stores={(stores as Store[]) ?? []}
    />
  );
}
