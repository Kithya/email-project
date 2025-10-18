"use client";

import { Bot, Loader2 } from "lucide-react";
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
import { api } from "~/trpc/react";

type Props = {
  onGenerate: (value: string) => void;
  isComposing?: boolean;
};

function plainTextToHtml(text: string): string {
  const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const blocks = text.trim().split(/\n{2,}/);
  const htmlBlocks = blocks.map((block) => {
    const lines = block.split(/\n/);
    const isList =
      lines.some((l) => l.trim().length > 0) &&
      lines.every((l) => l.trim() === "" || /^[\s]*([-\*\u2022])\s+/.test(l));
    if (isList) {
      const items = lines
        .map((l) => l.trim())
        .filter((l) => l !== "")
        .map((l) => l.replace(/^[\s]*([-\*\u2022])\s+/, ""))
        .map((content) => `<li>${escapeHtml(content)}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    return `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`;
  });
  return htmlBlocks.join("");
}

const AIComposeButton = (props: Props) => {
  const [open, setOpen] = React.useState(false);
  const [prompt, setPrompt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const { threads, threadId, account } = useThreads();
  const thread = threads?.find((t) => t.id === threadId);
  const utils = api.useUtils();

  const aiGenerate = async (promptSnapshot: string) => {
    setIsLoading(true);
    try {
      let context = "";

      if (!props.isComposing) {
        for (const email of thread?.emails ?? []) {
          const content = `
Subject: ${email.subject}
From: ${email.from}
Sent: ${new Date(email.sentAt).toLocaleString()}
Body: ${turndown.turndown(email.body ?? email.bodySnippet ?? "")}
`;
          context += content + "\n\n";
        }
      }
      context += `My name is ${account?.name} and my email is ${account?.emailAddress}\n\n`;

      let attachmentsBlock = "";
      try {
        if (thread?.id && account?.id) {
          const insights = await utils.account.getAttachmentInsights.fetch({
            accountId: account.id,
            threadId: thread.id,
          });
          if (insights && insights.length) {
            attachmentsBlock += "ATTACHMENT EVIDENCE:\n";
            for (const a of insights) {
              attachmentsBlock += `File: ${a.name}\nSummary: ${a.summary}\nExcerpt: ${a.snippet}\n\n`;
            }
          }
        }
      } catch (e) {
        console.log("[AI Compose] getAttachmentInsights failed", e);
      }

      const { output } = await generateEmail(
        context + attachmentsBlock,
        promptSnapshot,
      );

      let fullText = "";
      for await (const token of readStreamableValue(output)) {
        if (token) fullText += token;
      }
      const html = plainTextToHtml(fullText);
      props.onGenerate(html);
      setOpen(false); // close only after success
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      // prevent closing while loading (feels safer)
      onOpenChange={(next) => {
        if (isLoading) return;
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" aria-busy={isLoading}>
          {isLoading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Bot className="size-5" />
          )}
        </Button>
      </DialogTrigger>

      <DialogContent aria-busy={isLoading}>
        <DialogHeader>
          <DialogTitle>Smart AI Compose</DialogTitle>
          <DialogDescription>
            AI will help you compose your email
          </DialogDescription>

          <div className="h-2" />

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Enter a prompt."
            disabled={isLoading}
          />

          <div className="h-2" />

          <div className="flex items-center gap-2">
            <Button
              disabled={isLoading}
              onClick={() => {
                const p = prompt.trim();
                setPrompt("");
                void aiGenerate(p);
              }}
            >
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Generating…
                </span>
              ) : (
                "Generate"
              )}
            </Button>

            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>

          {isLoading && (
            <div className="mt-3 text-xs text-neutral-500">
              This can take a few seconds. Please keep this window open.
            </div>
          )}
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default AIComposeButton;
