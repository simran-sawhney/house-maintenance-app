import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/types/db";
import { normalizeRule } from "@/lib/recurrence/recurrence";
import { generateOccurrences } from "@/lib/recurrence/occurrences";
import { toDateStr, todayStr } from "@/lib/dates";

export type CalendarItem = {
  key: string;
  taskId: string;
  title: string;
  categoryId: string | null;
  urgent: boolean;
  assignedTo: string | null;
  recurring: boolean;
  occurrenceDate: string | null; // set for recurring, drives completion
  date: string; // YYYY-MM-DD the item sits on
  completed: boolean;
  overdue: boolean;
};

/**
 * Tasks (one-off + recurring occurrences) that fall within [rangeStart,
 * rangeEnd] (spec §7 — only the visible window is loaded/generated). Household
 * scoped; completion resolved from task_occurrences for recurring items.
 */
export type CalendarData = {
  items: CalendarItem[];
  tasks: Record<string, Task>;
};

export async function getCalendarItems(
  supabase: SupabaseClient,
  householdId: string,
  timezone: string,
  rangeStart: string,
  rangeEnd: string,
): Promise<CalendarData> {
  const today = todayStr(timezone);
  const startISO = `${rangeStart}T00:00:00.000Z`;
  const endISO = `${rangeEnd}T23:59:59.999Z`;

  const [oneOffRes, recurRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .is("recurrence_rule", null)
      .neq("status", "cancelled")
      .not("due_date", "is", null)
      .gte("due_date", startISO)
      .lte("due_date", endISO),
    supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .not("recurrence_rule", "is", null)
      .eq("status", "open")
      .is("parent_task_id", null),
  ]);

  const oneOff = (oneOffRes.data as Task[]) ?? [];
  const recurring = (recurRes.data as Task[]) ?? [];

  const tasks: Record<string, Task> = {};
  for (const t of [...oneOff, ...recurring]) tasks[t.id] = t;

  // Completion state for recurring tasks within the range.
  const completedByTask = new Map<string, Set<string>>();
  if (recurring.length > 0) {
    const { data: occ } = await supabase
      .from("task_occurrences")
      .select("task_id, occurrence_date")
      .eq("household_id", householdId)
      .eq("status", "completed")
      .in(
        "task_id",
        recurring.map((t) => t.id),
      )
      .gte("occurrence_date", rangeStart)
      .lte("occurrence_date", rangeEnd);
    for (const row of occ ?? []) {
      const set = completedByTask.get(row.task_id as string) ?? new Set();
      set.add(row.occurrence_date as string);
      completedByTask.set(row.task_id as string, set);
    }
  }

  const items: CalendarItem[] = [];

  for (const t of oneOff) {
    const date = toDateStr(t.due_date!, timezone);
    const completed = t.status === "completed";
    items.push({
      key: t.id,
      taskId: t.id,
      title: t.title,
      categoryId: t.category_id,
      urgent: t.urgent,
      assignedTo: t.assigned_to,
      recurring: false,
      occurrenceDate: null,
      date,
      completed,
      overdue: !completed && date < today,
    });
  }

  for (const t of recurring) {
    const rule = normalizeRule(t.recurrence_rule);
    if (!rule) continue;
    const anchor = toDateStr(t.due_date ?? t.created_at, timezone);
    const done = completedByTask.get(t.id) ?? new Set<string>();
    const dates = generateOccurrences(
      rule,
      anchor,
      rangeStart,
      rangeEnd,
      t.recurrence_end_date,
    );
    for (const date of dates) {
      const completed = done.has(date);
      items.push({
        key: `${t.id}:${date}`,
        taskId: t.id,
        title: t.title,
        categoryId: t.category_id,
        urgent: t.urgent,
        assignedTo: t.assigned_to,
        recurring: true,
        occurrenceDate: date,
        date,
        completed,
        overdue: !completed && date < today,
      });
    }
  }

  return { items, tasks };
}
