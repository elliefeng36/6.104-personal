// The host drives due occurrences; reactions handle all cross-concept effects.
import type { assembleApplication } from "./assembly.ts";

export async function processRecurrences(application: ReturnType<typeof assembleApplication>, instant = new Date()) {
  const due = await application.concepts.TaskSetting._due({ instant });
  for (const occurrence of due) {
    await application.concepts.TaskSetting.releaseOccurrence({ ...occurrence, instant });
    await application.whenIdle();
  }
}
