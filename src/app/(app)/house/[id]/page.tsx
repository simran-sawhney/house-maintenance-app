import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { MaintenanceDetail } from "@/components/maintenance/maintenance-detail";
import type { MaintenanceItem, MaintenanceLog } from "@/types/db";

export default async function MaintenanceItemPage({
  params,
}: PageProps<"/house/[id]">) {
  const { id } = await params;
  const { household } = await requireHousehold();
  const supabase = await createClient();

  const { data: item } = await supabase
    .from("maintenance_items")
    .select("*")
    .eq("id", id)
    .eq("household_id", household.id)
    .maybeSingle();
  if (!item) notFound();
  const mItem = item as MaintenanceItem;

  const { data: logsData } = await supabase
    .from("maintenance_logs")
    .select("*")
    .eq("maintenance_item_id", id)
    .eq("household_id", household.id)
    .order("occurred_at", { ascending: false });
  const logs = (logsData as MaintenanceLog[]) ?? [];

  // Resolve author display names for the timeline.
  const authorIds = [
    ...new Set(
      logs.map((l) => l.created_by).filter((v): v is string => !!v),
    ),
  ];
  const authorNames: Record<string, string> = {};
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", authorIds);
    for (const p of profiles ?? [])
      authorNames[p.id as string] = (p.display_name as string) || "Member";
  }

  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-5 pb-2">
        <Link
          href="/house"
          aria-label="Back to House"
          className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center hover:bg-surface-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
      </div>
      <div className="px-4">
        <div className="mb-5">
          <div className="text-sm text-muted">{mItem.area}</div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mItem.title}
          </h1>
        </div>
        <MaintenanceDetail
          item={mItem}
          logs={logs}
          authorNames={authorNames}
          currency={household.currency_code}
          timezone={household.timezone}
        />
      </div>
    </div>
  );
}
