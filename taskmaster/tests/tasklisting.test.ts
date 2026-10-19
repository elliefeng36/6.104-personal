// Tests task membership changes and owner isolation.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { authenticationPolicy } from "../src/edge.ts";
import { applicationStorage } from "../src/storage.ts";
import { TaskListingConcept, NoSuchTask, NoSuchUser, type TaskList } from "../src/concepts/TaskListing.ts";

const url = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (!url) throw new Error("Set TEST_MONGODB_URL or MONGODB_URL to run MongoDB integration tests.");
const mongo = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
const database = mongo.db(`taskmaster_lists_test_${crypto.randomUUID().replaceAll("-", "")}`);
let storage: Awaited<ReturnType<typeof applicationStorage>>;
let listing: TaskListingConcept;
const owner = "alice";
const task = "first-task", secondTask = "second-task";
const input = { owner, task };

beforeAll(async () => {
  await mongo.connect();
  storage = await applicationStorage(database);
  listing = storage.TaskListing;
}, 10000);
beforeEach(async () => {
  await database.collection("taskLists").deleteMany({});
  await database.collection("sessions").deleteMany({});
  await database.collection("accounts").deleteMany({});
  await database.collection("tasks").deleteMany({});
  await listing.initialize({ owner });
});
afterAll(async () => { try { await database.dropDatabase(); } finally { await mongo.close(); } });
const list = async () => (await listing._viewTasks({ owner })).taskList;

