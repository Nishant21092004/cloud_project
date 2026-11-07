/**
 * BloomNest seed — realistic demonstration data (all editable).
 * Prices are INTEGER PAISE (₹1 = 100 paise).
 * Idempotent: safe to re-run; never touches orders or real users.
 * Run:  npm run seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const FLOWERS = [
  { slug: "rose-red", name: "Desi Red Rose", colorHex: "#c8102e", pricePerStemPaise: 3000, stockStems: 200, description: "The classic Indian gift flower — deep red Nathdwara roses with a strong, sweet fragrance. Sold per stem." },
  { slug: "rose-pink", name: "Pink Rose", colorHex: "#e56b8c", pricePerStemPaise: 3500, stockStems: 150, description: "Soft pink roses from Hosur farms. Gentle, romantic and perfect for mixing with lilies." },
  { slug: "rose-white", name: "White Rose", colorHex: "#f4efe2", pricePerStemPaise: 4000, stockStems: 120, description: "Pure white roses symbolising new beginnings — popular for weddings, sympathies and elegant bouquets." },
  { slug: "rose-yellow", name: "Yellow Rose", colorHex: "#f6d55c", pricePerStemPaise: 3500, stockStems: 120, description: "Sunny yellow roses with a light tea fragrance. A cheerful way to say thanks or congratulations." },
  { slug: "rose-orange", name: "Orange Rose", colorHex: "#f39c6b", pricePerStemPaise: 3500, stockStems: 90, description: "Warm orange roses that glow like a sunset — bold, festive and long-lasting." },
  { slug: "rose-peach", name: "Peach Rose", colorHex: "#f8c8a0", pricePerStemPaise: 3800, stockStems: 100, description: "Creamy peach roses with blush edges. Soft, elegant and a favourite for weddings." },
  { slug: "rose-lavender", name: "Lavender Rose", colorHex: "#b9a3d1", pricePerStemPaise: 4200, stockStems: 80, description: "Rare lavender roses with a gentle sweet scent. Subtle, romantic and a little unexpected." },
  { slug: "lily-white", name: "White Asiatic Lily", colorHex: "#fdfbf2", pricePerStemPaise: 8000, stockStems: 80, description: "Large trumpet-shaped white lilies. One stem carries 3–5 blooms and perfumes the whole room." },
  { slug: "lily-pink", name: "Oriental Pink Lily", colorHex: "#f2a7c3", pricePerStemPaise: 9000, stockStems: 60, description: "Showy pink Oriental lily with speckled petals and a rich fragrance. A premium bouquet centrepiece." },
  { slug: "lily-orange", name: "Orange Asiatic Lily", colorHex: "#f5a623", pricePerStemPaise: 8500, stockStems: 50, description: "Tall orange Asiatic lilies with dark freckles. Each stem opens 3–5 blooms over a week." },
  { slug: "lily-yellow", name: "Yellow Asiatic Lily", colorHex: "#f7e26b", pricePerStemPaise: 8500, stockStems: 45, description: "Bright yellow Asiatic lilies that bring instant sunshine to any vase." },
  { slug: "lily-stargazer", name: "Stargazer Lily", colorHex: "#e75480", pricePerStemPaise: 12000, stockStems: 35, description: "The famous Stargazer — huge pink-and-white blooms with a heady perfume. A true statement flower." },
  { slug: "orchid-purple", name: "Purple Orchid", colorHex: "#9b59b6", pricePerStemPaise: 12000, stockStems: 40, description: "Exotic purple Phalaenopsis stems from Thailand-grown stock. Long-lasting and effortlessly luxurious." },
  { slug: "orchid-pink", name: "Pink Orchid", colorHex: "#f49ac2", pricePerStemPaise: 11000, stockStems: 35, description: "Pink Phalaenopsis sprays with graceful arching stems. Lasts weeks in a cool room." },
  { slug: "orchid-white", name: "White Orchid", colorHex: "#fdfcf7", pricePerStemPaise: 11500, stockStems: 30, description: "Pure white Phalaenopsis orchids — minimal, bridal and effortlessly elegant." },
  { slug: "carnation-pink", name: "Pink Carnation", colorHex: "#e78fb3", pricePerStemPaise: 2500, stockStems: 180, description: "Ruffled pink carnations that stay fresh for up to two weeks. Great value filler with body." },
  { slug: "carnation-red", name: "Red Carnation", colorHex: "#c0392b", pricePerStemPaise: 2500, stockStems: 160, description: "Classic red carnations with ruffled petals. The traditional flower for respect and admiration." },
  { slug: "carnation-white", name: "White Carnation", colorHex: "#f7f3e9", pricePerStemPaise: 2600, stockStems: 140, description: "Clean white carnations that hold their shape for up to two weeks. Beautiful with greenery." },
  { slug: "carnation-yellow", name: "Yellow Carnation", colorHex: "#f4d03f", pricePerStemPaise: 2600, stockStems: 100, description: "Lemon-yellow carnations for a bright, friendly bouquet. Excellent vase life." },
  { slug: "gerbera-orange", name: "Orange Gerbera", colorHex: "#f39c12", pricePerStemPaise: 3500, stockStems: 150, description: "Big, cheerful orange gerbera daisies on strong stems. Instant happiness in any arrangement." },
  { slug: "gerbera-pink", name: "Pink Gerbera", colorHex: "#e84393", pricePerStemPaise: 3500, stockStems: 150, description: "Vivid pink gerberas — the easiest way to brighten a desk, bedside or birthday." },
  { slug: "gerbera-red", name: "Red Gerbera", colorHex: "#d63031", pricePerStemPaise: 3500, stockStems: 120, description: "Scarlet gerbera daisies with dark centres. Big, bold and instant joy." },
  { slug: "gerbera-white", name: "White Gerbera", colorHex: "#faf7ee", pricePerStemPaise: 3500, stockStems: 100, description: "White gerberas with soft cream centres — crisp and modern on their own or with roses." },
  { slug: "gerbera-yellow", name: "Yellow Gerbera", colorHex: "#f7dc6f", pricePerStemPaise: 3500, stockStems: 90, description: "Golden-yellow gerberas that open wide in the sun. A happy desk flower." },
  { slug: "sunflower", name: "Sunflower", colorHex: "#f4c430", pricePerStemPaise: 4500, stockStems: 100, description: "Farm-fresh Indian sunflowers with huge golden heads. Bring the sunshine indoors." },
  { slug: "marigold-orange", name: "Genda Marigold", colorHex: "#e67e22", pricePerStemPaise: 1000, stockStems: 500, description: "The everyday Indian flower — bright orange genda phool for pujas, garlands and festive décor." },
  { slug: "marigold-yellow", name: "Yellow Marigold", colorHex: "#f4d03f", pricePerStemPaise: 1000, stockStems: 450, description: "Golden genda phool for pujas, garlands and celebrations. Sold per stem." },
  { slug: "tulip-red", name: "Red Tulip", colorHex: "#d63031", pricePerStemPaise: 6000, stockStems: 70, description: "Imported red tulips with the classic cup shape. Limited seasonal stock — order early." },
  { slug: "tulip-pink", name: "Pink Tulip", colorHex: "#f1948a", pricePerStemPaise: 6000, stockStems: 60, description: "Soft pink imported tulips with the classic cup shape. Seasonal and limited." },
  { slug: "tulip-white", name: "White Tulip", colorHex: "#fbf8ef", pricePerStemPaise: 6000, stockStems: 55, description: "Ivory white tulips — serene, sculptural and perfect for minimalist bouquets." },
  { slug: "tulip-yellow", name: "Yellow Tulip", colorHex: "#f7dc6f", pricePerStemPaise: 6000, stockStems: 50, description: "Butter-yellow tulips that announce spring. Sold in limited weekly stock." },
  { slug: "tulip-purple", name: "Purple Tulip", colorHex: "#8e44ad", pricePerStemPaise: 6500, stockStems: 45, description: "Rich purple tulips with velvety petals. A dramatic, royal accent." },
  { slug: "dahlia-red", name: "Red Dahlia", colorHex: "#a93226", pricePerStemPaise: 5000, stockStems: 60, description: "Dinner-plate red dahlias with layered petals. Grown in Ooty's cool hills." },
  { slug: "dahlia-pink", name: "Pink Dahlia", colorHex: "#ec7fa9", pricePerStemPaise: 5000, stockStems: 55, description: "Full pink dahlias with perfect geometry — a showstopper in any arrangement." },
  { slug: "hydrangea-blue", name: "Blue Hydrangea", colorHex: "#7fb3d5", pricePerStemPaise: 15000, stockStems: 25, description: "Cloud-like blue hydrangea heads. One stem fills an entire vase." },
  { slug: "hydrangea-pink", name: "Pink Hydrangea", colorHex: "#f5b7c8", pricePerStemPaise: 15000, stockStems: 25, description: "Romantic pink hydrangea blooms with soft ruffled petals. Imported, limited stock." },
  { slug: "peony-pink", name: "Pink Peony", colorHex: "#f2a0b5", pricePerStemPaise: 18000, stockStems: 0, description: "Heirloom pink peonies with ruffled, fragrant blooms. The most requested wedding flower — back soon." },
  { slug: "gladiolus-pink", name: "Pink Gladiolus", colorHex: "#e78fb3", pricePerStemPaise: 5000, stockStems: 70, description: "Tall pink gladiolus spikes that open from the bottom up. Dramatic and long-lasting." },
  { slug: "iris-blue", name: "Blue Iris", colorHex: "#5d8aa8", pricePerStemPaise: 5500, stockStems: 50, description: "Royal blue irises with delicate falls. A refined, old-world garden flower." },
  { slug: "daffodil-yellow", name: "Yellow Daffodil", colorHex: "#f7d154", pricePerStemPaise: 4500, stockStems: 60, description: "Cheerful yellow daffodils with trumpet centres. A breath of spring." },
  { slug: "freesia-yellow", name: "Yellow Freesia", colorHex: "#f9e79f", pricePerStemPaise: 4000, stockStems: 70, description: "Fragrant yellow freesias on gentle curved stems. Sweet, light and lovely in posies." },
  { slug: "alstroemeria-orange", name: "Orange Alstroemeria", colorHex: "#f5a25d", pricePerStemPaise: 3800, stockStems: 80, description: "Orange Peruvian lilies with speckled petals. Incredible vase life — up to two weeks." },
  { slug: "anthurium-red", name: "Red Anthurium", colorHex: "#c0392b", pricePerStemPaise: 9000, stockStems: 40, description: "Glossy red heart-shaped anthuriums. Tropical, sculptural and very long-lasting." },
  { slug: "bird-of-paradise", name: "Bird of Paradise", colorHex: "#f39c12", pricePerStemPaise: 14000, stockStems: 30, description: "The iconic bird-of-paradise bloom — orange and blue crests on tall stems. Pure drama." },
  { slug: "babys-breath", name: "Baby's Breath", colorHex: "#fdfbf5", pricePerStemPaise: 2500, stockStems: 150, description: "Airy white baby's breath — the perfect soft filler for roses and lilies." },
  { slug: "eucalyptus-bunch", name: "Eucalyptus Bunch", colorHex: "#7d9b76", pricePerStemPaise: 3200, stockStems: 90, description: "Fresh silver-green eucalyptus foliage with a cool menthol scent. A designer's favourite filler." },
  { slug: "lavender-bunch", name: "Lavender Bunch", colorHex: "#9b7bb8", pricePerStemPaise: 4500, stockStems: 70, description: "Fragrant English lavender bunches. Dry them later for wardrobe sachets." },
  { slug: "jasmine-mogra", name: "Mogra Jasmine", colorHex: "#fdfcf5", pricePerStemPaise: 2000, stockStems: 200, description: "Hand-picked mogra buds strung fresh each morning. The scent of an Indian evening." },
  { slug: "lotus-pink", name: "Pink Lotus", colorHex: "#f48fb1", pricePerStemPaise: 12000, stockStems: 0, description: "Temple-grade pink lotus buds, cut to order from Kerala ponds. Seasonal — usually May to September." },
  { slug: "zinnia-red", name: "Red Zinnia", colorHex: "#cc4125", pricePerStemPaise: 2800, stockStems: 90, description: "Bright red zinnias with dahlia-like layers. Hardy, cheerful and long-lasting." },
  { slug: "cosmos-pink", name: "Pink Cosmos", colorHex: "#f1a7c1", pricePerStemPaise: 2200, stockStems: 80, description: "Delicate pink cosmos with feathery foliage. A cottage-garden favourite." },
  { slug: "gazania", name: "Gazania", colorHex: "#f39c12", pricePerStemPaise: 2600, stockStems: 60, description: "Sun-loving gazania with a fiery orange face. Opens wide in daylight." },
  { slug: "chrysanthemum-white", name: "White Chrysanthemum", colorHex: "#f7f3e8", pricePerStemPaise: 3000, stockStems: 140, description: "Pom-pom white chrysanthemums, the traditional flower for respectful occasions and serene arrangements." },
  { slug: "chrysanthemum-red", name: "Red Chrysanthemum", colorHex: "#b03a2e", pricePerStemPaise: 3000, stockStems: 100, description: "Deep red pom-pom mums — festive, long-lasting and perfect for Diwali arrangements." },
  { slug: "chrysanthemum-yellow", name: "Yellow Chrysanthemum", colorHex: "#f4d03f", pricePerStemPaise: 3000, stockStems: 120, description: "Sunny yellow chrysanthemums that stay fresh for days. A traditional festive favourite." },
  { slug: "tuberose", name: "Rajnigandha Tuberose", colorHex: "#fffdf6", pricePerStemPaise: 4000, stockStems: 160, description: "Rajnigandha spikes with an intoxicating evening fragrance. A nostalgic Indian favourite." },
];

const BOUQUETS = [
  {
    slug: "blush-romance", name: "Blush Romance", pricePaise: 64900,
    description: "Ten red and pink roses with pink lilies — our most-loved anniversary bouquet, hand-tied in blush paper.",
    recipe: { "rose-red": 5, "rose-pink": 5, "lily-pink": 2 },
  },
  {
    slug: "sunrise-delight", name: "Sunrise Delight", pricePaise: 54900,
    description: "Golden sunflowers, marigolds and orange gerberas bundled like an Indian morning — bright and auspicious.",
    recipe: { "sunflower": 4, "marigold-orange": 10, "gerbera-orange": 4 },
  },
  {
    slug: "orchid-elegance", name: "Orchid Elegance", pricePaise: 109900,
    description: "Purple Phalaenopsis orchids with rajnigandha and white lilies in a premium lilac wrap. Statement luxury.",
    recipe: { "orchid-purple": 4, "tuberose": 6, "lily-white": 2 },
  },
  {
    slug: "carnation-comfort", name: "Carnation Comfort", pricePaise: 59900,
    description: "A soft, long-lasting mix of pink carnations, white chrysanthemums and roses. Perfect for get-well wishes.",
    recipe: { "carnation-pink": 8, "chrysanthemum-white": 5, "rose-pink": 3 },
  },
  {
    slug: "royal-white", name: "Royal White", pricePaise: 79900,
    description: "An all-white arrangement of roses, lilies and tuberose — serene, sophisticated and wedding-ready.",
    recipe: { "rose-white": 6, "lily-white": 2, "tuberose": 5 },
  },
  {
    slug: "gerbera-cheer", name: "Gerbera Cheer", pricePaise: 59900,
    description: "A vibrant burst of orange and pink gerberas with sunflowers — guaranteed to make someone smile.",
    recipe: { "gerbera-orange": 5, "gerbera-pink": 5, "sunflower": 3 },
  },
];

/** Plant variants are [potType, size, pricePaise, stock] tuples. */
type VariantTuple = [string, string, number, number];

