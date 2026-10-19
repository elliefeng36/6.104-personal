# TaskFiltering

[Viewing tasks](reaction:TaskFiltering.View) resolves the cookie session and joins the owner's
TaskListing memberships to TaskSetting details. The client cannot supply task records
or another owner's identity. Missing detail records and deleted tasks are excluded.
The active and completed lists are transformed separately without changing membership.
The TaskFiltering predicate combines recurrence and maximum duration, then TaskSorting orders each result.

Sorting is ascending by deadline or estimated duration, with missing values last.
Ties retain membership order. The none option retains the entire original order.
Filters allow all, recurring, or nonrecurring tasks and an optional finite nonnegative
maximum duration in minutes. Missing estimates count as zero for filtering.
Options are transient and never change stored task data.

```endpoints
TaskFiltering.View at /taskFiltering/view
```
