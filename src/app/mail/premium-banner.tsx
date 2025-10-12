"use client";
import { motion } from "framer-motion";
import React from "react";
import StripeButton from "./stripe-button";
import { api } from "~/trpc/react";
import { getSubscriptionStatus } from "~/lib/stripe-actions";
import { FREE_CREDITS_PER_DAY } from "~/lib/data";
import { useSearchParams } from "next/navigation";

const PremiumBanner = () => {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const search = useSearchParams();

  React.useEffect(() => {
    (async () => {
      const subscriptionStatus = await getSubscriptionStatus();
      setIsSubscribed(subscriptionStatus);
    })();
  }, [search?.get("upgrade")]); // refetch after successful upgrade redirect

  const { data: chatbotInteraction } =
    api.account.getChatbotInteraction.useQuery();
  const remainingCredits = chatbotInteraction?.remainingCredits || 0;

  if (isSubscribed)
    return (
      <motion.div
        layout
        className="relative flex flex-col gap-4 overflow-hidden rounded-lg border bg-gray-900 p-4 md:flex-row"
      >
        <img
          src="/bot.webp"
          className="h-[180px] w-auto md:absolute md:-right-10 md:-bottom-6"
        />
        <div>
          <h1 className="text-xl font-semibold text-white">Premium Plan</h1>
          <div className="h-2"></div>
          <p className="text-sm text-gray-400 md:max-w-[calc(100%-70px)]">
            Ask as many questions as you want
          </p>
          <div className="h-4"></div>
          <StripeButton />
        </div>
      </motion.div>
    );

  return (
    <motion.div
      layout
      className="relative flex flex-col gap-4 overflow-hidden rounded-lg border bg-gray-900 p-4 md:flex-row"
    >
      <img
        src="/bot.webp"
        className="h-[180px] w-auto md:absolute md:-right-10 md:-bottom-6"
      />
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-white">Basic Plan</h1>
          <p className="text-sm text-gray-400 md:max-w-[calc(100%-0px)]">
            {remainingCredits} / {FREE_CREDITS_PER_DAY} messages remaining
          </p>
        </div>
        <div className="h-4"></div>
        <p className="text-sm text-gray-400 md:max-w-[calc(100%-150px)]">
          Upgrade to pro to ask as many questions as you want
        </p>
        <div className="h-4"></div>
        <StripeButton />
      </div>
    </motion.div>
  );
};

export default PremiumBanner;
