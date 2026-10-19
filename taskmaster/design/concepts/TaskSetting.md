# TaskSetting

## Purpose

Create and maintain task details independently of list membership.

## Principle

A user creates a task with only a name or with optional deadline, duration,
and recurring period. Later they can change the name, set or clear optional
fields, or update several fields atomically. Invalid changes leave every field
unchanged. Only the owner can update or read a task's details.

## Types

```types
external User
  The owner supplied by the application.
opaque Changes
  A partial record of name, deadline, duration, recurringPeriod, and recurringUnit. Omitted fields are unchanged; null clears optional fields. A null recurringUnit resets the unit to days for a recurring task.
opaque TaskRecords
  An array of full task detail records.
```

## State

```state
a set of Tasks with
  an owner User
  a name String
  a hasDeadline Flag
  an optional deadline String
  an optional duration Number
  an isRecurring Flag
  an optional recurringUnit String
  an optional recurringPeriod Number
  an optional nextOccurrenceAt String
  an optional recurrenceDeadlineAnchor String
  an optional recurrenceAnchor String
  an optional pendingRecurrence String
Rule: Deadlines are UTC ISO timestamps, future when assigned; durations are minutes. Recurring units are days (default) or whole calendar months. Monthly dates clamp to the last day while retaining the original anchor day. Schedules start when enabled and advance indefinitely regardless of completion; missed cycles coalesce.
Rule: hasDeadline reflects deadline presence; isRecurring reflects recurringPeriod presence. Recurring tasks keep a schedule anchor and next occurrence. recurrenceDeadlineAnchor preserves the original deadline day across shorter months. No recurrence unit is retained without a period.
```

## Actions

