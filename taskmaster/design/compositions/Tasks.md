# Tasks

[Creating a task](reaction:Tasks.Make) resolves the session owner, initializes
their list, creates TaskSetting details, and adds the returned task identity to
TaskListing. A name is required; deadline, duration, and recurring period are
optional. Deadlines use UTC ISO timestamps, duration uses minutes, and recurring
period uses days. No task record is created if validation fails.

Both endpoints bind now(instant) in their reaction conditions. Session checking
and deadline validation receive that same framework-owned flow instant; clients
cannot supply or override it.

[Updating details](reaction:Tasks.Update) resolves the owner and applies one
atomic patch. Omitted fields stay unchanged; null clears optional fields.
TaskSetting refuses missing tasks and tasks belonging to another owner with the
same error. Invalid patches change nothing. Existing deadlines may be overdue;
only a newly assigned deadline must be future. Updating recurrence settings
does not yet schedule or generate repeat tasks.

```endpoints
Tasks.Make at /tasks/make
Tasks.Update at /tasks/update
```
