"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import { logActivity } from "@/lib/activity";
import {
  findProductByName,
  resolveOrCreateProduct,
} from "@/lib/products/products";
import { normalizeItemName } from "@/lib/utils";
import type { ShoppingItem } from "@/types/db";

function revalidateShopping() {
  revalidatePath("/buy");
  revalidatePath("/");
}

export type CreateItemInput = {
  name: string;
  storeId?: string | null;
  quantity?: number | null;
  unit?: string | null;
  notes?: string | null;
  urgent?: boolean;
  imagePath?: string | null;
  allowDuplicate?: boolean;
};

export type CreateItemResult =
  | { status: "ok"; item: ShoppingItem }
  | { status: "duplicate"; existing: ShoppingItem; storeName: string | null }
  | { status: "error"; message: string };

/** Create a single shopping item (build spec §9, §21). */
export async function createShoppingItem(
  input: CreateItemInput,
): Promise<CreateItemResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();

    const name = input.name.trim();
    if (!name) return { status: "error", message: "Please enter an item name." };
    const normalized = normalizeItemName(name);

    // Duplicate detection against the active list.
    if (!input.allowDuplicate) {
      const { data: dup } = await supabase
        .from("shopping_items")
        .select("*")
        .eq("household_id", household.id)
        .eq("status", "active")
        .eq("normalized_name", normalized)
        .limit(1)
        .maybeSingle();
      if (dup) {
        let storeName: string | null = null;
        if ((dup as ShoppingItem).store_id) {
          const { data: store } = await supabase
            .from("stores")
            .select("name")
            .eq("id", (dup as ShoppingItem).store_id!)
            .maybeSingle();
          storeName = (store?.name as string) ?? null;
        }
        return { status: "duplicate", existing: dup as ShoppingItem, storeName };
      }
    }

    // Link to an existing product for smart defaults, but don't create a new
    // product until purchase (spec §48).
    const product = await findProductByName(supabase, household.id, name);

    const { data, error } = await supabase
      .from("shopping_items")
      .insert({
        household_id: household.id,
        product_id: product?.id ?? null,
        name,
        normalized_name: normalized,
        store_id: input.storeId ?? product?.default_store_id ?? null,
        quantity: input.quantity ?? null,
        unit: input.unit ?? null,
        notes: input.notes?.trim() || null,
        urgent: input.urgent ?? false,
        image_path: input.imagePath ?? null,
        added_by: user.id,
      })
      .select("*")
      .single();

    if (error) return { status: "error", message: "Couldn't save this item. Try again." };

    // Promote a new image to the reusable product when it has none (spec §20).
    if (input.imagePath && product && !product.image_path) {
      await supabase
        .from("products")
        .update({ image_path: input.imagePath })
        .eq("id", product.id)
        .eq("household_id", household.id);
    }

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "shopping_added",
      entityType: "shopping_item",
      entityId: data.id,
      metadata: { name },
    });

    revalidateShopping();
    return { status: "ok", item: data as ShoppingItem };
  } catch {
    return { status: "error", message: "Couldn't save this item. Try again." };
  }
}

export type BatchResult =
  | { status: "ok"; added: number; skipped: number }
  | { status: "error"; message: string };

/** Batch entry: one item per non-empty line (build spec §12). */
export async function createShoppingItemsBatch(input: {
  storeId?: string | null;
  text: string;
  urgent?: boolean;
}): Promise<BatchResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();

    const names = input.text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (names.length === 0)
      return { status: "error", message: "Nothing to add." };

    // Existing active names, to skip duplicates.
    const { data: activeRows } = await supabase
      .from("shopping_items")
      .select("normalized_name")
      .eq("household_id", household.id)
      .eq("status", "active");
    const existing = new Set(
      (activeRows ?? []).map((r) => r.normalized_name as string),
    );

    const seen = new Set<string>();
    const toInsert: Record<string, unknown>[] = [];
    let skipped = 0;
    for (const name of names) {
      const normalized = normalizeItemName(name);
      if (!normalized) continue;
      if (existing.has(normalized) || seen.has(normalized)) {
        skipped++;
        continue;
      }
      seen.add(normalized);
      const product = await findProductByName(supabase, household.id, name);
      toInsert.push({
        household_id: household.id,
        product_id: product?.id ?? null,
        name,
        normalized_name: normalized,
        store_id: input.storeId ?? product?.default_store_id ?? null,
        urgent: input.urgent ?? false,
        added_by: user.id,
      });
    }

    if (toInsert.length === 0)
      return { status: "ok", added: 0, skipped };

    const { data, error } = await supabase
      .from("shopping_items")
      .insert(toInsert)
      .select("id, name");
    if (error) return { status: "error", message: "Couldn't add these items. Try again." };

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "shopping_added",
      entityType: "shopping_item",
      metadata: { count: data.length, batch: true },
    });

    revalidateShopping();
    return { status: "ok", added: data.length, skipped };
  } catch {
    return { status: "error", message: "Couldn't add these items. Try again." };
  }
}

