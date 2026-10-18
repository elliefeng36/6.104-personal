# TaskSuggesting

## Purpose

Removes decision overloading by suggesting tasks to users based on upcoming deadlines and an optional time constraint.

## Principle

a user can make a request for a task suggestion with an optional time limit; then, a task matching the requirements is returned.

## Types

```types
external User
    The person who has a tasklist.

external Task
    The task to be suggested.

external TaskList
    A list of tasks to draw suggestions from.
```

## State

```state
a set of SuggestRequests with
    a User
    an optional timeLimit Number
```

## Actions

```actions
makeRequest (user: User, timeLimit?: Number) : returns (request: SuggestRequest)
    where timeLimit is nonnegative
    then
        creates request with that user and timeLimit
        returns request
    where timeLimit is negative
    then
        refuses INVALID_TIME_LIMIT "The time limit is negative."

makeSuggestion (request: SuggestRequest, taskList: TaskList) : returns (task: Task)
    where the taskList's activeTasks is not empty
    then
        generates a suggested task from the taskList's activeTasks based on upcoming deadlines and whether the request has a timeLimit
        returns task
    where the taskList's activeTasks is empty
    then
        refuses EMPTY_TASKLIST "There are no tasks to suggest."
```

## Queries

```queries

```
