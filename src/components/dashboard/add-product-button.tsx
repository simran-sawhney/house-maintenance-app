"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { addProductToList } from "@/actions/shopping";

/** Re-add a known product to the active shopping list. */
export function AddProductButton({
  productId,
  name,
}: {
  productId: string;
  name: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function add() {
    setBusy(true);
    const res = await addProductToList(productId);
    setBusy(false);
    if (res.status === "error") {
      toast({ message: res.message });
      return;
    }
    if (res.status === "duplicate") {
      toast({ message: `${name} is already on the list` });
      return;
    }
    toast({ message: `Added ${name}` });
    router.refresh();
  }

  return (
    <Button size="sm" onClick={add} disabled={busy}>
      <Plus className="h-4 w-4" />
      {busy ? "Adding…" : "Add to list"}
    </Button>
  );
}
