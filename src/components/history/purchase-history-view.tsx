"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { Input, Chip, Label, SectionTitle } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { ImageThumb } from "@/components/shopping/image-thumb";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import {
  searchPurchaseHistory,
  type PurchaseHistoryItem,
  type PurchaseSort,
} from "@/actions/history";
import type { DateRangeKey } from "@/lib/history-range";
import { groupPurchasesByDate } from "@/lib/history-group";
import { formatFriendlyDate } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/utils";

const RANGES: { key: DateRangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "this_month", label: "This month" },
  { key: "last_3_months", label: "Last 3 months" },
  { key: "last_6_months", label: "Last 6 months" },
  { key: "this_year", label: "This year" },
  { key: "custom", label: "Custom" },
];
const SORTS: { key: PurchaseSort; label: string }[] = [
  { key: "recent", label: "Most recent" },
  { key: "oldest", label: "Oldest" },
  { key: "price_high", label: "Highest price" },
  { key: "price_low", label: "Lowest price" },
];

export function PurchaseHistoryView({
  tz,
  currency,
  initial,
}: {
  tz: string;
  currency: string;
  initial: {
    q: string;
    storeId: string | null;
    memberId: string | null;
    range: DateRangeKey;
    sort: PurchaseSort;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { stores, members } = useQuickAdd();

  const [q, setQ] = React.useState(initial.q);
  const [storeId, setStoreId] = React.useState(initial.storeId);
  const [memberId, setMemberId] = React.useState(initial.memberId);
  const [range, setRange] = React.useState<DateRangeKey>(initial.range);
  const [from, setFrom] = React.useState<string>("");
  const [to, setTo] = React.useState<string>("");
  const [sort, setSort] = React.useState<PurchaseSort>(initial.sort);
  const [filterOpen, setFilterOpen] = React.useState(false);

  const [items, setItems] = React.useState<PurchaseHistoryItem[]>([]);
  const [page, setPage] = React.useState(0);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const seq = React.useRef(0);

  const activeCount =
    (storeId ? 1 : 0) + (memberId ? 1 : 0) + (range !== "all" ? 1 : 0);

  // Fetch page 0 whenever query/filters/sort change (debounced).
  React.useEffect(() => {
    const handle = setTimeout(async () => {
      const mine = ++seq.current;
      setLoading(true);
      const res = await searchPurchaseHistory({
        q,
        storeId,
        memberId,
        range,
        from: range === "custom" ? from : null,
        to: range === "custom" ? to : null,
        sort,
        page: 0,
      });
      if (mine !== seq.current) return;
      setItems(res.items);
      setPage(0);
      setHasMore(res.hasMore);
      setLoading(false);

      // Reflect key state in the URL (spec §21).
      const params = new URLSearchParams({ tab: "shopping" });
      if (q.trim()) params.set("q", q.trim());
      if (storeId) params.set("store", storeId);
      if (memberId) params.set("member", memberId);
      if (range !== "all") params.set("range", range);
      if (sort !== "recent") params.set("sort", sort);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 250);
    return () => clearTimeout(handle);
  }, [q, storeId, memberId, range, from, to, sort, router, pathname]);

  async function loadMore() {
    const mine = seq.current;
    const next = page + 1;
    const res = await searchPurchaseHistory({
      q,
      storeId,
      memberId,
      range,
      from: range === "custom" ? from : null,
      to: range === "custom" ? to : null,
      sort,
      page: next,
    });
    if (mine !== seq.current) return;
    setItems((prev) => [...prev, ...res.items]);
    setPage(next);
    setHasMore(res.hasMore);
  }

  function clearFilters() {
    setStoreId(null);
    setMemberId(null);
    setRange("all");
    setFrom("");
    setTo("");
  }

  const searching = q.trim().length >= 2;
  const sections = searching
    ? [{ label: "", items }]
    : groupPurchasesByDate(items, (i) => i.purchasedAt, tz);

  return (
    <div className="px-4">
      {/* Search bar */}
      <div className="relative mb-3">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-2" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search purchases…"
          className="pl-11 pr-10"
          aria-label="Search purchases"
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

      {/* Filter + sort bar */}
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
          onChange={(e) => setSort(e.target.value as PurchaseSort)}
          className="h-9 rounded-full border border-border bg-surface px-3 text-sm text-foreground"
          aria-label="Sort"
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {loading && items.length === 0 ? (
        <ResultsSkeleton />
      ) : items.length === 0 ? (
        <EmptyState searching={searching} q={q} />
      ) : (
        <div className="space-y-5">
          {sections.map((section) => (
            <section key={section.label || "results"} className="space-y-2">
              {section.label && <SectionTitle>{section.label}</SectionTitle>}
              <ul className="rounded-xl bg-surface border border-border divide-y divide-border overflow-hidden">
                {section.items.map((item) => (
                  <PurchaseRow
                    key={item.id}
                    item={item}
                    tz={tz}
                    currency={currency}
                    onOpen={() =>
                      item.productId && router.push(`/product/${item.productId}`)
                    }
                  />
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
              <Label>Store</Label>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
                <Chip active={!storeId} onClick={() => setStoreId(null)}>
                  All stores
                </Chip>
                {stores.map((s) => (
                  <Chip
                    key={s.id}
                    active={storeId === s.id}
                    onClick={() => setStoreId(s.id)}
                  >
                    {s.name}
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
                    <Label htmlFor="pf">From</Label>
                    <Input id="pf" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label htmlFor="pt">To</Label>
                    <Input id="pt" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </div>
              )}
            </div>

            {members.length > 0 && (
              <div>
                <Label>Purchased by</Label>
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

function PurchaseRow({
  item,
  tz,
  currency,
  onOpen,
}: {
  item: PurchaseHistoryItem;
  tz: string;
  currency: string;
  onOpen: () => void;
}) {
  const meta = [
    item.storeName,
    formatFriendlyDate(item.purchasedAt, tz),
    item.purchasedByName,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      {item.imageUrl && (
        <ImageThumb url={item.imageUrl} alt={item.name} className="h-11 w-11" />
      )}
      <button
        onClick={onOpen}
        className="flex-1 text-left min-w-0"
        disabled={!item.productId}
      >
        <div className="text-[15px] text-foreground truncate">{item.name}</div>
        <div className="text-xs text-muted truncate">{meta}</div>
      </button>
      <div className="text-sm font-medium shrink-0">
        {item.price != null ? formatMoney(item.price, currency) : "—"}
      </div>
    </li>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-2" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 rounded-xl bg-surface-2" />
      ))}
    </div>
  );
}

function EmptyState({ searching, q }: { searching: boolean; q: string }) {
  return (
    <div className="text-center py-16 px-6">
      {searching ? (
        <p className="text-muted text-sm">
          Nothing found for &ldquo;{q.trim()}&rdquo;.
        </p>
      ) : (
        <>
          <h3 className="text-lg font-semibold">No purchases yet</h3>
          <p className="text-muted mt-1 text-sm">
            Completed shopping items will appear here.
          </p>
        </>
      )}
    </div>
  );
}
