import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";
import { former, where } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";
import { dummyTasks } from "../dummy-tasks.ts";
import { hasOnly, record, sessionOnlyInput, validator } from "./validators.ts";

const { Sessioning, TaskListing } = concepts;
const taskInput = validator(value =>
  hasOnly(value, ["session", "task"]) &&
  (typeof value.session === "string" || value.session === null) &&
  typeof value.task === "string" && value.task.length > 0 && value.task.length <= 200,
"A task identity and session cookie are required.");
const sampleInput = validator(value =>
  hasOnly(value, ["session", "task"]) &&
  (typeof value.session === "string" || value.session === null) &&
  typeof value.task === "string" && dummyTasks.some(task => task === value.task),
"Choose one of the sample tasks.");
const taskOutput = validator(value => hasOnly(value, ["task"]) && typeof value.task === "string", "A task identity is required.");
const listOutput = validator(value => {
  if (!hasOnly(value, ["list"]) || !record(value.list) || !hasOnly(value.list, ["taskList"])) return false;
  const list = value.list.taskList;
  return record(list) && hasOnly(list, ["owner", "activeTasks", "completedTasks"]) &&
    typeof list.owner === "string" &&
    Array.isArray(list.activeTasks) && list.activeTasks.every(task => typeof task === "string") &&
    Array.isArray(list.completedTasks) && list.completedTasks.every(task => typeof task === "string");
}, "A task list with active and completed tasks is required.");

const List = former("the task list of (owner)", ({ owner }, { taskList }) =>
  where(TaskListing._viewTasks({ owner }).is({ taskList })).form({ taskList }),
);

const View = endpoint("/tasklists/view", ({ session, owner }) =>
  receive({ session })
    .then(Sessioning.current({ session }).responds({ subject: owner }))
    .then(TaskListing.initialize({ owner }))
    .then(respond({ list: List({ owner }) })),
  { input: { required: ["session"] }, validators: { input: sessionOnlyInput, output: listOutput } },
);
const Add = endpoint("/tasklists/add", ({ session, owner, task }) =>
  receive({ session, task })
    .then(Sessioning.current({ session }).responds({ subject: owner }))
    .then(TaskListing.initialize({ owner }))
    .then(TaskListing.addTask({ owner, task }).responds({ task }))
    .then(respond({ task })),
  { input: { required: ["session", "task"] }, validators: { input: sampleInput, output: taskOutput } },
);
const Delete = endpoint("/tasklists/delete", ({ session, owner, task }) =>
  receive({ session, task })
    .then(Sessioning.current({ session }).responds({ subject: owner }))
    .then(TaskListing.deleteTask({ owner, task }).responds({ task }))
    .then(respond({ task })),
  { input: { required: ["session", "task"] }, validators: { input: taskInput, output: taskOutput } },
);
const Complete = endpoint("/tasklists/complete", ({ session, owner, task }) =>
  receive({ session, task })
    .then(Sessioning.current({ session }).responds({ subject: owner }))
    .then(TaskListing.completeTask({ owner, task }).responds({ task }))
    .then(respond({ task })),
  { input: { required: ["session", "task"] }, validators: { input: taskInput, output: taskOutput } },
);
export const composition = { View, List, Add, Delete, Complete };
