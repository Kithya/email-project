"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "~/lib/utils";
import { Send, SparklesIcon, AlertCircle } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import useThreads from "~/hooks/use-threads";
import { toast } from "sonner";
import PremiumBanner from "./premium-banner";
import { api } from "~/trpc/react";

const AskAI = ({ isCollapsed }: { isCollapsed: boolean }) => {
  const { accountId } = useThreads();
  const [input, setInput] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const utils = api.useUtils();

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        accountId,
      },
    }),
    onError: (error) => {
      console.error("Chat error:", error);

      if (error.message.includes("Limit reached")) {
        toast.error(
          "You have reached the limit for today. Please upgrade to pro to ask as many questions as you want",
        );
      } else if (
        error.message.includes("rate_limit_exceeded") ||
        error.message.includes("Rate limit exceeded")
      ) {
        setIsRateLimited(true);
        toast.error(
          "Too many requests. Please wait a moment before trying again.",
        );
        setTimeout(() => {
          setIsRateLimited(false);
        }, 60000);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    },
    onFinish: () => {
      utils.account.getChatbotInteraction.refetch();
    },
  });

  // @ts-ignore
  const isLoading = status === "in_progress";

  // @ts-ignore
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // @ts-ignore
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim() && !isLoading && !isRateLimited) {
      sendMessage({ text: input });
      setInput("");
    }
  };

  if (isCollapsed) return null;

  return (
    <div className="mb-14 p-4">
      <PremiumBanner />
      <div className="h-4" />
      <motion.div className="flex flex-1 flex-col items-end justify-end rounded-lg border bg-gray-100 p-4 pb-4 shadow-inner dark:bg-gray-900">
        {/* Rate limit warning */}
        {isRateLimited && (
          <div className="mb-3 flex items-center gap-2 rounded-lg bg-orange-100 p-3 text-sm text-orange-800 dark:bg-orange-900/20 dark:text-orange-300">
            <AlertCircle className="size-4" />
            <span>
              Rate limit reached. Please wait before sending another message.
            </span>
          </div>
        )}

        <div
          className="flex max-h-[50vh] w-full flex-col gap-2 overflow-y-scroll"
          id="message-container"
        >
          <AnimatePresence mode="wait">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                layout="position"
                className={cn(
                  "z-10 mt-2 max-w-[250px] rounded-2xl bg-gray-200 break-words dark:bg-gray-800",
                  {
                    "self-end text-gray-900 dark:text-gray-100":
                      message.role === "user",
                    "self-start bg-blue-500 text-white":
                      message.role === "assistant",
                  },
                )}
                layoutId={`container-[${messages.length - 1}]`}
              >
                <div className="px-3 py-2 text-[15px] leading-[20px] whitespace-pre-wrap">
                  {message.parts?.map((part: any, index: number) =>
                    part.type === "text" ? (
                      <span key={index}>{part.text}</span>
                    ) : null,
                  )}
                </div>
              </motion.div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                className="z-10 mt-2 max-w-[250px] self-start rounded-2xl bg-blue-500 break-words text-white"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div className="px-3 py-2 text-[15px] leading-[15px]">
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.3s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white [animation-delay:-0.15s]"></div>
                    <div className="h-2 w-2 animate-bounce rounded-full bg-white"></div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {messages.length > 0 && <div className="h-4"></div>}
        <div className="w-full">
          {messages.length === 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <SparklesIcon className="size-6 text-gray-500" />
                <div>
                  <p className="text-gray-900 dark:text-gray-100">
                    Ask AI anything about your emails
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get answers to your questions about your emails
                  </p>
                </div>
              </div>
              <div className="h-2"></div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  onClick={() =>
                    !isLoading &&
                    !isRateLimited &&
                    handleInputChange({
                      target: {
                        value: "What can I ask?",
                      },
                    })
                  }
                  className={cn(
                    "rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-200 transition-colors",
                    {
                      "cursor-pointer hover:bg-gray-700":
                        !isLoading && !isRateLimited,
                      "cursor-not-allowed opacity-50":
                        isLoading || isRateLimited,
                    },
                  )}
                >
                  What can I ask?
                </span>
                <span
                  onClick={() =>
                    !isLoading &&
                    !isRateLimited &&
                    handleInputChange({
                      target: {
                        value: "When is my next flight?",
                      },
                    })
                  }
                  className={cn(
                    "rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-200 transition-colors",
                    {
                      "cursor-pointer hover:bg-gray-700":
                        !isLoading && !isRateLimited,
                      "cursor-not-allowed opacity-50":
                        isLoading || isRateLimited,
                    },
                  )}
                >
                  When is my next flight?
                </span>
                <span
                  onClick={() =>
                    !isLoading &&
                    !isRateLimited &&
                    handleInputChange({
                      target: {
                        value: "When is my next meeting?",
                      },
                    })
                  }
                  className={cn(
                    "rounded-md bg-gray-800 px-2 py-1 text-xs text-gray-200 transition-colors",
                    {
                      "cursor-pointer hover:bg-gray-700":
                        !isLoading && !isRateLimited,
                      "cursor-not-allowed opacity-50":
                        isLoading || isRateLimited,
                    },
                  )}
                >
                  When is my next meeting?
                </span>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex w-full">
            <input
              type="text"
              onChange={handleInputChange}
              value={input}
              disabled={isLoading || isRateLimited}
              className={cn(
                "py- relative h-9 flex-grow rounded-full border border-gray-200 bg-white px-3 text-[15px] outline-none placeholder:text-[13px] placeholder:text-gray-400 focus-visible:ring-0 focus-visible:ring-blue-500/20 focus-visible:ring-offset-1 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-400 dark:focus-visible:ring-blue-500/20 dark:focus-visible:ring-offset-1 dark:focus-visible:ring-offset-gray-700",
                {
                  "cursor-not-allowed opacity-50": isLoading || isRateLimited,
                },
              )}
              placeholder={
                isRateLimited
                  ? "Rate limited - please wait..."
                  : isLoading
                    ? "AI is thinking..."
                    : "Ask AI anything about your emails"
              }
            />
            <motion.div
              key={messages.length}
              layout="position"
              className="pointer-events-none absolute z-10 flex h-9 w-[250px] items-center overflow-hidden rounded-full bg-gray-200 break-words [word-break:break-word] dark:bg-gray-800"
              layoutId={`container-[${messages.length}]`}
              initial={{ opacity: 0.6, zIndex: -1 }}
              animate={{ opacity: 0.6, zIndex: -1 }}
              exit={{ opacity: 1, zIndex: 1 }}
            >
              <div className="px-3 py-2 text-[15px] leading-[15px] text-gray-900 dark:text-gray-100">
                {input}
              </div>
            </motion.div>
            <button
              type="submit"
              disabled={isLoading || isRateLimited || !input.trim()}
              className={cn(
                "ml-2 flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 transition-colors dark:bg-gray-800",
                {
                  "cursor-not-allowed opacity-50":
                    isLoading || isRateLimited || !input.trim(),
                  "hover:bg-gray-300 dark:hover:bg-gray-700":
                    !isLoading && !isRateLimited && input.trim(),
                },
              )}
            >
              <Send className="size-4 text-gray-500 dark:text-gray-300" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AskAI;
