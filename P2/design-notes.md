# P2 design notes

## Authentication increment

Plan: first connect MongoDB-backed credential and session concepts; next compose
registration, login, current-user lookup, and logout with sync-engine; then add
a minimal Vue form using the generated client. Evaluate the concepts with
storage tests and the composition through its HTTP boundary, then check the
specifications and browser build.

The implementation follows the sync-engine 1.1.0 message-board example's
separation of Authenticating from Sessioning. The composition alone connects
an authenticated account to a session subject. Unlike the example's in-memory
storage, accounts and sessions persist in MongoDB. Passwords use Bun's Argon2id
hashing; random session tokens are hashed in storage. MongoDB unique indexes
prevent duplicate usernames under concurrent registration. Session expiry is
checked on reads as well as by MongoDB's eventual TTL cleanup.

The Vue form supports account creation because the user journey must work from
an empty database. Cookie policy owns session credentials; browser code never
supplies an account identity for current-user resolution. The current design
configuration selects only this implemented increment, keeping existing task
concept drafts out of the assembled contract until they are implemented.

The existing development scripts referenced missing frontend/server and compose
files. A single Bun server now serves Vue and the API, and a MongoDB-only compose
file supports the existing database scripts.

Validation: all eight MongoDB-backed concept and HTTP tests pass (32 assertions).
The sync-engine design/artifact checks, TypeScript check, and Vue browser bundle
pass. Browser verification confirmed the login form renders and rejected
credentials produce an inline error without a page refresh.

Remaining work: implement the task journey and its ownership checks, task
listing/setting/suggesting compositions, and the task frontend; prepare the
narrated demonstration. Password recovery and login throttling are not included
in this local authentication increment.

## TaskListing increment

Plan: implement and test TaskListing using dummy Task identities first; expose
session-protected endpoints; then add a basic Vue list with add-sample, delete,
and complete controls. Real task records and metadata remain TaskSetting's work.

TaskListing owns the membership of its user lists, so an explicit idempotent
initialize action creates an empty list. The application invokes it after
resolving a session during viewing or adding; the concept never calls
Authenticating. This supports both existing accounts and new accounts without
resetting a list on login. Reading an uninitialized owner's list returns empty
without writing state, while mutations refuse an uninitialized owner.

Three fixed sample names temporarily represent opaque Task identities. They are
shared by the frontend and the application's add validator; TaskListing itself
does not know their meanings. Adding a listed task is idempotent, including
completed tasks, to preserve disjoint active/completed sets. Deleted samples can
be added again. MongoDB's unique owner index and atomic conditional updates
support separate users and prevent competing deletes/completions from both
succeeding. Endpoints always derive the owner from the session, rejecting
client-supplied ownership fields.

Validation: 24 MongoDB-backed tests pass, including 16 task-list tests covering
adding, deleting, completing, duplicate additions, inactive/nonexistent tasks,
unknown users, ownership, persistence, concurrent mutation, input validation,
and authenticated HTTP flows. Browser checks confirmed add, complete, delete,
and persistence after reload. TypeScript, sync-engine design/artifact checks,
and the browser build pass. The endpoint tests obtain the real registration
cookie rather than assuming the framework's effective cookie name.
