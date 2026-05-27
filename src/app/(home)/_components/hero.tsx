import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import highlight from "../../../../public/highlight.png";

const stats = [
  ["3", "seeded demo accounts"],
  ["0", "paid email APIs required"],
  ["AI", "answers by selected mailbox"],
];

const Hero = () => {
  return (
    <section className="overflow-hidden border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8 lg:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            <Sparkles className="size-4" />
            Portfolio-ready AI email assistant
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-semibold tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl dark:text-white">
            Dealflow turns a demo inbox into a working AI email workspace.
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-neutral-600 sm:text-lg dark:text-neutral-300">
            Explore seeded executive, sales, and support mailboxes. Ask AI
            account-specific questions, draft polished replies, and test the
            full workflow without linking a real email provider.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <SignedOut>
              <SignInButton mode="modal" forceRedirectUrl="/mail">
                <Button size="lg" className="h-12 px-6">
                  Start demo
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Button asChild size="lg" className="h-12 px-6">
                <Link href="/mail">
                  Open mailbox
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
            </SignedIn>
            <Button asChild variant="outline" size="lg" className="h-12 px-6">
              <a href="#features">View features</a>
            </Button>
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-neutral-600 dark:text-neutral-300">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-4 text-emerald-600" />
              Local safe sending
            </span>
            <span className="inline-flex items-center gap-2">
              <ShieldCheck className="size-4 text-sky-600" />
              Demo data isolated per user
            </span>
          </div>
        </div>

        <div className="mt-12">
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-2xl shadow-neutral-900/10 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <span className="size-3 rounded-full bg-red-400" />
              <span className="size-3 rounded-full bg-amber-400" />
              <span className="size-3 rounded-full bg-emerald-500" />
              <div className="ml-3 h-7 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 text-left text-xs leading-7 text-neutral-500 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-400">
                /mail - Executive Demo
              </div>
            </div>
            <Image
              src={highlight}
              alt="Dealflow mailbox interface"
              width={1600}
              height={900}
              priority
              className="h-auto w-full"
            />
          </div>
        </div>

        <div className="grid border-x border-b border-neutral-200 bg-white sm:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-900">
          {stats.map(([value, label]) => (
            <div
              key={label}
              className="border-t border-neutral-200 px-6 py-5 text-center sm:border-t-0 sm:border-r last:sm:border-r-0 dark:border-neutral-800"
            >
              <div className="text-2xl font-semibold text-neutral-950 dark:text-white">
                {value}
              </div>
              <div className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
