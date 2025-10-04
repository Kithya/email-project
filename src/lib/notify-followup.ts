export async function notifyFollowups({
  to,
  subject,
  from,
  threadId,
  sentAt = new Date().toISOString(),
}: {
  to: string;
  subject: string;
  from: string;
  threadId?: string | null;
  sentAt?: string;
}) {
  const url = process.env.ZAP_FOLLOWUP_WEBHOOK!;
  const secret = process.env.ZAP_FOLLOWUP_SECRET!;

  if (!url || !secret) {
    console.error("Follow-up webhook env vars missing");
    return;
  }

  const payload = {
    to,
    yourGmail: "narakithya@gmail.com",
    subject,
    sentAt,
    from,
    threadId: threadId ?? undefined,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-DF-Secret": secret,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Zapier webhook failed", res.status, text);
    }
  } catch (err) {
    console.error("Zapier webhook error", err);
  }
}
