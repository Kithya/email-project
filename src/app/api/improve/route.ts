// /api/improve/route.ts
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const TIMEOUT_MS = 12_000;
const MODEL_LADDER = ["gpt-4"];

function systemPrompt(tone: string) {
  return `
You are a business email writing improver. Return STRICT JSON ONLY.

Goals:
- Improve clarity, grammar, and flow while keeping the original meaning.
- Keep all facts unchanged: numbers, dates, names, prices, commitments.
- Keep or improve professional tone. Target tone: ${tone}.
- Preserve any explicit bullet lists or signatures if present.
- No external commentary, no Markdown. Output JSON only.

JSON schema:
{"improvedText": string}

Example:
INPUT: "i attach the file yesterday but i forget to mention the price is 1,250 usd plz confirm"
OUTPUT: {"improvedText":"Hi [Name],\\n\\nI attached the file yesterday and wanted to confirm the price is USD 1,250.\\n\\nPlease let me know if you have any questions.\\n\\nBest regards,\\n[Your Name]"}
  `.trim();
}

function userPrompt(src: string) {
  return `SOURCE TEXT:\n${src}`;
}

// Extract the first valid top-level JSON object from a string.
function extractJsonObject(raw: string): any | null {
  // Try a fast path: trim & parse
  try {
    const t = raw.trim();
    if (t.startsWith("{") && t.endsWith("}")) return JSON.parse(t);
  } catch {}
  // Fallback: scan for outermost braces
  let startIdx = -1;
  let depth = 0;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === "{") {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0 && startIdx >= 0) {
        const candidate = raw.slice(startIdx, i + 1);
        try {
          return JSON.parse(candidate);
        } catch {}
      }
    }
  }
  return null;
}

async function callModelOnce(
  text: string,
  tone: string,
  modelName: string,
  signal: AbortSignal,
) {
  const { textStream } = await streamText({
    model: openai(modelName),
    system: systemPrompt(tone),
    prompt: userPrompt(text),
    // keep defaults; small temperature helps concise, safe rewrites
    temperature: 0.3,
  });

  let raw = "";
  for await (const t of textStream) {
    if (signal.aborted) break;
    if (t) raw += t;
  }
  const parsed = extractJsonObject(raw);
  if (!parsed || typeof parsed.improvedText !== "string") {
    throw new Error("invalid_json");
  }
  return parsed.improvedText;
}

async function callWithTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms: number,
): Promise<T> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(t);
  }
}

function normalizeNumberTokens(s: string) {
  // capture numbers/dates-ish; strip commas/spaces for comparison
  return (s.match(/\b[\d][\d,./-]*\b/g) || []).map((x) =>
    x.replace(/[,\s]/g, ""),
  );
}

function factsChanged(original: string, improved: string) {
  const a = normalizeNumberTokens(original);
  const b = new Set(normalizeNumberTokens(improved));
  const missing = a.filter((x) => !b.has(x));
  return { changed: missing.length > 0, missing };
}

export async function POST(req: Request) {
  try {
    const { text, tone = "Neutral" } = await req.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // If the text is very long, we *can* chunk by blank lines to reduce latency.
    // Keep it simple: one chunk unless extremely large.
    const chunks =
      text.length > 4000
        ? text
            .split(/\n{2,}/g)
            .map((s) => s.trim())
            .filter(Boolean)
        : [text];

    const modelList = MODEL_LADDER;

    async function improveChunk(chunk: string) {
      let lastErr: any = null;
      for (const modelName of modelList) {
        try {
          const improved = await callWithTimeout(
            (signal) => callModelOnce(chunk, tone, modelName, signal),
            TIMEOUT_MS,
          );
          return improved;
        } catch (e) {
          lastErr = e;
          continue;
        }
      }
      throw lastErr ?? new Error("model_error");
    }

    let improvedText = "";
    if (chunks.length === 1) {
      // @ts-ignore
      improvedText = await improveChunk(chunks[0]);
    } else {
      // Process sequentially to keep order deterministic; you can parallelize if desired.
      const parts: string[] = [];
      for (const c of chunks) {
        parts.push(await improveChunk(c));
      }
      improvedText = parts.join("\n\n");
    }

    // Basic numeric/date safety check
    const safety = factsChanged(text, improvedText);

    return NextResponse.json({
      improvedText,
      factsChanged: safety.changed,
      missing: safety.missing,
    });
  } catch (e) {
    return NextResponse.json(
      { improvedText: "", error: "improve_failed" },
      { status: 200 },
    );
  }
}