export type SimpleResult = { ok: boolean; message?: string };

/** Edit an active shopping item (build spec §64). */
export async function updateShoppingItem(
  id: string,
  patch: {
    name?: string;
    storeId?: string | null;
    quantity?: number | null;
    unit?: string | null;
    notes?: string | null;
    urgent?: boolean;
  },
): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();

    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) {
      const name = patch.name.trim();
      if (!name) return { ok: false, message: "Name can't be empty." };
      update.name = name;
      update.normalized_name = normalizeItemName(name);
    }
    if (patch.storeId !== undefined) update.store_id = patch.storeId;
    if (patch.quantity !== undefined) update.quantity = patch.quantity;
    if (patch.unit !== undefined) update.unit = patch.unit;
    if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
    if (patch.urgent !== undefined) update.urgent = patch.urgent;

    const { error } = await supabase
      .from("shopping_items")
      .update(update)
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't update. Try again." };

    revalidateShopping();
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't update. Try again." };
  }
}

/** Soft-cancel an active shopping item (build spec §84). */
export async function cancelShoppingItem(id: string): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const { error } = await supabase
      .from("shopping_items")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("household_id", household.id)
      .eq("status", "active");
    if (error) return { ok: false, message: "Couldn't remove. Try again." };
    revalidateShopping();
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't remove. Try again." };
  }
}

export type CompleteResult =
  | { ok: true; purchaseId: string }
  | { ok: false; message: string };

/**
 * Purchase transaction (build spec §16, §47). Marks the item purchased,
 * resolves/creates the product, writes a purchase record, and updates product
 * stats. The unique index on purchases(shopping_item_id) makes re-runs
 * idempotent.
 */
export async function completeShoppingItem(
  id: string,
  extra?: { price?: number | null; quantity?: number | null },
): Promise<CompleteResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();

    // Load the item and verify it belongs to the household + is active.
    const { data: item } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("id", id)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!item) return { ok: false, message: "Item not found." };
    const shopping = item as ShoppingItem;

    // Idempotency: if already purchased, return the existing purchase.
    if (shopping.status === "purchased") {
      const { data: existing } = await supabase
        .from("purchases")
        .select("id")
        .eq("shopping_item_id", id)
        .maybeSingle();
      if (existing) return { ok: true, purchaseId: existing.id as string };
    }

    const now = new Date().toISOString();
    const quantity = extra?.quantity ?? shopping.quantity ?? null;
    const price = extra?.price ?? null;

    // Resolve/create product.
    const product = await resolveOrCreateProduct(supabase, household.id, {
      name: shopping.name,
      storeId: shopping.store_id,
      quantity,
      unit: shopping.unit,
    });

    // Mark purchased.
    await supabase
      .from("shopping_items")
      .update({
        status: "purchased",
        completed_at: now,
        completed_by: user.id,
        product_id: product?.id ?? shopping.product_id ?? null,
        quantity,
      })
      .eq("id", id)
      .eq("household_id", household.id);

    // Create purchase (unique index guards duplicates).
    const { data: purchase, error: pErr } = await supabase
      .from("purchases")
      .insert({
        household_id: household.id,
        shopping_item_id: id,
        product_id: product?.id ?? null,
        name: shopping.name,
        store_id: shopping.store_id,
        quantity,
        unit: shopping.unit,
        price,
        purchased_by: user.id,
        purchased_at: now,
      })
      .select("id")
      .maybeSingle();

    let purchaseId = purchase?.id as string | undefined;
    if (pErr || !purchaseId) {
      const { data: existing } = await supabase
        .from("purchases")
        .select("id")
        .eq("shopping_item_id", id)
        .maybeSingle();
      purchaseId = existing?.id as string | undefined;
    }

    // Update product stats (+ promote the item's image if the product has none).
    if (product) {
      await supabase
        .from("products")
        .update({
          purchase_count: (product.purchase_count ?? 0) + 1,
          last_purchased_at: now,
          default_store_id: product.default_store_id ?? shopping.store_id,
          ...(shopping.image_path && !product.image_path
            ? { image_path: shopping.image_path }
            : {}),
        })
        .eq("id", product.id)
        .eq("household_id", household.id);
    }

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "shopping_purchased",
      entityType: "shopping_item",
      entityId: id,
      metadata: { name: shopping.name, price },
    });

    revalidateShopping();
    revalidatePath("/history");
    if (!purchaseId) return { ok: false, message: "Saved, but couldn't confirm." };
    return { ok: true, purchaseId };
  } catch {
    return { ok: false, message: "Couldn't complete. Try again." };
  }
}

