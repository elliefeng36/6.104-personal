import { expect, test } from "bun:test";
import { serviceError, signInError } from "../frontend/src/errors.ts";

test("connection and server errors do not blame credentials", () => {
  for (const code of ["NETWORK_ERROR", "TIMED_OUT", "FORBIDDEN", "BAD_JSON", "BAD_STATUS", "INTERNAL_ERROR", "TRANSPORT_ERROR", "RESPONSE_TOO_LARGE", "ABORTED"]) {
    const message = signInError(code, false);
    expect(message).not.toContain("password");
    expect(message).not.toBe("Could not sign in. Please try again.");
  }
  expect(signInError("NETWORK_ERROR", false)).toContain("server is running");
  expect(signInError("FORBIDDEN", false)).toContain("configured address");
  expect(serviceError("TIMED_OUT", "fallback")).toContain("whether your action succeeded");
});

test("credential and registration failures retain specific guidance", () => {
  expect(signInError("UNAUTHORIZED", false)).toBe("The username or password is incorrect.");
  expect(signInError("CONFLICT", true)).toContain("already registered");
  expect(signInError("INVALID_REQUEST", true)).toContain("8–128");
  expect(signInError("INVALID_REQUEST", false)).toBe("Enter your username and password.");
  expect(serviceError("UNKNOWN", "Fallback message")).toBe("Fallback message");
});
