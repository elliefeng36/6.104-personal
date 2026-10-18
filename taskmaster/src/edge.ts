// Configures HTTP errors, session cookies, and origin protection.
import { httpPolicy } from "@mit-sdg/sync-engine-http/policy";

export function authenticationPolicy(publicOrigin: string) {
  return httpPolicy({
    publicOrigin,
    basePath: "/api",
    limits: { requestBodyBytes: 4096 },
    publicErrors: {
      INVALID_USERNAME: "INVALID_REQUEST",
      WEAK_PASSWORD: "INVALID_REQUEST",
      USERNAME_TAKEN: "CONFLICT",
      INVALID_CREDENTIALS: "UNAUTHORIZED",
      UNKNOWN_SESSION: "UNAUTHORIZED",
      NO_SUCH_USER: "NOT_FOUND",
      NO_SUCH_TASK: "NOT_FOUND",
      EMPTY_NAME: "INVALID_REQUEST",
      INVALID_DEADLINE: "INVALID_REQUEST",
      INVALID_DURATION: "INVALID_REQUEST",
      INVALID_RECURRING_PERIOD: "INVALID_REQUEST",
      INVALID_TIME_LIMIT: "INVALID_REQUEST",
      UNKNOWN_SUGGEST_REQUEST: "NOT_FOUND",
    },
    cookies: {
      session: {
        name: "taskmaster-session",
        input: "session",
        issue: [
          { path: "/auth/register", value: "session", expires: "expiresAt" },
          { path: "/auth/sign-in", value: "session", expires: "expiresAt" },
        ],
        clear: ["/auth/sign-out"],
      },
    },
  });
}

export const policy = authenticationPolicy("http://localhost:3000");
