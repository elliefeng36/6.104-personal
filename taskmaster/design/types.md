# Application types

Users are created when they make their account.

```types
concrete User
    the user information associated with a user's account.
```

```instances
instantiate TaskListing with
    User is User
    Task is Task

instantiate TaskSetting with
    User is User

instantiate TaskSuggesting with
    User is User
```
