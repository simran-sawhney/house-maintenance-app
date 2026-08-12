"use client";

import * as React from "react";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/primitives";
import { updatePurchaseDetails } from "@/actions/shopping";

/**
 * Non-blocking "Purchased ✓" sheet (build spec §16). Price/quantity optional;
 * the purchase is already saved, so closing without entering anything is fine.
 */
export function PurchaseSheet({
  open,
  onClose,
  purchaseId,
  itemName,
  defaultQuantity,
  currency,
}: {
  open: boolean;
  onClose: () => void;
  purchaseId: string | null;
  itemName: string;
  defaultQuantity: number | null;
  currency: string;
}) {
  const [price, setPrice] = React.useState("");
  const [quantity, setQuantity] = React.useState(
    defaultQuantity != null ? String(defaultQuantity) : "",
  );
  const [saving, setSaving] = React.useState(false);

  async function save() {
    if (!purchaseId) {
      onClose();
      return;
    }
    setSaving(true);
    await updatePurchaseDetails(purchaseId, {
      price: price ? Number(price) : null,
      quantity: quantity ? Number(quantity) : null,
    });
    setSaving(false);
    onClose();
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Purchased ✓`}>
      <p className="text-sm text-muted mb-4">
        {itemName} is saved to history. Add a price if you like — optional.
      </p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label htmlFor="price">Price ({currency})</Label>
          <Input
            id="price"
            inputMode="decimal"
            autoFocus
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0.00"
          />
        </div>
        <div>
          <Label htmlFor="pqty">Quantity</Label>
          <Input
            id="pqty"
            inputMode="decimal"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="1"
          />
        </div>
      </div>
      <Button className="w-full" size="lg" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Done"}
      </Button>
    </Sheet>
  );
}
