// Tests task fields, validation, editing, and API behavior.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { TaskSettingConcept, EmptyName, InvalidDeadline, InvalidDuration, InvalidRecurringPeriod, TaskNotFound, type Task, type TaskChanges } from "../src/concepts/TaskSetting.ts";
import { applicationStorage } from "../src/storage.ts";
import { assembleApplication } from "../src/assembly.ts";
import { authenticationPolicy } from "../src/edge.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";

const url = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (!url) throw new Error("Set TEST_MONGODB_URL or MONGODB_URL to run MongoDB tests.");
const mongo = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
const database = mongo.db(`taskmaster_setting_test_${crypto.randomUUID().replaceAll("-", "")}`);
let setting: TaskSettingConcept;
let storage: Awaited<ReturnType<typeof applicationStorage>>;
let now = new Date("2030-01-01T00:00:00.000Z");
const owner = "alice";
const deadline = "2099-06-01T12:00:00.000Z";
const fields = { deadline, duration: 30, recurringPeriod: 7 };
beforeAll(async () => {
  await mongo.connect(); storage = await applicationStorage(database);
  setting = new TaskSettingConcept(database.collection<Task>("tasks"));
}, 10000);
beforeEach(async () => {
  await Promise.all(["tasks", "taskLists", "accounts", "sessions"].map(name => database.collection(name).deleteMany({})));
  now = new Date("2030-01-01T00:00:00.000Z");
});
afterAll(async () => { try { await database.dropDatabase(); } finally { await mongo.close(); } });
async function read(task: string) { return (await setting._get({ owner, task }))[0]!.details; }

describe("TaskSetting creation", () => {
  for (let mask = 0; mask < 8; mask++) {
    const optional = Object.fromEntries(Object.entries(fields).filter((_, index) => mask & (1 << index)));
    test(`creates with ${Object.keys(optional).join(", ") || "just a name"}`, async () => {
      const { task } = await setting.makeTask({ instant: now, owner, name: "Get medicine", ...optional });
      expect(await read(task)).toEqual({ task, owner, name: "Get medicine", hasDeadline: "deadline" in optional, isRecurring: "recurringPeriod" in optional, ...optional, ...("recurringPeriod" in optional ? { recurringUnit: "days", recurrenceAnchor: now.toISOString(), nextOccurrenceAt: "2030-01-08T00:00:00.000Z", ...("deadline" in optional ? { recurrenceDeadlineAnchor: deadline } : {}) } : {}) });
      expect((await new TaskSettingConcept(database.collection<Task>("tasks"))._get({ owner, task }))[0]!.details.name).toBe("Get medicine");
    });
  }
  test("zero duration is valid, names are trimmed, and task identities are distinct", async () => {
    const first = await setting.makeTask({ instant: now, owner, name: "  Same name  ", duration: 0 });
    const second = await setting.makeTask({ instant: now, owner, name: "Same name" });
    expect(first.task).not.toBe(second.task);
    expect((await read(first.task)).name).toBe("Same name");
    expect((await read(first.task)).duration).toBe(0);
  });
});

const invalid: Array<[string, TaskChanges, new (message?: string) => Error]> = [
  ["empty name", { name: "" }, EmptyName], ["blank name", { name: "  \n " }, EmptyName],
  ["long name", { name: "a".repeat(201) }, EmptyName],
  ["past deadline", { deadline: "2020-01-01T00:00:00.000Z" }, InvalidDeadline],
  ["deadline now", { deadline: "2030-01-01T00:00:00.000Z" }, InvalidDeadline],
  ["invalid date", { deadline: "not a date" }, InvalidDeadline],
  ["impossible calendar date", { deadline: "2099-02-30T12:00:00.000Z" }, InvalidDeadline],
  ["negative duration", { duration: -1 }, InvalidDuration], ["NaN duration", { duration: NaN }, InvalidDuration],
  ["infinite duration", { duration: Infinity }, InvalidDuration],
  ["zero recurring period", { recurringPeriod: 0 }, InvalidRecurringPeriod],
  ["negative recurring period", { recurringPeriod: -1 }, InvalidRecurringPeriod],
  ["infinite recurring period", { recurringPeriod: Infinity }, InvalidRecurringPeriod],
];
describe("TaskSetting validation", () => {
  for (const [label, changes, refusal] of invalid) {
    test(`refuses ${label} on creation and leaves storage empty`, async () => {
      await expect(setting.makeTask({ instant: now, owner, name: "Valid name", ...changes } as Parameters<typeof setting.makeTask>[0])).rejects.toBeInstanceOf(refusal);
      expect(await database.collection("tasks").countDocuments()).toBe(0);
    });
    test(`refuses ${label} on edit without changing any fields`, async () => {
      const { task } = await setting.makeTask({ instant: now, owner, name: "Original", ...fields });
      const before = await read(task);
      await expect(setting.updateTask({ instant: now, owner, task, changes: { name: "Changed", ...changes } })).rejects.toBeInstanceOf(refusal);
      expect(await read(task)).toEqual(before);
    });
  }
});

