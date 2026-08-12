import { normalizeItemName } from "@/lib/utils";

/**
 * Built-in grocery catalogue for type-ahead suggestions (no DB needed).
 * Powers autocomplete BEFORE a household has any purchase history — merged
 * with the household's own products at query time.
 *
 * `store` is a *hint* matching a default seeded store name; at pick time it is
 * mapped to that household's store id when the name matches, otherwise ignored.
 * Leave `store` off for generic staples so we don't force a store.
 *
 * This is intentionally a curated common-item list (Woolworths / Coles / Aldi
 * staples + fresh produce + Indian grocery + bakery), not a full store
 * inventory. Add/trim freely — it's just config.
 */
export type CatalogStore =
  | "Woolworths"
  | "Coles"
  | "Aldi"
  | "Indian Shop"
  | "Veggie Shop"
  | "Punjab Bakery"
  | "Bunnings";

export type CatalogItem = { name: string; store?: CatalogStore };

// Fresh produce -> Veggie Shop
const PRODUCE: CatalogItem[] = [
  "Tomatoes",
  "Onions",
  "Red onions",
  "Potatoes",
  "Sweet potato",
  "Garlic",
  "Ginger",
  "Green chilli",
  "Coriander",
  "Mint",
  "Curry leaves",
  "Spinach",
  "Baby spinach",
  "Lettuce",
  "Cucumber",
  "Carrots",
  "Capsicum",
  "Broccoli",
  "Cauliflower",
  "Cabbage",
  "Zucchini",
  "Eggplant",
  "Okra",
  "Green beans",
  "Peas",
  "Corn",
  "Mushrooms",
  "Celery",
  "Pumpkin",
  "Bananas",
  "Apples",
  "Oranges",
  "Lemons",
  "Limes",
  "Grapes",
  "Strawberries",
  "Blueberries",
  "Mango",
  "Avocado",
  "Watermelon",
  "Pineapple",
  "Kiwi fruit",
  "Pears",
  "Spring onion",
  "Fresh chilli",
].map((name) => ({ name, store: "Veggie Shop" as const }));

// Indian grocery -> Indian Shop
const INDIAN: CatalogItem[] = [
  "Atta",
  "Atta 10kg",
  "Basmati rice",
  "Basmati rice 5kg",
  "Toor dal",
  "Chana dal",
  "Moong dal",
  "Masoor dal",
  "Urad dal",
  "Rajma",
  "Chickpeas",
  "Kabuli chana",
  "Besan",
  "Poha",
  "Semolina (sooji)",
  "Turmeric powder",
  "Red chilli powder",
  "Coriander powder",
  "Cumin seeds",
  "Cumin powder",
  "Garam masala",
  "Mustard seeds",
  "Fenugreek seeds",
  "Fennel seeds",
  "Cardamom",
  "Cloves",
  "Cinnamon",
  "Bay leaves",
  "Asafoetida (hing)",
  "Kasuri methi",
  "Tamarind",
  "Jaggery",
  "Ghee",
  "Paneer",
  "Papad",
  "Pickle (achaar)",
  "Ginger garlic paste",
  "Mustard oil",
  "Coconut (dry)",
  "Cashews",
  "Almonds",
  "Raisins",
  "Idli rice",
  "Dosa batter",
].map((name) => ({ name, store: "Indian Shop" as const }));

// Bakery -> Punjab Bakery
const BAKERY: CatalogItem[] = [
  "Roti",
  "Naan",
  "Paratha",
  "Samosa",
  "Bread",
  "Multigrain bread",
  "Buns",
  "Rusk",
  "Biscuits",
].map((name) => ({ name, store: "Punjab Bakery" as const }));

// Generic staples -> no forced store
const STAPLES: CatalogItem[] = [
  "Milk",
  "Milk 2L",
  "Milk 3L",
  "Full cream milk",
  "Lite milk",
  "Almond milk",
  "Soy milk",
  "Eggs",
  "Butter",
  "Cheese",
  "Tasty cheese",
  "Cream cheese",
  "Yoghurt",
  "Greek yoghurt",
  "Cream",
  "Sour cream",
  "Sliced bread",
  "Wholemeal bread",
  "Wraps",
  "Sugar",
  "Brown sugar",
  "Salt",
  "Plain flour",
  "Self raising flour",
  "Rice",
  "Pasta",
  "Spaghetti",
  "Noodles",
  "Instant noodles",
  "Oats",
  "Weet-Bix",
  "Cereal",
  "Cornflakes",
  "Muesli",
  "Tea bags",
  "Coffee",
  "Instant coffee",
  "Honey",
  "Jam",
  "Peanut butter",
  "Vegemite",
  "Nutella",
  "Cooking oil",
  "Olive oil",
  "Vegetable oil",
  "Canola oil",
  "Vinegar",
  "Soy sauce",
  "Tomato sauce",
  "Ketchup",
  "Mayonnaise",
  "Mustard",
  "Baked beans",
  "Canned tomatoes",
  "Canned chickpeas",
  "Coconut milk",
  "Stock cubes",
  "Chicken",
  "Chicken breast",
  "Chicken thigh",
  "Mince",
  "Beef mince",
  "Lamb",
  "Fish",
  "Salmon",
  "Prawns",
  "Bacon",
  "Sausages",
  "Ham",
  "Tofu",
  "Frozen peas",
  "Frozen vegetables",
  "Ice cream",
  "Frozen chips",
  "Pizza",
  "Chocolate",
  "Chips",
  "Crackers",
  "Nuts",
  "Dried fruit",
  "Water bottles",
  "Sparkling water",
  "Juice",
  "Orange juice",
  "Soft drink",
  "Coke",
  "Lemonade",
  // Household & personal (still often on the grocery run)
  "Toilet paper",
  "Paper towel",
  "Tissues",
  "Dishwashing liquid",
  "Dishwasher tablets",
  "Laundry powder",
  "Laundry liquid",
  "Fabric softener",
  "Surface spray",
  "Bin bags",
  "Cling wrap",
  "Foil",
  "Baking paper",
  "Hand wash",
  "Soap",
  "Shampoo",
  "Conditioner",
  "Toothpaste",
  "Toothbrush",
  "Deodorant",
  "Shaving cream",
  "Sanitary pads",
  "Nappies",
  "Baby wipes",
  "Sunscreen",
  "Batteries",
  "Light globe",
].map((name) => ({ name }));

export const GROCERY_CATALOG: CatalogItem[] = [
  ...STAPLES,
  ...PRODUCE,
  ...INDIAN,
  ...BAKERY,
];

// Precompute normalized names once.
const NORMALIZED: { item: CatalogItem; norm: string }[] = GROCERY_CATALOG.map(
  (item) => ({ item, norm: normalizeItemName(item.name) }),
);

/**
 * Case-insensitive catalogue lookup. Prefix matches rank ahead of substring
 * matches. Pure + synchronous so it can run client-side with no round-trip.
 */
export function searchCatalog(query: string, limit = 8): CatalogItem[] {
  const q = normalizeItemName(query);
  if (!q) return [];
  const prefix: CatalogItem[] = [];
  const substr: CatalogItem[] = [];
  for (const { item, norm } of NORMALIZED) {
    if (norm.startsWith(q)) prefix.push(item);
    else if (norm.includes(q)) substr.push(item);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...substr].slice(0, limit);
}
