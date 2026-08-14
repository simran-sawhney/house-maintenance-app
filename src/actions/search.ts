"use server";

import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import { formatFriendlyDate } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import type {
  MaintenanceItem,
  MaintenanceLog,
  Note,
  Purchase,
  ShoppingItem,
  Store,
  Task,
} from "@/types/db";
import { MAINTENANCE_STATUS_LABEL } from "@/types/db";

export type SearchResultItem = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type SearchSection = {
  key: string;
  label: string;
  items: SearchResultItem[];
};

/** Household-scoped global search (build spec §38, §83). Case-insensitive. */
export async function searchHousehold(
  query: string,
): Promise<SearchSection[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const like = `%${q}%`;
    const hid = household.id;
    const tz = household.timezone;
    const currency = household.currency_code;

    const [
      storesRes,
      shoppingRes,
      purchasesRes,
      tasksRes,
      completedRes,
      itemsRes,
      logsRes,
      notesRes,
    ] = await Promise.all([
      supabase.from("stores").select("id, name").eq("household_id", hid),
      supabase
        .from("shopping_items")
        .select("*")
        .eq("household_id", hid)
        .eq("status", "active")
        .ilike("name", like)
        .limit(8),
      supabase
        .from("purchases")
        .select("*")
        .eq("household_id", hid)
        .ilike("name", like)
        .order("purchased_at", { ascending: false })
        .limit(8),
      supabase
        .from("tasks")
        .select("*")
        .eq("household_id", hid)
        .ilike("title", like)
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(6),
      // Completed history: one-off completed tasks + completed recurring
      // occurrences (spec §9, §11).
      supabase
        .from("completed_task_history")
        .select("task_id, title, occurrence_date, completed_at, recurring")
        .eq("household_id", hid)
        .ilike("title", like)
        .order("completed_at", { ascending: false })
        .limit(6),
      supabase
        .from("maintenance_items")
        .select("*")
        .eq("household_id", hid)
        .or(`title.ilike.${like},description.ilike.${like}`)
        .limit(8),
      supabase
        .from("maintenance_logs")
        .select("*")
        .eq("household_id", hid)
        .ilike("note", like)
        .order("occurred_at", { ascending: false })
        .limit(8),
      supabase
        .from("notes")
        .select("*")
        .eq("household_id", hid)
        .or(`title.ilike.${like},content.ilike.${like}`)
        .limit(8),
    ]);

    const storeName = new Map(
      ((storesRes.data as Store[]) ?? []).map((s) => [s.id, s.name]),
    );

    const sections: SearchSection[] = [];

    const shopping = (shoppingRes.data as ShoppingItem[]) ?? [];
    if (shopping.length) {
      sections.push({
        key: "buy",
        label: "Buy",
        items: shopping.map((i) => ({
          id: i.id,
          title: i.name,
          subtitle: i.store_id ? storeName.get(i.store_id) : undefined,
          href: "/buy",
        })),
      });
    }

    const purchases = (purchasesRes.data as Purchase[]) ?? [];
    if (purchases.length) {
      sections.push({
        key: "purchases",
        label: "Purchases",
        items: purchases.map((p) => ({
          id: p.id,
          title: p.name,
          subtitle: [
            `purchased ${formatFriendlyDate(p.purchased_at, tz)}`,
            p.store_id ? storeName.get(p.store_id) : null,
            p.price != null ? formatMoney(p.price, currency) : null,
          ]
            .filter(Boolean)
            .join(" · "),
          href: "/history?tab=shopping",
        })),
      });
    }

    const openTasks = (tasksRes.data as Task[]) ?? [];
    const completed =
      (completedRes.data as {
        task_id: string;
        title: string;
        occurrence_date: string | null;
        completed_at: string | null;
      }[]) ?? [];
    const taskItems: SearchResultItem[] = [
      ...openTasks.map((t) => ({
        id: `open:${t.id}`,
        title: t.title,
        subtitle: "open",
        href: "/tasks",
      })),
      ...completed.map((c) => ({
        id: `done:${c.task_id}:${c.occurrence_date ?? "one"}`,
        title: c.title,
        subtitle: `completed ${formatFriendlyDate(c.occurrence_date ?? c.completed_at, tz)}`,
        href: "/history?tab=tasks",
      })),
    ].slice(0, 10);
    if (taskItems.length) {
      sections.push({ key: "tasks", label: "Tasks", items: taskItems });
    }

    const items = (itemsRes.data as MaintenanceItem[]) ?? [];
    const logs = (logsRes.data as MaintenanceLog[]) ?? [];
    const houseItems: SearchResultItem[] = [
      ...items.map((i) => ({
        id: i.id,
        title: i.title,
        subtitle: `${i.area} · ${MAINTENANCE_STATUS_LABEL[i.status]}`,
        href: `/house/${i.id}`,
      })),
      ...logs.map((l) => ({
        id: l.id,
        title: l.note.length > 60 ? l.note.slice(0, 60) + "…" : l.note,
        subtitle: `log · ${formatFriendlyDate(l.occurred_at, tz)}`,
        href: `/house/${l.maintenance_item_id}`,
      })),
    ];
    if (houseItems.length) {
      sections.push({ key: "house", label: "House", items: houseItems });
    }

    const notes = (notesRes.data as Note[]) ?? [];
    if (notes.length) {
      sections.push({
        key: "notes",
        label: "Notes",
        items: notes.map((n) => ({
          id: n.id,
          title: n.title,
          subtitle: n.area ?? undefined,
          href: "/house",
        })),
      });
    }

    return sections;
  } catch {
    return [];
  }
}
