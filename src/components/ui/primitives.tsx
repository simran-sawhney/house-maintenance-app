import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-surface border border-border shadow-[0_1px_2px_rgba(0,0,0,0.03)]",
        className,
      )}
      {...props}
    />
  );
}

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-[15px] text-foreground",
      "placeholder:text-muted-2 outline-none transition",
      "focus:border-border-strong focus:ring-2 focus:ring-ring/40",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[15px] text-foreground",
      "placeholder:text-muted-2 outline-none transition resize-none",
      "focus:border-border-strong focus:ring-2 focus:ring-ring/40",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "block text-xs font-medium text-muted mb-1.5 tracking-wide",
        className,
      )}
      {...props}
    />
  );
}

export function SectionTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-muted-2 px-1",
        className,
      )}
      {...props}
    />
  );
}

/** A tappable chip, e.g. for stores or categories. */
export function Chip({
  active,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full text-sm font-medium whitespace-nowrap transition touch-manipulation border",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-surface text-foreground border-border hover:bg-surface-2",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "urgent" | "success" | "accent";
}) {
  const tones = {
    neutral: "bg-surface-2 text-muted border-border",
    urgent: "bg-urgent-soft text-urgent border-transparent",
    success: "bg-success-soft text-success border-transparent",
    accent: "bg-accent-soft text-accent border-transparent",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
