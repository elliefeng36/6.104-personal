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

- `Authenticating` — instance of `Authenticating` — [Implemented application types](../design/auth-types.md), line 13.

### Sessioning

Defined in [Sessioning](../design/concepts/Sessioning.md), line 1.

#### Actions

- `start(subject: Subject) : returns (session: Session, expiresAt: DateTime)`
- `current(session: Session) : returns (subject: Subject)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.
- `end(session: Session) : returns (ended: Flag)`
  - Refuses `UNKNOWN_SESSION`: This session is not active.

#### Queries

- `_active(session: Session) : optional (subject: Subject, expiresAt: DateTime)`

#### Instances

- `Sessioning` — instance of `Sessioning` — [Implemented application types](../design/auth-types.md), line 14.
  - `Subject` is `Authenticating.Account` — [Implemented application types](../design/auth-types.md), line 15.

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

#### Instances

- `TaskListing` — instance of `TaskListing` — [Implemented application types](../design/auth-types.md), line 16.
  - `Task` is `Task` — [Implemented application types](../design/auth-types.md), line 18.
  - `User` is `Authenticating.Account` — [Implemented application types](../design/auth-types.md), line 17.

## Application types

Concrete types:

- `Task` — [Implemented application types](../design/auth-types.md), line 8.

## Formers

_Formers name result shapes evaluated when asked. The source former owns_
_the authored explanation; this section records the generated shape._

### the task list of (owner)

Authored path: `TaskLists.List`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 5.

```former
Former "the task list of (owner)" — inputs (owner); bindings (taskList); promises exactly one record — forms:
  a record of
    where TaskListing._viewTasks (owner) has (taskList)
    taskList
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
- Covered by [Sessions](../design/compositions/Sessions.md), line 17.
- Covered by [Sessions](../design/compositions/Sessions.md), line 22.

```reaction
when RequestBoundary.request (path: "/auth/current", requestId, session)
then
  Sessioning.current (session)
```

### Sessions.CurrentAccount.CurrentUser#2

Authored path: `Sessions.CurrentAccount.CurrentUser`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 17.
- Covered by [Sessions](../design/compositions/Sessions.md), line 22.

```reaction
when Sessioning.current (session, subject: username), asked by Sessions.CurrentAccount.CurrentUser
where
  earlier, RequestBoundary.request (path: "/auth/current", requestId, session)
then
  RequestBoundary.respond (requestId, username)
```

### Sessions.EnteringApplication.Register

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 6.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  Authenticating.register (password, username)
```

### Sessions.EnteringApplication.Register#2

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 6.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when Authenticating.register (password, username, account), asked by Sessions.EnteringApplication.Register
then
  Sessioning.start (subject: account)
```

### Sessions.EnteringApplication.Register#3

