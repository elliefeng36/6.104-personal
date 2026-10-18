import type { Collection } from "mongodb";

export class NoSuchUser extends Error {}
export class NoSuchTask extends Error {}
export type TaskList = { owner: string; activeTasks: string[]; completedTasks: string[] };

export class TaskListingConcept {
  constructor(private readonly lists: Collection<TaskList> | undefined = undefined) {}

  private get store(): Collection<TaskList> {
    if (!this.lists) throw new Error("TaskListing requires a MongoDB collection.");
    return this.lists;
  }

  async initialize({ owner }: { owner: string }) {
    await this.store.updateOne({ owner }, { $setOnInsert: { owner, activeTasks: [], completedTasks: [] } }, { upsert: true });
    return { owner };
  }

  async addTask({ owner, task }: { owner: string; task: string }) {
    const result = await this.store.updateOne(
      { owner, completedTasks: { $ne: task } }, { $addToSet: { activeTasks: task } },
    );
    if (!result.matchedCount && !(await this.store.findOne({ owner }))) {
      throw new NoSuchUser("There is no such user.");
    }
    return { task };
  }

  async deleteTask({ owner, task }: { owner: string; task: string }) {
    const result = await this.store.updateOne({ owner, activeTasks: task }, { $pull: { activeTasks: task } });
    if (!result.matchedCount) await this.#refuseMissing(owner);
    return { task };
  }

  async completeTask({ owner, task }: { owner: string; task: string }) {
    // One atomic update prevents concurrent completion/deletion from succeeding twice.
    const result = await this.store.updateOne(
      { owner, activeTasks: task },
      { $pull: { activeTasks: task }, $addToSet: { completedTasks: task } },
    );
    if (!result.matchedCount) await this.#refuseMissing(owner);
    return { task };
  }

  async _viewTasks({ owner }: { owner: string }): Promise<{ taskList: TaskList }> {
    const found = await this.store.findOne({ owner });
    return { taskList: { owner, activeTasks: found?.activeTasks ?? [], completedTasks: found?.completedTasks ?? [] } };
  }

  async _active({ owner }: { owner: string }): Promise<Array<{ task: string }>> {
    const found = await this.store.findOne({ owner });
    return (found?.activeTasks ?? []).map(task => ({ task }));
  }

  async _completed({ owner }: { owner: string }): Promise<Array<{ task: string }>> {
    const found = await this.store.findOne({ owner });
    return (found?.completedTasks ?? []).map(task => ({ task }));
  }

  async #refuseMissing(owner: string): Promise<never> {
    if (!(await this.store.findOne({ owner }))) throw new NoSuchUser("There is no such user.");
    throw new NoSuchTask("There is no such active task.");
  }
}
