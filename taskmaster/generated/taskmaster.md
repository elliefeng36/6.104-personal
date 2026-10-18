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

### TaskListing

Defined in [TaskListing](../design/concepts/TaskListing.md), line 1.

#### Actions

- `initialize(owner: User) : returns (owner: User)`
- `addTask(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_USER`: There is no such user.
- `deleteTask(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_USER`: There is no such user.
  - Refuses `NO_SUCH_TASK`: There is no such active task.
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

- `makeTask(owner: User, name: String, deadline?: String, duration?: Number, recurringPeriod?: Number, instant: DateTime) : returns (task: Task)`
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
- `startRecurring(owner: User, task: Task, recurringPeriod: Number) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.
  - Refuses `INVALID_RECURRING_PERIOD`: Recurring period must be a finite positive number of days.
- `stopRecurring(owner: User, task: Task) : returns (task: Task)`
  - Refuses `NO_SUCH_TASK`: There is no such task.

#### Queries

- `_get(owner: User, task: Task) : optional (details: Task)`
- `_forOwner(owner: User) : one (records: TaskRecords)`

#### Instances

- `TaskSetting` — instance of `TaskSetting` — [Implemented application types](../design/types.md), line 17.
  - `User` is `Authenticating.Account` — [Implemented application types](../design/types.md), line 18.

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

- `suggestionCandidates(taskList: TaskListing.TaskList, records: TaskSetting.TaskRecords) : TaskSuggesting.CandidatePool` — [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 15.

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

### TaskLists.Complete

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 15.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 24.

```reaction
when RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskLists.Complete#2

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 15.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 24.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by TaskLists.Complete
where
  earlier, RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
then
  TaskListing.completeTask (owner, task)
```

### TaskLists.Complete#3

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 15.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 24.

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
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 23.

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
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 23.

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
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 23.

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
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 22.

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
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 22.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by TaskLists.View
then
  TaskListing.initialize (owner)
```

### TaskLists.View#3

Authored path: `TaskLists.View`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 4.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 22.

```reaction
when TaskListing.initialize (owner), asked by TaskLists.View#2
where
  earlier, RequestBoundary.request (path: "/tasklists/view", requestId, session)
then
  RequestBoundary.respond (list: former "the task list of (owner)" with (owner), requestId)
```

### TaskSuggestions.MakeRequest

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 29.

```reaction
when RequestBoundary.request (path: "/taskSuggestions/makeRequest", requestId, session, timeLimit)
where
  instant is the current flow's instant
then
  Sessioning.current (instant, session)
```

### TaskSuggestions.MakeRequest#2

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 29.

```reaction
when Sessioning.current (instant, session, subject: user), asked by TaskSuggestions.MakeRequest
where
  earlier, RequestBoundary.request (path: "/taskSuggestions/makeRequest", requestId, session, timeLimit)
then
  TaskSuggesting.makeRequest (timeLimit, user)
```

### TaskSuggestions.MakeRequest#3

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 29.

```reaction
when TaskSuggesting.makeRequest (timeLimit, user, request), asked by TaskSuggestions.MakeRequest#2
where
  TaskListing._viewTasks (owner: user) has (taskList)
  TaskSetting._forOwner (owner: user) has (records)
  pool is suggestionCandidates (records, taskList)
then
  TaskSuggesting.makeSuggestion (pool, request)
```

### TaskSuggestions.MakeRequest#4

Authored path: `TaskSuggestions.MakeRequest`.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 3.
- Covered by [TaskSuggestions](../design/compositions/TaskSuggestions.md), line 29.

```reaction
when TaskSuggesting.makeSuggestion (pool, request, suggestion), asked by TaskSuggestions.MakeRequest#3
where
  earlier, RequestBoundary.request (path: "/taskSuggestions/makeRequest", requestId, session, timeLimit)
then
  RequestBoundary.respond (requestId, suggestion)
```

### Tasks.Make

Authored path: `Tasks.Make`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 3.
- Covered by [Tasks](../design/compositions/Tasks.md), line 21.

```reaction
when RequestBoundary.request (deadline, duration, name, path: "/tasks/make", recurringPeriod, requestId, session)
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
  earlier, RequestBoundary.request (deadline, duration, name, path: "/tasks/make", recurringPeriod, requestId, session)
then
  TaskSetting.makeTask (deadline, duration, instant, name, owner, recurringPeriod)
```

### Tasks.Make#4

Authored path: `Tasks.Make`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 3.
- Covered by [Tasks](../design/compositions/Tasks.md), line 21.

```reaction
when TaskSetting.makeTask (deadline, duration, instant, name, owner, recurringPeriod, task), asked by Tasks.Make#3
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
  earlier, RequestBoundary.request (deadline, duration, name, path: "/tasks/make", recurringPeriod, requestId, session)
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

### Tasks.Update#2

Authored path: `Tasks.Update`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 13.
- Covered by [Tasks](../design/compositions/Tasks.md), line 22.

```reaction
when Sessioning.current (instant, session, subject: owner), asked by Tasks.Update
where
  earlier, RequestBoundary.request (changes, path: "/tasks/update", requestId, session, task)
then
  TaskSetting.updateTask (changes, instant, owner, task)
```

### Tasks.Update#3

Authored path: `Tasks.Update`.
- Covered by [Tasks](../design/compositions/Tasks.md), line 13.
- Covered by [Tasks](../design/compositions/Tasks.md), line 22.

```reaction
when TaskSetting.updateTask (changes, instant, owner, task), asked by Tasks.Update#2
where
  earlier, RequestBoundary.request (changes, path: "/tasks/update", requestId, session, task)
then
  RequestBoundary.respond (requestId, task)
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
- `/taskSuggestions/makeRequest` — requires `session`; fills `timeLimit` with null when absent
- `/tasklists/complete` — requires `session`, `task`
- `/tasklists/delete` — requires `session`, `task`
- `/tasklists/view` — requires `session`
- `/tasks/make` — requires `session`, `name`; fills `deadline` with null when absent; fills `duration` with null when absent; fills `recurringPeriod` with null when absent
- `/tasks/update` — requires `session`, `task`, `changes`
