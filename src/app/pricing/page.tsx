"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  createBillingPortalSession,
  createCheckoutSession,
  downgradeToFree,
  getSubscriptionStatus,
} from "~/lib/stripe-actions";
import { plans } from "~/lib/data";

function PricingPageContent() {
  const [isSubscribed, setIsSubscribed] = React.useState(false);
  const [loadingKey, setLoadingKey] = React.useState<string | null>(null);
  const router = useRouter();
  const search = useSearchParams();

  // Refresh status on entry and after returns (?upgrade=success / ?downgrade=success)
  React.useEffect(() => {
    (async () => {
      const status = await getSubscriptionStatus();
      setIsSubscribed(status);
    })();
  }, [search?.get("upgrade"), search?.get("downgrade")]);

  const handleSelectPlan = async (planName: string) => {
    try {
      setLoadingKey(planName);
      if (planName.toLowerCase().includes("free")) {
        // Downgrade immediately to Free
        await downgradeToFree();
      } else {
        // If already subscribed, manage instead of re-checkout
        if (isSubscribed) {
          await createBillingPortalSession();
        } else {
          await createCheckoutSession(); // will redirect to Stripe
        }
      }
    } finally {
      setLoadingKey(null);
    }
  };

  return (
    <section className="bg-muted/30 py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
            Smart Pricing Plans That
          </h2>
          <h2 className="mb-6 text-3xl font-bold text-[#377BB7] md:text-4xl">
            Scale With Your Needs
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Our plans are thoughtfully designed to enable smarter communication,
            better analysis, and more productive workflows — all with the power
            of AI.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {plans.map((plan, index) => {
            // Button label logic
            let cta = plan.buttonText;
            if (plan.name.toLowerCase().includes("free")) {
              cta = "Switch to Free";
            } else {
              cta = isSubscribed ? "Manage Subscription" : "Upgrade to Pro";
            }

            return (
              <Card
                key={index}
                className={`hover:shadow-large relative overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                  plan.popular
                    ? "border-primary/50 shadow-medium"
                    : "border-border shadow-soft"
                }`}
              >
                {plan.popular && (
                  <div className="bg-primary text-primary-foreground absolute top-0 right-0 rounded-bl-lg px-4 py-1 text-sm font-medium">
                    Most Popular
                  </div>
                )}

                <CardHeader className="pb-8 text-center">
                  <CardTitle className="text-foreground mb-2 text-2xl font-bold">
                    {plan.name}
                  </CardTitle>
                  <div className="mb-4">
                    <span className="text-foreground text-4xl font-bold">
                      {plan.price}
                    </span>
                    <span className="text-muted-foreground ml-2">
                      /{plan.period}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{plan.description}</p>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-4">
                    {plan.features.map(
                      (feature: string, featureIndex: number) => (
                        <li
                          key={featureIndex}
                          className="flex items-start space-x-3"
                        >
                          <Check className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
                          <span className="text-muted-foreground leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>

                  <Button
                    variant={plan.buttonVariant}
                    className="w-full py-3 text-lg font-semibold"
                    size="lg"
                    disabled={loadingKey === plan.name}
                    onClick={() => handleSelectPlan(plan.name)}
                  >
                    {loadingKey === plan.name ? "Please wait..." : cta}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mx-auto max-w-2xl">
            Plans designed for new professionals — enabling better
            communication, safer analysis, and more productive workflows.
          </p>
        </div>
      </div>
    </section>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingPageContent />
    </Suspense>
  );
}
