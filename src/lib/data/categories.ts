import { Category } from "@/types";
import { img } from "./images";

export const categories: Category[] = [
  {
    id: "burgers",
    name: "Burgers",
    image: img.tileBurgers,
    description: "Smashed, stacked, always juicy.",
  },
  {
    id: "pizza",
    name: "Pizza",
    image: img.tilePizza,
    description: "Stone-baked, loaded, fresh out the oven.",
  },
  {
    id: "chicken",
    name: "Chicken",
    image: img.tileChicken,
    description: "Crispy on the outside, juicy inside.",
  },
  {
    id: "wraps",
    name: "Wraps",
    image: img.tileWraps,
    description: "Rolled tight, packed with flavor.",
  },
  {
    id: "sandwiches",
    name: "Sandwiches",
    image: img.tileSandwiches,
    description: "Stacked high, built to order.",
  },
  {
    id: "sides",
    name: "Sides",
    image: img.tileSides,
    description: "Golden, crispy, extremely shareable.",
  },
  {
    id: "desserts",
    name: "Desserts",
    image: img.tileDesserts,
    description: "Sweet endings, made for sharing (or not).",
  },
  {
    id: "drinks",
    name: "Drinks",
    image: img.tileDrinks,
    description: "Ice cold, thick shakes, zero warm sips.",
  },
];

export const categoryMap = new Map(categories.map((c) => [c.id, c]));
