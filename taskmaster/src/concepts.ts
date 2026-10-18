import { conceptSet } from "@mit-sdg/sync-engine/assembly";
import { authenticating } from "./concepts/Authenticating.registry.ts";
import { sessioning } from "./concepts/Sessioning.registry.ts";
import { taskListing } from "./concepts/TaskListing.registry.ts";

export const applicationConceptSet = conceptSet({ Authenticating: authenticating, Sessioning: sessioning, TaskListing: taskListing });
export const { concepts } = applicationConceptSet;
