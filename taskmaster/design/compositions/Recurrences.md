# Recurrences

[Re-adding a due occurrence](reaction:Recurrences.Readd) responds to a ready
TaskSetting.releaseOccurrence result by reopening the task through TaskListing
and acknowledging the durable cycle. An unfinished active task remains a single
active entry. Deleted tasks are not resurrected. Retries do not shift dates twice.

TaskSetting anchors recurrence when enabled or changed, independently of completion.
Daily and weekly schedules use fixed days; monthly schedules retain the UTC calendar
date, clamping shorter months to their last day. Custom intervals use positive days.
Missed occurrences coalesce; the next scheduled occurrence remains on the original
cadence. Deadlines advance with recurrence. Schedules persist across restarts.
The host checks every second and the Vue frontend polls every five seconds.
