// Resolves owner-scoped task snapshots before applying reusable transformations.
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { compute, now, where } from "@mit-sdg/sync-engine/language";
import { concepts, computations } from "../concepts.ts";
import { hasOnly, validator } from "./validators.ts";
const { Sessioning, TaskListing, TaskSetting, TaskSorting } = concepts;
const input = validator(value => hasOnly(value, ["session", "sortBy", "status"]) &&
  (typeof value.session === "string" || value.session === null) &&
  ["active", "completed"].includes(value.status as string) &&
  ["none", "deadline", "duration"].includes(value.sortBy as string), "Choose valid task sorting and filtering options.");
const View = endpoint("/taskSorting/view", ({ session, instant, owner, sortBy, status, taskList, records, tasks, comparator, result }) =>
  receive({ session, sortBy, status })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: owner }))
    .then(where(
      TaskListing._viewTasks({ owner }).is({ taskList }),
      TaskSetting._forOwner({ owner }).is({ records }),
      compute(computations.taskSnapshot, { taskList, records, status }, tasks),
      compute(computations.taskComparator, { sortBy }, comparator),
    )
    .then(TaskSorting.sort({ tasks, comparator }).responds({ tasks: result }))
    .then(respond({ tasks: result }))),
  { input: { required: ["session"], defaults: { sortBy: "none", status: "active" } }, validators: { input } },
);
export const composition = { View };
