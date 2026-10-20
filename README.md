# 6.104-personal

[Design Document](P1/design-doc.md)

## Taskmaster

See [Taskmaster setup and deployment](taskmaster/README.md).
The backend is in `taskmaster/src/`; the Vue/Vite frontend is in
`taskmaster/frontend/`, with its own package manifest and Bun lockfile.

From this repository root:

```sh
bun install
bun install --cwd taskmaster
bun install --cwd taskmaster/frontend
bun run build
bun run start
```

Configure MongoDB first as described in the app README. The local app is served
at http://localhost:3000 and its deployment health check is `/health`.
Use `bun run check` for backend and frontend checks, and `bun run test` for the
Bun tests. Frontend development uses `bun run dev` and `bun run dev:frontend` in
separate terminals, with the browser at http://localhost:5173.
