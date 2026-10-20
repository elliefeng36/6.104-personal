// Tests production static serving and deployment health without a real database.
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createHostHandler } from "../src/hosting.ts";

let root: string;
let dist: string;
const request = (path: string, method = "GET") => new Request(`http://localhost:3000${path}`, { method });
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "taskmaster-hosting-"));
  dist = join(root, "dist");
  await mkdir(join(dist, "assets"), { recursive: true });
  await writeFile(join(dist, "index.html"), "<!doctype html><div id='app'>Taskmaster</div>");
  await writeFile(join(dist, "assets", "app-hash.js"), "console.log('app')");
  await writeFile(join(root, "private.txt"), "must not be served");
});
afterAll(async () => {
  // Only the freshly created test directory is removed.
  if (root.startsWith(join(tmpdir(), "taskmaster-hosting-"))) await rm(root, { recursive: true, force: true });
});
function handler(checkDatabase: () => Promise<unknown> = async () => undefined, folder = dist) {
  return createHostHandler({ dist: folder, checkDatabase, api: async () => Response.json({ api: true }) });
}
describe("Production host", () => {
  test("health checks the database and built frontend", async () => {
    let checked = 0;
    const response = await handler(async () => { checked++; })(request("/health"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
    expect(checked).toBe(1);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  test("an unavailable database or missing build fails health without exposing details", async () => {
    const response = await handler(async () => { throw new Error("private connection string"); })(request("/health"));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
    expect((await handler(undefined, join(root, "missing"))(request("/health"))).status).toBe(503);
  });
  test("API requests retain their handler rather than receiving the Vue shell", async () => {
    expect(await (await handler()(request("/api/tasklists/view", "POST"))).json()).toEqual({ api: true });
  });
  test("home and inner page routes serve the built Vue shell", async () => {
    for (const path of ["/", "/tasks", "/tasks/example"]) {
      const response = await handler()(request(path));
      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
      expect(await response.text()).toContain("Taskmaster");
      expect(response.headers.get("Cache-Control")).toBe("no-cache");
    }
  });
  test("hashed assets are served with their MIME type and immutable caching", async () => {
    const response = await handler()(request("/assets/app-hash.js"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("javascript");
    expect(response.headers.get("Cache-Control")).toContain("immutable");
    expect(await response.text()).toBe("console.log('app')");
    expect((await handler()(request("/assets/missing.js"))).status).toBe(404);
  });
  test("HEAD has no body and unsupported methods are rejected", async () => {
    expect(await (await handler()(request("/", "HEAD"))).text()).toBe("");
    expect(await (await handler()(request("/assets/app-hash.js", "HEAD"))).text()).toBe("");
    expect((await handler()(request("/tasks", "POST"))).status).toBe(405);
  });
  test("malformed paths and encoded directory traversal cannot expose private files", async () => {
    expect((await handler()(request("/%zz"))).status).toBe(400);
    expect((await handler()(request("/..%2fprivate.txt"))).status).toBe(403);
    expect((await handler()(request("/..%5cprivate.txt"))).status).toBe(403);
  });
});
