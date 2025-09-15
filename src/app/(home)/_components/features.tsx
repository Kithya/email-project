import React from "react";
import { Card, CardContent } from "~/components/ui/card";
import { features } from "~/lib/data";

const Features = () => {
  return (
    <section className="bg-background py-16 lg:py-24" id="features">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-16 text-center">
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
            Powerfull Features to Elevate
          </h2>
          <h2 className="text-foreground mb-4 text-3xl font-bold md:text-4xl">
            Your Email Experience
          </h2>
          <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
            Our suite of AI-powered tools transforms how professionals manage
            email – enabling smarter communication, better organization, and
            more productive workflows.
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;

            return (
              <Card
                key={index}
                className="group hover:shadow-medium shadow-soft border-0 transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="p-8 text-center">
                  <div
                    className={`mx-auto mb-6 h-16 w-16 rounded-2xl ${feature.bgColor} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon className={`h-8 w-8 ${feature.color}`} />
                  </div>
                  <h3 className="text-foreground mb-4 text-xl font-semibold">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Features;
