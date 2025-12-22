export const CATEGORIES = [
  "garbage",
  "lighting",
  "tree",
  "hazard",
  "animal",
  "maintenance",
  "pest"
] as const;

export type Category = typeof CATEGORIES[number];

// Optional: map category to an icon file you’ll put in /public/icons
export const CATEGORY_LABELS: Record<Category, string> = {
  garbage: "Garbage",
  lighting: "Lighting",
  tree: "Tree",
  hazard: "Hazard",
  animal: "Animal",
  maintenance: "Maintenance",
  pest: "Pest"
};
