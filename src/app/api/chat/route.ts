// /api/chat
import "dotenv/config";
import { streamText, convertToModelMessages } from "ai";
import { auth } from "@clerk/nextjs/server";
import { OramaClient } from "~/lib/orama";
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";

// Helper function to estimate tokens (rough approximation: 1 token ≈ 4 characters)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Helper function to truncate text to fit within token limits
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) return text;

  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio * 0.9); // 10% buffer
  return text.substring(0, targetLength) + "...";
}

// Helper function to keep only recent messages
function trimMessages(messages: any[], maxMessages: number = 10) {
  if (messages.length <= maxMessages) return messages;

  // Keep system message (if any) and last N messages
  const systemMessages = messages.filter((msg) => msg.role === "system");
  const nonSystemMessages = messages.filter((msg) => msg.role !== "system");

  return [...systemMessages, ...nonSystemMessages.slice(-maxMessages)];
}

export async function POST(req: Request) {
  const { userId } = await auth();

  try {
    if (!userId) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { accountId, messages } = await req.json();

    console.log("Received messages:", JSON.stringify(messages, null, 2));

    const orama = new OramaClient(accountId);
    await orama.initialize();

    const lastMessage = messages[messages.length - 1];
    console.log("lastmessage", lastMessage);

    // Extract search term from the last message
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

    // OPTIMIZATION 1: Limit search results and context
    const context = await orama.vectorSearch({
      term: searchTerm,
    });

    // Limit to top 3 most relevant results instead of 10
    const limitedHits = context.hits.slice(0, 3);
    console.log(
      `Using ${limitedHits.length} hits instead of ${context.hits.length}`,
    );

    // OPTIMIZATION 2: Truncate context to prevent token overflow
    const maxContextTokens = 8000; // Reserve tokens for context
    let contextText = limitedHits
      .map((hit) => {
        const doc = hit.document as any;
        // Only include essential fields and truncate body
        return JSON.stringify({
          subject: doc.subject,
          from: doc.from,
          to: doc.to?.[0] || doc.to, // Only first recipient
          body: truncateToTokenLimit(doc.body || doc.rawBody || "", 200), // Max 200 tokens per email body
          sentAt: doc.sentAt,
        });
      })
      .join("\n");

    // Ensure total context doesn't exceed limit
    contextText = truncateToTokenLimit(contextText, maxContextTokens);

    // OPTIMIZATION 3: Simplified system message
    const systemMessage = `You are an AI email assistant. Current time: ${new Date().toLocaleString()}

CONTEXT:
${contextText}

Instructions:
- Answer based on provided email context
- Be concise and helpful
- If insufficient context, say so politely
- Don't speculate beyond the provided information`;

    // OPTIMIZATION 4: Limit message history
    const trimmedMessages = trimMessages(messages, 6); // Keep last 6 messages only

    // Convert UIMessage[] → ModelMessage[]
    const modelMessages = convertToModelMessages(trimmedMessages);

    // OPTIMIZATION 5: Set token limits
    const result = await streamText({
      model: openai("gpt-5-mini"), // Most efficient model
      system: systemMessage,
      messages: modelMessages,
      maxOutputTokens: 1000, // Limit response length
      temperature: 0.3, // Lower temperature for more focused responses
      // @ts-ignore
      onStart: async () => {
        console.log("stream started");
      },
      onFinish: async ({ text, usage }) => {
        console.log("stream complete", text);
        console.log("Token usage:", usage);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("API Error:", error);

    // Handle rate limit errors specifically
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
