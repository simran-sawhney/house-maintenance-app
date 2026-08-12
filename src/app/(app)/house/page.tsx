import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, AlertCircle, Plus } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { Card, SectionTitle } from "@/components/ui/primitives";
import { StatusPill } from "@/components/maintenance/status-pill";
import { AddMaintenanceButton } from "@/components/maintenance/add-maintenance-sheet";
import { NotesList } from "@/components/notes/notes-list";
import { QuickAddTrigger } from "@/components/quick-add/quick-add-trigger";
import { HOUSE_AREAS, type MaintenanceItem, type Note } from "@/types/db";

export const metadata: Metadata = { title: "House" };

export default async function HousePage() {
  const { household } = await requireHousehold();
  const supabase = await createClient();

  const [{ data: itemsData }, { data: notesData }] = await Promise.all([
    supabase
      .from("maintenance_items")
      .select("*")
      .eq("household_id", household.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("notes")
      .select("*")
      .eq("household_id", household.id)
      .order("updated_at", { ascending: false }),
  ]);

  const items = (itemsData as MaintenanceItem[]) ?? [];
  const notes = (notesData as Note[]) ?? [];

  const needsAttention = items.filter((i) => i.status === "needs_attention");

  // Group by area (preserve canonical area order, unknown areas last).
  const byArea = new Map<string, MaintenanceItem[]>();
  for (const item of items) {
    const arr = byArea.get(item.area) ?? [];
    arr.push(item);
    byArea.set(item.area, arr);
  }
  const orderedAreas = [
    ...HOUSE_AREAS.filter((a) => byArea.has(a)),
    ...[...byArea.keys()].filter((a) => !HOUSE_AREAS.includes(a as never)),
  ];

  return (
    <div>
      <PageHeader
        title="House"
        subtitle="Your home logbook"
        right={<AddMaintenanceButton />}
      />
      <div className="px-4 space-y-7">
        {needsAttention.length > 0 && (
          <section className="space-y-2">
            <SectionTitle className="flex items-center gap-1.5 text-urgent">
              <AlertCircle className="h-3.5 w-3.5" />
              Needs attention
            </SectionTitle>
            <div className="space-y-2">
              {needsAttention.map((item) => (
                <MaintenanceRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        )}

        {items.length === 0 && (
          <div className="text-center py-10 px-6">
            <h3 className="text-lg font-semibold">Nothing logged yet</h3>
            <p className="text-muted mt-1 text-sm">
              Add things like the kitchen tap, hot water unit or garage door to
              keep a simple history.
            </p>
          </div>
        )}

        {orderedAreas.map((area) => (
          <section key={area} className="space-y-2">
            <SectionTitle>{area}</SectionTitle>
            <div className="space-y-2">
              {byArea.get(area)!.map((item) => (
                <MaintenanceRow key={item.id} item={item} />
              ))}
            </div>
          </section>
        ))}

        {/* Notes */}
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <SectionTitle className="px-0">Notes</SectionTitle>
            <QuickAddTrigger
              preset={{ kind: "note" }}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted"
            >
              <Plus className="h-4 w-4" />
              Add note
            </QuickAddTrigger>
          </div>
          <NotesList initialNotes={notes} />
        </section>
      </div>
    </div>
  );
}

function MaintenanceRow({ item }: { item: MaintenanceItem }) {
  return (
    <Link href={`/house/${item.id}`}>
      <Card className="p-4 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium truncate">{item.title}</div>
          {item.description && (
            <div className="text-sm text-muted truncate">
              {item.description}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={item.status} />
          <ChevronRight className="h-4 w-4 text-muted-2" />
        </div>
      </Card>
    </Link>
  );
}
