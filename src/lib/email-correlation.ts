// ~/lib/email-correlation.ts
import crypto from "crypto";

export function normalizeSubjectForCorrelation(subj: string) {
  // Strip common reply prefixes and trim
  return (subj || "").replace(/^\s*(re|fw|fwd)\s*:/i, "").trim();
}

export function normalizeHtmlForCorrelation(html: string) {
  // Cheap normalization: remove spaces/newlines > collapse; strip comments
  return (html || "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 10000); // cap to avoid hashing very large strings
}

export function correlationKey({
  subject,
  html,
  toAddresses,
  ccAddresses = [],
  fromAddress,
  bucketMs = 10_000, // 10s time bucket
  now = Date.now(),
}: {
  subject: string;
  html: string;
  toAddresses: string[];
  ccAddresses?: string[];
  fromAddress?: string;
  bucketMs?: number;
  now?: number;
}) {
  const s = normalizeSubjectForCorrelation(subject);
  const h = normalizeHtmlForCorrelation(html);
  const bucket = Math.floor(now / bucketMs);
  const recipients = [
    ...new Set([...(toAddresses || []), ...(ccAddresses || [])]),
  ]
    .filter(Boolean)
    .map((x) => x.toLowerCase())
    .sort()
    .join(",");

  const base = JSON.stringify({
    s,
    h,
    recipients,
    from: (fromAddress || "").toLowerCase(),
    b: bucket,
  });

  return crypto.createHash("sha256").update(base).digest("hex");
}
