import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { faqs } from "~/lib/data";

const FAQ = () => {
  return (
    <section id="faq" className="bg-white py-20 dark:bg-neutral-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-sm font-semibold tracking-wide text-sky-700 uppercase dark:text-sky-400">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-neutral-950 sm:text-4xl dark:text-white">
            Demo details, without the hand-waving.
          </h2>
        </div>

        <Accordion
          type="single"
          collapsible
          className="mt-10 divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800"
        >
          {faqs.map((faq, index) => (
            <AccordionItem
              key={faq.question}
              value={`item-${index}`}
              className="border-0 px-5"
            >
              <AccordionTrigger className="py-5 text-left text-base font-semibold text-neutral-950 hover:no-underline dark:text-white">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
