"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, CheckSquare, StickyNote } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label, Chip } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ItemNameInput } from "@/components/shopping/item-name-input";
import { ImagePicker } from "@/components/shopping/image-picker";
import {
  useQuickAdd,
  type QuickAddKind,
} from "@/components/quick-add/quick-add-context";
import {
  createShoppingItem,
  createShoppingItemsBatch,
} from "@/actions/shopping";
import { createTask } from "@/actions/tasks";
import { createNote } from "@/actions/notes";
import {
  TaskScheduleFields,
  type ScheduleValue,
} from "@/components/tasks/task-schedule-fields";
import { HOUSE_AREAS } from "@/types/db";
import { cn } from "@/lib/utils";

const KINDS: { key: QuickAddKind; label: string; icon: React.ReactNode }[] = [
  { key: "buy", label: "Buy", icon: <ShoppingCart className="h-5 w-5" /> },
  { key: "task", label: "Task", icon: <CheckSquare className="h-5 w-5" /> },
  { key: "note", label: "Note", icon: <StickyNote className="h-5 w-5" /> },
];

export function QuickAddSheet() {
  const { open, close } = useQuickAdd();
  // Sheet unmounts its children when closed, so the body starts fresh on each
  // open — no effect needed to reset state.
  return (
    <Sheet open={open} onClose={close} title="Quick add">
      <QuickAddBody onClose={close} />
    </Sheet>
  );
}

function QuickAddBody({ onClose }: { onClose: () => void }) {
  const { preset } = useQuickAdd();
  const [kind, setKind] = React.useState<QuickAddKind>(preset?.kind ?? "buy");

  return (
    <>
      <div className="grid grid-cols-3 gap-2 mb-4">
        {KINDS.map((k) => (
          <button
            key={k.key}
            type="button"
            onClick={() => setKind(k.key)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border py-3 transition touch-manipulation",
              kind === k.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted hover:bg-surface-2",
            )}
            aria-pressed={kind === k.key}
          >
            {k.icon}
            <span className="text-sm font-medium">{k.label}</span>
          </button>
        ))}
      </div>

      {kind === "buy" && <BuyForm onDone={onClose} />}
      {kind === "task" && <TaskForm onDone={onClose} />}
      {kind === "note" && <NoteForm onDone={onClose} />}
    </>
  );
}

/* ------------------------------- Buy ---------------------------------- */

