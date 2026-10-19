// Tests scheduled returns, deadline advancement, and restart-safe retries.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { applicationStorage } from "../src/storage.ts";
import { assembleApplication } from "../src/assembly.ts";
import { processRecurrences } from "../src/recurrences.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { authenticationPolicy } from "../src/edge.ts";
import { InvalidDeadline, InvalidRecurringPeriod, TaskNotFound } from "../src/concepts/TaskSetting.ts";
import { NoSuchUser } from "../src/concepts/TaskListing.ts";

const url = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (!url) throw new Error("Set TEST_MONGODB_URL or MONGODB_URL to run MongoDB tests.");
const mongo = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
const database = mongo.db(`taskmaster_recurring_test_${crypto.randomUUID().replaceAll("-", "")}`);
let storage: Awaited<ReturnType<typeof applicationStorage>>;
let instant = new Date("2030-01-01T00:00:00.000Z");
const owner = "alice", day = 86400000;
let application: ReturnType<typeof assembleApplication>;
beforeAll(async () => { await mongo.connect(); storage = await applicationStorage(database); }, 10000);
beforeEach(async () => {
  await Promise.all(["tasks", "taskLists", "accounts", "sessions"].map(name => database.collection(name).deleteMany({})));
  instant = new Date("2030-01-01T00:00:00.000Z");
  application = assembleApplication(storage, { clock: () => instant });
  await storage.TaskListing.initialize({ owner });
});
afterAll(async () => { try { await database.dropDatabase(); } finally { await mongo.close(); } });
const details = async (task: string) => (await storage.TaskSetting._get({ owner, task }))[0]!.details;
const list = async () => (await storage.TaskListing._viewTasks({ owner })).taskList;
async function make(fields: { deadline?: string; recurringPeriod?: number; duration?: number; recurringUnit?: string } = { recurringPeriod: 1 }) {
  const { task } = await storage.TaskSetting.makeTask({ owner, name: "Recurring chore", instant, ...fields });
  await storage.TaskListing.addTask({ owner, task }); return task;
}
async function complete(task: string) {
  await storage.TaskListing.completeTask({ owner, task });
}
async function run() { await processRecurrences(application, instant); }

