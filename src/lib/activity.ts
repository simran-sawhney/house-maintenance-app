import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ActivityType } from "@/types/db";

/**
 * Append an activity event. Best-effort: a logging failure must never break
 * the underlying mutation, so errors are swallowed.
 */
export async function logActivity(
  supabase: SupabaseClient,
  input: {
    householdId: string;
    actorId: string | null;
    eventType: ActivityType;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  try {
    await supabase.from("activity_events").insert({
      household_id: input.householdId,
      actor_id: input.actorId,
      event_type: input.eventType,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
    });
  } catch {
    // ignore — activity feed is non-critical
  }
}
