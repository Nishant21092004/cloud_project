/**
 * Real photography for catalogue items.
 * ------------------------------------
 * A shop of 146 flowers and 193 plants cannot ship 1 300 hand-picked photos
 * inside a course project, and clip-art flowers look nothing like a florist. So
 * the storefront asks **Wikimedia Commons** for photographs of the exact species,
 * by botanical name, at view time:
 *
 *   product name  →  botanical query ("Yellow Dahlia" → `Dahlia yellow`)
 *               →  Commons `generator=search` (namespace 6 = File:)
 *               →  3–4 real JPEG thumbnails + photographer + licence
 *
 * Why Commons and not a stock API: no key, no quota plan, CORS enabled
 * (`origin=*`), CC-licensed — and the licence + author are rendered under the
 * photo, which a stock scrape usually silently breaks.
 *
 * Degradation order, because a demo laptop can be offline:
 *   1. admin-uploaded photo (`/uploads/…`) or a bundled asset → always wins
 *   2. Commons photographs for the species
 *   3. the keyword fallback URL stored on the product (seeded LoremFlickr)
 *   4. artwork drawn here, tinted with the product's own colour (`artwork.ts`)
 * A product never shows a broken-image icon; the last step needs no network.
 *
 * Requests are deduplicated by query, capped at 4 in flight, cached in
 * sessionStorage for a few days, and only fired for cards that scroll into
 * view — 339 products do not mean 339 HTTP calls.
 *
 * See docs/IMAGES.md for the licence obligations this pipeline takes on.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { artworkFor } from "./artwork";

export type ProductKind = "flower" | "plant" | "bouquet";

export interface ProductPhoto {
  url: string;
  /** Photographer credit as plain text (HTML stripped). */
  credit?: string;
  /** Short licence name, e.g. "CC BY-SA 4.0". */
  license?: string;
  /** File description page — the canonical attribution target. */
  pageUrl?: string;
  /** Commons file title, useful in alt text. */
  title?: string;
}

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CACHE_PREFIX = "bn.photos.v1.";
const CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000; // photographs do not change hourly
const REQUEST_TIMEOUT_MS = 7000;
const MAX_IN_FLIGHT = 4;

/* ── names → photographs that actually match the shelf label ──────────── */

