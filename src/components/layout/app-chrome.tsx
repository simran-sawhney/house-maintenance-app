"use client";

import * as React from "react";
import { ToastProvider } from "@/components/ui/toast";
import {
  QuickAddProvider,
  type MemberOption,
} from "@/components/quick-add/quick-add-context";
import { QuickAddSheet } from "@/components/quick-add/quick-add-sheet";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { Store, TaskCategory } from "@/types/db";

export function AppChrome({
  stores,
  categories,
  members,
  children,
}: {
  stores: Store[];
  categories: TaskCategory[];
  members: MemberOption[];
  children: React.ReactNode;
}) {
  return (
    <ToastProvider>
      <QuickAddProvider data={{ stores, categories, members }}>
        <div className="mx-auto max-w-md w-full min-h-dvh pb-28">
          {children}
        </div>
        <BottomNav />
        <QuickAddSheet />
      </QuickAddProvider>
    </ToastProvider>
  );
}
