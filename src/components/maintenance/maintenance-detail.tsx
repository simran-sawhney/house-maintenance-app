"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, Input, Textarea, Label, Chip } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addMaintenanceLog, updateMaintenanceItem } from "@/actions/maintenance";
import { formatFriendlyDate } from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import {
  MAINTENANCE_STATUS_LABEL,
  type MaintenanceItem,
  type MaintenanceLog,
  type MaintenanceStatus,
} from "@/types/db";

const STATUSES: MaintenanceStatus[] = ["good", "watch", "needs_attention"];

export function MaintenanceDetail({
  item,
  logs,
  authorNames,
  currency,
  timezone,
}: {
  item: MaintenanceItem;
  logs: MaintenanceLog[];
  authorNames: Record<string, string>;
  currency: string;
  timezone: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [status, setStatus] = React.useState<MaintenanceStatus>(item.status);

  const [note, setNote] = React.useState("");
  const [cost, setCost] = React.useState("");
  const [date, setDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = React.useState(false);

  async function changeStatus(next: MaintenanceStatus) {
    const prev = status;
    setStatus(next);
    const res = await updateMaintenanceItem(item.id, { status: next });
    if (!res.ok) {
      setStatus(prev);
      toast({ message: res.message ?? "Couldn't update." });
    } else {
      router.refresh();
    }
  }

  async function submitLog() {
    if (!note.trim()) return;
    setSaving(true);
    const res = await addMaintenanceLog({
      maintenanceItemId: item.id,
      note,
      cost: cost ? Number(cost) : null,
      occurredAt: date ? new Date(date).toISOString() : null,
    });
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.message ?? "Couldn't save." });
      return;
    }
    setNote("");
    setCost("");
    toast({ message: "Log added" });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Status selector */}
      <div>
        <Label>Status</Label>
        <div className="flex gap-2">
          {STATUSES.map((s) => (
            <Chip key={s} active={status === s} onClick={() => changeStatus(s)}>
              {MAINTENANCE_STATUS_LABEL[s]}
            </Chip>
          ))}
        </div>
      </div>

      {item.description && (
        <p className="text-[15px] text-muted">{item.description}</p>
      )}

      {/* Add log */}
      <Card className="p-4 space-y-3">
        <h3 className="font-semibold text-sm">Add to timeline</h3>
        <Textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Washer replaced. 12mm washer from Bunnings."
          aria-label="Log note"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="lcost">Cost ({currency})</Label>
            <Input
              id="lcost"
              inputMode="decimal"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="ldate">Date</Label>
            <Input
              id="ldate"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
        <Button
          className="w-full"
          onClick={submitLog}
          disabled={saving || !note.trim()}
        >
          {saving ? "Saving…" : "Add log"}
        </Button>
      </Card>

      {/* Timeline */}
      <div>
        <h3 className="font-semibold text-sm mb-3 px-1">Timeline</h3>
        {logs.length === 0 ? (
          <p className="text-muted text-sm px-1">
            No history yet. Add the first log above.
          </p>
        ) : (
          <ol className="relative border-l border-border ml-2 space-y-5">
            {logs.map((log) => (
              <li key={log.id} className="ml-4">
                <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-border-strong" />
                <div className="text-xs text-muted">
                  {formatFriendlyDate(log.occurred_at, timezone)}
                  {log.created_by && authorNames[log.created_by]
                    ? ` · ${authorNames[log.created_by]}`
                    : ""}
                </div>
                <p className="text-[15px] mt-0.5 whitespace-pre-wrap">
                  {log.note}
                </p>
                {log.cost != null && (
                  <div className="text-sm text-muted mt-0.5">
                    {formatMoney(log.cost, currency)}
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
