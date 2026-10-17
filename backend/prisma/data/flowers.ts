/**
 * BloomNest flower catalogue — demonstration data.
 * ---------------------------------------------------
 * Everything here is *sample* shop data for a course demo: real flower
 * families and varieties that Indian florists actually stock, with per-stem
 * prices in the range Indian wholesale markets (Kondhwa, Yeshwanthpur,
 * Ghazipur) typically see. It is NOT live inventory.
 *
 * Each family carries the data two things need:
 *   1. search text  — Hindi/regional + botanical names go into the
 *                     description so `genda`, `gulab`, `kaner`… find the item
 *                     instead of returning "no results";
 *   2. photo terms  — the botanical name is what the real-photography
 *                     lookups (frontend/src/lib/photos.ts and the LoremFlickr
 *                     fallback stored in imageUrl) search on, so the picture
 *                     matches the flower instead of being generic clip-art.
 */

export interface FlowerVariety {
  /** Storefront name, e.g. "Red Hybrid Tea Rose". */
  name: string;
  /** Swatch colour used by the builder + fallback artwork. */
  colorHex: string;
  /** Demo price per stem, in RUPEES (converted to paise below). */
  priceRupees: number;
  /** Demo stems available. 0 intentionally exercises the "Out of stock" UI. */
  stock: number;
  /** Short variety note shown on cards and detail pages. */
  note: string;
}

export interface FlowerFamily {
  key: string;
  label: string;
  latin: string;
  hindi: string[];
  /** Keywords for the real-photography lookups (botanical name is far more accurate than a shop name). */
  photoTerms: string;
  note: string;
  varieties: FlowerVariety[];
}

