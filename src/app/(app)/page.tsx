import Link from "next/link";
import { Search, AlertCircle, ChevronRight, ShoppingCart, CheckSquare, Settings } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { getDashboard } from "@/lib/data/dashboard";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { Greeting } from "@/components/dashboard/greeting";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { Suggestions } from "@/components/dashboard/suggestions";
import { formatRelative } from "@/lib/dates";
import type { Store } from "@/types/db";

export default async function HomePage() {
  const { household } = await requireHousehold();
  const supabase = await createClient();

  const { data: storesData } = await supabase
    .from("stores")
    .select("*")
    .eq("household_id", household.id)
    .eq("active", true)
    .order("sort_order", { ascending: true });
  const stores = (storesData as Store[]) ?? [];

  const dash = await getDashboard(supabase, household.id, stores);
  const hasUrgent =
    dash.urgentShopping.length > 0 || dash.urgentTasks.length > 0;

  return (
    <div className="pb-4">
      <header className="flex items-start justify-between gap-3 px-4 pt-6 pb-4">
        <Greeting householdName={household.name} />
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/search"
            aria-label="Search"
            className="h-10 w-10 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 border border-border"
          >
            <Search className="h-5 w-5" />
          </Link>
          <Link
            href="/settings"
            aria-label="Settings"
            className="h-10 w-10 rounded-full flex items-center justify-center text-muted hover:bg-surface-2 border border-border"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <div className="px-4 space-y-6">
        <QuickActions stores={stores} />

        {hasUrgent && (
          <section className="space-y-2">
            <SectionTitle className="flex items-center gap-1.5 text-urgent">
              <AlertCircle className="h-3.5 w-3.5" />
              Urgent
            </SectionTitle>
            <Card className="divide-y divide-border overflow-hidden">
              {dash.urgentShopping.map((i) => (
                <div key={i.id} className="flex items-center gap-2 px-4 py-3">
                  <ShoppingCart className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-[15px] truncate">{i.name}</span>
                </div>
              ))}
              {dash.urgentTasks.map((t) => (
                <div key={t.id} className="flex items-center gap-2 px-4 py-3">
                  <CheckSquare className="h-4 w-4 text-muted shrink-0" />
                  <span className="text-[15px] truncate">{t.title}</span>
                </div>
              ))}
            </Card>
          </section>
        )}

        {/* Shopping summary */}
        <Link href="/buy" className="block">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Shopping</h2>
              <ChevronRight className="h-4 w-4 text-muted-2" />
            </div>
            <p className="text-sm text-muted mt-0.5">
              {dash.shoppingTotal > 0
                ? `${dash.shoppingTotal} thing${dash.shoppingTotal === 1 ? "" : "s"} to buy`
                : "Your list is clear"}
            </p>
            {dash.storeCounts.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {dash.storeCounts.slice(0, 5).map(({ store, count }) => (
                  <span key={store.id} className="text-sm text-muted">
                    {store.name} · <span className="text-foreground">{count}</span>
                  </span>
                ))}
              </div>
            )}
          </Card>
        </Link>

        {/* Tasks summary */}
        <Link href="/tasks" className="block">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Tasks</h2>
              <ChevronRight className="h-4 w-4 text-muted-2" />
            </div>
            <p className="text-sm text-muted mt-0.5">
              {dash.openTaskCount > 0
                ? `${dash.openTaskCount} open${dash.urgentTasks.length ? ` · ${dash.urgentTasks.length} urgent` : ""}`
                : "Nothing to do"}
            </p>
          </Card>
        </Link>

        <Suggestions
          initial={dash.suggestions.map((s) => ({
            productId: s.product.id,
            name: s.product.name,
            typicalIntervalDays: s.typicalIntervalDays,
            daysSinceLast: s.daysSinceLast,
            storeName: s.likelyStoreName,
          }))}
        />

        {/* Recent activity */}
        {dash.activity.length > 0 && (
          <section className="space-y-2">
            <SectionTitle>Recent activity</SectionTitle>
            <ul className="space-y-1.5">
              {dash.activity.slice(0, 12).map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-foreground truncate">{a.text}</span>
                  <span className="text-muted-2 shrink-0 text-xs">
                    {formatRelative(a.createdAt, household.timezone)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
