import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { PurchaseHistoryView } from "@/components/history/purchase-history-view";
import { TaskHistoryView } from "@/components/history/task-history-view";
import type { DateRangeKey } from "@/lib/history-range";
import type {
  PurchaseSort,
  TaskSort,
  TaskTypeFilter,
} from "@/actions/history";

export const metadata: Metadata = { title: "History" };

type Params = {
  tab?: string;
  q?: string;
  store?: string;
  member?: string;
  category?: string;
  range?: string;
  type?: string;
  sort?: string;
};

const RANGE_KEYS = [
  "all",
  "this_month",
  "last_3_months",
  "last_6_months",
  "this_year",
  "custom",
];

export default async function HistoryPage({
  searchParams,
}: PageProps<"/history">) {
  const sp = (await searchParams) as Params;
  const tab = sp.tab === "tasks" ? "tasks" : "shopping";
  const { household } = await requireHousehold();

  const range = (RANGE_KEYS.includes(sp.range ?? "")
    ? sp.range
    : "all") as DateRangeKey;

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

      {/* Tabs */}
      <div className="px-4 flex gap-2 mb-4">
        <TabLink href="/history?tab=shopping" active={tab === "shopping"}>
          Purchases
        </TabLink>
        <TabLink href="/history?tab=tasks" active={tab === "tasks"}>
          Completed tasks
        </TabLink>
      </div>

      {tab === "shopping" ? (
        <PurchaseHistoryView
          tz={household.timezone}
          currency={household.currency_code}
          initial={{
            q: sp.q ?? "",
            storeId: sp.store ?? null,
            memberId: sp.member ?? null,
            range,
            sort: (["recent", "oldest", "price_high", "price_low"].includes(
              sp.sort ?? "",
            )
              ? sp.sort
              : "recent") as PurchaseSort,
          }}
        />
      ) : (
        <TaskHistoryView
          tz={household.timezone}
          initial={{
            q: sp.q ?? "",
            categoryId: sp.category ?? null,
            memberId: sp.member ?? null,
            range,
            taskType: (["all", "oneoff", "recurring"].includes(sp.type ?? "")
              ? sp.type
              : "all") as TaskTypeFilter,
            sort: (sp.sort === "oldest" ? "oldest" : "recent") as TaskSort,
          }}
        />
      )}
    </div>
  );
}

function TabLink({
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
        "h-9 px-4 rounded-full text-sm font-medium border inline-flex items-center " +
        (active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface text-muted border-border")
      }
    >
      {children}
    </Link>
  );
}
