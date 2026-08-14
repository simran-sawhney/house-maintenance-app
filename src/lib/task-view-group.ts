import type { TaskCategory } from "@/types/db";
import type { TaskView } from "@/lib/data/tasks-view";
import { addDaysStr } from "@/lib/recurrence/occurrences";

export type GroupMode = "category" | "due" | "person" | "none";
export type TaskFilter = "all" | "mine" | "urgent" | "recurring";
export type TaskGroup = { key: string; label: string; items: TaskView[] };

function sortViews(a: TaskView, b: TaskView): number {
  // Dated first (soonest), then undated by title.
  if (a.dateStr && b.dateStr) {
    if (a.dateStr !== b.dateStr) return a.dateStr < b.dateStr ? -1 : 1;
  } else if (a.dateStr) return -1;
  else if (b.dateStr) return 1;
  return a.task.title.localeCompare(b.task.title);
}

export function filterViews(
  views: TaskView[],
  filter: TaskFilter,
  currentUserId: string,
): TaskView[] {
  switch (filter) {
    case "mine":
      return views.filter((v) => v.task.assigned_to === currentUserId);
    case "urgent":
      return views.filter((v) => v.task.urgent);
    case "recurring":
      return views.filter((v) => v.recurring);
    default:
      return views;
  }
}

/** Group open task views for the Tasks screen (spec §11, §12). */
export function groupTaskViews(
  views: TaskView[],
  mode: GroupMode,
  opts: {
    categories: TaskCategory[];
    today: string;
    members: { userId: string; name: string }[];
  },
): TaskGroup[] {
  const { categories, today, members } = opts;

  if (mode === "none") {
    return [{ key: "all", label: "All tasks", items: [...views].sort(sortViews) }];
  }

  if (mode === "due") {
    const t1 = addDaysStr(today, 1);
    const t7 = addDaysStr(today, 7);
    const buckets: Record<string, TaskView[]> = {
      overdue: [],
      today: [],
      tomorrow: [],
      week: [],
      later: [],
      none: [],
    };
    for (const v of views) {
      if (!v.dateStr) buckets.none.push(v);
      else if (v.dateStr < today) buckets.overdue.push(v);
      else if (v.dateStr === today) buckets.today.push(v);
      else if (v.dateStr === t1) buckets.tomorrow.push(v);
      else if (v.dateStr <= t7) buckets.week.push(v);
      else buckets.later.push(v);
    }
    const order: [string, string][] = [
      ["overdue", "Overdue"],
      ["today", "Today"],
      ["tomorrow", "Tomorrow"],
      ["week", "This week"],
      ["later", "Later"],
      ["none", "No date"],
    ];
    return order
      .filter(([k]) => buckets[k].length > 0)
      .map(([k, label]) => ({
        key: k,
        label,
        items: buckets[k].sort(sortViews),
      }));
  }

  if (mode === "person") {
    const byPerson = new Map<string, TaskView[]>();
    const unassigned: TaskView[] = [];
    for (const v of views) {
      if (v.task.assigned_to) {
        const arr = byPerson.get(v.task.assigned_to) ?? [];
        arr.push(v);
        byPerson.set(v.task.assigned_to, arr);
      } else unassigned.push(v);
    }
    const groups: TaskGroup[] = [];
    for (const m of members) {
      const arr = byPerson.get(m.userId);
      if (arr && arr.length > 0)
        groups.push({ key: m.userId, label: m.name, items: arr.sort(sortViews) });
    }
    if (unassigned.length > 0)
      groups.push({
        key: "unassigned",
        label: "Unassigned",
        items: unassigned.sort(sortViews),
      });
    return groups;
  }

  // mode === "category": urgent/overdue leads, then categories in order.
  const lead: TaskView[] = [];
  const rest: TaskView[] = [];
  for (const v of views) {
    if (v.task.urgent || v.overdue) lead.push(v);
    else rest.push(v);
  }
  const groups: TaskGroup[] = [];
  if (lead.length > 0)
    groups.push({ key: "urgent", label: "Urgent / Overdue", items: lead.sort(sortViews) });

  const byCat = new Map<string, TaskView[]>();
  const uncategorized: TaskView[] = [];
  for (const v of rest) {
    if (v.task.category_id) {
      const arr = byCat.get(v.task.category_id) ?? [];
      arr.push(v);
      byCat.set(v.task.category_id, arr);
    } else uncategorized.push(v);
  }
  for (const c of categories) {
    const arr = byCat.get(c.id);
    if (arr && arr.length > 0)
      groups.push({ key: c.id, label: c.name, items: arr.sort(sortViews) });
  }
  if (uncategorized.length > 0)
    groups.push({ key: "none", label: "Other", items: uncategorized.sort(sortViews) });

  return groups;
}
