# Taskmaster

Taskmaster helps users organize recurring and one-time tasks and choose what to do next based on deadlines and available time. It uses Vue 3, sync-engine 1.1.0, and MongoDB.

## Project materials

- [Live app](https://taskmaster.mit-sdg.dev)
- [Design document](../P1/design-doc.md) and [updated user journey](../P3/user-journey.md)
- [Concept specifications](design/concepts/) and [composition specifications](design/compositions/)
- [Backend](src/) and [Vue frontend](frontend/src/)
- [Automated tests](tests/) and [saved execution output](test-output.txt)
- [Alpha demo](https://drive.google.com/file/d/1zh1_5g7yUOdYGMkeVhfxKdMBvl0c_zEk/view?usp=sharing) and [beta demo](https://drive.google.com/file/d/1WQ57kmlsYbzzBrMqZLSlMXXqOCppYlE-/view?usp=sharing)

## Local setup

Install Bun 1.4.2 and Podman. Run all commands below from the **repository root** (the folder containing `taskmaster/`).

```sh
bun install
bun install --cwd taskmaster
bun install --cwd taskmaster/frontend
```

Copy `taskmaster/env.example` to `taskmaster/.env` if it does not exist. Start MongoDB:

```sh
podman machine start
bun run --cwd taskmaster db:up
```

For your first Podman setup, run `podman machine init` before starting it. Alternatively, use an existing MongoDB server and set `MONGODB_URL` in `taskmaster/.env`. Keep `.env` out of git.

## Build and run

```sh
bun run build
bun run start
```

Open [localhost:3000](http://localhost:3000/) and create an account. Check [/health](http://localhost:3000/health) for database and frontend availability. Stop the server with Ctrl+C.

For development, run `bun run dev` and `bun run dev:frontend` in separate terminals, then open [localhost:5173](http://localhost:5173/). If changing the browser address, set `PUBLIC_ORIGIN` to that exact origin; `localhost` and `127.0.0.1` are different origins.

## Automated tests

Complete the database setup above, then run:

```sh
bun run test
bun run check
```

Tests use Bun assertions to check concepts, HTTP flows, access control, and error cases. They create and drop isolated temporary databases without changing app data; the app server need not run. To use a separate test server, set `TEST_MONGODB_URL`. The database account must have permission to create and drop test databases.

To refresh [saved test output](test-output.txt) in PowerShell:

```powershell
cd taskmaster
bun test 2>&1 | Tee-Object -FilePath test-output.txt
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
```

Commit the saved output with test changes. From the repository root, `bun run generate` refreshes generated contracts after concept or composition changes.

## Deployment

Follow the [class deployment guide](https://61040.github.io/fa26/resources/deploying-apps/). Use Bun, package directories `.`, `taskmaster`, and `taskmaster/frontend` (one per line), build script `build`, start script `start`, port `3000`, and health path `/health`. Set `MONGODB_URL` to the platform database connection string and `PUBLIC_ORIGIN` to the deployed app's HTTPS origin.