const PLANTS: Array<{
  slug: string; name: string; description: string;
  careWatering: string; careLight: string; careNotes: string;
  variants: VariantTuple[];
}> = [
  {
    slug: "money-plant", name: "Money Plant (Pothos)",
    description: "The legendary low-maintenance Money Plant — believed to bring prosperity and impossible to kill. Trails beautifully on shelves.",
    careWatering: "Once a week", careLight: "Low to bright indirect light", careNotes: "Grows in soil or water. Trim leggy vines to keep it bushy.",
    variants: [
      ["Plastic", "Small", 19900, 25],
      ["Hanging Basket", "Medium", 29900, 12],
      ["Ceramic", "Medium", 39900, 8],
    ],
  },
  {
    slug: "tulsi-holy-basil", name: "Tulsi (Holy Basil)",
    description: "The sacred Tulsi plant for your courtyard or balcony. Aromatic leaves used daily in kadhas and teas.",
    careWatering: "Daily, early morning", careLight: "Full sun (4–6 hours)", careNotes: "Remove seed heads to keep leaf growth lush.",
    variants: [
      ["Nursery Bag", "Small", 9900, 40],
      ["Terracotta", "Medium", 19900, 20],
    ],
  },
  {
    slug: "aloe-vera", name: "Aloe Vera",
    description: "A thick-leafed Aloe Vera — your kitchen-side first-aid plant for burns, skin and summer coolers.",
    careWatering: "Every 10–12 days", careLight: "Bright light, tolerates direct sun", careNotes: "Use gritty, fast-draining soil. Do not overwater.",
    variants: [
      ["Plastic", "Small", 24900, 18],
      ["Ceramic", "Medium", 39900, 10],
    ],
  },
  {
    slug: "snake-plant", name: "Snake Plant (Sansevieria)",
    description: "Architectural air-purifying swords that thrive on neglect. The best plant for bedrooms and offices.",
    careWatering: "Every 2 weeks", careLight: "Low light tolerant, prefers indirect", careNotes: "Almost indestructible. Water less in winter.",
    variants: [
      ["Nursery", "Small", 29900, 15],
      ["Ceramic", "Medium", 49900, 9],
      ["Ceramic", "Large", 79900, 4],
    ],
  },
  {
    slug: "jade-plant", name: "Jade Plant",
    description: "A charming bonsai-style Jade with coin-shaped leaves — a favourite gifting plant for new homes and businesses.",
    careWatering: "Every 10 days", careLight: "Bright indirect with mild sun", careNotes: "Keep on the drier side; leaves wrinkle when thirsty.",
    variants: [
      ["Plastic", "Small", 29900, 14],
      ["Ceramic", "Medium", 49900, 7],
    ],
  },
  {
    slug: "peace-lily", name: "Peace Lily",
    description: "Glossy leaves and elegant white spathes that bloom for months. Excellent at filtering indoor air.",
    careWatering: "Twice a week", careLight: "Medium indirect light", careNotes: "Leaves droop dramatically when dry — a helpful reminder.",
    variants: [
      ["Nursery", "Medium", 34900, 11],
      ["Ceramic", "Large", 64900, 5],
    ],
  },
  {
    slug: "areca-palm", name: "Areca Palm",
    description: "A lush, feather-frond Areca Palm that instantly turns a corner into a tropical corner. Pet-safe.",
    careWatering: "Every 2–3 days in summer", careLight: "Bright indirect light", careNotes: "Mist fronds in dry summers to prevent browning tips.",
    variants: [
      ["Nursery", "Large", 54900, 8],
      ["Ceramic", "Large", 89900, 3],
    ],
  },
  {
    slug: "zz-plant", name: "ZZ Plant",
    description: "Glossy, sculptural and famously unkillable — the ZZ Plant shrugs off low light, dry air and forgotten waterings.",
    careWatering: "Every 2 weeks", careLight: "Low to bright indirect", careNotes: "Rhizomes store water; worst enemy is overwatering.",
    variants: [
      ["Plastic", "Small", 34900, 12],
      ["Ceramic", "Medium", 59900, 6],
    ],
  },
  {
    slug: "aglaonema", name: "Aglaonema (Chinese Evergreen)",
    description: "Patterned, painterly leaves that tolerate low light beautifully. A lucky plant for new homes.",
    careWatering: "Once a week", careLight: "Low to medium indirect", careNotes: "Let soil dry slightly between waterings; avoid cold draughts.",
    variants: [["Plastic", "Small", 29900, 16], ["Ceramic", "Medium", 49900, 8]],
  },
  {
    slug: "anthurium-plant", name: "Anthurium (Flamingo Flower)",
    description: "Glossy leaves with waxy red spathes that bloom almost year-round indoors.",
    careWatering: "Twice a week", careLight: "Bright indirect", careNotes: "Wipe leaves monthly; keep away from direct afternoon sun.",
    variants: [["Plastic", "Medium", 44900, 10], ["Ceramic", "Medium", 64900, 6]],
  },
  {
    slug: "barrel-cactus", name: "Barrel Cactus",
    description: "A sculptural golden barrel cactus — the ultimate low-water desk companion.",
    careWatering: "Every 3 weeks", careLight: "Full sun", careNotes: "Water sparingly; never let water sit in the saucer.",
    variants: [["Plastic", "Small", 24900, 20], ["Terracotta", "Medium", 39900, 10]],
  },
  {
    slug: "begonia", name: "Begonia",
    description: "Wax begonias with constant pink blooms and glossy leaves. Happy in shade.",
    careWatering: "Every 2–3 days", careLight: "Bright indirect", careNotes: "Pinch spent flowers to keep blooms coming.",
    variants: [["Nursery", "Medium", 19900, 18], ["Ceramic", "Medium", 39900, 8]],
  },
  {
    slug: "bird-of-paradise-plant", name: "Bird of Paradise Plant",
    description: "Tropical white bird-of-paradise with huge paddle leaves. Turns a balcony into a resort.",
    careWatering: "Twice a week", careLight: "Full sun to bright indirect", careNotes: "Feed monthly in summer for bigger leaves.",
    variants: [["Nursery", "Large", 89900, 6], ["Ceramic", "Large", 149900, 3]],
  },
  {
    slug: "boston-fern", name: "Boston Fern",
    description: "Feathery Boston fern that loves humidity and filters indoor air.",
    careWatering: "Every 1–2 days", careLight: "Medium indirect", careNotes: "Mist daily; brown tips mean the air is too dry.",
    variants: [["Hanging Basket", "Medium", 34900, 12], ["Ceramic", "Medium", 49900, 6]],
  },
  {
    slug: "bougainvillea", name: "Bougainvillea",
    description: "Paper-flower bougainvillea in vivid pink — a balcony classic across India.",
    careWatering: "Every 2 days", careLight: "Full sun (5+ hours)", careNotes: "Slightly dry soil encourages more blooms.",
    variants: [["Nursery", "Medium", 29900, 15], ["Terracotta", "Large", 59900, 6]],
  },
  {
    slug: "caladium", name: "Caladium",
    description: "Heart-shaped caladium leaves splashed with pink and white. A monsoon favourite.",
    careWatering: "Twice a week", careLight: "Bright indirect", careNotes: "Goes dormant in winter — keep the bulb and water less.",
    variants: [["Plastic", "Medium", 34900, 10], ["Ceramic", "Medium", 54900, 5]],
  },
  {
    slug: "calathea", name: "Calathea (Prayer Plant)",
    description: "The prayer plant — leaves fold at night and show off bold patterns by day.",
    careWatering: "Twice a week", careLight: "Medium indirect", careNotes: "Use filtered water; loves humidity.",
    variants: [["Plastic", "Medium", 39900, 12], ["Ceramic", "Medium", 59900, 6]],
  },
  {
    slug: "chamomile-plant", name: "Chamomile",
    description: "Fragrant chamomile for fresh herbal tea from your own balcony.",
    careWatering: "Every 2 days", careLight: "Full sun", careNotes: "Harvest flowers just as they open.",
    variants: [["Nursery", "Small", 14900, 25]],
  },
  {
    slug: "chrysanthemum-plant", name: "Chrysanthemum (Pot Mum)",
    description: "Pot mums covered in buds that bloom for weeks — a festive gifting staple.",
    careWatering: "Every 2 days", careLight: "Bright indirect to full sun", careNotes: "Pinch tips early for a bushier plant.",
    variants: [["Plastic", "Small", 19900, 20], ["Ceramic", "Medium", 39900, 10]],
  },
  {
    slug: "croton", name: "Croton",
    description: "Bold yellow-and-red croton foliage that adds instant colour to a room.",
    careWatering: "Twice a week", careLight: "Bright indirect", careNotes: "Colours fade in low light — give it good light.",
    variants: [["Plastic", "Medium", 34900, 12], ["Ceramic", "Medium", 54900, 6]],
  },
  {
    slug: "curry-leaf-plant", name: "Curry Leaf (Kadi Patta)",
    description: "Fresh kadi patta at arm's reach — aromatic leaves for everyday cooking.",
    careWatering: "Every 1–2 days", careLight: "Full sun", careNotes: "Harvest sprigs regularly to keep it branching.",
    variants: [["Nursery Bag", "Small", 12900, 40], ["Terracotta", "Medium", 29900, 15]],
  },
  {
    slug: "dieffenbachia", name: "Dieffenbachia (Dumb Cane)",
    description: "Large patterned leaves with creamy variegation. Fast grower, easy care.",
    careWatering: "Once a week", careLight: "Medium indirect", careNotes: "Keep away from pets — the sap is irritating.",
    variants: [["Plastic", "Medium", 34900, 12], ["Ceramic", "Medium", 54900, 6]],
  },
  {
    slug: "dracaena", name: "Dracaena",
    description: "Dracaena with sword-like striped leaves — tolerant, tidy and desk-friendly.",
    careWatering: "Every 10 days", careLight: "Low to bright indirect", careNotes: "Avoid overwatering; let the top soil dry.",
    variants: [["Plastic", "Medium", 32900, 14], ["Ceramic", "Large", 64900, 5]],
  },
  {
    slug: "echeveria", name: "Echeveria Succulent",
    description: "Rosette succulent with powdery blue-green leaves. Almost impossible to kill.",
    careWatering: "Every 2 weeks", careLight: "Bright light, some direct sun", careNotes: "Water the soil, not the rosette.",
    variants: [["Plastic", "Small", 19900, 30], ["Ceramic", "Small", 34900, 10]],
  },
  {
    slug: "eucalyptus-plant", name: "Eucalyptus Plant",
    description: "Silver dollar eucalyptus with aromatic coin leaves. Grows fast in sun.",
    careWatering: "Every 2–3 days", careLight: "Full sun", careNotes: "Prune often for a bushy shape and fresh stems.",
    variants: [["Nursery", "Medium", 39900, 10]],
  },
  {
    slug: "ficus-bonsai", name: "Ficus Bonsai",
    description: "A trained ficus bonsai with a thick trunk — a living gift for new beginnings.",
    careWatering: "Every 3–4 days", careLight: "Bright indirect", careNotes: "Rotate weekly for even growth; trim to shape.",
    variants: [["Ceramic", "Medium", 129900, 4]],
  },
  {
    slug: "fiddle-leaf-fig", name: "Fiddle Leaf Fig",
    description: "The designer's fiddle-leaf fig with broad violin-shaped leaves. Loves bright light.",
    careWatering: "Once a week", careLight: "Bright indirect", careNotes: "Don't move it around — ficuses sulk.",
    variants: [["Nursery", "Large", 74900, 6], ["Ceramic", "Large", 119900, 3]],
  },
  {
    slug: "hibiscus-plant", name: "Hibiscus (Gudhal)",
    description: "Gudhal with dinner-plate red blooms almost all year. Sun-loving and generous.",
    careWatering: "Twice a week", careLight: "Full sun (5+ hours)", careNotes: "Feed with compost monthly for more flowers.",
    variants: [["Nursery", "Medium", 24900, 18], ["Ceramic", "Large", 49900, 8]],
  },
  {
    slug: "ixora", name: "Ixora (Rangan)",
    description: "Ixora with clusters of tiny star flowers. A hardy garden classic.",
    careWatering: "Twice a week", careLight: "Full sun", careNotes: "Acid-loving — add compost tea occasionally.",
    variants: [["Nursery", "Medium", 24900, 15], ["Ceramic", "Medium", 44900, 6]],
  },
  {
    slug: "jasmine-plant", name: "Jasmine (Chameli)",
    description: "Chameli vine with night-scented white flowers. A must for Indian balconies.",
    careWatering: "Every 2 days", careLight: "Full sun", careNotes: "Prune after each flush for repeat blooms.",
    variants: [["Nursery", "Medium", 24900, 18], ["Ceramic", "Medium", 44900, 8]],
  },
  {
    slug: "kalanchoe", name: "Kalanchoe",
    description: "Kalanchoe with clusters of tiny blooms that last for weeks — a perfect gift plant.",
    careWatering: "Every 10 days", careLight: "Bright indirect", careNotes: "Flowers best with long dark nights in winter.",
    variants: [["Plastic", "Small", 24900, 16], ["Ceramic", "Medium", 44900, 8]],
  },
  {
    slug: "lantana", name: "Lantana",
    description: "Butterfly-magnet lantana with changing multi-colour flower clusters.",
    careWatering: "Every 2–3 days", careLight: "Full sun", careNotes: "Very forgiving — thrives on neglect.",
    variants: [["Nursery", "Medium", 19900, 20]],
  },
  {
    slug: "lavender-plant", name: "Lavender",
    description: "Fragrant lavender for sunny balconies and homemade sachets.",
    careWatering: "Every 2 days", careLight: "Full sun", careNotes: "Needs sharp drainage; do not overwater.",
    variants: [["Plastic", "Medium", 34900, 12], ["Terracotta", "Medium", 49900, 6]],
  },
  {
    slug: "lucky-bamboo", name: "Lucky Bamboo",
    description: "Lucky bamboo stalks that grow in a glass of water — a feng-shui favourite.",
    careWatering: "Weekly — change the water", careLight: "Low indirect", careNotes: "Keep out of direct sun; top up the water.",
    variants: [["Glass Vase", "Small", 19900, 30]],
  },
  {
    slug: "marigold-plant", name: "Marigold Plant",
    description: "Genda plant crowned with orange blooms — festive, edible-petal marigolds.",
    careWatering: "Every 2 days", careLight: "Full sun", careNotes: "Deadhead regularly for continuous blooms.",
    variants: [["Nursery", "Small", 9900, 50], ["Plastic", "Medium", 19900, 20]],
  },
  {
    slug: "monstera", name: "Monstera Deliciosa",
    description: "The iconic Swiss cheese plant with split leaves. Fast-growing statement greenery.",
    careWatering: "Once a week", careLight: "Bright indirect", careNotes: "Give it a moss pole to climb.",
    variants: [["Plastic", "Medium", 54900, 10], ["Ceramic", "Large", 89900, 5]],
  },
  {
    slug: "orchid-plant", name: "Phalaenopsis Orchid Plant",
    description: "Phalaenopsis orchid in bloom — weeks of flowers with minimal care.",
    careWatering: "Weekly — two ice cubes", careLight: "Bright indirect", careNotes: "Never let water sit in the leaf joints.",
    variants: [["Plastic", "Medium", 49900, 12], ["Ceramic", "Medium", 69900, 6]],
  },
  {
    slug: "petunia-plant", name: "Petunia",
    description: "Trailing petunias that flower non-stop in pink, white and purple.",
    careWatering: "Every 1–2 days", careLight: "Full sun", careNotes: "Feed weekly; pinch leggy stems.",
    variants: [["Nursery", "Medium", 17900, 20]],
  },
  {
    slug: "petunia-purple", name: "Purple Petunia",
    description: "Deep purple petunias with a cascading habit — lovely in hanging pots.",
    careWatering: "Every 1–2 days", careLight: "Full sun", careNotes: "Water at the base to keep blooms clean.",
    variants: [["Hanging Basket", "Medium", 24900, 12]],
  },
  {
    slug: "philodendron", name: "Philodendron",
    description: "Heart-leaf philodendron — a fast, forgiving climber for shelves and windows.",
    careWatering: "Once a week", careLight: "Medium indirect", careNotes: "Trim vines to encourage fullness.",
    variants: [["Plastic", "Small", 24900, 16], ["Ceramic", "Medium", 44900, 8]],
  },
  {
    slug: "pilea", name: "Pilea (Chinese Money Plant)",
    description: "The Chinese money plant with coin-shaped leaves and baby offshoots to share.",
    careWatering: "Once a week", careLight: "Bright indirect", careNotes: "Rotate weekly; it leans towards the light.",
    variants: [["Plastic", "Small", 29900, 14], ["Ceramic", "Small", 44900, 6]],
  },
  {
    slug: "poinsettia", name: "Poinsettia",
    description: "The Christmas star with red bracts. Seasonal stock from October to January.",
    careWatering: "Twice a week", careLight: "Bright indirect", careNotes: "Avoid cold draughts to protect the bracts.",
    variants: [["Plastic", "Medium", 29900, 10], ["Ceramic", "Medium", 49900, 5]],
  },
  {
    slug: "portulaca", name: "Portulaca (Moss Rose)",
    description: "Moss rose that carpets a sunny pot with jewel-like flowers every morning.",
    careWatering: "Every 1–2 days", careLight: "Full sun", careNotes: "Loves heat; flowers close in the evening.",
    variants: [["Plastic", "Small", 14900, 30]],
  },
  {
    slug: "rose-plant", name: "Rose Plant",
    description: "A grafted rose plant that flowers in flushes through the year.",
    careWatering: "Every 2 days", careLight: "Full sun (5+ hours)", careNotes: "Prune after each flush; feed with rose mix.",
    variants: [["Nursery", "Medium", 34900, 12], ["Terracotta", "Large", 59900, 5]],
  },
  {
    slug: "rubber-plant", name: "Rubber Plant",
    description: "Glossy burgundy rubber plant — architectural, hardy and air-purifying.",
    careWatering: "Every 10 days", careLight: "Bright indirect", careNotes: "Wipe leaves to keep them shiny.",
    variants: [["Plastic", "Medium", 39900, 10], ["Ceramic", "Large", 69900, 4]],
  },
  {
    slug: "schefflera", name: "Schefflera (Umbrella Plant)",
    description: "Umbrella plant with hand-shaped leaves — a cheerful, fast grower.",
    careWatering: "Every 3–4 days", careLight: "Bright indirect", careNotes: "Pinch tips to keep it compact.",
    variants: [["Plastic", "Medium", 29900, 14], ["Ceramic", "Medium", 49900, 6]],
  },
  {
    slug: "spider-plant", name: "Spider Plant",
    description: "Spider plant with arching striped leaves and baby plantlets — pet-safe.",
    careWatering: "Twice a week", careLight: "Medium indirect", careNotes: "Brown tips? Use filtered water.",
    variants: [["Hanging Basket", "Medium", 24900, 16], ["Plastic", "Small", 14900, 20]],
  },
  {
    slug: "syngonium", name: "Syngonium",
    description: "Arrowhead vine in soft pink and green — a trailing beauty for low light.",
    careWatering: "Once a week", careLight: "Low to medium indirect", careNotes: "Trim or train on a support as it grows.",
    variants: [["Plastic", "Small", 22900, 18], ["Ceramic", "Medium", 39900, 8]],
  },
  {
    slug: "verbena", name: "Verbena",
    description: "Verbena with clusters of tiny flowers that bloom for months.",
    careWatering: "Every 2 days", careLight: "Full sun", careNotes: "Deadhead to keep the show going.",
    variants: [["Nursery", "Small", 14900, 24]],
  },
  {
    slug: "vinca", name: "Vinca (Sadabahar)",
    description: "Sadabahar — the toughest flowering plant in India, blooming almost all year.",
    careWatering: "Every 3 days", careLight: "Full sun", careNotes: "Loves heat and forgives drought.",
    variants: [["Plastic", "Small", 14900, 30], ["Ceramic", "Medium", 29900, 12]],
  },
];

