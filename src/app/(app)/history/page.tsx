import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { formatFriendlyDate } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import type { Purchase, Store, Task } from "@/types/db";

export const metadata: Metadata = { title: "History" };

type Params = { tab?: string; store?: string; range?: string };

function rangeStart(range?: string): string | null {
  const days = range === "30" ? 30 : range === "90" ? 90 : null;
  if (!days) return null;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export default async function HistoryPage({
  searchParams,
}: PageProps<"/history">) {
  const sp = (await searchParams) as Params;
  const tab = sp.tab === "tasks" ? "tasks" : "shopping";
  const storeFilter = sp.store && sp.store !== "all" ? sp.store : null;
  const since = rangeStart(sp.range);

  const { household } = await requireHousehold();
  const supabase = await createClient();

  const { data: storesData } = await supabase
    .from("stores")
    .select("*")
    .eq("household_id", household.id)
    .order("sort_order", { ascending: true });
  const stores = (storesData as Store[]) ?? [];
  const storeName = new Map(stores.map((s) => [s.id, s.name]));

  const qs = (next: Params) => {
    const p = new URLSearchParams({ tab, ...(sp.range ? { range: sp.range } : {}), ...(sp.store ? { store: sp.store } : {}), ...next } as Record<string, string>);
    return `/history?${p.toString()}`;
  };

  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-5 pb-3">
        <Link
          href={tab === "tasks" ? "/tasks" : "/buy"}
          aria-label="Back"
          className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center hover:bg-surface-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-semibold">History</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-2">
          <FilterChip href={qs({ tab: "shopping" })} active={tab === "shopping"}>
            Shopping
          </FilterChip>
          <FilterChip href={qs({ tab: "tasks" })} active={tab === "tasks"}>
            Tasks
          </FilterChip>
        </div>

        {/* Range */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
          <FilterChip href={qs({ range: "all" })} active={!sp.range || sp.range === "all"}>
            All time
          </FilterChip>
          <FilterChip href={qs({ range: "30" })} active={sp.range === "30"}>
            Last 30 days
          </FilterChip>
          <FilterChip href={qs({ range: "90" })} active={sp.range === "90"}>
            Last 90 days
          </FilterChip>
        </div>

        {tab === "shopping" && stores.length > 0 && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <FilterChip href={qs({ store: "all" })} active={!storeFilter}>
              All stores
            </FilterChip>
            {stores.map((s) => (
              <FilterChip key={s.id} href={qs({ store: s.id })} active={storeFilter === s.id}>
                {s.name}
              </FilterChip>
            ))}
          </div>
        )}

        {tab === "shopping" ? (
          <ShoppingHistory
            householdId={household.id}
            storeFilter={storeFilter}
            since={since}
            storeName={storeName}
            currency={household.currency_code}
            timezone={household.timezone}
          />
        ) : (
          <TaskHistory
            householdId={household.id}
            since={since}
            timezone={household.timezone}
          />
        )}
      </div>
    </div>
  );
}

async function ShoppingHistory({
  householdId,
  storeFilter,
  since,
  storeName,
  currency,
  timezone,
}: {
  householdId: string;
  storeFilter: string | null;
  since: string | null;
  storeName: Map<string, string>;
  currency: string;
  timezone: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("purchases")
    .select("*")
    .eq("household_id", householdId)
    .order("purchased_at", { ascending: false })
    .limit(200);
  if (storeFilter) query = query.eq("store_id", storeFilter);
  if (since) query = query.gte("purchased_at", since);
  const { data } = await query;
  const purchases = (data as Purchase[]) ?? [];

  if (purchases.length === 0)
    return <p className="text-muted text-sm py-8 text-center">No purchases in this view.</p>;

  return (
    <section className="space-y-2">
      <SectionTitle>{purchases.length} purchase{purchases.length === 1 ? "" : "s"}</SectionTitle>
      <Card className="divide-y divide-border overflow-hidden">
        {purchases.map((p) => {
          const row = (
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[15px] truncate">{p.name}</div>
                <div className="text-xs text-muted truncate">
                  {formatFriendlyDate(p.purchased_at, timezone)}
                  {p.store_id ? ` · ${storeName.get(p.store_id) ?? ""}` : ""}
                </div>
              </div>
              <div className="text-sm font-medium shrink-0">
                {p.price != null ? formatMoney(p.price, currency) : "—"}
              </div>
            </div>
          );
          return p.product_id ? (
            <Link key={p.id} href={`/product/${p.product_id}`} className="block hover:bg-surface-2">
              {row}
            </Link>
          ) : (
            <div key={p.id}>{row}</div>
          );
        })}
      </Card>
    </section>
  );
}

async function TaskHistory({
  householdId,
  since,
  timezone,
}: {
  householdId: string;
  since: string | null;
  timezone: string;
}) {
  const supabase = await createClient();
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("household_id", householdId)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(200);
  if (since) query = query.gte("completed_at", since);
  const { data } = await query;
  const tasks = (data as Task[]) ?? [];

  if (tasks.length === 0)
    return <p className="text-muted text-sm py-8 text-center">No completed tasks in this view.</p>;

  return (
    <section className="space-y-2">
      <SectionTitle>{tasks.length} completed</SectionTitle>
      <Card className="divide-y divide-border overflow-hidden">
        {tasks.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="text-[15px] truncate">{t.title}</div>
            <div className="text-xs text-muted shrink-0">
              {formatFriendlyDate(t.completed_at, timezone)}
            </div>
          </div>
        ))}
      </Card>
    </section>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "shrink-0 inline-flex items-center h-9 px-3.5 rounded-full text-sm font-medium border transition " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface text-foreground border-border")
      }
    >
      {children}
    </Link>
  );
}
