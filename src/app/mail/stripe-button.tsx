"use client";
import { Button } from "~/components/ui/button";
import {
  createBillingPortalSession,
  getSubscriptionStatus,
} from "~/lib/stripe-actions";
import React from "react";
import { useRouter } from "next/navigation";

const StripeButton = () => {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    (async () => {
      const isSubscribed = await getSubscriptionStatus();
      setIsSubscribed(isSubscribed);
    })();
  }, []);

  const handleClick = async () => {
    if (!isSubscribed) {
      router.push("/pricing");
    } else {
      await createBillingPortalSession();
    }
  };

  return (
    <Button variant={"outline"} size="lg" onClick={handleClick}>
      {isSubscribed ? "Manage Subscription" : "Upgrade Plan"}
    </Button>
  );
};

export default StripeButton;
