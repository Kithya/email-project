import type { EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { clsx, type ClassValue } from "clsx";
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
        class: `${className}`,
        title: s.message,
      }),
    );
  }
  return DecorationSet.create(state.doc, decos);
}

export function mapOffsetToDoc(state: EditorState, offset: number) {
  const fullText = state.doc.textBetween(0, state.doc.content.size, "\n", "\n");
  if (offset < 0 || offset > fullText.length) return null;

  let consumed = 0;
  let pos = 0;
  state.doc.descendants((node, nodePos) => {
    if (!node.isText) return true;
    const text = node.text ?? "";
    const next = consumed + text.length;
    if (offset <= next) {
      pos = nodePos + (offset - consumed);
      return false;
    }
    consumed = next;
    return true;
  });
  return pos;
}

export function findSuggestionAtSelection(
  state: EditorState,
  suggestions: Suggestion[],
) {
  const { from, to } = state.selection;
  // Convert selection to plain-text offsets by scanning forward
  let consumed = 0;
  let selStart = 0;
  let selEnd = 0;

  state.doc.descendants((node, nodePos) => {
    if (!node.isText) return true;
    const text = node.text ?? "";
    const nFrom = nodePos;
    const nTo = nodePos + text.length;

    if (nTo < from) {
      consumed += text.length;
      return true;
    }

    if (selStart === 0 && from >= nFrom && from <= nTo) {
      selStart = consumed + (from - nFrom);
    }
    if (to >= nFrom && to <= nTo) {
      selEnd = consumed + (to - nFrom);
      return false;
    }
    consumed += text.length;
    return true;
  });

  if (selEnd === 0) selEnd = selStart;

  return suggestions.find(
    (s) =>
      Math.max(s.start, selStart) < Math.min(s.end, selEnd || selStart + 1),
  );
}

export function maskPII(text: string) {
  const masks: { token: string; value: string }[] = [];
  let masked = text;

  const rules = [
    { re: /[\w.+-]+@[\w.-]+\.\w+/g, tag: "EMAIL" },
    { re: /\b(\+?\d[\d\s\-().]{6,})\b/g, tag: "PHONE" },
    { re: /\b(\$|USD|€|EUR|£|GBP)\s?\d[\d,]*(\.\d+)?\b/g, tag: "MONEY" },
  ];

  for (const { re, tag } of rules) {
    masked = masked.replace(re, (m) => {
      const token = `[[${tag}_${masks.length}]]`;
      masks.push({ token, value: m });
      return token;
    });
  }
  return { masked, masks };
}
