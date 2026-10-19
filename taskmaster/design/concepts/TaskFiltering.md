# TaskFiltering

## Purpose

Return a filtered copy of an externally supplied task list.

## Principle

A caller supplies a list and a predicate. The result contains the same task values
that satisfy the predicate, in their original order. The input list is unchanged, and no task data is retained.

## Types

```types
external Task
  A task value supplied by the application; the concept knows no task fields.
opaque TaskList
  An ordered array of external Task values, including empty arrays and repeated values.
opaque Filter
  A callable predicate from one Task value to a boolean.
```

## State

```state
```

## Actions

```actions
filter (tasks: TaskList, filter: Filter) : returns (tasks: TaskList)
  where the supplied list and callable are valid
  then
    produce a new filtered array without mutating or retaining the input
    returns tasks
```

## Queries

```queries
```
