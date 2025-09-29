import { NextResponse, type NextRequest } from "next/server";
import { verifySecret } from "~/lib/utils";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) return new NextResponse("forbidden", { status: 403 });

  const update = await req.json();

  const msg = update?.message;
  if (!msg || !msg.text) return NextResponse.json({ ok: true });

  const chatId = String(msg.chat?.id || "");
  const text: string = msg.text.trim();

  const token = text.startsWith("/start")
    ? text.replace("/replace", "").trim()
    : null;

  if (!token) return NextResponse.json({ ok: true });

  const settings = await db.userNotificationSettings.findFirst({
    where: {
      pendingLinkToken: token,
      pendingLinkExpires: { gt: new Date() },
    },
    select: { userId: true },
  });

  if (!settings) return NextResponse.json({ ok: true });

  await db.userNotificationSettings.update({
    where: { userId: settings.userId },
    data: {
      telegramChatId: chatId,
      pendingLinkToken: null,
      pendingLinkExpires: null,
      telegramEnabled: true,
    },
  });

  await sendTelegramMessage(
    chatId,
    "✅ Telegram linked! You’ll get follow-up reminders here.",
  );

  return NextResponse.json({ ok: true });
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN!;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
