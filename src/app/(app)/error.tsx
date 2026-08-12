"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface for server-side/dev logs; users see the friendly message below.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted text-sm mt-1 mb-6">
        We couldn&rsquo;t load this just now. Please try again.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
