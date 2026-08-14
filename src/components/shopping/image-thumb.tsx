"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/** Small product thumbnail; tap to open a large preview (spec §18, §19). */
export function ImageThumb({
  url,
  alt,
  className,
}: {
  url: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const mounted = useMounted();

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`View photo of ${alt}`}
        className={cn(
          "shrink-0 rounded-lg overflow-hidden border border-border bg-surface-2",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt} className="h-full w-full object-cover" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 animate-fade-in"
            onClick={() => setOpen(false)}
          >
            <button
              aria-label="Close"
              className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white flex items-center justify-center"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={alt}
              className="max-h-full max-w-full rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <div className="absolute bottom-6 inset-x-0 text-center text-white/90 text-sm font-medium">
              {alt}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
