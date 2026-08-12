"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@/lib/use-mounted";

type Toast = {
  id: number;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = React.createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const mounted = useMounted();

  const remove = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { ...t, id }]);
      const duration = t.duration ?? 4500;
      window.setTimeout(() => remove(id), duration);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {mounted &&
        createPortal(
          <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 px-4 pb-24 sm:pb-6 pointer-events-none">
            {toasts.map((t) => (
              <div
                key={t.id}
                className="pointer-events-auto w-full max-w-sm flex items-center justify-between gap-3 rounded-xl bg-primary text-primary-foreground px-4 py-3 shadow-lg animate-fade-in"
              >
                <span className="text-sm font-medium">{t.message}</span>
                {t.actionLabel && (
                  <button
                    onClick={() => {
                      t.onAction?.();
                      remove(t.id);
                    }}
                    className="text-sm font-semibold underline underline-offset-2 shrink-0"
                  >
                    {t.actionLabel}
                  </button>
                )}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}
