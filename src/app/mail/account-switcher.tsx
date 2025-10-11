"use client";
import React from "react";
import { api } from "~/trpc/react";
import { useLocalStorage } from "usehooks-ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { cn } from "~/lib/utils";
import { Plus } from "lucide-react";
import { getAurinkoAuthUrl } from "~/lib/aurinko";
import { toast } from "sonner";

type Prop = {
  isCollapsed: boolean;
};

const AccountSwitcher = ({ isCollapsed }: Prop) => {
  const { data } = api.account.getAccount.useQuery();
  const [accountId, setAccountId] = useLocalStorage("accountId", "");

  if (!data) return null;

  return (
    <Select defaultValue={accountId} onValueChange={setAccountId}>
      <SelectTrigger
        className={cn(
          "flex w-full flex-1 items-center gap-2 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&>span]:line-clamp-1 [&>span]:flex [&>span]:w-full [&>span]:items-center [&>span]:gap-1 [&>span]:truncate",
          isCollapsed &&
            "flex h-9 w-9 shrink-0 items-center justify-center p-0 [&>span]:w-auto [&>svg]:hidden",
        )}
        aria-label="Select account"
      >
        <SelectValue placeholder="Select an account">
          <span className={cn({ hidden: !isCollapsed })}>
            {data?.find((account) => account.id === accountId)?.emailAddress[0]}
          </span>
          <span className={cn("ml-2", isCollapsed && "hidden")}>
            {data?.find((account) => account.id === accountId)?.emailAddress}
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {data?.map((account) => (
          <SelectItem key={account.id} value={account.id}>
            <div className="[&_svg]:text-foreground flex items-center gap-3 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0">
              {account.emailAddress}
            </div>
          </SelectItem>
        ))}
        <div
          onClick={async () => {
            try {
              const authUrl = await getAurinkoAuthUrl("Google");
              window.location.href = authUrl;
            } catch (error) {
              // @ts-ignore
              toast.error(error.message);
            }
          }}
          className="focus:bg-accent relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none hover:bg-gray-50"
        >
          <Plus className="mr-1 size-4" />
          Add Account
        </div>
      </SelectContent>
    </Select>
  );
};

export default AccountSwitcher;
