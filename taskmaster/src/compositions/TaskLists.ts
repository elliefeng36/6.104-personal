import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { each, form, former, now } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { hasOnly, sessionOnlyInput, validator } from "./validators.ts";

const { Sessioning, TaskListing, TaskSetting } = concepts;
const taskInput = validator(value => hasOnly(value, ["session", "task"]) &&
  (typeof value.session === "string" || value.session === null) &&
  typeof value.task === "string" && value.task.length > 0 && value.task.length <= 200,
"A task identity and session cookie are required.");
const taskOutput = validator(value => hasOnly(value, ["task"]) && typeof value.task === "string", "A task identity is required.");

const List = former("the task list of (owner)", ({ owner }, { task, details, completedTask, completedDetails }) =>
  form({
    activeTasks: each(TaskListing._active({ owner }).is({ task }))
      .where(TaskSetting._get({ owner, task }).is({ details })).form({ details }),
    completedTasks: each(TaskListing._completed({ owner }).is({ task: completedTask }))
      .where(TaskSetting._get({ owner, task: completedTask }).is({ details: completedDetails })).form({ details: completedDetails }),
  }),
);
const View = endpoint("/tasklists/view", ({ session, instant, owner }) =>
  receive({ session })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: owner }))
    .then(TaskListing.initialize({ owner }))
    .then(respond({ list: List({ owner }) })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput } },
);
const Delete = endpoint("/tasklists/delete", ({ session, instant, owner, task }) =>
  receive({ session, task })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: owner }))
    .then(TaskListing.deleteTask({ owner, task }).responds({ task }))
    .then(respond({ task })),
  { input: { required: ["session", "task"] }, validators: { input: taskInput, output: taskOutput } },
);
const Complete = endpoint("/tasklists/complete", ({ session, instant, owner, task }) =>
  receive({ session, task })
    .where(now(instant))
    .then(Sessioning.current({ session, instant }).responds({ subject: owner }))
    .then(TaskListing.completeTask({ owner, task }).responds({ task }))
    .then(respond({ task })),
  { input: { required: ["session", "task"] }, validators: { input: taskInput, output: taskOutput } },
);
export const composition = { View, List, Delete, Complete };
