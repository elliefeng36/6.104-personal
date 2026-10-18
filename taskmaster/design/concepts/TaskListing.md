# TaskListing

## Purpose

Keep each user's active and completed tasks so they can track what remains to do.

## Principle

Initialize an empty list for a user, then add tasks. Deleting an active task
removes it; completing one moves it to completed tasks. Deleting or completing
a task that is not active is refused without changing the list. Users' lists
are independent. Initializing an existing list never resets it.

## Types

```types
external User
  The owner of a task list, supplied by the application.
external Task
  An opaque task identity supplied by the application.
```

## State

```state
a set of TaskLists with
  a unique owner User
  an activeTasks set of Task
  a completedTasks set of Task
Rule: A task cannot be both active and completed in the same list.
```

## Actions

```actions
initialize (owner: User) : returns (owner: User)
  where owner has no list
  then
    create an empty task list for owner
    returns owner
  where owner already has a list
  then
    leave the list unchanged
    returns owner

addTask (owner: User, task: Task) : returns (task: Task)
  where owner has no list
  then
    refuses NO_SUCH_USER "There is no such user."
  where owner has a list and task is already active or completed
  then
    leave the list unchanged
    returns task
  where owner has a list and task is not listed
  then
    add task to owner's activeTasks
    returns task

deleteTask (owner: User, task: Task) : returns (task: Task)
  where owner has no list
  then
    refuses NO_SUCH_USER "There is no such user."
  where owner has a list and task is not active
  then
    refuses NO_SUCH_TASK "There is no such active task."
  where task is active in owner's list
  then
    remove task from owner's activeTasks
    returns task

completeTask (owner: User, task: Task) : returns (task: Task)
  where owner has no list
  then
    refuses NO_SUCH_USER "There is no such user."
  where owner has a list and task is not active
  then
    refuses NO_SUCH_TASK "There is no such active task."
  where task is active in owner's list
  then
    remove task from owner's activeTasks
    add task to owner's completedTasks
    returns task
```

## Queries

```queries
_viewTasks (owner: User) : one (taskList: TaskList)
  answers the owner's list, containing owner, activeTasks, and completedTasks
  answers an empty list for an uninitialized owner without creating stored state
_active (owner: User) : many (task: Task)
  answers active task identities in addition order, or no rows for an uninitialized owner
_completed (owner: User) : many (task: Task)
  answers completed task identities in completion order, or no rows for an uninitialized owner
```
