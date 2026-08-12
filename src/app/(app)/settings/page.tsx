import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { SettingsView } from "@/components/settings/settings-view";
import type { Store, TaskCategory } from "@/types/db";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { household, membership, user, profile } = await requireHousehold();
  const supabase = await createClient();

  const [{ data: memberRows }, { data: stores }, { data: categories }] =
    await Promise.all([
      supabase
        .from("household_members")
        .select("user_id, role")
        .eq("household_id", household.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("stores")
        .select("*")
        .eq("household_id", household.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("task_categories")
        .select("*")
        .eq("household_id", household.id)
        .order("sort_order", { ascending: true }),
    ]);

  // Resolve member names.
  const ids = (memberRows ?? []).map((m) => m.user_id as string);
  const nameById = new Map<string, string>();
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const p of profiles ?? [])
      nameById.set(p.id as string, (p.display_name as string) || "Member");
  }
  const members = (memberRows ?? []).map((m) => ({
    userId: m.user_id as string,
    name: nameById.get(m.user_id as string) || "Member",
    role: m.role as string,
    isYou: m.user_id === user.id,
  }));

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
        <h1 className="text-xl font-semibold">Settings</h1>
      </div>
      <div className="px-4">
        <SettingsView
          householdName={household.name}
          displayName={profile?.display_name ?? ""}
          isAdmin={membership.role === "admin"}
          members={members}
          stores={(stores as Store[]) ?? []}
          categories={(categories as TaskCategory[]) ?? []}
        />
      </div>
    </div>
  );
}
