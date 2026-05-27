import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { plans } from "~/lib/data";

const Pricing = () => {
  return (
    <section
      id="pricing"
      className="border-y border-neutral-200 bg-neutral-50 py-20 dark:border-neutral-800 dark:bg-neutral-900"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-400">
            Demo Mode
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl dark:text-white">
            Built to present well without billing surprises.
          </h2>
          <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
            The current portfolio path is intentionally local, reliable, and
            free to run. Real provider integrations can sit behind the same app
            once credentials and review requirements are ready.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="relative rounded-lg border border-neutral-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
            >
              {plan.popular && (
                <div className="absolute top-5 right-5 rounded-full bg-neutral-950 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-neutral-950">
                  Recommended
                </div>
              )}

              <h3 className="text-xl font-semibold text-neutral-950 dark:text-white">
                {plan.name}
              </h3>
              <div className="mt-5 flex items-end gap-2">
                <span className="text-4xl font-semibold tracking-tight text-neutral-950 dark:text-white">
                  {plan.price}
                </span>
                <span className="pb-1 text-sm text-neutral-500 dark:text-neutral-400">
                  {plan.period}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                {plan.description}
              </p>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-3 text-sm text-neutral-700 dark:text-neutral-300"
                  >
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <SignedOut>
                  <SignInButton mode="modal" forceRedirectUrl="/mail">
                    <Button
                      variant={plan.buttonVariant}
                      className="w-full"
                      size="lg"
                    >
                      {plan.buttonText}
                      <ArrowRight className="ml-2 size-4" />
                    </Button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <Button
                    asChild
                    variant={plan.buttonVariant}
                    className="w-full"
                    size="lg"
                  >
                    <Link href="/mail">
                      {plan.buttonText}
                      <ArrowRight className="ml-2 size-4" />
                    </Link>
                  </Button>
                </SignedIn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
