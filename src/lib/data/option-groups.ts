import { OptionGroup } from "@/types";

export function withDefault(group: OptionGroup, choiceId: string): OptionGroup {
  return {
    ...group,
    choices: group.choices.map((c) => ({ ...c, default: c.id === choiceId })),
  };
}

export const burgerPatty: OptionGroup = {
  id: "patty",
  label: "Patty",
  type: "single",
  required: true,
  choices: [
    { id: "single", label: "Single Patty", priceDelta: 0, default: true },
    { id: "double", label: "Double Patty", priceDelta: 2.5 },
  ],
};

export const burgerCheese: OptionGroup = {
  id: "cheese",
  label: "Cheese",
  type: "single",
  required: true,
  choices: [
    { id: "cheddar", label: "Classic Cheddar", priceDelta: 0, default: true },
    { id: "swiss", label: "Swiss", priceDelta: 0.5 },
    { id: "pepper-jack", label: "Pepper Jack", priceDelta: 0.5 },
    { id: "none", label: "No Cheese", priceDelta: 0 },
  ],
};

export const burgerSauce: OptionGroup = {
  id: "sauce",
  label: "Sauce",
  type: "single",
  required: true,
  choices: [
    { id: "signature", label: "Signature Sauce", priceDelta: 0, default: true },
    { id: "spicy-mayo", label: "Spicy Mayo", priceDelta: 0 },
    { id: "bbq", label: "Smoky BBQ", priceDelta: 0 },
    { id: "garlic-aioli", label: "Garlic Aioli", priceDelta: 0 },
    { id: "ketchup", label: "Ketchup", priceDelta: 0 },
  ],
};

export const burgerExtras: OptionGroup = {
  id: "extras",
  label: "Extras",
  type: "multi",
  choices: [
    { id: "bacon", label: "Crispy Bacon", priceDelta: 1.5 },
    { id: "jalapenos", label: "Jalapeños", priceDelta: 0.75 },
    { id: "extra-cheese", label: "Extra Cheese", priceDelta: 1.0 },
    { id: "extra-patty", label: "Extra Patty", priceDelta: 2.5 },
    { id: "pickles", label: "Pickles", priceDelta: 0 },
    { id: "onions", label: "Onions", priceDelta: 0 },
    { id: "no-lettuce", label: "No Lettuce", priceDelta: 0 },
  ],
};

export const pizzaSize: OptionGroup = {
  id: "size",
  label: "Size",
  type: "single",
  required: true,
  choices: [
    { id: "small", label: 'Small · 10"', priceDelta: 0, default: true },
    { id: "medium", label: 'Medium · 12"', priceDelta: 3.0 },
    { id: "large", label: 'Large · 14"', priceDelta: 6.0 },
  ],
};

export const pizzaCrust: OptionGroup = {
  id: "crust",
  label: "Crust",
  type: "single",
  required: true,
  choices: [
    { id: "classic", label: "Classic Hand-Tossed", priceDelta: 0, default: true },
    { id: "thin", label: "Thin & Crispy", priceDelta: 0 },
    { id: "stuffed", label: "Cheese-Stuffed", priceDelta: 2.5 },
  ],
};

export const pizzaToppings: OptionGroup = {
  id: "toppings",
  label: "Extra Toppings",
  type: "multi",
  choices: [
    { id: "extra-cheese", label: "Extra Cheese", priceDelta: 1.5 },
    { id: "jalapenos", label: "Jalapeños", priceDelta: 1.0 },
    { id: "olives", label: "Olives", priceDelta: 1.0 },
    { id: "mushrooms", label: "Mushrooms", priceDelta: 1.0 },
    { id: "chicken", label: "Grilled Chicken", priceDelta: 2.5 },
    { id: "pepperoni", label: "Pepperoni", priceDelta: 2.0 },
  ],
};

export const chickenSauce: OptionGroup = {
  id: "sauce",
  label: "Sauce",
  type: "single",
  required: true,
  choices: [
    { id: "original", label: "Original", priceDelta: 0, default: true },
    { id: "honey-hot", label: "Honey Hot", priceDelta: 0 },
    { id: "bbq", label: "Smoky BBQ", priceDelta: 0 },
    { id: "buffalo", label: "Buffalo", priceDelta: 0 },
  ],
};

export const spiceLevel: OptionGroup = {
  id: "spice-level",
  label: "Spice Level",
  type: "single",
  required: true,
  choices: [
    { id: "mild", label: "Mild", priceDelta: 0, default: true },
    { id: "medium", label: "Medium", priceDelta: 0 },
    { id: "hot", label: "Hot", priceDelta: 0 },
    { id: "fire", label: "Ember Fire 🔥", priceDelta: 0 },
  ],
};

export const dippingSauce: OptionGroup = {
  id: "dip",
  label: "Dipping Sauce",
  type: "multi",
  max: 2,
  choices: [
    { id: "ranch", label: "Ranch", priceDelta: 0.5 },
    { id: "bbq", label: "BBQ", priceDelta: 0.5 },
    { id: "garlic-aioli", label: "Garlic Aioli", priceDelta: 0.5 },
    { id: "honey-mustard", label: "Honey Mustard", priceDelta: 0.5 },
  ],
};

export const drinkSize: OptionGroup = {
  id: "size",
  label: "Size",
  type: "single",
  required: true,
  choices: [
    { id: "small", label: "Small", priceDelta: 0, default: true },
    { id: "medium", label: "Medium", priceDelta: 0.6 },
    { id: "large", label: "Large", priceDelta: 1.1 },
  ],
};

export const sideDip: OptionGroup = {
  id: "dip",
  label: "Dipping Sauce",
  type: "multi",
  max: 2,
  choices: [
    { id: "ketchup", label: "Ketchup", priceDelta: 0 },
    { id: "garlic-aioli", label: "Garlic Aioli", priceDelta: 0.5 },
    { id: "bbq", label: "BBQ", priceDelta: 0.5 },
    { id: "spicy-mayo", label: "Spicy Mayo", priceDelta: 0.5 },
  ],
};

export const wrapExtras: OptionGroup = {
  id: "extras",
  label: "Extras",
  type: "multi",
  choices: [
    { id: "extra-chicken", label: "Extra Chicken", priceDelta: 2.0 },
    { id: "cheese", label: "Add Cheese", priceDelta: 0.75 },
    { id: "jalapenos", label: "Jalapeños", priceDelta: 0.5 },
    { id: "avocado", label: "Avocado", priceDelta: 1.25 },
  ],
};

export const dessertAddons: OptionGroup = {
  id: "addons",
  label: "Add-ons",
  type: "multi",
  choices: [
    { id: "whipped-cream", label: "Whipped Cream", priceDelta: 0.5 },
    { id: "choc-drizzle", label: "Chocolate Drizzle", priceDelta: 0.5 },
    { id: "sprinkles", label: "Sprinkles", priceDelta: 0.3 },
  ],
};
