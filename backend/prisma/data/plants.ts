/**
 * BloomNest plant catalogue — demonstration data.
 * ------------------------------------------------
 * 120+ nursery stock that Indian garden centres actually carry, grouped by
 * growing style. Price = the *base* (nursery pot, small) in RUPEES; the seed
 * script derives pot/size variants from the group's `pots` table so every
 * plant ends up with 2–3 purchasable variants with their own price & stock.
 *
 * `watering` / `light` are ordinary horticultural guidance, not a promise
 * that the plant will thrive in your flat — a course demo can't know your
 * balcony's sun hours.
 */

export interface PlantSpecies {
  name: string;
  latin: string;
  priceRupees: number;
  stock: number;
  note: string;
  /** Optional overrides when the group default is wrong for this species. */
  watering?: string;
  light?: string;
}

export interface PlantPotTier {
  potType: string;
  size: string;
  label: string;
  /** Multiplier on the base price for this pot/size. */
  multiplier: number;
  /** Fraction of the plant's stock figure allocated to this variant (0–1). */
  stockShare: number;
}

export interface PlantGroup {
  key: string;
  label: string;
  watering: string;
  light: string;
  careNotes: string;
  photoTerms: string;
  pots: PlantPotTier[];
  species: PlantSpecies[];
}

const FOLIAGE_POTS: PlantPotTier[] = [
  { potType: "Nursery", size: "Small", label: "Nursery pot · Small", multiplier: 1, stockShare: 0.6 },
  { potType: "Ceramic", size: "Medium", label: "Ceramic pot · Medium", multiplier: 2.1, stockShare: 0.3 },
  { potType: "Ceramic", size: "Large", label: "Ceramic pot · Large", multiplier: 3.4, stockShare: 0.1 },
];

const SUCCULENT_POTS: PlantPotTier[] = [
  { potType: "Grow Bag", size: "Small", label: "Grow bag · Small", multiplier: 1, stockShare: 0.7 },
  { potType: "Terracotta", size: "Medium", label: "Terracotta pot · Medium", multiplier: 2.2, stockShare: 0.3 },
];

const HERB_POTS: PlantPotTier[] = [
  { potType: "Nursery", size: "Small", label: "Nursery bag · Small", multiplier: 1, stockShare: 0.75 },
  { potType: "Terracotta", size: "Medium", label: "Terracotta pot · Medium", multiplier: 1.9, stockShare: 0.25 },
];

const TREE_POTS: PlantPotTier[] = [
  { potType: "Grow Bag", size: "1 ft", label: "Grow bag · 1 ft plant", multiplier: 1, stockShare: 0.5 },
  { potType: "Half Barrel", size: "3 ft", label: "Half barrel · 3 ft plant", multiplier: 3.2, stockShare: 0.35 },
  { potType: "Planter", size: "5 ft", label: "Floor planter · 5 ft plant", multiplier: 6.5, stockShare: 0.15 },
];

