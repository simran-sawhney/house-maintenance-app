"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Repeat } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet";
import { completeTask, undoTaskCompletion } from "@/actions/tasks";
import type { CalendarItem } from "@/lib/data/calendar";
import type { Task } from "@/types/db";
import {
  addMonths,
  isInMonth,
  monthLabel,
  monthParam,
  type MonthRef,
} from "@/lib/calendar-month";
import { formatDateStrFriendly } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKDAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function CalendarView({
  view,
  monthRef,
  weeks,
  items,
  tasks,
  today,
  timezone,
}: {
  view: "month" | "agenda";
  monthRef: MonthRef;
  weeks: string[][];
  items: CalendarItem[];
  tasks: Record<string, Task>;
  today: string;
  timezone: string;
  currentUserId: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { openQuickAdd, categories } = useQuickAdd();
  const catIcon = new Map(categories.map((c) => [c.id, c.icon]));

  const [override, setOverride] = React.useState<Record<string, boolean>>({});
  const [editing, setEditing] = React.useState<Task | null>(null);
  const inMonthToday = isInMonth(today, monthRef);
  const [selected, setSelected] = React.useState<string>(
    inMonthToday ? today : weeks[1][0],
  );

  const isDone = (it: CalendarItem) => override[it.key] ?? it.completed;

  const byDate = React.useMemo(() => {
    const m = new Map<string, CalendarItem[]>();
    for (const it of items) {
      const arr = m.get(it.date) ?? [];
      arr.push(it);
      m.set(it.date, arr);
    }
    return m;
  }, [items]);

  async function complete(it: CalendarItem) {
    setOverride((o) => ({ ...o, [it.key]: true }));
    const res = await completeTask(it.taskId, it.occurrenceDate);
    if (!res.ok) {
      setOverride((o) => ({ ...o, [it.key]: false }));
      toast({ message: res.message ?? "Couldn't complete." });
      return;
    }
    toast({
      message: `Completed ${it.title}`,
      actionLabel: "Undo",
      onAction: async () => {
        setOverride((o) => ({ ...o, [it.key]: false }));
        await undoTaskCompletion(it.taskId, it.occurrenceDate);
        router.refresh();
      },
    });
    router.refresh();
  }

  const prev = monthParam(addMonths(monthRef, -1));
  const next = monthParam(addMonths(monthRef, 1));

  return (
    <div>
      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">
            {monthLabel(monthRef)}
          </h1>
          <div className="flex items-center gap-1">
            <Link
              href={`/calendar?month=${prev}&view=${view}`}
              aria-label="Previous month"
              className="h-9 w-9 rounded-full flex items-center justify-center text-muted hover:bg-surface-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <Link
              href={`/calendar?view=${view}`}
              className="h-9 px-3 rounded-full text-sm font-medium text-muted hover:bg-surface-2 flex items-center"
            >
              Today
            </Link>
            <Link
              href={`/calendar?month=${next}&view=${view}`}
              aria-label="Next month"
              className="h-9 w-9 rounded-full flex items-center justify-center text-muted hover:bg-surface-2"
            >
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Month / Agenda toggle */}
        <div className="mt-3 flex gap-1.5 rounded-xl bg-surface-2 p-1 max-w-[220px]">
          <Link
            href={`/calendar?month=${monthParam(monthRef)}&view=month`}
            className={cn(
              "flex-1 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition",
              view === "month" ? "bg-surface text-foreground shadow-sm" : "text-muted",
            )}
          >
            Month
          </Link>
          <Link
            href={`/calendar?view=agenda`}
            className={cn(
              "flex-1 h-8 rounded-lg text-sm font-medium flex items-center justify-center transition",
              view === "agenda" ? "bg-surface text-foreground shadow-sm" : "text-muted",
            )}
          >
            Agenda
          </Link>
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          weeks={weeks}
          monthRef={monthRef}
          today={today}
          selected={selected}
          byDate={byDate}
          isDone={isDone}
          onSelect={setSelected}
        />
      ) : (
        <AgendaView
          items={items}
          today={today}
          timezone={timezone}
          catIcon={catIcon}
          isDone={isDone}
          onComplete={complete}
          onEdit={(id) => tasks[id] && setEditing(tasks[id])}
        />
      )}

      {view === "month" && (
        <DayPanel
          date={selected}
          items={byDate.get(selected) ?? []}
          timezone={timezone}
          catIcon={catIcon}
          isDone={isDone}
          onComplete={complete}
          onEdit={(id) => tasks[id] && setEditing(tasks[id])}
          onAdd={() => openQuickAdd({ kind: "task", dueDate: selected })}
        />
      )}

      {editing && (
        <TaskDetailSheet
          key={editing.id}
          task={editing}
          onClose={() => setEditing(null)}
          onChanged={() => router.refresh()}
          onRemoved={() => router.refresh()}
        />
      )}
    </div>
  );
}

