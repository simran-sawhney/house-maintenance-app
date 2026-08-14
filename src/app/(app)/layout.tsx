import { redirect } from "next/navigation";
import { getUser, getHouseholdContext } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { AppChrome } from "@/components/layout/app-chrome";
import type { MemberOption } from "@/components/quick-add/quick-add-context";
import type { Store, TaskCategory } from "@/types/db";

export default async function AppLayout({
  children,
}: LayoutProps<"/">) {
  const user = await getUser();
  if (!user) redirect("/login");

  const ctx = await getHouseholdContext();
  if (!ctx) redirect("/onboarding");

  const supabase = await createClient();
  const [{ data: stores }, { data: categories }, { data: memberRows }] =
    await Promise.all([
      supabase
        .from("stores")
        .select("*")
        .eq("household_id", ctx.household.id)
        .eq("active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("task_categories")
        .select("*")
        .eq("household_id", ctx.household.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("household_members")
        .select("user_id")
        .eq("household_id", ctx.household.id),
    ]);

  // Resolve member display names.
  const userIds = (memberRows ?? []).map((m) => m.user_id as string);
  const members: MemberOption[] = [];
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", userIds);
    const nameById = new Map(
      (profiles ?? []).map((p) => [p.id as string, p.display_name as string]),
    );
    for (const id of userIds) {
      members.push({
        userId: id,
        name: nameById.get(id) || (id === user.id ? "You" : "Member"),
      });
    }
  }

  return (
    <AppChrome
      householdId={ctx.household.id}
      stores={(stores as Store[]) ?? []}
      categories={(categories as TaskCategory[]) ?? []}
      members={members}
    >
      {children}
    </AppChrome>
  );
}
