# 6.104-personal

[Design Document](P1/design-doc.md)

[Alpha Demo](https://drive.google.com/file/d/1zh1_5g7yUOdYGMkeVhfxKdMBvl0c_zEk/view?usp=sharing)

[Beat Demo](https://drive.google.com/file/d/1WQ57kmlsYbzzBrMqZLSlMXXqOCppYlE-/view?usp=sharing)

## Taskmaster

Project materials:

- [Backend code](taskmaster/src/) and [Vue frontend](taskmaster/frontend/src/)
- [Concept and composition specifications](taskmaster/design/)
- [Automated Bun tests](taskmaster/tests/)
- [Saved test execution output](taskmaster/test-output.txt)
- [Test instructions and database setup](taskmaster/README.md#automated-tests)
- [Updated P3 user journey](P3/user-journey.md)

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
