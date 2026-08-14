"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ShoppingCart,
  CheckSquare,
  CalendarDays,
  Wrench,
  Plus,
} from "lucide-react";
import { useQuickAdd } from "@/components/quick-add/quick-add-context";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/buy", label: "Buy", icon: ShoppingCart },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/house", label: "House", icon: Wrench },
];

export function BottomNav() {
  const pathname = usePathname();
  const { openQuickAdd } = useQuickAdd();

  const isActive = (href: string, exact?: boolean) =>
    exact
      ? pathname === href
      : pathname === href || pathname.startsWith(href + "/");

  return (
    <>
      {/* Floating quick-add button (bottom-right, clear of the nav row) */}
      <button
        onClick={() => openQuickAdd()}
        aria-label="Quick add"
        className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition"
      >
        <Plus className="h-7 w-7" />
      </button>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur h-safe-nav pb-safe"
        aria-label="Primary"
      >
        <div className="mx-auto max-w-md grid grid-cols-5 h-[4.25rem] items-center">
          {ITEMS.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href, item.exact)}
            />
          ))}
        </div>
      </nav>
    </>
  );
}

function NavLink({
  item,
  active,
}: {
  item: (typeof ITEMS)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-col items-center justify-center gap-0.5 h-full text-[11px] font-medium transition",
        active ? "text-foreground" : "text-muted-2",
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon className={cn("h-6 w-6", active && "stroke-[2.4]")} />
      {item.label}
    </Link>
  );
}
