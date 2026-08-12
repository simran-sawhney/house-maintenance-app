import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityEvent,
  ShoppingItem,
  Store,
  Task,
} from "@/types/db";
import { getShoppingBoard, storeCounts } from "@/lib/data/shopping";
import { groupTasks } from "@/lib/task-group";
import {
  getSuggestedProducts,
  type ProductSuggestion,
} from "@/lib/suggestions/suggestions";

export type ActivityLine = {
  id: string;
  text: string;
  createdAt: string;
};

export type Dashboard = {
  shoppingTotal: number;
  urgentShopping: ShoppingItem[];
  storeCounts: { store: Store; count: number }[];
  openTaskCount: number;
  urgentTasks: Task[];
  suggestions: ProductSuggestion[];
  activity: ActivityLine[];
};

const VERB: Record<string, string> = {
  shopping_added: "added",
  shopping_purchased: "bought",
  task_added: "added task",
  task_completed: "completed",
  maintenance_updated: "updated",
  note_added: "added note",
};

function activityText(
  event: ActivityEvent,
  actorName: string,
): string {
  const meta = event.metadata as { name?: string; title?: string; count?: number };
  const label = meta?.name || meta?.title || "";
  switch (event.event_type) {
    case "shopping_added":
      return meta?.count
        ? `${actorName} added ${meta.count} items`
        : `${actorName} added ${label}`;
    case "shopping_purchased":
      return `${actorName} bought ${label}`;
    case "task_added":
      return `${actorName} added task ${label}`;
    case "task_completed":
      return `${actorName} completed ${label}`;
    case "maintenance_updated":
      return `${actorName} updated the house log`;
    case "note_added":
      return `${actorName} added a note`;
    default:
      return `${actorName} ${VERB[event.event_type] ?? "did something"}`;
  }
}

/** One server-side loader for the whole Home dashboard (build spec §82). */
export async function getDashboard(
  supabase: SupabaseClient,
  householdId: string,
  stores: Store[],
): Promise<Dashboard> {
  const [board, tasksRes, activityRes, suggestions] = await Promise.all([
    getShoppingBoard(supabase, householdId, stores),
    supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .eq("status", "open"),
    supabase
      .from("activity_events")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false })
      .limit(15),
    getSuggestedProducts(supabase, householdId),
  ]);

  const tasks = (tasksRes.data as Task[]) ?? [];
  const grouped = groupTasks(tasks);
  const events = (activityRes.data as ActivityEvent[]) ?? [];

  // Resolve actor names.
  const actorIds = [
    ...new Set(events.map((e) => e.actor_id).filter((v): v is string => !!v)),
  ];
  const nameById = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", actorIds);
    for (const p of profiles ?? [])
      nameById.set(p.id as string, (p.display_name as string) || "Someone");
  }

  const activity: ActivityLine[] = events.map((e) => ({
    id: e.id,
    text: activityText(e, e.actor_id ? nameById.get(e.actor_id) ?? "Someone" : "Someone"),
    createdAt: e.created_at,
  }));

  return {
    shoppingTotal: board.total,
    urgentShopping: board.urgent,
    storeCounts: storeCounts(board),
    openTaskCount: tasks.length,
    urgentTasks: grouped.urgent,
    suggestions,
    activity,
  };
}