/** Search terms per species. The botanical name is what gives correct results. */
const SPECIES_TERMS: Record<string, string> = {
  // cut flowers
  rose: "Rosa rose", gerbera: "Gerbera jamesonii", lily: "Lilium lily", asiatic: "Lilium asiatic",
  orientallily: "Lilium orientalis", stargazer: "Lilium stargazer", carnation: "Dianthus caryophyllus",
  chrysanthemum: "Chrysanthemum indicum", marigold: "Tagetes erecta marigold", genda: "Tagetes erecta marigold",
  bandhani: "Tagetes marigold", tuberose: "Polianthes tuberosa", rajnigandha: "Polianthes tuberosa",
  sunflower: "Helianthus annuus", tulip: "Tulipa", orchid: "Phalaenopsis orchid", dendrobium: "Dendrobium spray",
  cymbidium: "Cymbidium orchid", oncidium: "Oncidium orchid", anthurium: "Anthurium andraeanum",
  gladiolus: "Gladiolus spike", hydrangea: "Hydrangea macrophylla", peony: "Paeonia lactiflora",
  dahlia: "Dahlia pinnata", lotus: "Nelumbo nucifera", kamal: "Nelumbo nucifera",
  hibiscus: "Hibiscus rosa-sinensis", frangipani: "Plumeria rubra", champa: "Michelia champaca",
  oleander: "Nerium oleander", kaner: "Nerium oleander", jasmine: "Jasminum sambac", mogra: "Jasminum sambac",
  chameli: "Jasminum pubescens", jui: "Jasminum sambac", motia: "Jasminum multiflorum",
  alstroemeria: "Alstroemeria aurantiaca", lisianthus: "Eustoma grandiflorum", eustoma: "Eustoma grandiflorum",
  snapdragon: "Antirrhinum majus", stock: "Matthiola incana", gypsophila: "Gypsophila paniculata",
  "babys-breath": "Gypsophila paniculata", statice: "Limonium sinuatum", limonium: "Limonium sinuatum",
  celosia: "Celosia cristata", amaranthus: "Amaranthus caudatus", delphinium: "Delphinium larkspur",
  ranunculus: "Ranunculus asiaticus", calla: "Zantedeschia aethiopica", strelitzia: "Strelitzia reginae",
  protea: "Protea cynaroides", aster: "Aster novae-angliae", zinnia: "Zinnia elegans", daisy: "Bellis perennis daisy",
  baby: "Gypsophila paniculata", breath: "Gypsophila paniculata", moonshine: "Dracaena trifasciata moonshine",
  "love-lies-blinding": "Amaranthus caudatus", "birds-of-paradise": "Strelitzia reginae",
  "string of hearts": "Ceropegia woodii", "chain of hearts": "Ceropegia bushii",
  "mary palmer": "Bougainvillea 'Mary Palmer'",   crossandra: "Crossandra infundibuliformis", aboli: "Crossandra infundibuliformis",
  "night-jasmine": "Nyctanthes arbor-tristis", parijati: "Nyctanthes arbor-tristis",
  tulsi: "Ocimum tenuiflorum", ruscus: "Ruscus hypoglossum", monstera: "Monstera deliciosa leaf",
  eucalyptus: "Eucalyptus cinerea", aspidistra: "Aspidistra elatior leaf",
  // nursery plants
  pothos: "Epipremnum aureum", "money-plant": "Epipremnum aureum", philodendron: "Philodendron hederaceum",
  "monstera-adansonii": "Monstera adansonii", rhaphidophora: "Rhaphidophora tetrasperma",
  sansevieria: "Dracaena trifasciata", "snake-plant": "Dracaena trifasciata", zz: "Zamioculcas zamiifolia",
  "peace-lily": "Spathiphyllum", spathiphyllum: "Spathiphyllum", aglaonema: "Aglaonema commutatum",
  dieffenbachia: "Dieffenbachia seguine", dracaena: "Dracaena marginata", marginata: "Dracaena marginata",
  "cast-iron": "Aspidistra elatior", pilea: "Pilea peperomioides", peperomia: "Peperomia obtusifolia",
  fittonia: "Fittonia albivenis", hoya: "Hoya carnosa", ceropegia: "Ceropegia woodii",
  ivy: "Hedera helix", tradescantia: "Tradescantia zebrina", asparagus: "Asparagus densiflorus",
  tillandsia: "Tillandsia ionantha", nephrolepis: "Nephrolepis exaltata", asplenium: "Asplenium nidus",
  areca: "Dypsis lutescens", rhapis: "Rhapis excelsa", chamaedorea: "Chamaedorea elegans",
  cycas: "Cycas revoluta", platycerium: "Platycerium bifurcatum", aloe: "Aloe barbadensis miller",
  crassula: "Crassula ovata jade", jade: "Crassula ovata jade", echeveria: "Echeveria elegans",
  haworthia: "Haworthiopsis attenuata", "string-of-pearls": "Senecio rowleyanus", rowleyanus: "Senecio rowleyanus",
  sedum: "Sedum morganianum", euphorbia: "Euphorbia milii", opuntia: "Opuntia microdasys",
  echinocactus: "Echinocactus grusonii", parodia: "Parodia leninghausii", cereus: "Cereus repandus",
  schlumbergera: "Schlumbergera buckleyi", kalanchoe: "Kalanchoe blossfeldiana", lithops: "Lithops",
  agave: "Agave victoriae-reginae", gardenia: "Gardenia jasminoides", ixora: "Ixora coccinea",
  pelargonium: "Pelargonium zonale", geranium: "Pelargonium zonale", petunia: "Petunia hybrida",
  vinca: "Catharanthus roseus", salvia: "Salvia splendens", verbena: "Verbena hybrida",
  calendula: "Calendula officinalis", bougainvillea: "Bougainvillea glabra", "spider-plant": "Chlorophytum comosum",
  chlorophytum: "Chlorophytum comosum", mint: "Mentha spicata", pudina: "Mentha spicata",
  coriander: "Coriandrum sativum", dhaniya: "Coriandrum sativum", fenugreek: "Trigonella foenum-graecum",
  methi: "Trigonella foenum-graecum", spinach: "Spinacia oleracea", palak: "Spinacia oleracea",
  "curry-leaf": "Murraya koenigii", lemongrass: "Cymbopogon citratus", rosemary: "Salvia rosmarinus",
  thyme: "Thymus vulgaris", oregano: "Origanum vulgare", basil: "Ocimum basilicum",
  stevia: "Stevia rebaudiana", giloy: "Tinospora cordifolia", ashwagandha: "Withania somnifera",
  betel: "Piper betle", pandan: "Pandanus amaryllifolius", chilli: "Capsicum annuum plant",
  brinjal: "Solanum melongena", tomato: "Solanum lycopersicum", lettuce: "Lactuca sativa",
  kale: "Brassica oleracea", strawberry: "Fragaria ananassa", moringa: "Moringa oleifera",
  mango: "Mangifera indica", guava: "Psidium guajava", pomegranate: "Punica granatum",
  chikoo: "Manilkara zapota", custard: "Annona squamosa", seevandam: "Annona squamosa",
  mosambi: "Citrus sinensis", lemon: "Citrus limon", kagzi: "Citrus aurantifolia",
  jamun: "Syzygium cumini", ber: "Ziziphus mauritiana", amla: "Phyllanthus emblica",
  papaya: "Carica papaya", banana: "Musa acuminata", coconut: "Cocos nucifera",
  supari: "Areca catechu", avocado: "Persea americana", "dragon-fruit": "Hylocereus undatus",
  mulberry: "Morus alba", anjeer: "Ficus carica", fig: "Ficus carica", bilva: "Aegle marmelos",
  khajoor: "Phoenix dactylifera", neem: "Azadirachta indica", peepal: "Ficus religiosa",
  bargad: "Ficus benghalensis", ashoka: "Saraca asoca", amaltas: "Cassia fistula",
  gulmohar: "Delonix regia", jacaranda: "Jacaranda mimosifolia", tabebuia: "Tabebuia rosea",
  karanj: "Pongamia pinnata", bakul: "Mimusops elengi", croton: "Codiaeum variegatum",
  noni: "Morinda citrifolia", nirgundi: "Vitex negundo", "rangon-creeper": "Quisqualis indica",
  "confederate-jasmine": "Trachelospermum jasminoides", "water-lily": "Nymphaea alba",
  hyacinth: "Eichhornia crassipes", moneywort: "Lysimachia nummularia", hornwort: "Ceratophyllum demersum",
  vallisneria: "Vallisneria spiralis", duckweed: "Lemna minor", nepenthes: "Nepenthes alata",
  "venus-flytrap": "Dionaea muscipula", sundew: "Drosera capensis", butterwort: "Pinguicula",
  conophytum: "Conophytum calculus", "blue-java": "Musa acuminata 'Blue Java'", narcissus: "Narcissus pseudonarcissus",
  daffodil: "Narcissus pseudonarcissus", freesia: "Freesia refracta", "rain-lily": "Zephyranthes rosea",
  agapanthus: "Agapanthus africanus", lilybulb: "Lilium bulb", gladioluscorm: "Gladiolus corm",
  // ready-made bouquets
  bouquet: "flower bouquet hand tied", "hand-tied": "flower bouquet",
};

