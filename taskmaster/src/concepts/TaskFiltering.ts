// Transforms a supplied snapshot without owning task state.
export class TaskFilteringConcept<Task> {
  async filter({ tasks, filter }: { tasks: Task[]; filter: (task: Task) => boolean }): Promise<{ tasks: Task[] }> {
    return { tasks: tasks.filter(filter) };
  }
}
