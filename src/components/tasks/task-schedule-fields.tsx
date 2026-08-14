"use client";

import * as React from "react";
import { Input, Label, Chip } from "@/components/ui/primitives";
import {
  RECURRENCE_PRESETS,
  presetKeyForRule,
  ruleForPreset,
  WEEKDAYS_SHORT,
  type PresetKey,
} from "@/lib/recurrence/recurrence";
import { weekdayOf } from "@/lib/recurrence/occurrences";
import {
  todayLocalStr,
  tomorrowLocalStr,
  upcomingWeekendStr,
} from "@/lib/client-dates";
import type { RecurrenceRule } from "@/types/db";
import { cn } from "@/lib/utils";

export type ScheduleValue = {
  dueDate: string | null;
  recurrence: RecurrenceRule | null;
  recurrenceEndDate: string | null;
};

/**
 * Due date + recurrence controls (spec §3, §4). Kept fast: defaults to no date
 * / no recurrence, advanced controls progressively reveal.
 */
export function TaskScheduleFields({
  value,
  onChange,
  showEndDate = false,
}: {
  value: ScheduleValue;
  onChange: (v: ScheduleValue) => void;
  showEndDate?: boolean;
}) {
  const today = todayLocalStr();
  const tomorrow = tomorrowLocalStr();
  const weekend = upcomingWeekendStr();

  const [pickDate, setPickDate] = React.useState(
    !!value.dueDate &&
      value.dueDate !== today &&
      value.dueDate !== tomorrow &&
      value.dueDate !== weekend,
  );

  const presetKey = presetKeyForRule(value.recurrence);
  const isWeeklyish =
    value.recurrence?.frequency === "weekly" || presetKey === "custom";

  const set = (patch: Partial<ScheduleValue>) =>
    onChange({ ...value, ...patch });

  // Selected weekdays (default to the due/anchor weekday when none chosen).
  const anchor = value.dueDate ?? today;
  const selectedDays =
    value.recurrence?.days_of_week && value.recurrence.days_of_week.length > 0
      ? value.recurrence.days_of_week
      : [weekdayOf(anchor)];

  function choosePreset(key: PresetKey) {
    if (key === "custom") {
      // Seed a custom rule from the current one or a sensible default.
      const base: RecurrenceRule =
        value.recurrence ?? { frequency: "weekly", interval: 1 };
      set({ recurrence: base });
      return;
    }
    const days = key === "weekly" || key === "fortnightly" ? selectedDays : undefined;
    set({ recurrence: ruleForPreset(key, days) });
  }

  function toggleDay(day: number) {
    if (!value.recurrence) return;
    const current = selectedDays;
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day];
    const days = next.length > 0 ? next.sort((a, b) => a - b) : [weekdayOf(anchor)];
    set({
      recurrence: { ...value.recurrence, frequency: "weekly", days_of_week: days },
    });
  }

  const customUnit: "daily" | "weekly" | "monthly" =
    value.recurrence?.frequency ?? "weekly";

  return (
    <div className="space-y-4">
      {/* Due date */}
      <div>
        <Label>When</Label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          <Chip
            active={!value.dueDate}
            onClick={() => {
              setPickDate(false);
              set({ dueDate: null });
            }}
          >
            No date
          </Chip>
          <Chip
            active={value.dueDate === today}
            onClick={() => {
              setPickDate(false);
              set({ dueDate: today });
            }}
          >
            Today
          </Chip>
          <Chip
            active={value.dueDate === tomorrow}
            onClick={() => {
              setPickDate(false);
              set({ dueDate: tomorrow });
            }}
          >
            Tomorrow
          </Chip>
          <Chip
            active={value.dueDate === weekend}
            onClick={() => {
              setPickDate(false);
              set({ dueDate: weekend });
            }}
          >
            This weekend
          </Chip>
          <Chip active={pickDate} onClick={() => setPickDate(true)}>
            Pick date
          </Chip>
        </div>
        {pickDate && (
          <Input
            type="date"
            className="mt-2"
            value={value.dueDate ?? ""}
            onChange={(e) => set({ dueDate: e.target.value || null })}
          />
        )}
      </div>

      {/* Recurrence */}
      <div>
        <Label>Repeat</Label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {RECURRENCE_PRESETS.map((p) => (
            <Chip
              key={p.key}
              active={presetKey === p.key}
              onClick={() => choosePreset(p.key)}
            >
              {p.label}
            </Chip>
          ))}
        </div>
      </div>

      {/* Custom interval controls */}
      {presetKey === "custom" && value.recurrence && (
        <div className="flex items-end gap-2">
          <div className="w-20">
            <Label>Every</Label>
            <Input
              type="number"
              min={1}
              value={value.recurrence.interval}
              onChange={(e) =>
                set({
                  recurrence: {
                    ...value.recurrence!,
                    interval: Math.max(1, Number(e.target.value) || 1),
                  },
                })
              }
            />
          </div>
          <div className="flex gap-1.5 pb-0.5">
            {(["daily", "weekly", "monthly"] as const).map((u) => (
              <Chip
                key={u}
                active={customUnit === u}
                onClick={() =>
                  set({
                    recurrence: { ...value.recurrence!, frequency: u },
                  })
                }
              >
                {u === "daily" ? "days" : u === "weekly" ? "weeks" : "months"}
              </Chip>
            ))}
          </div>
        </div>
      )}

      {/* Weekday selector for weekly recurrence */}
      {value.recurrence && isWeeklyish && customUnit === "weekly" && (
        <div>
          <Label>On</Label>
          <div className="flex gap-1.5">
            {WEEKDAYS_SHORT.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "h-9 w-9 rounded-full text-xs font-medium border transition",
                  selectedDays.includes(day)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-surface text-muted border-border",
                )}
                aria-pressed={selectedDays.includes(day)}
                aria-label={label}
              >
                {label[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Optional end date (advanced) */}
      {showEndDate && value.recurrence && (
        <div>
          <Label>Ends (optional)</Label>
          <Input
            type="date"
            value={value.recurrenceEndDate ?? ""}
            onChange={(e) =>
              set({ recurrenceEndDate: e.target.value || null })
            }
          />
        </div>
      )}
    </div>
  );
}