/** "Hanging Basket" → "Hanging basket · Medium"; "Plastic" → "Plastic pot · Small". */
function variantLabel(potType: string, size: string): string {
  if (/basket|bag|vase/i.test(potType)) {
    const pretty = potType.charAt(0).toUpperCase() + potType.slice(1).toLowerCase();
    return `${pretty} · ${size}`;
  }
  return `${potType} pot · ${size}`;
}

const WRAPPINGS = [
  { name: "Classic Paper", chargePaise: 3000 },
  { name: "Kraft Paper", chargePaise: 5000 },
  { name: "Jute Wrap", chargePaise: 7000 },
  { name: "Premium Floral Sheet", chargePaise: 8000 },
];
const RIBBONS = [
  { name: "No Ribbon", chargePaise: 0 },
  { name: "Jute Twine", chargePaise: 1000 },
  { name: "Satin Ribbon", chargePaise: 2000 },
  { name: "Velvet Ribbon", chargePaise: 4000 },
];
const EXTRAS = [
  { name: "Greeting Card", kind: "CARD" as const, chargePaise: 3000 },
  { name: "Chocolate Box (5 pc)", kind: "ADDON" as const, chargePaise: 15000 },
  { name: "Small Teddy Bear", kind: "ADDON" as const, chargePaise: 19900 },
  { name: "Flower Food Sachet", kind: "ADDON" as const, chargePaise: 1000 },
];

