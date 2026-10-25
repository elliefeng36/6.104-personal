// Checks the same access rules across every protected HTTP endpoint.
import { afterAll, beforeAll, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { applicationStorage } from "../src/storage.ts";
import { authenticationPolicy } from "../src/edge.ts";

const url = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (!url) throw new Error("Set TEST_MONGODB_URL or MONGODB_URL.");
const mongo = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
const database = mongo.db(`taskmaster_access_test_${crypto.randomUUID().replaceAll("-", "")}`);
const origin = "https://taskmaster.example";
let instant = new Date("2035-01-01T12:00:00Z");
let handle: ReturnType<typeof createHttpHandler>;
let alice: string;
let bob: string;
let task: string;

function request(path: string, body: object = {}, cookie?: string, source = origin) {
  return new Request(`${origin}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: source, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}
async function snapshot() {
  const result: Record<string, unknown[]> = {};
  for (const name of ["accounts", "sessions", "taskLists", "tasks", "suggestRequests"]) {
    result[name] = await database.collection(name).find({}).sort({ _id: 1 }).toArray();
  }
  return result;
}
function endpoints(): Array<[string, object]> {
  return [
    ["/auth/current", {}], ["/auth/sign-out", {}],
    ["/tasks/make", { name: "Unauthorized creation" }],
    ["/tasks/update", { task, changes: { name: "Unauthorized edit" } }],
    ["/tasklists/view", {}], ["/tasklists/delete", { task }],
    ["/tasklists/complete", { task }], ["/taskSorting/view", {}],
    ["/taskFiltering/view", {}], ["/taskSuggestions/makeRequest", {}],
  ];
}
beforeAll(async () => {
  await mongo.connect();
  const application = assembleApplication(await applicationStorage(database), { clock: () => instant });
  handle = createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy(origin) });
  async function register(username: string) {
    const response = await handle(request("/auth/register", { username, password: "access-test-password" }));
    expect(response.status).toBe(200);
    const cookie = response.headers.get("Set-Cookie")!;
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    return cookie.split(";")[0]!;
  }
  alice = await register("alice"); bob = await register("bob");
  const created = await handle(request("/tasks/make", { name: "Alice private task" }, alice));
  expect(created.status).toBe(200);
  task = (await created.json()).task;
});
afterAll(async () => {
  try { await database.dropDatabase(); } finally { await mongo.close(); }
});

test("all protected endpoints reject missing, forged, expired, and revoked sessions without writes", async () => {
  const login = await handle(request("/auth/sign-in", { username: "alice", password: "access-test-password" }));
  const revoked = login.headers.get("Set-Cookie")!.split(";")[0]!;
  expect((await handle(request("/auth/sign-out", {}, revoked))).status).toBe(200);
  for (const cookie of [undefined, "taskmaster-session=invented", revoked, alice]) {
    if (cookie === alice) instant = new Date("2035-01-01T12:31:00Z");
    for (const [path, body] of endpoints()) {
      const before = await snapshot();
      const response = await handle(request(path, body, cookie));
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ error: "UNAUTHORIZED" });
      expect(await snapshot()).toEqual(before);
    }
  }
  instant = new Date("2035-01-01T12:00:00Z");
});

test("foreign origins and injected identities cannot use an otherwise valid session", async () => {
  for (const [path, body] of endpoints()) {
    const before = await snapshot();
    const foreign = await handle(request(path, body, bob, "https://foreign.example"));
    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toMatchObject({ error: "FORBIDDEN" });
    for (const field of ["owner", "user", "subject"]) {
      const injected = await handle(request(path, { ...body, [field]: "alice" }, bob));
      expect(injected.status).toBe(400);
    }
    expect(await snapshot()).toEqual(before);
  }
});

test("another user's task stays private and cannot be edited, completed, or deleted", async () => {
  for (const path of ["/tasks/update", "/tasklists/complete", "/tasklists/delete"]) {
    const before = await snapshot();
    const response = await handle(request(path, { task, ...(path === "/tasks/update" ? { changes: { name: "Stolen" } } : {}) }, bob));
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: "NOT_FOUND" });
    expect(await snapshot()).toEqual(before);
  }
  for (const path of ["/taskSorting/view", "/taskFiltering/view"]) {
    const response = await handle(request(path, {}, bob));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ tasks: [] });
  }
  const suggestion = await handle(request("/taskSuggestions/makeRequest", {}, bob));
  expect(await suggestion.json()).toEqual({ suggestion: { task: null, outcome: "EMPTY_TASKLIST" } });
});
