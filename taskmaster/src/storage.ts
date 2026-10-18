import type { Db } from "mongodb";
import { AuthenticatingConcept, type Account } from "./concepts/Authenticating.ts";
import { SessioningConcept, type Session } from "./concepts/Sessioning.ts";
import { TaskListingConcept, type TaskList } from "./concepts/TaskListing.ts";
import { TaskSettingConcept, type Task } from "./concepts/TaskSetting.ts";
import { TaskSuggestingConcept, type SuggestRequest } from "./concepts/TaskSuggesting.ts";

export async function authenticationStorage(database: Db) {
  const accounts = database.collection<Account>("accounts");
  const sessions = database.collection<Session>("sessions");
  const lists = database.collection<TaskList>("taskLists");
  const tasks = database.collection<Task>("tasks");
  const requests = database.collection<SuggestRequest>("suggestRequests");
  await requests.createIndex({ request: 1 }, { unique: true });
  await tasks.createIndex({ task: 1 }, { unique: true });
  await tasks.createIndex({ owner: 1 });
  await lists.createIndex({ owner: 1 }, { unique: true });
  await accounts.createIndex({ username: 1 }, { unique: true });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return {
    Authenticating: new AuthenticatingConcept(accounts),
    Sessioning: new SessioningConcept(sessions),
    TaskListing: new TaskListingConcept(lists),
    TaskSetting: new TaskSettingConcept(tasks),
    TaskSuggesting: new TaskSuggestingConcept(requests),
  };
}
