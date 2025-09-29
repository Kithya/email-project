import type { TelegramResult } from "~/types";

export async function sendTelegram(
  chatId: string,
  text: string,
  opts?: { parseMode?: "MarkdownV2" | "HTML"; disableWebPagePreview?: boolean },
): Promise<TelegramResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: opts?.parseMode,
        disable_web_page_preview: opts?.disableWebPagePreview ?? true,
      }),
    });

    const json = await res.json();

    if (json?.ok) {
      return { ok: true, messageId: json.result?.message_id };
    }

    return { ok: false, error: JSON.stringify(json) };
  } catch (error: any) {
    return { ok: false, error: String(error?.message || error) };
  }
}
