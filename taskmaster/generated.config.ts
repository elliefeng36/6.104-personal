// Selects the checked design and generated API contracts.
import { assembleApplication } from "./src/assembly.ts";
import { httpWire } from "@mit-sdg/sync-engine-http/tooling";
import { policy } from "./src/edge.ts";

export default {
  assemble: assembleApplication,
  title: "Taskmaster",
  wireName: "TaskmasterWire",
  design: { version: 1, documents: [
    new URL("./design/types.md", import.meta.url),
    new URL("./design/compositions/Sessions.md", import.meta.url),
    new URL("./design/compositions/TaskLists.md", import.meta.url),
    new URL("./design/compositions/Tasks.md", import.meta.url),
    new URL("./design/compositions/TaskSuggestions.md", import.meta.url),
  ] },
  projections: [httpWire({ policy, name: "TaskmasterWireHttp" })],
};
