# TaskListing

## Purpose

Keeps track of a list of active tasks that users can add, delete, or complete so users can see what needs to be done. Also keeps a list of completed tasks so users can check to see if they've finished a task.

## Principle

Starting with an empty TaskList, users can add active tasks at any time; they can delete any active tasks; they can also mark active tasks as completed.

## Types

```types
external User
    The person who has a tasklist.

external Task
    The task that is being put in the tasklist.
```

## State

```state
a set of TaskLists with
    an owner User
    an activeTasks set of Tasks
    a completedTasks set of Tasks
```

## Actions

```actions
addTask (owner: User, task: Task) : returns (task: Task)
    where owner is in the set of Users
    then
        add the task to user's activeTasks
        returns task
    where owner is not in the set of Users
    then
        refuses NO_SUCH_USER "There is no such user."

deleteTask (owner: User, task: Task) : returns (task: Task)
    where owner is in the set of Users and task is in owner's activeTasks
    then
        remove that task from owner's activeTasks
        returns task
    where owner is in the set of Users and task is not in owner's activeTasks
    then
        refuses NO_SUCH_TASK "There is no such task."
    where owner is not in the set of Users
    then
        refuses NO_SUCH_USER "There is no such user."

completeTask (owner: User, task: Task) : returns (task: Task)
    where owner is in the set of Users and task is in owners activeTasks
    then
        remove task from owner's activeTasks
        add task to owner's completedTasks
        returns task
    where owner is in the set of Users and task is not in owner's activeTasks
    then
        refuses NO_SUCH_TASK "There is no such task."
    where owner is not in the set of Users
    then
        refuses NO_SUCH_USER "There is no such user."
```

## Queries

```queries
_viewTasks (owner: User) : one (taskList: TaskList)
    where owner is in the set of Users
    then
        return owner's TaskList.
    where owner is not in the set of Users
    then
        refuses NO_SUCH_USER "There is no such user."
```
