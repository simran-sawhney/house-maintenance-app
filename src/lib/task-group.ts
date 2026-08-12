import type { Task } from "@/types/db";

export type GroupedTasks = {
  urgent: Task[];
  upcoming: Task[];
  other: Task[];
};

/**
 * Group open tasks into Urgent / Due & Upcoming / Other (build spec §29).
 * Urgent wins regardless of due date; remaining tasks with a due date are
 * "upcoming" (soonest first); the rest are "other".
 */
export function groupTasks(tasks: Task[]): GroupedTasks {
  const open = tasks.filter((t) => t.status === "open");
  const urgent = open.filter((t) => t.urgent);
  const rest = open.filter((t) => !t.urgent);

  const upcoming = rest
    .filter((t) => t.due_date)
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime(),
    );
  const other = rest.filter((t) => !t.due_date);

  // Urgent sorted by due date if present, else creation.
  urgent.sort((a, b) => {
    const ad = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const bd = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return ad - bd;
  });

  return { urgent, upcoming, other };
}
