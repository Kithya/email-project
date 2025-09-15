import Image from "next/image";
import React from "react";
import { Button } from "~/components/ui/button";
import hightlight from "../../../../public/highlight.png";

const Hero = () => {
  return (
    <section className="bg-gradient-hero pt-20 pb-16 lg:pt-32 lg:pb-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-6 text-4xl leading-tight font-bold text-[#377BB7] md:text-5xl lg:text-6xl">
            Effortless Email Management
          </h1>

          <p className="text-muted-foreground mx-auto mb-8 max-w-2xl text-3xl leading-relaxed md:text-2xl">
            AI Email Assistant for the Modern Workspace
          </p>

          <p className="text-muted-foreground mx-auto mb-10 max-w-xl text-base">
            Streamline your email workflow with intelligent automation, smart
            replies, and powerful organization tools designed for busy
            professionals.
          </p>

          <div className="bg-background/80 mx-auto mb-6 max-w-5xl rounded-2xl border p-3 shadow-sm">
            {/* simple fake window top bar */}
            <div className="text-muted-foreground flex items-center gap-2 px-3 py-2 text-xs">
              <span className="h-3 w-3 rounded-full bg-red-400/70" />
              <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
              <span className="h-3 w-3 rounded-full bg-green-400/70" />
              <div className="ml-3 flex h-6 flex-1 items-center rounded-md border px-2">
                Search documentation…
              </div>
              <div className="ml-2">☀︎</div>
              <div className="ml-2">⚙︎</div>
            </div>
            <Image
              src={hightlight}
              alt="App screenshot"
              width={1600}
              height={900}
              priority
              className="h-auto w-full"
            />
          </div>

          <div className="mb-16 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size={"lg"}
              className="rounded-4xl p-7 text-lg font-semibold"
            >
              Start For Free
            </Button>
            <Button
              variant={"outline"}
              size={"lg"}
              className="px-8 py-3 text-lg font-semibold"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
