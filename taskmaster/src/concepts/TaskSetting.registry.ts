// Connects TaskSetting to its specification and refusal codes.
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import { TaskSettingConcept, EmptyName, InvalidDeadline, InvalidDuration, InvalidRecurringPeriod, TaskNotFound } from "./TaskSetting.ts";
import spec from "@design/concepts/TaskSetting.md" with { type: "text" };

export const taskSetting = registerConcept({ class: TaskSettingConcept, spec, refusals: {
  EMPTY_NAME: EmptyName, INVALID_DEADLINE: InvalidDeadline, INVALID_DURATION: InvalidDuration,
  INVALID_RECURRING_PERIOD: InvalidRecurringPeriod, NO_SUCH_TASK: TaskNotFound,
} });