describe("TaskSetting changes", () => {
  test("changes all fields and then clears optional fields", async () => {
    const { task } = await setting.makeTask({ instant: now, owner, name: "Original" });
    await setting.updateTask({ instant: now, owner, task, changes: { name: "Changed", ...fields } });
    expect(await read(task)).toEqual({ task, owner, name: "Changed", ...fields, hasDeadline: true, isRecurring: true, recurringUnit: "days", recurrenceAnchor: now.toISOString(), nextOccurrenceAt: "2030-01-08T00:00:00.000Z", recurrenceDeadlineAnchor: deadline });
    await setting.updateTask({ instant: now, owner, task, changes: { deadline: null, duration: null, recurringPeriod: null } });
    expect(await read(task)).toEqual({ task, owner, name: "Changed", hasDeadline: false, isRecurring: false });
  });
  test("supports individual setters, removers, and changing values", async () => {
    const { task } = await setting.makeTask({ instant: now, owner, name: "Original" });
    await setting.setName({ owner, task, name: "Renamed" });
    await setting.setDeadline({ instant: now, owner, task, deadline });
    await setting.setDeadline({ instant: now, owner, task, deadline: "2099-07-01T12:00:00.000Z" });
    await setting.setDuration({ owner, task, duration: 0 });
    await setting.setDuration({ owner, task, duration: 45 });
    await setting.startRecurring({ owner, task, recurringPeriod: 7 , instant: new Date("2030-01-01T00:00:00Z") });
    await setting.startRecurring({ owner, task, recurringPeriod: 30 , instant: new Date("2030-01-01T00:00:00Z") });
    expect(await read(task)).toMatchObject({ name: "Renamed", deadline: "2099-07-01T12:00:00.000Z", duration: 45, recurringPeriod: 30 });
    await setting.removeDeadline({ owner, task }); await setting.removeDuration({ owner, task }); await setting.stopRecurring({ owner, task });
    expect(await read(task)).toEqual({ task, owner, name: "Renamed", hasDeadline: false, isRecurring: false });
  });
  test("can edit other fields after the existing deadline passes", async () => {
    const { task } = await setting.makeTask({ instant: now, owner, name: "Original", deadline: "2031-01-01T00:00:00.000Z" });
    now = new Date("2032-01-01T00:00:00.000Z");
    await setting.updateTask({ instant: now, owner, task, changes: { name: "Overdue", duration: 10 } });
    expect(await read(task)).toMatchObject({ name: "Overdue", duration: 10, deadline: "2031-01-01T00:00:00.000Z" });
  });
  test("refuses unknown tasks and another owner's task for every setter", async () => {
    const { task } = await setting.makeTask({ instant: now, owner, name: "Private" });
    const cases = [
      (task: string, owner: string) => setting.updateTask({ instant: now, owner, task, changes: { name: "Stolen" } }),
      (task: string, owner: string) => setting.setName({ owner, task, name: "Stolen" }),
      (task: string, owner: string) => setting.setDeadline({ instant: now, owner, task, deadline }),
      (task: string, owner: string) => setting.removeDeadline({ owner, task }),
      (task: string, owner: string) => setting.setDuration({ owner, task, duration: 5 }),
      (task: string, owner: string) => setting.removeDuration({ owner, task }),
      (task: string, owner: string) => setting.startRecurring({ owner, task, recurringPeriod: 5 , instant: new Date("2030-01-01T00:00:00Z") }),
      (task: string, owner: string) => setting.stopRecurring({ owner, task }),
    ];
    for (const run of cases) {
      await expect(run("nonexistent", owner)).rejects.toBeInstanceOf(TaskNotFound);
      await expect(run(task, "bob")).rejects.toBeInstanceOf(TaskNotFound);
    }
    expect(await setting._get({ owner: "bob", task })).toEqual([]);
    expect((await read(task)).name).toBe("Private");
  });
});

