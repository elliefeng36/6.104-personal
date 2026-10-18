# Taskmaster

This increment implements authentication and per-user task lists with
sync-engine 1.1.0, MongoDB, and a small Vue 3 frontend.

## Run locally

From `taskmaster/`:

1. Run `bun install`.
2. Copy `env.example` to `.env` if you do not already have one.
3. Start Podman (`podman machine start`), then run `bun run db:up`.
   Alternatively, use an existing MongoDB server and set `MONGODB_URL` in `.env`.
4. Run `bun run start`, then visit http://localhost:3000.

Choose **New here? Create an account**, then log out and log back in. Reloading
the page restores an unexpired session. Usernames are case-sensitive.
After login, choose a fixed sample task and select **Add sample task**. Active
tasks have **Complete** and **Delete** buttons. Completed tasks remain visible
without action buttons. Lists persist across reloads and server restarts.
These are dummy Task identities; TaskSetting and task creation/editing are still
future work. Adding an already active or completed sample does not duplicate or
reactivate it. A deleted sample can be added again.
`bun run dev` restarts the server when source files change; reload the browser
after frontend changes. The backend serves both the frontend and `/api`.

## Verify

- `bun run generate` regenerates the read-back and typed browser contract.
- `bun run check` validates the selected design, generated files, and TypeScript.
- `bun run build:web` checks the browser bundle.
- `bun test` tests concepts and HTTP flows against MongoDB using a uniquely named
  temporary database, deleted afterward. Use `TEST_MONGODB_URL` to select a
  separate test server; otherwise tests use `MONGODB_URL`.

## Structure

`src/concepts/Authenticating.ts` stores Argon2id password verifiers;
`Sessioning.ts` stores hashed random tokens with a 30-minute expiry.
`src/compositions/Sessions.ts` connects those independent concepts through four
sync-engine endpoints. `src/edge.ts` applies the framework's HttpOnly cookie and
origin protection. Browser code uses `generated/wire.ts` through the typed HTTP
client, so session tokens stay out of JavaScript storage and JSON responses.

`src/concepts/TaskListing.ts` maintains separate active and completed task sets
for each owner. `src/compositions/TaskLists.ts` resolves owners from sessions,
then composes list viewing, adding, deleting, and completing. The concept treats
Tasks as opaque strings; only the application restricts additions to dummy tasks
defined in `src/dummy-tasks.ts`. Completion/deletion use atomic MongoDB updates.

The checked design selects authentication, sessions, and TaskListing through
`design/auth-types.md`. TaskSetting and TaskSuggesting remain drafts until their
implementations are added. Public origin defaults to `http://localhost:3000`;
set `PORT`, `HOST`, and `PUBLIC_ORIGIN` consistently if using another address.
