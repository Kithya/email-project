"use client";

import * as React from "react";
import { useEffect, useState } from "react";

export default function AttachmentViewer({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mime, setMime] = useState<string>("application/octet-stream");
  const [filename, setFilename] = useState<string>("attachment");
  const [docxHtml, setDocxHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let url: string | null = null;

    (async () => {
      try {
        const res = await fetch(`/api/attachments/${id}?inline=1`, {
          cache: "no-store",
        });
        if (!res.ok) {
          setErr(`Failed to load (${res.status})`);
          return;
        }
        const ct =
          res.headers.get("Content-Type") || "application/octet-stream";
        // @ts-ignore
        setMime(ct.split(";")[0].trim());
        const cd = res.headers.get("Content-Disposition") || "";
        const match = /filename\*\=UTF-8''([^;]+)/i.exec(cd);
        // @ts-ignore
        if (match) setFilename(decodeURIComponent(match[1]));

        const buf = await res.arrayBuffer();

        if (/^application\/pdf$/i.test(ct)) {
          const blob = new Blob([buf], { type: "application/pdf" });
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
          return;
        }

        if (
          /officedocument\.wordprocessingml\.document/i.test(ct) ||
          filename.toLowerCase().endsWith(".docx")
        ) {
          // Lazy-load mammoth only when needed
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer: buf }, {});
          setDocxHtml(result.value || "<p>(empty)</p>");
          return;
        }

        setErr("Unsupported file type for inline preview. Use Download.");
      } catch (e: any) {
        console.error(e);
        setErr("Error loading attachment");
      }
    })();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [id]);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-3 p-4">
      <div className="flex items-center justify-between">
        <div className="truncate font-medium">{filename}</div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/attachments/${id}?download=1`}
            className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Download
          </a>
        </div>
      </div>

      {err && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {err} —{" "}
          <a className="underline" href={`/api/attachments/${id}?download=1`}>
            download instead
          </a>
        </div>
      )}

      {!err && blobUrl && (
        <iframe
          src={blobUrl}
          className="h-[80vh] w-full rounded-md border"
          title="PDF viewer"
        />
      )}

      {!err && docxHtml && (
        <div
          className="prose max-w-none rounded-md border bg-white p-4"
          dangerouslySetInnerHTML={{ __html: docxHtml }}
        />
      )}

      {!err && !blobUrl && !docxHtml && (
        <div className="text-sm text-gray-500">Loading…</div>
      )}
    </div>
  );
}
