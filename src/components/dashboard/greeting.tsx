"use client";

import { useSyncExternalStore } from "react";

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Time-aware greeting. Reads the clock only on the client (via
 * useSyncExternalStore) so there's no hydration mismatch and no effect.
 */
export function Greeting({ householdName }: { householdName: string }) {
  const hour = useSyncExternalStore(
    () => () => {},
    () => new Date().getHours(),
    () => -1,
  );

  const text = hour < 0 ? "Our Home" : greetingFor(hour);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{text}</h1>
      <p className="text-muted text-sm mt-0.5">{householdName}</p>
    </div>
  );
}
