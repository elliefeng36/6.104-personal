import type { Db } from "mongodb";
import { AuthenticatingConcept, type Account } from "./concepts/Authenticating.ts";
import { SessioningConcept, type Session } from "./concepts/Sessioning.ts";
import { TaskListingConcept, type TaskList } from "./concepts/TaskListing.ts";

export async function authenticationStorage(database: Db) {
  const accounts = database.collection<Account>("accounts");
  const sessions = database.collection<Session>("sessions");
  const lists = database.collection<TaskList>("taskLists");
  await lists.createIndex({ owner: 1 }, { unique: true });
  await accounts.createIndex({ username: 1 }, { unique: true });
  await sessions.createIndex({ tokenHash: 1 }, { unique: true });
  await sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return {
    Authenticating: new AuthenticatingConcept(accounts),
    Sessioning: new SessioningConcept(sessions),
    TaskListing: new TaskListingConcept(lists),
  };
}
