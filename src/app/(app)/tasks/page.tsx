import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { groupTasks } from "@/lib/task-group";
import type { Task } from "@/types/db";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const { household } = await requireHousehold();
  const supabase = await createClient();

  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("household_id", household.id)
    .eq("status", "open")
    .order("created_at", { ascending: true });

  const tasks = (data as Task[]) ?? [];
  const { urgent } = groupTasks(tasks);

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={
          tasks.length > 0
            ? `${tasks.length} open${urgent.length ? ` · ${urgent.length} urgent` : ""}`
            : "Shared household jobs"
        }
        right={
          <Link
            href="/history?tab=tasks"
            aria-label="Task history"
            className="h-10 w-10 rounded-full flex items-center justify-center text-muted hover:bg-surface-2"
          >
            <History className="h-5 w-5" />
          </Link>
        }
      />
      <div className="px-4">
        <TasksBoard initialTasks={tasks} timezone={household.timezone} />
      </div>
    </div>
  );
}