/** Colour words worth adding to the search so a "Yellow Dahlia" is not a red one. */
const COLOURS = [
  "red", "pink", "white", "yellow", "orange", "purple", "blue", "lavender", "peach", "burgundy",
  "coral", "cream", "green", "violet", "scarlet", "ivory", "golden", "gold", "black", "silver",
  "salmon", "lilac", "magenta", "apricot", "maroon", "crimson", "plum", "wine", "bronze", "ruby",
];

/** Words that describe packaging, not the plant — useless as search terms. */
const NOISE_WORDS = new Set([
  "plant", "plants", "potted", "pot", "pots", "bunch", "bunches", "stem", "stems", "sprig", "sprigs",
  "cutting", "cuttings", "mix", "assorted", "grade", "pack", "packet", "single", "loose", "fresh",
  "bulb", "bulbs", "corm", "corms", "tuber", "tubers", "rhizome", "rhizomes", "clump", "sapling",
  "bush", "hedge", "the", "and", "with", "of", "for", "mini", "grand", "premium", "value", "any",
  "time", "moon", "unicorn",
]);

/** Hyphen and space keys are treated as the same phrase. */
const SPECIES_LOOKUP: Record<string, string> = Object.fromEntries(
  Object.entries(SPECIES_TERMS).map(([key, value]) => [key.replace(/-/g, " "), value]),
);

/** Stuff that shows up in Commons searches and is definitely not a product photo. */
const SKIP_TITLE = /(map|diagram|chart|flag|coat of arms|emblem|logo|stamp|banknote|coin|engraving|drawing|sketch|illustration|poster|scan|sheet music|herbarium|botanical illustration|line drawing|graph|anatomy|dissect)/i;

