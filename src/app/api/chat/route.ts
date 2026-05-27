import "dotenv/config";
import { convertToModelMessages, streamText } from "ai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { db } from "~/server/db";
import {
  isCountQuery,
  parseTimeRangeFromQuery,
  trimMessages,
  truncateToTokenLimit,
} from "~/lib/utils";
import { getSubscriptionStatus } from "~/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY } from "~/lib/data";
import { OramaClient } from "~/lib/orama";

function stripHtml(input: string | null | undefined) {
  return (input ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getSearchTerm(messages: any[]) {
  const lastMessage = messages[messages.length - 1];
  if (typeof lastMessage?.content === "string") return lastMessage.content;
  if (Array.isArray(lastMessage?.parts)) {
    return lastMessage.parts
      .filter((part: any) => part.type === "text")
      .map((part: any) => part.text)
      .join(" ");
  }
  return "";
}

async function buildCountFacts(accountId: string, userQuery: string) {
  const range = parseTimeRangeFromQuery(userQuery);
  if (!range || !isCountQuery(userQuery)) return null;

  const emails = await db.email.findMany({
    where: {
      thread: { accountId },
      sentAt: { gte: range.start, lt: range.end },
    },
    select: {
      subject: true,
      sentAt: true,
      from: { select: { address: true, name: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  const recent = emails.slice(0, 10).map((email) => {
    const from = email.from?.name
      ? `${email.from.name} <${email.from.address}>`
      : (email.from?.address ?? "(unknown)");
    return `- ${email.subject || "(no subject)"} - from ${from} - ${email.sentAt.toISOString()}`;
  });

  return [
    `The user asked a count question.`,
    `Time range: ${range.label}`,
    `Email count: ${emails.length}`,
    ...(recent.length ? ["Recent matching emails:", ...recent] : []),
  ].join("\n");
}

function keywordsFromQuery(userQuery: string) {
  const ignored = new Set([
    "about",
    "with",
    "from",
    "that",
    "this",
    "what",
    "when",
    "where",
    "which",
    "have",
    "email",
    "emails",
    "inbox",
    "message",
    "messages",
  ]);

  return userQuery
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((term) => term.length >= 3 && !ignored.has(term))
    .slice(0, 10);
}

async function buildDatabaseContext(accountId: string, userQuery: string) {
  const terms = keywordsFromQuery(userQuery);
  const where =
    terms.length > 0
      ? {
          thread: { accountId },
          OR: terms.flatMap((term) => [
            { subject: { contains: term, mode: "insensitive" as const } },
            { body: { contains: term, mode: "insensitive" as const } },
            { bodySnippet: { contains: term, mode: "insensitive" as const } },
          ]),
        }
      : { thread: { accountId } };

  let emails = await db.email.findMany({
    where,
    select: {
      subject: true,
      body: true,
      bodySnippet: true,
      sentAt: true,
      emailLabel: true,
      from: { select: { name: true, address: true } },
      to: { select: { name: true, address: true } },
      thread: { select: { subject: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 30,
  });

  if (emails.length === 0) {
    emails = await db.email.findMany({
      where: { thread: { accountId } },
      select: {
        subject: true,
        body: true,
        bodySnippet: true,
        sentAt: true,
        emailLabel: true,
        from: { select: { name: true, address: true } },
        to: { select: { name: true, address: true } },
        thread: { select: { subject: true } },
      },
      orderBy: { sentAt: "desc" },
      take: 30,
    });
  }

  return emails
    .map((email) => {
      const from = email.from?.name
        ? `${email.from.name} <${email.from.address}>`
        : (email.from?.address ?? "unknown");
      const to = email.to
        .map((recipient) =>
          recipient.name
            ? `${recipient.name} <${recipient.address}>`
            : recipient.address,
        )
        .join(", ");

      return JSON.stringify({
        subject: email.subject || email.thread.subject || "(no subject)",
        folder: email.emailLabel,
        from,
        to,
        sentAt: email.sentAt.toISOString(),
        body: truncateToTokenLimit(
          stripHtml(email.body ?? email.bodySnippet),
          180,
        ),
      });
    })
    .join("\n");
}

async function buildIndexContext(accountId: string, userQuery: string) {
  try {
    const orama = new OramaClient(accountId);
    await orama.initialize();
    const context = await orama.vectorSearch({ term: userQuery });

    return context.hits
      .slice(0, 15)
      .map((hit) => {
        const doc = hit.document as any;
        return JSON.stringify({
          subject: doc.subject,
          from: doc.from,
          to: doc.to?.[0] || doc.to,
          body: truncateToTokenLimit(doc.body || doc.rawBody || "", 120),
          sentAt: doc.sentAt,
        });
      })
      .join("\n");
  } catch (error) {
    console.error("Search index unavailable, falling back to database:", error);
    return "";
  }
}

export async function POST(req: Request) {
  const today = new Date().toDateString();

  try {
    const [{ userId }, isSubscribed] = await Promise.all([
      auth(),
      getSubscriptionStatus(),
    ]);
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const { accountId, messages } = await req.json();
    if (!accountId || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const account = await db.account.findFirst({
      where: { id: accountId, userId },
      select: { id: true, name: true, emailAddress: true },
    });
    if (!account) return new Response("Unauthorized account", { status: 403 });

    const userQuery = getSearchTerm(messages).trim();
    if (!userQuery) {
      return NextResponse.json(
        { error: "No message content found" },
        { status: 400 },
      );
    }

    const chatbotInteraction = await db.chatbotInteraction.findUnique({
      where: { day: today, userId },
    });

    if (
      !isSubscribed &&
      (chatbotInteraction?.count ?? 0) >= FREE_CREDITS_PER_DAY
    ) {
      return new Response("You have reached the free limit for today", {
        status: 429,
      });
    }

    if (!isSubscribed) {
      await db.chatbotInteraction.upsert({
        where: { day: today, userId },
        update: { count: { increment: 1 } },
        create: { day: today, userId, count: 1 },
      });
    }

    const [countFacts, indexContext, databaseContext] = await Promise.all([
      buildCountFacts(accountId, userQuery),
      account.id.startsWith("demo:")
        ? Promise.resolve("")
        : buildIndexContext(accountId, userQuery),
      buildDatabaseContext(accountId, userQuery),
    ]);

    const contextText = truncateToTokenLimit(
      [countFacts, indexContext, databaseContext].filter(Boolean).join("\n"),
      9000,
    );

    const systemMessage = `You are an AI email assistant for ${account.name} (${account.emailAddress}).

CONTEXT:
${contextText || "No emails found for this account."}

Instructions:
- Answer using only the email context above.
- You do have access to the provided email context. Do not say you cannot access the inbox when CONTEXT contains emails.
- If the exact answer is not present, summarize the closest relevant emails and say what is missing.
- Be concise, specific, and cite sender names, subjects, dates, or folders when useful.
- If asked what the user can ask, suggest questions based on the actual context.`;

    const accountScopedMessages = messages.filter((message: any) => {
      const metadataAccountId =
        message?.metadata?.accountId ??
        message?.experimental_metadata?.accountId;
      return !metadataAccountId || metadataAccountId === accountId;
    });
    const trimmedMessages = trimMessages(accountScopedMessages, 6);
    const modelMessages = convertToModelMessages(trimmedMessages);

    const result = await streamText({
      model: openai("gpt-5"),
      system: systemMessage,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("API Error:", error);

    if (error?.message?.includes("rate_limit_exceeded")) {
      return NextResponse.json(
        {
          error:
            "Rate limit exceeded. Please wait a moment before trying again.",
          type: "rate_limit",
        },
        { status: 429 },
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
