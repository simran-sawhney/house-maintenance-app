"use client";

import * as React from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { uploadShoppingImage } from "@/lib/upload-image";
import { cn } from "@/lib/utils";

/**
 * Optional shopping-item photo (spec §17, §25). Uploading happens immediately
 * and independently; failure is recoverable and never blocks adding the item.
 */
export function ImagePicker({
  householdId,
  onChange,
  initialUrl = null,
}: {
  householdId: string;
  /** Current stored path (accepted for API symmetry; preview is tracked internally). */
  value?: string | null;
  onChange: (path: string | null) => void;
  initialUrl?: string | null;
}) {
  const cameraRef = React.useRef<HTMLInputElement>(null);
  const galleryRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(initialUrl);
  const [status, setStatus] = React.useState<"idle" | "uploading" | "error">(
    "idle",
  );
  const lastFile = React.useRef<File | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    lastFile.current = file;
    setPreview(URL.createObjectURL(file));
    setStatus("uploading");
    try {
      const path = await uploadShoppingImage(householdId, file);
      onChange(path);
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }

  function clear() {
    setPreview(null);
    onChange(null);
    setStatus("idle");
    lastFile.current = null;
  }

  return (
    <div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {preview ? (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Item photo"
            className="h-14 w-14 rounded-lg object-cover border border-border"
          />
          <div className="flex-1 text-sm">
            {status === "uploading" && (
              <span className="text-muted inline-flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading…
              </span>
            )}
            {status === "error" && (
              <button
                type="button"
                onClick={() => handleFile(lastFile.current ?? undefined)}
                className="text-urgent underline underline-offset-2"
              >
                Upload failed — retry
              </button>
            )}
            {status === "idle" && <span className="text-success">Photo ready</span>}
          </div>
          <button
            type="button"
            onClick={clear}
            aria-label="Remove photo"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted hover:bg-surface-2"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <PickerButton onClick={() => cameraRef.current?.click()}>
            <Camera className="h-4 w-4" /> Take photo
          </PickerButton>
          <PickerButton onClick={() => galleryRef.current?.click()}>
            <ImagePlus className="h-4 w-4" /> Choose photo
          </PickerButton>
        </div>
      )}
    </div>
  );
}

function PickerButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 inline-flex items-center justify-center gap-1.5 h-10 rounded-xl border border-border bg-surface text-sm font-medium text-muted hover:bg-surface-2",
      )}
    >
      {children}
    </button>
  );
}
