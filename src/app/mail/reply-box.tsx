"use client";

import React from "react";
import EmailEditor from "./email-editor";
import { api, type RouterOutputs } from "~/trpc/react";
import useThreads from "~/hooks/use-threads";
import { toast } from "sonner";
import type { AttachmentInput } from "~/types";

const ReplyBox = () => {
  const { threadId, accountId } = useThreads();
  const { data: replyDetails } = api.account.getReplyDetails.useQuery(
    {
      threadId: threadId ?? "",
      accountId,
    },
    {
      enabled: !!threadId && !!accountId,
    },
  );

  if (!replyDetails) return null;

  return <Component replyDetails={replyDetails} />;
};

const Component = ({
  replyDetails,
}: {
  replyDetails: RouterOutputs["account"]["getReplyDetails"];
}) => {
  const { threadId, accountId } = useThreads();

  const [subject, setSubject] = React.useState(
    replyDetails.subject.startsWith("Re:")
      ? replyDetails.subject
      : `Re: ${replyDetails.subject}`,
  );
  const [toValues, setToValues] = React.useState<
    { label: string; value: string }[]
  >(
    replyDetails.to.map((to) => ({
      label: to.address ?? to.name,
      value: to.address,
    })) || [],
  );
  const [ccValues, setCcValues] = React.useState<
    { label: string; value: string }[]
  >(
    replyDetails.cc.map((cc) => ({
      label: cc.address ?? cc.name,
      value: cc.address,
    })) || [],
  );

  React.useEffect(() => {
    if (!threadId || !replyDetails) return;
    if (!replyDetails.subject.startsWith("Re:")) {
      setSubject(`Re: ${replyDetails.subject}`);
    } else {
      setSubject(replyDetails.subject);
    }

    setToValues(
      replyDetails.to.map((to) => ({ label: to.address, value: to.address })),
    );
    setCcValues(
      replyDetails.cc.map((cc) => ({ label: cc.address, value: cc.address })),
    );
  }, [threadId, accountId, replyDetails]);

  const [attachments, setAttachments] = React.useState<AttachmentInput[]>([]);

  const sendEmail = api.account.sendEmail.useMutation();

  const handleSend = async (html: string, atts?: AttachmentInput[]) => {
    if (!replyDetails) return;

    sendEmail.mutate(
      {
        accountId,
        threadId: threadId ?? undefined,
        body: html,
        subject,
        from: replyDetails.from,
        to: toValues.map((t) => ({ address: t.value, name: t.label ?? "" })),
        cc: ccValues.map((c) => ({ address: c.value, name: c.label ?? "" })),
        replyTo: replyDetails.from,
        inReplyTo: replyDetails.id,
        attachments: atts && atts.length ? atts : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Email sent");
          // reset composer bits
          setAttachments([]);
        },
        onError: () => {
          toast.error("Failed to send email");
        },
      },
    );
  };

  return (
    <EmailEditor
      subject={subject}
      setSubject={setSubject}
      toValues={toValues}
      setToValue={setToValues}
      ccValues={ccValues}
      setCcValue={setCcValues}
      to={toValues.map((t) => t.value)}
      handleSend={handleSend}
      isSending={sendEmail.isPending}
      defaultToolbarExpand={false}
      attachments={attachments}
      setAttachments={setAttachments}
    />
  );
};

export default ReplyBox;