Authored path: `Sessions.EnteringApplication.Register`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 6.
- Covered by [Sessions](../design/compositions/Sessions.md), line 13.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.EnteringApplication.Register#2
where
  earlier, RequestBoundary.request (password, path: "/auth/register", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.EnteringApplication.SignIn

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  Authenticating.authenticate (password, username)
```

### Sessions.EnteringApplication.SignIn#2

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when Authenticating.authenticate (password, username, account), asked by Sessions.EnteringApplication.SignIn
then
  Sessioning.start (subject: account)
```

### Sessions.EnteringApplication.SignIn#3

Authored path: `Sessions.EnteringApplication.SignIn`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 8.
- Covered by [Sessions](../design/compositions/Sessions.md), line 14.

```reaction
when Sessioning.start (subject: account, expiresAt, session), asked by Sessions.EnteringApplication.SignIn#2
where
  earlier, RequestBoundary.request (password, path: "/auth/sign-in", requestId, username)
then
  RequestBoundary.respond (account, expiresAt, requestId, session)
```

### Sessions.LeavingApplication.SignOut

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 25.
- Covered by [Sessions](../design/compositions/Sessions.md), line 30.

```reaction
when RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  Sessioning.end (session)
```

### Sessions.LeavingApplication.SignOut#2

Authored path: `Sessions.LeavingApplication.SignOut`.
- Covered by [Sessions](../design/compositions/Sessions.md), line 25.
- Covered by [Sessions](../design/compositions/Sessions.md), line 30.

```reaction
when Sessioning.end (session, ended: signedOut), asked by Sessions.LeavingApplication.SignOut
where
  earlier, RequestBoundary.request (path: "/auth/sign-out", requestId, session)
then
  RequestBoundary.respond (requestId, signedOut)
```

### TaskLists.Add

Authored path: `TaskLists.Add`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 8.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 21.

```reaction
when RequestBoundary.request (path: "/tasklists/add", requestId, session, task)
then
  Sessioning.current (session)
```

### TaskLists.Add#2

Authored path: `TaskLists.Add`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 8.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 21.

```reaction
when Sessioning.current (session, subject: owner), asked by TaskLists.Add
then
  TaskListing.initialize (owner)
```

### TaskLists.Add#3

Authored path: `TaskLists.Add`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 8.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 21.

```reaction
when TaskListing.initialize (owner), asked by TaskLists.Add#2
where
  earlier, RequestBoundary.request (path: "/tasklists/add", requestId, session, task)
then
  TaskListing.addTask (owner, task)
```

### TaskLists.Add#4

Authored path: `TaskLists.Add`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 8.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 21.

```reaction
when TaskListing.addTask (owner, task), asked by TaskLists.Add#3
where
  earlier, RequestBoundary.request (path: "/tasklists/add", requestId, session, task)
then
  RequestBoundary.respond (requestId, task)
```

### TaskLists.Complete

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 14.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 23.

```reaction
when RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
then
  Sessioning.current (session)
```

### TaskLists.Complete#2

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 14.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 23.

```reaction
when Sessioning.current (session, subject: owner), asked by TaskLists.Complete
where
  earlier, RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
then
  TaskListing.completeTask (owner, task)
```

### TaskLists.Complete#3

Authored path: `TaskLists.Complete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 14.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 23.

```reaction
when TaskListing.completeTask (owner, task), asked by TaskLists.Complete#2
where
  earlier, RequestBoundary.request (path: "/tasklists/complete", requestId, session, task)
then
  RequestBoundary.respond (requestId, task)
```

### TaskLists.Delete

Authored path: `TaskLists.Delete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 13.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 22.

```reaction
when RequestBoundary.request (path: "/tasklists/delete", requestId, session, task)
then
  Sessioning.current (session)
```

### TaskLists.Delete#2

Authored path: `TaskLists.Delete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 13.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 22.

```reaction
when Sessioning.current (session, subject: owner), asked by TaskLists.Delete
where
  earlier, RequestBoundary.request (path: "/tasklists/delete", requestId, session, task)
then
  TaskListing.deleteTask (owner, task)
```

### TaskLists.Delete#3

Authored path: `TaskLists.Delete`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 13.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 22.

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
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 20.

```reaction
when RequestBoundary.request (path: "/tasklists/view", requestId, session)
then
  Sessioning.current (session)
```

### TaskLists.View#2

Authored path: `TaskLists.View`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 4.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 20.

```reaction
when Sessioning.current (session, subject: owner), asked by TaskLists.View
then
  TaskListing.initialize (owner)
```

### TaskLists.View#3

Authored path: `TaskLists.View`.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 4.
- Covered by [TaskLists](../design/compositions/TaskLists.md), line 20.

```reaction
when TaskListing.initialize (owner), asked by TaskLists.View#2
where
  earlier, RequestBoundary.request (path: "/tasklists/view", requestId, session)
then
  RequestBoundary.respond (list: former "the task list of (owner)" with (owner), requestId)
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
- `/tasklists/add` — requires `session`, `task`
- `/tasklists/complete` — requires `session`, `task`
- `/tasklists/delete` — requires `session`, `task`
- `/tasklists/view` — requires `session`
