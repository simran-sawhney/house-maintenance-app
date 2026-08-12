"use client";

import { useEffect } from "react";

/** Registers the service worker for installability + offline shell. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Registration failures are non-fatal.
      });
    }
  }, []);
  return null;
}
