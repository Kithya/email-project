import FAQ from "./_components/faq";
import Features from "./_components/features";
import Footer from "./_components/footer";
import Heading from "./_components/heading";
import Hero from "./_components/hero";
import Pricing from "./_components/pricing";

export default function Home() {
  return (
    <main>
      <Heading />
      <Hero />
      <Features />
      <Pricing />
      <FAQ />
      <Footer />
    </main>
  );
}
