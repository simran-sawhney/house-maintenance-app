"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Chip } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { updateTask, cancelTask } from "@/actions/tasks";
import {
  RECURRENCE_PRESETS,
  presetKeyForRule,
} from "@/lib/recurrence/recurrence";
import type { RecurrenceRule, Task } from "@/types/db";
import { cn } from "@/lib/utils";

/** Edit an open task (build spec §64 applied to tasks). Rendered keyed. */
export function TaskDetailSheet({
  task,
  onClose,
  onChanged,
  onRemoved,
}: {
  task: Task;
  onClose: () => void;
  onChanged: (patch: Partial<Task>) => void;
  onRemoved: () => void;
}) {
  const { categories, members } = useQuickAdd();
  const { toast } = useToast();
  const router = useRouter();

  const [title, setTitle] = React.useState(task.title);
  const [categoryId, setCategoryId] = React.useState<string | null>(
    task.category_id,
  );
  const [urgent, setUrgent] = React.useState(task.urgent);
  const [due, setDue] = React.useState(
    task.due_date ? task.due_date.slice(0, 10) : "",
  );
  const [assignedTo, setAssignedTo] = React.useState<string | null>(
    task.assigned_to,
  );
  const [recurrenceKey, setRecurrenceKey] = React.useState(
    presetKeyForRule(task.recurrence_rule),
  );
  const [notes, setNotes] = React.useState(task.notes ?? "");
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    const rule: RecurrenceRule | null =
      RECURRENCE_PRESETS.find((p) => p.key === recurrenceKey)?.rule ?? null;
    const patch = {
      title: title.trim(),
      categoryId,
      urgent,
      dueDate: due ? new Date(due).toISOString() : null,
      assignedTo,
      recurrence: rule,
      notes: notes || null,
    };
    const res = await updateTask(task.id, patch);
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.message ?? "Couldn't update." });
      return;
    }
    onChanged({
      title: patch.title,
      category_id: categoryId,
      urgent,
      due_date: patch.dueDate,
      assigned_to: assignedTo,
      recurrence_rule: rule,
      notes: patch.notes,
    });
    onClose();
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    const res = await cancelTask(task.id);
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.message ?? "Couldn't remove." });
      return;
    }
    onRemoved();
    onClose();
    toast({ message: "Removed" });
    router.refresh();
  }

  return (
    <Sheet open onClose={onClose} title="Edit task">
      <div className="space-y-4">
        <div>
          <Label htmlFor="ttitle">Title</Label>
          <Input
            id="ttitle"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <Label>Category</Label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={categoryId === c.id}
                onClick={() =>
                  setCategoryId(categoryId === c.id ? null : c.id)
                }
              >
                {c.icon} {c.name}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="tdue">Due date</Label>
          <Input
            id="tdue"
            type="date"
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </div>

        {members.length > 0 && (
          <div>
            <Label>Assign to</Label>
            <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
              {members.map((m) => (
                <Chip
                  key={m.userId}
                  active={assignedTo === m.userId}
                  onClick={() =>
                    setAssignedTo(assignedTo === m.userId ? null : m.userId)
                  }
                >
                  {m.name}
                </Chip>
              ))}
            </div>
          </div>
        )}

        <div>
          <Label>Repeat</Label>
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
            {RECURRENCE_PRESETS.map((p) => (
              <Chip
                key={p.key}
                active={recurrenceKey === p.key}
                onClick={() => setRecurrenceKey(p.key)}
              >
                {p.label}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="tnotes2">Notes</Label>
          <Textarea
            id="tnotes2"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={() => setUrgent(!urgent)}
          className={cn(
            "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-sm font-medium border transition",
            urgent
              ? "bg-urgent text-white border-urgent"
              : "bg-surface text-muted border-border",
          )}
        >
          <span
            className={cn("h-2 w-2 rounded-full", urgent ? "bg-white" : "bg-urgent")}
          />
          Urgent
        </button>

        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            size="lg"
            className="text-urgent"
            onClick={remove}
            disabled={saving}
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </Button>
          <Button
            size="lg"
            className="flex-1"
            onClick={save}
            disabled={saving || !title.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
