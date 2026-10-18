# TaskSuggesting

## Purpose

Reduce decision overload by choosing an urgent task that fits an optional
available-time budget.

## Principle

Alice requests a suggestion and supplies task candidates. Without a time limit,
the earliest-deadline candidate is suggested. With a time limit, candidates
must have a known duration that fits. An empty candidate pool and a pool with no
fitting candidate produce explicit empty outcomes instead of an invented task.

## Types

```types
external User
  The identity requesting a suggestion.
external Task
  An opaque task identity; this concept owns no task details.
opaque CandidatePool
  An entries array of records with details containing task, optional deadline UTC ISO string, and optional duration in minutes. The caller supplies this transient snapshot.
opaque Suggestion
  A record with nullable task and outcome SUGGESTED, EMPTY_TASKLIST, or NO_VIABLE_TASKS.
Outcome is PENDING or SUGGESTED or EMPTY_TASKLIST or NO_VIABLE_TASKS
```

## State

```state
a set of SuggestRequests with
  a user User
  an optional timeLimit Number
  an outcome Outcome
  an optional suggestedTask Task
Rule: Candidate details are transient inputs and are never persisted as a copy of another concept's state.
```

## Actions

```actions
makeRequest (user: User, timeLimit?: Number) : returns (request: SuggestRequest)
  where timeLimit is supplied and is not a finite nonnegative number
  then
    refuses INVALID_TIME_LIMIT "Time limit must be a finite nonnegative number of minutes."
  where timeLimit is absent or null or a finite nonnegative number
  then
    create a fresh request with user, optional timeLimit, and PENDING outcome
    returns request

makeSuggestion (request: SuggestRequest, pool: CandidatePool) : returns (suggestion: Suggestion)
  where request is unknown
  then
    refuses UNKNOWN_SUGGEST_REQUEST "There is no such suggestion request."
  where pool has no candidates
  then
    record EMPTY_TASKLIST outcome and remove any previous suggestedTask
    set suggestion to a record with null task and EMPTY_TASKLIST outcome
    returns suggestion
  where a time limit is set and no candidate has a finite nonnegative duration at most that limit
  then
    record NO_VIABLE_TASKS outcome and remove any previous suggestedTask
    set suggestion to a record with null task and NO_VIABLE_TASKS outcome
    returns suggestion
  where at least one candidate is viable
  then
    with no time limit consider all candidates, otherwise consider only known durations at most the limit
    choose the earliest deadline, including overdue deadlines before future ones, with absent or invalid deadlines last
    break ties by supplied candidate order
    record SUGGESTED outcome and chosen task identity
    set suggestion to a record with chosen task and SUGGESTED outcome
    returns suggestion
```

## Queries

```queries
```
