export const CATEGORIES = [
  "garbage",
  "containers",
  "air-pollution",
  "vegetation",
  "light",
  "trees",
  "animals",
  "parking",
  "sidewalk-obstacle",
  "road-obstacle",
  "beach-hazard",
  "safety",
  "signs",
  "traffic-lights",
  "drainage",
  "playgrounds",
  "pests",
  "business-issues"
] as const;

export type Category = typeof CATEGORIES[number];

// Optional: map category to an icon file you’ll put in /public/icons
export const CATEGORY_ICONS: Record<Category, string> = {
    garbage: "/icons/garbage.png",
    light: "/icons/light.png",
    trees: "/icons/trees.png",
    containers: "",
    "air-pollution": "",
    vegetation: "",
    animals: "",
    parking: "",
    "sidewalk-obstacle": "",
    "road-obstacle": "",
    "beach-hazard": "",
    safety: "",
    signs: "",
    "traffic-lights": "",
    drainage: "",
    playgrounds: "",
    pests: "",
    "business-issues": ""
};
