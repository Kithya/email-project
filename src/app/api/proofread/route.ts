import { NextResponse } from "next/server";
import { maskPII } from "~/lib/utils";

const LT_URL = process.env.LT_URL || "https://api.languagetool.org/v2/check";

export async function POST(req: Request) {
  try {
    const { text, locale = "en-US", limit = 25 } = await req.json();

    const { masked } = maskPII(text);

    const form = new URLSearchParams();
    form.set("text", masked);
    form.set("language", locale);
    form.set("enabledOnly", "false");

    const res = await fetch(LT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });

    if (!res.ok) {
      return NextResponse.json({ suggestions: [] });
    }

    const data = await res.json();
    const suggestions = (data.matches || [])
      .slice(0, limit)
      .map((m: any, idx: number) => {
        const type: "spelling" | "grammar" | "style" =
          m.rule?.issueType === "misspelling"
            ? "spelling"
            : m.rule?.issueType === "style"
              ? "style"
              : "grammar";

        const replacement = m.replacements?.[0]?.value;
        return {
          id: `${m.rule?.id || "LT"}_${idx}`,
          type,
          message: m.message || "Issue detected",
          replacement,
          start: m.offset, // LanguageTool gives plain-text char offsets
          end: m.offset + m.length,
        };
      });

    return NextResponse.json({ suggestions });
  } catch (error) {
    return NextResponse.json({ suggestions: [] });
  }
}
