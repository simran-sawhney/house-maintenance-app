import { Badge } from "@/components/ui/primitives";
import { MAINTENANCE_STATUS_LABEL, type MaintenanceStatus } from "@/types/db";

const tone: Record<MaintenanceStatus, "success" | "accent" | "urgent"> = {
  good: "success",
  watch: "accent",
  needs_attention: "urgent",
};

export function StatusPill({ status }: { status: MaintenanceStatus }) {
  return <Badge tone={tone[status]}>{MAINTENANCE_STATUS_LABEL[status]}</Badge>;
}
