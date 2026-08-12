import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "urgent" | "outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 active:opacity-80",
  secondary:
    "bg-surface-2 text-foreground border border-border hover:bg-surface active:bg-surface-2",
  outline:
    "border border-border-strong text-foreground hover:bg-surface-2 active:bg-surface",
  ghost: "text-foreground hover:bg-surface-2 active:bg-surface",
  urgent: "bg-urgent text-white hover:opacity-90 active:opacity-80",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-lg gap-1.5",
  md: "h-11 px-4 text-[15px] rounded-xl gap-2",
  lg: "h-13 px-5 text-base rounded-xl gap-2",
  icon: "h-11 w-11 rounded-xl",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-medium transition select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        "disabled:opacity-50 disabled:pointer-events-none touch-manipulation",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
