import type { Collection } from "mongodb";
import { MongoServerError } from "mongodb";

export class InvalidUsername extends Error {}
export class WeakPassword extends Error {}
export class UsernameTaken extends Error {}
export class InvalidCredentials extends Error {}

export type Account = { username: string; passwordVerifier: string };

export class AuthenticatingConcept {
  constructor(private readonly accounts: Collection<Account> | undefined = undefined) {}

  private get store(): Collection<Account> {
    if (!this.accounts) throw new Error("Authenticating requires a MongoDB collection.");
    return this.accounts;
  }

  async register({ username, password }: { username: string; password: string }) {
    if (!/^[A-Za-z0-9_-]{3,32}$/.test(username)) {
      throw new InvalidUsername("A username must contain 3 to 32 letters, numbers, underscores, or hyphens.");
    }
    if (password.length < 8 || password.length > 128) {
      throw new WeakPassword("A password must contain 8 to 128 characters.");
    }
    const passwordVerifier = await Bun.password.hash(password, { algorithm: "argon2id" });
    try {
      await this.store.insertOne({ username, passwordVerifier });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        throw new UsernameTaken("That username is already registered.");
      }
      throw error;
    }
    return { account: username };
  }

  async authenticate({ username, password }: { username: string; password: string }) {
    const account = await this.store.findOne({ username });
    if (!account || !(await Bun.password.verify(password, account.passwordVerifier))) {
      throw new InvalidCredentials("The username or password is incorrect.");
    }
    return { account: username };
  }

  async _registered({ username }: { username: string }): Promise<{ registered: boolean }> {
    return { registered: (await this.store.findOne({ username })) !== null };
  }
}
