// Re-add due occurrences through composition, then acknowledge the durable cycle.
import { reaction, when } from "@mit-sdg/sync-engine/language";
import { concepts } from "../concepts.ts";

const { TaskSetting, TaskListing } = concepts;
const Readd = reaction(({ owner, task, cycle }) =>
  when(TaskSetting.releaseOccurrence({}).responds({ owner, task, cycle, ready: true }))
    .then(TaskListing.reopenTask({ owner, task }))
    .then(TaskSetting.acknowledgeOccurrence({ owner, task, cycle })),
);
export const composition = { Readd };
