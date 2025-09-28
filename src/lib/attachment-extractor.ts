// ENSURE THIS FILE RUNS ONLY ON THE SERVER
import "server-only";

import crypto from "crypto";
import axios from "axios";
import sanitize from "sanitize-html";
import { db } from "~/server/db";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { Account } from "./account";

const MAX_TEXT_CHARS = 200_000;
const SUMMARY_MAX_CHARS = 4000;

function stripNulls(s: string | null | undefined) {
  return (s ?? "").replace(/\u0000/g, "");
}
function stripNullsDeep<T>(x: T): T {
  if (typeof x === "string") return stripNulls(x) as T;
  if (Array.isArray(x)) return x.map(stripNullsDeep) as T;
  if (x && typeof x === "object") {
    const out: any = {};
    for (const k of Object.keys(x as any))
      out[k] = stripNullsDeep((x as any)[k]);
    return out;
  }
  return x;
}

function hashBytes(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function normalizeText(s: string) {
  return s
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function getAttachmentBytes(att: {
  content?: string | null;
  contentLocation?: string | null;
}) {
  if (att.content) return Buffer.from(att.content, "base64");
  if (att.contentLocation) {
    const res = await axios.get(att.contentLocation, {
      responseType: "arraybuffer",
    });
    return Buffer.from(res.data);
  }
  return null;
}

// DYNAMIC IMPORTS ↓↓↓ (avoid bundling issues)
async function extractPdf(buf: Buffer) {
  const pdfParse = (await import("pdf-parse")).default; // <- dynamic
  const parsed = await pdfParse(buf);
  const text = normalizeText(parsed.text || "");
  const pagesCount = (parsed.numpages as number) || undefined;
  return { text, pagesCount, htmlPreview: null as string | null };
}

async function extractDocx(buf: Buffer) {
  const mammoth = await import("mammoth"); // <- dynamic
  const raw = await mammoth.extractRawText({ buffer: buf });
  const html = await mammoth.convertToHtml({ buffer: buf });
  const text = normalizeText(raw.value || "");
  const htmlPreview = sanitize(html.value || "", {
    allowedTags: sanitize.defaults.allowedTags.concat(["h1", "h2", "h3"]),
    allowedAttributes: { a: ["href", "title"], img: ["src", "alt"] },
  });
  return { text, pagesCount: undefined, htmlPreview };
}

async function summarize(text: string) {
  const src = text.slice(0, SUMMARY_MAX_CHARS);
  try {
    const { textStream } = await streamText({
      model: openai("gpt-5-mini"),
      prompt: `
          Summarize the following business document in 5-7 short bullet points.
          Focus on totals, dates, parties, deliverables, and obligations/terms.
          Plain text only; no markdown.

          TEXT START
          ${src}
          TEXT END
        `,
    });
    let out = "";
    for await (const d of textStream) out += d;
    return out.trim();
  } catch {
    return src.split("\n").slice(0, 5).join("\n").trim();
  }
}

export async function ensureAttachmentProcessed(attachmentId: string) {
  const att = await db.emailAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      name: true,
      mimeType: true,
      content: true,
      contentLocation: true,
      contentHash: true,
      extractedText: true,
      summary: true,
      pagesCount: true,
      emailId: true,
      Email: { select: { thread: { select: { accountId: true } } } },
    },
  });
  if (!att) return null;
  if (att.extractedText && att.summary) return att;

  let bytes: Buffer | null = null;

  if (att.content) {
    bytes = Buffer.from(att.content, "base64");
  } else if (att.contentLocation) {
    const res = await axios.get(att.contentLocation, {
      responseType: "arraybuffer",
    });
    bytes = Buffer.from(res.data);
  } else {
    // lazy fetch from Aurinko
    const accountRow = await db.account.findUnique({
      where: { id: att.Email.thread.accountId },
      select: { accessToken: true },
    });

    if (accountRow && att.emailId) {
      const acc = new Account(accountRow.accessToken);
      const base64 = await acc.getAttachmentContent(att.emailId, att.id);
      if (base64) {
        await db.emailAttachment.update({
          where: { id: att.id },
          data: { content: base64 }, // cache for future
        });
        bytes = Buffer.from(base64, "base64");
        console.log("[Attachments] Downloaded from Aurinko", {
          attachmentId: att.id,
          emailId: att.emailId,
          name: att.name,
          bytes: base64.length,
        });
      } else {
        console.log("[Attachments] No content returned from Aurinko", {
          attachmentId: att.id,
        });
      }
    } else {
      console.log("[Attachments] Missing account token or emailId", {
        attachmentId: att.id,
      });
    }
  }

  if (!bytes) {
    // nothing to parse yet; keep record as-is
    return att;
  }

  // if exactly same bytes and already processed, skip
  const h = hashBytes(bytes);
  if (att.contentHash === h && att.extractedText && att.summary) return att;

  // ---------- detect type & extract ----------
  const mt = (att.mimeType || "").toLowerCase();
  const isPdf = mt.includes("pdf") || att.name.toLowerCase().endsWith(".pdf");
  const isDocx =
    mt.includes("officedocument.wordprocessingml.document") ||
    att.name.toLowerCase().endsWith(".docx");

  let extractedText = "";
  let pagesCount: number | undefined;
  let htmlPreview: string | null = null;

  if (isPdf) {
    const pdfParse = (await import("pdf-parse")).default; // dynamic import
    const parsed = await pdfParse(bytes);
    extractedText = normalizeText(parsed.text || "");
    pagesCount = (parsed.numpages as number) || undefined;
  } else if (isDocx) {
    const mammoth = await import("mammoth"); // dynamic import
    const raw = await mammoth.extractRawText({ buffer: bytes });
    const html = await mammoth.convertToHtml({ buffer: bytes });
    extractedText = normalizeText(raw.value || "");
    htmlPreview = sanitize(html.value || "", {
      allowedTags: sanitize.defaults.allowedTags.concat(["h1", "h2", "h3"]),
      allowedAttributes: { a: ["href", "title"], img: ["src", "alt"] },
    });
    htmlPreview = stripNulls(htmlPreview);
  } else {
    // unsupported type — do nothing
    return att;
  }

  if (extractedText.length > MAX_TEXT_CHARS) {
    extractedText = extractedText.slice(0, MAX_TEXT_CHARS);
  }

  const summary = await summarize(extractedText);

  // final cleanse (avoid Postgres 0x00 errors)
  const cleanedText = stripNulls(extractedText);
  const cleanedSummary = stripNulls(summary);
  const cleanedDocMeta = htmlPreview ? stripNullsDeep({ htmlPreview }) : {};

  if (cleanedText.length !== extractedText.length) {
    console.log("[AttachmentExtracted] Removed NULLs from text", {
      attachmentId: att.id,
      removed: extractedText.length - cleanedText.length,
    });
  }
  if (cleanedSummary.length !== summary.length) {
    console.log("[AttachmentExtracted] Removed NULLs from summary", {
      attachmentId: att.id,
      removed: summary.length - cleanedSummary.length,
    });
  }

  // ---------- persist ----------
  const updated = await db.emailAttachment.update({
    where: { id: att.id },
    data: {
      contentHash: h,
      extractedText: cleanedText,
      summary: cleanedSummary,
      pagesCount,
      docMeta: cleanedDocMeta, // { htmlPreview } for DOCX
    },
    select: {
      id: true,
      name: true,
      mimeType: true,
      extractedText: true,
      summary: true,
      pagesCount: true,
      docMeta: true,
    },
  });

  console.log("[AttachmentExtracted]", {
    id: updated.id,
    name: updated.name,
    mimeType: updated.mimeType,
    pagesCount: updated.pagesCount ?? null,
    extractedChars: (updated.extractedText ?? "").length,
    hasSummary: !!updated.summary,
  });

  return updated;
}

export async function getAttachmentInsightsForThread(
  threadId: string,
  limit = 2,
) {
  const atts = await db.emailAttachment.findMany({
    where: {
      Email: { threadId },
      OR: [
        { mimeType: { contains: "pdf", mode: "insensitive" } },
        {
          mimeType: {
            contains: "wordprocessingml.document",
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: [{ inline: "asc" }, { size: "desc" }],
    select: {
      id: true,
      name: true,
      mimeType: true,
      extractedText: true,
      summary: true,
      docMeta: true,
    },
    take: limit,
  });

  const processed = await Promise.all(
    atts.map(async (a) =>
      a.extractedText ? a : await ensureAttachmentProcessed(a.id),
    ),
  );

  return (processed.filter(Boolean) as typeof processed).map((a) => {
    const firstSlice = (a!.extractedText || "").slice(0, 1200);
    return {
      id: a!.id,
      name: a!.name,
      mimeType: a!.mimeType,
      summary: a!.summary || "",
      snippet: firstSlice,
    };
  });
}
