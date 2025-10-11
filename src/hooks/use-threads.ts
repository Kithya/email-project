import React from "react";
import { useLocalStorage } from "usehooks-ts";
import { api } from "~/trpc/react";
import { atom, useAtom } from "jotai";

export const threadIdAtom = atom<string | null>(null);

const useThreads = () => {
  const { data: accounts } = api.account.getAccount.useQuery();
  const [accountId] = useLocalStorage("accountId", "");
  const [tab] = useLocalStorage("email-tab", "inbox");
  const [done] = useLocalStorage("email-done", false);
  const [threadId, setThreadId] = useAtom(threadIdAtom);

  const [page, setPage] = React.useState(1);
  React.useEffect(() => {
    setPage(1);
  }, [accountId, tab, done]);

  const { data, isFetching, refetch } = api.account.getThreads.useQuery(
    { accountId, tab, done, page, pageSize: 15 },
    {
      enabled: !!accountId && !!tab,
      refetchInterval: 5000,
    },
  );

  const threads = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  const goToPage = (p: number) => {
    const clamped = Math.min(Math.max(1, p), totalPages);
    setPage(clamped);
  };

  return {
    threads,
    isFetching,
    refetch,
    page,
    totalPages,
    goToPage,
    accountId,
    setThreadId,
    threadId,
    account: accounts?.find((e) => e.id === accountId),
  };
};

export default useThreads;