function handler() {
  const application = assembleApplication(storage);
  return createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy("http://localhost:3000") });
}
function request(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost:3000/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
}
async function login(username: string) {
  const response = await handler()(request("/auth/register", { username, password: "secure test password" }));
  expect(response.status).toBe(200); return response.headers.get("Set-Cookie")!.split(";")[0];
}
describe("TaskSetting HTTP integration", () => {
  test("uses the framework flow instant for sessions and deadlines, never a client timestamp", async () => {
    const instant = new Date("2098-01-01T00:00:00.000Z");
    const application = assembleApplication(storage, { clock: () => instant });
    const handle = createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy("http://localhost:3000") });
    const registration = await handle(request("/auth/register", { username: owner, password: "secure test password" }));
    expect(registration.status).toBe(200);
    const cookie = registration.headers.get("Set-Cookie")!.split(";")[0];
    const saved = await database.collection("sessions").findOne({ subject: owner });
    expect(saved!.expiresAt).toEqual(new Date(instant.getTime() + 30 * 60 * 1000));
    expect((await handle(request("/tasks/make", { name: "Too late", deadline: "2097-01-01T00:00:00.000Z" }, cookie))).status).toBe(400);
    expect((await handle(request("/tasks/make", { name: "Future", deadline, instant: "1900-01-01T00:00:00Z" }, cookie))).status).toBe(400);
    expect((await handle(request("/tasks/make", { name: "Future", deadline }, cookie))).status).toBe(200);
  });
  test("creates name-only and fully specified tasks, joins details, edits, and persists", async () => {
    const handle = handler(); const cookie = await login(owner);
    const created = await handle(request("/tasks/make", { name: "Name only" }, cookie));
    expect(created.status).toBe(200); const { task } = await created.json();
    expect((await handle(request("/tasks/make", { name: "Full task", ...fields }, cookie))).status).toBe(200);
    expect((await handle(request("/tasks/update", { task, changes: { name: "Renamed", duration: 0 } }, cookie))).status).toBe(200);
    const result = await handler()(request("/tasklists/view", {}, cookie));
    const body = await result.json();
    expect(body.list.activeTasks.map((row: { details: Task }) => row.details.name)).toEqual(["Renamed", "Full task"]);
    expect(body.list.activeTasks[0].details.duration).toBe(0);
    expect(body.list.activeTasks[1].details).toMatchObject(fields);
    expect(body.list.activeTasks[0].details).not.toHaveProperty("_id");
    expect((await handle(request("/tasklists/complete", { task }, cookie))).status).toBe(200);
    expect((await handle(request("/tasks/update", { task, changes: { name: "Edited after completion" } }, cookie))).status).toBe(404);
    const completed = await handle(request("/tasklists/view", {}, cookie));
    expect((await completed.json()).list.completedTasks[0].details.name).toBe("Renamed");
  });
  test("rejects malformed requests and invalid fields without creating or changing tasks", async () => {
    const handle = handler(); const cookie = await login(owner);
    expect((await handle(request("/tasks/make", { name: "No session" }))).status).toBe(401);
    for (const fields of [{ name: "" }, { name: 123 }, { name: "X", duration: "10" }, { name: "X", duration: -1 }, { name: "X", recurringPeriod: 0 }, { name: "X", deadline: "yesterday" }, { name: "X", extra: true }, { name: "X", owner: "bob" }]) {
      expect((await handle(request("/tasks/make", fields, cookie))).status).toBe(400);
    }
    expect(await database.collection("tasks").countDocuments()).toBe(0);
    const made = await handle(request("/tasks/make", { name: "Original", ...fields }, cookie));
    const { task } = await made.json();
    expect((await handle(request("/tasks/update", { task, changes: { name: "Changed", duration: -1 } }, cookie))).status).toBe(400);
    expect((await read(task)).name).toBe("Original");
    expect((await handle(request("/tasks/update", { task, changes: { owner: "bob" } }, cookie))).status).toBe(400);
    expect((await handle(request("/tasks/update", { task, changes: { duration: "5" } }, cookie))).status).toBe(400);
  });
  test("prevents cross-user edits and reads, and clears optional fields", async () => {
    const handle = handler(); const alice = await login(owner); const bob = await login("bob");
    const created = await handle(request("/tasks/make", { name: "Private", ...fields }, alice)); const { task } = await created.json();
    expect((await handle(request("/tasks/update", { task, changes: { name: "Stolen" } }, bob))).status).toBe(404);
    await storage.TaskListing.initialize({ owner: "bob" }); await storage.TaskListing.addTask({ owner: "bob", task });
    const viewed = await handle(request("/tasklists/view", {}, bob));
    expect((await viewed.json()).list.activeTasks).toEqual([]);
    expect((await handle(request("/tasks/update", { task, changes: { deadline: null, duration: null, recurringPeriod: null } }, alice))).status).toBe(200);
    expect(await read(task)).toEqual({ task, owner, name: "Private", hasDeadline: false, isRecurring: false });
  });
});


