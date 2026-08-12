export default function Loading() {
  return (
    <div className="px-4 pt-6 animate-fade-in" aria-hidden>
      <div className="h-8 w-40 rounded-lg bg-surface-2 mb-6" />
      <div className="flex gap-2 mb-6">
        <div className="h-10 w-24 rounded-full bg-surface-2" />
        <div className="h-10 w-24 rounded-full bg-surface-2" />
        <div className="h-10 w-28 rounded-full bg-surface-2" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-surface-2" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
