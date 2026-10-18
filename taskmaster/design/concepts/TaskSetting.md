# TaskSetting

## Purpose

Allows users to create and update tasks, either because they didn't add all the information intially or because circumstances for the task have changed

## Principle

A user can create a task with a name and optionally a deadline, estimated duration of the task, whether it's recurring, and if so, how long the recurring period is; later, the user can set and update these fields.

## Types

```types
external User
    The person who has a tasklist.
```

## State

```state
a set of Tasks with
    an owner User
    a name String
    a hasDeadline Flag
    an optional deadline Date
    an optional duration Number
    an isRecurring Flag
    an optional recurringPeriod Number
```

## Actions

```actions
makeTask (owner: User, name: String, deadline?: Date, duration?: Number, recurringPeriod?: Number) : returns (task: Task)
    where name is nonempty, deadline, if given, is in the future, duration, if given, is nonnegative, and recurringPeriod, if given, is positive
    then
        creates a new task with owner and name
        if they are given, sets the new task's fields with deadline, duration, and recurringPeriod
        if deadline is given, sets the new task's hasDeadline to True, and False otherwise
        if recurringPeriod is given, sets the new task's isRecurring to True, and False otherwise
        returns task
    where name is empty
    then
        refuses EMPTY_NAME "Task name must be nonempty string."
    where deadline is given and not in the future
    then
        refuses INVALID_DEADLINE "The deadline is not in the future."
    where duration is given and negative
    then
        refuses INVALID_DURATION "The duration is negative."
    where recurringPeriod is given and nonpositive
    then
        refuses INVALID_RECURRING_PERIOD "The recurring period is not positive."

setDeadline (task: Task, deadline: Date) : returns (task: Task)
    where task is in the set of Tasks and deadline is in the future
    then
        sets task's deadline to the given deadline
        sets task's hasDeadline to True if it isn't already
        returns task
    where task is not in the set of Tasks
    then
        refuses NO_SUCH_TASK "There is no such task."
    where deadline is not in the future
    then
        refuses INVALID_DEADLINE "The deadline is not in the future."

removeDeadline (task: Task) : returns (task: Task)
    where task is in the set of Tasks
    then
        sets task's hasDeadline to False
        returns task
    where task is not in the set of Tasks
    then
        refuses NO_SUCH_TASK "There is no such task."

setDuration (task: Task, duration: Number) : returns (task: Task)
    where task is in the set of Tasks and duration is nonnegative
    then
        sets task's duration to the given duration
        returns task
    where task is not in the set of Tasks
    then
        refuses NO_SUCH_TASK "There is no such task."
    where duration is negative
    then
        refuses INVALID_DURATION "The duration is negative."

startRecurring (task: Task, recurringPeriod: Number) : returns (task: Task)
    where task is in the set of Tasks and recurringPeriod is positive
    then
        sets task's recurringPeriod to the given recurringPeriod
        sets task's isRecurring to True if it isn't already
        returns task
    where task is not in the set of Tasks
    then
        refuses NO_SUCH_TASK "There is no such task."
    where recurringPeriod and nonpositive
    then
        refuses INVALID_RECURRING_PERIOD "The recurring period is not positive."

stopRecurring (task: Task) : returns (task: Task)
    where task is in the set of Tasks
    then
        sets task's isRecurring to False
        returns task
    where task is not in the set of Tasks
    then
        refuses NO_SUCH_TASK "There is no such task."
```

## Queries

```queries

```