function MonthGrid({
  weeks,
  monthRef,
  today,
  selected,
  byDate,
  isDone,
  onSelect,
}: {
  weeks: string[][];
  monthRef: MonthRef;
  today: string;
  selected: string;
  byDate: Map<string, CalendarItem[]>;
  isDone: (it: CalendarItem) => boolean;
  onSelect: (d: string) => void;
}) {
  return (
    <div className="px-2">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_INITIALS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[11px] font-medium text-muted-2 py-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {weeks.flat().map((date) => {
          const dayNum = Number(date.split("-")[2]);
          const inMonth = isInMonth(date, monthRef);
          const isToday = date === today;
          const isSelected = date === selected;
          const dayItems = byDate.get(date) ?? [];
          const hasUrgent = dayItems.some((it) => it.urgent || it.overdue);
          return (
            <button
              key={date}
              onClick={() => onSelect(date)}
              className={cn(
                "aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 gap-1 transition",
                isSelected ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "h-6 w-6 flex items-center justify-center text-sm rounded-full",
                  !inMonth && "text-muted-2",
                  isToday && "bg-primary text-primary-foreground font-semibold",
                )}
              >
                {dayNum}
              </span>
              <div className="flex gap-0.5 h-1.5">
                {dayItems.slice(0, 3).map((it) => (
                  <span
                    key={it.key}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      isDone(it)
                        ? "bg-border-strong"
                        : hasUrgent && (it.urgent || it.overdue)
                          ? "bg-urgent"
                          : "bg-muted",
                    )}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DayPanel({
  date,
  items,
  timezone,
  catIcon,
  isDone,
  onComplete,
  onEdit,
  onAdd,
}: {
  date: string;
  items: CalendarItem[];
  timezone: string;
  catIcon: Map<string, string | null>;
  isDone: (it: CalendarItem) => boolean;
  onComplete: (it: CalendarItem) => void;
  onEdit: (taskId: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="px-4 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold">
          {formatDateStrFriendly(date, timezone)}
        </h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted"
        >
          <Plus className="h-4 w-4" />
          Add task
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-muted text-sm py-4">Nothing scheduled.</p>
      ) : (
        <ul className="rounded-xl bg-surface border border-border divide-y divide-border overflow-hidden">
          {items.map((it) => (
            <CalendarRow
              key={it.key}
              item={it}
              icon={it.categoryId ? catIcon.get(it.categoryId) ?? null : null}
              done={isDone(it)}
              onComplete={() => onComplete(it)}
              onEdit={() => onEdit(it.taskId)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function AgendaView({
  items,
  today,
  timezone,
  catIcon,
  isDone,
  onComplete,
  onEdit,
}: {
  items: CalendarItem[];
  today: string;
  timezone: string;
  catIcon: Map<string, string | null>;
  isDone: (it: CalendarItem) => boolean;
  onComplete: (it: CalendarItem) => void;
  onEdit: (taskId: string) => void;
}) {
  // Overdue (incomplete, before today) then each upcoming date with items.
  const overdue = items
    .filter((it) => it.date < today && !isDone(it))
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = items.filter((it) => it.date >= today);
  const dates = [...new Set(upcoming.map((it) => it.date))].sort();

  const sections: { key: string; label: string; items: CalendarItem[] }[] = [];
  if (overdue.length > 0)
    sections.push({ key: "overdue", label: "Overdue", items: overdue });
  for (const d of dates) {
    sections.push({
      key: d,
      label: formatDateStrFriendly(d, timezone),
      items: upcoming.filter((it) => it.date === d),
    });
  }

  if (sections.length === 0) {
    return (
      <p className="text-muted text-sm text-center py-16 px-4">
        Nothing scheduled in the next few weeks.
      </p>
    );
  }

  return (
    <div className="px-4 space-y-5 mt-2">
      {sections.map((section) => (
        <section key={section.key} className="space-y-2">
          <h2
            className={cn(
              "text-xs font-semibold uppercase tracking-wider px-1",
              section.key === "overdue" ? "text-urgent" : "text-muted-2",
            )}
          >
            {section.label}
          </h2>
          <ul className="rounded-xl bg-surface border border-border divide-y divide-border overflow-hidden">
            {section.items.map((it) => (
              <CalendarRow
                key={it.key}
                item={it}
                icon={it.categoryId ? catIcon.get(it.categoryId) ?? null : null}
                done={isDone(it)}
                onComplete={() => onComplete(it)}
                onEdit={() => onEdit(it.taskId)}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function CalendarRow({
  item,
  icon,
  done,
  onComplete,
  onEdit,
}: {
  item: CalendarItem;
  icon: string | null;
  done: boolean;
  onComplete: () => void;
  onEdit: () => void;
}) {
  return (
    <li className="flex items-center gap-3 pl-3 pr-2 py-1">
      <button
        aria-label={`Complete ${item.title}`}
        onClick={onComplete}
        disabled={done}
        className={cn(
          "shrink-0 h-7 w-7 rounded-full border-2 flex items-center justify-center transition touch-manipulation",
          done ? "bg-success border-success" : "border-border-strong hover:border-muted",
        )}
      >
        {done && (
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
          {icon && <span className="shrink-0 text-sm">{icon}</span>}
          <span
            className={cn(
              "text-[15px] truncate",
              done ? "line-through text-muted" : "text-foreground",
            )}
          >
            {item.title}
          </span>
          {item.recurring && <Repeat className="h-3 w-3 text-muted shrink-0" />}
          {(item.urgent || item.overdue) && !done && (
            <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-urgent" />
          )}
        </div>
      </button>
    </li>
  );
}
