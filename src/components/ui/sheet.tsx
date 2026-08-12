"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMounted } from "@/lib/use-mounted";

export function Sheet({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const mounted = useMounted();

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : "Dialog"}
        className={cn(
          "relative w-full sm:max-w-md bg-surface sm:rounded-2xl rounded-t-2xl",
          "shadow-xl border-t sm:border border-border animate-sheet-up",
          "max-h-[92vh] flex flex-col pb-safe",
          className,
        )}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-2 shrink-0">
          <div className="text-base font-semibold text-foreground">{title}</div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 -mr-2 rounded-full flex items-center justify-center text-muted hover:bg-surface-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-5 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
