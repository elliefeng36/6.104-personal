import { assemble, type ImplementationOverrides } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "./concepts.ts";
import { composition as sessions } from "./compositions/Sessions.ts";
import { composition as taskLists } from "./compositions/TaskLists.ts";
import { composition as tasks } from "./compositions/Tasks.ts";
import { composition as taskSuggestions } from "./compositions/TaskSuggestions.ts";

export function assembleApplication(
  instances: ImplementationOverrides<typeof applicationConceptSet> = {},
  options: { clock?: () => Date } = {},
) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: { ...applicationConceptSet.implementations(), ...instances },
    composition: { Sessions: sessions, TaskLists: taskLists, Tasks: tasks, TaskSuggestions: taskSuggestions },
    ...options,
  });
}