describe("Recurring occurrence lifecycle", () => {
  test("waits until the period elapses and re-adds a deadline-free task once", async () => {
    const task = await make(); await complete(task);
    expect(await list()).toMatchObject({ activeTasks: [], completedTasks: [task] });
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-02T00:00:00.000Z");
    await run(); expect((await list()).activeTasks).toEqual([]);
    instant = new Date(instant.getTime() + day - 1); await run();
    expect((await list()).activeTasks).toEqual([]);
    instant = new Date(instant.getTime() + 1); await run(); await run();
    expect(await list()).toMatchObject({ activeTasks: [task], completedTasks: [] });
    expect(await details(task)).not.toHaveProperty("deadline");
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-03T00:00:00.000Z");
    expect(await details(task)).not.toHaveProperty("pendingRecurrence");
  });
  test("advances a deadline on each re-add and preserves other fields", async () => {
    const task = await make({ deadline: "2030-01-02T12:00:00.000Z", recurringPeriod: 1, duration: 30 });
    await complete(task); instant = new Date("2030-01-02T00:00:00.000Z"); await run();
    expect((await details(task)).deadline).toBe("2030-01-03T12:00:00.000Z");
    await complete(task); instant = new Date("2030-01-03T00:00:00.000Z"); await run();
    expect(await details(task)).toMatchObject({ name: "Recurring chore", duration: 30, recurringPeriod: 1, deadline: "2030-01-04T12:00:00.000Z" });
    expect((await list()).activeTasks).toEqual([task]);
  });
  test("catches up missed periods without producing many overdue copies", async () => {
    const task = await make({ deadline: "2030-01-01T12:00:00.000Z", recurringPeriod: 1 });
    await complete(task); instant = new Date("2030-01-10T12:00:00.000Z"); await run();
    expect((await details(task)).deadline).toBe("2030-01-11T12:00:00.000Z");
    expect((await list()).activeTasks).toEqual([task]);
  });
  test("supports fractional periods", async () => {
    const task = await make({ recurringPeriod: 0.5 }); await complete(task);
    instant = new Date("2030-01-01T12:00:00.000Z"); await run();
    expect((await list()).activeTasks).toEqual([task]);
  });
  test("nonrecurring completion and deleting an active task do not schedule returns", async () => {
    const once = await make({}); await complete(once);
    const removed = await make(); await storage.TaskListing.deleteTask({ owner, task: removed });
    instant = new Date("2031-01-01T00:00:00.000Z"); await run();
    expect(await list()).toMatchObject({ activeTasks: [], completedTasks: [once] });
  });
  test("completion leaves the schedule unchanged and changing the period resets its anchor", async () => {
    const task = await make(); await complete(task);
    instant = new Date("2030-01-01T06:00:00.000Z");
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-02T00:00:00.000Z");
    await storage.TaskSetting.startRecurring({ owner, task, recurringPeriod: 2, instant });
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-03T06:00:00.000Z");
    instant = new Date("2030-01-02T00:00:00.000Z"); await run(); expect((await list()).activeTasks).toEqual([]);
    instant = new Date("2030-01-03T06:00:00.000Z"); await run(); expect((await list()).activeTasks).toEqual([task]);
  });
  test("turning recurrence off cancels pending returns", async () => {
    const task = await make(); await complete(task);
    await storage.TaskSetting.stopRecurring({ owner, task });
    instant = new Date("2030-01-03T00:00:00.000Z"); await run();
    expect((await list()).activeTasks).toEqual([]);
    expect(await details(task)).not.toHaveProperty("nextOccurrenceAt");
  });
  test("recovers persisted schedules and pending cycles across new assemblies", async () => {
    const task = await make({ deadline: "2030-01-02T12:00:00.000Z", recurringPeriod: 1 }); await complete(task);
    instant = new Date("2030-01-02T00:00:00.000Z");
    // Simulate a crash after preparing the deadline but before the re-add reaction.
    await storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor: "2030-01-02T00:00:00.000Z", instant });
    const deadline = (await details(task)).deadline;
    const restartedStorage = await applicationStorage(database);
    application = assembleApplication(restartedStorage, { clock: () => instant });
    await run(); await run();
    expect((await details(task)).deadline).toBe(deadline);
    expect((await list()).activeTasks).toEqual([task]);
    expect(await details(task)).not.toHaveProperty("pendingRecurrence");
  });
  test("stale or early cycles cannot shift deadlines or re-add tasks", async () => {
    const task = await make({ deadline: "2030-01-02T12:00:00.000Z", recurringPeriod: 1 }); await complete(task);
    const before = await details(task);
    expect((await storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor: "stale", instant })).ready).toBe(false);
    expect((await storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor: before.nextOccurrenceAt!, instant })).ready).toBe(false);
    expect(await details(task)).toEqual(before);
    await storage.TaskSetting.acknowledgeOccurrence({ owner, task, cycle: "wrong" });
    expect(await details(task)).toEqual(before);
  });
  test("reopen is idempotent and never resurrects an absent task", async () => {
    const task = await make(); await storage.TaskListing.completeTask({ owner, task });
    await storage.TaskListing.reopenTask({ owner, task }); await storage.TaskListing.reopenTask({ owner, task });
    expect((await list()).activeTasks).toEqual([task]);
    await storage.TaskListing.deleteTask({ owner, task });
    await storage.TaskListing.reopenTask({ owner, task });
    expect((await list()).activeTasks).toEqual([]);
    await expect(storage.TaskListing.reopenTask({ owner: "missing", task })).rejects.toBeInstanceOf(NoSuchUser);
  });
  test("releasing enforces ownership without changing another user's task", async () => {
    const task = await make(); const before = await details(task);
    for (const other of ["bob", "missing"]) {
      await expect(storage.TaskSetting.releaseOccurrence({ owner: other, task, scheduledFor: "stale", instant })).rejects.toBeInstanceOf(TaskNotFound);
    }
    expect(await details(task)).toEqual(before);
  });
});

