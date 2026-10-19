// Tests generic transformations and authenticated application policies.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { TaskSortingConcept } from "../src/concepts/TaskSorting.ts";
import { TaskFilteringConcept } from "../src/concepts/TaskFiltering.ts";
import { taskSnapshot, taskComparator, taskFilter } from "../src/compositions/task-transforms.ts";
import type { Task } from "../src/concepts/TaskSetting.ts";
import { applicationStorage } from "../src/storage.ts";
import { assembleApplication } from "../src/assembly.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { authenticationPolicy } from "../src/edge.ts";

const sorting = new TaskSortingConcept<{ name: string; rank: number }>();
const filtering = new TaskFilteringConcept<{ name: string; rank: number }>();
const items = [{ name: "B", rank: 2 }, { name: "A", rank: 1 }, { name: "C", rank: 2 }];
describe("Generic task transformations", () => {
  test("sorts using any comparator, preserving ties and the input", async () => {
    const input = Object.freeze(items.map(item => Object.freeze({ ...item })));
    const result = await sorting.sort({ tasks: input as unknown as typeof items, comparator: (a, b) => a.rank - b.rank });
    expect(result.tasks.map(task => task.name)).toEqual(["A", "B", "C"]);
    expect(input.map(task => task.name)).toEqual(["B", "A", "C"]);
    expect(result.tasks).not.toBe(input);
    expect((await sorting.sort({ tasks: items, comparator: (a, b) => b.name.localeCompare(a.name) })).tasks.map(t => t.name)).toEqual(["C", "B", "A"]);
  });
  test("filter preserves matching values, duplicates, and order without changing input", async () => {
    const input = [...items, items[0]!];
    const before = [...input];
    const result = await filtering.filter({ tasks: input, filter: task => task.rank === 2 });
    expect(result.tasks).toEqual([items[0]!, items[2]!, items[0]!]);
    expect(result.tasks[0]).toBe(items[0]);
    expect(input).toEqual(before);
    expect(result.tasks).not.toBe(input);
  });
  test("empty, all-match, no-match, and tied inputs", async () => {
    expect((await sorting.sort({ tasks: [], comparator: () => 0 })).tasks).toEqual([]);
    expect((await filtering.filter({ tasks: [], filter: () => true })).tasks).toEqual([]);
    expect((await filtering.filter({ tasks: items, filter: () => true })).tasks).toEqual(items);
    expect((await filtering.filter({ tasks: items, filter: () => false })).tasks).toEqual([]);
    expect((await sorting.sort({ tasks: items, comparator: () => 0 })).tasks).toEqual(items);
  });
});
const makeRecord = (name: string, extra: Partial<Task> = {}): Task => ({ task: name, owner: "alice", name, hasDeadline: false, isRecurring: false, ...extra });
const policyRecords = [makeRecord("missing"), makeRecord("long", { duration: 30, deadline: "2030-02-01T00:00:00Z" }), makeRecord("short", { duration: 5, deadline: "2030-01-01T00:00:00Z", isRecurring: true }), makeRecord("zero", { duration: 0, isRecurring: true })];
test("application comparators put missing fields last and preserve ties", async () => {
  const concept = new TaskSortingConcept<Task>();
  expect((await concept.sort({ tasks: policyRecords, comparator: taskComparator({ sortBy: "deadline" }) })).tasks.map(t => t.name)).toEqual(["short", "long", "missing", "zero"]);
  expect((await concept.sort({ tasks: policyRecords, comparator: taskComparator({ sortBy: "duration" }) })).tasks.map(t => t.name)).toEqual(["zero", "short", "long", "missing"]);
});
test("recurrence and inclusive duration filters combine; unknown estimates count as zero", async () => {
  const concept = new TaskFilteringConcept<Task>();
  const apply = async (recurring: string, maxDuration: number | null) => (await concept.filter({ tasks: policyRecords, filter: taskFilter({ recurring, maxDuration }) })).tasks.map(t => t.name);
  expect(await apply("all", null)).toEqual(["missing", "long", "short", "zero"]);
  expect(await apply("recurring", 5)).toEqual(["short", "zero"]);
  expect(await apply("nonrecurring", 0)).toEqual(["missing"]);
  expect(await apply("all", 4.5)).toEqual(["missing", "zero"]);
});

