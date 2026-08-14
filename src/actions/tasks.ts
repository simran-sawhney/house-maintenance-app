"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireHousehold } from "@/lib/auth/household";
import { logActivity } from "@/lib/activity";
import { normalizeRule } from "@/lib/recurrence/recurrence";
import { dateStrToDueISO, todayStr } from "@/lib/dates";
import type { RecurrenceRule, Task } from "@/types/db";

function revalidateTasks() {
  revalidatePath("/tasks");
  revalidatePath("/calendar");
  revalidatePath("/");
}

export type CreateTaskInput = {
  title: string;
  categoryId?: string | null;
  notes?: string | null;
  urgent?: boolean;
  dueDate?: string | null; // YYYY-MM-DD (all-day) or null
  assignedTo?: string | null;
  recurrence?: RecurrenceRule | null;
  recurrenceEndDate?: string | null; // YYYY-MM-DD or null
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

    const rule = normalizeRule(input.recurrence);
    // A recurring task needs an anchor date; default to today if unset.
    const anchorDate =
      input.dueDate ?? (rule ? todayStr(household.timezone) : null);

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        household_id: household.id,
        title,
        category_id: input.categoryId ?? null,
        notes: input.notes?.trim() || null,
        urgent: input.urgent ?? false,
        due_date: anchorDate ? dateStrToDueISO(anchorDate) : null,
        all_day: true,
        assigned_to: input.assignedTo ?? null,
        recurrence_rule: rule,
        recurrence_end_date: input.recurrenceEndDate ?? null,
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
    dueDate?: string | null; // YYYY-MM-DD or null
    assignedTo?: string | null;
    recurrence?: RecurrenceRule | null;
    recurrenceEndDate?: string | null;
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
    if (patch.dueDate !== undefined)
      update.due_date = patch.dueDate ? dateStrToDueISO(patch.dueDate) : null;
    if (patch.assignedTo !== undefined) update.assigned_to = patch.assignedTo;
    if (patch.recurrence !== undefined)
      update.recurrence_rule = normalizeRule(patch.recurrence);
    if (patch.recurrenceEndDate !== undefined)
      update.recurrence_end_date = patch.recurrenceEndDate;

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
 * Complete a task or a single recurring occurrence (spec §9, §30).
 *  - one-off task -> mark the task completed
 *  - recurring task -> write ONE task_occurrences row; the parent stays open so
 *    future occurrences remain scheduled.
 */
export async function completeTask(
  id: string,
  occurrenceDate?: string | null,
): Promise<SimpleResult> {
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

    const rule = normalizeRule(t.recurrence_rule);
    const now = new Date().toISOString();

    if (rule && occurrenceDate) {
      // Recurring: record just this occurrence.
      await supabase.from("task_occurrences").upsert(
        {
          household_id: household.id,
          task_id: id,
          occurrence_date: occurrenceDate,
          status: "completed",
          completed_at: now,
          completed_by: user.id,
        },
        { onConflict: "task_id,occurrence_date" },
      );
    } else {
      if (t.status === "completed") return { ok: true };
      await supabase
        .from("tasks")
        .update({ status: "completed", completed_at: now, completed_by: user.id })
        .eq("id", id)
        .eq("household_id", household.id);
    }

    await logActivity(supabase, {
      householdId: household.id,
      actorId: user.id,
      eventType: "task_completed",
      entityType: "task",
      entityId: id,
      metadata: { title: t.title, occurrence: occurrenceDate ?? null },
    });

    revalidateTasks();
    revalidatePath("/history");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't complete. Try again." };
  }
}

/** Undo completion of a task or a recurring occurrence. */
export async function undoTaskCompletion(
  id: string,
  occurrenceDate?: string | null,
): Promise<SimpleResult> {
  try {
    const { household } = await requireHousehold();
    const supabase = await createClient();

    if (occurrenceDate) {
      await supabase
        .from("task_occurrences")
        .delete()
        .eq("household_id", household.id)
        .eq("task_id", id)
        .eq("occurrence_date", occurrenceDate);
    } else {
      await supabase
        .from("tasks")
        .update({ status: "open", completed_at: null, completed_by: null })
        .eq("id", id)
        .eq("household_id", household.id);
    }

    revalidateTasks();
    revalidatePath("/history");
    return { ok: true };
  } catch {
    return { ok: false, message: "Couldn't undo. Try again." };
  }
}

/** Soft-cancel a task. For recurring, this ends the whole series. */
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
