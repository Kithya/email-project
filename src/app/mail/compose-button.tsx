import { Pencil } from "lucide-react";
import React, { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import EmailEditor from "./email-editor";
import { api } from "~/trpc/react";
import useThreads from "~/hooks/use-threads";
import { toast } from "sonner";

type ComposeButtonProps = {
  compact?: boolean;
  className?: string;
};

const ComposeButton = ({ compact = false, className }: ComposeButtonProps) => {
  const [toValues, setToValues] = React.useState<
    { label: string; value: string }[]
  >([]);
  const [ccValues, setCcValue] = React.useState<
    { label: string; value: string }[]
  >([]);
  const [subject, setSubject] = React.useState<string>("");
  const { account } = useThreads();

  const sendEmail = api.account.sendEmail.useMutation();

  const handleSend = async (value: string) => {
    if (!account) return;

    sendEmail.mutate(
      {
        accountId: account.id,
        threadId: undefined,
        body: value,
        from: {
          name: account?.name ?? "Me",
          address: account?.emailAddress ?? "me@example.com",
        },
        to: toValues.map((to) => ({ name: to.value, address: to.value })),
        cc: ccValues.map((cc) => ({ name: cc.value, address: cc.value })),
        replyTo: {
          name: account?.name ?? "Me",
          address: account.emailAddress ?? "me@example.com",
        },
        subject: subject,
        inReplyTo: undefined,
      },
      {
        onSuccess: () => {
          toast.success("Email sent");
        },
        onError: (error) => {
          console.log(error);
          toast.error("Error sending email");
        },
      },
    );
  };

  return (
    <Drawer>
      <DrawerTrigger asChild>
        {compact ? (
          <Button
            size={"icon"}
            className={className}
            aria-label="Compose"
            title="Compose"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Pencil className="mr-1 size-4" />
            Compose
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-left">Compose Email</DrawerTitle>
        </DrawerHeader>
        <EmailEditor
          toValues={toValues}
          setToValue={setToValues}
          ccValues={ccValues}
          setCcValue={setCcValue}
          subject={subject}
          setSubject={setSubject}
          handleSend={handleSend}
          isSending={sendEmail.isPending}
          to={toValues.map((to) => to.value)}
          defaultToolbarExpand={true}
        />
      </DrawerContent>
    </Drawer>
  );
};

export default ComposeButton;
