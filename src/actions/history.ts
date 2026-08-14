"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import {
  resolveDateRange,
  cleanSearchTerm,
  type DateRangeKey,
} from "@/lib/history-range";
import { SHOPPING_BUCKET } from "@/lib/storage";

const PAGE_SIZE = 40;

async function signProductImages(
  supabase: SupabaseClient,
  productIds: string[],
): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};
  const { data: products } = await supabase
    .from("products")
    .select("id, image_path")
    .in("id", productIds);
  const pathByProduct = new Map<string, string>();
  for (const p of products ?? [])
    if (p.image_path) pathByProduct.set(p.id as string, p.image_path as string);
  const paths = [...new Set(pathByProduct.values())];
  if (paths.length === 0) return {};
  const { data: signed } = await supabase.storage
    .from(SHOPPING_BUCKET)
    .createSignedUrls(paths, 3600);
  const urlByPath = new Map<string, string>();
  for (const s of signed ?? [])
    if (s.signedUrl && s.path) urlByPath.set(s.path, s.signedUrl);
  const out: Record<string, string> = {};
  for (const [pid, path] of pathByProduct) {
    const url = urlByPath.get(path);
    if (url) out[pid] = url;
  }
  return out;
}

/* ----------------------------- Purchases ------------------------------ */

export type PurchaseSort = "recent" | "oldest" | "price_high" | "price_low";

export type PurchaseHistoryItem = {
  id: string;
  name: string;
  storeName: string | null;
  price: number | null;
  quantity: number | null;
  unit: string | null;
  purchasedAt: string;
  purchasedByName: string | null;
  productId: string | null;
  imageUrl: string | null;
};

export type PurchaseHistoryInput = {
  q?: string;
  storeId?: string | null;
  memberId?: string | null;
  range?: DateRangeKey;
  from?: string | null;
  to?: string | null;
  sort?: PurchaseSort;
  page?: number;
};

export type PurchaseHistoryResult = {
  items: PurchaseHistoryItem[];
  hasMore: boolean;
  page: number;
};

export async function searchPurchaseHistory(
  input: PurchaseHistoryInput,
): Promise<PurchaseHistoryResult> {
  const page = Math.max(0, input.page ?? 0);
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const hid = household.id;

    let query = supabase
      .from("purchases")
      .select("*")
      .eq("household_id", hid);

    const { from, to } = resolveDateRange(
      input.range,
      household.timezone,
      input.from,
      input.to,
    );
    if (from) query = query.gte("purchased_at", `${from}T00:00:00.000Z`);
    if (to) query = query.lte("purchased_at", `${to}T23:59:59.999Z`);
    if (input.storeId) query = query.eq("store_id", input.storeId);
    if (input.memberId) query = query.eq("purchased_by", input.memberId);

    const term = cleanSearchTerm(input.q ?? "");
    if (term.length >= 2) {
      const [{ data: prods }, { data: sts }] = await Promise.all([
        supabase
          .from("products")
          .select("id")
          .eq("household_id", hid)
          .ilike("name", `%${term}%`)
          .limit(50),
        supabase
          .from("stores")
          .select("id")
          .eq("household_id", hid)
          .ilike("name", `%${term}%`),
      ]);
      const orParts = [`name.ilike.%${term}%`, `notes.ilike.%${term}%`];
      const productIds = (prods ?? []).map((p) => p.id as string);
      const storeIds = (sts ?? []).map((s) => s.id as string);
      if (productIds.length > 0)
        orParts.push(`product_id.in.(${productIds.join(",")})`);
      if (storeIds.length > 0)
        orParts.push(`store_id.in.(${storeIds.join(",")})`);
      query = query.or(orParts.join(","));
    }

    switch (input.sort) {
      case "oldest":
        query = query.order("purchased_at", { ascending: true });
        break;
      case "price_high":
        query = query.order("price", { ascending: false, nullsFirst: false });
        break;
      case "price_low":
        query = query.order("price", { ascending: true, nullsFirst: false });
        break;
      default:
        query = query.order("purchased_at", { ascending: false });
    }

    const start = page * PAGE_SIZE;
    query = query.range(start, start + PAGE_SIZE);

    const { data } = await query;
    const rows = data ?? [];
    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = rows.slice(0, PAGE_SIZE);

    // Resolve names + images.
    const storeIds = [
      ...new Set(pageRows.map((r) => r.store_id).filter(Boolean) as string[]),
    ];
    const buyerIds = [
      ...new Set(pageRows.map((r) => r.purchased_by).filter(Boolean) as string[]),
    ];
    const productIds = [
      ...new Set(pageRows.map((r) => r.product_id).filter(Boolean) as string[]),
    ];
    const [storeRes, buyerRes, images] = await Promise.all([
      storeIds.length
        ? supabase.from("stores").select("id, name").in("id", storeIds)
        : Promise.resolve({ data: [] }),
      buyerIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", buyerIds)
        : Promise.resolve({ data: [] }),
      signProductImages(supabase, productIds),
    ]);
    const storeName = new Map(
      (storeRes.data ?? []).map((s) => [s.id as string, s.name as string]),
    );
    const buyerName = new Map(
      (buyerRes.data ?? []).map((p) => [
        p.id as string,
        (p.display_name as string) || "Member",
      ]),
    );

    const items: PurchaseHistoryItem[] = pageRows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      storeName: r.store_id ? storeName.get(r.store_id as string) ?? null : null,
      price: (r.price as number | null) ?? null,
      quantity: (r.quantity as number | null) ?? null,
      unit: (r.unit as string | null) ?? null,
      purchasedAt: r.purchased_at as string,
      purchasedByName: r.purchased_by
        ? buyerName.get(r.purchased_by as string) ?? null
        : null,
      productId: (r.product_id as string | null) ?? null,
      imageUrl: r.product_id ? images[r.product_id as string] ?? null : null,
    }));

    return { items, hasMore, page };
  } catch {
    return { items: [], hasMore: false, page };
  }
}

