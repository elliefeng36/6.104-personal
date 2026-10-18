// Tests suggestion ranking, time limits, and empty results.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { TaskSuggestingConcept, InvalidTimeLimit, UnknownSuggestRequest, type CandidatePool, type SuggestRequest } from "../src/concepts/TaskSuggesting.ts";
import { authenticationStorage } from "../src/storage.ts";
import { assembleApplication } from "../src/assembly.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { authenticationPolicy } from "../src/edge.ts";

const url = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (!url) throw new Error("Set TEST_MONGODB_URL or MONGODB_URL to run MongoDB tests.");
const mongo = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
const database = mongo.db(`taskmaster_suggest_test_${crypto.randomUUID().replaceAll("-", "")}`);
let storage: Awaited<ReturnType<typeof authenticationStorage>>;
let suggesting: TaskSuggestingConcept;
const owner = "alice";
const earlier = "2099-01-01T12:00:00.000Z", later = "2099-02-01T12:00:00.000Z";
const pool = (...details: CandidatePool["entries"][number]["details"][]): CandidatePool => ({ entries: details.map(details => ({ details })) });
beforeAll(async () => {
  await mongo.connect(); storage = await authenticationStorage(database); suggesting = storage.TaskSuggesting;
}, 10000);
beforeEach(async () => {
  await Promise.all(["suggestRequests", "tasks", "taskLists", "accounts", "sessions"].map(name => database.collection(name).deleteMany({})));
});
afterAll(async () => { try { await database.dropDatabase(); } finally { await mongo.close(); } });
async function suggest(candidates: CandidatePool, timeLimit?: number | null) {
  const { request } = await suggesting.makeRequest({ user: owner, ...(timeLimit !== undefined ? { timeLimit } : {}) });
  const { suggestion } = await suggesting.makeSuggestion({ request, pool: candidates });
  return suggestion;
}

