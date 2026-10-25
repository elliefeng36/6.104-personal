// Check all task fields before sending any changes to the server.
export function taskFieldErrors(draft: {
  name: string; deadline: string; duration: string | number;
  repeat: string; recurringPeriod: string | number;
}, instant = Date.now(), originalDeadline?: string): string[] {
  const errors: string[] = [];
  if (!draft.name.trim() || draft.name.length > 200) errors.push("Task name must contain 1–200 characters.");
  if (draft.deadline && draft.deadline !== originalDeadline) {
    const time = new Date(draft.deadline).getTime();
    if (!Number.isFinite(time)) errors.push("Enter a valid deadline.");
    else if (time <= instant) errors.push("Deadline must be in the future.");
  }
  if (draft.duration !== "" && (!Number.isFinite(Number(draft.duration)) || Number(draft.duration) < 0)) {
    errors.push("Duration must be a nonnegative number of minutes.");
  }
  if (draft.repeat === "custom") {
    const days = Number(draft.recurringPeriod);
    if (!String(draft.recurringPeriod).trim() || !Number.isFinite(days) || days <= 0) {
      errors.push("Repeat interval must be a positive number of days.");
    } else if (!Number.isFinite(new Date(instant + days * 86400000).getTime())) {
      errors.push("Repeat interval is too large.");
    }
  }
  return errors;
}
