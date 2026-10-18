// Tests credentials, sessions, and authentication endpoints.
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { MongoClient } from "mongodb";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { assembleApplication } from "../src/assembly.ts";
import { authenticationPolicy } from "../src/edge.ts";
import { authenticationStorage } from "../src/storage.ts";
import { AuthenticatingConcept, InvalidCredentials, InvalidUsername, UsernameTaken, WeakPassword, type Account } from "../src/concepts/Authenticating.ts";
import { SessioningConcept, UnknownSession } from "../src/concepts/Sessioning.ts";

const url = process.env.TEST_MONGODB_URL ?? process.env.MONGODB_URL;
if (!url) throw new Error("Set TEST_MONGODB_URL or MONGODB_URL to run MongoDB integration tests.");
const mongo = new MongoClient(url, { serverSelectionTimeoutMS: 5000 });
// An isolated database: tests never clear the application's collections.
const database = mongo.db(`taskmaster_auth_test_${crypto.randomUUID().replaceAll("-", "")}`);
let storage: Awaited<ReturnType<typeof authenticationStorage>>;
const credentials = { username: "alice", password: "a secure test password" };

beforeAll(async () => {
  await mongo.connect();
  storage = await authenticationStorage(database);
});
beforeEach(async () => {
  await database.collection("accounts").deleteMany({});
  await database.collection("sessions").deleteMany({});
});
afterAll(async () => {
  try { await database.dropDatabase(); } finally { await mongo.close(); }
});

describe("Authenticating with MongoDB", () => {
  test("registers, hashes passwords, and survives new concept instances", async () => {
    expect(await storage.Authenticating.register(credentials)).toEqual({ account: "alice" });
    const saved = await database.collection("accounts").findOne({ username: "alice" });
    expect(saved?.passwordVerifier).toStartWith("$argon2id$");
    expect(saved).not.toHaveProperty("password");
    const restarted = new AuthenticatingConcept(database.collection<Account>("accounts"));
    expect(await restarted.authenticate(credentials)).toEqual({ account: "alice" });
    expect(await restarted._registered({ username: "alice" })).toEqual({ registered: true });
  });

  test("refuses invalid usernames and weak passwords", async () => {
    await expect(storage.Authenticating.register({ ...credentials, username: "a!" })).rejects.toBeInstanceOf(InvalidUsername);
    await expect(storage.Authenticating.register({ ...credentials, password: "short" })).rejects.toBeInstanceOf(WeakPassword);
  });

  test("a unique index prevents concurrent duplicate registrations", async () => {
    const results = await Promise.allSettled([
      storage.Authenticating.register(credentials), storage.Authenticating.register(credentials),
    ]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    const refusal = results.find(result => result.status === "rejected") as PromiseRejectedResult;
    expect(refusal.reason).toBeInstanceOf(UsernameTaken);
  });

  test("unknown accounts and wrong passwords refuse with the same error", async () => {
    await storage.Authenticating.register(credentials);
    await expect(storage.Authenticating.authenticate({ ...credentials, password: "wrong password" })).rejects.toBeInstanceOf(InvalidCredentials);
    await expect(storage.Authenticating.authenticate({ ...credentials, username: "unknown" })).rejects.toBeInstanceOf(InvalidCredentials);
  });
});

describe("Sessioning with MongoDB", () => {
  test("persists hashed tokens, expires sessions, and rejects invented tokens", async () => {
    let now = new Date();
    const sessions = new SessioningConcept(database.collection("sessions"));
    const issued = await sessions.start({ instant: now, subject: "alice" });
    const saved = await database.collection("sessions").findOne({ subject: "alice" });
    expect(saved?.tokenHash).not.toBe(issued.session);
    expect(await storage.Sessioning.current({ instant: new Date(), session: issued.session })).toEqual({ subject: "alice" });
    await expect(sessions.current({ instant: now, session: "invented" })).rejects.toBeInstanceOf(UnknownSession);
    now = issued.expiresAt;
    expect(await sessions._active({ instant: now, session: issued.session })).toEqual([]);
    await expect(sessions.current({ instant: now, session: issued.session })).rejects.toBeInstanceOf(UnknownSession);
  });

  test("logout revokes only the presented session", async () => {
    const first = await storage.Sessioning.start({ instant: new Date(), subject: "alice" });
    const second = await storage.Sessioning.start({ instant: new Date(), subject: "alice" });
    await storage.Sessioning.end({ instant: new Date(), session: first.session });
    await expect(storage.Sessioning.current({ instant: new Date(), session: first.session })).rejects.toBeInstanceOf(UnknownSession);
    expect(await storage.Sessioning.current({ instant: new Date(), session: second.session })).toEqual({ subject: "alice" });
  });
});

function handler() {
  const application = assembleApplication(storage);
  return createHttpHandler({ application, gateway: createGateway({ application }), policy: authenticationPolicy("http://localhost:3000") });
}
function request(path: string, body: unknown = {}, cookie?: string, origin = "http://localhost:3000") {
  return new Request(`http://localhost:3000/api/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

describe("sync-engine HTTP authentication", () => {
  test("register → restore session → logout → login, with cookie-only credentials", async () => {
    const handle = handler();
    const registered = await handle(request("register", credentials));
    expect(registered.status).toBe(200);
    expect(await registered.json()).toEqual({ account: "alice" });
    const setCookie = registered.headers.get("Set-Cookie")!;
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Strict");
    const cookie = setCookie.split(";")[0];
    // Reassemble to prove credentials and sessions survive application recreation.
    const restarted = handler();
    const current = await restarted(request("current", {}, cookie));
    expect(await current.json()).toEqual({ username: "alice" });
    const logout = await restarted(request("sign-out", {}, cookie));
    expect(await logout.json()).toEqual({ signedOut: true });
    expect(logout.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect((await restarted(request("current", {}, cookie))).status).toBe(401);
    expect((await restarted(request("sign-in", credentials))).status).toBe(200);
  });

  test("rejects missing cookies, forged session bodies, malformed input, and foreign origins", async () => {
    const handle = handler();
    expect((await handle(request("current"))).status).toBe(401);
    expect((await handle(request("current", { session: "forged" }))).status).toBe(401);
    expect((await handle(request("register", { username: 123, password: [] }))).status).toBe(400);
    expect((await handle(request("register", credentials, undefined, "http://evil.example"))).status).toBe(403);
    expect((await handle(request("sign-in", credentials))).status).toBe(401);
  });
});
