import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "~/components/ui/accordion";
import { faqs } from "~/lib/data";

const FAQ = () => {
  return (
    <section id="faq" className="bg-background py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
            Answer to All Your
          </h2>
          <h2 className="text-foreground mb-6 text-3xl font-bold md:text-4xl">
            Questions and More
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Our plans are thoughtfully new professionals email management –
            enabling communication, better analysis, and more productive
            workflows all the power of AI.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border-border shadow-soft bg-card rounded-lg border px-6"
              >
                <AccordionTrigger className="py-6 text-left hover:no-underline">
                  <span className="text-foreground pr-4 font-semibold">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQ;
