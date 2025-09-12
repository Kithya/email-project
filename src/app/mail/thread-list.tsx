"use client";

import { format, formatDistanceToNow } from "date-fns";
import React, { type ComponentProps } from "react";
import useThreads from "~/hooks/use-threads";
import { cn } from "~/lib/utils";
import DOMPurify from "dompurify";
import { Badge } from "~/components/ui/badge";

const ThreadList = () => {
  const { threads, threadId, setThreadId } = useThreads();

  // Debug logs
  // console.log("=== ThreadList Debug ===");
  // console.log("threads:", threads);
  // console.log("current threadId:", threadId);
  // console.log("setThreadId function:", setThreadId);

  const groupThreads = threads?.reduce(
    (acc, thread) => {
      const date = format(thread.emails[0]?.sentAt ?? new Date(), "yyyy-MM-dd");
      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push(thread);
      return acc;
    },
    {} as Record<string, typeof threads>,
  );

  const handleThreadClick = (thread: any) => {
    // console.log("=== Thread Click Debug ===");
    // console.log("Clicked thread:", thread);
    // console.log("Thread ID:", thread.id);
    // console.log("About to call setThreadId with:", thread.id);

    setThreadId(thread.id);

    // Check if it was set immediately (might not work due to async state)
    // console.log("Called setThreadId, current threadId:", threadId);
  };

  return (
    <div className="max-h-[calc(100vh-120px)] max-w-full overflow-y-scroll">
      <div className="flex flex-col gap-2 p-4 pt-0">
        {/* Debug info */}
        {/* <div className="bg-blue-100 p-2 text-xs">
          <div>Total threads: {threads?.length || 0}</div>
          <div>Selected threadId: {threadId || "none"}</div>
        </div> */}

        {Object.entries(groupThreads ?? {}).map(([date, threads]) => {
          return (
            <React.Fragment key={date}>
              <div className="text-muted-foreground mt-5 text-xs font-medium first:mt-0">
                {date}
              </div>

              {threads.map((thread) => {
                // console.log(
                //   "Rendering thread:",
                //   thread.id,
                //   "Selected:",
                //   thread.id === threadId,
                // );
                return (
                  <button
                    onClick={() => handleThreadClick(thread)}
                    key={thread.id}
                    className={cn(
                      "relative flex flex-col items-start gap-2 rounded-lg border p-3 text-left text-sm transition-all",
                      { "bg-accent": thread.id === threadId },
                    )}
                  >
                    <div className="flex w-full flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <div className="flex items-center gap-2">
                            <div className="font-semibold">
                              {thread.emails.at(-1)?.from.name}
                            </div>
                            {/* Debug info in each thread */}
                            {/* <span className="rounded bg-red-100 px-1 text-xs">
                              ID: {thread.id.slice(-4)}
                            </span> */}
                          </div>
                        </div>
                        <div className={cn("ml-auto text-xs")}>
                          {formatDistanceToNow(
                            thread.emails.at(-1)?.sentAt ?? new Date(),
                            { addSuffix: true },
                          )}
                        </div>
                      </div>
                      <div className="text-xs font-medium">
                        {thread.subject}
                      </div>
                    </div>

                    <div
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(
                          thread.emails.at(-1)?.bodySnippet ?? "",
                          { USE_PROFILES: { html: true } },
                        ),
                      }}
                      className="text-muted-foreground line-clamp-2 text-xs"
                    ></div>
                    {thread.emails[0]?.sysLabels.length && (
                      <div className="flex items-center gap-2">
                        {thread.emails[0].sysLabels.map((label) => {
                          return (
                            <Badge
                              key={label}
                              variant={getBadgeVariantFromLabel(label)}
                            >
                              {label}
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </button>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

function getBadgeVariantFromLabel(
  label: string,
): ComponentProps<typeof Badge>["variant"] {
  if (["work"].includes(label.toLowerCase())) {
    return "default";
  }

  if (["personal"].includes(label.toLowerCase())) {
    return "outline";
  }

  return "secondary";
}

export default ThreadList;
