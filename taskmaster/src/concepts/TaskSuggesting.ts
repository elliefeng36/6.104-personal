// Ranks supplied candidates using deadlines and optional time limits.
import type { Collection } from "mongodb";

export class InvalidTimeLimit extends Error {}
export class UnknownSuggestRequest extends Error {}
// Supplied snapshots contain only the facts needed for ranking. This concept
// knows no task/list implementation and never fetches another concept's state.
export type CandidatePool = { entries: Array<{ details: { task: string; deadline?: string; duration?: number } }> };
export type Suggestion = { task: string | null; outcome: "SUGGESTED" | "EMPTY_TASKLIST" | "NO_VIABLE_TASKS" };
export type SuggestRequest = {
  request: string; user: string; timeLimit?: number;
  outcome: "PENDING" | Suggestion["outcome"]; suggestedTask?: string;
};

export class TaskSuggestingConcept {
  constructor(private readonly requests: Collection<SuggestRequest> | undefined = undefined) {}
  private get store(): Collection<SuggestRequest> {
    if (!this.requests) throw new Error("TaskSuggesting requires a MongoDB collection.");
    return this.requests;
  }

  async makeRequest({ user, timeLimit }: { user: string; timeLimit?: number | null }) {
    if (timeLimit !== undefined && timeLimit !== null &&
        (typeof timeLimit !== "number" || !Number.isFinite(timeLimit) || timeLimit < 0)) {
      throw new InvalidTimeLimit("Time limit must be a finite nonnegative number of minutes.");
    }
    const request = crypto.randomUUID();
    await this.store.insertOne({ request, user, outcome: "PENDING", ...(timeLimit == null ? {} : { timeLimit }) });
    return { request };
  }

  async makeSuggestion({ request, pool }: { request: string; pool: CandidatePool }): Promise<{ suggestion: Suggestion }> {
    const found = await this.store.findOne({ request });
    if (!found) throw new UnknownSuggestRequest("There is no such suggestion request.");
    const candidates = pool.entries.map(row => row.details);
    const viable = candidates.filter(candidate => {
      // Missing estimates count as zero for time-budget filtering only.
      const duration = candidate.duration === undefined ? 0 : candidate.duration;
      return found.timeLimit === undefined ||
        (typeof duration === "number" && Number.isFinite(duration) && duration >= 0 && duration <= found.timeLimit);
    });
    // Stable sorting preserves supplied candidate order for equal/no deadlines.
    // Overdue tasks naturally precede future deadlines; undated tasks come last.
    const deadline = (candidate: typeof viable[number]) => {
      const value = candidate.deadline === undefined ? NaN : Date.parse(candidate.deadline);
      return Number.isFinite(value) ? value : Infinity;
    };
    viable.sort((left, right) => {
      const a = deadline(left), b = deadline(right);
      return a === b ? 0 : a < b ? -1 : 1;
    });
    const selected = viable[0];
    const suggestion: Suggestion = selected
      ? { task: selected.task, outcome: "SUGGESTED" }
      : { task: null, outcome: candidates.length ? "NO_VIABLE_TASKS" : "EMPTY_TASKLIST" };
    await this.store.updateOne({ request }, {
      $set: { outcome: suggestion.outcome, ...(selected ? { suggestedTask: selected.task } : {}) },
      ...(!selected ? { $unset: { suggestedTask: "" } } : {}),
    });
    return { suggestion };
  }
}
