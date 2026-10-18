// Builds active-task candidates and requests a suggestion.
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, now, where } from "@mit-sdg/sync-engine/language";
import { concepts, computations } from "../concepts.ts";
import { hasOnly, record, validator } from "./validators.ts";

const { Sessioning, TaskListing, TaskSetting, TaskSuggesting } = concepts;
const input = validator(value => hasOnly(value, ["session", "timeLimit"]) &&
  (typeof value.session === "string" || value.session === null) &&
  (value.timeLimit === null || typeof value.timeLimit === "number"),
"Time limit must be a number of minutes, or blank for no limit.");
const output = validator(value => {
  if (!hasOnly(value, ["suggestion"]) || !record(value.suggestion) || !hasOnly(value.suggestion, ["task", "outcome"])) return false;
  const result = value.suggestion;
  return result.outcome === "SUGGESTED" ? typeof result.task === "string" :
    result.task === null && (result.outcome === "EMPTY_TASKLIST" || result.outcome === "NO_VIABLE_TASKS");
}, "A suggestion or an explicit empty outcome is required.");

const MakeRequest = endpoint("/taskSuggestions/makeRequest", ({ session, instant, user, timeLimit, request, suggestion, taskList, records, pool }) =>
  receive({ session, timeLimit })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: user }))
    .then(TaskSuggesting.makeRequest({ user, timeLimit }).responds({ request }))
    .then(where(
      TaskListing._viewTasks({ owner: user }).is({ taskList }),
      TaskSetting._forOwner({ owner: user }).is({ records }),
      compute(computations.suggestionCandidates, { taskList, records }, pool),
    )
    .then(TaskSuggesting.makeSuggestion({ request, pool }).responds({ suggestion }))
    .then(respond({ suggestion }))),
  { input: { required: ["session"], defaults: { timeLimit: null } }, validators: { input, output } },
);
export const composition = { MakeRequest };
