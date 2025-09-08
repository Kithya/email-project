// /api/chat

import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { UIMessage, StreamTextResult } from "ai";
import { auth } from "@clerk/nextjs/server";
import { OramaClient } from "~/lib/orama";
import { NextResponse } from "next/server";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  try {
    if (!userId) {
      return new Response("Unaothorized", { status: 401 });
    }
    const { accountId, messages } = await req.json();
    const orama = new OramaClient(accountId);
    await orama.initialize();

    const lastMessage = messages[messages.length - 1];
    console.log("lastmessage", lastMessage);

    const context = await orama.vectorSearch({ term: lastMessage.content });
    console.log(context.hits.length + "hits found");

    const prompt = {
      role: "system",
      content: `You are an AI email assistant embedded in an email client app. Your purpose is to help the user compose emails by answering questions, providing suggestions, and offering relevant information based on the context of their previous emails.
            THE TIME NOW IS ${new Date().toLocaleString()}

      START CONTEXT BLOCK
      ${context.hits.map((hit) => JSON.stringify(hit.document)).join("\n")}
      END OF CONTEXT BLOCK

      When responding, please keep in mind:
      - Be helpful, clever, and articulate.
      - Rely on the provided email context to inform your responses.
      - If the context does not contain enough information to answer a question, politely say you don't have enough information.
      - Avoid apologizing for previous responses. Instead, indicate that you have updated your knowledge based on new information.
      - Do not invent or speculate about anything that is not directly supported by the email context.
      - Keep your responses concise and relevant to the user's questions or the email being composed.`,
    };

    // const response = await ai

    return new Response("OK", { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "error" }, { status: 500 });
  }
}
