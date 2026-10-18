# Implemented application types

This increment selects authentication, sessions, and task listing. The remaining task concept drafts
in types.md will enter the assembled design when those features are implemented.
Sessions identify the account username established by accepted credentials.

```types
concrete Task
  A temporary task identity represented by a fixed sample name until TaskSetting is implemented.
```

```instances
instantiate Authenticating
instantiate Sessioning with
  Subject is Authenticating.Account
instantiate TaskListing with
  User is Authenticating.Account
  Task is Task
```
