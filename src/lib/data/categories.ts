import { Category } from "@/types";
import { img } from "./images";

export const categories: Category[] = [
  {
    id: "burgers",
    name: "Burgers",
    image: img.burgerClassic,
    description: "Smashed, stacked, always juicy.",
  },
  {
    id: "pizza",
    name: "Pizza",
    image: img.pizzaPepperoni,
    description: "Stone-baked, loaded, fresh out the oven.",
  },
  {
    id: "chicken",
    name: "Chicken",
    image: img.chickenFried,
    description: "Crispy on the outside, juicy inside.",
  },
  {
    id: "wraps",
    name: "Wraps",
    image: img.wrap,
    description: "Rolled tight, packed with flavor.",
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    image: img.sandwichClub,
    description: "Stacked high, built to order.",
  },
  {
    id: "sides",
    name: "Sides",
    image: img.friesLoaded,
    description: "Golden, crispy, extremely shareable.",
  },
  {
    id: "desserts",
    name: "Desserts",
    image: img.dessertBrownie,
    description: "Sweet endings, made for sharing (or not).",
  },
  {
    id: "drinks",
    name: "Drinks",
    image: img.drinkMilkshake,
    description: "Ice cold, thick shakes, zero warm sips.",
  },
];

export const categoryMap = new Map(categories.map((c) => [c.id, c]));