const url = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (!url) throw new Error("A MongoDB test URL is required.");
const mongo = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
const db = mongo.db(`taskmaster_transforms_test_${crypto.randomUUID().replaceAll("-", "")}`);
let storage: Awaited<ReturnType<typeof applicationStorage>>;
let application: ReturnType<typeof assembleApplication>;
let handle: ReturnType<typeof createHttpHandler>;
let cookie: string;
const instant = new Date("2030-01-01T00:00:00Z");
function request(path: string, body: unknown, session = cookie) {
  return new Request(`http://localhost:3000/api${path}`, { method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...(session ? { Cookie: session } : {}) }, body: JSON.stringify(body) });
}
beforeAll(async () => { await mongo.connect(); storage = await applicationStorage(db); });
beforeEach(async () => {
  await Promise.all(["tasks", "taskLists", "accounts", "sessions"].map(name => db.collection(name).deleteMany({})));
  application = assembleApplication(storage, { clock: () => instant });
  handle = createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy("http://localhost:3000") });
  const response = await handle(request("/auth/register", { username: "alice", password: "secure test password" }, ""));
  cookie = response.headers.get("Set-Cookie")!.split(";")[0]!;
});
afterAll(async () => { try { await db.dropDatabase(); } finally { await mongo.close(); } });
async function add(name: string, extra = {}) {
  const result = await handle(request("/tasks/make", { name, ...extra }));
  expect(result.status).toBe(200); return (await result.json()).task as string;
}
async function view(path: string, options = {}) {
  const response = await handle(request(path, options));
  expect(response.status).toBe(200); return (await response.json()).tasks as Task[];
}
describe("Authenticated sorting and filtering compositions", () => {
  test("sorts and filters live active and completed snapshots without changing stored membership", async () => {
    const missing = await add("Missing");
    const long = await add("Long", { duration: 60, deadline: "2030-03-01T00:00:00Z" });
    const short = await add("Short recurring", { duration: 5, recurringPeriod: 7, deadline: "2030-02-01T00:00:00Z" });
    const zero = await add("Zero recurring", { duration: 0, recurringPeriod: 1 });
    const before = await storage.TaskListing._viewTasks({ owner: "alice" });
    expect((await view("/taskSorting/view", { sortBy: "deadline" })).map(t => t.task)).toEqual([short, long, missing, zero]);
    expect((await view("/taskFiltering/view", { sortBy: "duration", recurring: "recurring", maxDuration: 5 })).map(t => t.task)).toEqual([zero, short]);
    expect((await view("/taskFiltering/view", { maxDuration: 0 })).map(t => t.task)).toEqual([missing, zero]);
    expect(await storage.TaskListing._viewTasks({ owner: "alice" })).toEqual(before);
    await handle(request("/tasklists/complete", { task: short }));
    expect((await view("/taskFiltering/view", { recurring: "recurring", status: "completed" })).map(t => t.task)).toEqual([short]);
    expect((await view("/taskFiltering/view", { recurring: "nonrecurring", maxDuration: 0 })).map(t => t.task)).toEqual([missing]);
    await handle(request("/tasks/update", { task: long, changes: { duration: 1 } }));
    expect((await view("/taskSorting/view", { sortBy: "duration" })).map(t => t.task)).toEqual([zero, long, missing]);
  });
  test("excludes deleted, missing, and other-owner records, and returns empty lists", async () => {
    const removed = await add("Deleted"); await handle(request("/tasklists/delete", { task: removed }));
    await storage.TaskListing.addTask({ owner: "alice", task: "missing-detail" });
    const other = await storage.TaskSetting.makeTask({ owner: "bob", name: "Private", instant });
    await storage.TaskListing.addTask({ owner: "alice", task: other.task });
    expect(await view("/taskFiltering/view")).toEqual([]);
    expect(await view("/taskSorting/view", { status: "completed" })).toEqual([]);
  });
  test("rejects invalid filters, sort options, identity injection, and absent sessions", async () => {
    for (const body of [{ maxDuration: -1 }, { maxDuration: "5" }, { recurring: "sometimes" }, { sortBy: "name" }, { status: "all" }, { owner: "bob" }, { tasks: [] }]) {
      expect((await handle(request("/taskFiltering/view", body))).status).toBe(400);
    }
    expect((await handle(request("/taskSorting/view", { sortBy: "random" }))).status).toBe(400);
    expect((await handle(request("/taskFiltering/view", {}, ""))).status).toBe(401);
    expect((await handle(request("/taskSorting/view", {}, ""))).status).toBe(401);
  });
});


