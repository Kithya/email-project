"use client";

import { Bot } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Textarea } from "~/components/ui/textarea";
import { generateEmail } from "./action";
import { readStreamableValue } from "@ai-sdk/rsc";
import useThreads from "~/hooks/use-threads";
import { turndown } from "~/lib/turndown";

type Props = {
  onGenerate: (value: string) => void;
  isComposing?: boolean;
};

const AIComposeButton = (props: Props) => {
  const [open, setOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const { threads, threadId, account } = useThreads();
  const thread = threads?.find((t) => t.id === threadId);

  const aiGenetate = async () => {
    let context = "";

    if (!props.isComposing) {
      for (const email of thread?.emails ?? []) {
        const content = `
            Subject: ${email.subject}
            From: ${email.from}
            Sent: ${new Date(email.sentAt).toLocaleString()}
            Body: ${turndown.turndown(email.body ?? email.bodySnippet ?? "")}
          `;
        context += content;
      }
    }
    context += `My name is ${account?.name} and my email is ${account?.emailAddress}`;
    // console.log(context);

    const { output } = await generateEmail(context, prompt);
    for await (const token of readStreamableValue(output)) {
      if (token) {
        props.onGenerate(token);
        console.log(token);
      }
    }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size={"icon"} variant={"outline"}>
          <Bot className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Smart AI Compose</DialogTitle>
          <DialogDescription>
            AI will help you compose your email
          </DialogDescription>
          <div className="h-2"></div>
          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt."
          />
          <div className="h-2"></div>
          <Button
            onClick={() => {
              setOpen(false);
              setPrompt("");
              aiGenetate();
            }}
          >
            Generate
          </Button>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default AIComposeButton;
