import { createHash, randomBytes } from "node:crypto";
import type { Collection } from "mongodb";

export class UnknownSession extends Error {}
export type Session = { tokenHash: string; subject: string; expiresAt: Date };
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export class SessioningConcept {
  constructor(
    private readonly sessions: Collection<Session> | undefined = undefined,
    private readonly clock: () => Date = () => new Date(),
  ) {}

  private get store(): Collection<Session> {
    if (!this.sessions) throw new Error("Sessioning requires a MongoDB collection.");
    return this.sessions;
  }

  async start({ subject }: { subject: string }) {
    const now = this.clock();
    await this.store.deleteMany({ expiresAt: { $lte: now } });
    const session = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000);
    await this.store.insertOne({ tokenHash: digest(session), subject, expiresAt });
    return { session, expiresAt };
  }

  async current({ session }: { session: string }) {
    const rows = await this._active({ session });
    if (!rows[0]) throw new UnknownSession("This session is not active.");
    return { subject: rows[0].subject };
  }

  async end({ session }: { session: string }) {
    const result = typeof session === "string"
      ? await this.store.deleteOne({ tokenHash: digest(session), expiresAt: { $gt: this.clock() } })
      : undefined;
    if (!result?.deletedCount) throw new UnknownSession("This session is not active.");
    return { ended: true };
  }

  async _active({ session }: { session: string }): Promise<Array<{ subject: string; expiresAt: Date }>> {
    if (typeof session !== "string") return [];
    const found = await this.store.findOne({ tokenHash: digest(session), expiresAt: { $gt: this.clock() } });
    return found ? [{ subject: found.subject, expiresAt: found.expiresAt }] : [];
  }
}
