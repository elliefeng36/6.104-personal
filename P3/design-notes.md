# Recurring tasks

Recurrence starts when enabled and continues independently of completion. Changing
its interval resets the anchor to the edit time. The frontend offers daily,
weekly, monthly, and custom positive day intervals. Calendar months retain the
original UTC day and time, clamping shorter months and recovering the anchor day
in subsequent months. Daily and weekly periods are fixed 24-hour days.

TaskSetting owns dates and durable schedules. A release reaction reopens the task
through TaskListing and acknowledges the cycle. Unfinished tasks remain a single
active entry; deleted tasks are never resurrected. Missed cycles coalesce, and
nextOccurrenceAt remains on the anchored cadence. Deadlines retain a separate
anchor so monthly deadline changes do not drift after February. Restart retries
are idempotent. The host checks every second and the client polls every five.

All 152 tests pass, covering recurrence, monthly dates, independent completion,
validation, ownership, restart recovery, and HTTP integration. The 13
sync-engine advisories remain. Full output is saved in test-output.txt.

## Sorting and filtering

TaskSorting and TaskFiltering are independent stateless concepts over an external
Task type. They return new arrays using caller-supplied callables without retaining
task data. Application compositions authenticate sessions, join owned task details
to current list membership, and supply comparator and predicate computations.

Vue offers original order, earliest due date, shortest duration, recurrence selection,
and an inclusive maximum duration. Missing sort fields go last; unknown durations
count as zero for filtering. Both Active and Completed lists use the options. Task
suggestions use the same recurrence and maximum-duration filters. Browser verification covered duration
sorting and combined recurrence/duration filtering. Source/design checks, TypeScript,
the frontend build, and all 152 tests pass; 13 advisories remain.
