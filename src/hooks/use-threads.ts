import React from "react";
import { useLocalStorage } from "usehooks-ts";
import { api } from "~/trpc/react";
import { atom, useAtom } from "jotai";

export const threadIdAtom = atom<string | null>(null);

const useThreads = () => {
  const { data: accounts } = api.account.getAccount.useQuery();
  const [accountId, setAccountId] = useLocalStorage("accountId", "");
  const [tab] = useLocalStorage("email-tab", "inbox");
  const [done] = useLocalStorage("email-done", false);
  const [threadId, setThreadId] = useAtom(threadIdAtom);
  const account =
    accounts?.find((entry) => entry.id === accountId) ??
    accounts?.find((entry) => entry.isDemo) ??
    accounts?.[0];

  React.useEffect(() => {
    if (!accounts?.length) return;
    if (!accountId || !accounts.some((entry) => entry.id === accountId)) {
      setAccountId(account?.id ?? accounts[0]?.id ?? "");
    }
  }, [account?.id, accountId, accounts, setAccountId]);

  const [page, setPage] = React.useState(1);
  React.useEffect(() => {
    setPage(1);
  }, [accountId, tab, done]);

  const { data, isFetching, refetch } = api.account.getThreads.useQuery(
    { accountId: account?.id ?? "", tab, done, page, pageSize: 15 },
    {
      enabled: !!account?.id && !!tab,
      refetchInterval: account?.isDemo ? false : 30_000,
    },
  );

  const threads = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  React.useEffect(() => {
    if (!threads.length) {
      if (threadId) setThreadId(null);
      return;
    }

    if (!threadId || !threads.some((thread) => thread.id === threadId)) {
      setThreadId(threads[0]?.id ?? null);
    }
  }, [setThreadId, threadId, threads]);

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
    accountId: account?.id ?? accountId,
    setThreadId,
    threadId,
    account,
  };
};

export default useThreads;
