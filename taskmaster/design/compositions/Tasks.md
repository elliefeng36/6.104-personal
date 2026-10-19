# Tasks

[Creating a task](reaction:Tasks.Make) resolves the session owner, initializes
their list, creates TaskSetting details, and adds the returned task identity to
TaskListing. A name is required; deadline, duration, and recurring period are
optional. Deadlines use UTC ISO timestamps, duration uses minutes, and recurring
period uses days by default or whole calendar months when recurringUnit is months. No task record is created if validation fails.

Both endpoints bind now(instant) in their reaction conditions. Session checking
and deadline validation receive that same framework-owned flow instant; clients
cannot supply or override it.

[Updating details](reaction:Tasks.Update) resolves the owner and applies one
atomic patch. Omitted fields stay unchanged; null clears optional fields.
TaskSetting refuses missing tasks and tasks belonging to another owner with the
same error. Invalid patches change nothing. Existing deadlines may be overdue;
only a newly assigned deadline must be future. Updating recurrence settings
cancels or resets the anchored schedule immediately, independently of list membership.

```endpoints
Tasks.Make at /tasks/make
Tasks.Update at /tasks/update
```

Updates require active membership in the owner's TaskListing list. Mutually exclusive
active and inactive branches either apply the TaskSetting patch or return NO_SUCH_TASK.
Completed, deleted, and missing tasks cannot be edited. Recurring tasks become editable
again when their next occurrence returns to Active. TaskSetting remains independent
of list membership; this application rule is enforced only by composition.