function BuyForm({ onDone }: { onDone: () => void }) {
  const { stores, preset, householdId } = useQuickAdd();
  const { toast } = useToast();
  const router = useRouter();

  const [batch, setBatch] = React.useState(preset?.batch ?? false);
  const [name, setName] = React.useState(preset?.prefillName ?? "");
  const [storeId, setStoreId] = React.useState<string | null>(
    preset?.storeId ?? null,
  );
  const [quantity, setQuantity] = React.useState("");
  const [unit, setUnit] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [urgent, setUrgent] = React.useState(false);
  const [imagePath, setImagePath] = React.useState<string | null>(null);
  const [showMore, setShowMore] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [batchText, setBatchText] = React.useState("");
  const [dup, setDup] = React.useState<{ storeName: string | null } | null>(
    null,
  );

  const batchCount = batchText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean).length;

  async function submitSingle(allowDuplicate = false) {
    if (!name.trim()) return;
    setPending(true);
    setDup(null);
    const res = await createShoppingItem({
      name,
      storeId,
      quantity: quantity ? Number(quantity) : null,
      unit: unit || null,
      notes: notes || null,
      urgent,
      imagePath,
      allowDuplicate,
    });
    setPending(false);
    if (res.status === "duplicate") {
      setDup({ storeName: res.storeName });
      return;
    }
    if (res.status === "error") {
      toast({ message: res.message });
      return;
    }
    toast({ message: `Added ${name.trim()}` });
    router.refresh();
    onDone();
  }

  async function submitBatch() {
    if (batchCount === 0) return;
    setPending(true);
    const res = await createShoppingItemsBatch({ storeId, text: batchText, urgent });
    setPending(false);
    if (res.status === "error") {
      toast({ message: res.message });
      return;
    }
    toast({
      message:
        res.added > 0
          ? `Added ${res.added} item${res.added === 1 ? "" : "s"}${res.skipped ? ` · ${res.skipped} already listed` : ""}`
          : "Everything was already on the list",
    });
    router.refresh();
    onDone();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ModeToggle
          active={!batch}
          onClick={() => setBatch(false)}
          label="One item"
        />
        <ModeToggle
          active={batch}
          onClick={() => setBatch(true)}
          label="Many"
        />
      </div>

      {!batch ? (
        <>
          <ItemNameInput
            value={name}
            onChange={(v) => {
              setName(v);
              setDup(null);
            }}
            onPick={(s) => {
              if (s.storeId) setStoreId(s.storeId);
              if (s.quantity != null) setQuantity(String(s.quantity));
              if (s.unit) setUnit(s.unit);
            }}
            autoFocus
          />

          {dup && (
            <div className="rounded-xl border border-urgent/40 bg-urgent-soft px-3.5 py-3 text-sm">
              <p className="text-foreground">
                <span className="font-medium">{name.trim()}</span> is already on
                {dup.storeName ? ` the ${dup.storeName} list.` : " your list."}
              </p>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    onDone();
                    router.push("/buy");
                  }}
                >
                  View list
                </Button>
                <Button
                  size="sm"
                  onClick={() => submitSingle(true)}
                  disabled={pending}
                >
                  Add anyway
                </Button>
              </div>
            </div>
          )}

          <StoreChips
            stores={stores}
            value={storeId}
            onChange={setStoreId}
          />

          {showMore && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="qty">Quantity</Label>
                  <Input
                    id="qty"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="kg, L, pack"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="bnotes">Notes</Label>
                <Textarea
                  id="bnotes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any details"
                />
              </div>
              <div>
                <Label>Photo (optional)</Label>
                <ImagePicker
                  householdId={householdId}
                  value={imagePath}
                  onChange={setImagePath}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <UrgentToggle value={urgent} onChange={setUrgent} />
            <button
              type="button"
              className="text-sm text-muted underline underline-offset-2"
              onClick={() => setShowMore((s) => !s)}
            >
              {showMore ? "Less" : "More options"}
            </button>
          </div>

          <Button
            size="lg"
            className="w-full"
            onClick={() => submitSingle(false)}
            disabled={pending || !name.trim()}
          >
            {pending ? "Adding…" : "Add"}
          </Button>
        </>
      ) : (
        <>
          <StoreChips stores={stores} value={storeId} onChange={setStoreId} />
          <Textarea
            rows={6}
            autoFocus
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={"Tomatoes\nOnions\nCoriander\nGreen chilli\nGinger"}
            aria-label="One item per line"
          />
          <UrgentToggle value={urgent} onChange={setUrgent} />
          <Button
            size="lg"
            className="w-full"
            onClick={submitBatch}
            disabled={pending || batchCount === 0}
          >
            {pending
              ? "Adding…"
              : `Add ${batchCount} item${batchCount === 1 ? "" : "s"}`}
          </Button>
        </>
      )}
    </div>
  );
}

/* ------------------------------- Task --------------------------------- */