export const FLOWER_FAMILIES: FlowerFamily[] = [
  {
    key: "rose", label: "Roses", latin: "Rosa", hindi: ["gulab"], photoTerms: "Rosa,rose,garden",
    note: "The stem India gifts the most — hybrid teas with firm petals that hold a day without water.",
    varieties: [
      { name: "Red Hybrid Tea Rose", colorHex: "#c8102e", priceRupees: 35, stock: 480, note: "Deep velvety crimson, long bud — Valentine's and wedding garlands." },
      { name: "Pink Rose 'Tineke'", colorHex: "#e56b8c", priceRupees: 32, stock: 360, note: "Soft blush pink, opens slowly, the staple of Indian bouquet work." },
      { name: "White Avalanche Rose", colorHex: "#f7f3e8", priceRupees: 38, stock: 240, note: "Pure white with a high centre — sympathy arrangements and weddings." },
      { name: "Yellow Gold Medal Rose", colorHex: "#f4c430", priceRupees: 30, stock: 200, note: "Sunny yellow, mild tea scent, brightens mixed bouquets." },
      { name: "Lavender Rose 'Blue For You'", colorHex: "#9b8cc4", priceRupees: 55, stock: 90, note: "Rare true lilac rose — a premium statement stem." },
      { name: "Peach Sprung Rose", colorHex: "#f5a38c", priceRupees: 40, stock: 150, note: "Apricot-cream gradient, favourite for anniversaries." },
      { name: "Garden Rose 'Sarahbern'", colorHex: "#e9a5b5", priceRupees: 65, stock: 60, note: "Quartered old-rose bloom with a strong damask fragrance." },
    ],
  },
  {
    key: "gerbera", label: "Gerberas", latin: "Gerbera jamesonii", hindi: ["gerbera", "transvaal daisy"], photoTerms: "Gerbera,jamesonii,flower",
    note: "Big cheerful daisy heads on hollow, snap-prone stems — handle gently, change water daily.",
    varieties: [
      { name: "Orange Gerbera", colorHex: "#f39c12", priceRupees: 35, stock: 300, note: "Sunshine orange, 10 cm heads, the best-selling colour." },
      { name: "Pink Gerbera", colorHex: "#e84393", priceRupees: 35, stock: 280, note: "Hot pink with a dark eye — instant get-well cheer." },
      { name: "Red Gerbera", colorHex: "#d63031", priceRupees: 38, stock: 190, note: "Saturated scarlet, holds colour for a week in a vase." },
      { name: "Yellow Gerbera", colorHex: "#f9e076", priceRupees: 34, stock: 160, note: "Butter yellow, pairs well with solidago and ruscus." },
      { name: "White Gerbera", colorHex: "#fdfbf2", priceRupees: 36, stock: 120, note: "Crisp white with a green throat for minimal arrangements." },
      { name: "Mini Spray Gerbera Mix", colorHex: "#f5b0c1", priceRupees: 25, stock: 220, note: "Three to five small heads per stem — value filler." },
    ],
  },
  {
    key: "lily", label: "Lilies", latin: "Lilium", hindi: ["lily"], photoTerms: "Lilium,lily,flower",
    note: "One stem carries 3–5 trumpets and perfumes a room; bud-stage cutting keeps them fresh longer.",
    varieties: [
      { name: "White Asiatic Lily", colorHex: "#fdfbf2", priceRupees: 110, stock: 140, note: "Unscented pure white — the safe choice for hospitals and offices." },
      { name: "Pink Oriental Lily", colorHex: "#f2a7c3", priceRupees: 150, stock: 110, note: "Speckled petals, heady fragrance, premium bouquet centrepiece." },
      { name: "Stargazer Lily", colorHex: "#c2185b", priceRupees: 165, stock: 75, note: "Upward-facing magenta blooms with white edges." },
      { name: "Yellow Lily 'Manissa'", colorHex: "#f6c445", priceRupees: 140, stock: 60, note: "Trumpet yellow, pollen-free type, long vase life." },
      { name: "Red Lily", colorHex: "#a4133c", priceRupees: 130, stock: 0, note: "Deep scarlet with reflexed petals — seasonal, sells out fast." },
    ],
  },
  {
    key: "carnation", label: "Carnations", latin: "Dianthus caryophyllus", hindi: ["carnation", "sweet william"], photoTerms: "Dianthus,caryophyllus,flower",
    note: "Ruffled, almost indestructible and the best value per stem in any arrangement.",
    varieties: [
      { name: "Pink Carnation", colorHex: "#e78fb3", priceRupees: 25, stock: 520, note: "Frilly pastel pink, stays fresh up to two weeks." },
      { name: "Red Carnation", colorHex: "#b3202c", priceRupees: 25, stock: 400, note: "Velvet crimson — the go-to for sympathy wreaths." },
      { name: "White Carnation", colorHex: "#f6f2e7", priceRupees: 28, stock: 350, note: "Chalk white, heavily scented, wedding staple." },
      { name: "Yellow Carnation", colorHex: "#f2ca3c", priceRupees: 26, stock: 180, note: "Sunny double blooms for festive mixes." },
      { name: "Green Carnation", colorHex: "#9ec27a", priceRupees: 40, stock: 90, note: "Unusual sage green — florists' favourite for modern wraps." },
      { name: "Purple Carnation", colorHex: "#8e6bab", priceRupees: 30, stock: 45, note: "Dyed-to-order mauve; availability varies by week." },
    ],
  },
  {
    key: "chrysanthemum", label: "Chrysanthemums", latin: "Chrysanthemum", hindi: ["chrysanthemum"], photoTerms: "Chrysanthemum,flower,garden",
    note: "Pom-pom and spray forms; the traditional flower for respectful occasions across India.",
    varieties: [
      { name: "White Chrysanthemum", colorHex: "#f7f3e8", priceRupees: 30, stock: 400, note: "Serene white pom-poms for tributes and quiet arrangements." },
      { name: "Yellow Chrysanthemum", colorHex: "#f2c94c", priceRupees: 30, stock: 320, note: "Bright domes — the everyday temple and pooja flower in the south." },
      { name: "Pink Spray Chrysanthemum", colorHex: "#eda6c0", priceRupees: 45, stock: 150, note: "Multiple blooms per stem, fills a bouquet fast." },
      { name: "Bronze Chrysanthemum", colorHex: "#a56b3c", priceRupees: 50, stock: 70, note: "Antique copper tone for autumn and rustic wraps." },
      { name: "Red Chrysanthemum", colorHex: "#9b1b30", priceRupees: 34, stock: 0, note: "Deep maroon doubles — currently off-season at the farm." },
    ],
  },
  {
    key: "marigold", label: "Marigolds", latin: "Tagetes erecta", hindi: ["genda", "bandhani", "sevanti", "gendi"], photoTerms: "Tagetes,erecta,marigold",
    note: "The backbone of Indian festivity — strung into bandhani garlands and scattered on puja plates.",
    varieties: [
      { name: "Orange Genda Marigold", colorHex: "#e67e22", priceRupees: 10, stock: 1200, note: "Globe-headed African marigold, 6–8 cm, garland grade." },
      { name: "Yellow Genda Marigold", colorHex: "#f2c230", priceRupees: 10, stock: 1100, note: "Lemon gold, slightly smaller heads, sweet resinous smell." },
      { name: "Banana Marigold", colorHex: "#f6d878", priceRupees: 12, stock: 600, note: "Soft butter-yellow doubles used in wedding decor." },
      { name: "Bandhani (Small) Marigold", colorHex: "#ef9b2f", priceRupees: 6, stock: 1500, note: "Thumb-sized flowers sold by weight for stringing." },
      { name: "French Marigold Mix", colorHex: "#d9682a", priceRupees: 8, stock: 500, note: "Ruffled bi-colour heads — orange, rust and gold." },
    ],
  },
  {
    key: "tuberose", label: "Tuberose", latin: "Polianthes tuberosa", hindi: ["rajnigandha", "sugandhi"], photoTerms: "Polianthes,tuberosa,flower",
    note: "Night-blooming spikes with an intoxicating scent; the most fragrant stem we sell.",
    varieties: [
      { name: "Rajnigandha Tuberose", colorHex: "#fffdf6", priceRupees: 40, stock: 380, note: "Single-flowered spikes, 9–12 blooms, evening fragrance." },
      { name: "Double Tuberose 'Shatabdi'", colorHex: "#f8f0dd", priceRupees: 55, stock: 150, note: "Denser, longer-lasting double blooms for garlands." },
      { name: "Tuberose Bud Sprig", colorHex: "#efe6cd", priceRupees: 25, stock: 90, note: "Tight buds that open overnight on the table." },
    ],
  },
  {
    key: "jasmine", label: "Jasmine", latin: "Jasminum", hindi: ["mogra", "mallige", "jui", "chameli", "motia"], photoTerms: "Jasminum,sambac,mogra",
    note: "South India's everyday offering — sold in strings and loose buds; best used the day it is picked.",
    varieties: [
      { name: "Mogra (Jasminum sambac)", colorHex: "#fdfaf0", priceRupees: 20, stock: 700, note: "Round white buds, intense scent, hair-string favourite." },
      { name: "Chameli (Jasminum pubescens)", colorHex: "#f6f0d8", priceRupees: 15, stock: 520, note: "Smaller open flowers, gentle fragrance, budget-friendly." },
      { name: "Jui (Jasminum auriculatum)", colorHex: "#f9f4e3", priceRupees: 18, stock: 300, note: "Ear-shaped buds; traditional in Maharashtra puja." },
      { name: "Night Jasmine (Parijati)", colorHex: "#fdf6ef", priceRupees: 25, stock: 120, note: "Orange-tipped white stars that fall at dawn — temple only." },
      { name: "Motia (Jasminum multiflorum)", colorHex: "#f4eeda", priceRupees: 30, stock: 0, note: "Fluffy white pom-buds, a Maharashtra favourite — restocking with the monsoon." },
    ],
  },
  {
    key: "sunflower", label: "Sunflowers", latin: "Helianthus annuus", hindi: ["surajmukhi"], photoTerms: "Helianthus,annuus,sunflower",
    note: "Farmer-cut heads from Karnataka and Maharashtra; buy a day ahead — they drink a lot.",
    varieties: [
      { name: "Classic Sunflower", colorHex: "#f4c430", priceRupees: 55, stock: 220, note: "15 cm golden heads, single dark centre." },
      { name: "Pollen-less Sunflower", colorHex: "#f6d264", priceRupees: 70, stock: 130, note: "No messy pollen — the florist's pick for indoor vases." },
      { name: "Mini Sunflower 'Ruby Moon'", colorHex: "#e08a5f", priceRupees: 45, stock: 80, note: "Small branching heads with a reddish eye." },
      { name: "Double Teddy Bear Sunflower", colorHex: "#f7dd7a", priceRupees: 65, stock: 40, note: "Fluffy all-petal pom-pom heads, photogenic and rare." },
    ],
  },
  {
    key: "tulip", label: "Tulips", latin: "Tulipa", hindi: ["tulip"], photoTerms: "Tulipa,garden,tulip",
    note: "Imported air-freight bulbs, February–March only — the price is honest about that.",
    varieties: [
      { name: "Red Tulip", colorHex: "#d63031", priceRupees: 150, stock: 60, note: "Classic cup, sold in dozens only while stock lasts." },
      { name: "Pink Tulip", colorHex: "#ef9fb5", priceRupees: 150, stock: 48, note: "Soft carmine with a satin sheen." },
      { name: "Purple Tulip 'Negrita'", colorHex: "#7a5aa8", priceRupees: 165, stock: 24, note: "Deep aubergine, long stem, dramatic in mono bouquets." },
      { name: "Parrot Tulip", colorHex: "#e8b93f", priceRupees: 190, stock: 0, note: "Fringed bi-colour — seasonal import, currently unavailable." },
    ],
  },
  {
    key: "orchid", label: "Orchids", latin: "Dendrobium & Phalaenopsis", hindi: ["orchid"], photoTerms: "Dendrobium,Phalaenopsis,orchid",
    note: "Thailand and Kullu-grown spikes; the longest-lasting premium stem in the shop.",
    varieties: [
      { name: "Purple Phalaenopsis Stem", colorHex: "#9b59b6", priceRupees: 400, stock: 40, note: "Whole moth-orchid spike, 8–12 blooms, weeks of vase life." },
      { name: "White Dendrobium Spray", colorHex: "#fbf8ef", priceRupees: 180, stock: 90, note: "Cascading white sprays — the luxury bouquet workhorse." },
      { name: "Green Dendrobium 'Sapporo'", colorHex: "#9dc183", priceRupees: 200, stock: 55, note: "Lime flowers with a magenta lip; unusual and modern." },
      { name: "Pink Cymbidium Orchid", colorHex: "#eaa1c4", priceRupees: 220, stock: 30, note: "Waxy blooms on an arching spike, cool-climate import." },
      { name: "Yellow Oncidium (Dancing Lady)", colorHex: "#f5cf3f", priceRupees: 160, stock: 20, note: "Fine sprays of tiny gold flowers that look mid-air." },
    ],
  },
  {
    key: "anthurium", label: "Anthuriums", latin: "Anthurium andraeanum", hindi: ["anthurium", "flamingo flower"], photoTerms: "Anthurium,andraeanum,flower",
    note: "Waxy hearts that last for weeks — the toughest 'exotic' stem available in India.",
    varieties: [
      { name: "Red Anthurium", colorHex: "#c62828", priceRupees: 70, stock: 200, note: "Glossy scarlet spathe with a yellow spadix." },
      { name: "Pink Anthurium", colorHex: "#ee8bb0", priceRupees: 70, stock: 140, note: "Candy pink, slightly smaller heads." },
      { name: "White Anthurium", colorHex: "#f7f4ea", priceRupees: 80, stock: 70, note: "Ivory hearts for minimalist and wedding work." },
      { name: "Purple Anthurium", colorHex: "#7e4f9e", priceRupees: 95, stock: 25, note: "Dyed deep violet — limited weekly lots." },
    ],
  },
  {
    key: "gladiolus", label: "Gladiolus", latin: "Gladiolus", hindi: ["gladiolus", "sword lily"], photoTerms: "Gladiolus,flower,spike",
    note: "Two-foot spikes that open bottom-to-top for ten days; the Mahableshwar and Pune belts supply us.",
    varieties: [
      { name: "Pink Gladiolus", colorHex: "#e78fb3", priceRupees: 45, stock: 220, note: "Large ruffled pink florets on a straight spike." },
      { name: "White Gladiolus", colorHex: "#f9f6ec", priceRupees: 45, stock: 160, note: "Pure white with a faint almond scent." },
      { name: "Salmon Gladiolus", colorHex: "#f0906b", priceRupees: 50, stock: 80, note: "Coral-salmon, popular for autumn table flowers." },
      { name: "Purple Gladiolus", colorHex: "#7c5cad", priceRupees: 52, stock: 35, note: "Plum-violet florets with cream throats." },
    ],
  },
  {
    key: "hydrangea", label: "Hydrangeas", latin: "Hydrangea macrophylla", hindi: ["hydrangea", "hortensia"], photoTerms: "Hydrangea,macrophylla,flower",
    note: "Heavy trusses that wilt fast in dry air — mist them and keep the vase topped up.",
    varieties: [
      { name: "Blue Hydrangea", colorHex: "#6b8fd6", priceRupees: 350, stock: 40, note: "Whole dome head; soil-acidity means the blue varies." },
      { name: "Pink Hydrangea", colorHex: "#eda1bd", priceRupees: 350, stock: 36, note: "Antique pink, fades gracefully when dried." },
      { name: "White Hydrangea", colorHex: "#f6f4ec", priceRupees: 380, stock: 18, note: "Cream domes for wedding arches and table centres." },
    ],
  },
  {
    key: "peony", label: "Peonies", latin: "Paeonia", hindi: ["peony", "paeonia"], photoTerms: "Paeonia,lactiflora,peony",
    note: "The most romantic bloom of the winter import window — here for eight weeks, then gone.",
    varieties: [
      { name: "Coral Charm Peony", colorHex: "#f08b6d", priceRupees: 420, stock: 24, note: "Coral-to-cream globes, opens dramatically in a warm room." },
      { name: "Sarah Bernhardt Peony", colorHex: "#f2c0cf", priceRupees: 450, stock: 12, note: "Ruffled shell pink with a lemon scent — imported, limited." },
      { name: "White Peony", colorHex: "#faf7f0", priceRupees: 430, stock: 0, note: "Snow-white doubles; sold out for this season." },
    ],
  },
  {
    key: "dahlia", label: "Dahlias", latin: "Dahlia pinnata", hindi: ["dahlia", "garden dahlia"], photoTerms: "Dahlia,pinnata,garden",
    note: "Nagercoil and Ooty causal blooms — spectacular for three days, so buy locally and often.",
    varieties: [
      { name: "Red Dahlia", colorHex: "#b71c1c", priceRupees: 65, stock: 45, note: "Cactus-dahlia spikes in true fire-engine red." },
      { name: "Yellow Dahlia", colorHex: "#f6c026", priceRupees: 57, stock: 30, note: "Pom-pom gold balls, fist-sized." },
      { name: "Burgundy Dahlia", colorHex: "#6d1b2e", priceRupees: 70, stock: 20, note: "Near-black wine tones, moody and photogenic." },
      { name: "Pompon Cream Dahlia", colorHex: "#f4e8cf", priceRupees: 62, stock: 0, note: "Tiny cream balls in clusters — waiting for the next cut." },
    ],
  },
  {
    key: "lotus", label: "Lotus", latin: "Nelumbo nucifera", hindi: ["kamal", "thamar"], photoTerms: "Nelumbo,nucifera,lotus",
    note: "Cut at dawn from Chandigarh and Kerala lakes; the buds open in a warm vase within hours.",
    varieties: [
      { name: "Pink Lotus", colorHex: "#e88fa8", priceRupees: 49, stock: 135, note: "Sacred pink blooms with a seed-head centre." },
      { name: "White Lotus", colorHex: "#f8f5ec", priceRupees: 55, stock: 80, note: "Prayer-room classic; stems sold with the leaf." },
      { name: "Lotus Bud with Leaf", colorHex: "#d9a0ae", priceRupees: 35, stock: 200, note: "Closed buds for temple offerings and photos." },
    ],
  },
  {
    key: "hibiscus", label: "Hibiscus", latin: "Hibiscus rosa-sinensis", hindi: ["jasoda", "sembar", "aravindi"], photoTerms: "Hibiscus,rosa-sinensis,flower",
    note: "One-day flowers, so they are picked and shipped the same morning — the freshest thing here.",
    varieties: [
      { name: "Red Hibiscus", colorHex: "#c1121f", priceRupees: 8, stock: 800, note: "Traditional deity flower with a long protruding stigma." },
      { name: "Yellow Hibiscus", colorHex: "#f6ca3f", priceRupees: 10, stock: 300, note: "Buttercup yellow, ruffled petal edges." },
      { name: "Coral Hibiscus", colorHex: "#f08a6a", priceRupees: 12, stock: 120, note: "Peach-coral garden hybrids, double forms when available." },
    ],
  },
  {
    key: "frangipani", label: "Frangipani", latin: "Plumeria", hindi: ["champa", "sona champa", "temple tree"], photoTerms: "Plumeria,rubra,frangipani",
    note: "Waxy, perfumed temple-tree flowers; string them wet and they last two days.",
    varieties: [
      { name: "White Frangipani (Champa)", colorHex: "#fbf8ea", priceRupees: 20, stock: 260, note: "Cream centre, strong evening scent." },
      { name: "Pink Frangipani", colorHex: "#e79ac1", priceRupees: 25, stock: 140, note: "Rose-shaded pinwheel blooms from heritage trees." },
      { name: "Temple Tree Sprig", colorHex: "#f3ecd7", priceRupees: 30, stock: 60, note: "A cut sprig with five open flowers and buds." },
    ],
  },
  {
    key: "oleander", label: "Oleander", latin: "Nerium oleander", hindi: ["kaner", "karavira"], photoTerms: "Nerium,oleander,flower",
    note: "Hedge flowers sold for temple use in the south; keep away from children and pets.",
    varieties: [
      { name: "White Kaner", colorHex: "#f8f6ec", priceRupees: 8, stock: 400, note: "Five-petal white pinwheels on long leaves." },
      { name: "Pink Kaner", colorHex: "#e794ae", priceRupees: 8, stock: 350, note: "Blush pink doubles, very cheap and very fragrant." },
      { name: "Red Oleander Spray", colorHex: "#b32233", priceRupees: 10, stock: 100, note: "Crimson clusters for colour-block arrangements." },
    ],
  },
  {
    key: "alstroemeria", label: "Alstroemeria", latin: "Alstroemeria aurantiaca", hindi: ["peruvian lily", "inka lily"], photoTerms: "Alstroemeria,flower,bouquet",
    note: "Six-to-ten buds per stem and a two-week vase life — the quiet hero of filler flowers.",
    varieties: [
      { name: "Orange Alstroemeria", colorHex: "#f0913f", priceRupees: 60, stock: 180, note: "Freckled orange trumpets." },
      { name: "Pink Alstroemeria", colorHex: "#eda0c0", priceRupees: 60, stock: 150, note: "Salmon-pink with darker streaks." },
      { name: "White Alstroemeria", colorHex: "#f9f7ef", priceRupees: 65, stock: 70, note: "Clean white with yellow thumbs." },
      { name: "Purple Alstroemeria", colorHex: "#9070b0", priceRupees: 70, stock: 40, note: "Lilac sprays, imported Dutch stock." },
    ],
  },
  {
    key: "lisianthus", label: "Lisianthus", latin: "Eustoma grandiflorum", hindi: ["eustoma"], photoTerms: "Eustoma,lisianthus,flower",
    note: "Rose-like ruffles with a longer life; Edaya (Kerala) farms supply us through the year.",
    varieties: [
      { name: "Blue Lisianthus", colorHex: "#7f9fd0", priceRupees: 90, stock: 60, note: "True blue double blooms — rare in nature." },
      { name: "White Lisianthus", colorHex: "#faf8f0", priceRupees: 85, stock: 90, note: "Ivory roses' cheaper, hardier cousin." },
      { name: "Pink Lisianthus Spray", colorHex: "#efadca", priceRupees: 88, stock: 45, note: "Three open flowers plus buds per stem." },
    ],
  },
  {
    key: "snapdragon", label: "Snapdragon", latin: "Antirrhinum majus", hindi: ["snapdragon"], photoTerms: "Antirrhinum,snapdragon,flower",
    note: "Candle-like spikes that add height; Nilgiri-grown and best in cool weather.",
    varieties: [
      { name: "Yellow Snapdragon", colorHex: "#f4d03f", priceRupees: 50, stock: 120, note: "Canary yellow, 70 cm spikes." },
      { name: "Pink Snapdragon", colorHex: "#eb9cbf", priceRupees: 50, stock: 100, note: "Rose-pink twinaz spike, good line flower." },
      { name: "White Snapdragon", colorHex: "#f8f6ee", priceRupees: 55, stock: 55, note: "Bright white for bridal work." },
      { name: "Red Snapdragon", colorHex: "#b0202e", priceRupees: 55, stock: 20, note: "Fired-brick red; limited Ooty lots." },
    ],
  },
  {
    key: "stock", label: "Stock", latin: "Matthiola incana", hindi: ["garden stock"], photoTerms: "Matthiola,incana,stock",
    note: "Fragrant densely-packed spikes; the flower that makes a bouquet smell like a bouquet.",
    varieties: [
      { name: "Lavender Stock", colorHex: "#b3a1d6", priceRupees: 45, stock: 130, note: "Lilac plumes with a clove-like scent." },
      { name: "White Stock", colorHex: "#f7f5ed", priceRupees: 45, stock: 110, note: "Snowy spikes, sweet and clean." },
      { name: "Pink Stock", colorHex: "#eeb0c8", priceRupees: 48, stock: 60, note: "Bubblegum pink, heavy heads." },
    ],
  },
  {
    key: "gypsophila", label: "Baby's Breath", latin: "Gypsophila paniculata", hindi: ["taro", "gypsophila"], photoTerms: "Gypsophila,paniculata,baby%27s+breath",
    note: "A cloud of tiny flowers — sold by the bunch, dried or dyed, it works in every wrap.",
    varieties: [
      { name: "White Baby's Breath Bunch", colorHex: "#f8f6f0", priceRupees: 40, stock: 260, note: "Five-stem bunch, heavy with tiny blooms." },
      { name: "Dyed Pink Gypsophila", colorHex: "#f0aec7", priceRupees: 55, stock: 90, note: "Absorbed colour, keeps for months when dried." },
      { name: "Dyed Blue Gypsophila", colorHex: "#9db6e2", priceRupees: 55, stock: 40, note: "Steel-blue cloud for themed bouquets." },
    ],
  },
  {
    key: "statice", label: "Statice", latin: "Limonium sinuatum", hindi: ["statice", "sea lavender"], photoTerms: "Limonium,sinuatum,statice",
    note: "Papery and everlasting — the classic dried filler that survives a Delhi summer.",
    varieties: [
      { name: "Purple Statice", colorHex: "#8a63b5", priceRupees: 30, stock: 300, note: "Violet wings on wiry branching stems." },
      { name: "Yellow Statice", colorHex: "#f2d24b", priceRupees: 30, stock: 200, note: "Sunny, keeps colour when air-dried." },
      { name: "Pink Statice", colorHex: "#eda7c1", priceRupees: 32, stock: 120, note: "Soft rose bunches for gift wrapping." },
      { name: "Blue Statice", colorHex: "#7c9fd4", priceRupees: 34, stock: 0, note: "Dyed cornflower blue — restock expected next week." },
    ],
  },
  {
    key: "celosia", label: "Celosia", latin: "Celosia cristata", hindi: ["murga keera"], photoTerms: "Celosia,crystallina,cristata",
    note: "Velvet combs and wheat-like plumes; cheap, bold and drought-tolerant as a cut flower.",
    varieties: [
      { name: "Red Coxcomb Celosia", colorHex: "#b21f2d", priceRupees: 22, stock: 240, note: "Brain-shaped velvet crests, deep crimson." },
      { name: "Yellow Celosia Plume", colorHex: "#f0bf2e", priceRupees: 20, stock: 180, note: "Feathery plumes for garland work." },
      { name: "Orange Celosia", colorHex: "#ef8a3b", priceRupees: 22, stock: 90, note: "Burnt-orange spikes, dries well." },
    ],
  },
  {
    key: "amaranthus", label: "Amaranthus", latin: "Amaranthus caudatus", hindi: ["rajgira", "love-lies-bleeding"], photoTerms: "Amaranthus,caudatus,tassel",
    note: "Long tassel tails that drape over the edge of a bouquet — the movement flower.",
    varieties: [
      { name: "Green Amaranthus Tassel", colorHex: "#8fbf6d", priceRupees: 40, stock: 110, note: "Chartreuse tails, fresh or dried." },
      { name: "Burgundy Love-Lies-Blinding", colorHex: "#7d1f30", priceRupees: 45, stock: 60, note: "Wine-red 50 cm tails for dramatic draping." },
    ],
  },
  {
    key: "delphinium", label: "Delphinium", latin: "Delphinium grandiflorum", hindi: ["larkspur"], photoTerms: "Delphinium,larkspur,flower",
    note: "Spikes of true blue — the only reliable natural blue in Indian cut-flower trade.",
    varieties: [
      { name: "Blue Delphinium", colorHex: "#4a78c9", priceRupees: 120, stock: 45, note: "Two-foot royal blue candles, imported weekly." },
      { name: "White Delphinium", colorHex: "#f8f7f0", priceRupees: 120, stock: 20, note: "Ivory spikes with dark anthers." },
      { name: "Lavender Delphinium", colorHex: "#a89ad6", priceRupees: 130, stock: 0, note: "Pale lilac — on hold till the Spiti harvest." },
    ],
  },
  {
    key: "ranunculus", label: "Ranunculus", latin: "Ranunculus asiaticus", hindi: ["ranunculus"], photoTerms: "Ranunculus,asiaticus,flower",
    note: "Dozens of papery concentric petals; the most delicate stem we handle, so order a day ahead.",
    varieties: [
      { name: "Coral Ranunculus", colorHex: "#f47f63", priceRupees: 140, stock: 40, note: "Layered coral globes on hollow stems." },
      { name: "Blush Ranunculus", colorHex: "#f3bccd", priceRupees: 140, stock: 30, note: "Rose-pink, opens from a tight paper ball." },
      { name: "White Ranunculus", colorHex: "#faf8f2", priceRupees: 150, stock: 12, note: "Chalk white with a black centre." },
    ],
  },
  {
    key: "callalily", label: "Calla Lilies", latin: "Zantedeschia aethiopica", hindi: ["calla"], photoTerms: "Zantedeschia,calla,lily",
    note: "Sculptural trumpets — architectural, long-lived and the choice for modern, minimal wraps.",
    varieties: [
      { name: "White Calla Lily", colorHex: "#f8f6ee", priceRupees: 120, stock: 90, note: "The classic bridal trumpet with a yellow spadix." },
      { name: "Yellow Calla Lily", colorHex: "#f4cf3d", priceRupees: 130, stock: 45, note: "Golden hybrids, smaller and vivid." },
      { name: "Purple Calla Lily", colorHex: "#7a4a86", priceRupees: 145, stock: 18, note: "Deep aubergine with speckled throats." },
    ],
  },
  {
    key: "birdsparadise", label: "Bird of Paradise", latin: "Strelitzia reginae", hindi: ["strelitzia"], photoTerms: "Strelitzia,reginae,bird%20of%20paradise",
    note: "A crane head in an orange calyx; each bloom lasts three weeks and looks sculpted.",
    varieties: [
      { name: "Bird of Paradise", colorHex: "#eb7b29", priceRupees: 250, stock: 35, note: "Single stem, one or two flowers, tropical statement." },
      { name: "White Bird of Paradise", colorHex: "#f6f4ea", priceRupees: 300, stock: 8, note: "Caesiolavia — rare, ordered on request." },
    ],
  },
  {
    key: "protea", label: "Proteas", latin: "Protea cynaroides", hindi: ["king protea"], photoTerms: "Protea,cynaroides,flower",
    note: "Dried-and-fresh crown flowers that keep for months; the Instagram flower of 2026.",
    varieties: [
      { name: "King Protea", colorHex: "#e5a6b6", priceRupees: 420, stock: 15, note: "The largest bloom in the shop — dinner-plate pink." },
      { name: "Pink Ice Protea", colorHex: "#d98aa4", priceRupees: 350, stock: 20, note: "Silver-tipped cups, dries without losing colour." },
      { name: "Smoky Protea", colorHex: "#9c7f95", priceRupees: 260, stock: 0, note: "Sage-pink, on backorder from South Africa." },
    ],
  },
  {
    key: "aster", label: "Asters", latin: "Symphyotrichum", hindi: ["aster"], photoTerms: "Symphyotrichum,aster,flower",
    note: "Daisy-like sprays, cheap and cheerful; Kodaikanal aster keeps bouquets from looking thin.",
    varieties: [
      { name: "Purple Aster Spray", colorHex: "#8367b3", priceRupees: 35, stock: 260, note: "Yellow-eyed violet daisies, four heads per stem." },
      { name: "Pink Aster", colorHex: "#eda4c3", priceRupees: 35, stock: 180, note: "Rose-pink sprays, good filler." },
      { name: "White Aster", colorHex: "#f8f6ef", priceRupees: 38, stock: 100, note: "Snowy single petals with gold centres." },
      { name: "Russian Aster", colorHex: "#b6b9dd", priceRupees: 30, stock: 0, note: "Wild lilac, weather-dependent — sold out this week." },
    ],
  },
  {
    key: "zinnia", label: "Zinnias", latin: "Zinnia elegans", hindi: ["zinnia"], photoTerms: "Zinnia,elegans,flower",
    note: "The hardest-working garden flower in India — a week in a vase for the price of a samosa.",
    varieties: [
      { name: "Scarlet Zinnia", colorHex: "#c8202f", priceRupees: 15, stock: 400, note: "Double scarlet heads, 8 cm across." },
      { name: "Lilac Zinnia", colorHex: "#b48fd0", priceRupees: 15, stock: 300, note: "Pale lilac with a green eye." },
      { name: "Zinnia Mix (Bundle of 10)", colorHex: "#ef9d4f", priceRupees: 12, stock: 250, note: "Farm-mixed colours, bundled by weight." },
    ],
  },
  {
    key: "daisy", label: "Daisies", latin: "Bellis perennis", hindi: ["daisy", "bellis"], photoTerms: "Bellis,perennis,daisy",
    note: "Everyday daisies and Shasta daisies — the friendliest, least pretentious flowers here.",
    varieties: [
      { name: "Shasta Daisy", colorHex: "#f9f8f0", priceRupees: 30, stock: 220, note: "Large white daisies with gold button centres." },
      { name: "Yellow Shasta Daisy", colorHex: "#f5d84f", priceRupees: 32, stock: 90, note: "Cream-to-yellow petals, long stems." },
      { name: "Pink Daisy Spray", colorHex: "#ee9dbd", priceRupees: 34, stock: 45, note: "Soft pink singles, kids' birthday favours." },
    ],
  },
  {
    key: "temple-stems", label: "Temple & Everyday Stems", latin: "Various", hindi: ["pooja phool"], photoTerms: "Indian,temple,flower,offering",
    note: "Loose, unglamorous and bought daily — the flowers Indian households actually keep for puja.",
    varieties: [
      { name: "Aboli (Crossandra)", colorHex: "#e8722c", priceRupees: 12, stock: 600, note: "Orange pinwheel stems, strung into Maharashtrian gajras." },
      { name: "Champa (Michelia champaca)", colorHex: "#e9b731", priceRupees: 30, stock: 220, note: "Pale gold and intensely perfumed — the classic hardy champa." },
      { name: "Nag Chameli", colorHex: "#f7f3e4", priceRupees: 20, stock: 160, note: "Ironwood jasmine; waxy white flowers with a long-lasting scent." },
      { name: "Motia Bud Sprig", colorHex: "#f4f0dc", priceRupees: 15, stock: 300, note: "Clustered round buds that open overnight in a damp cloth." },
      { name: "Tulsi Sprig (pooja stem)", colorHex: "#5c8a5c", priceRupees: 8, stock: 400, note: "Whole ram-tulsi spikes with leaves and flowers for offerings." },
    ],
  },
  {
    key: "foliage", label: "Foliage & Greenery", latin: "Foliage", hindi: ["patte", "greens"], photoTerms: "foliage,greenery,leaves",
    note: "The greens that make a bouquet look arranged rather than collected — sold per stem.",
    varieties: [
      { name: "Ruscus Bunch", colorHex: "#4c7a58", priceRupees: 30, stock: 400, note: "Berry-dotted glossy sprays; lasts three weeks." },
      { name: "Leather Leaf Fern", colorHex: "#3d6b4a", priceRupees: 25, stock: 350, note: "Wide leathery fronds for the back of a wrap." },
      { name: "Tie-Leaf / Aspidistra", colorHex: "#557f52", priceRupees: 28, stock: 200, note: "Long strap leaves, also used as cone liners." },
      { name: "Monstera Leaf", colorHex: "#2f5d3a", priceRupees: 60, stock: 60, note: "One split leaf = one photo-worthy arrangement." },
      { name: "Eucalyptus Cinerea", colorHex: "#9db4a4", priceRupees: 70, stock: 40, note: "Silver-dollar stems with a clean medicinal scent." },
      { name: "Palm Spear Leaf", colorHex: "#41683f", priceRupees: 20, stock: 250, note: "Traditional south-Indian decor frond for entrances." },
    ],
  },
];

