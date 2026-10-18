# Sessions

Sessions connect accepted account credentials to opaque, independently expiring
application sessions.

Every endpoint binds the framework-owned flow instant with now(instant) and
supplies it to Sessioning. Session expiry is compared against this explicit
instant, rather than an independently read concept clock. Clients cannot
choose the timestamp.

Registration [establishes a new account and starts a session](reaction:Sessions.EnteringApplication.Register)
for the returned account reference, which is that account's username.
[Sign-in](reaction:Sessions.EnteringApplication.SignIn) proves an existing account's
credentials and starts a new session for the returned account reference. In both
cases callers cannot choose a different subject.

```endpoints
Sessions.EnteringApplication.Register at /auth/register
Sessions.EnteringApplication.SignIn at /auth/sign-in
```

An [active session resolves to its subject username](reaction:Sessions.CurrentAccount.CurrentUser).
Future task activity will use that resolved username as its owner. An unknown, ended, or
expired session does not identify a current account.

```endpoints
Sessions.CurrentAccount.CurrentUser at /auth/current
```

[Signing out ends the presented active session](reaction:Sessions.LeavingApplication.SignOut).
Other sessions for the same account remain independent, and an ended session no
longer identifies a signed-in user.

```endpoints
Sessions.LeavingApplication.SignOut at /auth/sign-out
```
