"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Chip } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { createMaintenanceItem } from "@/actions/maintenance";
import {
  HOUSE_AREAS,
  MAINTENANCE_STATUS_LABEL,
  type MaintenanceStatus,
} from "@/types/db";

const STATUSES: MaintenanceStatus[] = ["good", "watch", "needs_attention"];

/** Header button that opens the "add maintenance item" sheet. */
export function AddMaintenanceButton({
  defaultArea,
}: {
  defaultArea?: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Add item
      </Button>
      {open && (
        <AddMaintenanceSheet
          defaultArea={defaultArea}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function AddMaintenanceSheet({
  defaultArea,
  onClose,
}: {
  defaultArea?: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [area, setArea] = React.useState<string>(defaultArea ?? "Kitchen");
  const [status, setStatus] = React.useState<MaintenanceStatus>("good");
  const [description, setDescription] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  async function submit() {
    if (!title.trim()) return;
    setSaving(true);
    const res = await createMaintenanceItem({
      title,
      area,
      status,
      description: description || null,
    });
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.message });
      return;
    }
    toast({ message: `Added ${title.trim()}` });
    onClose();
    router.refresh();
  }

  return (
    <Sheet open onClose={onClose} title="Add maintenance item">
      <div className="space-y-4">
        <div>
          <Label htmlFor="mtitle">Title</Label>
          <Input
            id="mtitle"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Kitchen tap, Garage door"
          />
        </div>
        <div>
          <Label>Area</Label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {HOUSE_AREAS.map((a) => (
              <Chip key={a} active={area === a} onClick={() => setArea(a)}>
                {a}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label>Status</Label>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {MAINTENANCE_STATUS_LABEL[s]}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label htmlFor="mdesc">Description</Label>
          <Textarea
            id="mdesc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <Button
          size="lg"
          className="w-full"
          onClick={submit}
          disabled={saving || !title.trim()}
        >
          {saving ? "Saving…" : "Add item"}
        </Button>
      </div>
    </Sheet>
  );
}
