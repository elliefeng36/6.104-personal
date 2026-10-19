<!-- Generated from the Taskmaster assembly. Do not edit. -->
<!-- Manifest producer: @mit-sdg/sync-engine@1.1.0; concept specification: sync-engine.concept-specification@1; renderer: @mit-sdg/sync-engine@1.1.0. -->

# Taskmaster — assembled read-back

_Assembled by sync-engine from registered concepts and composition. Edit the concept_
_specifications and composition source, then regenerate this file._

## Concepts

### Authenticating

Defined in [Authenticating](../design/concepts/Authenticating.md), line 1.

#### Actions

- `register(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_USERNAME`: A username must contain 3 to 32 letters, numbers, underscores, or hyphens.
  - Refuses `WEAK_PASSWORD`: A password must contain 8 to 128 characters.
  - Refuses `USERNAME_TAKEN`: That username is already registered.
- `authenticate(username: String, password: String) : returns (account: Account)`
  - Refuses `INVALID_CREDENTIALS`: The username or password is incorrect.

#### Queries

- `_registered(username: String) : one (registered: Flag)`

#### Instances

- `Authenticating` — instance of `Authenticating` — [Implemented application types](../design/types.md), line 8.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject, instant: DateTime) : returns (session: Session, expiresAt: DateTime)`
- `current(session: Session, instant: DateTime) : returns (subject: Subject)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.
- `end(session: Session, instant: DateTime) : returns (ended: Flag)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.

#### Queries

- `_active(session: Session, instant: DateTime) : optional (subject: Subject, expiresAt: DateTime)`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Implemented application types](../design/types.md), line 10.
  - `Subject` is `Authenticating.Account` — [Implemented application types](../design/types.md), line 11.

### TaskFiltering

Defined in [TaskFiltering](../design/concepts/TaskFiltering.md), line 1.

#### Actions

- `filter(tasks: TaskList, filter: Filter) : returns (tasks: TaskList)`

#### Instances

- `TaskFiltering` — instance of `TaskFiltering` — [Implemented application types](../design/types.md), line 26.
  - `Task` is `TaskSetting.Task` — [Implemented application types](../design/types.md), line 27.

### TaskListing

Defined in [TaskListing](../design/concepts/TaskListing.md), line 1.

#### Actions

- `initialize(owner: User) : returns (owner: User)`
- `addTask(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_USER`: There is no such user.
- `deleteTask(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_USER`: There is no such user.
  - Refuses `NO_SUCH_TASK`: There is no such active task.
- `reopenTask(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_USER`: There is no such user.
- `completeTask(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_USER`: There is no such user.
  - Refuses `NO_SUCH_TASK`: There is no such active task.

#### Queries

- `_viewTasks(owner: User) : one (taskList: TaskList)`
- `_active(owner: User) : many (task: Task)`
- `_completed(owner: User) : many (task: Task)`

#### Instances

- `TaskListing` — instance of `TaskListing` — [Implemented application types](../design/types.md), line 13.
  - `Task` is `TaskSetting.Task` — [Implemented application types](../design/types.md), line 15.
  - `User` is `Authenticating.Account` — [Implemented application types](../design/types.md), line 14.

### TaskSetting

Defined in [TaskSetting](../design/concepts/TaskSetting.md), line 1.

#### Actions

- `makeTask(owner: User, name: String, deadline?: String, duration?: Number, recurringPeriod?: Number, recurringUnit?: String, instant: DateTime) : returns (task: Task)`
  - Refuses `EMPTY_NAME`: Task name must contain 1 to 200 characters.
  - Refuses `INVALID_DEADLINE`: The deadline must be a valid future UTC timestamp.
  - Refuses `INVALID_DURATION`: Duration must be a finite nonnegative number of minutes.
  - Refuses `INVALID_RECURRING_PERIOD`: Recurring period must be a finite positive number of days.
- `updateTask(owner: User, task: Task, changes: Changes, instant: DateTime) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
  - Refuses `EMPTY_NAME`: Task name must contain 1 to 200 characters.
  - Refuses `INVALID_DEADLINE`: The deadline must be a valid future UTC timestamp.
  - Refuses `INVALID_DURATION`: Duration must be a finite nonnegative number of minutes.
  - Refuses `INVALID_RECURRING_PERIOD`: Recurring period must be a finite positive number of days.
- `setName(owner: User, task: Task, name: String) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
  - Refuses `EMPTY_NAME`: Task name must contain 1 to 200 characters.
- `setDeadline(owner: User, task: Task, deadline: String, instant: DateTime) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
  - Refuses `INVALID_DEADLINE`: The deadline must be a valid future UTC timestamp.
- `removeDeadline(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
- `setDuration(owner: User, task: Task, duration: Number) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
  - Refuses `INVALID_DURATION`: Duration must be a finite nonnegative number of minutes.
- `removeDuration(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
- `startRecurring(owner: User, task: Task, recurringPeriod: Number, instant: DateTime) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
  - Refuses `INVALID_RECURRING_PERIOD`: Recurring period must be a finite positive number of days.
- `stopRecurring(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
- `releaseOccurrence(owner: User, task: Task, scheduledFor: String, instant: DateTime) : returns (owner: User, task: Task, cycle: String, ready: Flag)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
  - Refuses `INVALID_RECURRING_PERIOD`: Recurring period must be a finite positive number of days.
  - Refuses `INVALID_DEADLINE`: The deadline must be a valid future UTC timestamp.
- `acknowledgeOccurrence(owner: User, task: Task, cycle: String) : returns (task: Task)`

#### Queries

- `_get(owner: User, task: Task) : optional (details: Task)`
- `_forOwner(owner: User) : one (records: TaskRecords)`
- `_due(instant: DateTime) : many (owner: User, task: Task, scheduledFor: String)`

#### Instances

- `TaskSetting` — instance of `TaskSetting` — [Implemented application types](../design/types.md), line 17.
  - `User` is `Authenticating.Account` — [Implemented application types](../design/types.md), line 18.

### TaskSorting

Defined in [TaskSorting](../design/concepts/TaskSorting.md), line 1.

#### Actions

- `sort(tasks: TaskList, comparator: Comparator) : returns (tasks: TaskList)`

#### Instances

- `TaskSorting` — instance of `TaskSorting` — [Implemented application types](../design/types.md), line 23.
  - `Task` is `TaskSetting.Task` — [Implemented application types](../design/types.md), line 24.

### TaskSuggesting

Defined in [TaskSuggesting](../design/concepts/TaskSuggesting.md), line 1.

#### Actions

- `makeRequest(user: User, timeLimit?: Number) : returns (request: SuggestRequest)`
  - Refuses `INVALID_TIME_LIMIT`: Time limit must be a finite nonnegative number of minutes.
- `makeSuggestion(request: SuggestRequest, pool: CandidatePool) : returns (suggestion: Suggestion)`
  - Refuses `UNKNOWN_SUGGEST_REQUEST`: There is no such suggestion request.

#### Instances

- `TaskSuggesting` — instance of `TaskSuggesting` — [Implemented application types](../design/types.md), line 20.
  - `Task` is `TaskSetting.Task` — [Implemented application types](../design/types.md), line 22.
  - `User` is `Authenticating.Account` — [Implemented application types](../design/types.md), line 21.

## Computations

- `suggestionCandidates(taskList: TaskListing.TaskList, records: TaskSetting.TaskRecords, recurring: String, maxDuration: Number) : TaskSuggesting.CandidatePool` — [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 14.
- `taskComparator(sortBy: String) : TaskSorting.Comparator` — [TaskSorting](../design/compositions/TaskSorting.md), line 24.
- `taskFilter(recurring: String, maxDuration: Number) : TaskFiltering.Filter` — [TaskSorting](../design/compositions/TaskSorting.md), line 26.
- `taskSnapshot(taskList: TaskListing.TaskList, records: TaskSetting.TaskRecords, status: String) : TaskSorting.TaskList` — [TaskSorting](../design/compositions/TaskSorting.md), line 22.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the task list of (owner)

Authored path: `TaskLists.List`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 5.

```former
Former "the task list of (owner)" — inputs (owner); bindings (task, details, completedTask, completedDetails); promises exactly one record — forms:
  a record of
    activeTasks: each TaskListing._active (owner) has (task)
      where TaskSetting._get (owner, task) has (details)
      form a record of
        details
    completedTasks: each TaskListing._completed (owner) has (task: completedTask)
      where TaskSetting._get (owner, task: completedTask) has (details: completedDetails)
      form a record of
        details: completedDetails
```

## Reactions

### DeliverFaultToAsker

```reaction
when any action is faulted, not asked by DeliverFaultToAsker
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respondFramework (error: "INTERNAL_ERROR", requestId)
```

### DeliverRefusalToAsker

```reaction
when any action is refused (message), except RequestBoundary
where
  earlier, RequestBoundary.request (requestId)
then
  RequestBoundary.respond (error: message, requestId)
```

### Recurrences.Readd

Authored path: `Recurrences.Readd`.
- Covered by [Recurrences](../design/compositions/Recurrences.md), line 3.

```reaction
when TaskSetting.releaseOccurrence (cycle, owner, ready: true, task)
then
  TaskListing.reopenTask (owner, task)
```

### Recurrences.Readd#2

Authored path: `Recurrences.Readd`.
- Covered by [Recurrences](../design/compositions/Recurrences.md), line 3.

```reaction
when TaskListing.reopenTask (owner, task), asked by Recurrences.Readd
where
  earlier, TaskSetting.releaseOccurrence (cycle, owner, ready: true, task)
then
  TaskSetting.acknowledgeOccurrence (cycle, owner, task)
```

### Sessions.CurrentAccount.CurrentUser

Authored path: `Sessions.CurrentAccount.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 22.
- Covered by [Sessions](../design/compositions/Sessions.md), line 27.

```reaction
when RequestBoundary.request (path: "/auth/current", requestId, session)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### Sessions.CurrentAccount.CurrentUser#2

Authored path: `Sessions.CurrentAccount.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 22.
- Covered by [Sessions](../design/compositions/Sessions.md), line 27.

```reaction
when Sessioning.current (instant, session, subject: username), asked by Sessions.CurrentAccount.CurrentUser
where
  earlier, RequestBoundary.request (path: "/auth/current", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### Sessions.EnteringApplication.Register

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 11.
- Covered by [Sessions](../design/compositions/Sessions.md), line 18.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
where
  instant is the current flow's instant
then
  Authenticating.register (password, username)
```

### Sessions.EnteringApplication.Register#2

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 11.
- Covered by [Sessions](../design/compositions/Sessions.md), line 18.

```reaction
when Authenticating.register (password, username, account), asked by Sessions.EnteringApplication.Register
where
  instant is the current flow's instant
then
  Sessioning.start (instant, subject: account)
```

### Sessions.EnteringApplication.Register#3

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 11.
- Covered by [Sessions](../design/compositions/Sessions.md), line 18.

```reaction
when Sessioning.start (instant, subject: account, expiresAt, session), asked by Sessions.EnteringApplication.Register#2
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.EnteringApplication.SignIn

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.
- Covered by [Sessions](../design/compositions/Sessions.md), line 19.

```reaction
when RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
where
  instant is the current flow's instant
then
  Authenticating.authenticate (password, username)
```

### Sessions.EnteringApplication.SignIn#2

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.
- Covered by [Sessions](../design/compositions/Sessions.md), line 19.

```reaction
when Authenticating.authenticate (password, username, account), asked by Sessions.EnteringApplication.SignIn
where
  instant is the current flow's instant
then
  Sessioning.start (instant, subject: account)
```

### Sessions.EnteringApplication.SignIn#3

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.
- Covered by [Sessions](../design/compositions/Sessions.md), line 19.

```reaction
when Sessioning.start (instant, subject: account, expiresAt, session), asked by Sessions.EnteringApplication.SignIn#2
where
  earlier, RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.LeavingApplication.SignOut

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 30.
- Covered by [Sessions](../design/compositions/Sessions.md), line 35.

```reaction
when RequestBoundary.request (path: "/auth/sign-out", requestId, session)
where
  instant is the current flow's instant
then
  Sessioning.end (instant, session)
```

### Sessions.LeavingApplication.SignOut#2

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 30.
- Covered by [Sessions](../design/compositions/Sessions.md), line 35.

```reaction
when Sessioning.end (instant, session, ended: signedOut), asked by Sessions.LeavingApplication.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  RequestBoundary.respond (requestId, signedOut)
```

### TaskFiltering.View

Authored path: `TaskFiltering.View`.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 3.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 16.

```reaction
when RequestBoundary.request (maxDuration, path: "/taskFiltering/view", recurring, requestId, session, sortBy, status)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskFiltering.View#2

Authored path: `TaskFiltering.View`.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 3.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 16.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by TaskFiltering.View
where
  TaskListing._viewTasks (owner) has (taskList)
  TaskSetting._forOwner (owner) has (records)
  earlier, RequestBoundary.request (maxDuration, path: "/taskFiltering/view", recurring, requestId, session, sortBy, status)
  tasks is taskSnapshot (records, status, taskList)
  filter is taskFilter (maxDuration, recurring)
then
  TaskFiltering.filter (filter, tasks)
```

### TaskFiltering.View#3

Authored path: `TaskFiltering.View`.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 3.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 16.

```reaction
when TaskFiltering.filter (filter, tasks, result.tasks: filtered), asked by TaskFiltering.View#2
where
  earlier, RequestBoundary.request (maxDuration, path: "/taskFiltering/view", recurring, requestId, session, sortBy, status)
  comparator is taskComparator (sortBy)
then
  TaskSorting.sort (comparator, tasks: filtered)
```

### TaskFiltering.View#4

Authored path: `TaskFiltering.View`.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 3.
- Covered by [TaskFiltering](../design/compositions/TaskFiltering.md), line 16.

```reaction
when TaskSorting.sort (comparator, tasks: filtered, result.tasks: result), asked by TaskFiltering.View#3
where
  earlier, RequestBoundary.request (maxDuration, path: "/taskFiltering/view", recurring, requestId, session, sortBy, status)
then
  RequestBoundary.respond (requestId, tasks: result)
```

### TaskLists.Complete

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 17.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 27.

```reaction
when RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskLists.Complete#2

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 17.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 27.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by TaskLists.Complete
where
  earlier, RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
then
  TaskListing.completeTask (owner, task)
```

### TaskLists.Complete#3

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 17.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 27.

```reaction
when TaskListing.completeTask (owner, task), asked by TaskLists.Complete#2
where
  earlier, RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
then
  RequestBoundary.respond (requestId, task)
```

### TaskLists.Delete

Authored path: `TaskLists.Delete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 14.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 26.

```reaction
when RequestBoundary.request (path: "/tasklists/delete", requestId, session, task)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskLists.Delete#2

Authored path: `TaskLists.Delete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 14.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 26.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by TaskLists.Delete
where
  earlier, RequestBoundary.request (path: "/tasklists/delete", requestId, session, task)
then
  TaskListing.deleteTask (owner, task)
```

### TaskLists.Delete#3

Authored path: `TaskLists.Delete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 14.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 26.

```reaction
when TaskListing.deleteTask (owner, task), asked by TaskLists.Delete#2
where
  earlier, RequestBoundary.request (path: "/tasklists/delete", requestId, session, task)
then
  RequestBoundary.respond (requestId, task)
```

### TaskLists.View

Authored path: `TaskLists.View`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 4.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 25.

```reaction
when RequestBoundary.request (path: "/tasklists/view", requestId, session)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskLists.View#2

Authored path: `TaskLists.View`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 4.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 25.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by TaskLists.View
then
  TaskListing.initialize (owner)
```

### TaskLists.View#3

Authored path: `TaskLists.View`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 4.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 25.

```reaction
when TaskListing.initialize (owner), asked by TaskLists.View#2
where
  earlier, RequestBoundary.request (path: "/tasklists/view", requestId, session)
then
  RequestBoundary.respond (list: former "the task list of (owner)" with (owner), requestId)
```

### TaskSorting.View

Authored path: `TaskSorting.View`.
- Covered by [TaskSorting](../design/compositions/TaskSorting.md), line 3.
- Covered by [TaskSorting](../design/compositions/TaskSorting.md), line 16.

```reaction
when RequestBoundary.request (path: "/taskSorting/view", requestId, session, sortBy, status)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskSorting.View#2

Authored path: `TaskSorting.View`.
- Covered by [TaskSorting](../design/compositions/TaskSorting.md), line 3.
- Covered by [TaskSorting](../design/compositions/TaskSorting.md), line 16.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by TaskSorting.View
where
  TaskListing._viewTasks (owner) has (taskList)
  TaskSetting._forOwner (owner) has (records)
  earlier, RequestBoundary.request (path: "/taskSorting/view", requestId, session, sortBy, status)
  tasks is taskSnapshot (records, status, taskList)
  comparator is taskComparator (sortBy)
then
  TaskSorting.sort (comparator, tasks)
```

### TaskSorting.View#3

Authored path: `TaskSorting.View`.
- Covered by [TaskSorting](../design/compositions/TaskSorting.md), line 3.
- Covered by [TaskSorting](../design/compositions/TaskSorting.md), line 16.

```reaction
when TaskSorting.sort (comparator, tasks, result.tasks: result), asked by TaskSorting.View#2
where
  earlier, RequestBoundary.request (path: "/taskSorting/view", requestId, session, sortBy, status)
then
  RequestBoundary.respond (requestId, tasks: result)
```

### TaskSuggestions.MakeRequest

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 28.

```reaction
when RequestBoundary.request (maxDuration, path: "/taskSuggestions/makeRequest", recurring, requestId, session, timeLimit)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskSuggestions.MakeRequest#2

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 28.

```reaction
when Sessioning.current (instant, session, subject: user), asked by TaskSuggestions.MakeRequest
where
  earlier, RequestBoundary.request (maxDuration, path: "/taskSuggestions/makeRequest", recurring, requestId, session, timeLimit)
then
  TaskSuggesting.makeRequest (timeLimit, user)
```

### TaskSuggestions.MakeRequest#3

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 28.

```reaction
when TaskSuggesting.makeRequest (timeLimit, user, request), asked by TaskSuggestions.MakeRequest#2
where
  TaskListing._viewTasks (owner: user) has (taskList)
  TaskSetting._forOwner (owner: user) has (records)
  earlier, RequestBoundary.request (maxDuration, path: "/taskSuggestions/makeRequest", recurring, requestId, session, timeLimit)
  pool is suggestionCandidates (maxDuration, records, recurring, taskList)
then
  TaskSuggesting.makeSuggestion (pool, request)
```

### TaskSuggestions.MakeRequest#4

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 28.

```reaction
when TaskSuggesting.makeSuggestion (pool, request, suggestion), asked by TaskSuggestions.MakeRequest#3
where
  earlier, RequestBoundary.request (maxDuration, path: "/taskSuggestions/makeRequest", recurring, requestId, session, timeLimit)
then
  RequestBoundary.respond (requestId, suggestion)
```

### Tasks.Make

Authored path: `Tasks.Make`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 3.
- Covered by [Tasks](../design/compositions/Tasks.md), line 21.

```reaction
when RequestBoundary.request (deadline, duration, name, path: "/tasks/make", recurringPeriod, recurringUnit, requestId, session)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### Tasks.Make#2

Authored path: `Tasks.Make`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 3.
- Covered by [Tasks](../design/compositions/Tasks.md), line 21.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by Tasks.Make
then
  TaskListing.initialize (owner)
```

### Tasks.Make#3

Authored path: `Tasks.Make`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 3.
- Covered by [Tasks](../design/compositions/Tasks.md), line 21.

```reaction
when TaskListing.initialize (owner), asked by Tasks.Make#2
where
  earlier, Sessioning.current (instant, session, subject: owner), asked by Tasks.Make
  earlier, RequestBoundary.request (deadline, duration, name, path: "/tasks/make", recurringPeriod, recurringUnit, requestId, session)
then
  TaskSetting.makeTask (deadline, duration, instant, name, owner, recurringPeriod, recurringUnit)
```

### Tasks.Make#4

Authored path: `Tasks.Make`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 3.
- Covered by [Tasks](../design/compositions/Tasks.md), line 21.

```reaction
when TaskSetting.makeTask (deadline, duration, instant, name, owner, recurringPeriod, recurringUnit, task), asked by Tasks.Make#3
then
  TaskListing.addTask (owner, task)
```

### Tasks.Make#5

Authored path: `Tasks.Make`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 3.
- Covered by [Tasks](../design/compositions/Tasks.md), line 21.

```reaction
when TaskListing.addTask (owner, task), asked by Tasks.Make#4
where
  earlier, RequestBoundary.request (deadline, duration, name, path: "/tasks/make", recurringPeriod, recurringUnit, requestId, session)
then
  RequestBoundary.respond (requestId, task)
```

### Tasks.Update

Authored path: `Tasks.Update`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 13.
- Covered by [Tasks](../design/compositions/Tasks.md), line 22.

```reaction
when RequestBoundary.request (changes, path: "/tasks/update", requestId, session, task)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### Tasks.Update:active#2

Authored path: `Tasks.Update`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 13.
- Covered by [Tasks](../design/compositions/Tasks.md), line 22.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by Tasks.Update
where
  TaskListing._active (owner) has (task)
  earlier, RequestBoundary.request (changes, path: "/tasks/update", requestId, session, task)
then
  TaskSetting.updateTask (changes, instant, owner, task)
```

### Tasks.Update:active#3

Authored path: `Tasks.Update`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 13.
- Covered by [Tasks](../design/compositions/Tasks.md), line 22.

```reaction
when TaskSetting.updateTask (changes, instant, owner, task), asked by Tasks.Update:active#2
where
  earlier, RequestBoundary.request (changes, path: "/tasks/update", requestId, session, task)
then
  RequestBoundary.respond (requestId, task)
```

### Tasks.Update:inactive#2

Authored path: `Tasks.Update`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 13.
- Covered by [Tasks](../design/compositions/Tasks.md), line 22.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by Tasks.Update
where
  earlier, RequestBoundary.request (changes, path: "/tasks/update", requestId, session, task)
  no TaskListing._active (owner) has (task)
then
  RequestBoundary.respond (error: "NO_SUCH_TASK", requestId)
```

## Endpoint input contracts

Before recording an action ask, the boundary rejects a body that is not an
object or lacks a required key. The response uses `INVALID_INPUT` and names
the path or missing key. A declared default fills an absent key. Endpoints
not listed here have no explicit input contract.

- `/auth/current` — requires `session`
- `/auth/register` — requires `username`, `password`
- `/auth/sign-in` — requires `username`, `password`
- `/auth/sign-out` — requires `session`
- `/taskFiltering/view` — requires `session`; fills `maxDuration` with null when absent; fills `recurring` with "all" when absent; fills `sortBy` with "none" when absent; fills `status` with "active" when absent
- `/taskSorting/view` — requires `session`; fills `sortBy` with "none" when absent; fills `status` with "active" when absent
- `/taskSuggestions/makeRequest` — requires `session`; fills `maxDuration` with null when absent; fills `recurring` with "all" when absent; fills `timeLimit` with null when absent
- `/tasklists/complete` — requires `session`, `task`
- `/tasklists/delete` — requires `session`, `task`
- `/tasklists/view` — requires `session`
- `/tasks/make` — requires `session`, `name`; fills `deadline` with null when absent; fills `duration` with null when absent; fills `recurringPeriod` with null when absent; fills `recurringUnit` with null when absent
- `/tasks/update` — requires `session`, `task`, `changes`
