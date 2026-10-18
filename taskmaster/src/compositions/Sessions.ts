/**
 * Accounts and browser sessions: registering, signing in and out, and resolving
 * the current user.
 *
 * Authenticating proves an account reference represented by its username.
 * Sessioning holds an opaque session for an external subject. Neither names the
 * other; the adaptation lives here.
 */
import { now } from "@mit-sdg/sync-engine/language";
import { endpoint, receive, respond } from "@mit-sdg/sync-engine/boundary";

import { concepts } from "../concepts.ts";
import {
  credentialsInput,
  issuedSessionOutput,
  sessionOnlyInput,
  signedOutOutput,
  usernameOutput,
} from "./validators.ts";

const { Authenticating, Sessioning } = concepts;

const Register = endpoint(
  "/auth/register",
  ({ username, password, account, session, expiresAt, instant }) =>
    receive({ username, password })
      .where(now(instant))
      .then(Authenticating.register({ username, password }).responds({ account }))
      .then(Sessioning.start({ subject: account, instant }).responds({ session, expiresAt }))
      .then(respond({ account, session, expiresAt })),
  {
    input: { required: ["username", "password"] },
    validators: { input: credentialsInput, output: issuedSessionOutput },
  },
);

const SignIn = endpoint(
  "/auth/sign-in",
  ({ username, password, account, session, expiresAt, instant }) =>
    receive({ username, password })
      .where(now(instant))
      .then(Authenticating.authenticate({ username, password }).responds({ account }))
      .then(Sessioning.start({ subject: account, instant }).responds({ session, expiresAt }))
      .then(respond({ account, session, expiresAt })),
  {
    input: { required: ["username", "password"] },
    validators: { input: credentialsInput, output: issuedSessionOutput },
  },
);

const CurrentUser = endpoint(
  "/auth/current",
  ({ session, instant, username }) =>
    receive({ session })
      .where(now(instant))
      .then(Sessioning.current({ session, instant }).responds({ subject: username }))
      .then(respond({ username })),
  {
    input: { required: ["session"] },
    validators: { input: sessionOnlyInput, output: usernameOutput },
  },
);

const SignOut = endpoint(
  "/auth/sign-out",
  ({ session, instant, signedOut }) =>
    receive({ session })
      .where(now(instant))
      .then(Sessioning.end({ session, instant }).responds({ ended: signedOut }))
      .then(respond({ signedOut })),
  {
    input: { required: ["session"] },
    validators: { input: sessionOnlyInput, output: signedOutOutput },
  },
);

export const composition = {
  EnteringApplication: { Register, SignIn },
  CurrentAccount: { CurrentUser },
  LeavingApplication: { SignOut },
};
