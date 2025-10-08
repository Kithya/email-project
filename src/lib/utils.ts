import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { clsx, type ClassValue } from "clsx";
import type { NextRequest } from "next/server";
import { twMerge } from "tailwind-merge";
import type { Suggestion, TimeRange } from "~/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function truncateToTokenLimit(text: string, maxTokens: number): string {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) return text;

  const ratio = maxTokens / estimatedTokens;
  const targetLength = Math.floor(text.length * ratio * 0.9);
  return text.substring(0, targetLength) + "...";
}

export function trimMessages(messages: any[], maxMessages: number = 10) {
  if (messages.length <= maxMessages) return messages;

  const systemMessages = messages.filter((msg) => msg.role === "system");
  const nonSystemMessages = messages.filter((msg) => msg.role !== "system");

  return [...systemMessages, ...nonSystemMessages.slice(-maxMessages)];
}

export function startOfUtcDay(d = new Date()) {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0),
  );
}

export function endOfUtcDay(d = new Date()) {
  const start = startOfUtcDay(d);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000);
}

export function getThisWeekUtc(): TimeRange {
  const now = new Date();
  const dow = now.getUTCDay(); // 0..6 (Sun..Sat)
  const mondayOffset = (dow + 6) % 7; // make Monday=0
  const start = startOfUtcDay(
    new Date(now.getTime() - mondayOffset * 86400000),
  );
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start, end, label: "this week (UTC)" };
}

export function parseTimeRangeFromQuery(q: string): TimeRange | null {
  const s = q.toLocaleLowerCase();

  if (/\btoday\b/.test(s)) {
    return { start: startOfUtcDay(), end: endOfUtcDay(), label: "today (UTC)" };
  }
  if (/\byesterday\b/.test(s)) {
    const end = startOfUtcDay();
    const start = new Date(end.getTime() - 86400000);
    return { start, end, label: "yesterday (UTC)" };
  }

  const mHours = s.match(/\blast\s+(\d{1,2})\s*hour/);
  if (mHours) {
    // @ts-expect-error
    const hrs = Math.max(1, Math.min(parseInt(mHours[1], 10), 48));
    const end = new Date();
    const start = new Date(end.getTime() - hrs * 3600000);
    return { start, end, label: `last ${hrs} hour(s) (UTC)` };
  }

  if (/\bthis\s+week\b/.test(s)) {
    return getThisWeekUtc();
  }

  return null;
}

export function isCountQuery(q: string) {
  const s = q.toLowerCase();
  return /\bhow\s+many\b/.test(s) || /\bcount\b/.test(s) || /\btotal\b/.test(s);
}

export function buildDecorations(
  state: EditorState,
  suggestions: Suggestion[],
) {
  const decos: Decoration[] = [];
  for (const s of suggestions) {
    const from = mapOffsetToDoc(state, s.start);
    const to = mapOffsetToDoc(state, s.end);
    if (from == null || to == null || to <= from) continue;

    const className =
      s.type === "spelling"
        ? "df-underline-spelling"
        : s.type === "grammar"
          ? "df-underline-grammar"
          : "df-underline-style";

    decos.push(
      Decoration.inline(from, to, {
        class: className,
        title: s.message,
      }),
    );
  }
  return DecorationSet.create(state.doc, decos);
}

export function mapOffsetToDoc(state: EditorState, offset: number) {
  const total = state.doc.textBetween(
    0,
    state.doc.content.size,
    "\n",
    "\n",
  ).length;
  if (offset < 0) return 0;
  if (offset > total) return state.doc.content.size;

  let lo = 0;
  let hi = state.doc.content.size;
  while (lo < hi) {
    const mid = ((lo + hi) / 2) | 0;
    const len = state.doc.textBetween(0, mid, "\n", "\n").length;
    if (len < offset) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function docPosToPlainOffset(state: EditorState, pos: number) {
  const p = Math.max(0, Math.min(pos, state.doc.content.size));
  return state.doc.textBetween(0, p, "\n", "\n").length;
}

export function findSuggestionAtSelection(
  state: EditorState,
  suggestions: Suggestion[],
) {
  const { from, to } = state.selection;
  const selStart = docPosToPlainOffset(state, from);
  const selEnd = docPosToPlainOffset(state, to);

  return suggestions.find(
    (s) =>
      Math.max(s.start, selStart) < Math.min(s.end, selEnd || selStart + 1),
  );
}

export function maskPII(text: string) {
  const repeat = (len: number) => "█".repeat(Math.max(1, len));

  const rules = [
    { re: /[\w.+-]+@[\w.-]+\.\w+/g }, // emails
    { re: /\b(\+?\d[\d\s\-().]{6,})\b/g }, // phones
    { re: /\b(\$|USD|€|EUR|£|GBP)\s?\d[\d,]*(\.\d+)?\b/g }, // money
  ];

  let masked = text;
  for (const { re } of rules) {
    masked = masked.replace(re, (m) => repeat(m.length));
  }
  return { masked };
}