describe("TaskSetting individual refusals and repeated removals", () => {
  const cases: Array<[string, (task: string) => Promise<unknown>, new (...args: any[]) => Error]> = [
    ["setName", task => setting.setName({ owner, task, name: " " }), EmptyName],
    ["setDeadline", task => setting.setDeadline({ owner, task, deadline: "not a date", instant: now }), InvalidDeadline],
    ["setDuration", task => setting.setDuration({ owner, task, duration: -1 }), InvalidDuration],
    ["startRecurring", task => setting.startRecurring({ owner, task, recurringPeriod: 0, instant: now }), InvalidRecurringPeriod],
  ];
  for (const [action, run, refusal] of cases) {
    test(`${action} reports its refusal and leaves the full record unchanged`, async () => {
      const { task } = await setting.makeTask({ owner, name: "Original", instant: now, ...fields });
      const before = await database.collection("tasks").find({}).toArray();
      await expect(run(task)).rejects.toBeInstanceOf(refusal);
      expect(await database.collection("tasks").find({}).toArray()).toEqual(before);
    });
  }
  test("clearing already absent optional fields is idempotent", async () => {
    const { task } = await setting.makeTask({ owner, name: "Only name", instant: now });
    const before = await read(task);
    for (let attempt = 0; attempt < 2; attempt++) {
      await setting.removeDeadline({ owner, task });
      await setting.removeDuration({ owner, task });
      await setting.stopRecurring({ owner, task });
      await setting.updateTask({ owner, task, changes: {}, instant: now });
      expect(await read(task)).toEqual(before);
    }
  });
  for (const changes of [
    { recurringPeriod: 1, recurringUnit: "years" },
    { recurringPeriod: 1.5, recurringUnit: "months" },
    { recurringPeriod: Number.MAX_VALUE },
  ]) {
    test(`invalid recurrence ${JSON.stringify(changes)} rejects an atomic multi-field patch`, async () => {
      const { task } = await setting.makeTask({ owner, name: "Original", instant: now, ...fields });
      const before = await read(task);
      await expect(setting.updateTask({ owner, task, instant: now, changes: { name: "Must not save", duration: 99, ...changes } })).rejects.toBeInstanceOf(InvalidRecurringPeriod);
      expect(await read(task)).toEqual(before);
    });
  }
});


