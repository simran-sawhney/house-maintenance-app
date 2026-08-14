import { toDateStr, todayStr } from "@/lib/dates";

export type DateSection<T> = { label: string; items: T[] };

function diffDays(dateStr: string, today: string): number {
  const [ay, am, ad] = dateStr.split("-").map(Number);
  const [by, bm, bd] = today.split("-").map(Number);
  return Math.round(
    (Date.UTC(ay, am - 1, ad) - Date.UTC(by, bm - 1, bd)) / 86_400_000,
  );
}

function monthYearLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

function dayMonthLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Purchase grouping: Today / Yesterday / "12 August" / "July 2026" (spec §14). */
export function groupPurchasesByDate<T>(
  items: T[],
  getISO: (t: T) => string,
  tz: string,
): DateSection<T>[] {
  const today = todayStr(tz);
  const [ty] = today.split("-").map(Number);
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const it of items) {
    const date = toDateStr(getISO(it), tz);
    const diff = diffDays(date, today);
    const [y] = date.split("-").map(Number);
    let label: string;
    if (diff === 0) label = "Today";
    else if (diff === -1) label = "Yesterday";
    else if (y === ty && diff > -60) label = dayMonthLabel(date);
    else label = monthYearLabel(date);
    if (!map.has(label)) {
      map.set(label, []);
      order.push(label);
    }
    map.get(label)!.push(it);
  }
  return order.map((label) => ({ label, items: map.get(label)! }));
}

/** Task grouping: Today / Yesterday / This week / Older (spec §14). */
export function groupTasksByDate<T>(
  items: T[],
  getISO: (t: T) => string | null,
  tz: string,
): DateSection<T>[] {
  const today = todayStr(tz);
  const buckets: Record<string, T[]> = {
    Today: [],
    Yesterday: [],
    "This week": [],
    Older: [],
  };
  for (const it of items) {
    const iso = getISO(it);
    if (!iso) {
      buckets.Older.push(it);
      continue;
    }
    const date = toDateStr(iso, tz);
    const diff = diffDays(date, today);
    if (diff === 0) buckets.Today.push(it);
    else if (diff === -1) buckets.Yesterday.push(it);
    else if (diff > -7) buckets["This week"].push(it);
    else buckets.Older.push(it);
  }
  return (["Today", "Yesterday", "This week", "Older"] as const)
    .filter((k) => buckets[k].length > 0)
    .map((label) => ({ label, items: buckets[label] }));
}
