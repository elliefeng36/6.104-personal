# TaskLists

Each endpoint resolves the session subject and uses it as owner; callers cannot
select another user's list. [Viewing tasks](reaction:TaskLists.View) initializes
an empty list if needed and uses [the list former](former:TaskLists.List) to
return active and completed tasks. Existing lists are never reset by viewing.

[Adding a sample task](reaction:TaskLists.Add) initializes the list if needed,
then adds one of the three fixed dummy Task identities. Real TaskSetting records
will replace these sample identities in a later increment. Adding an already
listed task is a no-op, including when it is completed.

[Deleting](reaction:TaskLists.Delete) removes an active task.
[Completing](reaction:TaskLists.Complete) moves it to completed tasks.
Completed, deleted, nonexistent, and other users' tasks are not active in the
caller's list and cannot be deleted or completed. Missing active tasks return
NOT_FOUND through the HTTP policy. Completed tasks remain visible read-only.

```endpoints
TaskLists.View at /tasklists/view
TaskLists.Add at /tasklists/add
TaskLists.Delete at /tasklists/delete
TaskLists.Complete at /tasklists/complete
```
