"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X, SlidersHorizontal, Repeat } from "lucide-react";
import { Input, Chip, Label, SectionTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import {
  searchCompletedTaskHistory,
  type TaskHistoryItem,
  type TaskSort,
  type TaskTypeFilter,
} from "@/actions/history";
import type { DateRangeKey } from "@/lib/history-range";
import { groupTasksByDate } from "@/lib/history-group";
import { formatFriendlyDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const RANGES: { key: DateRangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "this_month", label: "This month" },
  { key: "last_3_months", label: "Last 3 months" },
  { key: "last_6_months", label: "Last 6 months" },
  { key: "this_year", label: "This year" },
  { key: "custom", label: "Custom" },
];
const TYPES: { key: TaskTypeFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "oneoff", label: "One-off" },
  { key: "recurring", label: "Recurring" },
];

export function TaskHistoryView({
  tz,
  initial,
}: {
  tz: string;
  initial: {
    q: string;
    categoryId: string | null;
    memberId: string | null;
    range: DateRangeKey;
    taskType: TaskTypeFilter;
    sort: TaskSort;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { categories, members } = useQuickAdd();

  const [q, setQ] = React.useState(initial.q);
  const [categoryId, setCategoryId] = React.useState(initial.categoryId);
  const [memberId, setMemberId] = React.useState(initial.memberId);
  const [range, setRange] = React.useState<DateRangeKey>(initial.range);
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [taskType, setTaskType] = React.useState<TaskTypeFilter>(initial.taskType);
  const [sort, setSort] = React.useState<TaskSort>(initial.sort);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const [items, setItems] = React.useState<TaskHistoryItem[]>([]);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const seq = React.useRef(0);

  const activeCount =
    (categoryId ? 1 : 0) +
    (memberId ? 1 : 0) +
    (range !== "all" ? 1 : 0) +
    (taskType !== "all" ? 1 : 0);

  React.useEffect(() => {
    const handle = setTimeout(async () => {
      const mine = ++seq.current;
      setLoading(true);
      const res = await searchCompletedTaskHistory({
        q,
        categoryId,
        memberId,
        range,
        from: range === "custom" ? from : null,
        to: range === "custom" ? to : null,
        taskType,
        sort,
        page: 0,
      });
      if (mine !== seq.current) return;
      setItems(res.items);
      setPage(0);
      setHasMore(res.hasMore);
      setLoading(false);

      const params = new URLSearchParams({ tab: "tasks" });
      if (q.trim()) params.set("q", q.trim());
      if (categoryId) params.set("category", categoryId);
      if (memberId) params.set("member", memberId);
      if (range !== "all") params.set("range", range);
      if (taskType !== "all") params.set("type", taskType);
      if (sort !== "recent") params.set("sort", sort);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 250);
    return () => clearTimeout(handle);
  }, [q, categoryId, memberId, range, from, to, taskType, sort, router, pathname]);

  async function loadMore() {
    const mine = seq.current;
    const next = page + 1;
    const res = await searchCompletedTaskHistory({
      q,
      categoryId,
      memberId,
      range,
      from: range === "custom" ? from : null,
      to: range === "custom" ? to : null,
      taskType,
      sort,
      page: next,
    });
    if (mine !== seq.current) return;
    setItems((prev) => [...prev, ...res.items]);
    setPage(next);
    setHasMore(res.hasMore);
  }

  function clearFilters() {
    setCategoryId(null);
    setMemberId(null);
    setRange("all");
    setTaskType("all");
    setFrom("");
    setTo("");
  }

  const searching = q.trim().length >= 2;
  const sections = searching
    ? [{ label: "", items }]
    : groupTasksByDate(items, (i) => i.completedAt, tz);

  return (
    <div className="px-4">
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search completed tasks…"
          className="pl-11 pr-10"
          aria-label="Search completed tasks"
          enterKeyHint="search"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full flex items-center justify-center text-muted hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setFilterOpen(true)}
          className={cn(
            "inline-flex items-center gap-1.5 h-9 px-3 rounded-full border text-sm font-medium",
            activeCount > 0
              ? "border-primary text-foreground"
              : "border-border text-muted",
          )}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as TaskSort)}
          className="h-9 rounded-full border border-border bg-surface px-3 text-sm text-foreground"
          aria-label="Sort"
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest</option>
        </select>
      </div>

      {loading && items.length === 0 ? (
        <div className="space-y-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-surface-2" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 px-6">
          {searching ? (
            <p className="text-muted text-sm">
              Nothing found for &ldquo;{q.trim()}&rdquo;.
            </p>
          ) : (
            <>
              <h3 className="text-lg font-semibold">No completed tasks yet</h3>
              <p className="text-muted mt-1 text-sm">
                Completed household jobs will appear here.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.label || "results"} className="space-y-2">
              {section.label && <SectionTitle>{section.label}</SectionTitle>}
              <ul className="rounded-xl bg-surface border border-border divide-y divide-border overflow-hidden">
                {section.items.map((item) => (
                  <TaskHistoryRow key={item.key} item={item} tz={tz} />
                ))}
              </ul>
            </section>
          ))}
          {hasMore && (
            <div className="pt-1 pb-2">
              <Button variant="secondary" className="w-full" onClick={loadMore}>
                Load more
              </Button>
            </div>
          )}
        </div>
      )}

      {filterOpen && (
        <Sheet open onClose={() => setFilterOpen(false)} title="Filters">
          <div className="space-y-5">
            <div>
              <Label>Category</Label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                <Chip active={!categoryId} onClick={() => setCategoryId(null)}>
                  All
                </Chip>
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    active={categoryId === c.id}
                    onClick={() => setCategoryId(c.id)}
                  >
                    {c.icon} {c.name}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <Label>Type</Label>
              <div className="flex gap-2">
                {TYPES.map((t) => (
                  <Chip
                    key={t.key}
                    active={taskType === t.key}
                    onClick={() => setTaskType(t.key)}
                  >
                    {t.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <Label>Date</Label>
              <div className="flex flex-wrap gap-2">
                {RANGES.map((r) => (
                  <Chip
                    key={r.key}
                    active={range === r.key}
                    onClick={() => setRange(r.key)}
                  >
                    {r.label}
                  </Chip>
                ))}
              </div>
              {range === "custom" && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <Label htmlFor="tf">From</Label>
                    <Input id="tf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="tt">To</Label>
                    <Input id="tt" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {members.length > 0 && (
              <div>
                <Label>Completed by</Label>
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                  <Chip active={!memberId} onClick={() => setMemberId(null)}>
                    Anyone
                  </Chip>
                  {members.map((m) => (
                    <Chip
                      key={m.userId}
                      active={memberId === m.userId}
                      onClick={() => setMemberId(m.userId)}
                    >
                      {m.name}
                    </Chip>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="secondary" className="flex-1" onClick={clearFilters}>
                Clear filters
              </Button>
              <Button className="flex-1" onClick={() => setFilterOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </Sheet>
      )}
    </div>
  );
}

function TaskHistoryRow({ item, tz }: { item: TaskHistoryItem; tz: string }) {
  const [open, setOpen] = React.useState(false);
  const when = item.recurring
    ? item.occurrenceDate
    : item.completedAt;
  const completedLabel = when
    ? `Completed ${formatFriendlyDate(when, tz)}${item.completedByName ? ` by ${item.completedByName}` : ""}`
    : "Completed";

  return (
    <li>
      <button
        onClick={() => item.notes && setOpen((o) => !o)}
        className="w-full flex items-start gap-3 px-3 py-2.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {item.categoryIcon && (
              <span className="shrink-0 text-sm">{item.categoryIcon}</span>
            )}
            <span className="text-[15px] text-foreground truncate">
              {item.title}
            </span>
            {item.recurring && (
              <Repeat className="h-3 w-3 text-muted shrink-0" />
            )}
          </div>
          <div className="text-xs text-muted truncate">
            {[item.categoryName, completedLabel].filter(Boolean).join(" · ")}
          </div>
          {open && item.notes && (
            <p className="text-sm text-muted mt-1 whitespace-pre-wrap">
              {item.notes}
            </p>
          )}
        </div>
      </button>
    </li>
  );
}
