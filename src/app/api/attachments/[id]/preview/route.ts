export const runtime = "nodejs";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import sanitize from "sanitize-html";
import { db } from "~/server/db";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse("Unauthorized", { status: 401 });

  const att = await db.emailAttachment.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      mimeType: true,
      extractedText: true,
      docMeta: true,
      Email: {
        select: {
          thread: { select: { account: { select: { userId: true } } } },
        },
      },
    },
  });

  if (!att) return new NextResponse("Not found", { status: 404 });
  if (att.Email.thread.account.userId !== userId)
    return new NextResponse("Forbidden", { status: 403 });

  const mt = (att.mimeType || "").toLowerCase();
  const isDocx =
    mt.includes("wordprocessingml.document") ||
    att.name.toLowerCase().endsWith(".docx");

  if (isDocx && att.docMeta && (att.docMeta as any).htmlPreview) {
    const html = String((att.docMeta as any).htmlPreview);
    const clean = sanitize(html);
    return new NextResponse(clean, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const text = att.extractedText || "";
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");

  const page = `<!doctype html>
  <html>
  <head><meta charset="utf-8">
        <title>${att.name}</title>
        </head>
        <body style="font-family: ui-sans-serif, system-ui; white-space: normal; line-height:1.5; padding:16px;">
            <h3>${att.name}</h3>
            <div>${escaped || "<em>No extracted text available.</em>"}</div>
        </body>
  </html>`;

  return new NextResponse(page, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