export interface SeedFlower {
  slug: string;
  name: string;
  colorHex: string;
  pricePerStemPaise: number;
  stockStems: number;
  description: string;
  /** Keywords the storefront uses to find real photographs of this flower. */
  photoTerms: string;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Expands the families above into flat flower rows for the seeder. */
export function flowerRecords(): SeedFlower[] {
  const out: SeedFlower[] = [];
  for (const family of FLOWER_FAMILIES) {
    for (const v of family.varieties) {
      const aliases = [family.hindi[0], family.latin].filter(Boolean).join(" · ");
      out.push({
        slug: slugify(v.name),
        name: v.name,
        colorHex: v.colorHex,
        pricePerStemPaise: Math.round(v.priceRupees * 100),
        stockStems: v.stock,
        description:
          `${v.name} — ${v.note} ${family.note} ` +
          `Known in Indian markets as: ${aliases}. Sold per stem; loose stems can be mixed in the bouquet builder.`,
        photoTerms: family.photoTerms,
      });
    }
  }
  // Slugs must be unique: a collision gets the family key appended (never a number),
  // so slugs stay meaningful and stable across re-seeds.
  const seen = new Set<string>();
  for (let i = 0; i < out.length; i++) {
    const f = out[i];
    if (seen.has(f.slug)) f.slug = `${f.slug}-${f.photoTerms.split(",")[1] ?? "stem"}`;
    let n = 2;
    while (seen.has(f.slug)) f.slug = `${f.slug}-${n++}`;
    seen.add(f.slug);
  }
  return out;
}

export const FLOWER_COUNT = flowerRecords().length;
