# Taskmaster

This increment implements authentication, task creation/editing, per-user task lists, and suggestions with
sync-engine 1.1.0, MongoDB, and a small Vue 3 frontend.

## Run locally

From the repository root (the folder containing `taskmaster/`):

1. Run `bun install`, `bun install --cwd taskmaster`, and
   `bun install --cwd taskmaster/frontend`. Each package has its own `bun.lock`.
2. Copy `taskmaster/env.example` to `taskmaster/.env` if needed.
3. Start Podman (`podman machine start`), then run `bun run --cwd taskmaster db:up`.
   Alternatively, use an existing MongoDB server and set `MONGODB_URL` in that `.env`.
4. Run `bun run build`, then `bun run start`. Open http://localhost:3000.
   Check http://localhost:3000/health for `{ "status": "ok" }`.

For frontend hot reload, use two terminals from the repository root:
`bun run dev` starts the backend on port 3000 with the development public origin;
`bun run dev:frontend` starts Vite on http://localhost:5173 and proxies API requests.
Use the Vite address for this mode. The backend's production UI always serves the
last `bun run build` output. Stop both development processes before running
`bun run preview`, which starts the database, builds, and serves production mode
at http://127.0.0.1:3000 using matching cookie-origin settings.

Choose **New here? Create an account**, then log out and log back in. Reloading
the page restores an unexpired session. Usernames are case-sensitive.
After login, enter a name and select **Create task**. Deadline, duration in
minutes, and recurrence settings are optional. Active tasks have **Edit**,
**Complete**, and **Delete** buttons. Deletion asks for confirmation before sending a request. Editing uses the same form; blank optional
fields clear their values. Completed tasks remain visible and cannot be edited.
Task details and lists persist across reloads and server restarts.
Recurring tasks follow a schedule anchored when recurrence is enabled or changed, independent of completion. Choose daily, weekly, calendar monthly, or a custom number of days. Unfinished tasks remain one active entry. The same task ID is reused, and its deadline advances by whole
recurring periods until it is future. Tasks without deadlines gain no deadline.
Days are 24-hour intervals. Completed tasks display their scheduled return time.
The server checks every second and catches up after restart; the browser checks
for updated lists every five seconds. Stop recurrence by selecting **Does not repeat**. Deleting an active task does not schedule a return.

For a quick recurrence test, use `0.0001` days (about 8.6 seconds), create a task
with a future deadline, complete it, and watch it return with a later deadline.

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
Vite reloads frontend changes during development. Production serves the built
frontend and `/api` from the same backend and public origin.

## Verify

- `bun run generate` regenerates the read-back and typed browser contract.
- `bun run check` validates the selected design, generated files, and TypeScript.
- `bun run build` builds `frontend/dist` using Vite; `bun run check:frontend` runs Vue template/type checks.
- From the repository root, `bun run check` checks both backend and frontend.
- `bun test` tests concepts and HTTP flows against MongoDB using a uniquely named
  temporary database, deleted afterward. Use `TEST_MONGODB_URL` to select a
  separate test server; otherwise tests use `MONGODB_URL`.

The latest saved test execution is in `test-output.txt`.
To save a new execution in PowerShell, run `bun test 2>&1 | Tee-Object test-output.txt`.

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

`src/recurrences.ts` drives due TaskSetting occurrences. Re-adding to TaskListing
and acknowledging the cycle are sync-engine reactions in
`src/compositions/Recurrences.ts`. Persisted pending cycles make retries
idempotent: they cannot shift a deadline twice or duplicate a task in the list.

The checked design selects all seven implemented concepts through `design/types.md`.
Time-dependent concept operations take an explicit flow instant supplied by
composition through sync-engine's `now(...)`, rather than reading their own clocks.
Public origin defaults to `http://localhost:3000`;
set `PORT`, `HOST`, and `PUBLIC_ORIGIN` consistently if using another address.

### Sorting and filtering

The task-list controls sort both Active and Completed tasks by earliest due date
or shortest estimated duration. Missing values sort last; ties preserve membership
order. Original order restores the list's existing order.

Filters combine all/recurring/nonrecurring tasks with an optional inclusive maximum
duration in minutes. Missing duration estimates count as zero for filtering.
Filtering and sorting only change the displayed results, never stored tasks or
list membership. Suggestions use the same recurrence and maximum-duration filters.

TaskSorting and TaskFiltering are generic, stateless concepts accepting an external
Task array and a callable comparator or predicate. Their compositions authenticate
the user, supply owner-scoped task snapshots, and choose the application policies.
The browser sends named options rather than executable functions or task records.

## Frontend layout and class deployment

The frontend follows the class guide's Vue/Vite layout:

```text
frontend/
  package.json
  bun.lock
  index.html
  vite.config.ts
  tsconfig.app.json
  src/
    main.ts
    App.vue
```

`App.vue` contains the current interface, interaction state, and styles. Vite
compiles the component into `frontend/dist`; production never runs the Vite dev
server or builds files at startup. The backend serves static assets and the Vue
shell for page routes. `/health` checks MongoDB and the presence of the frontend
build. No concept or composition changed during this migration.

For the class platform, use these settings after committing and pushing:

| Setting | Value |
| --- | --- |
| Runtime | Bun (packageManager pins 1.4.2) |
| Package directories (one per line) | `.`, `taskmaster`, `taskmaster/frontend` |
| Build script | `build` |
| Start script | `start` |
| Port | `3000` |
| Health check path | `/health` |
| Database variable | `MONGODB_URL` |
| Public origin | `PUBLIC_ORIGIN=https://YOUR-APP.mit-sdg.dev` |

The repository root contains wrapper scripts because the backend is nested under
`taskmaster/`; each listed package directory contains its committed `bun.lock`.
The platform supplies HOST, PORT, and NODE_ENV. `client.db()` selects the database
from the connection string. Keep `.env` and `frontend/dist` out of git. Build uses
Bun explicitly, so the platform does not need Node.js to execute Vite.

See the [class deployment guide](https://61040.github.io/fa26/resources/deploying-apps/).
This prepares the source for deployment; it does not create or deploy a hosted app.
