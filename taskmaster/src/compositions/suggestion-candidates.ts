// Joins active task IDs to details without calling concepts.
import type { TaskList } from "../concepts/TaskListing.ts";
import type { Task } from "../concepts/TaskSetting.ts";
import type { CandidatePool } from "../concepts/TaskSuggesting.ts";

// Keep only this owner's records and preserve active-list order.
export function suggestionCandidates({ taskList, records }: { taskList: TaskList; records: Task[] }): CandidatePool {
  const byId = new Map(records.filter(record => record.owner === taskList.owner).map(record => [record.task, record]));
  return { entries: taskList.activeTasks.flatMap(task => {
    const record = byId.get(task);
    return record ? [{ details: { task, ...(record.deadline === undefined ? {} : { deadline: record.deadline }),
      ...(record.duration === undefined ? {} : { duration: record.duration }) } }] : [];
  }) };
}
