/**
 * Runtime endpoint validators shared by the composition modules.
 *
 * Generated TypeScript types constrain callers that compile against the wire;
 * these functions reject the untyped values a real request can carry. This
 * module holds no declarations, so assembly never walks it.
 */
import type { EndpointValidator } from "@mit-sdg/sync-engine/boundary";

export function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasOnly(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function validator(
  accepts: (value: Record<string, unknown>) => boolean,
  detail: string,
): EndpointValidator {
  return (value) => (record(value) && accepts(value) ? { ok: true } : { ok: false, detail });
}

/** A session input always arrives from the cookie binding, or not at all. */
function fromCookie(value: Record<string, unknown>): boolean {
  return typeof value.session === "string" || value.session === null;
}

export const credentialsInput = validator(
  (value) =>
    hasOnly(value, ["username", "password"]) &&
    typeof value.username === "string" &&
    typeof value.password === "string" &&
    value.username.length <= 32 &&
    value.password.length <= 128,
  "username and password must be bounded strings",
);

export const sessionOnlyInput = validator(
  (value) => hasOnly(value, ["session"]) && fromCookie(value),
  "session must be a string or absent cookie",
);

export const usernameOutput = validator(
  (value) => hasOnly(value, ["username"]) && typeof value.username === "string",
  "response must contain a username",
);

export const signedOutOutput = validator(
  (value) => hasOnly(value, ["signedOut"]) && value.signedOut === true,
  "response must confirm sign-out",
);

export const issuedSessionOutput = validator(
  (value) =>
    hasOnly(value, ["account", "session", "expiresAt"]) &&
    typeof value.account === "string" &&
    typeof value.session === "string" &&
    value.expiresAt instanceof Date,
  "response must contain account, session, and Date expiry",
);