function normaliseToken(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9-]/g, "");
}

/**
 * Build the Commons search string for a product. Deterministic — the same name
 * always produces the same query, so a re-render never re-fetches.
 *
 * Matching goes from most specific to least: the whole name, then consecutive
 * two/three-word phrases, then single words (with a naive singular fallback),
 * and finally the most distinctive remaining words of the name.
 */
export function photoQueryFor(name: string, kind: ProductKind): string {
  if (kind === "bouquet") return "flower bouquet";

  const plain = name
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/['"`][^'"`]*['"`]?/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = plain.split(" ").filter((w) => w.length > 1);
  const meaningful = words.filter((w) => w.length > 2 && !NOISE_WORDS.has(w));

  let terms: string | undefined;
  const tryKeys = (candidate: string) =>
    SPECIES_LOOKUP[candidate] ?? SPECIES_LOOKUP[candidate.replace(/s$/, "")];

  const full = words.join(" ");
  terms = tryKeys(full);
  for (let size = Math.min(3, words.length); !terms && size >= 2; size--) {
    for (let i = 0; i + size <= words.length && !terms; i++) terms = tryKeys(words.slice(i, i + size).join(" "));
  }
  for (let i = 0; !terms && i < words.length; i++) terms = tryKeys(words[i]);
  if (!terms) {
    const picked = meaningful.length ? meaningful : words;
    terms = picked.slice(0, 3).join(" ");
  }

  const colour = words.find((w) => COLOURS.includes(w));
  if (colour && !terms.toLowerCase().includes(colour)) terms = `${terms} ${colour}`;
  if (kind === "plant") terms += " potted plant";
  return terms.trim();
}

/* ── fetching, deduplicated + throttled + cached ─────────────────────── */

const memoryCache = new Map<string, ProductPhoto[]>();
const pending = new Map<string, Promise<ProductPhoto[]>>();
const queue: Array<() => void> = [];
let running = 0;

function schedule<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      running += 1;
      task().finally(() => {
        running -= 1;
        const next = queue.shift();
        if (next) next();
      }).then(resolve, reject);
    };
    if (running < MAX_IN_FLIGHT) run();
    else queue.push(run);
  });
}

function readCache(key: string): ProductPhoto[] | null {
  const hit = memoryCache.get(key);
  if (hit) return hit;
  try {
    const raw = sessionStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at: number; photos: ProductPhoto[] };
    if (Date.now() - parsed.at > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    memoryCache.set(key, parsed.photos);
    return parsed.photos;
  } catch {
    return null;
  }
}

function writeCache(key: string, photos: ProductPhoto[]) {
  memoryCache.set(key, photos);
  try {
    sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ at: Date.now(), photos }));
  } catch {
    /* private mode / quota — the memory cache still did its job */
  }
}

function stripHtml(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const text = value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (!text || /^(self-?published|own work|public domain)$/i.test(text)) return undefined;
  return text.slice(0, 60);
}

interface CommonsImageInfo {
  thumburl?: string;
  url?: string;
  mime?: string;
  descriptionurl?: string;
  extmetadata?: { Artist?: { value?: string }; LicenseShortName?: { value?: string } };
}

/** Ask Wikimedia Commons for real photographs of this species. */
export async function fetchSpeciesPhotos(query: string, count = 4): Promise<ProductPhoto[]> {
  const cached = readCache(query);
  if (cached) return cached.slice(0, count);

  const inflight = pending.get(query);
  if (inflight) return (await inflight).slice(0, count);

  const request = schedule(async (): Promise<ProductPhoto[]> => {
    const params = new URLSearchParams({
      action: "query", format: "json", origin: "*",
      generator: "search", gsrsearch: `${query} filetype:bitmap`, gsrnamespace: "6",
      gsrlimit: String(Math.min(24, count * 6)),
      prop: "imageinfo", iiprop: "url|mime|extmetadata", iiurlwidth: "960",
      iiextmetadatafilter: "LicenseShortName|Artist",
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${COMMONS_API}?${params.toString()}`, { signal: controller.signal });
      if (!res.ok) throw new Error(`Commons search failed (${res.status})`);
      const data = (await res.json()) as { query?: { pages?: Record<string, { title?: string; index?: number; imageinfo?: CommonsImageInfo[] }> } };
      const pages = Object.values(data.query?.pages ?? {});
      const photos: ProductPhoto[] = pages
        .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
        .map((page): ProductPhoto | null => {
          const info = page.imageinfo?.[0];
          const url = info?.thumburl ?? info?.url;
          if (!info || !url) return null;
          if (info.mime && !/^image\/(jpeg|png)$/i.test(info.mime)) return null;
          if (SKIP_TITLE.test(page.title ?? "")) return null;
          return {
            url, credit: stripHtml(info.extmetadata?.Artist?.value),
            license: stripHtml(info.extmetadata?.LicenseShortName?.value) ?? "CC-licensed",
            pageUrl: info.descriptionurl, title: page.title?.replace(/^File:/i, ""),
          };
        })
        .filter((p): p is ProductPhoto => p !== null);
      writeCache(query, photos);
      return photos;
    } catch {
      // Remember the miss for a minute so a flaky network does not cause a
      // request per card per render; the UI falls through to the next tier.
      writeCache(query, []);
      return [];
    } finally {
      clearTimeout(timer);
      pending.delete(query);
    }
  });

  pending.set(query, request);
  const photos = await request;
  return photos.slice(0, count);
}