/** Pan-India serviceable PIN codes (fee in paise). 110001 must stay ₹40 (demo + tests). */
const PINCODES: Array<[string, string, number]> = [
  // Delhi NCR
  ["110001", "New Delhi — Connaught Place", 4000],
  ["110002", "New Delhi — Ajmeri Gate", 4000],
  ["110003", "New Delhi — Civil Lines", 4500],
  ["110005", "New Delhi — Karol Bagh", 4000],
  ["110016", "New Delhi — Hauz Khas", 4500],
  ["110017", "New Delhi — Malviya Nagar", 4500],
  ["110019", "New Delhi — Kalkaji", 4500],
  ["110024", "New Delhi — Lajpat Nagar", 4500],
  ["110048", "New Delhi — Greater Kailash", 4500],
  ["110092", "New Delhi — Preet Vihar", 4500],
  ["121001", "Faridabad", 5000],
  ["122001", "Gurugram", 5000],
  ["122002", "Gurugram — DLF Phase 2", 5000],
  ["124001", "Rohtak", 6500],
  ["201001", "Ghaziabad", 5000],
  ["201010", "Greater Noida", 5500],
  ["201301", "Noida", 5000],
  // Maharashtra
  ["400001", "Mumbai — Fort", 7000],
  ["400050", "Mumbai — Bandra", 7000],
  ["400058", "Mumbai — Andheri", 7000],
  ["400703", "Navi Mumbai — Vashi", 7000],
  ["410206", "Panvel", 7500],
  ["411001", "Pune — Camp", 7000],
  ["411014", "Pune — Kharadi", 7000],
  ["416001", "Kolhapur", 8000],
  ["422001", "Nashik", 7500],
  ["431001", "Chhatrapati Sambhajinagar", 7500],
  ["440001", "Nagpur", 7500],
  // Karnataka
  ["560001", "Bengaluru — MG Road", 7000],
  ["560034", "Bengaluru — Koramangala", 7000],
  ["560076", "Bengaluru — BTM Layout", 7000],
  ["560100", "Bengaluru — Electronic City", 7000],
  ["570001", "Mysuru", 7500],
  ["575001", "Mangaluru", 8000],
  ["580001", "Hubballi", 8000],
  ["590001", "Belagavi", 8000],
  // Tamil Nadu & Puducherry
  ["600001", "Chennai — Parrys", 7000],
  ["600028", "Chennai — T. Nagar", 7000],
  ["600042", "Chennai — Velachery", 7000],
  ["605001", "Puducherry", 8000],
  ["620001", "Tiruchirappalli", 8000],
  ["625001", "Madurai", 8000],
  ["632001", "Vellore", 8000],
  ["641001", "Coimbatore", 7500],
  // Telangana & Andhra Pradesh
  ["500001", "Hyderabad — Old City", 7000],
  ["500003", "Secunderabad", 7000],
  ["500034", "Hyderabad — Banjara Hills", 7000],
  ["500081", "Hyderabad — Gachibowli", 7000],
  ["517501", "Tirupati", 8500],
  ["520001", "Vijayawada", 8000],
  ["530001", "Visakhapatnam", 8000],
  // Kerala
  ["673001", "Kozhikode", 8000],
  ["680001", "Thrissur", 8000],
  ["682001", "Kochi", 8000],
  ["695001", "Thiruvananthapuram", 8000],
  // Goa
  ["403001", "Panaji", 8500],
  ["403601", "Margao", 8500],
  // Gujarat
  ["360001", "Rajkot", 8000],
  ["364001", "Bhavnagar", 8000],
  ["380001", "Ahmedabad", 7500],
  ["380015", "Ahmedabad — Satellite", 7500],
  ["390001", "Vadodara", 7500],
  ["395001", "Surat", 7500],
  // Rajasthan
  ["302001", "Jaipur", 7000],
  ["302017", "Jaipur — Malviya Nagar", 7000],
  ["305001", "Ajmer", 7500],
  ["313001", "Udaipur", 7500],
  ["324001", "Kota", 7500],
  ["342001", "Jodhpur", 7500],
  // Madhya Pradesh
  ["452001", "Indore", 7500],
  ["456001", "Ujjain", 8000],
  ["462001", "Bhopal", 7500],
  ["474001", "Gwalior", 8000],
  ["482001", "Jabalpur", 8000],
  // Uttar Pradesh
  ["208001", "Kanpur", 7500],
  ["211001", "Prayagraj", 7500],
  ["221001", "Varanasi", 7500],
  ["226001", "Lucknow", 7000],
  ["243001", "Bareilly", 8000],
  ["244001", "Moradabad", 8000],
  ["250001", "Meerut", 7000],
  ["282001", "Agra", 7500],
  // Uttarakhand
  ["248001", "Dehradun", 7500],
  ["249201", "Rishikesh", 8000],
  ["263139", "Haldwani", 8000],
  // Punjab, Haryana & Chandigarh
  ["125001", "Hisar", 8000],
  ["132001", "Karnal", 7500],
  ["134109", "Panchkula", 7500],
  ["141001", "Ludhiana", 7500],
  ["143001", "Amritsar", 7500],
  ["144001", "Jalandhar", 7500],
  ["147001", "Patiala", 7500],
  ["160001", "Chandigarh", 7000],
  ["160017", "Chandigarh — Sector 17", 7000],
  // Himachal, Jammu & Kashmir, Ladakh
  ["171001", "Shimla", 8500],
  ["173001", "Solan", 8500],
  ["180001", "Jammu", 9000],
  ["190001", "Srinagar", 9500],
  ["194101", "Leh", 10000],
  // Bihar, Jharkhand & Odisha
  ["751001", "Bhubaneswar", 8000],
  ["753001", "Cuttack", 8000],
  ["768001", "Sambalpur", 8500],
  ["800001", "Patna", 8000],
  ["812001", "Bhagalpur", 8500],
  ["826001", "Dhanbad", 8500],
  ["831001", "Jamshedpur", 8000],
  ["834001", "Ranchi", 8000],
  ["842001", "Muzaffarpur", 8500],
  // West Bengal
  ["700001", "Kolkata — BBD Bagh", 7000],
  ["700019", "Kolkata — Ballygunge", 7000],
  ["700091", "Kolkata — Salt Lake", 7000],
  ["713101", "Durgapur", 8000],
  ["721301", "Kharagpur", 8500],
  ["734001", "Siliguri", 8500],
  // North-East & Sikkim
  ["737101", "Gangtok", 10000],
  ["781001", "Guwahati", 9000],
  ["788001", "Silchar", 9500],
  ["791001", "Itanagar", 11000],
  ["793001", "Shillong", 9500],
  ["795001", "Imphal", 10000],
  ["796001", "Aizawl", 11000],
  ["797001", "Kohima", 10000],
  ["799001", "Agartala", 10000],
  // Chhattisgarh
  ["490001", "Bhilai", 8000],
  ["492001", "Raipur", 8000],
];