describe("Only active tasks can be edited through the application", () => {
  test("rejects every completed-task patch without changing details or membership", async () => {
    const handle = handler(), cookie = await login(owner);
    const made = await handle(request("/tasks/make", { name: "Finished", ...fields }, cookie));
    const { task } = await made.json();
    expect((await handle(request("/tasklists/complete", { task }, cookie))).status).toBe(200);
    const before = await read(task);
    const listBefore = await storage.TaskListing._viewTasks({ owner });
    for (const changes of [{ name: "Changed" }, { deadline: null }, { duration: 5 }, { recurringPeriod: null }, { recurringPeriod: 1, recurringUnit: "months" }]) {
      const response = await handle(request("/tasks/update", { task, changes }, cookie));
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "NOT_FOUND" });
      expect(await read(task)).toEqual(before);
      expect(await storage.TaskListing._viewTasks({ owner })).toEqual(listBefore);
    }
    await storage.TaskListing.reopenTask({ owner, task });
    expect((await handle(request("/tasks/update", { task, changes: { name: "Next occurrence" } }, cookie))).status).toBe(200);
    expect((await read(task)).name).toBe("Next occurrence");
  });
  test("deleted tasks cannot be edited even though their details remain stored", async () => {
    const handle = handler(), cookie = await login(owner);
    const made = await handle(request("/tasks/make", { name: "Deleted" }, cookie));
    const { task } = await made.json();
    await handle(request("/tasklists/delete", { task }, cookie));
    const before = await read(task);
    expect((await handle(request("/tasks/update", { task, changes: { name: "Changed" } }, cookie))).status).toBe(404);
    expect(await read(task)).toEqual(before);
  });
});


describe("TaskSetting specification consistency", () => {
  test("changing a deadline while disabling recurrence is one successful atomic edit", async () => {
    const { task } = await setting.makeTask({ owner, name: "Recurring", recurringPeriod: 7, deadline, instant: now });
    const replacement = "2099-07-01T12:00:00.000Z";
    await setting.updateTask({ owner, task, instant: now, changes: { deadline: replacement, recurringPeriod: null, recurringUnit: null } });
    expect(await read(task)).toEqual({ task, owner, name: "Recurring", deadline: replacement, hasDeadline: true, isRecurring: false });
  });
  test("clearing only the recurring unit resets to days without conflicting database updates", async () => {
    const { task } = await setting.makeTask({ owner, name: "Monthly", recurringPeriod: 2, recurringUnit: "months", instant: now });
    await setting.updateTask({ owner, task, instant: now, changes: { recurringUnit: null } });
    expect(await read(task)).toMatchObject({ recurringPeriod: 2, recurringUnit: "days", isRecurring: true, nextOccurrenceAt: "2030-01-03T00:00:00.000Z" });
  });
  test("a recurrence unit alone never creates or retains a schedule", async () => {
    const { task } = await setting.makeTask({ owner, name: "One-off", recurringUnit: "months", instant: now });
    const before = await read(task);
    await setting.updateTask({ owner, task, instant: now, changes: { recurringUnit: "months" } });
    expect(await read(task)).toEqual(before);
    expect(before).not.toHaveProperty("recurringUnit");
  });
  test("queries answer known and unknown owners without changing any task records", async () => {
    const { task } = await setting.makeTask({ owner, name: "Read only", ...fields, instant: now });
    const before = await database.collection("tasks").find({}).toArray();
    expect(await setting._get({ owner: "unknown", task })).toEqual([]);
    expect(await setting._forOwner({ owner: "unknown" })).toEqual({ records: [] });
    expect((await setting._forOwner({ owner })).records).toEqual([await read(task)]);
    expect(await setting._due({ instant: now })).toEqual([]);
    expect(await database.collection("tasks").find({}).toArray()).toEqual(before);
  });
  test("malformed recurrence-unit input is rejected at the HTTP boundary without saving changes", async () => {
    const handle = handler(), cookie = await login(owner);
    const created = await handle(request("/tasks/make", { name: "Unchanged", ...fields }, cookie));
    const { task } = await created.json();
    const before = await database.collection("tasks").find({}).toArray();
    for (const recurringUnit of [3, true, [], {}]) {
      expect((await handle(request("/tasks/make", { name: "Invalid", recurringPeriod: 1, recurringUnit }, cookie))).status).toBe(400);
      expect((await handle(request("/tasks/update", { task, changes: { name: "Must not save", recurringUnit } }, cookie))).status).toBe(400);
      expect(await database.collection("tasks").find({}).toArray()).toEqual(before);
    }
  });
});
