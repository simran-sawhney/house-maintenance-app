"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Repeat } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { SectionTitle } from "@/components/ui/primitives";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { completeTask, undoTaskCompletion } from "@/actions/tasks";
import { groupTasks } from "@/lib/task-group";
import { formatFriendlyDate } from "@/lib/dates";
import type { Task } from "@/types/db";
import { cn } from "@/lib/utils";

export function TasksBoard({
  initialTasks,
  timezone,
}: {
  initialTasks: Task[];
  timezone: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { categories, members } = useQuickAdd();
  const [tasks, setTasks] = React.useState(initialTasks);
  const [editing, setEditing] = React.useState<Task | null>(null);

  const [prev, setPrev] = React.useState(initialTasks);
  if (prev !== initialTasks) {
    setPrev(initialTasks);
    setTasks(initialTasks);
  }

  const catById = new Map(categories.map((c) => [c.id, c]));
  const nameById = new Map(members.map((m) => [m.userId, m.name]));
  const grouped = groupTasks(tasks);

  async function complete(task: Task) {
    setTasks((p) => p.filter((t) => t.id !== task.id));
    const res = await completeTask(task.id);
    if (!res.ok) {
      setTasks((p) => [...p, task]);
      toast({ message: res.message ?? "Couldn't complete." });
      return;
    }
    toast({
      message: `Completed ${task.title}`,
      actionLabel: "Undo",
      onAction: async () => {
        const u = await undoTaskCompletion(task.id);
        if (u.ok) setTasks((p) => (p.some((t) => t.id === task.id) ? p : [...p, task]));
        router.refresh();
      },
    });
    router.refresh();
  }

  if (tasks.length === 0) return <EmptyTasks />;

  const renderList = (list: Task[]) => (
    <ul className="rounded-xl bg-surface border border-border divide-y divide-border overflow-hidden">
      {list.map((task) => (
        <TaskRow
          key={task.id}
          task={task}
          categoryLabel={
            task.category_id
              ? `${catById.get(task.category_id)?.icon ?? ""} ${catById.get(task.category_id)?.name ?? ""}`.trim()
              : null
          }
          assigneeName={task.assigned_to ? nameById.get(task.assigned_to) ?? null : null}
          timezone={timezone}
          onComplete={() => complete(task)}
          onEdit={() => setEditing(task)}
        />
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      {grouped.urgent.length > 0 && (
        <section className="space-y-2">
          <SectionTitle className="flex items-center gap-1.5 text-urgent">
            <AlertCircle className="h-3.5 w-3.5" />
            Urgent
          </SectionTitle>
          {renderList(grouped.urgent)}
        </section>
      )}
      {grouped.upcoming.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Due &amp; upcoming</SectionTitle>
          {renderList(grouped.upcoming)}
        </section>
      )}
      {grouped.other.length > 0 && (
        <section className="space-y-2">
          <SectionTitle>Other</SectionTitle>
          {renderList(grouped.other)}
        </section>
      )}

      {editing && (
        <TaskDetailSheet
          key={editing.id}
          task={editing}
          onClose={() => setEditing(null)}
          onChanged={(patch) =>
            setTasks((p) =>
              p.map((t) => (t.id === editing.id ? { ...t, ...patch } : t)),
            )
          }
          onRemoved={() => setTasks((p) => p.filter((t) => t.id !== editing.id))}
        />
      )}
    </div>
  );
}

function TaskRow({
  task,
  categoryLabel,
  assigneeName,
  timezone,
  onComplete,
  onEdit,
}: {
  task: Task;
  categoryLabel: string | null;
  assigneeName: string | null;
  timezone: string;
  onComplete: () => void;
  onEdit: () => void;
}) {
  const [checked, setChecked] = React.useState(false);
  const meta = [
    task.due_date ? formatFriendlyDate(task.due_date, timezone) : null,
    categoryLabel,
    assigneeName,
  ]
    .filter(Boolean)
    .join(" · ");

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
          checked ? "bg-success border-success" : "border-border-strong hover:border-muted",
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
          <span
            className={cn(
              "text-[15px] text-foreground truncate",
              checked && "line-through text-muted",
            )}
          >
            {task.title}
          </span>
          {task.recurrence_rule && (
            <Repeat className="h-3 w-3 text-muted shrink-0" />
          )}
          {task.urgent && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-urgent" />
          )}
        </div>
        {meta && <div className="text-xs text-muted truncate">{meta}</div>}
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
