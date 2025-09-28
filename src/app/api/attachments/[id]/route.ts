// Force Node runtime to avoid edge/text encoding surprises.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { db } from "~/server/db";

// ---- helpers
const b64ToBytes = (b64: string) => new Uint8Array(Buffer.from(b64, "base64"));
const bytesToB64 = (u8: Uint8Array) => Buffer.from(u8).toString("base64");

const extMime = (name?: string): string | undefined => {
  const n = (name || "").toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return;
};

const buildHeaders = (
  mime: string,
  filename: string,
  inline: boolean,
  len?: number,
) =>
  new Headers({
    "Content-Type": mime,
    ...(len != null ? { "Content-Length": String(len) } : {}),
    "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(
      filename,
    )}`,
    "Cache-Control": "private, max-age=0, must-revalidate",
    "X-Content-Type-Options": "nosniff",
  });

// ---- route
export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const url = new URL(req.url);
    const forceDownload = url.searchParams.get("download") === "1";

    // Load metadata + token
    const att = await db.emailAttachment.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        mimeType: true,
        content: true, // base64 cache (may be null)
        contentLocation: true, // provider URL (may require Authorization)
        Email: {
          select: {
            id: true, // local email id (we'll try an Aurinko fallback with it)
            thread: {
              select: {
                account: { select: { userId: true, accessToken: true } },
              },
            },
          },
        },
      },
    });

    if (!att) return new NextResponse("Not Found", { status: 404 });
    if (att.Email?.thread?.account?.userId !== userId)
      return new NextResponse("Forbidden", { status: 403 });

    const filename = att.name ?? "attachment";
    // Decide MIME: DB → extension → octet-stream
    let mime = att.mimeType || extMime(att.name) || "application/octet-stream";

    const isPDF =
      /^application\/pdf$/i.test(mime) ||
      filename.toLowerCase().endsWith(".pdf");
    const isDOCX =
      /officedocument\.wordprocessingml\.document/i.test(mime) ||
      filename.toLowerCase().endsWith(".docx");

    // target behavior
    const inline = !forceDownload && isPDF; // PDFs inline; DOCX always download by default

    // 1) Serve cached base64 if present
    if (att.content) {
      const buf = b64ToBytes(att.content);
      return new NextResponse(buf, {
        status: 200,
        headers: buildHeaders(mime, filename, inline, buf.byteLength),
      });
    }

    // helper to fetch a URL with/without bearer, normalize JSON {content|data: base64} vs bytes
    const token = att.Email?.thread?.account?.accessToken;
    const fetchToBytes = async (fetchUrl: string) => {
      const attempt = async (authz?: string) => {
        const headers: Record<string, string> = {
          Accept: "application/octet-stream",
        };
        if (authz) headers.Authorization = authz;
        return fetch(fetchUrl, { headers });
      };

      let res = await attempt();
      if (!res.ok && token) res = await attempt(`Bearer ${token}`);
      if (!res.ok) return null;

      const ct = res.headers.get("content-type") || "";
      // If provider specified known MIME, trust it
      if (
        /^application\/pdf/i.test(ct) ||
        /officedocument\.wordprocessingml\.document/i.test(ct)
      ) {
        // @ts-ignore
        mime = ct.split(";")[0].trim();
      }

      if (/^application\/json/i.test(ct)) {
        const json: any = await res.json().catch(() => null);
        const b64: string | undefined = json?.content || json?.data;
        if (typeof b64 === "string") return b64ToBytes(b64);
        return null;
      } else {
        const buf = new Uint8Array(await res.arrayBuffer());
        return buf;
      }
    };

    // 2) Try contentLocation if present
    if (att.contentLocation) {
      const buf = await fetchToBytes(att.contentLocation);
      if (buf) {
        // cache small files for future fast loads
        if (buf.byteLength <= 20 * 1024 * 1024) {
          await db.emailAttachment
            .update({
              where: { id: att.id },
              data: { content: bytesToB64(buf), mimeType: mime },
            })
            .catch(() => {});
        }
        return new NextResponse(buf, {
          status: 200,
          headers: buildHeaders(mime, filename, inline, buf.byteLength),
        });
      }
    }

    // 3) Aurinko fallbacks
    if (token) {
      const candidates = [
        `https://api.aurinko.io/v1/email/attachments/${encodeURIComponent(att.id)}`,
        `https://api.aurinko.io/v1/email/messages/${encodeURIComponent(att.Email!.id)}/attachments/${encodeURIComponent(att.id)}`,
      ];
      for (const u of candidates) {
        const buf = await fetchToBytes(u);
        if (buf) {
          if (buf.byteLength <= 20 * 1024 * 1024) {
            await db.emailAttachment
              .update({
                where: { id: att.id },
                data: { content: bytesToB64(buf), mimeType: mime },
              })
              .catch(() => {});
          }
          return new NextResponse(buf, {
            status: 200,
            headers: buildHeaders(mime, filename, inline, buf.byteLength),
          });
        }
      }
    }

    return new NextResponse("Content not available", { status: 501 });
  } catch (err) {
    console.error(err);
    return new NextResponse("Internal error", { status: 500 });
  }
}
