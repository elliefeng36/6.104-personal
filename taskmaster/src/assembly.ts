import { assemble, type ImplementationOverrides } from "@mit-sdg/sync-engine/assembly";
import { applicationConceptSet } from "./concepts.ts";
import { composition as sessions } from "./compositions/Sessions.ts";
import { composition as taskLists } from "./compositions/TaskLists.ts";

export function assembleApplication(instances: ImplementationOverrides<typeof applicationConceptSet> = {}) {
  return assemble({
    conceptSet: applicationConceptSet,
    instances: { ...applicationConceptSet.implementations(), ...instances },
    composition: { Sessions: sessions, TaskLists: taskLists },
  });
}
