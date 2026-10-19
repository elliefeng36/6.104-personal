# TaskLists

Each endpoint resolves the session subject and uses it as owner; callers cannot
select another user's list. [Viewing tasks](reaction:TaskLists.View) initializes
an empty list if needed and uses [the list former](former:TaskLists.List) to
return active and completed tasks. Existing lists are never reset by viewing.
Each endpoint passes its framework-owned flow instant to the session check.
Active results retain addition order; completed results retain completion order.

Tasks are created through Tasks.Make and listed by identity. The list former
joins active/completed memberships with TaskSetting's owner-filtered details.
Memberships without task details are omitted from the view.

[Deleting](reaction:TaskLists.Delete) removes an active task. The Vue client opens
an in-page confirmation dialog first; canceling sends no request. Confirmation is
a presentation concern, so the concept retains its active-task deletion action.
[Completing](reaction:TaskLists.Complete) moves it to completed tasks without
changing its independently anchored recurrence schedule.
Completed, deleted, nonexistent, and other users' tasks are not active in the
caller's list and cannot be deleted or completed. Missing active tasks return
NOT_FOUND through the HTTP policy. Completed tasks remain visible but cannot be edited until a recurrence returns
them to Active.

```endpoints
TaskLists.View at /tasklists/view
TaskLists.Delete at /tasklists/delete
TaskLists.Complete at /tasklists/complete
```