describe("TaskListing concept", () => {
  test("initializes an empty list and never resets existing state", async () => {
    expect(await list()).toEqual({ owner, activeTasks: [], completedTasks: [] });
    await listing.addTask(input);
    await listing.initialize({ owner });
    expect((await list()).activeTasks).toEqual([task]);
    expect(await database.collection("taskLists").countDocuments({ owner })).toBe(1);
  });

  test("adds opaque task identities using set semantics, preserves other tasks, and persists", async () => {
    expect(await listing.addTask(input)).toEqual({ task });
    await listing.addTask(input);
    await listing.addTask({ owner, task: secondTask });
    const restarted = new TaskListingConcept(database.collection<TaskList>("taskLists"));
    expect((await restarted._viewTasks({ owner })).taskList).toEqual({ owner, activeTasks: [task, secondTask], completedTasks: [] });
  });

  test("deletes only the selected active task", async () => {
    await listing.addTask(input);
    await listing.addTask({ owner, task: secondTask });
    expect(await listing.deleteTask(input)).toEqual({ task });
    expect(await list()).toEqual({ owner, activeTasks: [secondTask], completedTasks: [] });
  });

  test("completes a task by moving it from active to completed", async () => {
    await listing.addTask(input);
    await listing.addTask({ owner, task: secondTask });
    expect(await listing.completeTask(input)).toEqual({ task });
    expect(await list()).toEqual({ owner, activeTasks: [secondTask], completedTasks: [task] });
    await listing.addTask(input);
    expect(await list()).toEqual({ owner, activeTasks: [secondTask], completedTasks: [task] });
  });

  for (const action of ["deleteTask", "completeTask"] as const) {
    for (const state of ["completed", "deleted", "nonexistent"] as const) {
      test(`${action} refuses a ${state} task without changing state`, async () => {
        await listing.addTask({ owner, task: secondTask });
        if (state !== "nonexistent") {
          await listing.addTask(input);
          if (state === "completed") await listing.completeTask(input);
          else await listing.deleteTask(input);
        }
        const before = await list();
        await expect(listing[action](input)).rejects.toBeInstanceOf(NoSuchTask);
        expect(await list()).toEqual(before);
      });
    }
    test(`${action} cannot affect another owner's tasks`, async () => {
      await listing.initialize({ owner: "bob" });
      await listing.addTask({ owner: "bob", task });
      await expect(listing[action](input)).rejects.toBeInstanceOf(NoSuchTask);
      expect((await listing._viewTasks({ owner: "bob" })).taskList.activeTasks).toEqual([task]);
    });
  }

  test("all mutations refuse an uninitialized owner", async () => {
    for (const action of ["addTask", "deleteTask", "completeTask"] as const) {
      await expect(listing[action]({ owner: "unknown", task })).rejects.toBeInstanceOf(NoSuchUser);
    }
  });

  test("a completion/delete race has exactly one winner", async () => {
    await listing.addTask(input);
    const results = await Promise.allSettled([listing.completeTask(input), listing.deleteTask(input)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const failure = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(failure.reason).toBeInstanceOf(NoSuchTask);
    expect((await list()).activeTasks).toEqual([]);
  });
});

function request(path: string, body: unknown, cookie?: string) {
  return new Request(`http://localhost:3000/api${path.startsWith("/") ? path : `/tasklists/${path}`}`, {
    method: "POST", headers: { "Content-Type": "application/json", Origin: "http://localhost:3000", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
function handler() {
  const application = assembleApplication(storage);
  return createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy("http://localhost:3000") });
}
async function cookie(subject: string) {
  const response = await handler()(new Request("http://localhost:3000/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ username: subject, password: "a secure test password" }),
  }));
  expect(response.status).toBe(200);
  return response.headers.get("Set-Cookie")!.split(";")[0];
}

describe("Authenticated task endpoints", () => {
  test("view, add, complete, and delete through the generated API routes", async () => {
    const handle = handler();
    const session = await cookie(owner);
    expect(await (await handle(request("view", {}, session))).json()).toEqual({ list: { activeTasks: [], completedTasks: [] } });
    const first = await handle(request("/tasks/make", { name: task }, session));
    const second = await handle(request("/tasks/make", { name: secondTask }, session));
    expect(first.status).toBe(200); expect(second.status).toBe(200);
    const firstId = (await first.json()).task;
    const secondId = (await second.json()).task;
    expect((await handle(request("complete", { task: firstId }, session))).status).toBe(200);
    expect((await handle(request("delete", { task: secondId }, session))).status).toBe(200);
    const current = await handler()(request("view", {}, session));
    const body = await current.json();
    expect(body.list.activeTasks).toEqual([]);
    expect(body.list.completedTasks.map((row: { details: { name: string } }) => row.details.name)).toEqual([task]);
    expect((await handle(request("delete", { task: firstId }, session))).status).toBe(404);
    expect((await handle(request("complete", { task: firstId }, session))).status).toBe(404);
  });

  test("requires login, validates inputs, and rejects owner spoofing", async () => {
    const handle = handler();
    for (const route of ["view", "delete", "complete"]) {
      expect((await handle(request(route, route === "view" ? {} : { task }))).status).toBe(401);
    }
    const alice = await cookie(owner);
    expect((await handle(request("/tasks/make", { name: 123 }, alice))).status).toBe(400);
    expect((await handle(request("complete", { task: [] }, alice))).status).toBe(400);
    expect((await handle(request("/tasks/make", { name: task, owner: "bob" }, alice))).status).toBe(400);
    await listing.addTask(input);
    const bob = await cookie("bob");
    await handle(request("view", {}, bob));
    expect((await handle(request("delete", { task }, bob))).status).toBe(404);
    expect((await handle(request("complete", { task }, bob))).status).toBe(404);
    expect((await list()).activeTasks).toEqual([task]);
  });
});


describe("TaskListing operational principle sequence", () => {
  test("initialize, add, complete, reopen, complete again, and delete another task", async () => {
    expect(await listing.initialize({ owner })).toEqual({ owner });
    await listing.addTask(input); await listing.addTask({ owner, task: secondTask });
    expect(await list()).toEqual({ owner, activeTasks: [task, secondTask], completedTasks: [] });
    await listing.completeTask(input);
    expect(await list()).toEqual({ owner, activeTasks: [secondTask], completedTasks: [task] });
    await listing.reopenTask(input); await listing.reopenTask(input);
    expect(await list()).toEqual({ owner, activeTasks: [secondTask, task], completedTasks: [] });
    await listing.completeTask(input); await listing.deleteTask({ owner, task: secondTask });
    const before = await database.collection("taskLists").find({}).toArray();
    await expect(listing.completeTask(input)).rejects.toBeInstanceOf(NoSuchTask);
    await expect(listing.deleteTask({ owner, task: secondTask })).rejects.toBeInstanceOf(NoSuchTask);
    await expect(listing.reopenTask({ owner: "unknown", task })).rejects.toBeInstanceOf(NoSuchUser);
    expect(await database.collection("taskLists").find({}).toArray()).toEqual(before);
    expect(await list()).toEqual({ owner, activeTasks: [], completedTasks: [task] });
  });
});
