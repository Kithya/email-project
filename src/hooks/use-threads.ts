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

  const {
    data: threads,
    isFetching,
    refetch,
  } = api.account.getThreads.useQuery(
    {
      accountId,
      tab,
      done,
    },
    {
      enabled: !!accountId && !!tab,
      placeholderData: (e) => e,
      refetchInterval: 5000,
    },
  );

  return {
    threads,
    isFetching,
    refetch,
    accountId,
    setThreadId,
    threadId,
    account: accounts?.find((e) => e.id === accountId),
  };
};

export default useThreads;
