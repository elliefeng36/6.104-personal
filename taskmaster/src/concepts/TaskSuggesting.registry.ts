import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import { TaskSuggestingConcept, InvalidTimeLimit, UnknownSuggestRequest } from "./TaskSuggesting.ts";
import spec from "@design/concepts/TaskSuggesting.md" with { type: "text" };

export const taskSuggesting = registerConcept({ class: TaskSuggestingConcept, spec, refusals: {
  INVALID_TIME_LIMIT: InvalidTimeLimit, UNKNOWN_SUGGEST_REQUEST: UnknownSuggestRequest,
} });
