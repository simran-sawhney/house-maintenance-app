import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { SearchView } from "@/components/search/search-view";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage() {
  return (
    <div>
      <div className="flex items-center gap-2 px-4 pt-5 pb-3">
        <Link
          href="/"
          aria-label="Back"
          className="h-9 w-9 -ml-2 rounded-full flex items-center justify-center hover:bg-surface-2"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <h1 className="text-xl font-semibold">Search</h1>
      </div>
      <SearchView />
    </div>
  );
}
