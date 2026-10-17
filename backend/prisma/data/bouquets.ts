/**
 * BloomNest ready-made bouquet catalogue — demonstration data.
 * -----------------------------------------------------------
 * A bouquet is a *recipe* over loose stems: the recipe is what makes it
 * in-stock, and it is what the warehouse deducts at checkout. Prices are
 * therefore derived at seed time from the live per-stem prices
 * (stems × family multiplier + packing, rounded to a ₹…99 retail price)
 * instead of being hard-coded and drifting out of sync with the stems.
 *
 * `recipe` keys are flower NAMES from data/flowers.ts — resolved by the seed
 * script into ids, so renaming a slug never silently breaks a bouquet.
 */

export interface SeedBouquet {
  slug: string;
  name: string;
  description: string;
  /** flower name → stems. Names must exist in the flower catalogue. */
  recipe: Record<string, number>;
  /** Multiplier applied to the raw stem cost before packing is added. */
  margin: number;
  /** Packing + hand-tying charge in rupees. */
  packingRupees: number;
  occasion: string;
}

export const BOUQUETS: SeedBouquet[] = [
  {
    slug: "blush-romance", name: "Blush Romance", margin: 1.35, packingRupees: 150, occasion: "Anniversary",
    description: "Twelve red and blush roses with two pink oriental lilies, hand-tied in blush tissue and finished with satin ribbon. Our most-ordered anniversary bouquet.",
    recipe: { "Red Hybrid Tea Rose": 6, "Pink Rose 'Tineke'": 6, "Pink Oriental Lily": 2 },
  },
  {
    slug: "dozen-red-roses", name: "A Dozen Red Roses", margin: 1.25, packingRupees: 120, occasion: "Romance",
    description: "Twelve long-stem red hybrid teas, wrapped simply in kraft with jute twine — the gesture that never needs explaining.",
    recipe: { "Red Hybrid Tea Rose": 12 },
  },
  {
    slug: "twenty-five-red-roses", name: "Twenty-Five Red Roses", margin: 1.22, packingRupees: 250, occasion: "Proposal",
    description: "Twenty-five velvety red roses in a deep cone wrap with a burgundy satin bow. Ordered more than once a week, every week.",
    recipe: { "Red Hybrid Tea Rose": 25 },
  },
  {
    slug: "fifty-rose-grand", name: "Fifty Rose Grand", margin: 1.2, packingRupees: 450, occasion: "Grand gesture",
    description: "Fifty mixed roses — red, blush and peach — in a full roundel of cream and kraft paper. Made to be carried down a corridor.",
    recipe: { "Red Hybrid Tea Rose": 20, "Pink Rose 'Tineke'": 15, "Peach Sprung Rose": 15 },
  },
  {
    slug: "sunrise-delight", name: "Sunrise Delight", margin: 1.4, packingRupees: 130, occasion: "Birthday",
    description: "Sunflowers, orange gerberas and marigolds bundled like an Indian morning — bright, auspicious and unapologetically cheerful.",
    recipe: { "Classic Sunflower": 4, "Orange Genda Marigold": 10, "Orange Gerbera": 5 },
  },
  {
    slug: "orchid-elegance", name: "Orchid Elegance", margin: 1.3, packingRupees: 300, occasion: "Luxury",
    description: "Purple phalaenopsis and white dendrobium sprays with rajnigandha, wrapped in lilac. A statement for someone you are trying to impress.",
    recipe: { "Purple Phalaenopsis Stem": 2, "White Dendrobium Spray": 5, "Rajnigandha Tuberose": 6 },
  },
  {
    slug: "carnation-comfort", name: "Carnation Comfort", margin: 1.42, packingRupees: 120, occasion: "Get well",
    description: "Pink carnations, white chrysanthemums and roses — soft, long-lasting and unscented enough for a hospital room.",
    recipe: { "Pink Carnation": 10, "White Chrysanthemum": 6, "Pink Rose 'Tineke'": 4 },
  },
  {
    slug: "royal-white", name: "Royal White", margin: 1.32, packingRupees: 220, occasion: "Wedding",
    description: "An all-white arrangement of roses, asiatic lilies, tuberose and ruscus — serene, sophisticated and photography-ready.",
    recipe: { "White Avalanche Rose": 8, "White Asiatic Lily": 3, "Rajnigandha Tuberose": 6, "Ruscus Bunch": 3 },
  },
  {
    slug: "gerbera-cheer", name: "Gerbera Cheer", margin: 1.38, packingRupees: 110, occasion: "Just because",
    description: "A vibrant burst of orange and pink gerberas with mini sunflowers — guaranteed to make someone smile at the door.",
    recipe: { "Orange Gerbera": 6, "Pink Gerbera": 6, "Mini Sunflower 'Ruby Moon'": 3 },
  },
  {
    slug: "garden-party", name: "Garden Party", margin: 1.36, packingRupees: 140, occasion: "Host gift",
    description: "Gerberas, roses and statice in a loose garden-style bunch with jute wrap — the gift that looks foraged, not bought.",
    recipe: { "Orange Gerbera": 4, "Pink Gerbera": 4, "Pink Rose 'Tineke'": 5, "Purple Statice": 3 },
  },
  {
    slug: "pink-blossom", name: "Pink Blossom", margin: 1.34, packingRupees: 150, occasion: "Thank you",
    description: "Pink lilies, carnations and lisianthus layered with baby's breath for a soft, rounded bouquet.",
    recipe: { "Pink Oriental Lily": 2, "Pink Carnation": 8, "Pink Lisianthus Spray": 4, "White Baby's Breath Bunch": 2 },
  },
  {
    slug: "serene-whites", name: "Serene Whites", margin: 1.33, packingRupees: 180, occasion: "Sympathy",
    description: "White roses, lilies and chrysanthemums in a pale grey wrap — respectful, quiet and appropriate for a farewell.",
    recipe: { "White Avalanche Rose": 8, "White Asiatic Lily": 3, "White Chrysanthemum": 6 },
  },
  {
    slug: "purple-dream", name: "Purple Dream", margin: 1.28, packingRupees: 260, occasion: "Luxury",
    description: "Orchids and delphinium with lavender stock, wrapped in slate-grey. Cool-toned and unusual.",
    recipe: { "White Dendrobium Spray": 6, "Blue Delphinium": 2, "Lavender Stock": 4 },
  },
  {
    slug: "festival-gold", name: "Festival Gold", margin: 1.45, packingRupees: 100, occasion: "Festive",
    description: "Marigolds and yellow chrysanthemoms with tuberose — the colours of Diwali and every pooja room in the country.",
    recipe: { "Orange Genda Marigold": 20, "Yellow Chrysanthemum": 6, "Rajnigandha Tuberose": 4 },
  },
  {
    slug: "marigold-torani-mix", name: "Marigold & Mogra String Mix", margin: 1.5, packingRupees: 90, occasion: "Puja",
    description: "Genda, banana marigold and mogra sprigs for stringing at home — a garland kit rather than a bouquet.",
    recipe: { "Orange Genda Marigold": 25, "Banana Marigold": 15, "Mogra (Jasminum sambac)": 10 },
  },
  {
    slug: "tropical-strelitzia", name: "Tropical Strelitzia", margin: 1.25, packingRupees: 240, occasion: "Housewarming",
    description: "Bird of paradise with monstera and palm spears — an arrangement that reads like a resort lobby.",
    recipe: { "Bird of Paradise": 3, "Monstera Leaf": 3, "Palm Spear Leaf": 4 },
  },
  {
    slug: "protea-longlasting", name: "Protea & Dried Longkeeper", margin: 1.3, packingRupees: 200, occasion: "Homework",
    description: "King protea, amaranthus tails and statice in a linen wrap — needs no water and keeps for months.",
    recipe: { "King Protea": 2, "Burgundy Love-Lies-Blinding": 4, "Yellow Statice": 4 },
  },
  {
    slug: "peony-blush", name: "Peony Blush", margin: 1.22, packingRupees: 280, occasion: "Anniversary",
    description: "Coral and Sarah Bernhardt peonies with ranunculus — winter-import blooms while the season lasts.",
    recipe: { "Coral Charm Peony": 4, "Sarah Bernhardt Peony": 3, "Coral Ranunculus": 4 },
  },
  {
    slug: "anthurium-modern", name: "Modern Anthurium", margin: 1.36, packingRupees: 160, occasion: "Corporate",
    description: "Red anthuriums and calla lilies with leather leaf — architectural, symmetrical and safe for a reception desk.",
    recipe: { "Red Anthurium": 6, "White Calla Lily": 3, "Leather Leaf Fern": 4 },
  },
  {
    slug: "lotus-offering", name: "Lotus Offering", margin: 1.4, packingRupees: 110, occasion: "Puja",
    description: "Three open pink lotus with buds and a leaf, tied in a banana-leaf cone for the prayer corner.",
    recipe: { "Pink Lotus": 3, "Lotus Bud with Leaf": 5 },
  },
  {
    slug: "sunflower-honey", name: "Sunflower & Honey", margin: 1.35, packingRupees: 140, occasion: "Congratulations",
    description: "Pollen-less sunflowers, yellow gerberas and alstroemeria with a jar of the farm's honey — not included, not extra, just honest.",
    recipe: { "Pollen-less Sunflower": 4, "Yellow Gerbera": 6, "Orange Alstroemeria": 4 },
  },
  {
    slug: "jasmine-evening", name: "Evening Jasmine", margin: 1.45, packingRupees: 100, occasion: "For mother",
    description: "Mogra, chameli and jui buds packed in damp moss so they open on the way — fragrant, not showy.",
    recipe: { "Mogra (Jasminum sambac)": 12, "Chameli (Jasminum pubescens)": 10, "Motia Bud Sprig": 6 },
  },
  {
    slug: "wildflower-meadow", name: "Wildflower Meadow", margin: 1.4, packingRupees: 130, occasion: "Just because",
    description: "Zinnias, asters, cosmos-coloured celosia and snapdragon — the loose, slightly untidy look everyone asks for now.",
    recipe: { "Scarlet Zinnia": 6, "Lilac Zinnia": 5, "Purple Aster Spray": 5, "Yellow Snapdragon": 3, "Red Coxcomb Celosia": 3 },
  },
  {
    slug: "mixed-border-value", name: "Mixed Border (Value Bunch)", margin: 1.5, packingRupees: 80, occasion: "Everyday",
    description: "Whatever the farm cut best, in a paper cone: chrysanthemums, carnations, gerbera and greenery. Best value in the shop.",
    recipe: { "Yellow Chrysanthemum": 5, "Pink Carnation": 5, "Pink Gerbera": 4, "White Baby's Breath Bunch": 1, "Tie-Leaf / Aspidistra": 2 },
  },
];
