// /api/chat
import "dotenv/config";
import { streamText, convertToModelMessages } from "ai";
import { auth } from "@clerk/nextjs/server";
import { OramaClient } from "~/lib/orama";
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

async function maybeAnswerWithDbFacts({
  accountId,
  userQuery,
}: {
  accountId: string;
  userQuery: string;
}): Promise<{ answer: string } | null> {
  const tr = parseTimeRangeFromQuery(userQuery);
  if (!tr || !isCountQuery(userQuery)) return null;

  const emails = await db.email.findMany({
    where: {
      thread: { accountId },
      sentAt: { gte: tr.start, lt: tr.end },
    },
    select: {
      id: true,
      subject: true,
      sentAt: true,
      from: { select: { address: true, name: true } },
    },
    orderBy: { sentAt: "desc" },
    take: 50,
  });

  const count = emails.length;
  const top = emails.slice(0, 10).map((e) => {
    const fromLabel = e.from?.name
      ? `${e.from.name} <${e.from.address}>`
      : (e.from?.address ?? "(unknown)");
    return `• ${e.subject || "(no subject)"} — from ${fromLabel} — ${e.sentAt.toISOString()}`;
  });

  const facts = [
    `Time range: ${tr.label}`,
    `Email count: ${count}`,
    ...(count > 0 ? ["Recent items:", ...top] : []),
  ].join("\n");

  const { textStream } = await streamText({
    model: openai("gpt-5-mini"),
    system: `You are an assistant. ONLY use the provided facts to answer. Do not guess.`,
    prompt: `User asked: "${userQuery}"\n\nFacts (authoritative):\n${facts}\n\nRespond succinctly. If user asked "how many", state the count clearly first. Mention UTC.`,
  });

  let out = "";
  for await (const chunk of textStream) out += chunk;
  return { answer: out.trim() || `You received ${count} emails ${tr.label}.` };
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
    if (!accountId || !messages) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const account = await db.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) return new Response("Unauthorized account", { status: 403 });

    const lastMessage = messages[messages.length - 1];
    console.log("lastmessage", lastMessage);
    let searchTerm = "";

    if (lastMessage?.content) {
      searchTerm = lastMessage.content;
    } else if (lastMessage?.parts) {
      searchTerm = lastMessage.parts
        .filter((part: any) => part.type === "text")
        .map((part: any) => part.text)
        .join(" ");
    }

    if (!searchTerm) {
      return NextResponse.json(
        { error: "No message content found" },
        { status: 400 },
      );
    }

    const [chatbotInteraction, structured] = await Promise.all([
      db.chatbotInteraction.findUnique({ where: { day: today, userId } }),
      maybeAnswerWithDbFacts({ accountId, userQuery: searchTerm }),
    ]);

    if (!isSubscribed) {
      if (!chatbotInteraction) {
        await db.chatbotInteraction.create({
          data: { day: today, userId, count: 1 },
        });
      } else if (chatbotInteraction.count >= FREE_CREDITS_PER_DAY) {
        return new Response("You have reached the free limit for today", {
          status: 429,
        });
      }
    }

    if (structured) {
      const result = await streamText({
        model: openai("gpt-5-mini"),
        system: "You respond in 1-3 concise sentences.",
        prompt: structured.answer,
      });
      return result.toUIMessageStreamResponse();
    }

    const orama = new OramaClient(accountId);
    await orama.initialize();

    const context = await orama.vectorSearch({ term: searchTerm });

    const MAX_HITS = 15;
    const limitedHits = context.hits.slice(0, MAX_HITS);
    console.log(
      `Using ${limitedHits.length} hits instead of ${context.hits.length}`,
    );

    const maxContextTokens = 8000;
    let contextText = limitedHits
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

    contextText = truncateToTokenLimit(contextText, maxContextTokens);

    const systemMessage = `You are an AI email assistant. Current time: ${new Date().toLocaleString()}

      CONTEXT:
      ${contextText}

      Instructions:
      - Answer based on provided email context
      - Be concise and helpful
      - If insufficient context, say so politely
      - Don't speculate beyond the provided information`;

    const trimmedMessages = trimMessages(messages, 6);
    const modelMessages = convertToModelMessages(trimmedMessages);

    const result = await streamText({
      model: openai("gpt-5"),
      system: systemMessage,
      messages: modelMessages,
      // @ts-ignore
      onStart: () => console.log("stream started"),
      // @ts-ignore
      onCompletion: async ({ text, usage }) => {
        db.chatbotInteraction
          .update({
            where: { day: today, userId },
            data: { count: { increment: 1 } },
          })
          .catch(console.error);
        console.log("stream complete", text);
        console.log("Token usage:", usage);
      },
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
