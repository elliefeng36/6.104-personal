// Registers concepts and pure computations for the application.
import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { authenticating } from "./concepts/Authenticating.registry.ts";
import { sessioning } from "./concepts/Sessioning.registry.ts";
import { taskListing } from "./concepts/TaskListing.registry.ts";
import { taskSetting } from "./concepts/TaskSetting.registry.ts";
import { taskSuggesting } from "./concepts/TaskSuggesting.registry.ts";
import { suggestionCandidates } from "./compositions/suggestion-candidates.ts";

import { taskSorting } from "./concepts/TaskSorting.registry.ts";
import { taskFiltering } from "./concepts/TaskFiltering.registry.ts";
import { taskSnapshot, taskComparator, taskFilter } from "./compositions/task-transforms.ts";

export const applicationConceptSet = conceptSet({ Authenticating: authenticating, Sessioning: sessioning, TaskListing: taskListing, TaskSetting: taskSetting, TaskSuggesting: taskSuggesting, TaskSorting: taskSorting, TaskFiltering: taskFiltering }, { suggestionCandidates, taskSnapshot, taskComparator, taskFilter });
export const { concepts, computations } = applicationConceptSet;
