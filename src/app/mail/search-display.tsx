import { useAtom } from "jotai";
import React from "react";
import { searchValueAtom, isSearchingAtom } from "./search-bar";
import { useDebounceValue } from "usehooks-ts";
import useThreads from "~/hooks/use-threads";
import DOMPurify from "dompurify";

const normalize = (s: unknown) =>
  (typeof s === "string" ? s : "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\s+/g, " ")
    .trim();

const contains = (haystack: string, needle: string) =>
  haystack.includes(needle);

const SearchDisplay = () => {
  const [searchValue] = useAtom(searchValueAtom);
  const [, setIsSearching] = useAtom(isSearchingAtom);
  const [debounced] = useDebounceValue(searchValue, 300);
  const { threads, setThreadId } = useThreads();

  const q = normalize(debounced);
  const hasQuery = q.length > 0;

  const hits = React.useMemo(() => {
    if (!hasQuery) return [];
    return threads
      .map((thread) => {
        const lastEmail = thread.emails.at(-1);
        const subject = normalize(thread.subject);
        const from =
          normalize(lastEmail?.from?.name ?? "") +
          " " +
          normalize(lastEmail?.from?.address ?? "");
        const to = normalize(
          (lastEmail?.to ?? [])
            .map((address: any) => address?.address ?? "")
            .join(", "),
        );
        const snippet = normalize(lastEmail?.bodySnippet ?? "");
        const body = normalize(lastEmail?.body ?? "");

        const haystack = [subject, from, to, snippet, body].join(" ");
        return contains(haystack, q)
          ? {
              id: thread.id,
              subject: thread.subject,
              from: lastEmail?.from?.address ?? "",
              to: (lastEmail?.to ?? []).map(
                (address: any) => address?.address ?? "",
              ),
              rawBody: lastEmail?.bodySnippet ?? "",
              threadId: thread.id,
            }
          : null;
      })
      .filter(Boolean) as Array<{
      id: string;
      subject: string;
      from: string;
      to: string[];
      rawBody: string;
      threadId: string;
    }>;
  }, [threads, q, hasQuery]);

  const noResults = hasQuery && hits.length === 0;

  return (
    <div className="max-h-[calc(100vh-50px)] overflow-y-scroll p-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm text-gray-600 dark:text-gray-400">
          {hasQuery
            ? `Searching this page for "${searchValue}"...`
            : "Type to search this page"}
        </h2>
      </div>

      {!hasQuery ? null : noResults ? (
        <p>No result found on this page</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {hits.map((hit) => (
            <li
              key={hit.id}
              className="cursor-pointer list-none rounded-md border border-black p-4 transition-all hover:bg-gray-100 dark:hover:bg-gray-900"
              onMouseDown={() => {
                setThreadId(hit.threadId);
                setIsSearching(false);
              }}
              title="Open thread"
            >
              <h3 className="text-base font-medium">{hit.subject}</h3>
              <p className="text-sm text-gray-500">From: {hit.from}</p>
              <p className="text-sm text-gray-500">To: {hit.to.join(", ")}</p>

              <p
                className="mt-2 line-clamp-3 text-sm"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(hit.rawBody, {
                    USE_PROFILES: { html: true },
                  }),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchDisplay;
