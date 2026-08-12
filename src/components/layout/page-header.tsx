import * as React from "react";

/** Sticky-ish page header used across app screens. */
export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-4 pt-6 pb-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-muted text-sm mt-0.5">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
