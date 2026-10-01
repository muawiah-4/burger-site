import { Hero } from "@/components/home/Hero";
import { OrderingBar } from "@/components/home/OrderingBar";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { BestSellers } from "@/components/home/BestSellers";
import { DealsSection } from "@/components/home/DealsSection";
import { About } from "@/components/home/About";
import { Reviews } from "@/components/home/Reviews";
import { LocationFinder } from "@/components/home/LocationFinder";
import { AppPromo } from "@/components/home/AppPromo";

// Eight blocks: hero (+ ordering bar), categories, best sellers, deals & combos,
// about + how it works, reviews, locations, app + newsletter.
export default function Home() {
  return (
    <>
      <Hero />
      <OrderingBar />
      <CategoryGrid />
      <BestSellers />
      <DealsSection />
      <About />
      <Reviews />
      <LocationFinder />
      <AppPromo />
    </>
  );
}
