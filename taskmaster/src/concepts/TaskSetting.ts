// Creates and edits task details while enforcing ownership.
import type { Collection, UpdateFilter } from "mongodb";

export class EmptyName extends Error {}
export class InvalidDeadline extends Error {}
export class InvalidDuration extends Error {}
export class InvalidRecurringPeriod extends Error {}
export class TaskNotFound extends Error {}

export type Task = {
  task: string; owner: string; name: string; hasDeadline: boolean;
  deadline?: string; duration?: number; isRecurring: boolean; recurringUnit?: string; recurringPeriod?: number;
  recurrenceDeadlineAnchor?: string; nextOccurrenceAt?: string; recurrenceAnchor?: string; pendingRecurrence?: string;
};
export type TaskChanges = { name?: string; deadline?: string | null; duration?: number | null; recurringUnit?: string | null; recurringPeriod?: number | null };

export class TaskSettingConcept {
  constructor(
    private readonly tasks: Collection<Task> | undefined = undefined,
  ) {}
  private get store(): Collection<Task> {
    if (!this.tasks) throw new Error("TaskSetting requires a MongoDB collection.");
    return this.tasks;
  }

  async makeTask({ owner, name, deadline, duration, recurringPeriod, recurringUnit, instant }: {
    owner: string; name: string; deadline?: string | null; duration?: number | null; recurringUnit?: string | null; recurringPeriod?: number | null; instant: Date;
  }) {
    deadline = deadline ?? undefined; duration = duration ?? undefined; recurringPeriod = recurringPeriod ?? undefined;
    if (typeof name !== "string") throw new EmptyName("Task name must contain 1 to 200 characters.");
    this.#validate({ name, deadline, duration, recurringPeriod, recurringUnit }, instant);
    const task = crypto.randomUUID();
    await this.store.insertOne({ task, owner, name: name.trim(), hasDeadline: deadline !== undefined,
      isRecurring: recurringPeriod !== undefined,
      ...(deadline !== undefined ? { deadline } : {}), ...(duration !== undefined ? { duration } : {}),
      ...(recurringPeriod !== undefined ? { recurringPeriod, recurringUnit: recurringUnit ?? "days", ...(deadline ? { recurrenceDeadlineAnchor: deadline } : {}), recurrenceAnchor: instant.toISOString(), nextOccurrenceAt: this.#next(instant.toISOString(), recurringPeriod, recurringUnit ?? "days", instant) } : {}),
    });
    return { task };
  }

  async updateTask({ owner, task, changes, instant }: { owner: string; task: string; changes: TaskChanges; instant: Date }) {
    return this.#update(owner, task, changes, instant);
  }
  async setName({ owner, task, name }: { owner: string; task: string; name: string }) {
    return this.#update(owner, task, { name });
  }
  async setDeadline({ owner, task, deadline, instant }: { owner: string; task: string; deadline: string; instant: Date }) {
    return this.#update(owner, task, { deadline }, instant);
  }
  async removeDeadline({ owner, task }: { owner: string; task: string }) {
    return this.#update(owner, task, { deadline: null });
  }
  async setDuration({ owner, task, duration }: { owner: string; task: string; duration: number }) {
    return this.#update(owner, task, { duration });
  }
  async removeDuration({ owner, task }: { owner: string; task: string }) {
    return this.#update(owner, task, { duration: null });
  }
  async startRecurring({ owner, task, recurringPeriod, instant }: { owner: string; task: string; recurringPeriod: number; instant: Date }) {
    return this.#update(owner, task, { recurringPeriod }, instant);
  }
  async stopRecurring({ owner, task }: { owner: string; task: string }) {
    return this.#update(owner, task, { recurringPeriod: null });
  }

  async releaseOccurrence({ owner, task, scheduledFor, instant }: { owner: string; task: string; scheduledFor: string; instant: Date }) {
    const found = await this.store.findOne({ owner, task });
    if (!found) throw new TaskNotFound("There is no such task.");
    if (found.pendingRecurrence === scheduledFor) return { owner, task, cycle: scheduledFor, ready: true };
    if (!found.isRecurring || !found.recurringPeriod || found.nextOccurrenceAt !== scheduledFor || Date.parse(scheduledFor) > instant.getTime()) {
      return { owner, task, cycle: scheduledFor, ready: false };
    }
    const nextOccurrenceAt = this.#next(found.recurrenceAnchor ?? scheduledFor, found.recurringPeriod, found.recurringUnit ?? "days", instant);
    let deadline = found.deadline;
    if (deadline) {
      try {
        deadline = this.#next(found.recurrenceDeadlineAnchor ?? deadline, found.recurringPeriod, found.recurringUnit ?? "days", new Date(Math.max(instant.getTime(), Date.parse(deadline))));
      } catch (error) {
        if (error instanceof InvalidRecurringPeriod) throw new InvalidDeadline("The advanced deadline cannot be represented as a timestamp.");
        throw error;
      }
    }
    // Persist the cycle before emitting it so a restart can retry without shifting twice.
    const result = await this.store.updateOne({ owner, task, nextOccurrenceAt: scheduledFor, pendingRecurrence: { $exists: false } }, {
      $set: { pendingRecurrence: scheduledFor, nextOccurrenceAt, ...(deadline ? { deadline } : {}) },
    });
    return { owner, task, cycle: scheduledFor, ready: result.modifiedCount === 1 };
  }

  async acknowledgeOccurrence({ owner, task, cycle }: { owner: string; task: string; cycle: string }) {
    await this.store.updateOne({ owner, task, pendingRecurrence: cycle }, { $unset: { pendingRecurrence: "" } });
    return { task };
  }

  async _due({ instant }: { instant: Date }): Promise<Array<{ owner: string; task: string; scheduledFor: string }>> {
    const records = await this.store.find({ isRecurring: true, $or: [
      { nextOccurrenceAt: { $lte: instant.toISOString() } }, { pendingRecurrence: { $exists: true } },
    ] }).sort({ task: 1 }).toArray();
    return records.map(record => ({ owner: record.owner, task: record.task, scheduledFor: record.pendingRecurrence ?? record.nextOccurrenceAt! }));
  }

  async _get({ owner, task }: { owner: string; task: string }): Promise<Array<{ details: Task }>> {
    const found = await this.store.findOne({ owner, task }, { projection: { _id: 0 } });
    return found ? [{ details: found }] : [];
  }

  async _forOwner({ owner }: { owner: string }): Promise<{ records: Task[] }> {
    const records = await this.store.find({ owner }, { projection: { _id: 0 } }).sort({ task: 1 }).toArray();
    return { records };
  }

  // Calendar months retain the anchor day, clamping only the resulting date.
  #next(anchor: string, count: number, unit: string, after: Date): string {
    const base = new Date(anchor);
    let result: Date;
    if (unit === "months") {
      let steps = Math.max(1, Math.floor(((after.getUTCFullYear() - base.getUTCFullYear()) * 12 + after.getUTCMonth() - base.getUTCMonth()) / count));
      const at = (n: number) => {
        const date = new Date(base); date.setUTCDate(1); date.setUTCMonth(base.getUTCMonth() + n * count);
        const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
        date.setUTCDate(Math.min(base.getUTCDate(), last)); return date;
      };
      result = at(steps);
      if (result.getTime() <= after.getTime()) result = at(++steps);
    } else {
      const period = Math.max(1, count * 86400000);
      const steps = Math.max(1, Math.floor((after.getTime() - base.getTime()) / period) + 1);
      result = new Date(base.getTime() + steps * period);
    }
    if (!Number.isFinite(result.getTime())) throw new InvalidRecurringPeriod("Recurring interval is too large.");
    return result.toISOString();
  }

  #validate(changes: TaskChanges, instant?: Date) {
    if (changes.name !== undefined && (typeof changes.name !== "string" || !changes.name.trim() || changes.name.length > 200)) {
      throw new EmptyName("Task name must contain 1 to 200 characters.");
    }
    if (changes.recurringUnit != null && !["days", "months"].includes(changes.recurringUnit)) throw new InvalidRecurringPeriod("Use days or months.");
    if (changes.recurringUnit === "months" && changes.recurringPeriod != null && !Number.isInteger(changes.recurringPeriod)) throw new InvalidRecurringPeriod("Months must be a whole number.");
    const deadline = changes.deadline;
    if (deadline !== undefined && deadline !== null) {
      const time = typeof deadline === "string" ? Date.parse(deadline) : NaN;
      if (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/.test(deadline) ||
          !Number.isFinite(time) || !instant || !Number.isFinite(instant.getTime()) || time <= instant.getTime() || new Date(time).toISOString().slice(0, 10) !== deadline.slice(0, 10)) {
        throw new InvalidDeadline("The deadline must be a valid future UTC timestamp.");
      }
    }
    if (changes.duration !== undefined && changes.duration !== null &&
        (typeof changes.duration !== "number" || !Number.isFinite(changes.duration) || changes.duration < 0)) {
      throw new InvalidDuration("Duration must be a finite nonnegative number of minutes.");
    }
    if (changes.recurringPeriod !== undefined && changes.recurringPeriod !== null &&
        (typeof changes.recurringPeriod !== "number" || !Number.isFinite(changes.recurringPeriod) || changes.recurringPeriod <= 0)) {
      throw new InvalidRecurringPeriod("Recurring period must be a finite positive number of days.");
    }
  }