describe("TaskSuggesting concept", () => {
  test("without a limit, prioritizes the earliest deadline regardless of duration", async () => {
    expect(await suggest(pool(
      { task: "undated", duration: 1 }, { task: "later", deadline: later, duration: 5 },
      { task: "earlier", deadline: earlier, duration: 90 },
    ))).toEqual({ task: "earlier", outcome: "SUGGESTED" });
  });
  test("with a limit, selects the earliest deadline among tasks that fit", async () => {
    expect(await suggest(pool(
      { task: "too-long", deadline: earlier, duration: 60 },
      { task: "unknown" }, { task: "fits", deadline: later, duration: 20 },
      { task: "undated", duration: 10 },
    ), 20)).toEqual({ task: "fits", outcome: "SUGGESTED" });
  });
  test("an unknown duration is allowed without a limit, including explicit null", async () => {
    expect(await suggest(pool({ task: "unknown", deadline: earlier }))).toEqual({ task: "unknown", outcome: "SUGGESTED" });
    expect(await suggest(pool({ task: "unknown" }), null)).toEqual({ task: "unknown", outcome: "SUGGESTED" });
  });
  test("missing duration counts as zero under positive and zero time limits", async () => {
    for (const limit of [30, 0]) {
      expect(await suggest(pool({ task: "unknown" }), limit)).toEqual({ task: "unknown", outcome: "SUGGESTED" });
    }
    expect(await suggest(pool({ task: "estimated", duration: 10, deadline: later }, { task: "unknown", deadline: earlier }), 10))
      .toEqual({ task: "unknown", outcome: "SUGGESTED" });
  });
  test("zero permits zero-duration and unestimated tasks", async () => {
    expect(await suggest(pool({ task: "one", duration: 1 }, { task: "zero", duration: 0 }, { task: "unknown" }), 0)).toEqual({ task: "zero", outcome: "SUGGESTED" });
    expect(await suggest(pool({ task: "one", duration: 1 }), 0)).toEqual({ task: null, outcome: "NO_VIABLE_TASKS" });
  });
  test("fractional and exact-fit limits are supported", async () => {
    expect(await suggest(pool({ task: "fits", duration: 0.5 }), 0.5)).toEqual({ task: "fits", outcome: "SUGGESTED" });
    expect(await suggest(pool({ task: "long", duration: 0.51 }), 0.5)).toEqual({ task: null, outcome: "NO_VIABLE_TASKS" });
  });
  test("undated tasks and equal deadlines retain candidate order", async () => {
    expect((await suggest(pool({ task: "first" }, { task: "second" }))).task).toBe("first");
    expect((await suggest(pool({ task: "first", deadline: earlier }, { task: "second", deadline: earlier }))).task).toBe("first");
  });
  test("overdue deadlines are most urgent and malformed deadlines rank last", async () => {
    expect((await suggest(pool({ task: "invalid", deadline: "bad date" }, { task: "future", deadline: later }, { task: "overdue", deadline: "2020-01-01T00:00:00.000Z" }))).task).toBe("overdue");
  });
  for (const limit of [undefined, 10]) {
    test(`empty candidate pool is a successful empty outcome, limit=${limit}`, async () => {
      expect(await suggest(pool(), limit)).toEqual({ task: null, outcome: "EMPTY_TASKLIST" });
    });
  }
  test("no task fits the budget returns a distinct empty outcome", async () => {
    expect(await suggest(pool({ task: "long", duration: 60 }, { task: "longer", duration: 90 }), 10)).toEqual({ task: null, outcome: "NO_VIABLE_TASKS" });
  });
  for (const invalid of [-1, NaN, Infinity, -Infinity, "15", "", true]) {
    test(`invalid limit ${String(invalid)} refuses before creating a request`, async () => {
      await expect(suggesting.makeRequest({ user: owner, timeLimit: invalid as number })).rejects.toBeInstanceOf(InvalidTimeLimit);
      expect(await database.collection("suggestRequests").countDocuments()).toBe(0);
    });
  }
  test("unknown requests refuse without changing state", async () => {
    await expect(suggesting.makeSuggestion({ request: "unknown", pool: pool({ task: "task" }) })).rejects.toBeInstanceOf(UnknownSuggestRequest);
    expect(await database.collection("suggestRequests").countDocuments()).toBe(0);
  });
  test("requests persist across concept instances without storing candidate metadata", async () => {
    const { request } = await suggesting.makeRequest({ user: owner, timeLimit: 20 });
    const restarted = new TaskSuggestingConcept(database.collection<SuggestRequest>("suggestRequests"));
    expect(await restarted.makeSuggestion({ request, pool: pool({ task: "fit", duration: 10, deadline: earlier }) })).toEqual({ suggestion: { task: "fit", outcome: "SUGGESTED" } });
    const saved = await database.collection("suggestRequests").findOne({ request });
    expect(saved).toMatchObject({ request, user: owner, timeLimit: 20, outcome: "SUGGESTED", suggestedTask: "fit" });
    expect(saved).not.toHaveProperty("pool"); expect(saved).not.toHaveProperty("duration"); expect(saved).not.toHaveProperty("deadline");
    await restarted.makeSuggestion({ request, pool: pool() });
    expect(await database.collection("suggestRequests").findOne({ request })).not.toHaveProperty("suggestedTask");
  });
});

