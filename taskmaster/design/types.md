# Implemented application types

This application selects authentication, sessions, task listing, task setting,
task suggesting, task sorting, and task filtering.
Sessions identify the account username established by accepted credentials.

```instances
instantiate Authenticating

instantiate Sessioning with
  Subject is Authenticating.Account

instantiate TaskListing with
  User is Authenticating.Account
  Task is TaskSetting.Task

instantiate TaskSetting with
  User is Authenticating.Account

instantiate TaskSuggesting with
  User is Authenticating.Account
  Task is TaskSetting.Task
instantiate TaskSorting with
  Task is TaskSetting.Task

instantiate TaskFiltering with
  Task is TaskSetting.Task
```
