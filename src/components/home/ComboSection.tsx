import { img } from "@/lib/data/images";
import { deals } from "@/lib/data/deals";
import { getProductsByCategory, productMap } from "@/lib/data/products";
import { Product } from "@/types";
import { ComboCard, type ComboChoice } from "./ComboCard";

// Server Component: picks the burger/pizza/drink choices here and hands the client
// card only id, name and image for each, instead of the whole menu.
const SOFT_DRINK_IDS = ["dr-cola", "dr-diet-cola", "dr-lemonade", "dr-iced-tea", "dr-water"];

function toChoice({ id, name, image }: Product): ComboChoice {
  return { id, name, image };
}

export function ComboSection() {
  const burgerDeal = deals.find((d) => d.id === "deal-burger-fries-drink");
  const pizzaDeal = deals.find((d) => d.id === "deal-pizza-drink");
  if (!burgerDeal || !pizzaDeal) return null;
  const burgers = getProductsByCategory("burgers").map(toChoice);
  const pizzas = getProductsByCategory("pizza").map(toChoice);
  const softDrinks = SOFT_DRINK_IDS.map((id) => productMap.get(id))
    .filter((p): p is Product => Boolean(p))
    .map(toChoice);

  return (
    <section className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-20 sm:px-8 sm:py-28">
      <ComboCard
        deal={burgerDeal}
        badgeLabel="Best Value"
        heading={<>MAKE IT<br />A COMBO.</>}
        itemLabel="Burger"
        items={burgers}
        drinks={softDrinks}
        extraInclude={{ groupId: "side", groupLabel: "Side", label: "Classic Fries" }}
        gallery={[img.editorialBeef, img.friesClassic, img.drinkMilkshake]}
        category="burgers"
      />
      <ComboCard
        deal={pizzaDeal}
        badgeLabel="Stone-Baked"
        heading={<>PIZZA,<br />YOUR WAY.</>}
        itemLabel="Pizza"
        items={pizzas}
        drinks={softDrinks}
        gallery={[img.pizzaSupreme, img.pizzaMargherita, img.drinkCola]}
        category="pizza"
        reverse
      />
    </section>
  );
}
