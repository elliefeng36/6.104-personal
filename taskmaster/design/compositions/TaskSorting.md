# TaskSorting

[Viewing tasks](reaction:TaskSorting.View) resolves the cookie session and joins the owner's
TaskListing memberships to TaskSetting details. The client cannot supply task records
or another owner's identity. Missing detail records and deleted tasks are excluded.
The active and completed lists are transformed separately without changing membership.
TaskSorting applies the selected comparator to each snapshot.

Sorting is ascending by deadline or estimated duration, with missing values last.
Ties retain membership order. The none option retains the entire original order.
Filters allow all, recurring, or nonrecurring tasks and an optional finite nonnegative
maximum duration in minutes. Missing estimates count as zero for filtering.
Options are transient and never change stored task data.

```endpoints
TaskSorting.View at /taskSorting/view
```

The application computations supply snapshots and policies to both compositions.

```computations
taskSnapshot(taskList: TaskListing.TaskList, records: TaskSetting.TaskRecords, status: String) : TaskSorting.TaskList
  Join selected active or completed identities to owner-filtered records in membership order.
taskComparator(sortBy: String) : TaskSorting.Comparator
  Produce a callable ascending comparator for deadline, duration, or stable original order.
taskFilter(recurring: String, maxDuration: Number) : TaskFiltering.Filter
  Produce a callable predicate combining recurrence selection and an inclusive maximum duration.
```

The [task snapshot](computation:taskSnapshot),
[comparator](computation:taskComparator), and [filter](computation:taskFilter) contain application policies.
