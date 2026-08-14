import type { Metadata } from "next";
import Link from "next/link";
import { History } from "lucide-react";
import { requireHousehold } from "@/lib/auth/household";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/layout/page-header";
import { TasksBoard } from "@/components/tasks/tasks-board";
import { getOpenTaskViews } from "@/lib/data/tasks-view";
import { todayStr } from "@/lib/dates";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage() {
  const { household, user } = await requireHousehold();
  const supabase = await createClient();

  const views = await getOpenTaskViews(supabase, household.id, household.timezone);
  const urgentCount = views.filter((v) => v.task.urgent || v.overdue).length;

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={
          views.length > 0
            ? `${views.length} open${urgentCount ? ` · ${urgentCount} urgent` : ""}`
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
        <TasksBoard
          initialViews={views}
          today={todayStr(household.timezone)}
          currentUserId={user.id}
          timezone={household.timezone}
        />
      </div>
    </div>
  );
}
