# Concept tests

Run from `taskmaster/` with `bun test`. Set `TEST_MONGODB_URL` (or
`MONGODB_URL`) to the local MongoDB connection. Each database-backed test file
creates a uniquely named database and drops only that database afterward.
Assertions check returned values, expected error classes, input preservation,
and persisted records; the printed log is only a saved record of the run.
Full test output is in `P3/test-output.txt`.

## Action coverage

All 25 public actions of the seven completed concepts execute in Bun tests.
Underscore-prefixed methods are queries, not actions; tests also use them to
observe results. Private helpers are not concept actions.

| Concept | Actions executed | Tests |
| --- | --- | --- |
| Authenticating | register, authenticate | auth.test.ts |
| Sessioning | start, current, end | auth.test.ts |
| TaskListing | initialize, addTask, deleteTask, completeTask, reopenTask | tasklisting.test.ts, recurrences.test.ts |
| TaskSetting | makeTask, updateTask, setName, setDeadline, removeDeadline, setDuration, removeDuration, startRecurring, stopRecurring, releaseOccurrence, acknowledgeOccurrence | tasksetting.test.ts, recurrences.test.ts |
| TaskSuggesting | makeRequest, makeSuggestion | tasksuggesting.test.ts |
| TaskSorting | sort | task-transforms.test.ts |
| TaskFiltering | filter | task-transforms.test.ts |

## Operational principles and additional scenarios

- **Authenticating:** register and authenticate with persisted hashed credentials.
  Repeat authentication and duplicate registration, test a concurrent registration
  race, and reject invalid usernames, short/long passwords, unknown accounts, and
  wrong passwords. Rejections preserve all existing account records and verifiers.
- **Sessioning:** start a session, check it repeatedly, end it, then reject reuse.
  Independent sessions remain valid. Check expiration exactly at its boundary;
  invented, expired, and already-ended sessions report UnknownSession without
  changing persisted sessions on failure.
- **TaskListing:** initialize, add tasks, complete, reopen, complete again, and
  delete another task. Test repeated initialization, addition, and reopening;
  deleted/missing/completed task refusals; owner isolation; and a completion/delete
  race. Expected NoSuchTask/NoSuchUser refusals preserve list membership.
- **TaskSetting:** create details, change fields individually and atomically, then
  clear optional values. Tests cover every optional-field combination, repeated
  removals, invalid field edits, missing tasks, and ownership. Recurrence tests
  schedule, release, and acknowledge occurrences; cover fixed cadence, monthly
  clamping, cancellation, stale cycles, repeated cycles, and restart recovery.
  Invalid multi-field patches and individual setters preserve the prior record.
- **TaskSuggesting:** create a request and make a suggestion with and without a
  budget. Repeat the action and move the same request through suggested, no-fit,
  empty-list, and suggested outcomes. InvalidTimeLimit and UnknownSuggestRequest
  leave existing requests and their successful results unchanged.
- **TaskSorting:** supply a task list and comparator, check stable ordering, reverse
  the comparator, and repeat. Empty lists, ties, and missing sort fields are
  covered. A noncallable comparator rejects with TypeError; callback errors are
  propagated by identity. Failures leave the input unchanged, and a later valid
  action succeeds. These are JavaScript argument/callback errors, not domain
  refusal codes; the HTTP boundary separately rejects unsupported sort options.
- **TaskFiltering:** supply a list and predicate, change predicates, and repeat.
  Cover empty lists, all/no matches, duplicates, order preservation, recurrence,
  inclusive/fractional/zero duration limits, and missing estimates. A noncallable
  predicate rejects with TypeError; callback errors propagate without altering
  input. HTTP tests reject invalid filter options and unauthorized requests.

Composition tests additionally verify that transformations use current owned
records, exclude deleted/missing/other-owner tasks, preserve stored membership,
and handle Active and Completed lists independently.
