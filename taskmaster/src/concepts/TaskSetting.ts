// Creates and edits task details while enforcing ownership.
import type { Collection, UpdateFilter } from "mongodb";

export class EmptyName extends Error {}
export class InvalidDeadline extends Error {}
export class InvalidDuration extends Error {}
export class InvalidRecurringPeriod extends Error {}
export class TaskNotFound extends Error {}

export type Task = {
  task: string; owner: string; name: string; hasDeadline: boolean;
  deadline?: string; duration?: number; isRecurring: boolean; recurringPeriod?: number;
};
export type TaskChanges = { name?: string; deadline?: string | null; duration?: number | null; recurringPeriod?: number | null };

export class TaskSettingConcept {
  constructor(
    private readonly tasks: Collection<Task> | undefined = undefined,
  ) {}
  private get store(): Collection<Task> {
    if (!this.tasks) throw new Error("TaskSetting requires a MongoDB collection.");
    return this.tasks;
  }

  async makeTask({ owner, name, deadline, duration, recurringPeriod, instant }: {
    owner: string; name: string; deadline?: string | null; duration?: number | null; recurringPeriod?: number | null; instant: Date;
  }) {
    deadline = deadline ?? undefined; duration = duration ?? undefined; recurringPeriod = recurringPeriod ?? undefined;
    if (typeof name !== "string") throw new EmptyName("Task name must contain 1 to 200 characters.");
    this.#validate({ name, deadline, duration, recurringPeriod }, instant);
    const task = crypto.randomUUID();
    await this.store.insertOne({ task, owner, name: name.trim(), hasDeadline: deadline !== undefined,
      isRecurring: recurringPeriod !== undefined,
      ...(deadline !== undefined ? { deadline } : {}), ...(duration !== undefined ? { duration } : {}),
      ...(recurringPeriod !== undefined ? { recurringPeriod } : {}),
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
  async startRecurring({ owner, task, recurringPeriod }: { owner: string; task: string; recurringPeriod: number }) {
    return this.#update(owner, task, { recurringPeriod });
  }
  async stopRecurring({ owner, task }: { owner: string; task: string }) {
    return this.#update(owner, task, { recurringPeriod: null });
  }

  async _get({ owner, task }: { owner: string; task: string }): Promise<Array<{ details: Task }>> {
    const found = await this.store.findOne({ owner, task }, { projection: { _id: 0 } });
    return found ? [{ details: found }] : [];
  }

  async _forOwner({ owner }: { owner: string }): Promise<{ records: Task[] }> {
    const records = await this.store.find({ owner }, { projection: { _id: 0 } }).sort({ task: 1 }).toArray();
    return { records };
  }

  #validate(changes: TaskChanges, instant?: Date) {
    if (changes.name !== undefined && (typeof changes.name !== "string" || !changes.name.trim() || changes.name.length > 200)) {
      throw new EmptyName("Task name must contain 1 to 200 characters.");
    }
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
    if (!(await this.store.findOne({ owner, task }))) throw new TaskNotFound("There is no such task.");
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
    if (changes.deadline !== undefined) set.hasDeadline = changes.deadline !== null;
    if (changes.recurringPeriod !== undefined) set.isRecurring = changes.recurringPeriod !== null;
    const update: UpdateFilter<Task> = {
      ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}),
    };
    if (Object.keys(update).length) await this.store.updateOne({ owner, task }, update);
    return { task };
  }
}
