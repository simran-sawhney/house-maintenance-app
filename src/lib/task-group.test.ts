import { describe, it, expect } from "vitest";
import { groupTasks } from "@/lib/task-group";
import type { Task } from "@/types/db";

const task = (over: Partial<Task>): Task => ({
  id: Math.random().toString(36),
  household_id: "h",
  title: "t",
  category_id: null,
  notes: null,
  urgent: false,
  assigned_to: null,
  status: "open",
  due_date: null,
  all_day: true,
  recurrence_rule: null,
  recurrence_end_date: null,
  created_by: null,
  created_at: "2026-08-01T00:00:00Z",
  completed_at: null,
  completed_by: null,
  parent_task_id: null,
  ...over,
});

describe("groupTasks", () => {
  it("separates urgent, upcoming (has due) and other", () => {
    const tasks = [
      task({ title: "Fix tap", urgent: true }),
      task({ title: "Car service", due_date: "2026-08-20T00:00:00Z" }),
      task({ title: "Tidy garage" }),
    ];
    const g = groupTasks(tasks);
    expect(g.urgent.map((t) => t.title)).toEqual(["Fix tap"]);
    expect(g.upcoming.map((t) => t.title)).toEqual(["Car service"]);
    expect(g.other.map((t) => t.title)).toEqual(["Tidy garage"]);
  });

  it("urgent wins even when a due date is present", () => {
    const tasks = [
      task({ title: "Urgent+due", urgent: true, due_date: "2026-08-15T00:00:00Z" }),
    ];
    const g = groupTasks(tasks);
    expect(g.urgent).toHaveLength(1);
    expect(g.upcoming).toHaveLength(0);
  });

  it("sorts upcoming by soonest due date", () => {
    const tasks = [
      task({ title: "Later", due_date: "2026-09-01T00:00:00Z" }),
      task({ title: "Sooner", due_date: "2026-08-15T00:00:00Z" }),
    ];
    const g = groupTasks(tasks);
    expect(g.upcoming.map((t) => t.title)).toEqual(["Sooner", "Later"]);
  });

  it("excludes completed and cancelled tasks", () => {
    const tasks = [
      task({ title: "Done", status: "completed" }),
      task({ title: "Gone", status: "cancelled" }),
    ];
    const g = groupTasks(tasks);
    expect(g.urgent.length + g.upcoming.length + g.other.length).toBe(0);
  });
});
