"use client";

import * as React from "react";
import type { Store, TaskCategory } from "@/types/db";

export type QuickAddKind = "buy" | "task" | "note";

export type MemberOption = { userId: string; name: string };

export type QuickAddPreset = {
  kind?: QuickAddKind;
  storeId?: string | null;
  batch?: boolean;
  prefillName?: string;
  /** Prefill a task due date (YYYY-MM-DD), e.g. from the calendar. */
  dueDate?: string | null;
};

type QuickAddData = {
  householdId: string;
  stores: Store[];
  categories: TaskCategory[];
  members: MemberOption[];
};

type QuickAddContextValue = QuickAddData & {
  open: boolean;
  preset: QuickAddPreset | null;
  openQuickAdd: (preset?: QuickAddPreset) => void;
  close: () => void;
};

const QuickAddContext = React.createContext<QuickAddContextValue | null>(null);

export function useQuickAdd() {
  const ctx = React.useContext(QuickAddContext);
  if (!ctx) throw new Error("useQuickAdd must be used within QuickAddProvider");
  return ctx;
}

export function QuickAddProvider({
  data,
  children,
}: {
  data: QuickAddData;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [preset, setPreset] = React.useState<QuickAddPreset | null>(null);

  const openQuickAdd = React.useCallback((p?: QuickAddPreset) => {
    setPreset(p ?? null);
    setOpen(true);
  }, []);
  const close = React.useCallback(() => setOpen(false), []);

  return (
    <QuickAddContext.Provider
      value={{ ...data, open, preset, openQuickAdd, close }}
    >
      {children}
    </QuickAddContext.Provider>
  );
}