function TaskForm({ onDone }: { onDone: () => void }) {
  const { categories, members, preset } = useQuickAdd();
  const { toast } = useToast();
  const router = useRouter();

  const [title, setTitle] = React.useState("");
  const [categoryId, setCategoryId] = React.useState<string | null>(null);
  const [urgent, setUrgent] = React.useState(false);
  const [schedule, setSchedule] = React.useState<ScheduleValue>({
    dueDate: preset?.dueDate ?? null,
    recurrence: null,
    recurrenceEndDate: null,
  });
  const [assignedTo, setAssignedTo] = React.useState<string | null>(null);
  const [notes, setNotes] = React.useState("");
  const [showMore, setShowMore] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  async function submit() {
    if (!title.trim()) return;
    setPending(true);
    const res = await createTask({
      title,
      categoryId,
      urgent,
      dueDate: schedule.dueDate,
      assignedTo,
      recurrence: schedule.recurrence,
      recurrenceEndDate: schedule.recurrenceEndDate,
      notes: notes || null,
    });
    setPending(false);
    if (!res.ok) {
      toast({ message: res.message });
      return;
    }
    toast({ message: `Added ${title.trim()}` });
    router.refresh();
    onDone();
  }

  return (
    <div className="space-y-4">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs doing?"
        aria-label="Task title"
        enterKeyHint="done"
      />

      <ChipRow label="Category">
        {categories.map((c) => (
          <Chip
            key={c.id}
            active={categoryId === c.id}
            onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
          >
            {c.icon} {c.name}
          </Chip>
        ))}
      </ChipRow>

      <TaskScheduleFields value={schedule} onChange={setSchedule} />

      {showMore && (
        <div className="space-y-4">
          {members.length > 0 && (
            <ChipRow label="Assign to">
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
            </ChipRow>
          )}

          <div>
            <Label htmlFor="tnotes">Notes</Label>
            <Textarea
              id="tnotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any details"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <UrgentToggle value={urgent} onChange={setUrgent} />
        <button
          type="button"
          className="text-sm text-muted underline underline-offset-2"
          onClick={() => setShowMore((s) => !s)}
        >
          {showMore ? "Less" : "More options"}
        </button>
      </div>

      <Button
        size="lg"
        className="w-full"
        onClick={submit}
        disabled={pending || !title.trim()}
      >
        {pending ? "Adding…" : "Add task"}
      </Button>
    </div>
  );
}

/* ------------------------------- Note --------------------------------- */

function NoteForm({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const router = useRouter();
  const [title, setTitle] = React.useState("");
  const [area, setArea] = React.useState<string | null>(null);
  const [content, setContent] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit() {
    if (!title.trim()) return;
    setPending(true);
    const res = await createNote({ title, area, content: content || null });
    setPending(false);
    if (!res.ok) {
      toast({ message: res.message });
      return;
    }
    toast({ message: "Note saved" });
    router.refresh();
    onDone();
  }

  return (
    <div className="space-y-4">
      <Input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title"
        aria-label="Note title"
      />
      <ChipRow label="Area (optional)">
        {HOUSE_AREAS.map((a) => (
          <Chip
            key={a}
            active={area === a}
            onClick={() => setArea(area === a ? null : a)}
          >
            {a}
          </Chip>
        ))}
      </ChipRow>
      <Textarea
        rows={4}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Details, model numbers, phone numbers…"
        aria-label="Note details"
      />
      <Button
        size="lg"
        className="w-full"
        onClick={submit}
        disabled={pending || !title.trim()}
      >
        {pending ? "Saving…" : "Save note"}
      </Button>
    </div>
  );
}

/* --------------------------- Shared bits ------------------------------ */

export function StoreChips({
  stores,
  value,
  onChange,
}: {
  stores: { id: string; name: string; icon: string | null }[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  return (
    <ChipRow label="Store">
      {stores.map((s) => (
        <Chip
          key={s.id}
          active={value === s.id}
          onClick={() => onChange(value === s.id ? null : s.id)}
        >
          {s.icon} {s.name}
        </Chip>
      ))}
    </ChipRow>
  );
}

function ChipRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
        {children}
      </div>
    </div>
  );
}

function ModeToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 h-9 rounded-lg text-sm font-medium transition",
        active
          ? "bg-surface-2 text-foreground border border-border-strong"
          : "text-muted",
      )}
    >
      {label}
    </button>
  );
}

function UrgentToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-sm font-medium border transition",
        value
          ? "bg-urgent text-white border-urgent"
          : "bg-surface text-muted border-border",
      )}
      aria-pressed={value}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          value ? "bg-white" : "bg-urgent",
        )}
      />
      Urgent
    </button>
  );
}
