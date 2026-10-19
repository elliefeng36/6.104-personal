// Resolves owner-scoped task snapshots before applying reusable transformations.
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, now, where } from "@mit-sdg/sync-engine/language";
import { concepts, computations } from "../concepts.ts";
import { hasOnly, validator } from "./validators.ts";
const { Sessioning, TaskListing, TaskSetting, TaskSorting, TaskFiltering } = concepts;
const input = validator(value => hasOnly(value, ["session", "sortBy", "status", "recurring", "maxDuration"]) &&
  (typeof value.session === "string" || value.session === null) &&
  ["active", "completed"].includes(value.status as string) &&
  ["none", "deadline", "duration"].includes(value.sortBy as string) &&
  ["all", "recurring", "nonrecurring"].includes(value.recurring as string) &&
  (value.maxDuration === null || typeof value.maxDuration === "number" && Number.isFinite(value.maxDuration) && value.maxDuration >= 0), "Choose valid task sorting and filtering options.");
const View = endpoint("/taskFiltering/view", ({ session, instant, owner, sortBy, status, taskList, records, tasks, comparator, result, recurring, maxDuration, filter, filtered }) =>
  receive({ session, sortBy, status, recurring, maxDuration })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: owner }))
    .then(where(
      TaskListing._viewTasks({ owner }).is({ taskList }),
      TaskSetting._forOwner({ owner }).is({ records }),
      compute(computations.taskSnapshot, { taskList, records, status }, tasks),
      compute(computations.taskFilter, { recurring, maxDuration }, filter),
    )
    .then(TaskFiltering.filter({ tasks, filter }).responds({ tasks: filtered })))
    .then(where(compute(computations.taskComparator, { sortBy }, comparator))
      .then(TaskSorting.sort({ tasks: filtered, comparator }).responds({ tasks: result }))
      .then(respond({ tasks: result }))),
  { input: { required: ["session"], defaults: { sortBy: "none", status: "active", recurring: "all", maxDuration: null } }, validators: { input } },
);
export const composition = { View };