function request(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost:3000/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) });
}
function handler() { return createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy("http://localhost:3000") }); }
describe("Recurring tasks through HTTP", () => {
  test("completion preserves the schedule, re-adding advances the deadline, and disabling makes completion final", async () => {
    const handle = handler();
    const registration = await handle(request("/auth/register", { username: owner, password: "secure test password" }));
    const cookie = registration.headers.get("Set-Cookie")!.split(";")[0];
    const made = await handle(request("/tasks/make", { name: "Recurring", recurringPeriod: 1, deadline: "2030-01-02T12:00:00.000Z" }, cookie));
    const { task } = await made.json();
    expect((await handle(request("/tasklists/complete", { task }, cookie))).status).toBe(200);
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-02T00:00:00.000Z");
    instant = new Date("2030-01-02T00:00:00.000Z"); await run();
    expect((await details(task)).deadline).toBe("2030-01-03T12:00:00.000Z");
    // Reauthenticate after advancing beyond the session's 30-minute lifetime.
    const login = await handle(request("/auth/sign-in", { username: owner, password: "secure test password" }));
    const newCookie = login.headers.get("Set-Cookie")!.split(";")[0];
    expect((await handle(request("/tasks/update", { task, changes: { recurringPeriod: null } }, newCookie))).status).toBe(200);
    expect((await handle(request("/tasklists/complete", { task }, newCookie))).status).toBe(200);
    instant = new Date("2030-01-10T00:00:00.000Z"); await run();
    expect((await list()).activeTasks).toEqual([]);
  });
  test("enabling recurrence on a completed task immediately anchors its schedule", async () => {
    const task = await make({}); await complete(task);
    await application.concepts.TaskSetting.updateTask({ owner, task, changes: { recurringPeriod: 1 }, instant });
    await application.whenIdle();
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-02T00:00:00.000Z");
  });
});


describe("Anchored calendar schedules", () => {
  test("weekly completion does not move the original weekday", async () => {
    const task = await make({ recurringPeriod: 7 });
    instant = new Date("2030-01-04T12:00:00Z"); await complete(task);
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-08T00:00:00.000Z");
    instant = new Date("2030-01-08T00:00:00Z"); await run();
    expect((await list()).activeTasks).toEqual([task]);
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-15T00:00:00.000Z");
  });
  test("unfinished tasks keep advancing indefinitely without duplicates", async () => {
    const task = await make();
    instant = new Date("2030-01-02T00:00:00Z"); await run();
    instant = new Date("2030-01-10T12:00:00Z"); await run();
    expect((await list()).activeTasks).toEqual([task]);
    expect((await details(task)).nextOccurrenceAt).toBe("2030-01-11T00:00:00.000Z");
    await complete(task);
    instant = new Date("2030-01-11T00:00:00Z"); await run();
    expect((await list()).activeTasks).toEqual([task]);
  });
  test("monthly schedules clamp February and recover the original day in March", async () => {
    instant = new Date("2032-01-31T09:00:00Z");
    const task = await make({ recurringPeriod: 1, recurringUnit: "months", deadline: "2032-01-31T12:00:00.000Z" });
    expect((await details(task)).nextOccurrenceAt).toBe("2032-02-29T09:00:00.000Z");
    instant = new Date("2032-02-29T09:00:00Z"); await run();
    expect((await details(task)).nextOccurrenceAt).toBe("2032-03-31T09:00:00.000Z");
    expect((await details(task)).deadline).toBe("2032-02-29T12:00:00.000Z");
    instant = new Date("2032-03-31T09:00:00Z"); await run();
    expect((await details(task)).deadline).toBe("2032-03-31T12:00:00.000Z");
    expect((await details(task)).nextOccurrenceAt).toBe("2032-04-30T09:00:00.000Z");
  });
  test("monthly catch-up skips missed occurrences without drifting", async () => {
    instant = new Date("2030-01-31T09:00:00Z");
    const task = await make({ recurringPeriod: 1, recurringUnit: "months" });
    instant = new Date("2030-05-05T00:00:00Z"); await run();
    expect((await details(task)).nextOccurrenceAt).toBe("2030-05-31T09:00:00.000Z");
  });
  test("invalid units and fractional months are rejected atomically", async () => {
    for (const fields of [{ recurringPeriod: 1, recurringUnit: "years" }, { recurringPeriod: 1.5, recurringUnit: "months" }]) {
      await expect(make(fields)).rejects.toThrow();
    }
    expect(await database.collection("tasks").countDocuments()).toBe(0);
  });
  test("monthly requests work through the authenticated endpoint", async () => {
    const handle = handler();
    const registration = await handle(request("/auth/register", { username: owner, password: "secure test password" }));
    const cookie = registration.headers.get("Set-Cookie")!.split(";")[0];
    const response = await handle(request("/tasks/make", { name: "Monthly", recurringPeriod: 1, recurringUnit: "months" }, cookie));
    expect(response.status).toBe(200);
    const { task } = await response.json();
    expect((await details(task)).nextOccurrenceAt).toBe("2030-02-01T00:00:00.000Z");
  });
});


