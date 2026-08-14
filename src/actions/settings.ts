"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";

export type SimpleResult = { ok: boolean; message?: string };

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateHouseholdName(name: string): Promise<SimpleResult> {
  try {
    const { household, membership } = await requireHousehold();
    if (membership.role !== "admin")
      return { ok: false, message: "Only an admin can rename the home." };
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, message: "Name can't be empty." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("households")
      .update({ name: trimmed })
      .eq("id", household.id);
    if (error) return { ok: false, message: "Couldn't save. Try again." };
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save. Try again." };
  }
}

export async function updateDisplayName(name: string): Promise<SimpleResult> {
  try {
    const { user } = await requireHousehold();
    const supabase = await createClient();
    // Upsert so it works even if a profile row doesn't exist yet (e.g. members
    // added directly, who never ran onboarding).
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { id: user.id, display_name: name.trim() || null },
        { onConflict: "id" },
      );
    if (error) return { ok: false, message: "Couldn't save. Try again." };
    revalidatePath("/settings");
    revalidatePath("/");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save. Try again." };
  }
}

export async function createStore(input: {
  name: string;
  icon?: string;
}): Promise<SimpleResult> {
  try {
    const { household, membership } = await requireHousehold();
    if (membership.role !== "admin")
      return { ok: false, message: "Only an admin can add stores." };
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Enter a store name." };
    const supabase = await createClient();
    const { count } = await supabase
      .from("stores")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.id);
    const { error } = await supabase.from("stores").insert({
      household_id: household.id,
      name,
      icon: input.icon?.trim() || null,
      sort_order: count ?? 0,
    });
    if (error) return { ok: false, message: "Couldn't add the store." };
    revalidatePath("/settings");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't add the store." };
  }
}

export async function setStoreActive(
  id: string,
  active: boolean,
): Promise<SimpleResult> {
  try {
    const { household, membership } = await requireHousehold();
    if (membership.role !== "admin")
      return { ok: false, message: "Only an admin can manage stores." };
    const supabase = await createClient();
    const { error } = await supabase
      .from("stores")
      .update({ active })
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't update the store." };
    revalidatePath("/settings");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't update the store." };
  }
}

export async function createTaskCategory(input: {
  name: string;
  icon?: string;
}): Promise<SimpleResult> {
  try {
    const { household, membership } = await requireHousehold();
    if (membership.role !== "admin")
      return { ok: false, message: "Only an admin can add categories." };
    const name = input.name.trim();
    if (!name) return { ok: false, message: "Enter a category name." };
    const supabase = await createClient();
    const { count } = await supabase
      .from("task_categories")
      .select("id", { count: "exact", head: true })
      .eq("household_id", household.id);
    const { error } = await supabase.from("task_categories").insert({
      household_id: household.id,
      name,
      icon: input.icon?.trim() || null,
      sort_order: count ?? 0,
    });
    if (error) return { ok: false, message: "Couldn't add the category." };
    revalidatePath("/settings");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't add the category." };
  }
}
