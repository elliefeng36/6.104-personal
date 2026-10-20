// Starts the API server and serves the Vue frontend.
import { assembleApplication } from "./assembly.ts";
import { createGateway } from "@mit-sdg/sync-engine/boundary";
import { createHttpHandler } from "@mit-sdg/sync-engine-http/handler";
import { fileURLToPath } from "node:url";
import { client, db } from "./db.ts";
import { authenticationPolicy } from "./edge.ts";
import { applicationStorage } from "./storage.ts";
import { processRecurrences } from "./recurrences.ts";
import { createHostHandler } from "./hosting.ts";

await client.connect();
const application = assembleApplication(await applicationStorage(db));
// Catch up after downtime, then check periodically without overlapping passes.
let recurrenceBusy = false;
const checkRecurrences = async () => {
  if (recurrenceBusy) return;
  recurrenceBusy = true;
  try {
    await processRecurrences(application);
  } catch (error) {
    console.error("Could not process recurring tasks:", error);
  } finally {
    recurrenceBusy = false;
  }
};
await checkRecurrences();
const recurrenceTimer = setInterval(checkRecurrences, 1000);
const port = Number(process.env.PORT ?? 3000);
const hostname = process.env.HOST ?? "localhost";
const origin = process.env.PUBLIC_ORIGIN ?? `http://${hostname}:${port}`;
const handler = createHttpHandler({
  application,
  gateway: createGateway({ application }),
  policy: authenticationPolicy(origin),
});
const server = Bun.serve({
  hostname,
  port,
  fetch: createHostHandler({
    dist: fileURLToPath(new URL("../frontend/dist/", import.meta.url)),
    api: handler,
    checkDatabase: () => db.command({ ping: 1 }),
  }),
});
console.log(`Taskmaster listening at ${server.url}`);
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    clearInterval(recurrenceTimer);
    await server.stop(true);
    await application.whenIdle();
    await client.close();
    process.exit(0);
  });
}
