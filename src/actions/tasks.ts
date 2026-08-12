"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import { logActivity } from "@/lib/activity";
import { nextOccurrence } from "@/lib/recurrence/recurrence";
import type { RecurrenceRule, Task } from "@/types/db";

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

export type CreateTaskInput = {
  title: string;
  categoryId?: string | null;
  notes?: string | null;
  urgent?: boolean;
  dueDate?: string | null; // ISO or null
  assignedTo?: string | null;
  recurrence?: RecurrenceRule | null;
};

export type CreateTaskResult =
  | { ok: true; task: Task }
  | { ok: false; message: string };

export async function createTask(
  input: CreateTaskInput,
): Promise<CreateTaskResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();

    const title = input.title.trim();
    if (!title) return { ok: false, message: "Please enter a task title." };

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        household_id: household.id,
        title,
        category_id: input.categoryId ?? null,
        notes: input.notes?.trim() || null,
        urgent: input.urgent ?? false,
        due_date: input.dueDate ?? null,
        assigned_to: input.assignedTo ?? null,
        recurrence_rule: input.recurrence ?? null,
        created_by: user.id,
      })
      .select("*")
      .single();
    if (error) return { ok: false, message: "Couldn't save this task. Try again." };

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "task_added",
      entityType: "task",
      entityId: data.id,
      metadata: { title },
    });

    revalidateTasks();
    return { ok: true, task: data as Task };
  } catch {
    return { ok: false, message: "Couldn't save this task. Try again." };
  }
}

export type SimpleResult = { ok: boolean; message?: string };

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    categoryId?: string | null;
    notes?: string | null;
    urgent?: boolean;
    dueDate?: string | null;
    assignedTo?: string | null;
    recurrence?: RecurrenceRule | null;
  },
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
    if (patch.categoryId !== undefined) update.category_id = patch.categoryId;
    if (patch.notes !== undefined) update.notes = patch.notes?.trim() || null;
    if (patch.urgent !== undefined) update.urgent = patch.urgent;
    if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
    if (patch.assignedTo !== undefined) update.assigned_to = patch.assignedTo;
    if (patch.recurrence !== undefined)
      update.recurrence_rule = patch.recurrence;

    const { error } = await supabase
      .from("tasks")
      .update(update)
      .eq("id", id)
      .eq("household_id", household.id);
    if (error) return { ok: false, message: "Couldn't update. Try again." };
    revalidateTasks();
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't update. Try again." };
  }
}

/**
 * Complete a task (build spec §30, §31). Records completion and, for recurring
 * tasks, spawns the next occurrence — avoiding duplicate future occurrences.
 */
export async function completeTask(id: string): Promise<SimpleResult> {
  try {
    const { household, user } = await requireHousehold();
    const supabase = await createClient();

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!task) return { ok: false, message: "Task not found." };
    const t = task as Task;
    if (t.status === "completed") return { ok: true };

    const now = new Date();
    await supabase
      .from("tasks")
      .update({
        status: "completed",
        completed_at: now.toISOString(),
        completed_by: user.id,
      })
      .eq("id", id)
      .eq("household_id", household.id);

    // Spawn next occurrence for recurring tasks (only if none exists yet).
    if (t.recurrence_rule) {
      const base = t.due_date ? new Date(t.due_date) : now;
      const next = nextOccurrence(t.recurrence_rule, base);
      const { data: existingNext } = await supabase
        .from("tasks")
        .select("id")
        .eq("household_id", household.id)
        .eq("parent_task_id", t.parent_task_id ?? t.id)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();
      if (!existingNext) {
        await supabase.from("tasks").insert({
          household_id: household.id,
          title: t.title,
          category_id: t.category_id,
          notes: t.notes,
          urgent: t.urgent,
          assigned_to: t.assigned_to,
          due_date: next.toISOString(),
          recurrence_rule: t.recurrence_rule,
          created_by: user.id,
          parent_task_id: t.parent_task_id ?? t.id,
        });
      }
    }

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "task_completed",
      entityType: "task",
      entityId: id,
      metadata: { title: t.title },
    });

    revalidateTasks();
    revalidatePath("/history");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't complete. Try again." };
  }
}

/** Undo completion (build spec §30). Also removes the spawned next occurrence. */
export async function undoTaskCompletion(id: string): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", id)
      .eq("household_id", household.id)
      .maybeSingle();
    if (!task) return { ok: false, message: "Task not found." };
    const t = task as Task;

    // Remove the freshly-spawned open occurrence, if any.
    if (t.recurrence_rule) {
      await supabase
        .from("tasks")
        .delete()
        .eq("household_id", household.id)
        .eq("parent_task_id", t.parent_task_id ?? t.id)
        .eq("status", "open");
    }

    await supabase
      .from("tasks")
      .update({ status: "open", completed_at: null, completed_by: null })
      .eq("id", id)
      .eq("household_id", household.id);

    revalidateTasks();
    revalidatePath("/history");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't undo. Try again." };
  }
}

/** Soft-cancel a task (build spec §84). */
export async function cancelTask(id: string): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();
    const { error } = await supabase
      .from("tasks")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("household_id", household.id)
      .eq("status", "open");
    if (error) return { ok: false, message: "Couldn't remove. Try again." };
    revalidateTasks();
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't remove. Try again." };
  }
}
