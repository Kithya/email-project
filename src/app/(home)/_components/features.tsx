import { features } from "~/lib/data";

const Features = () => {
  return (
    <section id="features" className="bg-white py-20 dark:bg-neutral-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-400">
            Product Tour
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl dark:text-white">
            Everything reviewers need to understand the app in one session.
          </h2>
          <p className="mt-4 text-base leading-7 text-neutral-600 dark:text-neutral-300">
            The demo path avoids brittle provider setup while preserving the
            core email assistant workflows: account switching, thread reading,
            safe sending, writing tools, and AI answers.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-neutral-200 bg-neutral-200 md:grid-cols-2 lg:grid-cols-3 dark:border-neutral-800 dark:bg-neutral-800">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="bg-white p-6 transition-colors hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-900"
              >
                <div className="mb-5 flex size-11 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900">
                  <Icon className="size-5 text-neutral-900 dark:text-white" />
                </div>
                <h3 className="text-base font-semibold text-neutral-950 dark:text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
