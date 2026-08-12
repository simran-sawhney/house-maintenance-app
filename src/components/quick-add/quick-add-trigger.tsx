"use client";

import * as React from "react";
import { useQuickAdd, type QuickAddPreset } from "@/components/quick-add/quick-add-context";

/** Renders children as a button that opens Quick Add with a preset. */
export function QuickAddTrigger({
  preset,
  className,
  children,
}: {
  preset?: QuickAddPreset;
  className?: string;
  children: React.ReactNode;
}) {
  const { openQuickAdd } = useQuickAdd();
  return (
    <button
      type="button"
      className={className}
      onClick={() => openQuickAdd(preset)}
    >
      {children}
    </button>
  );
}
