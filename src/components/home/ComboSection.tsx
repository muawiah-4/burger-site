import { img } from "@/lib/data/images";
import { deals } from "@/lib/data/deals";
import { getProductsByCategory, productMap } from "@/lib/data/products";
import { Product } from "@/types";
import { type ComboChoice } from "./ComboCard";
import { ComboBuilder } from "./ComboBuilder";

// Server Component: picks the burger/pizza/drink choices here and hands the client
// card only id, name and image for each, instead of the whole menu.
const SOFT_DRINK_IDS = ["dr-cola", "dr-diet-cola", "dr-lemonade", "dr-iced-tea", "dr-water"];

function toChoice({ id, name, image }: Product): ComboChoice {
  return { id, name, image };
}

/** The combo builder that sits at the top of the Deals section. */
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
    <ComboBuilder
      combos={[
        {
          key: "burger",
          tabLabel: "Burger combo",
          card: {
          deal: burgerDeal,
          badgeLabel: "Best value",
          heading: "Make it a combo",
          itemLabel: "Burger",
          items: burgers,
          drinks: softDrinks,
          extraInclude: { groupId: "side", groupLabel: "Side", label: "Classic Fries" },
          gallery: [img.editorialBeef, img.friesClassic, img.drinkMilkshake],
          category: "burgers",
          },
        },
        {
          key: "pizza",
          tabLabel: "Pizza combo",
          card: {
          deal: pizzaDeal,
          badgeLabel: "Stone-baked",
          heading: "Pizza, your way",
          itemLabel: "Pizza",
          items: pizzas,
          drinks: softDrinks,
          gallery: [img.pizzaSupreme, img.pizzaMargherita, img.drinkCola],
          category: "pizza",
          },
        },
      ]}
    />
  );
}
