// Application policies operate on owner-scoped snapshots, outside the concepts.
import type { Task } from "../concepts/TaskSetting.ts";
import type { TaskList } from "../concepts/TaskListing.ts";
export function taskSnapshot({ taskList, records, status }: { taskList: TaskList; records: Task[]; status: string }): Task[] {
  const byId = new Map(records.filter(task => task.owner === taskList.owner).map(task => [task.task, task]));
  const ids = status === "completed" ? taskList.completedTasks : taskList.activeTasks;
  return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
}
export function taskComparator({ sortBy }: { sortBy: string }): (left: Task, right: Task) => number {
  return (left, right) => {
    if (sortBy === "none") return 0;
    const value = (task: Task) => sortBy === "duration" ? task.duration ?? Infinity : task.deadline ? Date.parse(task.deadline) : Infinity;
    const a = value(left), b = value(right);
    return a === b ? 0 : a < b ? -1 : 1;
  };
}
export function taskFilter({ recurring, maxDuration }: { recurring: string; maxDuration: number | null }): (task: Task) => boolean {
  return task => (recurring === "all" || task.isRecurring === (recurring === "recurring")) &&
    (maxDuration === null || (task.duration ?? 0) <= maxDuration);
}
