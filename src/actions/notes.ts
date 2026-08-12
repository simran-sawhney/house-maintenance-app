"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import { logActivity } from "@/lib/activity";
import type { Note } from "@/types/db";

export type CreateNoteInput = {
  title: string;
  content?: string | null;
  area?: string | null;
};

export type CreateNoteResult =
  | { ok: true; note: Note }
  | { ok: false; message: string };

export async function createNote(
  input: CreateNoteInput,
): Promise<CreateNoteResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();
    const title = input.title.trim();
    if (!title) return { ok: false, message: "Please enter a note." };

    const { data, error } = await supabase
      .from("notes")
      .insert({
        household_id: household.id,
        title,
        content: input.content?.trim() || null,
        area: input.area?.trim() || null,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (error) return { ok: false, message: "Couldn't save this note. Try again." };

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "note_added",
      entityType: "note",
      entityId: data.id,
      metadata: { title },
    });

    revalidatePath("/house");
    revalidatePath("/");
    return { ok: true, note: data as Note };
  } catch {
    return { ok: false, message: "Couldn't save this note. Try again." };
  }
}

export type SimpleResult = { ok: boolean; message?: string };

export async function updateNote(
  id: string,
  patch: { title?: string; content?: string | null; area?: string | null },
): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const update: Record<string, unknown> = {};
    if (patch.title !== undefined) {
      const t = patch.title.trim();
      if (!t) return { ok: false, message: "Title can't be empty." };
      update.title = t;
    }
    if (patch.content !== undefined)
      update.content = patch.content?.trim() || null;
    if (patch.area !== undefined) update.area = patch.area?.trim() || null;

    const { error } = await supabase
      .from("notes")
      .update(update)
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't update. Try again." };
    revalidatePath("/house");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't update. Try again." };
  }
}

export async function deleteNote(id: string): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const { error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't delete. Try again." };
    revalidatePath("/house");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't delete. Try again." };
  }
}
