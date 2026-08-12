/**
 * Hand-written row types mirroring supabase/migrations. Kept in sync manually —
 * the schema is small and stable, so we avoid a generated-types build step.
 */

export type Role = "admin" | "member";
export type ShoppingStatus = "active" | "purchased" | "cancelled";
export type TaskStatus = "open" | "completed" | "cancelled";
export type MaintenanceStatus = "good" | "watch" | "needs_attention";

export type ActivityType =
  | "shopping_added"
  | "shopping_purchased"
  | "shopping_undo"
  | "task_added"
  | "task_completed"
  | "maintenance_updated"
  | "note_added";

/** Simple recurrence representation (build spec §31 — no raw RRULE in UI). */
export type RecurrenceRule = {
  freq: "daily" | "weekly" | "monthly";
  interval: number; // every N units
  weekday?: number | null; // 0=Sun..6=Sat, for "every Saturday" style
};

export interface Household {
  id: string;
  name: string;
  currency_code: string;
  timezone: string;
  created_at: string;
}

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: Role;
  created_at: string;
}

export interface Store {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  household_id: string;
  name: string;
  normalized_name: string;
  default_store_id: string | null;
  default_quantity: number | null;
  default_unit: string | null;
  category: string | null;
  last_purchased_at: string | null;
  purchase_count: number;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  household_id: string;
  product_id: string | null;
  name: string;
  normalized_name: string;
  store_id: string | null;
  quantity: number | null;
  unit: string | null;
  notes: string | null;
  urgent: boolean;
  status: ShoppingStatus;
  added_by: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
}

export interface Purchase {
  id: string;
  household_id: string;
  shopping_item_id: string | null;
  product_id: string | null;
  name: string;
  store_id: string | null;
  quantity: number | null;
  unit: string | null;
  price: number | null;
  purchased_by: string | null;
  purchased_at: string;
  notes: string | null;
}

export interface TaskCategory {
  id: string;
  household_id: string;
  name: string;
  icon: string | null;
  sort_order: number;
}

export interface Task {
  id: string;
  household_id: string;
  title: string;
  category_id: string | null;
  notes: string | null;
  urgent: boolean;
  assigned_to: string | null;
  status: TaskStatus;
  due_date: string | null;
  recurrence_rule: RecurrenceRule | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
  parent_task_id: string | null;
}

export interface MaintenanceItem {
  id: string;
  household_id: string;
  title: string;
  area: string;
  description: string | null;
  status: MaintenanceStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceLog {
  id: string;
  household_id: string;
  maintenance_item_id: string;
  note: string;
  cost: number | null;
  occurred_at: string;
  created_by: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  household_id: string;
  title: string;
  content: string | null;
  area: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  household_id: string;
  actor_id: string | null;
  event_type: ActivityType;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/** Areas for home maintenance (build spec §34). */
export const HOUSE_AREAS = [
  "Kitchen",
  "Bathroom",
  "Living",
  "Bedrooms",
  "Garage",
  "Garden",
  "Outside",
  "Car",
  "Other",
] as const;
export type HouseArea = (typeof HOUSE_AREAS)[number];

export const MAINTENANCE_STATUS_LABEL: Record<MaintenanceStatus, string> = {
  good: "Good",
  watch: "Watch",
  needs_attention: "Needs attention",
};
