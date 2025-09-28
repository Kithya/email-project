"use client";

import React from "react";
import useThreads from "~/hooks/use-threads";
import { cn } from "~/lib/utils";
import type { RouterOutputs } from "~/trpc/react";
import Avatar from "react-avatar";
import { formatDistanceToNow } from "date-fns";
import { Letter } from "react-letter";

type AttachmentLite = {
  id?: string;
  name: string;
  mimeType?: string;
  size?: number | null;
  inline?: boolean | null;
  contentId?: string | null;
};

type Props = {
  // @ts-ignore
  email: RouterOutputs["account"]["getThreads"][0]["emails"][0] & {
    attachments?: AttachmentLite[];
  };
};

const EmailDisplay = ({ email }: Props) => {
  const { account } = useThreads();
  const isMe = account?.emailAddress === email.from.address;

  // filter out inline assets and de-dupe remaining by a simple key
  const visibleAttachments = React.useMemo(() => {
    // @ts-ignore
    const items = (email.attachments ?? []).filter((a) => !a.inline);
    const seen = new Set<string>();
    const deduped: AttachmentLite[] = [];
    for (const a of items) {
      const key = `${a.name}::${a.mimeType ?? ""}::${a.size ?? ""}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(a);
      }
    }
    return deduped;
  }, [email.attachments]);

  return (
    <div
      className={cn(
        "rounded-md border p-4 transition-all hover:translate-x-2",
        { "border-l-4 border-l-gray-900": isMe },
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center justify-between gap-2">
          {!isMe && (
            <Avatar
              name={email.from.name ?? email.from.address}
              email={email.from.address}
              size="35"
              textSizeRatio={2}
              round={true}
            />
          )}
          <span className="font-medium">
            {isMe ? "Me" : email.from.address}
          </span>
        </div>
        <p className="text-muted-foreground text-xs">
          {formatDistanceToNow(email.sentAt ?? new Date(), { addSuffix: true })}
        </p>
      </div>

      <div className="mt-3" />

      <Letter
        html={email?.body ?? ""}
        className="rounded-md bg-white text-black"
      />

      {visibleAttachments.length > 0 && (
        <>
          <div className="h-3" />
          <div className="flex flex-wrap gap-2">
            {visibleAttachments.map((att) => (
              <a
                href={`/api/attachments/${att.id}`}
                key={att.id}
                target="_blank"
                rel="noopener noreferrer"
                title={att.name}
                className="rounded-md border bg-white px-2 py-1 text-xs text-gray-700 underline-offset-2 hover:underline dark:bg-gray-900 dark:text-gray-200"
              >
                📎{att.name}
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EmailDisplay;