export const PLANT_GROUPS: PlantGroup[] = [
  {
    key: "indoor-foliage", label: "Indoor foliage", watering: "Water when the top 2–3 cm of soil is dry (about weekly indoors)",
    light: "Bright indirect light; tolerates indoor filtered light", careNotes: "Rotate a quarter turn weekly, wipe dust off leaves, never let roots sit in the saucer.",
    photoTerms: "houseplant,foliage,potted", pots: FOLIAGE_POTS,
    species: [
      { name: "Money Plant (Golden Pothos)", latin: "Epipremnum aureum", priceRupees: 199, stock: 60, note: "The near-indestructible creeper; grows in water or soil and is said to bring prosperity." },
      { name: "Neon Pothos", latin: "Epipremnum aureum 'Neon'", priceRupees: 249, stock: 30, note: "Lime-chartreuse leaves that light up a dark shelf." },
      { name: "Marble Queen Pothos", latin: "Epipremnum aureum 'Marble Queen'", priceRupees: 279, stock: 22, note: "Cream-marbled foliage; needs more light to keep its variegation." },
      { name: "Philodendron Brasil", latin: "Philodendron hederaceum", priceRupees: 289, stock: 26, note: "Quick-growing heartleaf with a lime stripe down each leaf." },
      { name: "Heartleaf Philodendron", latin: "Philodendron hederaceum", priceRupees: 249, stock: 34, note: "Trailing matte-green hearts, forgiving of missed waterings." },
      { name: "Monstera Deliciosa", latin: "Monstera deliciosa", priceRupees: 549, stock: 18, note: "The split-leaf classic; give it a moss pole and it climbs to the ceiling." },
      { name: "Monstera Adansonii", latin: "Monstera adansonii", priceRupees: 449, stock: 20, note: "Swiss-cheese vine — smaller leaves, plenty of holes." },
      { name: "Rhaphidophora Tetrasperma", latin: "Rhaphidophora tetrasperma", priceRupees: 499, stock: 8, note: "Mini-Monstera look without the size; slow, so priced accordingly." },
      { name: "Snake Plant Laurentii", latin: "Dracaena trifasciata", priceRupees: 349, stock: 40, note: "Yellow-edged swords that survive AC rooms and forgetful owners." },
      { name: "Snake Plant Cylindrica", latin: "Dracaena angolensis", priceRupees: 449, stock: 14, note: "Braided cylindrical stems — an architectural sculptural piece." },
      { name: "ZZ Plant", latin: "Zamioculcas zamiifolia", priceRupees: 399, stock: 28, note: "Glossy, rhizome-stored and famous for thriving on neglect." },
      { name: "ZZ 'Raven' (Black ZZ)", latin: "Zamioculcas zamiifolia 'Raven'", priceRupees: 899, stock: 5, note: "New leaves fade from lime to near-black — the collector's ZZ." },
      { name: "Peace Lily", latin: "Spathiphyllum wallisii", priceRupees: 379, stock: 24, note: "White spathes for months and a dramatic droop that tells you it is thirsty." },
      { name: "Chinese Evergreen 'Silver Queen'", latin: "Aglaonema commutatum", priceRupees: 329, stock: 26, note: "Silver-splashed leaves; one of the few plants that likes a dim office." },
      { name: "Aglaonema 'Cutlass'", latin: "Aglaonema 'Cutlass'", priceRupees: 399, stock: 12, note: "Grey-green lance leaves, very compact — desk sized." },
      { name: "Dieffenbachia Reflector", latin: "Dieffenbachia seguine", priceRupees: 359, stock: 15, note: "Cream-splashed canes. Sap is irritating — keep away from children and pets." },
      { name: "Dracaena Marginata", latin: "Dracaena marginata", priceRupees: 599, stock: 16, note: "Thin whips on a woody cane; a lobby and reception standard." },
      { name: "Dracaena Goldstar", latin: "Dracaena fragrans 'Goldstar'", priceRupees: 549, stock: 11, note: "Broad gold-striped leaves; tolerant of low light." },
      { name: "Song of India", latin: "Dracaena reflexa", priceRupees: 429, stock: 19, note: "Tiny variegated leaves packed on twisted branches." },
      { name: "Cast Iron Plant", latin: "Aspidistra elatior", priceRupees: 379, stock: 9, note: "Called cast iron for a reason — corridors, stairwells, neglect." },
      { name: "Pilea Peperomioides", latin: "Pilea peperomioides", priceRupees: 349, stock: 22, note: "UFO-shaped leaves that produce pups you can gift." },
      { name: "Peperomia Obtusifolia", latin: "Peperomia obtusifolia", priceRupees: 279, stock: 30, note: "Baby rubber plant — thick glossy spoons, compact." },
      { name: "Fittonia Nerve Plant", latin: "Fittonia albivenis", priceRupees: 199, stock: 35, note: "Pink-veined mesh leaves; faints when dry, recovers in an hour." },
      { name: "Hoya Carnosa (Wax Plant)", latin: "Hoya carnosa", priceRupees: 399, stock: 13, note: "Thick trailing vines and, if content, fragrant porcelain flowers." },
      { name: "String of Hearts", latin: "Ceropegia woodii", priceRupees: 349, stock: 17, note: "Silver-marbled hearts on hair-thin vines; loves a sunny windowsill." },
      { name: "Chain of Hearts", latin: "Ceropegia bushii", priceRupees: 449, stock: 6, note: "Darker, longer leaves than String of Hearts — slower and dearer." },
      { name: "English Ivy", latin: "Hedera helix", priceRupees: 299, stock: 14, note: "Cool-room creeper; keep it out of Delhi summers' direct noon sun." },
      { name: "Tradescantia Zebrina", latin: "Tradescantia zebrina", priceRupees: 199, stock: 42, note: "Silver and purple inchworm vine, roots from a single node." },
      { name: "Swedish Ivy", latin: "Plectranthus verticillatus", priceRupees: 249, stock: 25, note: "Scalloped glossy leaves; fast, forgiving hanging basket plant." },
      { name: "Asparagus Fern Meyers", latin: "Asparagus densiflorus 'Meyersii'", priceRupees: 299, stock: 20, note: "Foxtail plumes — not a true fern and much tougher than one." },
      { name: "Asparagus Fern Myers 'Umbellatus'", latin: "Asparagus densiflorus", priceRupees: 269, stock: 18, note: "Airy sprays for the back of a bouquet-style planter." },
      { name: "Air Plant (Tillandsia)", latin: "Tillandsia ionantha", priceRupees: 179, stock: 40, note: "No soil at all — soak 20 minutes a week and give it airflow.", watering: "Soak weekly for 20 minutes; mist in dry months" },
    ],
  },
  {
    key: "ferns-palms", label: "Ferns & palms", watering: "Keep evenly moist; mist fronds in dry summer",
    light: "Filtered light to shade; never harsh afternoon sun", careNotes: "Brown tips mean the air is dry — mist or move to a bathroom window.",
    photoTerms: "fern,palm,fronds", pots: FOLIAGE_POTS,
    species: [
      { name: "Boston Fern", latin: "Nephrolepis exaltata", priceRupees: 299, stock: 30, note: "The archetypal hanging fern; perfumes a shaded veranda." },
      { name: "Bird's Nest Fern", latin: "Asplenium nidus", priceRupees: 399, stock: 16, note: "A rosette of undivided glossy fronds — far more forgiving than Boston." },
      { name: "Spider Plant", latin: "Chlorophytum comosum", priceRupees: 199, stock: 50, note: "Arching leaves and endless baby plantlets — the easiest hanging plant there is." },
      { name: "Areca Palm", latin: "Dypsis lutescens", priceRupees: 649, stock: 18, note: "Feather-frond clump that turns a corner into a tropical corner. Pet-safe." },
      { name: "Lady Palm", latin: "Rhapis excelsa", priceRupees: 899, stock: 7, note: "Slow, elegant and the best palm for genuinely low light." },
      { name: "Parlor Palm", latin: "Chamaedorea elegans", priceRupees: 449, stock: 20, note: "Compact, affordable, Victorian-favourite house palm." },
      { name: "Foxtail Fern", latin: "Asparagus meyeri", priceRupees: 329, stock: 15, note: "Bottle-brush tails; tolerates more sun than true ferns." },
      { name: "Staghorn Fern (mounted)", latin: "Platycerium bifurcatum", priceRupees: 799, stock: 6, note: "Epiphyte on a wooden board — water by soaking the board weekly." },
      { name: "Sago Palm", latin: "Cycas revoluta", priceRupees: 549, stock: 12, note: "A cycad, not a palm, and mildly toxic if chewed — keep off the floor." },
      { name: "Bamboo Palm", latin: "Chamaedorea seifrizii", priceRupees: 499, stock: 0, note: "Slim clumping palm for a bright corner — listing paused while the nursery re-establishes stock." },
    ],
  },
  {
    key: "succulents", label: "Succulents & cacti", watering: "Soak and dry completely — every 10–15 days in winter, weekly in summer",
    light: "At least 4 hours of direct sun; indoor windowsills stretch them", careNotes: "Gritty mix (50% perlite/pumice). Most losses come from watering, never from forgetting.",
    photoTerms: "succulent,cactus,desert", pots: SUCCULENT_POTS,
    species: [
      { name: "Aloe Vera", latin: "Aloe barbadensis miller", priceRupees: 199, stock: 70, note: "Kitchen first-aid plant for burns and summer coolers; needs sharp drainage." },
      { name: "Aloe Polyphylla", latin: "Aloe polyphylla", priceRupees: 899, stock: 4, note: "The spiral aloe — a collector piece, and fussy about heat." },
      { name: "Jade Plant", latin: "Crassula ovata", priceRupees: 299, stock: 40, note: "Coin-leaved bonsai-style gift plant for new homes and shops." },
      { name: "Jade 'Hummel's Sunset'", latin: "Crassula ovata 'Hummel's Sunset'", priceRupees: 449, stock: 12, note: "Red-edged in winter sun — the colour-jade everyone asks for." },
      { name: "Money Maker Succulent", latin: "Crassula 'Moneymaker'", priceRupees: 349, stock: 18, note: "Ridged crassula, very slow, very architectural." },
      { name: "Echeveria Elegans", latin: "Echeveria elegans", priceRupees: 149, stock: 60, note: "Pale blue-green rosettes; the classic terracotta-plate succulent." },
      { name: "Echeveria 'Perle von Nürnberg'", latin: "Echeveria 'Perle von Nürnberg'", priceRupees: 229, stock: 25, note: "Lilac-grey rosettes with pink edges in strong light." },
      { name: "Zebra Haworthia", latin: "Haworthiopsis attenuata", priceRupees: 199, stock: 45, note: "White-tubercled leaves; the best succulent for lower light." },
      { name: "String of Pearls", latin: "Curio rowleyanus", priceRupees: 299, stock: 22, note: "Green beads on a trailing stem — needs sun and a light hand with water." },
      { name: "String of Bananas", latin: "Curio herreanus", priceRupees: 349, stock: 10, note: "Banana-shaped beads; faster than String of Pearls." },
      { name: "Burro's Tail", latin: "Sedum morganianum", priceRupees: 299, stock: 16, note: "Heavy trailing tails — hang it where you will not brush past." },
      { name: "Crown of Thorns", latin: "Euphorbia milii", priceRupees: 249, stock: 30, note: "Thorny canes with year-round red or yellow bracts; sap is irritant." },
      { name: "Bunny Ear Cactus", latin: "Opuntia microdasys", priceRupees: 299, stock: 14, note: "Soft-looking pads with hairless glochids — still use gloves." },
      { name: "Golden Barrel Cactus", latin: "Echinocactus grusonii", priceRupees: 649, stock: 6, note: "A gold-spined sphere for a sunny balcony; grows slowly for years." },
      { name: "Ball Cactus (Notocactus)", latin: "Parodia leninghausii", priceRupees: 249, stock: 20, note: "Clustered yellow-spined balls that offset generously." },
      { name: "Fairy Castle Cactus", latin: "Cereus repandus 'Peruvians'", priceRupees: 399, stock: 11, note: "Vertical columns like a crenellated castle; blooms at night, once." },
      { name: "Pencil Cactus", latin: "Euphorbia tirucalli", priceRupees: 449, stock: 8, note: "Bare coral-like sticks. Sap is caustic — pruning is a serious job." },
      { name: "Christmas Cactus", latin: "Schlumbergera bridgesii", priceRupees: 299, stock: 24, note: "Winter blooms if you keep it cool and slightly dry from October." },
      { name: "Kalanchoe Florescens", latin: "Kalanchoe blossfeldiana", priceRupees: 199, stock: 38, note: "The long-lasting potted florist kalanchoe — weeks of small flowers." },
      { name: "Sedum Mix (Assorted Tray)", latin: "Sedum spp.", priceRupees: 399, stock: 15, note: "Six different sedums in one tray for a living wall or dish." },
      { name: "Lithops (Living Stones)", latin: "Lithops spp.", priceRupees: 249, stock: 9, note: "Pebble mimics; water only around flowering, then leave them alone." },
      { name: "Euphorbia Enneogona", latin: "Euphorbia echinus", priceRupees: 349, stock: 7, note: "Dark spiralled columns — an easy 'cactus' that isn't one." },
      { name: "Agave Victoriae-reginae", latin: "Agave victoriae-reginae", priceRupees: 799, stock: 4, note: "White-marked geometric rosette, near-indestructible and slow." },
      { name: "Snake Plant Moonshine", latin: "Dracaena trifasciata 'Moonshine'", priceRupees: 549, stock: 0, note: "Pale silver-green leaves — sold out while the grower divides beds." },
    ],
  },
  {
    key: "flowering-pots", label: "Flowering pot plants", watering: "Twice weekly in growing season; never waterlogged",
    light: "4–6 hours of sun for blooms; shade means leaves, not flowers", careNotes: "Deadhead spent flowers and feed every 3 weeks with a balanced liquid fertiliser.",
    photoTerms: "flowering,potted,plant", pots: FOLIAGE_POTS,
    species: [
      { name: "Anthurium Pot Plant", latin: "Anthurium andraeanum", priceRupees: 549, stock: 25, note: "Red or pink wax hearts for months indoors; likes humidity, not sun." },
      { name: "Phalaenopsis Orchid (Potted)", latin: "Phalaenopsis grandiflora", priceRupees: 1299, stock: 10, note: "Moth orchid in a clear pot with bark mix; spikes last 8–12 weeks." },
      { name: "African Violet", latin: "Saintpaulia ionantha", priceRupees: 249, stock: 28, note: "Velvet leaves and violet blooms on a cool windowsill; water from below." },
      { name: "Begonia Rex", latin: "Begonia rex-cultorum", priceRupees: 349, stock: 18, note: "Grown for spiral silver and burgundy foliage rather than flowers." },
      { name: "Bougainvillea (Potted)", latin: "Bougainvillea glabra", priceRupees: 399, stock: 32, note: "Thirsty, sun-hungry and reliable — the 'paper flower' climber." },
      { name: "Bougainvillea 'Mary Palmer'", latin: "Bougainvillea 'Mary Palmer'", priceRupees: 599, stock: 9, note: "Double lavender-pink bracts; grafted, so pricier." },
      { name: "Hibiscus Rosa-Sinensis (Potted)", latin: "Hibiscus rosa-sinensis", priceRupees: 349, stock: 26, note: "Daily red trumpets; feed heavily through the monsoon for best bloom." },
      { name: "Gardenia Grandiflora", latin: "Gardenia jasminoides", priceRupees: 599, stock: 12, note: "Divinely scented whites; acidic soil and patience required." },
      { name: "Mogra (Jasminum sambac) Bush", latin: "Jasminum sambac", priceRupees: 299, stock: 40, note: "The fragrant jasmine hedge for puja; prune hard after each flush." },
      { name: "Chameli (Jasminum pubescens)", latin: "Jasminum pubescens", priceRupees: 249, stock: 36, note: "Smaller, hardier and cheaper than mogra; blooms through monsoon." },
      { name: "Ixora Dwarf", latin: "Ixora coccinea", priceRupees: 249, stock: 34, note: "Jungle geranium — orange clusters all year in warm coastal climates." },
      { name: "Geranium Pink", latin: "Pelargonium hortorum", priceRupees: 229, stock: 30, note: "Cool-season windowsill bloomer; hates humid Delhi Augusts." },
      { name: "Petunia Mix", latin: "Petunia hybrida", priceRupees: 179, stock: 44, note: "Trailing trumpet flush in winter; pinch to keep it bushy." },
      { name: "Vinca (Sadabahar)", latin: "Catharanthus roseus", priceRupees: 149, stock: 55, note: "The Indian 'evergreen' — flowers in heat where others sulk." },
      { name: "Chrysanthemum Pot", latin: "Chrysanthemum indicum", priceRupees: 279, stock: 20, note: "Short-day winter blooms; pinch until September for a full dome." },
      { name: "Marigold Pot (Block)", latin: "Tagetes erecta", priceRupees: 149, stock: 48, note: "Compact genda for doorsteps and balcony edges." },
      { name: "Salvia Red", latin: "Salvia splendens", priceRupees: 179, stock: 26, note: "Scarlet winter spikes, common in Indian park bedding." },
      { name: "Verbena Mix", latin: "Verbena hybrida", priceRupees: 189, stock: 22, note: "Trailing flower clusters; loves containers and full sun." },
      { name: "Calendula Pot", latin: "Calendula officinalis", priceRupees: 159, stock: 18, note: "Edible orange petals for winter salads and skin oils." },
      { name: "Dahlia Tuber (Flowering Pot)", latin: "Dahlia pinnata", priceRupees: 299, stock: 0, note: "Tuber listings open in October — currently unavailable." },
      { name: "Rosa 'Landscape' Potted Rose", latin: "Rosa hybrida", priceRupees: 449, stock: 15, note: "Ground-cover roses in bloom from November; needs 6 hours of sun." },
      { name: "Plumeria Cutting (Potted)", latin: "Plumeria rubra", priceRupees: 399, stock: 14, note: "Champa branch that roots easily; fragrant summer flowers." },
    ],
  },
  {
    key: "herbs", label: "Kitchen herbs & edibles", watering: "Daily in summer, every 2–3 days in winter; morning watering best",
    light: "4+ hours of direct sun; mint and coriander take part shade", careNotes: "Harvest from the top to force bushiness; grow from seed for the cheapest kitchen garden.",
    photoTerms: "herb,edible,kitchen,garden", pots: HERB_POTS,
    species: [
      { name: "Tulsi — Rama", latin: "Ocimum tenuiflorum", priceRupees: 99, stock: 90, note: "The everyday sacred tulsi with green leaves and a hot-mint taste." },
      { name: "Tulsi — Shyama (Krishna)", latin: "Ocimum tenuiflorum 'Shyama'", priceRupees: 119, stock: 70, note: "Purple-stemmed, cooler and more anise-like; kadha favourite." },
      { name: "Tulsi — Vana (Wild)", latin: "Ocimum gratissimum", priceRupees: 129, stock: 40, note: "Strong clove scent, shrubby, resists powdery mildew." },
      { name: "Pudina (Spearmint)", latin: "Mentha spicata", priceRupees: 79, stock: 85, note: "The curd-and-chutney mint; give it water and it takes the pot." },
      { name: "Apple Mint", latin: "Mentha suaveolens", priceRupees: 99, stock: 40, note: "Soft fuzzy leaves with a fruity note — nice in summer water." },
      { name: "Coriander (Dhaniya)", latin: "Coriandrum sativum", priceRupees: 69, stock: 65, note: "Sow every three weeks for a continuous supply; bolts in heat." },
      { name: "Methi (Fenugreek)", latin: "Trigonella foenum-graecum", priceRupees: 59, stock: 50, note: "Cut-and-come-again microgreens in 10 days from seed." },
      { name: "Palak (Spinach)", latin: "Spinacia oleracea", priceRupees: 69, stock: 45, note: "Winter leafy; a shaded balcony keeps leaves tender." },
      { name: "Curry Leaf Plant", latin: "Murraya koenigii", priceRupees: 199, stock: 55, note: "The tadka tree; slow to establish, then years of leaves." },
      { name: "Lemongrass", latin: "Cymbopogon citratus", priceRupees: 129, stock: 60, note: "Chives for soups and the mosquito-deterrent hedge everyone claims." },
      { name: "Rosemary", latin: "Salvia rosmarinus", priceRupees: 199, stock: 30, note: "Mediterranean and fussy about wet feet — terracotta and grit." },
      { name: "Thyme", latin: "Thymus vulgaris", priceRupees: 149, stock: 24, note: "Low woody mat; pick sprigs for oils and roasts." },
      { name: "Oregano / Marjoram", latin: "Origanum vulgare", priceRupees: 149, stock: 26, note: "Pizza herb that handles Indian monsoon humidity better than basil." },
      { name: "Sweet Basil", latin: "Ocimum basilicum", priceRupees: 99, stock: 58, note: "Genovese basil for pesto; pinch flowers the moment they appear." },
      { name: "Lemon Balm", latin: "Melissa officinalis", priceRupees: 129, stock: 30, note: "Citrus-mint leaves for evening tea; half shade in summer." },
      { name: "Stevia", latin: "Stevia rebaudiana", priceRupees: 149, stock: 22, note: "Sweet leaves for tea — the sugar-free garden plant." },
      { name: "Giloy (Guduchi)", latin: "Tinospora cordifolia", priceRupees: 179, stock: 34, note: "Ayurvedic creeper for a trellis or a support tree." },
      { name: "Ashwagandha", latin: "Withania somnifera", priceRupees: 149, stock: 20, note: "Small shrub grown for its roots; harvest after 5 months." },
      { name: "Aloe Vera (Kadwa)", latin: "Aloe barbadensis", priceRupees: 169, stock: 48, note: "Thicker-juiced eating aloe for morning shots; separate from cosmetic aloe." },
      { name: "Pan / Betel Leaf", latin: "Piper betle", priceRupees: 249, stock: 25, note: "A shade-loving vine on a wall or moss pole; ceremonial leaves." },
      { name: "Pandan (Kewra)", latin: "Pandanus amaryllifolius", priceRupees: 179, stock: 18, note: "Aromatic rice leaf for biryani and desserts; needs humidity." },
      { name: "Chilli — Byadgi", latin: "Capsicum annuum", priceRupees: 99, stock: 52, note: "Wrinkled deep-red drying chilli; fruitful in a 12-inch pot." },
      { name: "Chilli — Guntur Sannam", latin: "Capsicum annuum", priceRupees: 89, stock: 56, note: "The everyday hot chilli for tadka; one plant feeds a family." },
      { name: "Brinjal (Baby Purple)", latin: "Solanum melongena", priceRupees: 99, stock: 40, note: "Round purple brinjals on a compact bush; needs sun and stake." },
      { name: "Tomato — cherry (determinate)", latin: "Solanum lycopersicum", priceRupees: 89, stock: 44, note: "Snacking cherries in a grow bag; feed weekly once flowering." },
      { name: "Lettuce — Romaine", latin: "Lactuca sativa", priceRupees: 89, stock: 32, note: "Cool-season leaves; harvest outer ones and the heart follows." },
      { name: "Kale", latin: "Brassica oleracea acephala", priceRupees: 129, stock: 18, note: "Winter's hardiest salad green; frost sweetens the leaves." },
      { name: "Strawberry (Chandler)", latin: "Fragaria × ananassa", priceRupees: 249, stock: 22, note: "Mahabaleshwar variety; needs winter chill and runners pinched off." },
      { name: "Rajgira / Amaranth Greens", latin: "Amaranthus viridis", priceRupees: 69, stock: 40, note: "Palia saag that self-seeds in a corner of the balcony." },
      { name: "Garlic Chives", latin: "Allium tuberosum", priceRupees: 119, stock: 26, note: "Cut-and-regrow flavour for parathas; white flowers are edible too." },
    ],
  },
  {
    key: "fruit-trees", label: "Fruiting & balcony trees", watering: "Deep watering twice a week in summer; mulch the basin",
    light: "Full sun, 6+ hours — fruit trees will not tolerate a dark balcony", careNotes: "Grafted plants fruit in 2–3 years; feed with organic matter each October and February.",
    photoTerms: "fruit,tree,mango,orchard", pots: TREE_POTS,
    species: [
      { name: "Mango — Alphonso (grafted)", latin: "Mangifera indica 'Alphonso'", priceRupees: 899, stock: 14, note: "Ratnagiri scion; needs space, full sun and patience for the first fruit." },
      { name: "Mango — Lucknow-4 (Langra)", latin: "Mangifera indica 'Langra'", priceRupees: 749, stock: 20, note: "Green-skinned, fibreless and more tolerant of north-Indian winters." },
      { name: "Mango — Dasheri", latin: "Mangifera indica 'Dasheri'", priceRupees: 699, stock: 24, note: "The UP classic; heavy cropper in 6–8 years." },
      { name: "Guava — Allahabad Safeda", latin: "Psidium guajava", priceRupees: 549, stock: 18, note: "White-fleshed, self-fruitful and one of the fastest to bear." },
      { name: "Guava — Red Fleshed (Lal)", latin: "Psidium guajava 'Lal'", priceRupees: 649, stock: 10, note: "Pink pulp, heavy cropper, pruning after each flush keeps it small." },
      { name: "Pomegranate — Bhagwa", latin: "Punica granatum 'Bhagwa'", priceRupees: 599, stock: 16, note: "Arils the colour of saffron; does well in a large grow bag." },
      { name: "Pomegranate — Ganesh", latin: "Punica granatum 'Ganesh'", priceRupees: 549, stock: 12, note: "Soft-seeded and early; the popular home-garden choice." },
      { name: "Sapota / Chikoo", latin: "Manilkara zapota", priceRupees: 599, stock: 9, note: "Slow evergreen with malty brown fruit; likes coastal humidity." },
      { name: "Custard Apple (Sitaphal)", latin: "Annona reticulata", priceRupees: 549, stock: 11, note: "Hardy small tree for the drier parts of the country." },
      { name: "Sugar Apple (Seevandam)", latin: "Annona squamosa", priceRupees: 499, stock: 15, note: "The sweetest of the annonas; prunes hard after harvest." },
      { name: "Sweet Orange — Mosambi", latin: "Citrus sinensis 'Mosambi'", priceRupees: 649, stock: 14, note: "The citrus that actually fruits on a Delhi balcony in a tub." },
      { name: "Lemon — Kagzi", latin: "Citrus aurantifolia", priceRupees: 449, stock: 26, note: "Kagzi nimbu, flowers off and on all year; hand-pollinate indoors." },
      { name: "Lime — Kaghaz Pink", latin: "Citrus hystrix", priceRupees: 499, stock: 8, note: "Aromatic kaffir-type leaves plus sour fruit for chutneys." },
      { name: "Jamun (Blackberry)", latin: "Syzygium cumini", priceRupees: 549, stock: 6, note: "Big shade tree; the fruit keeps birds and children busy in June." },
      { name: "Ber (Indian Jujube)", latin: "Ziziphus mauritiana", priceRupees: 449, stock: 12, note: "Thrives in poor, dry soil and small pots; winter fruit." },
      { name: "Amla (Nelli)", latin: "Phyllanthus emblica", priceRupees: 499, stock: 10, note: "Vitamin-C powerhouse and a traditional shade tree." },
      { name: "Papaya — Red Lady", latin: "Carica papaya 'Red Lady'", priceRupees: 299, stock: 30, note: "Bisexual, fast, fruits within a year; needs warmth and drainage." },
      { name: "Banana — Dwarf Cavendish", latin: "Musa acuminata 'Dwarf Cavendish'", priceRupees: 449, stock: 18, note: "Reaches 5 ft, fruits in 15 months and dies after — pups replace it." },
      { name: "Banana — Rajapuri (Nendran)", latin: "Musa 'Nendran'", priceRupees: 499, stock: 7, note: "The Kerala chip banana; longer season, bigger pot." },
      { name: "Coconut — Dwarf Green", latin: "Cocos nucifera 'Channeri'", priceRupees: 699, stock: 9, note: "Dwarf nut-bearing coconut; 3 years to tender nuts, needs heat." },
      { name: "Areca Nut (Supari)", latin: "Areca catechu", priceRupees: 649, stock: 5, note: "Slim palms for a courtyard in humid coastal belts." },
      { name: "Avocado (Hass seedling)", latin: "Persea americana", priceRupees: 799, stock: 4, note: "Grown for the leaves as much as the fruit in India; needs cool nights." },
      { name: "Dragon Fruit Cutting (Potted)", latin: "Hylocereus undatus", priceRupees: 349, stock: 22, note: "A cactus vine on a pole; fruits in 18 months in warm climates." },
      { name: "Mulberry (Shahtoot)", latin: "Morus alba 'Shahtoot'", priceRupees: 549, stock: 11, note: "Long black fruits; hardy and happy with heavy winter pruning." },
      { name: "Fig (Anjeer)", latin: "Ficus carica", priceRupees: 599, stock: 8, note: "Deciduous and superb in a tub — dry roots in summer set more fruit." },
      { name: "Wood Apple (Bilva)", latin: "Aegle marmelos", priceRupees: 449, stock: 6, note: "Sacred, drought-proof and a genuinely good summer sharbat." },
      { name: "Karak / Date Palm", latin: "Phoenix dactylifera", priceRupees: 549, stock: 7, note: "Medjool-type seedlings; needs desert heat and full sun to fruit." },
    ],
  },
  {
    key: "outdoor", label: "Outdoor, hedge & shade trees", watering: "Weekly for the first year, then rainfall does most of it",
    light: "Full sun; these are courtyard and compound plants", careNotes: "Stake young trees loosely and prune structural forks while they are thin.",
    photoTerms: "garden,tree,shade,flowering", pots: TREE_POTS,
    species: [
      { name: "Neem", latin: "Azadirachta indica", priceRupees: 249, stock: 40, note: "The compound's best friend — shade, pest repellent, and near-indestructible." },
      { name: "Peepal", latin: "Ficus religiosa", priceRupees: 299, stock: 12, note: "Sacred and enormous; plant 20 ft from any wall or pipe, always." },
      { name: "Banyan (Baby)", latin: "Ficus benghalensis", priceRupees: 349, stock: 6, note: "A future forest — only for large open ground." },
      { name: "Ashoka", latin: "Saraca asoca", priceRupees: 399, stock: 14, note: "Orange-and-yellow flower clusters in spring; small enough for courtyards." },
      { name: "Amaltas (Golden Shower)", latin: "Cassia fistula", priceRupees: 449, stock: 10, note: "Cascades of yellow in April; Thailand's national tree and an Indian favourite." },
      { name: "Gulmohar", latin: "Delonix regia", priceRupees: 449, stock: 8, note: "Flame-of-the-forest; needs warm dry air, so not for the hills." },
      { name: "Jacaranda", latin: "Jacaranda mimosifolia", priceRupees: 499, stock: 9, note: "Lilac spring canopy; likes Delhi, Pune and Bengaluru climates." },
      { name: "Tabebuia (Pink Trumpet)", latin: "Handroanthus impetigosus", priceRupees: 449, stock: 11, note: "Bare branches erupting pink — the Instagram tree of February." },
      { name: "Karanj", latin: "Pongamia pinnata", priceRupees: 299, stock: 18, note: "Native roadside tree that tolerates salinity and neglect." },
      { name: "Bakul", latin: "Mimusops elengi", priceRupees: 399, stock: 7, note: "Glossy leaves and tiny, intensely fragrant evening flowers." },
      { name: "Hibiscus Hedge (Assorted)", latin: "Hibiscus rosa-sinensis", priceRupees: 199, stock: 45, note: "Half-dozen hybrids in one lot for a flowering boundary." },
      { name: "Bougainvillea Sapling (Assorted)", latin: "Bougainvillea spectabilis", priceRupees: 249, stock: 38, note: "Purple, orange and white mix for arches and walls." },
      { name: "Mogra Hedge Sapling", latin: "Jasminum sambac", priceRupees: 229, stock: 34, note: "Fragrant evergreen border; flowers May to October." },
      { name: "Rosa Hedge Sapling", latin: "Rosa hybrida", priceRupees: 249, stock: 26, note: "Chai-roses in bulk for winter flowering hedges." },
      { name: "Hibiscus 'Cooperi' Variegated", latin: "Hibiscus acephalus 'Cooperi'", priceRupees: 349, stock: 9, note: "Cream-and-green leaves with white trumpets; grown for foliage." },
      { name: "Croton Assorted", latin: "Codiaeum variegatum", priceRupees: 199, stock: 30, note: "Red, gold and green leaves; colour deepens with more sun." },
      { name: "Moringa (Drumstick)", latin: "Moringa oleifera", priceRupees: 199, stock: 25, note: "Fast, useful and humbled by pruning — pods and leaves both eaten." },
      { name: "Noni", latin: "Morinda citrifolia", priceRupees: 299, stock: 6, note: "Coastal shrub with a very strong-smelling fruit. Very." },
      { name: "Vitex (Nirgundi)", latin: "Vitex negundo", priceRupees: 179, stock: 20, note: "Lavender-flowered medicinal shrub for hedging; pollinator magnet." },
      { name: "Rangoon Creeper", latin: "Quisqualis indica", priceRupees: 349, stock: 12, note: "Fragrant climber that opens white and turns deep pink by morning." },
      { name: "Confederate Jasmine", latin: "Trachelospermum jasminoides", priceRupees: 299, stock: 15, note: "Star jasmine for a pergola; blooms in spring with a sweet note." },
    ],
  },
  {
    key: "aquatic", label: "Pond & aquatic", watering: "Standing water only — keep the pot submerged at 5–15 cm",
    light: "6+ hours of direct sun or the plant grows but never flowers", careNotes: "Aquatic soil only — garden compost fouls the water and kills fish.",
    photoTerms: "aquatic,pond,water,lily", pots: [{ potType: "Aquatic Basket", size: "Medium", label: "Aquatic basket · Medium", multiplier: 1, stockShare: 0.6 }, { potType: "Glazed Bowl", size: "Large", label: "Glazed bowl with pebbles", multiplier: 2.4, stockShare: 0.4 }],
    species: [
      { name: "Lotus (Nelumbo) Tuber Pot", latin: "Nelumbo nucifera", priceRupees: 599, stock: 16, note: "Sacred pink blooms for a tub or pond; needs real sun and silt." },
      { name: "White Water Lily", latin: "Nymphaea lotus", priceRupees: 449, stock: 14, note: "Day-blooming lily for a small pond or a big water tank." },
      { name: "Blue Water Lily", latin: "Nymphaea stellata", priceRupees: 499, stock: 8, note: "Star-shaped blue flowers, the native 'nilambal' of Kerala tanks." },
      { name: "Water Hyacinth", latin: "Eichhornia crassipes", priceRupees: 99, stock: 60, note: "Fast floating purifier — never dump it into open waterways." },
      { name: "Moneywort (Lysimachia)", latin: "Lysimachia nummularia", priceRupees: 149, stock: 30, note: "Cascading green coins for a waterfall edge or pond rim." },
      { name: "Hornwort", latin: "Ceratophyllum demersum", priceRupees: 129, stock: 26, note: "Oxygenating submerged bunch for aquariums and tanks." },
      { name: "Vallisneria (Java Grass)", latin: "Vallisneria spiralis", priceRupees: 149, stock: 24, note: "Ribbon grass for aquarium backgrounds; unkillable with light." },
      { name: "Duckweed Mix", latin: "Lemna minor", priceRupees: 79, stock: 40, note: "A spoonful to start; it doubles in days and feeds fish." },
      { name: "Pond Moss (Bryum)", latin: "Bryum argenteum", priceRupees: 199, stock: 0, note: "Marginal moss mat — out of stock until the monsoon collection." },
    ],
  },
  {
    key: "exotic-carnivorous", label: "Carnivorous & exotic", watering: "Rain or RO water only — minerals burn their roots; keep the tray wet",
    light: "Bright filtered light; 4 hours of gentle morning sun", careNotes: "Never fertilise and never feed meat — live insects only, and only a few.",
    photoTerms: "carnivorous,plant,nepenthes", pots: [{ potType: "Nursery", size: "Small", label: "Nursery pot · Small", multiplier: 1, stockShare: 0.7 }, { potType: "Glass Terrarium", size: "Medium", label: "Glass terrarium · Medium", multiplier: 2.8, stockShare: 0.3 }],
    species: [
      { name: "Nepenthes (Tropical Pitcher)", latin: "Nepenthes alata", priceRupees: 899, stock: 6, note: "Crimson pitchers on a climbing vine; needs humidity above 50%." },
      { name: "Venus Flytrap", latin: "Dionaea muscipula", priceRupees: 599, stock: 9, note: "Snap traps that only fire for live bugs; dormant and brown in winter." },
      { name: "Sundew", latin: "Drosera capensis", priceRupees: 399, stock: 12, note: "Sticky ruby tentacles; the easiest temperate carnivore." },
      { name: "Butterwort", latin: "Pinguicula moranensis", priceRupees: 449, stock: 5, note: "Greasy rosette leaves that curl around fungus gnats. Handy near compost." },
      { name: "Living Stone / Conophytum", latin: "Conophytum calculus", priceRupees: 499, stock: 3, note: "Grape-like succulents from Namaqualand; water only when they wrinkle." },
      { name: "Blue Java Banana (Ice Cream)", latin: "Musa 'Blue Java'", priceRupees: 1499, stock: 2, note: "Silver-blue leaves and vanilla-ish fruit — a novelty collector plant." },
      { name: "Monstera Albo Variegata Cutting", latin: "Monstera deliciosa 'Albo'", priceRupees: 4999, stock: 1, note: "White-splashed cuttings, rooted in perlite. Priced like the rarity it is." },
      { name: "Variegated Hoya Kerri (Single Leaf)", latin: "Hoya kerrii variegata", priceRupees: 349, stock: 0, note: "Heart-shaped single leaves; sold out after Valentine's — next lot in May." },
    ],
  },
  {
    key: "bulbs", label: "Bulbs, tubers & seedlings", watering: "Moist while in growth, dry while dormant",
    light: "Full sun for most; lilies like cool roots in shade", careNotes: "Plant with the pointed end up and 2× the bulb's height in soil.",
    photoTerms: "bulb,tuber,planting,flower", pots: [{ potType: "Bulb Packet", size: "6 pack", label: "Packet of 6 bulbs", multiplier: 1, stockShare: 0.7 }, { potType: "Bulb Packet", size: "12 pack", label: "Packet of 12 bulbs", multiplier: 1.8, stockShare: 0.3 }],
    species: [
      { name: "Lily Bulbs (Asiatic Mix)", latin: "Lilium asiaticum", priceRupees: 399, stock: 24, note: "October–November planting for February colour on a north balcony." },
      { name: "Gladiolus Corms", latin: "Gladiolus cardinalis", priceRupees: 249, stock: 30, note: "Corms for the autumn flush; stake them as the spike lengthens." },
      { name: "Dahlia Tubers", latin: "Dahlia pinnata", priceRupees: 299, stock: 18, note: "Each eye gives one plant; pinch once for bushier blooms." },
      { name: "Tulip Bulbs (imported)", latin: "Tulipa gesneriana", priceRupees: 899, stock: 6, note: "Cold-treated Dutch bulbs for December pots; won't perennialise in the plains." },
      { name: "Narcissus (Daffodil) Bulbs", latin: "Narcissus pseudonarcissus", priceRupees: 549, stock: 10, note: "Requires a genuine cold winter — hills-gardeners only." },
      { name: "Hyacinth Bulbs", latin: "Hyacinthus orientalis", priceRupees: 499, stock: 12, note: "Scented blue spikes for a winter bowl; forces well in water." },
      { name: "Freesia Corms", latin: "Freesia refracta", priceRupees: 299, stock: 16, note: "Lemon-scented spring corms; plant in October in the plains." },
      { name: "Calla Lily Rhizomes", latin: "Zantedeschia aethiopica", priceRupees: 399, stock: 8, note: "Rhizomes for a moist corner or a pond edge." },
      { name: "Rain Lily Bulbs", latin: "Zephyranthes carinata", priceRupees: 179, stock: 28, note: "Pink rain lilies burst open with the first monsoon shower." },
      { name: "Agapanthus Clumps", latin: "Agapanthus africanus", priceRupees: 349, stock: 14, note: "Blue umbrellas for Ooty-and-Shillong-style gardens." },
    ],
  },
];

