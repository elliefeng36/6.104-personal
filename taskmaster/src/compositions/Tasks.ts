// Creates listed tasks and applies owner-checked edits.
import { no, now, where } from "@mit-sdg/sync-engine/language";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { concepts } from "../concepts.ts";
import { hasOnly, record, validator } from "./validators.ts";

const { Sessioning, TaskSetting, TaskListing } = concepts;
const cookie = (value: Record<string, unknown>) => typeof value.session === "string" || value.session === null;
const optionalFields = ["deadline", "duration", "recurringPeriod", "recurringUnit"];
const makeInput = validator(value => cookie(value) && typeof value.name === "string" && value.name.length <= 200 &&
  Object.keys(value).every(key => ["session", "name", ...optionalFields].includes(key)) &&
  (value.deadline === undefined || value.deadline === null || typeof value.deadline === "string") &&
  (value.duration === undefined || value.duration === null || typeof value.duration === "number") &&
  (value.recurringPeriod === undefined || value.recurringPeriod === null || typeof value.recurringPeriod === "number") &&
  (value.recurringUnit === undefined || value.recurringUnit === null || typeof value.recurringUnit === "string"), "Provide a name and valid optional task fields.");
const editInput = validator(value => {
  if (!hasOnly(value, ["session", "task", "changes"]) || !cookie(value) || typeof value.task !== "string" || !value.task || !record(value.changes)) return false;
  const changes = value.changes;
  return Object.keys(changes).length > 0 && Object.keys(changes).every(key => ["name", ...optionalFields].includes(key)) &&
    (changes.name === undefined || typeof changes.name === "string") &&
    (changes.deadline === undefined || changes.deadline === null || typeof changes.deadline === "string") &&
    (changes.duration === undefined || changes.duration === null || typeof changes.duration === "number") &&
    (changes.recurringPeriod === undefined || changes.recurringPeriod === null || typeof changes.recurringPeriod === "number") &&
    (changes.recurringUnit === undefined || changes.recurringUnit === null || typeof changes.recurringUnit === "string");
}, "Provide a task identity and supported field changes; null clears optional fields.");
const output = validator(value => hasOnly(value, ["task"]) && typeof value.task === "string", "A task identity is required.");

const Make = endpoint("/tasks/make", ({ session, instant, owner, name, deadline, duration, recurringPeriod, recurringUnit, task }) =>
  receive({ session, name, deadline, duration, recurringPeriod, recurringUnit })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: owner }))
    .then(TaskListing.initialize({ owner }))
    .then(TaskSetting.makeTask({ owner, name, deadline, duration, recurringPeriod, recurringUnit, instant }).responds({ task }))
    .then(TaskListing.addTask({ owner, task }))
    .then(respond({ task })),
  { input: { required: ["session", "name"], defaults: { deadline: null, duration: null, recurringPeriod: null, recurringUnit: null } }, validators: { input: makeInput, output } },
);
const Update = endpoint("/tasks/update", ({ session, instant, owner, task, changes }) =>
  receive({ session, task, changes })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: owner }))
    .then(
      where(TaskListing._active({ owner }).is({ task }))
        .then(TaskSetting.updateTask({ owner, task, changes, instant }).responds({ task }))
        .then(respond({ task })).named("active"),
      where(no(TaskListing._active({ owner }).is({ task })))
        .then(respond({ error: "NO_SUCH_TASK" })).named("inactive"),
    ),
  { input: { required: ["session", "task", "changes"] }, validators: { input: editInput } },
);
export const composition = { Make, Update };
