import { todayStr } from "@/lib/dates";

export type DateRangeKey =
  | "all"
  | "this_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "custom";

const pad = (n: number) => String(n).padStart(2, "0");

/** Resolve a date-range preset to inclusive YYYY-MM-DD bounds (household tz). */
export function resolveDateRange(
  key: DateRangeKey | undefined,
  tz: string,
  customFrom?: string | null,
  customTo?: string | null,
  todayOverride?: string,
): { from?: string; to?: string } {
  const today = todayOverride ?? todayStr(tz);
  const [y, m] = today.split("-").map(Number);
  const subMonths = (n: number) => {
    const idx = y * 12 + (m - 1) - n;
    const ny = Math.floor(idx / 12);
    const nm = (idx % 12) + 1;
    return `${ny}-${pad(nm)}-01`;
  };
  switch (key) {
    case "this_month":
      return { from: `${y}-${pad(m)}-01` };
    case "last_3_months":
      return { from: subMonths(3) };
    case "last_6_months":
      return { from: subMonths(6) };
    case "this_year":
      return { from: `${y}-01-01` };
    case "custom":
      return { from: customFrom || undefined, to: customTo || undefined };
    default:
      return {};
  }
}

/** Sanitise a search term for safe use inside a PostgREST `or()` filter. */
export function cleanSearchTerm(q: string): string {
  return q.replace(/[,()%*]/g, " ").replace(/\s+/g, " ").trim();
}
