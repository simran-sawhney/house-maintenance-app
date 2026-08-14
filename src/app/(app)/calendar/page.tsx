import type { Metadata } from "next";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { getCalendarItems } from "@/lib/data/calendar";
import { CalendarView } from "@/components/calendar/calendar-view";
import { todayStr } from "@/lib/dates";
import { addDaysStr } from "@/lib/recurrence/occurrences";
import {
  parseMonthParam,
  monthLoadRange,
  buildWeeks,
} from "@/lib/calendar-month";

export const metadata: Metadata = { title: "Calendar" };

type Params = { month?: string; view?: string };

export default async function CalendarPage({
  searchParams,
}: PageProps<"/calendar">) {
  const sp = (await searchParams) as Params;
  const { household, user } = await requireHousehold();
  const supabase = await createClient();

  const today = todayStr(household.timezone);
  const view = sp.view === "agenda" ? "agenda" : "month";
  const monthRef = parseMonthParam(sp.month, today);

  // Load only the visible window (spec §7).
  const range =
    view === "agenda"
      ? { start: addDaysStr(today, -21), end: addDaysStr(today, 42) }
      : monthLoadRange(monthRef);

  const { items, tasks } = await getCalendarItems(
    supabase,
    household.id,
    household.timezone,
    range.start,
    range.end,
  );

  return (
    <CalendarView
      view={view}
      monthRef={monthRef}
      weeks={buildWeeks(monthRef)}
      items={items}
      tasks={tasks}
      today={today}
      timezone={household.timezone}
      currentUserId={user.id}
    />
  );
}