/* --------------------------- Completed tasks -------------------------- */

export type TaskSort = "recent" | "oldest";
export type TaskTypeFilter = "all" | "oneoff" | "recurring";

export type TaskHistoryItem = {
  key: string;
  taskId: string;
  title: string;
  categoryName: string | null;
  categoryIcon: string | null;
  recurring: boolean;
  occurrenceDate: string | null;
  completedAt: string | null;
  completedByName: string | null;
  notes: string | null;
};

export type TaskHistoryInput = {
  q?: string;
  categoryId?: string | null;
  memberId?: string | null;
  range?: DateRangeKey;
  from?: string | null;
  to?: string | null;
  taskType?: TaskTypeFilter;
  sort?: TaskSort;
  page?: number;
};

export type TaskHistoryResult = {
  items: TaskHistoryItem[];
  hasMore: boolean;
  page: number;
};

export async function searchCompletedTaskHistory(
  input: TaskHistoryInput,
): Promise<TaskHistoryResult> {
  const page = Math.max(0, input.page ?? 0);
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const hid = household.id;

    let query = supabase
      .from("completed_task_history")
      .select("*")
      .eq("household_id", hid);

    const { from, to } = resolveDateRange(
      input.range,
      household.timezone,
      input.from,
      input.to,
    );
    if (from) query = query.gte("completed_at", `${from}T00:00:00.000Z`);
    if (to) query = query.lte("completed_at", `${to}T23:59:59.999Z`);
    if (input.categoryId) query = query.eq("category_id", input.categoryId);
    if (input.memberId) query = query.eq("completed_by", input.memberId);
    if (input.taskType === "oneoff") query = query.eq("recurring", false);
    if (input.taskType === "recurring") query = query.eq("recurring", true);

    const term = cleanSearchTerm(input.q ?? "");
    if (term.length >= 2) {
      const [{ data: cats }, { data: mems }] = await Promise.all([
        supabase
          .from("task_categories")
          .select("id")
          .eq("household_id", hid)
          .ilike("name", `%${term}%`),
        supabase
          .from("profiles")
          .select("id")
          .ilike("display_name", `%${term}%`),
      ]);
      const orParts = [`title.ilike.%${term}%`, `notes.ilike.%${term}%`];
      const catIds = (cats ?? []).map((c) => c.id as string);
      const memIds = (mems ?? []).map((m) => m.id as string);
      if (catIds.length > 0)
        orParts.push(`category_id.in.(${catIds.join(",")})`);
      if (memIds.length > 0)
        orParts.push(`completed_by.in.(${memIds.join(",")})`);
      query = query.or(orParts.join(","));
    }

    query = query.order("completed_at", {
      ascending: input.sort === "oldest",
      nullsFirst: false,
    });

    const start = page * PAGE_SIZE;
    query = query.range(start, start + PAGE_SIZE);

    const { data } = await query;
    const rows = data ?? [];
    const hasMore = rows.length > PAGE_SIZE;
    const pageRows = rows.slice(0, PAGE_SIZE);

    const catIds = [
      ...new Set(pageRows.map((r) => r.category_id).filter(Boolean) as string[]),
    ];
    const memIds = [
      ...new Set(pageRows.map((r) => r.completed_by).filter(Boolean) as string[]),
    ];
    const [catRes, memRes] = await Promise.all([
      catIds.length
        ? supabase.from("task_categories").select("id, name, icon").in("id", catIds)
        : Promise.resolve({ data: [] }),
      memIds.length
        ? supabase.from("profiles").select("id, display_name").in("id", memIds)
        : Promise.resolve({ data: [] }),
    ]);
    const catInfo = new Map(
      (catRes.data ?? []).map((c) => [
        c.id as string,
        { name: c.name as string, icon: (c.icon as string) ?? null },
      ]),
    );
    const memName = new Map(
      (memRes.data ?? []).map((m) => [
        m.id as string,
        (m.display_name as string) || "Member",
      ]),
    );

    const items: TaskHistoryItem[] = pageRows.map((r) => {
      const cat = r.category_id ? catInfo.get(r.category_id as string) : null;
      return {
        key: `${r.task_id}:${r.occurrence_date ?? "one"}`,
        taskId: r.task_id as string,
        title: r.title as string,
        categoryName: cat?.name ?? null,
        categoryIcon: cat?.icon ?? null,
        recurring: r.recurring as boolean,
        occurrenceDate: (r.occurrence_date as string | null) ?? null,
        completedAt: (r.completed_at as string | null) ?? null,
        completedByName: r.completed_by
          ? memName.get(r.completed_by as string) ?? null
          : null,
        notes: (r.notes as string | null) ?? null,
      };
    });

    return { items, hasMore, page };
  } catch {
    return { items: [], hasMore: false, page };
  }
}
