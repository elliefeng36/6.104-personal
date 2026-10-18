// Connects TaskListing to its specification and refusal codes.
import { registerConcept } from "@mit-sdg/sync-engine/assembly";
import { TaskListingConcept, NoSuchTask, NoSuchUser } from "./TaskListing.ts";
import spec from "@design/concepts/TaskListing.md" with { type: "text" };

export const taskListing = registerConcept({
  class: TaskListingConcept,
  spec,
  refusals: { NO_SUCH_USER: NoSuchUser, NO_SUCH_TASK: NoSuchTask },
});
