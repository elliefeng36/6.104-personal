// Binds the reusable concept's external Task type for this application.
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import { TaskFilteringConcept } from "./TaskFiltering.ts";
import type { Task } from "./TaskSetting.ts";
import spec from "@design/concepts/TaskFiltering.md" with { type: "text" };
const TaskFiltering: new () => TaskFilteringConcept<Task> = TaskFilteringConcept;
export const taskFiltering = registerConcept({ class: TaskFiltering, spec });
