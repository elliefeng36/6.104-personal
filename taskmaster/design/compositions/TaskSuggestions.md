# TaskSuggestions

[Requesting a suggestion](reaction:TaskSuggestions.MakeRequest) resolves the
session user using the framework flow instant, creates a validated suggestion
request, supplies the candidate pool, and
returns the result. The browser may send an optional timeLimit in minutes; it
cannot supply a user, request identity, candidate pool, or flow timestamp.

The [candidate computation](computation:suggestionCandidates) joins only the user's active TaskListing identities with
owner-filtered TaskSetting records. Completed, deleted, missing, other users',
and legacy dummy tasks are excluded. TaskSuggesting receives a transient
snapshot and never imports, calls, or queries those concepts itself.

```computations
suggestionCandidates(taskList: TaskListing.TaskList, records: TaskSetting.TaskRecords) : TaskSuggesting.CandidatePool
  Joins active memberships to owner-filtered detail records in addition order and projects only identity, deadline, and duration into a transient pool.
```

No limit considers all active candidates, including unknown durations. A limit
requires a known duration at most the limit; zero permits zero-duration tasks.
Ranking uses earliest deadline, overdue before future, undated last, with
addition order breaking ties. Empty lists return EMPTY_TASKLIST; when nothing
fits, NO_VIABLE_TASKS is a successful empty outcome. Invalid limits are refused
and publicly mapped to INVALID_REQUEST. Requests and their latest result are
retained in MongoDB, but no candidate metadata is copied there.

```endpoints
TaskSuggestions.MakeRequest at /taskSuggestions/makeRequest
```
