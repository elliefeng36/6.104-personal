# TaskLists

Each endpoint resolves the session subject and uses it as owner; callers cannot
select another user's list. [Viewing tasks](reaction:TaskLists.View) initializes
an empty list if needed and uses [the list former](former:TaskLists.List) to
return active and completed tasks. Existing lists are never reset by viewing.
Each endpoint passes its framework-owned flow instant to the session check.
Active results retain addition order; completed results retain completion order.

Tasks are created through Tasks.Make and listed by identity. The list former
joins active/completed memberships with TaskSetting's owner-filtered details.
Legacy dummy memberships without real task records are omitted from the view.

[Deleting](reaction:TaskLists.Delete) removes an active task.
[Completing](reaction:TaskLists.Complete) moves it to completed tasks.
Completed, deleted, nonexistent, and other users' tasks are not active in the
caller's list and cannot be deleted or completed. Missing active tasks return
NOT_FOUND through the HTTP policy. Completed tasks remain visible; their details
can still be edited through Tasks.Update without changing completed membership.

```endpoints
TaskLists.View at /tasklists/view
TaskLists.Delete at /tasklists/delete
TaskLists.Complete at /tasklists/complete
```