```actions
makeTask (owner: User, name: String, deadline?: String, duration?: Number, recurringPeriod?: Number, recurringUnit?: String, instant: DateTime) : returns (task: Task)
  where name is blank or longer than 200 characters
  then
    refuses EMPTY_NAME "Task name must contain 1 to 200 characters."
  where deadline is supplied and not a valid UTC timestamp later than instant
  then
    refuses INVALID_DEADLINE "The deadline must be a valid future UTC timestamp."
  where duration is supplied and not a finite nonnegative number
  then
    refuses INVALID_DURATION "Duration must be a finite nonnegative number of minutes."
  where recurringPeriod is supplied and not a finite positive number, recurringUnit is neither days nor months, a monthly period is fractional, or the first occurrence cannot be represented
  then
    refuses INVALID_RECURRING_PERIOD "Recurring period must be a finite positive number of days."
  where all fields are valid
  then
    create a fresh task with owner, trimmed name, and supplied deadline, duration, and recurringPeriod
    retain recurringUnit only when a period is supplied, defaulting it to days
    set hasDeadline and isRecurring according to field presence
    for recurring tasks record recurrenceAnchor as instant and schedule the first occurrence
    returns task

updateTask (owner: User, task: Task, changes: Changes, instant: DateTime) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where a supplied name is blank or longer than 200 characters
  then
    refuses EMPTY_NAME "Task name must contain 1 to 200 characters."
  where a supplied deadline is not a valid UTC timestamp later than instant
  then
    refuses INVALID_DEADLINE "The deadline must be a valid future UTC timestamp."
  where a supplied duration is not a finite nonnegative number
  then
    refuses INVALID_DURATION "Duration must be a finite nonnegative number of minutes."
  where the resulting recurring period is not finite and positive, its monthly value is fractional, its unit is invalid, or the first occurrence cannot be represented
  then
    refuses INVALID_RECURRING_PERIOD "Recurring period must be a finite positive number of days."
  where task belongs to owner and supplied fields are valid
  then
    apply only supplied changes together, clearing optional fields supplied as null
    remove recurrence unit and all schedule anchors when recurrence is cleared; when recurrence settings change, anchor a new schedule at instant
    leave omitted fields unchanged
    returns task

setName (owner: User, task: Task, name: String) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where a supplied name is blank or longer than 200 characters
  then
    refuses EMPTY_NAME "Task name must contain 1 to 200 characters."
  where task belongs to owner and supplied fields are valid
  then
    set the trimmed name
    leave omitted fields unchanged
    returns task

setDeadline (owner: User, task: Task, deadline: String, instant: DateTime) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where a supplied deadline is not a valid UTC timestamp later than instant
  then
    refuses INVALID_DEADLINE "The deadline must be a valid future UTC timestamp."
  where task belongs to owner and supplied fields are valid
  then
    set deadline and hasDeadline to true
    reset recurrenceDeadlineAnchor to deadline when recurring
    leave omitted fields unchanged
    returns task

removeDeadline (owner: User, task: Task) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where task belongs to owner and supplied fields are valid
  then
    remove deadline and its recurrenceDeadlineAnchor, and set hasDeadline to false
    leave omitted fields unchanged
    returns task

setDuration (owner: User, task: Task, duration: Number) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where a supplied duration is not a finite nonnegative number
  then
    refuses INVALID_DURATION "Duration must be a finite nonnegative number of minutes."
  where task belongs to owner and supplied fields are valid
  then
    set duration
    leave omitted fields unchanged
    returns task

removeDuration (owner: User, task: Task) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where task belongs to owner and supplied fields are valid
  then
    remove duration
    leave omitted fields unchanged
    returns task

startRecurring (owner: User, task: Task, recurringPeriod: Number, instant: DateTime) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where the resulting recurring period is not finite and positive, its monthly value is fractional, its unit is invalid, or the first occurrence cannot be represented
  then
    refuses INVALID_RECURRING_PERIOD "Recurring period must be a finite positive number of days."
  where task belongs to owner and supplied fields are valid
  then
    set recurringPeriod and isRecurring to true
    anchor a new schedule at instant using the new period
    leave omitted fields unchanged
    returns task

stopRecurring (owner: User, task: Task) : returns (task: Task)
  where task does not exist or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where task belongs to owner and supplied fields are valid
  then
    remove recurringPeriod and set isRecurring to false
    remove recurringUnit, schedule anchors, scheduled and pending occurrences
    leave omitted fields unchanged
    returns task

releaseOccurrence (owner: User, task: Task, scheduledFor: String, instant: DateTime) : returns (owner: User, task: Task, cycle: String, ready: Flag)
  where task is missing or belongs to another owner
  then
    refuses NO_SUCH_TASK "There is no such task."
  where the next scheduled occurrence cannot be represented as a timestamp
  then
    refuses INVALID_RECURRING_PERIOD "Recurring period must be a finite positive number of days."
  where the advanced deadline cannot be represented as a timestamp
  then
    refuses INVALID_DEADLINE "The deadline must be a valid future UTC timestamp."
  where pendingRecurrence equals scheduledFor
  then
    set cycle to scheduledFor and ready to true without changing the deadline again
    returns owner, task, cycle, ready
  where task is recurring and nextOccurrenceAt equals scheduledFor and is at or before instant
  then
    advance a present deadline from recurrenceDeadlineAnchor by at least one period beyond its previous value and enough whole periods to be later than instant
    preserve the anchor day for calendar months, clamping each resulting shorter month
    leave a missing deadline absent
    record scheduledFor in pendingRecurrence and advance nextOccurrenceAt to the next anchored occurrence after instant
    set cycle to scheduledFor and ready to true
    returns owner, task, cycle, ready
  where task is not recurring or the schedule is stale or not due
  then
    leave state unchanged and set cycle to scheduledFor and ready to false
    returns owner, task, cycle, ready

acknowledgeOccurrence (owner: User, task: Task, cycle: String) : returns (task: Task)
  where pendingRecurrence matches cycle for owner's task
  then
    remove pendingRecurrence
    returns task
  where no matching pending recurrence exists
  then
    leave state unchanged
    returns task
```

## Queries

```queries
_get (owner: User, task: Task) : optional (details: Task)
  answers the full task record without a MongoDB identifier
  answers no row when task does not exist or belongs to another owner
_forOwner (owner: User) : one (records: TaskRecords)
  answers all of the owner's full task records in task identity order, without MongoDB identifiers
  answers an empty records array for an owner with no tasks
_due (instant: DateTime) : many (owner: User, task: Task, scheduledFor: String)
  answers scheduled occurrences due at instant and pending unacknowledged occurrences in task identity order
  answers no rows when nothing is due
```
