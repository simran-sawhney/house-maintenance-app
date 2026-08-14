"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Label } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { StoreChips } from "@/components/quick-add/quick-add-sheet";
import { ImagePicker } from "@/components/shopping/image-picker";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import {
  updateShoppingItem,
  cancelShoppingItem,
  setShoppingItemImage,
} from "@/actions/shopping";
import type { ShoppingItem, Store } from "@/types/db";
import { cn } from "@/lib/utils";

/** Edit an active shopping item (build spec §64). */
export function EditItemSheet({
  open,
  onClose,
  item,
  stores,
  imageUrl = null,
  onChanged,
  onRemoved,
}: {
  open: boolean;
  onClose: () => void;
  item: ShoppingItem | null;
  stores: Store[];
  imageUrl?: string | null;
  onChanged: (patch: Partial<ShoppingItem>) => void;
  onRemoved: () => void;
}) {
  const { toast } = useToast();
  const { householdId } = useQuickAdd();
  const router = useRouter();
  const [imagePath, setImagePath] = React.useState<string | null>(
    item?.image_path ?? null,
  );
  // Parent renders this component keyed by item.id, so initialisers run fresh
  // for each edited item — no sync effect required.
  const [name, setName] = React.useState(item?.name ?? "");
  const [storeId, setStoreId] = React.useState<string | null>(
    item?.store_id ?? null,
  );
  const [quantity, setQuantity] = React.useState(
    item?.quantity != null ? String(item.quantity) : "",
  );
  const [unit, setUnit] = React.useState(item?.unit ?? "");
  const [notes, setNotes] = React.useState(item?.notes ?? "");
  const [urgent, setUrgent] = React.useState(item?.urgent ?? false);
  const [saving, setSaving] = React.useState(false);

  if (!item) return null;

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const patch = {
      name: name.trim(),
      storeId,
      quantity: quantity ? Number(quantity) : null,
      unit: unit || null,
      notes: notes || null,
      urgent,
    };
    const res = await updateShoppingItem(item!.id, patch);
    setSaving(false);
    if (!res.ok) {
      toast({ message: res.message ?? "Couldn't update." });
      return;
    }
    onChanged({
      name: patch.name,
      store_id: storeId,
      quantity: patch.quantity,
      unit: patch.unit,
      notes: patch.notes,
      urgent,
    });
    onClose();
    router.refresh();
  }

  async function remove() {
    setSaving(true);
    const res = await cancelShoppingItem(item!.id);
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
    <Sheet open={open} onClose={onClose} title="Edit item">
      <div className="space-y-4">
        <div>
          <Label htmlFor="ename">Name</Label>
          <Input
            id="ename"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <StoreChips stores={stores} value={storeId} onChange={setStoreId} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="eqty">Quantity</Label>
            <Input
              id="eqty"
              inputMode="decimal"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="eunit">Unit</Label>
            <Input
              id="eunit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="enotes">Notes</Label>
          <Textarea
            id="enotes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div>
          <Label>Photo</Label>
          <ImagePicker
            householdId={householdId}
            value={imagePath}
            initialUrl={imageUrl}
            onChange={async (path) => {
              setImagePath(path);
              const res = await setShoppingItemImage(item!.id, path);
              if (!res.ok) {
                toast({ message: res.message ?? "Couldn't save the photo." });
                return;
              }
              onChanged({ image_path: path });
              router.refresh();
            }}
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
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
