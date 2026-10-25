// Translate transport and server failures without exposing internal details.
export function serviceError(code: string, fallback: string): string {
  switch (code) {
    case "NETWORK_ERROR": return "Cannot reach Taskmaster. Check your connection and make sure the server is running, then try again.";
    case "TIMED_OUT": return "Taskmaster took too long to respond. Refresh to check whether your action succeeded before trying again.";
    case "FORBIDDEN": return "This address is not allowed to access Taskmaster. Open the app at its configured address and try again.";
    case "BAD_JSON":
    case "TRANSPORT_ERROR":
    case "RESPONSE_TOO_LARGE": return "Taskmaster returned an unexpected response. Refresh the page; if it continues, check the server configuration.";
    case "BAD_STATUS":
    case "INTERNAL_ERROR": return "Taskmaster encountered a server error. Please try again shortly.";
    case "ABORTED": return "The request was interrupted. Refresh to check whether your action succeeded before trying again.";
    default: return fallback;
  }
}

export function signInError(code: string, registering: boolean): string {
  if (code === "UNAUTHORIZED") return "The username or password is incorrect.";
  if (code === "CONFLICT") return "That username is already registered. Log in or choose another username.";
  if (code === "INVALID_REQUEST") return registering
    ? "Use a username of 3–32 letters, numbers, underscores, or hyphens and a password of 8–128 characters."
    : "Enter your username and password.";
  return serviceError(code, registering ? "Could not create your account. Please try again." : "Could not sign in. Please try again.");
}
