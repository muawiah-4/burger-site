import { Allergen } from "@/types";

export const ALLERGENS: { id: Allergen; label: string }[] = [
  { id: "gluten", label: "Gluten" },
  { id: "dairy", label: "Dairy" },
  { id: "egg", label: "Egg" },
  { id: "soy", label: "Soy" },
  { id: "sesame", label: "Sesame" },
  { id: "nuts", label: "Nuts" },
];

export function allergenLabel(id: Allergen): string {
  return ALLERGENS.find((a) => a.id === id)?.label ?? id;
}