const SLOTS = [
  { label: "Morning (9 AM – 12 PM)", sortOrder: 1 },
  { label: "Afternoon (12 – 4 PM)", sortOrder: 2 },
  { label: "Evening (4 – 8 PM)", sortOrder: 3 },
];

async function main() {
  console.log("🌱 Seeding BloomNest demonstration data…");

  for (const f of FLOWERS) {
    await prisma.flower.upsert({
      where: { slug: f.slug },
      create: { ...f, imageUrl: `/images/products/${f.slug}.jpg` },
      update: { description: f.description, colorHex: f.colorHex, imageUrl: `/images/products/${f.slug}.jpg` }, // do NOT reset admin-edited price/stock
    });
  }

  for (const b of BOUQUETS) {
    const created = await prisma.bouquet.upsert({
      where: { slug: b.slug },
      create: {
        slug: b.slug, name: b.name, description: b.description,
        pricePaise: b.pricePaise, imageUrl: `/images/products/${b.slug}.jpg`,
      },
      update: { description: b.description, imageUrl: `/images/products/${b.slug}.jpg` },
    });
    for (const [flowerSlug, stems] of Object.entries(b.recipe)) {
      const flower = await prisma.flower.findUniqueOrThrow({ where: { slug: flowerSlug } });
      await prisma.bouquetItem.upsert({
        where: { bouquetId_flowerId: { bouquetId: created.id, flowerId: flower.id } },
        create: { bouquetId: created.id, flowerId: flower.id, stems },
        update: { stems },
      });
    }
  }

  for (const p of PLANTS) {
    const plant = await prisma.plant.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug, name: p.name, description: p.description,
        careWatering: p.careWatering, careLight: p.careLight, careNotes: p.careNotes,
        imageUrl: `/images/products/${p.slug}.jpg`,
      },
      update: {
        description: p.description, careWatering: p.careWatering, careLight: p.careLight,
        careNotes: p.careNotes, imageUrl: `/images/products/${p.slug}.jpg`,
      },
    });
    for (const [potType, size, pricePaise, stock] of p.variants) {
      await prisma.plantVariant.upsert({
        where: { plantId_potType_size: { plantId: plant.id, potType, size } },
        create: { plantId: plant.id, potType, size, label: variantLabel(potType, size), pricePaise, stock },
        update: { label: variantLabel(potType, size) }, // do NOT reset admin-edited price/stock
      });
    }
  }

  for (const w of WRAPPINGS) await prisma.wrappingOption.upsert({ where: { name: w.name }, create: w, update: {} });
  for (const r of RIBBONS) await prisma.ribbonOption.upsert({ where: { name: r.name }, create: r, update: {} });
  for (const e of EXTRAS) await prisma.extraOption.upsert({ where: { name: e.name }, create: e, update: {} });
  for (const [pincode, city, fee] of PINCODES) {
    await prisma.serviceablePincode.upsert({ where: { pincode }, create: { pincode, city, deliveryFeePaise: fee }, update: { city } });
  }
  for (const s of SLOTS) await prisma.deliverySlot.upsert({ where: { label: s.label }, create: s, update: {} });

  // Demonstration accounts (for evaluation; create real admins via `npm run create-admin`)
  const adminPass = await bcrypt.hash("Admin@1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@bloomnest.test" },
    create: { email: "admin@bloomnest.test", name: "BloomNest Admin", passwordHash: adminPass, role: "ADMIN", phone: "9800000001" },
    update: {},
  });
  const demoPass = await bcrypt.hash("Demo@1234", 10);
  await prisma.user.upsert({
    where: { email: "demo@bloomnest.test" },
    create: { email: "demo@bloomnest.test", name: "Demo Customer", passwordHash: demoPass, role: "CUSTOMER", phone: "9800000002" },
    update: {},
  });

  const counts = {
    flowers: await prisma.flower.count(),
    bouquets: await prisma.bouquet.count(),
    plants: await prisma.plant.count(),
    variants: await prisma.plantVariant.count(),
    pincodes: await prisma.serviceablePincode.count(),
  };
  console.log("✅ Seed complete:", counts);
  console.log("   Demo admin    : admin@bloomnest.test / Admin@1234");
  console.log("   Demo customer : demo@bloomnest.test / Demo@1234");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