describe("TaskSorting principle, repeated actions, and errors", () => {
  test("sorts, reverses the comparator, and sorts again without retaining earlier input", async () => {
    const original = items.map(task => ({ ...task }));
    const ascending = await sorting.sort({ tasks: original, comparator: (a, b) => a.rank - b.rank });
    const descending = await sorting.sort({ tasks: ascending.tasks, comparator: (a, b) => b.rank - a.rank });
    expect(ascending.tasks.map(t => t.name)).toEqual(["A", "B", "C"]);
    expect(descending.tasks.map(t => t.name)).toEqual(["B", "C", "A"]);
    expect(await sorting.sort({ tasks: original, comparator: (a, b) => a.rank - b.rank })).toEqual(ascending);
    expect(original).toEqual(items);
  });
  test("rejects a noncallable comparator without reordering the input", async () => {
    const input = items.map(task => ({ ...task }));
    const before = structuredClone(input);
    await expect(sorting.sort({ tasks: input, comparator: null as unknown as (a: typeof items[number], b: typeof items[number]) => number })).rejects.toBeInstanceOf(TypeError);
    expect(input).toEqual(before);
  });
  test("propagates a comparator failure without returning or retaining a partially sorted list", async () => {
    const input = items.map(task => ({ ...task }));
    const before = structuredClone(input);
    const failure = new Error("Comparison failed");
    await expect(sorting.sort({ tasks: input, comparator: () => { throw failure; } })).rejects.toBe(failure);
    expect(input).toEqual(before);
    expect((await sorting.sort({ tasks: input, comparator: (a, b) => a.rank - b.rank })).tasks.map(t => t.name)).toEqual(["A", "B", "C"]);
  });
});

describe("TaskFiltering principle, repeated actions, and errors", () => {
  test("changes predicates and repeats filtering without removing tasks from the source", async () => {
    const input = items.map(task => ({ ...task }));
    expect((await filtering.filter({ tasks: input, filter: task => task.rank === 2 })).tasks.map(t => t.name)).toEqual(["B", "C"]);
    expect((await filtering.filter({ tasks: input, filter: task => task.rank === 1 })).tasks.map(t => t.name)).toEqual(["A"]);
    expect((await filtering.filter({ tasks: input, filter: task => task.rank === 2 })).tasks.map(t => t.name)).toEqual(["B", "C"]);
    expect(input).toEqual(items);
  });
  test("rejects a noncallable predicate without removing any tasks", async () => {
    const input = items.map(task => ({ ...task }));
    const before = structuredClone(input);
    await expect(filtering.filter({ tasks: input, filter: null as unknown as (task: typeof items[number]) => boolean })).rejects.toBeInstanceOf(TypeError);
    expect(input).toEqual(before);
  });
  test("propagates a predicate failure without returning or retaining partial results", async () => {
    const input = items.map(task => ({ ...task }));
    const before = structuredClone(input);
    const failure = new Error("Predicate failed");
    await expect(filtering.filter({ tasks: input, filter: task => { if (task.rank === 1) throw failure; return true; } })).rejects.toBe(failure);
    expect(input).toEqual(before);
    expect((await filtering.filter({ tasks: input, filter: () => true })).tasks).toEqual(before);
  });
});


test("task snapshot computation treats external membership as opaque and checks record ownership", () => {
  const alice = makeRecord("owned");
  const bob = makeRecord("private", { owner: "bob" });
  const snapshot = taskSnapshot({ taskList: { owner: "alice", activeTasks: [bob.task, alice.task], completedTasks: [] }, records: [alice, bob], status: "active" });
  expect(snapshot).toEqual([alice]);
});
