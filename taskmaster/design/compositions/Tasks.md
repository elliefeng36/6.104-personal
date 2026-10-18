# Tasks

A user can [make a new task](reaction:Tasks.Make).

```endpoints
Tasks.Make at /tasks/make
```

A user can [set a deadline for a task](reaction:Tasks.SetDeadline), [remove the deadline for a task](reaction:Tasks.RemoveDeadline), [set the duration for a task](reaction:Tasks.SetDuration), [set a task as recurring](reaction:Tasks.StartRecurring), and [stop making a task recur](reaction:Tasks.StopRecurring).

```endpoints
Tasks.SetDeadline at /tasks/setDeadline
Tasks.RemoveDeadline at /tasks/removeDeadline
Tasks.SetDuration at /tasks/setDuration
Tasks.StartRecurring at /tasks/startRecurring
Tasks.StopRecurring at /tasks/stopRecurring
```
