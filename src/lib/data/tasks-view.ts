import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/types/db";
import { normalizeRule } from "@/lib/recurrence/recurrence";
import { currentOccurrence, addDaysStr } from "@/lib/recurrence/occurrences";
import { toDateStr, todayStr } from "@/lib/dates";

export type TaskView = {
  task: Task;
  recurring: boolean;
  /** For recurring tasks, the occurrence being surfaced; null for one-off. */
  occurrenceDate: string | null;
  /** Effective calendar date (YYYY-MM-DD) for sorting/grouping, or null. */
  dateStr: string | null;
  overdue: boolean;
};

/**
 * Open tasks the household should act on now. One-off tasks appear as-is;
 * each recurring task appears once, surfaced at its current actionable
 * occurrence (spec §5, §8). Nothing is pre-generated.
 */
export async function getOpenTaskViews(
  supabase: SupabaseClient,
  householdId: string,
  timezone: string,
): Promise<TaskView[]> {
  const today = todayStr(timezone);

  const [oneOffRes, recurRes] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .eq("status", "open")
      .is("recurrence_rule", null),
    supabase
      .from("tasks")
      .select("*")
      .eq("household_id", householdId)
      .eq("status", "open")
      .not("recurrence_rule", "is", null)
      .is("parent_task_id", null),
  ]);

  const oneOff = (oneOffRes.data as Task[]) ?? [];
  const recurring = (recurRes.data as Task[]) ?? [];

  // Completion state for recurring tasks (recent window only).
  const completedByTask = new Map<string, Set<string>>();
  if (recurring.length > 0) {
    const from = addDaysStr(today, -120);
    const { data: occ } = await supabase
      .from("task_occurrences")
      .select("task_id, occurrence_date")
      .eq("household_id", householdId)
      .eq("status", "completed")
      .in(
        "task_id",
        recurring.map((t) => t.id),
      )
      .gte("occurrence_date", from);
    for (const row of occ ?? []) {
      const set = completedByTask.get(row.task_id as string) ?? new Set();
      set.add(row.occurrence_date as string);
      completedByTask.set(row.task_id as string, set);
    }
  }

  const views: TaskView[] = [];

  for (const t of oneOff) {
    const dateStr = t.due_date ? toDateStr(t.due_date, timezone) : null;
    views.push({
      task: t,
      recurring: false,
      occurrenceDate: null,
      dateStr,
      overdue: !!dateStr && dateStr < today,
    });
  }

  for (const t of recurring) {
    const rule = normalizeRule(t.recurrence_rule);
    if (!rule) continue;
    const anchor = toDateStr(t.due_date ?? t.created_at, timezone);
    const done = completedByTask.get(t.id) ?? new Set<string>();
    const cur = currentOccurrence(
      rule,
      anchor,
      today,
      (d) => done.has(d),
      t.recurrence_end_date,
    );
    if (!cur) continue;
    views.push({
      task: t,
      recurring: true,
      occurrenceDate: cur.date,
      dateStr: cur.date,
      overdue: cur.overdue,
    });
  }

  return views;
}
