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

## TaskSetting increment

Plan: implement TaskSetting and verify name-only creation, all combinations of
optional fields, invalid inputs, and subsequent changes; then compose task
creation with TaskListing, join records in list responses, and replace the Vue
sample selector with create/edit forms.

TaskSetting owns stable UUID task identities and their details. TaskListing
continues to own only memberships. The composition creates details and adds the
returned identity to the active list; a former joins list identities to records
using owner-filtered queries. Old dummy memberships without detail records are
omitted without deleting historical data.

Durations use minutes and recurring periods use days. Deadlines are stored as
UTC ISO strings and shown/edited in local time. Creation treats absent or null
optional fields as unset. Atomic edit patches leave omitted fields unchanged;
null clears optional values and their flags. Only newly assigned deadlines must
be future, allowing edits to other fields after a deadline has passed. The
original specification was extended with name editing, duration removal, and
multi-field edits. All setters and reads now explicitly take the owner so the
concept enforces ownership without knowing about sessions.

Validation: 66 tests pass, including all optional-field
combinations, invalid dates/numbers/names, no partial edits on failure,
individual setters/removers, ownership, persistence, and authenticated endpoint
flows. Existing authentication and task-list tests still pass. The sync-engine
design/artifact checks, TypeScript check, and browser build pass. Browser checks
confirmed name-only creation and subsequent editing of name, deadline, duration,
and recurrence. Recurring settings do not yet generate repeated task instances;
TaskSuggesting and actual recurrence behavior remain future work.

## sync-engine structure audit

Reread the installed 1.1.0 design, authoring, public API, specification, and
execution-semantics documentation. The concepts were independent and connected
through composition. Corrected time handling to explicit flow instants supplied
by now(instant), consolidated active bindings in design/types.md, separated
unimplemented design drafts, and removed the browser's direct concept-type
import in favor of generated wire types. Added architecture and timestamp
regressions. See sync-engine-audit.md for the full review and remaining advisory
diagnostics.

## TaskSuggesting increment

Plan: define deadline ranking and optional time-budget behavior, implement the
concept with refusal/empty outcomes, test its rules against MongoDB, compose
current task/list snapshots without peer concept calls, then add a Vue control
for manual testing.

TaskSuggesting stores requests and their latest chosen identity/outcome. It
accepts a transient pool containing opaque task identities and ranking metadata.
Unlike the original draft, it has no external TaskList whose fields it inspects.
The application reads TaskListing and TaskSetting snapshots and joins them with
a named pure computation. This is declared in the composition specification;
TaskSuggesting does not import either peer. Candidate metadata is never persisted
as copied state. Requests remain stored with their last result.

No limit includes unknown durations; a limit excludes them, requires a finite
nonnegative duration at most the available minutes, and includes an exact fit.
Zero and fractional limits are valid. Ranking prefers earliest deadlines,
including overdue ones, then undated tasks; addition order breaks ties. Empty
candidate pools produce EMPTY_TASKLIST, while nonempty pools with no fitting
candidate produce NO_VIABLE_TASKS. Both are successful empty results; malformed,
negative, or nonfinite time limits are invalid requests.

Vue offers an optional time-available field, a suggestion button, result details,
and distinct inline validation/empty-result messages. Task edits and membership
changes clear stale suggestions. Manual tests can use blank, exact-fit, zero,
negative, nonnumeric, and too-small limits.

Validation: all 96 tests pass (323 assertions), including 24 suggestion tests
and the expanded concept-import boundary checks. Config-based sync-engine
checking, generated artifacts, TypeScript, the design grammar check, and the
browser build pass. Browser checks verified no-limit priority, exact-fit
selection, empty-list feedback, no-fitting-task feedback, and inline invalid
input feedback using a separate local demo account.