  async #update(owner: string, task: string, changes: TaskChanges, instant?: Date) {
    // Validate before applying all field changes together.
    const existing = await this.store.findOne({ owner, task });
    if (!existing) throw new TaskNotFound("There is no such task.");
    // A previously valid deadline may now be past. Only validate supplied changes.
    this.#validate(changes, instant);
    const set: Record<string, unknown> = {};
    const unset: Record<string, ""> = {};
    if (changes.name !== undefined) set.name = changes.name.trim();
    for (const field of ["deadline", "duration", "recurringPeriod"] as const) {
      const value = changes[field];
      if (value === undefined) continue;
      if (value === null) unset[field] = "";
      else set[field] = value;
    }
    if (changes.deadline !== undefined) {
      set.hasDeadline = changes.deadline !== null;
      if (changes.deadline === null) unset.recurrenceDeadlineAnchor = "";
      else if (changes.recurringPeriod !== null && (existing.isRecurring || changes.recurringPeriod !== undefined)) set.recurrenceDeadlineAnchor = changes.deadline;
    }
    if (changes.recurringPeriod !== undefined) set.isRecurring = changes.recurringPeriod !== null;
    if (changes.recurringPeriod === null) {
      unset.nextOccurrenceAt = ""; unset.pendingRecurrence = ""; unset.recurrenceAnchor = "";
      unset.recurringUnit = ""; unset.recurrenceDeadlineAnchor = "";
    } else if (changes.recurringPeriod !== undefined || changes.recurringUnit !== undefined) {
      const count = changes.recurringPeriod ?? existing.recurringPeriod;
      const unit = changes.recurringUnit === null ? "days" : changes.recurringUnit ?? existing.recurringUnit ?? "days";
      this.#validate({ recurringPeriod: count, recurringUnit: unit });
      if (count !== undefined) {
        if (!instant) throw new InvalidRecurringPeriod("An instant is required to change recurrence.");
        const anchor = instant.toISOString();
        set.recurringUnit = unit; set.recurrenceAnchor = anchor;
        if (changes.deadline !== null && (changes.deadline ?? existing.deadline)) set.recurrenceDeadlineAnchor = changes.deadline ?? existing.deadline;
        set.nextOccurrenceAt = this.#next(anchor, count, unit, instant);
        unset.pendingRecurrence = "";
      }
    }
    const update: UpdateFilter<Task> = {
      ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}),
    };
    if (Object.keys(update).length) await this.store.updateOne({ owner, task }, update);
    return { task };
  }
}
