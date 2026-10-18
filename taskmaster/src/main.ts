// Starts the API server and serves the Vue frontend.
import { assembleApplication } from "./assembly.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { fileURLToPath } from "node:url";
import { client, db } from "./db.ts";
import { authenticationPolicy } from "./edge.ts";
import { authenticationStorage } from "./storage.ts";

await client.connect();
const application = assembleApplication(await authenticationStorage(db));
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "localhost";
const origin = process.env.PUBLIC_ORIGIN ?? `http://${hostname}:${port}`;
const handler = createHttpHandler({
  application,
  gateway: createGateway({ application }),
  policy: authenticationPolicy(origin),
});
const bundle = await Bun.build({
  entrypoints: [fileURLToPath(new URL("../web/client.ts", import.meta.url))],
  target: "browser",
  minify: true,
  define: { __VUE_OPTIONS_API__: "true", __VUE_PROD_DEVTOOLS__: "false", __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false", "process.env.NODE_ENV": '"production"' },
});
if (!bundle.success) throw new Error(`Frontend build failed: ${bundle.logs.join("\n")}`);
const javascript = await bundle.outputs[0].text();
const html = await Bun.file(new URL("../web/index.html", import.meta.url)).text();
const server = Bun.serve({
  hostname, port,
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path.startsWith("/api/")) return handler(request);
    if (request.method !== "GET") return new Response("Method not allowed", { status: 405 });
    if (path === "/") return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    if (path === "/app.js") return new Response(javascript, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
    return new Response("Not found", { status: 404 });
  },
});
console.log(`Taskmaster listening at ${server.url}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => { await server.stop(true); await client.close(); process.exit(0); });
}
