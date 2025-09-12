import { useAtom } from "jotai";
import React, { useEffect, useRef, useState } from "react";
import { isSearchingAtom, searchValueAtom } from "./search-bar";
import { api } from "~/trpc/react";
import { useDebounceValue } from "usehooks-ts";
import useThreads from "~/hooks/use-threads";
import DOMPurify from "dompurify";

type Hit = {
  id: string;
  document: {
    subject: string;
    from: string;
    to: string[];
    rawBody: string;
    threadId: string;
  };
};

const SearchDisplay = () => {
  const [searchValue] = useAtom(searchValueAtom);
  const [debounceSearchValue] = useDebounceValue(searchValue, 500);
  const { accountId, setThreadId } = useThreads();
  const [, setIsSearching] = useAtom(isSearchingAtom);

  const search = api.account.searchEmails.useMutation();

  const [hits, setHits] = useState<Hit[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!debounceSearchValue || !accountId) {
      setHits([]);
      setErrorMsg(null);
      setIsLoading(false);
      return;
    }

    const currentReq = ++reqIdRef.current;
    setIsLoading(true);
    setErrorMsg(null);

    search.mutate(
      {
        accountId,
        query: debounceSearchValue,
      },
      {
        onSuccess: (data) => {
          if (reqIdRef.current !== currentReq) return;
          setHits((data?.hits as unknown as Hit[]) ?? []);
        },
        onError: (err) => {
          if (reqIdRef.current !== currentReq) return;
          setErrorMsg(err instanceof Error ? err.message : "Search failed");
          setHits([]);
        },
        onSettled: () => {
          if (reqIdRef.current !== currentReq) return;
          setIsLoading(false);
        },
      },
    );
  }, [debounceSearchValue, accountId]);

  // useEffect(() => {
  //   if (!debounceSearchValue || !accountId) return;
  //   search.mutate({
  //     accountId,
  //     query: debounceSearchValue,
  //   });
  // }, [debounceSearchValue, accountId]);
  const hasQuery = !!debounceSearchValue;
  const noResults = hasQuery && !isLoading && hits.length === 0 && !errorMsg;

  return (
    <div className="max-h-[calc(100vh-50px)] overflow-y-scroll p-4">
      <div className="mb-4 flex items-center gap-2">
        <h2 className="text-sm text-gray-600 dark:text-gray-400">
          {hasQuery
            ? `Your search for “${searchValue}” came back with...`
            : "Type to search your emails"}
        </h2>
        {isLoading && (
          <span className="text-xs text-gray-400">Searching...</span>
        )}
        {errorMsg && <span className="text-xs text-red-500">({errorMsg})</span>}
      </div>

      {!hasQuery ? null : noResults ? (
        <>
          <p>No Result Found</p>
        </>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {hits.map((hit) => (
              <li
                key={hit.id}
                className="cursor-pointer list-none rounded-md border border-black p-4 transition-all hover:bg-gray-100 dark:hover:bg-gray-900"
                onMouseDown={(e) => {
                  if (!hit.document.threadId) return;
                  setThreadId(hit.document.threadId);
                  setIsSearching(false);
                }}
                title="Open thread"
              >
                <h3 className="text-base font-medium">
                  {hit.document.subject}
                </h3>
                <p className="text-sm text-gray-500">
                  From: {hit.document.from}
                </p>
                <p className="text-sm text-gray-500">
                  To: {hit.document.to.join(", ")}
                </p>

                <p
                  className="mt-2 line-clamp-3 text-sm"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(hit.document.rawBody, {
                      USE_PROFILES: { html: true },
                    }),
                  }}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
};

export default SearchDisplay;