describe("Recurrence cancellation and missing-task refusals", () => {
  test("cancelling a prepared occurrence makes late acknowledgments harmless", async () => {
    const task = await make(); await complete(task);
    instant = new Date("2030-01-02T00:00:00Z");
    const scheduledFor = (await details(task)).nextOccurrenceAt!;
    expect((await storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor, instant })).ready).toBe(true);
    await storage.TaskSetting.stopRecurring({ owner, task });
    const before = await details(task);
    await storage.TaskSetting.acknowledgeOccurrence({ owner, task, cycle: scheduledFor });
    await storage.TaskSetting.acknowledgeOccurrence({ owner, task, cycle: scheduledFor });
    expect(await details(task)).toEqual(before);
    expect((await storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor, instant })).ready).toBe(false);
    await run();
    expect((await list()).completedTasks).toEqual([task]);
    expect((await list()).activeTasks).toEqual([]);
  });
  test("missing-task release reports TaskNotFound and preserves all records", async () => {
    await make();
    const before = await database.collection("tasks").find({}).toArray();
    await expect(storage.TaskSetting.releaseOccurrence({ owner, task: "nonexistent", scheduledFor: instant.toISOString(), instant })).rejects.toBeInstanceOf(TaskNotFound);
    expect(await database.collection("tasks").find({}).toArray()).toEqual(before);
    expect(await storage.TaskSetting.acknowledgeOccurrence({ owner, task: "nonexistent", cycle: "missing" })).toEqual({ task: "nonexistent" });
    expect(await database.collection("tasks").find({}).toArray()).toEqual(before);
  });
});


describe("Documented recurrence refusals", () => {
  test("a deadline advanced through valid actions eventually refuses overflow without changing state", async () => {
    instant = new Date(-8640000000000000);
    const task = await make({ recurringPeriod: 60000000, deadline: "9999-01-01T00:00:00.000Z" });
    const first = await details(task);
    instant = new Date(first.nextOccurrenceAt!);
    expect((await storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor: first.nextOccurrenceAt!, instant })).ready).toBe(true);
    await storage.TaskSetting.acknowledgeOccurrence({ owner, task, cycle: first.nextOccurrenceAt! });
    const before = await details(task);
    instant = new Date(before.nextOccurrenceAt!);
    await expect(storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor: before.nextOccurrenceAt!, instant })).rejects.toBeInstanceOf(InvalidDeadline);
    expect(await details(task)).toEqual(before);
  });
  test("an unrepresentable next occurrence reports InvalidRecurringPeriod without changing state", async () => {
    instant = new Date(8640000000000000 - 86400000);
    const task = await make();
    const before = await details(task);
    instant = new Date(before.nextOccurrenceAt!);
    await expect(storage.TaskSetting.releaseOccurrence({ owner, task, scheduledFor: before.nextOccurrenceAt!, instant })).rejects.toBeInstanceOf(InvalidRecurringPeriod);
    expect(await details(task)).toEqual(before);
  });
});
