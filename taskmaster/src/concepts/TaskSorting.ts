// Transforms a supplied snapshot without owning task state.
export class TaskSortingConcept<Task> {
  async sort({ tasks, comparator }: { tasks: Task[]; comparator: (left: Task, right: Task) => number }): Promise<{ tasks: Task[] }> {
    return { tasks: [...tasks].sort(comparator) };
  }
}
