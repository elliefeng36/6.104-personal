# Taskmaster

This increment implements authentication, task creation/editing, per-user task lists, and suggestions with
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
After login, enter a name and select **Create task**. Deadline, duration in
minutes, and recurring period in days are optional. Active tasks have **Edit**,
**Complete**, and **Delete** buttons. Editing uses the same form; blank optional
fields clear their values. Completed tasks remain visible and can also be edited.
Task details and lists persist across reloads and server restarts.
Recurring settings are stored; automatic regeneration of recurring tasks is
future work. Former dummy memberships are hidden without modifying stored lists.

Use **Suggest a task** above the task form for manual testing:

- Leave the time available blank to consider every active task.
- Enter minutes to consider tasks whose effective durations fit (an exact fit counts).
- Missing estimates count as zero; a zero limit includes them and zero-duration tasks.
- The earliest deadline wins; overdue tasks come first, undated tasks last, and
  addition order breaks ties.
- An empty list and a list with no fitting tasks show different helpful messages.
- Negative or nonnumeric input shows an error directly below the suggestion button.

Suggestions do not complete or modify tasks. Editing, deleting, or completing a
task changes subsequent suggestions. Clear the time limit to test the no-limit
case again. Only your own active tasks are considered.
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
then composes list viewing, deleting, and completing. The concept treats
Tasks as opaque identities. Completion/deletion use atomic MongoDB updates.
`src/concepts/TaskSetting.ts` owns the real Task records, validates their fields,
and applies atomic edits. `src/compositions/Tasks.ts` connects creation to list
membership and exposes owner-checked edits. The list former joins memberships
to TaskSetting details instead of displaying placeholder identities.

`src/concepts/TaskSuggesting.ts` owns suggestion requests and ranks a supplied
candidate snapshot. `src/compositions/TaskSuggestions.ts` reads owner-filtered
task details and list memberships, then uses the pure computation in
`suggestion-candidates.ts` to join them. The suggesting concept never reads
another concept's collection or imports its implementation. MongoDB retains
request constraints/outcomes and chosen identities, without copying task metadata.

The checked design selects all five implemented concepts through `design/types.md`.
Earlier specifications and the original type inventory are preserved under
`design/drafts/` and are not checked as part of the assembled application.
Time-dependent concept operations take an explicit flow instant supplied by
composition through sync-engine's `now(...)`, rather than reading their own clocks.
Public origin defaults to `http://localhost:3000`;
set `PORT`, `HOST`, and `PUBLIC_ORIGIN` consistently if using another address.
