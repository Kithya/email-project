import { create, insert, search, type AnyOrama } from "@orama/orama";
import { db } from "~/server/db";
import { OramaClient } from "./lib/orama";
import { turndown } from "./lib/turndown";
import { getEmbedding } from "./lib/embedding";

const orama = new OramaClient("141730");
await orama.initialize();

// const orama = await create({
//   schema: {
//     subject: "string",
//     body: "string",
//     rawBody: "string",
//     from: "string",
//     to: "string[]",
//     sentAt: "string",
//     threadId: "string",
//   },
// });

// const emails = await db.email.findMany({
//   select: {
//     subject: true,
//     body: true,
//     from: true,
//     to: true,
//     sentAt: true,
//     threadId: true,
//     bodySnippet: true,
//   },
// });

// for (const email of emails) {
//   const body = turndown.turndown(email.body ?? email.bodySnippet ?? "");
//   const embeddings = await getEmbedding(body);
//   console.log(embeddings?.length);

//   await orama.insert({
//     subject: email.subject,
//     body: body,
//     from: email.from.address,
//     rawBody: email.bodySnippet ?? "",
//     to: email.to.map((to) => to.address),
//     sentAt: email.sentAt.toLocaleString(),
//     threadId: email.threadId,
//     embeddings,
//   });
// }

// await orama.saveIndex();

const searchResult = await orama.vectorSearch({
  term: "kithya",
});

for (const hit of searchResult.hits) {
  console.log(hit.document.subject);
}