function handler() {
  const application = assembleApplication(storage);
  return createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy("http://localhost:3000") });
}
function post(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost:3000/api${path}`, { method: "POST", headers: {
    "Content-Type": "application/json", Origin: "http://localhost:3000", ...(cookie ? { Cookie: cookie } : {}),
  }, body: JSON.stringify(body) });
}
async function login(user: string) {
  const response = await handler()(post("/auth/register", { username: user, password: "secure test password" }));
  expect(response.status).toBe(200); return response.headers.get("Set-Cookie")!.split(";")[0];
}
async function make(cookie: string, fields: { name: string; duration?: number; deadline?: string }) {
  const response = await handler()(post("/tasks/make", fields, cookie));
  expect(response.status).toBe(200); return (await response.json()).task as string;
}
const path = "/taskSuggestions/makeRequest";
describe("Authenticated suggestion composition", () => {
  test("no-limit, limited, empty-fit, invalid, and empty-list responses", async () => {
    const handle = handler(), cookie = await login(owner);
    expect(await (await handle(post(path, {}, cookie))).json()).toEqual({ suggestion: { task: null, outcome: "EMPTY_TASKLIST" } });
    const urgent = await make(cookie, { name: "Urgent", deadline: earlier, duration: 60 });
    const fits = await make(cookie, { name: "Fits", deadline: later, duration: 15 });
    expect(await (await handle(post(path, {}, cookie))).json()).toEqual({ suggestion: { task: urgent, outcome: "SUGGESTED" } });
    expect(await (await handle(post(path, { timeLimit: null }, cookie))).json()).toEqual({ suggestion: { task: urgent, outcome: "SUGGESTED" } });
    expect(await (await handle(post(path, { timeLimit: 15 }, cookie))).json()).toEqual({ suggestion: { task: fits, outcome: "SUGGESTED" } });
    const noFit = await handle(post(path, { timeLimit: 1 }, cookie)); expect(noFit.status).toBe(200);
    expect(await noFit.json()).toEqual({ suggestion: { task: null, outcome: "NO_VIABLE_TASKS" } });
    const before = await database.collection("suggestRequests").countDocuments();
    for (const timeLimit of [-1, "15", "", true, [], {}]) {
      expect((await handle(post(path, { timeLimit }, cookie))).status).toBe(400);
    }
    expect(await database.collection("suggestRequests").countDocuments()).toBe(before);
  });
  test("requires authentication and excludes completed, deleted, other-owner, and missing tasks", async () => {
    const handle = handler();
    expect((await handle(post(path, {}))).status).toBe(401);
    const alice = await login(owner), bob = await login("bob");
    const done = await make(alice, { name: "Done", deadline: earlier });
    const removed = await make(alice, { name: "Removed", deadline: earlier });
    await handle(post("/tasklists/complete", { task: done }, alice));
    await handle(post("/tasklists/delete", { task: removed }, alice));
    const privateTask = await make(bob, { name: "Bob's task", deadline: earlier });
    // Even an inconsistent membership cannot bypass TaskSetting's owner filter.
    await storage.TaskListing.addTask({ owner, task: privateTask });
    await storage.TaskListing.addTask({ owner, task: "missing-record" });
    expect(await (await handle(post(path, {}, alice))).json()).toEqual({ suggestion: { task: null, outcome: "EMPTY_TASKLIST" } });
    for (const extra of [{ user: "bob" }, { pool: { entries: [] } }, { request: "invented" }, { instant: earlier }]) {
      expect((await handle(post(path, { ...extra, timeLimit: 10 }, alice))).status).toBe(400);
    }
  });
  test("uses current task edits and active membership for each new request", async () => {
    const handle = handler(), cookie = await login(owner);
    const task = await make(cookie, { name: "Edit me", duration: 60 });
    expect((await (await handle(post(path, { timeLimit: 15 }, cookie))).json()).suggestion.outcome).toBe("NO_VIABLE_TASKS");
    expect((await handle(post("/tasks/update", { task, changes: { duration: 15 } }, cookie))).status).toBe(200);
    expect((await (await handler()(post(path, { timeLimit: 15 }, cookie))).json()).suggestion.task).toBe(task);
    expect((await handle(post("/tasks/update", { task, changes: { duration: null } }, cookie))).status).toBe(200);
    expect((await (await handle(post(path, { timeLimit: 0 }, cookie))).json()).suggestion.task).toBe(task);
    await handle(post("/tasklists/complete", { task }, cookie));
    expect((await (await handle(post(path, {}, cookie))).json()).suggestion.outcome).toBe("EMPTY_TASKLIST");
  });
  test("tie-breaking preserves addition order even when detail-query order differs", async () => {
    const handle = handler(), cookie = await login(owner);
    await database.collection("tasks").insertMany([
      { task: "z-first", owner, name: "First added", hasDeadline: false, isRecurring: false },
      { task: "a-second", owner, name: "Second added", hasDeadline: false, isRecurring: false },
    ]);
    await storage.TaskListing.initialize({ owner });
    await storage.TaskListing.addTask({ owner, task: "z-first" });
    await storage.TaskListing.addTask({ owner, task: "a-second" });
    expect((await (await handle(post(path, {}, cookie))).json()).suggestion.task).toBe("z-first");
  });
});
