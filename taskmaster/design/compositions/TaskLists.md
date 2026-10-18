# TaskLists

A user can [see their task list](reaction:TaskLists.View).

```endpoints
TaskLists.View at /tasklists/view
```

A user [adds a task](reaction:TaskLists.Add) to their task list, and the same user can [delete a task](reaction:TaskLists.Delete).

```endpoints
TaskLists.Add at /tasklists/add
TaskLists.Delete at /tasklists/delete
```

A user [completes a task](reaction:TasksLists.Complete) in their active task list.

```endpoints
TaskLists.Complete at /tasklists/complete
```
