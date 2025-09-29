export const runtime = "nodejs";
import { NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { sendTelegram } from "~/lib/telegram";

// Minimal GMT+7 quiet hours helpers
const TZ_OFFSET_MIN = 7 * 60; // Asia/Phnom_Penh
function toLocal(d: Date) {
  return new Date(d.getTime() + TZ_OFFSET_MIN * 60000);
}
function fromLocal(d: Date) {
  return new Date(d.getTime() - TZ_OFFSET_MIN * 60000);
}
function parseHHMM(s: string) {
  const [h, m] = s.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}
function inQuietHours(nowUTC: Date, start: string, end: string): boolean {
  const local = toLocal(nowUTC);
  const { h: sh, m: sm } = parseHHMM(start);
  const { h: eh, m: em } = parseHHMM(end);
  const startLocal = new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    sh,
    sm,
    0,
    0,
  );
  const endLocal = new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    eh,
    em,
    0,
    0,
  );
  // window may cross midnight (21:00-08:00)
  if (sh <= eh) {
    return local >= startLocal && local < endLocal;
  } else {
    return local >= startLocal || local < endLocal;
  }
}
function nextQuietEnd(nowUTC: Date, end: string): Date {
  const local = toLocal(nowUTC);
  const { h: eh, m: em } = parseHHMM(end);
  const candidate = new Date(
    local.getFullYear(),
    local.getMonth(),
    local.getDate(),
    eh,
    em,
    0,
    0,
  );
  const targetLocal =
    local < candidate
      ? candidate
      : new Date(candidate.getTime() + 24 * 3600 * 1000);
  return fromLocal(targetLocal);
}

function verifyCron(req: NextRequest) {
  return req.headers.get("x-vercel-cron") === "1";
}

export async function GET(req: NextRequest) {
  if (!verifyCron(req)) return new NextResponse("forbidden", { status: 403 });

  // Pull due tasks (batch size to keep the route snappy)
  const tasks = await db.followUpTask.findMany({
    where: { status: "scheduled", dueAt: { lte: new Date() } },
    take: 50,
    orderBy: { dueAt: "asc" },
  });

  for (const task of tasks) {
    try {
      // Defensive re-check: did someone reply after the outbound?
      const inboundExists = await db.email.findFirst({
        where: {
          threadId: task.threadId,
          emailLabel: "inbox",
          sentAt: { gt: task.lastOutboundSentAt },
        },
        select: { id: true },
      });
      if (inboundExists) {
        await db.followUpTask.update({
          where: { id: task.id },
          data: { status: "cancelled", cancelReason: "reply_detected" },
        });
        continue;
      }

      // Quiet hours check per user
      const settings = await db.userNotificationSettings.findUnique({
        where: { userId: task.userId },
        select: {
          telegramEnabled: true,
          telegramChatId: true,
          quietHoursStart: true,
          quietHoursEnd: true,
        },
      });

      if (!settings?.telegramEnabled || !settings.telegramChatId) {
        // disable task if user disabled notifications
        await db.followUpTask.update({
          where: { id: task.id },
          data: { status: "cancelled", cancelReason: "notifications_disabled" },
        });
        continue;
      }

      if (
        inQuietHours(
          new Date(),
          settings.quietHoursStart,
          settings.quietHoursEnd,
        )
      ) {
        // Snooze to quiet hours end
        await db.followUpTask.update({
          where: { id: task.id },
          data: {
            status: "snoozed",
            dueAt: nextQuietEnd(new Date(), settings.quietHoursEnd),
          },
        });
        continue;
      }

      // Send Telegram
      const thread = await db.thread.findUnique({
        where: { id: task.threadId },
        select: { subject: true, id: true },
      });
      const text = [
        "⏰ Follow-up reminder",
        `Subject: ${thread?.subject ?? "(no subject)"}`,
        "",
        "No reply in 48h. Consider following up.",
        `${process.env.APP_BASE_URL}/app/thread/${task.threadId}`,
      ].join("\n");

      const res = await sendTelegram(settings.telegramChatId, text);
      if (!res.ok) {
        // retry later; small backoff
        await db.followUpTask.update({
          where: { id: task.id },
          data: { dueAt: new Date(Date.now() + 10 * 60 * 1000) }, // retry in 10m
        });
        continue;
      }

      await db.followUpTask.update({
        where: { id: task.id },
        data: { status: "sent", telegramMessageId: res.messageId?.toString() },
      });
    } catch (e) {
      // avoid blocking other tasks
      console.error("follow-up cron error", e);
    }
  }

  return NextResponse.json({ ok: true, processed: tasks.length });
}
