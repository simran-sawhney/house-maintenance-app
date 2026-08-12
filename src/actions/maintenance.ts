"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import { logActivity } from "@/lib/activity";
import type { MaintenanceItem, MaintenanceStatus } from "@/types/db";

export type CreateMaintenanceInput = {
  title: string;
  area: string;
  description?: string | null;
  status?: MaintenanceStatus;
};

export type CreateMaintenanceResult =
  | { ok: true; item: MaintenanceItem }
  | { ok: false; message: string };

export async function createMaintenanceItem(
  input: CreateMaintenanceInput,
): Promise<CreateMaintenanceResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();
    const title = input.title.trim();
    if (!title) return { ok: false, message: "Please enter a title." };

    const { data, error } = await supabase
      .from("maintenance_items")
      .insert({
        household_id: household.id,
        title,
        area: input.area,
        description: input.description?.trim() || null,
        status: input.status ?? "good",
        created_by: user.id,
      })
      .select("*")
      .single();
    if (error) return { ok: false, message: "Couldn't save. Try again." };

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "maintenance_updated",
      entityType: "maintenance_item",
      entityId: data.id,
      metadata: { title, created: true },
    });

    revalidatePath("/house");
    return { ok: true, item: data as MaintenanceItem };
  } catch {
    return { ok: false, message: "Couldn't save. Try again." };
  }
}

export type SimpleResult = { ok: boolean; message?: string };

export async function updateMaintenanceItem(
  id: string,
  patch: {
    title?: string;
    area?: string;
    description?: string | null;
    status?: MaintenanceStatus;
  },
): Promise<SimpleResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) return { ok: false, message: "Title can't be empty." };
      update.title = t;
    }
    if (patch.area !== undefined) update.area = patch.area;
    if (patch.description !== undefined)
      update.description = patch.description?.trim() || null;
    if (patch.status !== undefined) update.status = patch.status;

    const { error } = await supabase
      .from("maintenance_items")
      .update(update)
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't update. Try again." };

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "maintenance_updated",
      entityType: "maintenance_item",
      entityId: id,
      metadata: patch.status ? { status: patch.status } : {},
    });

    revalidatePath("/house");
    revalidatePath(`/house/${id}`);
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't update. Try again." };
  }
}

export type AddLogInput = {
  maintenanceItemId: string;
  note: string;
  cost?: number | null;
  occurredAt?: string | null; // ISO
};

export async function addMaintenanceLog(
  input: AddLogInput,
): Promise<SimpleResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();
    const note = input.note.trim();
    if (!note) return { ok: false, message: "Please enter a note." };

    const { error } = await supabase.from("maintenance_logs").insert({
      household_id: household.id,
      maintenance_item_id: input.maintenanceItemId,
      note,
      cost: input.cost ?? null,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      created_by: user.id,
    });
    if (error) return { ok: false, message: "Couldn't save the log. Try again." };

    // Touch the item's updated_at.
    await supabase
      .from("maintenance_items")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", input.maintenanceItemId)
      .eq("household_id", household.id);

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "maintenance_updated",
      entityType: "maintenance_item",
      entityId: input.maintenanceItemId,
      metadata: { logged: true },
    });

    revalidatePath("/house");
    revalidatePath(`/house/${input.maintenanceItemId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't save the log. Try again." };
  }
}
