// Binds the reusable concept's external Task type for this application.
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import { TaskSortingConcept } from "./TaskSorting.ts";
import type { Task } from "./TaskSetting.ts";
import spec from "@design/concepts/TaskSorting.md" with { type: "text" };
const TaskSorting: new () => TaskSortingConcept<Task> = TaskSortingConcept;
export const taskSorting = registerConcept({ class: TaskSorting, spec });
