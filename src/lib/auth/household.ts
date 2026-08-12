import "server-only";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Household, HouseholdMember, Profile } from "@/types/db";

export type HouseholdContext = {
  user: User;
  profile: Profile | null;
  household: Household;
  membership: HouseholdMember;
};

/** The signed-in user, or null. */
export const getUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/**
 * Resolve the active household context for the current user. Returns null when
 * the user is signed out or has no household yet (first-run onboarding).
 * Cached per-request so multiple loaders share one round-trip.
 */
export const getHouseholdContext = cache(
  async (): Promise<HouseholdContext | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // RLS only returns memberships/households the user can see.
    const { data: membership } = await supabase
      .from("household_members")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!membership) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      // Signal "no household" by returning null; caller routes to onboarding.
      void profile;
      return null;
    }

    const [{ data: household }, { data: profile }] = await Promise.all([
      supabase
        .from("households")
        .select("*")
        .eq("id", membership.household_id)
        .single(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    if (!household) return null;

    return {
      user,
      profile: profile ?? null,
      household: household as Household,
      membership: membership as HouseholdMember,
    };
  },
);

/**
 * Server-action guard. Throws if the user is not a member of a household.
 * Every mutating action calls this first so authorization is enforced
 * server-side, not just by RLS.
 */
export async function requireHousehold(): Promise<HouseholdContext> {
  const ctx = await getHouseholdContext();
  if (!ctx) throw new Error("Not authorized: no household membership");
  return ctx;
}
