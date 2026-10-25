import { expect, test } from "bun:test";
import { taskFieldErrors } from "../frontend/src/task-validation.ts";

const now = new Date("2030-01-01T12:00:00Z").getTime();
const valid = { name: "Task", deadline: "", duration: "", repeat: "none", recurringPeriod: "" };
test("reports only an invalid deadline", () => {
  expect(taskFieldErrors({ ...valid, deadline: "2029-01-01T00:00:00Z" }, now)).toEqual(["Deadline must be in the future."]);
});
test("reports both bad deadline and duration without an unrelated recurrence error", () => {
  expect(taskFieldErrors({ ...valid, deadline: "2029-01-01T00:00:00Z", duration: -1 }, now)).toEqual([
    "Deadline must be in the future.", "Duration must be a nonnegative number of minutes.",
  ]);
});
test("valid optional fields and unchanged overdue deadlines do not block edits", () => {
  expect(taskFieldErrors(valid, now)).toEqual([]);
  expect(taskFieldErrors({ ...valid, deadline: "2029-01-01T00:00:00Z", duration: 0 }, now, "2029-01-01T00:00:00Z")).toEqual([]);
  expect(taskFieldErrors({ ...valid, deadline: "2031-01-01T00:00:00Z", repeat: "custom", recurringPeriod: 0.5 }, now)).toEqual([]);
});
test("reports invalid names, dates, durations and active custom intervals individually", () => {
  expect(taskFieldErrors({ ...valid, name: " ", deadline: "bad", duration: Infinity, repeat: "custom", recurringPeriod: -1 }, now)).toHaveLength(4);
  expect(taskFieldErrors({ ...valid, repeat: "custom", recurringPeriod: "" }, now)).toEqual(["Repeat interval must be a positive number of days."]);
  expect(taskFieldErrors({ ...valid, repeat: "custom", recurringPeriod: Number.MAX_VALUE }, now)).toEqual(["Repeat interval is too large."]);
  expect(taskFieldErrors({ ...valid, recurringPeriod: -1 }, now)).toEqual([]);
});
