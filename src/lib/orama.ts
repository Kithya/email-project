import { type AnyOrama, create, insert, search } from "@orama/orama";
import { restore, persist } from "@orama/plugin-data-persistence";
import { db } from "~/server/db";
import { getEmbeddings } from "./embedding";

const oramaCache = new Map<string, AnyOrama>(); // simple in-memory cache

export class OramaClient {
  // @ts-ignore
  private orama: AnyOrama;
  private accountId: string;

  constructor(accountId: string) {
    this.accountId = accountId;
  }

  private async saveIndex() {
    try {
      const index = await persist(this.orama, "json");
      await db.account.update({
        where: { id: this.accountId },
        data: { oramaIndex: index },
      });
    } catch (error) {
      console.error("Failed to persist Orama index:", error);
    }
  }

  async initialize() {
    // check cache first
    if (oramaCache.has(this.accountId)) {
      this.orama = oramaCache.get(this.accountId)!;
      return;
    }

    const account = await db.account.findUnique({
      where: { id: this.accountId },
      select: { oramaIndex: true },
    });
    if (!account) throw new Error("Account not found");

    if (account.oramaIndex) {
      try {
        this.orama = await restore("json", account.oramaIndex as any);
        oramaCache.set(this.accountId, this.orama);
        return;
      } catch (err) {
        console.warn("Orama restore failed, recreating index:", err);
      }
    }

    // create new if not restored
    this.orama = await create({
      schema: {
        subject: "string",
        body: "string",
        rawBody: "string",
        from: "string",
        to: "string[]",
        sentAt: "string",
        threadId: "string",
        embedding: "vector[3072]",
      },
    });

    oramaCache.set(this.accountId, this.orama);
    await this.saveIndex();
  }

  async vectorSearch({ term, limit = 20 }: { term: string; limit?: number }) {
    try {
      const embedding = await getEmbeddings(term);
      const results = await search(this.orama, {
        mode: "hybrid",
        term,
        vector: { value: embedding, property: "embedding" },
        similarity: 0.7,
        limit: Math.min(limit, 20),
      });
      return results;
    } catch (error) {
      console.error("Vector search error:", error);
      return await this.search({ term, limit });
    }
  }

  async search({ term, limit = 20 }: { term: string; limit?: number }) {
    return await search(this.orama, { term, limit: Math.min(limit, 20) });
  }

  async insert(document: any) {
    if (document.body && document.body.length > 2000) {
      document.body = document.body.slice(0, 2000) + "...";
    }
    if (document.rawBody && document.rawBody.length > 2000) {
      document.rawBody = document.rawBody.slice(0, 2000) + "...";
    }

    await insert(this.orama, document);
    // save index asynchronously (non-blocking)
    this.saveIndex().catch(console.error);
  }
}
