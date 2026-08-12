"use client";

import * as React from "react";
import Link from "next/link";
import { Search as SearchIcon, ChevronRight } from "lucide-react";
import { Input, Card, SectionTitle } from "@/components/ui/primitives";
import { searchHousehold, type SearchSection } from "@/actions/search";

export function SearchView() {
  const [query, setQuery] = React.useState("");
  const [sections, setSections] = React.useState<SearchSection[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [searched, setSearched] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = React.useRef(0);

  React.useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const q = query.trim();
    timer.current = setTimeout(async () => {
      if (q.length < 2) {
        setSections([]);
        setSearched(false);
        setLoading(false);
        return;
      }
      const mine = ++seq.current;
      setLoading(true);
      const res = await searchHousehold(q);
      if (mine !== seq.current) return; // stale response
      setSections(res);
      setSearched(true);
      setLoading(false);
    }, 220);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  const empty = searched && !loading && sections.length === 0;

  return (
    <div className="px-4">
      <div className="relative mb-5">
        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-2" />
        <Input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search shopping, tasks, house, notes…"
          className="pl-11"
          aria-label="Search"
          enterKeyHint="search"
        />
      </div>

      {empty && (
        <p className="text-center text-muted text-sm py-10">
          No results for &ldquo;{query.trim()}&rdquo;.
        </p>
      )}

      <div className="space-y-6">
        {sections.map((section) => (
          <section key={section.key} className="space-y-2">
            <SectionTitle>{section.label}</SectionTitle>
            <Card className="divide-y divide-border overflow-hidden">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-surface-2"
                >
                  <div className="min-w-0">
                    <div className="text-[15px] truncate">{item.title}</div>
                    {item.subtitle && (
                      <div className="text-xs text-muted truncate">
                        {item.subtitle}
                      </div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-2 shrink-0" />
                </Link>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </div>
  );
}
