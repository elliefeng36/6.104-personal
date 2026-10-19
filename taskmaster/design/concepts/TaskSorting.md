# TaskSorting

## Purpose

Return a sorted copy of an externally supplied task list.

## Principle

A caller supplies a list and a comparator. The result contains the same task values
in stable comparator order. The input list is unchanged, and no task data is retained.

## Types

```types
external Task
  A task value supplied by the application; the concept knows no task fields.
opaque TaskList
  An ordered array of external Task values, including empty arrays and repeated values.
opaque Comparator
  A callable comparison from two Task values to a number; negative, zero, and positive mean before, tied, and after.
```

## State

```state
```

## Actions

```actions
sort (tasks: TaskList, comparator: Comparator) : returns (tasks: TaskList)
  where the supplied list and callable are valid
  then
    produce a new stably sorted array without mutating or retaining the input
    returns tasks
```

## Queries

```queries
```
