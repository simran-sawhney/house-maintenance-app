"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Repeat } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { SectionTitle } from "@/components/ui/primitives";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { completeTask, undoTaskCompletion } from "@/actions/tasks";
import {
  groupTaskViews,
  filterViews,
  type GroupMode,
  type TaskFilter,
} from "@/lib/task-view-group";
import { recurrenceLabel } from "@/lib/recurrence/recurrence";
import { formatDateStrFriendly } from "@/lib/dates";
import { normalizeRule } from "@/lib/recurrence/recurrence";
import type { TaskView } from "@/lib/data/tasks-view";
import type { Task } from "@/types/db";
import { cn } from "@/lib/utils";

const GROUP_MODES: { key: GroupMode; label: string }[] = [
  { key: "category", label: "Category" },
  { key: "due", label: "Due date" },
  { key: "person", label: "Person" },
  { key: "none", label: "None" },
];
const FILTERS: { key: TaskFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mine", label: "Mine" },
  { key: "urgent", label: "Urgent" },
  { key: "recurring", label: "Recurring" },
];

export function TasksBoard({
  initialViews,
  today,
  currentUserId,
  timezone,
}: {
  initialViews: TaskView[];
  today: string;
  currentUserId: string;
  timezone: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { categories, members } = useQuickAdd();

  const [views, setViews] = React.useState(initialViews);
  const [mode, setMode] = React.useState<GroupMode>("category");
  const [filter, setFilter] = React.useState<TaskFilter>("all");
  const [editing, setEditing] = React.useState<Task | null>(null);

  const [prev, setPrev] = React.useState(initialViews);
  if (prev !== initialViews) {
    setPrev(initialViews);
    setViews(initialViews);
  }

  const catById = new Map(categories.map((c) => [c.id, c]));
  const nameById = new Map(members.map((m) => [m.userId, m.name]));

  const filtered = filterViews(views, filter, currentUserId);
  const groups = groupTaskViews(filtered, mode, { categories, today, members });

  async function complete(view: TaskView) {
    const id = view.task.id;
    const occ = view.occurrenceDate;
    setViews((p) =>
      p.filter((v) => !(v.task.id === id && v.occurrenceDate === occ)),
    );
    const res = await completeTask(id, occ);
    if (!res.ok) {
      setViews((p) => [...p, view]);
      toast({ message: res.message ?? "Couldn't complete." });
      return;
    }
    toast({
      message: `Completed ${view.task.title}`,
      actionLabel: "Undo",
      onAction: async () => {
        await undoTaskCompletion(id, occ);
        router.refresh();
      },
    });
    router.refresh();
  }

  if (views.length === 0) return <EmptyTasks />;

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="space-y-2">
        <div className="flex gap-1.5 rounded-xl bg-surface-2 p-1">
          {GROUP_MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={cn(
                "flex-1 h-8 rounded-lg text-xs font-medium transition",
                mode === m.key
                  ? "bg-surface text-foreground shadow-sm"
                  : "text-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 h-8 px-3 rounded-full text-xs font-medium border transition",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-surface text-muted border-border",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {groups.length === 0 ? (
        <p className="text-muted text-sm text-center py-10">
          Nothing matches this filter.
        </p>
      ) : (
        groups.map((group) => (
          <section key={group.key} className="space-y-2">
            <SectionTitle
              className={cn(group.key === "urgent" && "text-urgent")}
            >
              {group.label}
            </SectionTitle>
            <ul className="rounded-xl bg-surface border border-border divide-y divide-border overflow-hidden">
              {group.items.map((view) => (
                <TaskRow
                  key={`${view.task.id}:${view.occurrenceDate ?? "one"}`}
                  view={view}
                  categoryIcon={
                    view.task.category_id
                      ? (catById.get(view.task.category_id)?.icon ?? null)
                      : null
                  }
                  assigneeName={
                    view.task.assigned_to
                      ? (nameById.get(view.task.assigned_to) ?? null)
                      : null
                  }
                  timezone={timezone}
                  onComplete={() => complete(view)}
                  onEdit={() => setEditing(view.task)}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {editing && (
        <TaskDetailSheet
          key={editing.id}
          task={editing}
          onClose={() => setEditing(null)}
          onChanged={() => router.refresh()}
          onRemoved={() =>
            setViews((p) => p.filter((v) => v.task.id !== editing.id))
          }
        />
      )}
    </div>
  );
}

function TaskRow({
  view,
  categoryIcon,
  assigneeName,
  timezone,
  onComplete,
  onEdit,
}: {
  view: TaskView;
  categoryIcon: string | null;
  assigneeName: string | null;
  timezone: string;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const [checked, setChecked] = React.useState(false);
  const task = view.task;

  const metaParts: string[] = [];
  if (view.recurring) {
    metaParts.push(recurrenceLabel(normalizeRule(task.recurrence_rule)));
  } else if (view.dateStr) {
    metaParts.push(formatDateStrFriendly(view.dateStr, timezone));
  }
  if (assigneeName) metaParts.push(assigneeName);
  const meta = metaParts.filter(Boolean).join(" · ");

  return (
    <li className="flex items-center gap-3 pl-3 pr-2 py-1">
      <button
        aria-label={`Complete ${task.title}`}
        onClick={() => {
          setChecked(true);
          setTimeout(onComplete, 120);
        }}
        className={cn(
          "shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center transition touch-manipulation",
          checked
            ? "bg-success border-success"
            : "border-border-strong hover:border-muted",
        )}
      >
        {checked && (
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-white" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </button>
      <button onClick={onEdit} className="flex-1 text-left py-2 min-w-0">
        <div className="flex items-center gap-2">
          {categoryIcon && <span className="shrink-0 text-sm">{categoryIcon}</span>}
          <span
            className={cn(
              "text-[15px] text-foreground truncate",
              checked && "line-through text-muted",
            )}
          >
            {task.title}
          </span>
          {view.recurring && <Repeat className="h-3 w-3 text-muted shrink-0" />}
          {task.urgent && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-urgent" />
          )}
        </div>
        {meta && (
          <div
            className={cn(
              "text-xs truncate",
              view.overdue ? "text-urgent" : "text-muted",
            )}
          >
            {view.overdue ? "Overdue · " : ""}
            {meta}
          </div>
        )}
      </button>
    </li>
  );
}

export function EmptyTasks() {
  return (
    <div className="text-center py-16 px-6">
      <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-success-soft flex items-center justify-center text-2xl">
        ✓
      </div>
      <h3 className="text-lg font-semibold">Nothing to do</h3>
      <p className="text-muted mt-1 text-sm">You&rsquo;re all caught up.</p>
    </div>
  );
}