export interface SeedPlant {
  slug: string;
  name: string;
  description: string;
  careWatering: string;
  careLight: string;
  careNotes: string;
  photoTerms: string;
  variants: Array<{ potType: string; size: string; label: string; pricePaise: number; stock: number }>;
}

/** Expands groups × species into plant rows with pot/size variants. */
/** Storefront-style slug: drop the parenthetical, keep it lowercase-kebab. */
function slugify(name: string): string {
  return name.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function plantRecords(): SeedPlant[] {
  const out: SeedPlant[] = [];
  const used = new Set<string>();
  for (const group of PLANT_GROUPS) {
    for (const s of group.species) {
      let slug = slugify(s.name);
      let n = 2;
      while (used.has(slug)) slug = `${slugify(s.name)}-${group.key}-${n++}`;
      used.add(slug);
      const variants = group.pots.map((pot, i) => ({
        potType: pot.potType,
        size: pot.size,
        label: pot.label,
        pricePaise: Math.round(s.priceRupees * pot.multiplier * 100),
        // A few variants are intentionally zero so the sold-out UI is exercised.
        stock: s.stock === 0 ? 0 : Math.max(1, Math.round(s.stock * pot.stockShare) - i),
      }));
      out.push({
        slug,
        name: s.name,
        description: `${s.name} — ${s.note} Botanical name: ${s.latin}. ${group.label} group: ${group.careNotes}`,
        careWatering: s.watering ?? group.watering,
        careLight: s.light ?? group.light,
        careNotes: `${group.careNotes} Botanical name: ${s.latin}.`,
        photoTerms: `${s.latin.split(" ")[0]},${group.key.replace(/-/g, ",")}`,
        variants,
      });
    }
  }
  return out;
}

export const PLANT_COUNT = plantRecords().length;
