import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, tone = "Neutral" } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const system = `
        You improve business emails for clarity, grammar, and tone **without changing meaning or facts**.
            Rules:
            - Do not change numbers, dates, names, prices, or commitments.
            - Preserve structure (greeting, bullets, signature).
            - Tone target: ${tone}.
        Output STRICT JSON with keys: improvedText (string). No code fences, no commentary.`;

    const user = `SOURCE TEXT:\n${text}`;
    const { textStream } = await streamText({
      model: openai("gpt-5-nano"),
      system,
      prompt: user,
    });

    let raw = "";
    for await (const t of textStream) raw += t;

    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const jsonStr = start >= 0 && end > start ? raw.slice(start, end + 1) : "";

    let improvedText = " ";

    try {
      const parsed = JSON.parse(jsonStr || "{}");
      improvedText =
        typeof parsed.improvedText === "string" ? parsed.improvedText : "";
    } catch {
      improvedText = text;
    }

    return NextResponse.json({ improvedText });
  } catch {
    return NextResponse.json({ improvedText: "" }, { status: 200 });
  }
}
