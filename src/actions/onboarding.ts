"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_STORES,
  DEFAULT_TASK_CATEGORIES,
} from "@/lib/household/defaults";
import { DEFAULT_TIMEZONE } from "@/lib/dates";

export type OnboardingState = { error?: string };

/**
 * First-run bootstrap (build spec §91). Creates the household, makes the user
 * an admin, and seeds default stores + task categories — all under the user's
 * own session so RLS applies (no service-role key required).
 */
export async function createHousehold(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You need to be signed in." };

  const rawName = String(formData.get("name") ?? "").trim();
  const name = rawName || "Our Home";
  const displayName = String(formData.get("display_name") ?? "").trim();

  // Ensure a profile row exists.
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      display_name:
        displayName ||
        (user.user_metadata?.display_name as string | undefined) ||
        null,
    },
    { onConflict: "id" },
  );

  // Generate the id client-side so we never need to read the household back
  // before the membership row (which unlocks RLS SELECT) exists.
  const householdId = crypto.randomUUID();

  const { error: hErr } = await supabase.from("households").insert({
    id: householdId,
    name,
    currency_code: "AUD",
    timezone: DEFAULT_TIMEZONE,
  });
  if (hErr) return { error: "Couldn't create your home. Try again." };

  const { error: mErr } = await supabase.from("household_members").insert({
    household_id: householdId,
    user_id: user.id,
    role: "admin",
  });
  if (mErr) return { error: "Couldn't set up membership. Try again." };

  // Seed stores + categories (user is now admin, so RLS permits these).
  await supabase.from("stores").insert(
    DEFAULT_STORES.map((s, i) => ({
      household_id: householdId,
      name: s.name,
      icon: s.icon,
      sort_order: i,
    })),
  );
  await supabase.from("task_categories").insert(
    DEFAULT_TASK_CATEGORIES.map((c, i) => ({
      household_id: householdId,
      name: c.name,
      icon: c.icon,
      sort_order: i,
    })),
  );

  redirect("/");
}
