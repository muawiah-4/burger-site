import { Hero } from "@/components/home/Hero";
import { OrderingBar } from "@/components/home/OrderingBar";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { BestSellers } from "@/components/home/BestSellers";
import { DealsSection } from "@/components/home/DealsSection";
import { ComboSection } from "@/components/home/ComboSection";
import { About } from "@/components/home/About";
import { HowItWorks } from "@/components/home/HowItWorks";
import { Reviews } from "@/components/home/Reviews";
import { LocationFinder } from "@/components/home/LocationFinder";
import { AppPromo } from "@/components/home/AppPromo";
import { Newsletter } from "@/components/home/Newsletter";

export default function Home() {
  return (
    <>
      <Hero />
      <OrderingBar />
      <CategoryGrid />
      <BestSellers />
      <DealsSection />
      <ComboSection />
      <About />
      <HowItWorks />
      <Reviews />
      <LocationFinder />
      <AppPromo />
      <Newsletter />
    </>
  );
}