/* ── local artwork ───────────────────────────────────────────────────── */

/** An image the project itself serves — always authoritative, never remote-fetched. */
export function isLocalAsset(imageUrl: string | null | undefined): boolean {
  return !!imageUrl && (imageUrl.startsWith("/uploads/") || imageUrl.startsWith("/images/"));
}

/**
 * The last image in a product's candidate list, so it must never fail: an
 * inline SVG drawn from the product's own name and colour.
 */
export function fallbackImage(kind: ProductKind, name = "", colorHex?: string): string {
  return artworkFor(name || (kind === "plant" ? "Potted plant" : "Fresh flower"), kind, colorHex);
}

/* ── the hook every product surface uses ─────────────────────────────── */

export interface ProductGallery {
  /** Every image url this product can render, best first. Always length ≥ 1. */
  sources: string[];
  /** Matching metadata for `sources[i]` (only the Commons entries have any). */
  meta: (ProductPhoto | undefined)[];
  /** Commons lookup still running. */
  loading: boolean;
  /** True when Commons gave us nothing and we are on our own artwork. */
  degraded: boolean;
}

export interface PhotoState extends ProductGallery {
  /** Re-run the lookup (used by the "retry" affordance on a failed image). */
  retry: () => void;
}

/**
 * @param active gate the network work: false until the card scrolls into view
 *               or the product page mounts. Prevents a 350-item catalogue from
 *               turning into 350 requests.
 */
export function useProductPhotos(
  name: string,
  imageUrl: string,
  kind: ProductKind,
  count = 4,
  active = true,
  colorHex?: string,
): PhotoState {
  const [photos, setPhotos] = useState<ProductPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const alive = useRef(true);

  // Images the project serves itself are authoritative: no remote lookup.
  const local = isLocalAsset(imageUrl);

  useEffect(() => {
    alive.current = true;
    setPhotos([]);
    if (local || !active) {
      setLoading(false);
      return;
    }
    const query = photoQueryFor(name, kind);
    let cancelled = false;
    setLoading(true);
    fetchSpeciesPhotos(query, count)
      .then((result) => { if (!cancelled) setPhotos(result); })
      .catch(() => { if (!cancelled) setPhotos([]); })
      .finally(() => { if (!cancelled && !alive.current) return; if (!cancelled) setLoading(false); });
    return () => { cancelled = true; alive.current = false; };
  }, [name, imageUrl, kind, count, active, local, attempt]);

  const resolved = photos.map((p) => p.url);
  const artwork = fallbackImage(kind, name, colorHex);
  const sources = local ? [imageUrl] : [imageUrl, ...resolved, artwork].filter(Boolean);
  const meta = local ? [undefined] : [undefined, ...photos, undefined];

  return {
    sources,
    meta,
    loading,
    degraded: resolved.length === 0,
    retry: () => setAttempt((a) => a + 1),
  };
}

/** Credit line shown under photography we did not take. */
export function photoAttribution(photo: ProductPhoto | undefined): string | null {
  if (!photo?.credit) return null;
  return `📷 ${photo.credit}${photo.license ? ` · ${photo.license}` : ""} · Wikimedia Commons`;
}

/** Deterministic offset so two varieties of the same species do not share a lead photo. */
export function rotateFor<T>(items: T[], seed: string): T[] {
  if (items.length < 2) return items;
  const hash = Array.from(seed).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const offset = hash % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}
