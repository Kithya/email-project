import { Check } from "lucide-react";
import React from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { plans } from "~/lib/data";

const Pricing = () => {
  return (
    <section id="pricing" className="bg-muted/30 py-16 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
            Smart Pricing Plans That
          </h2>
          <h2 className="mb-6 text-3xl font-bold text-[#377BB7] md:text-4xl">
            Scale With Your Needs
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Our plans are thoughtfully designed to enable communication –
            enabling smarter communication, better analysis, and more productive
            workflows all the power of AI.
          </p>
        </div>

        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          {plans.map((plan, index) => (
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
                  {plan.features.map((feature, featureIndex) => (
                    <li
                      key={featureIndex}
                      className="flex items-start space-x-3"
                    >
                      <Check className="text-success mt-0.5 h-5 w-5 flex-shrink-0" />
                      <span className="text-muted-foreground leading-relaxed">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.buttonVariant}
                  className="w-full py-3 text-lg font-semibold"
                  size="lg"
                >
                  {plan.buttonText}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground mx-auto max-w-2xl">
            Our plans are thoughtfully new professionals email management –
            enabling communication, better analysis, and more productive
            workflows with all the power of AI.
          </p>
        </div>
      </div>
    </section>
  );
};

export default Pricing;
