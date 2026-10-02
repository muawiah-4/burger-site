import { Deal } from "@/types";
import { img } from "./images";

export const deals: Deal[] = [
  {
    id: "deal-2for1",
    slug: "2-for-1-burgers",
    name: "2 for 1 Burgers",
    description: "Two Classic Smash Burgers for the price of one. Bring a friend or don't.",
    includes: ["2x Classic Smash Burger"],
    image: img.dealTwoForOne,
    originalPrice: 16.98,
    price: 8.49,
    ctaLabel: "Double up",
  },
  {
    id: "deal-couples",
    slug: "couples-combo",
    name: "Couple's Combo",
    description: "Two burgers, two fries, two drinks. Date night, sorted.",
    includes: ["2x Any Burger", "2x Fries", "2x Drink"],
    image: img.dealCouples,
    originalPrice: 34.5,
    price: 26.99,
    ctaLabel: "Split it two ways",
  },
  {
    id: "deal-family-feast",
    slug: "family-feast",
    name: "Family Feast",
    description: "2 Burgers, 1 Large Pizza, 2 Fries, 4 Drinks. Feeds the whole crew.",
    includes: ["2x Burgers", "1x Large Pizza", "2x Fries", "4x Drinks"],
    image: img.dealFamilyFeast,
    originalPrice: 49.99,
    price: 39.99,
    ctaLabel: "Bring the feast",
  },
  {
    id: "deal-pizza-sides",
    slug: "pizza-and-sides",
    name: "Pizza + Sides",
    description: "Any medium pizza with two sides of your choice.",
    includes: ["1x Medium Pizza", "2x Any Side"],
    image: img.dealPizzaSides,
    originalPrice: 24.47,
    price: 18.99,
    ctaLabel: "Load the table",
  },
  {
    id: "deal-burger-fries-drink",
    slug: "burger-fries-drink",
    name: "Burger + Fries + Drink",
    description: "The essential combo. Any burger, classic fries, any drink.",
    includes: ["1x Any Burger", "1x Classic Fries", "1x Drink"],
    image: img.editorialBeef,
    originalPrice: 15.47,
    price: 11.99,
    ctaLabel: "Build my combo",
  },
  {
    id: "deal-pizza-drink",
    slug: "pizza-and-drink",
    name: "Pizza + Drink",
    description: "Any pizza, stone-baked to order, with a soft drink of your choice.",
    includes: ["1x Any Pizza", "1x Soft Drink"],
    image: img.pizzaPepperoni,
    originalPrice: 16.98,
    price: 13.99,
    ctaLabel: "Build my combo",
  },
  {
    id: "deal-chicken-bucket",
    slug: "chicken-bucket",
    name: "Chicken Bucket",
    description: "12-piece mixed wings and tenders with 3 dipping sauces.",
    includes: ["8x Wings", "4x Tenders", "3x Dipping Sauce"],
    image: img.dealChickenBucket,
    originalPrice: 28.99,
    price: 22.99,
    ctaLabel: "Get the bucket",
  },
  {
    id: "deal-party-box",
    slug: "party-box",
    name: "Party Box",
    description: "4 burgers, 2 large fries, 8-pc nuggets, 4 drinks. Built for the group chat.",
    includes: ["4x Burgers", "2x Large Fries", "8pc Nuggets", "4x Drinks"],
    image: img.dealPartyBox,
    originalPrice: 58.0,
    price: 44.99,
    ctaLabel: "Feed the squad",
  },
];

/**
 * Drinks offered in the build-your-own combos (ComboSection). The server prices
 * and validates combo choices against this list; ComboSection keeps its own copy
 * for now, so keep the two in sync.
 */
export const COMBO_SOFT_DRINK_IDS = ["dr-cola", "dr-diet-cola", "dr-lemonade", "dr-iced-tea", "dr-water"] as const;