/** Record an optional price/quantity onto an existing purchase. */
export async function updatePurchaseDetails(
  purchaseId: string,
  patch: { price?: number | null; quantity?: number | null },
): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const update: Record<string, unknown> = {};
    if (patch.price !== undefined) update.price = patch.price;
    if (patch.quantity !== undefined) update.quantity = patch.quantity;
    if (Object.keys(update).length === 0) return { ok: true };
    const { error } = await supabase
      .from("purchases")
      .update(update)
      .eq("id", purchaseId)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't save price." };
    revalidatePath("/history");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save price." };
  }
}

/** Undo a purchase (build spec §17). Restores the active item + reverses stats. */
export async function undoShoppingPurchase(
  shoppingItemId: string,
): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();

    const { data: item } = await supabase
      .from("shopping_items")
      .select("*")
      .eq("id", shoppingItemId)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!item) return { ok: false, message: "Item not found." };

    // Reverse product stats if a purchase existed.
    const { data: purchase } = await supabase
      .from("purchases")
      .select("id, product_id")
      .eq("shopping_item_id", shoppingItemId)
      .eq("household_id", household.id)
      .maybeSingle();

    if (purchase?.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("purchase_count")
        .eq("id", purchase.product_id)
        .maybeSingle();
      if (product) {
        await supabase
          .from("products")
          .update({
            purchase_count: Math.max(0, (product.purchase_count as number) - 1),
          })
          .eq("id", purchase.product_id)
          .eq("household_id", household.id);
      }
    }

    if (purchase?.id) {
      await supabase
        .from("purchases")
        .delete()
        .eq("id", purchase.id)
        .eq("household_id", household.id);
    }

    await supabase
      .from("shopping_items")
      .update({ status: "active", completed_at: null, completed_by: null })
      .eq("id", shoppingItemId)
      .eq("household_id", household.id);

    revalidateShopping();
    revalidatePath("/history");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't undo. Try again." };
  }
}

/** Set or clear a shopping item's image (spec §21). Promotes to product default. */
export async function setShoppingItemImage(
  id: string,
  imagePath: string | null,
): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const { data: item } = await supabase
      .from("shopping_items")
      .select("id, product_id")
      .eq("id", id)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!item) return { ok: false, message: "Item not found." };

    const { error } = await supabase
      .from("shopping_items")
      .update({ image_path: imagePath })
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't save the photo." };

    if (imagePath && item.product_id) {
      const { data: product } = await supabase
        .from("products")
        .select("id, image_path")
        .eq("id", item.product_id)
        .maybeSingle();
      if (product && !product.image_path) {
        await supabase
          .from("products")
          .update({ image_path: imagePath })
          .eq("id", product.id)
          .eq("household_id", household.id);
      }
    }

    revalidateShopping();
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save the photo." };
  }
}

/** Re-add a product to the active list (used by suggestions, build spec §26). */
export async function addProductToList(
  productId: string,
): Promise<CreateItemResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const { data: product } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!product) return { status: "error", message: "Product not found." };
    return createShoppingItem({
      name: product.name as string,
      storeId: product.default_store_id as string | null,
      quantity: product.default_quantity as number | null,
      unit: product.default_unit as string | null,
    });
  } catch {
    return { status: "error", message: "Couldn't add. Try again." };
  }
}
