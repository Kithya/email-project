import { db } from "~/server/db";
import { type AnyOrama, create, insert, search } from "@orama/orama";
import { restore, persist } from "@orama/plugin-data-persistence";
import { getEmbeddings } from "./embedding";

export class OramaClient {
  //@ts-ignore
  private orama: AnyOrama;
  private accountId: string;

  constructor(accountId: string) {
    this.accountId = accountId;
  }

  async saveIndex() {
    const index = await persist(this.orama, "json");
    await db.account.update({
      where: { id: this.accountId },
      data: { oramaIndex: index },
    });
  }

  async initialize() {
    const account = await db.account.findUnique({
      where: {
        id: this.accountId,
      },
    });

    if (!account) {
      throw new Error("Account not found");
    }

    if (account.oramaIndex) {
      this.orama = await restore("json", account.oramaIndex as any);
    } else {
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

      await this.saveIndex();
    }
  }

  async vectorSearch({ term, limit = 3 }: { term: string; limit?: number }) {
    try {
      const embeddings = await getEmbeddings(term);

      // OPTIMIZATION: Reduce search results and increase similarity threshold
      const results = await search(this.orama, {
        mode: "hybrid",
        term: term,
        vector: {
          value: embeddings,
          property: "embedding",
        },
        similarity: 0.85, // Higher threshold = more relevant results only
        limit: Math.min(limit, 5), // Cap at 5 results max
      });

      console.log(
        `Vector search returned ${results.hits.length} results with similarity >= 0.85`,
      );
      return results;
    } catch (error) {
      console.error("Vector search error:", error);

      // Fallback to text search only if vector search fails
      console.log("Falling back to text-only search");
      return await this.search({ term, limit });
    }
  }

  async search({ term, limit = 3 }: { term: string; limit?: number }) {
    return await search(this.orama, {
      term,
      limit: Math.min(limit, 5), // Cap search results
    });
  }

  async insert(document: any) {
    // OPTIMIZATION: Truncate long email bodies before storing
    if (document.body && document.body.length > 2000) {
      document.body = document.body.substring(0, 2000) + "...";
    }
    if (document.rawBody && document.rawBody.length > 2000) {
      document.rawBody = document.rawBody.substring(0, 2000) + "...";
    }

    await insert(this.orama, document);
    await this.saveIndex();
  }
}
