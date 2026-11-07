/**
 * Hover gallery data for flower cards.
 *
 * - EXTRA_VIEWS: extra studio shots of the same flower (close-up / vase),
 *   generated alongside the main photo. Every flower has at least these.
 * - FLOWER_SPECIES: sibling colour varieties, used as additional views.
 *
 * Keep in sync with backend/prisma/seed.ts and scripts/prepare-images.mjs.
 */
const EXTRA_VIEWS: Record<string, string[]> = {
  gazania: ["gazania-2", "gazania-3"],
  "cosmos-pink": ["cosmos-pink-2", "cosmos-pink-3"],
  "zinnia-red": ["zinnia-red-2", "zinnia-red-3"],
  sunflower: ["sunflower-2", "sunflower-3"],
  "babys-breath": ["babys-breath-2", "babys-breath-3"],
  "eucalyptus-bunch": ["eucalyptus-bunch-2", "eucalyptus-bunch-3"],
  "lavender-bunch": ["lavender-bunch-2", "lavender-bunch-3"],
  "jasmine-mogra": ["jasmine-mogra-2", "jasmine-mogra-3"],
  "lotus-pink": ["lotus-pink-2", "lotus-pink-3"],
  "peony-pink": ["peony-pink-2", "peony-pink-3"],
  "gladiolus-pink": ["gladiolus-pink-2", "gladiolus-pink-3"],
  "iris-blue": ["iris-blue-2", "iris-blue-3"],
  "daffodil-yellow": ["daffodil-yellow-2", "daffodil-yellow-3"],
  "freesia-yellow": ["freesia-yellow-2", "freesia-yellow-3"],
  "alstroemeria-orange": ["alstroemeria-orange-2", "alstroemeria-orange-3"],
  "anthurium-red": ["anthurium-red-2", "anthurium-red-3"],
  "bird-of-paradise": ["bird-of-paradise-2", "bird-of-paradise-3"],
  tuberose: ["tuberose-2", "tuberose-3"],
  "dahlia-red": ["dahlia-red-2"],
  "dahlia-pink": ["dahlia-pink-2"],
  "hydrangea-blue": ["hydrangea-blue-2"],
  "hydrangea-pink": ["hydrangea-pink-2"],
  "marigold-orange": ["marigold-orange-2"],
  "marigold-yellow": ["marigold-yellow-2"],
};

export const FLOWER_SPECIES: Record<string, string[]> = {
  rose: ["rose-red", "rose-white", "rose-pink", "rose-yellow", "rose-orange", "rose-lavender", "rose-peach"],
  lily: ["lily-white", "lily-pink", "lily-yellow", "lily-orange", "lily-stargazer"],
  tulip: ["tulip-red", "tulip-yellow", "tulip-pink", "tulip-white", "tulip-purple"],
  gerbera: ["gerbera-orange", "gerbera-pink", "gerbera-red", "gerbera-yellow", "gerbera-white"],
  carnation: ["carnation-pink", "carnation-red", "carnation-white", "carnation-yellow"],
  chrysanthemum: ["chrysanthemum-white", "chrysanthemum-yellow", "chrysanthemum-red"],
  marigold: ["marigold-orange", "marigold-yellow"],
  orchid: ["orchid-purple", "orchid-white", "orchid-pink"],
  dahlia: ["dahlia-red", "dahlia-pink"],
  hydrangea: ["hydrangea-blue", "hydrangea-pink"],
};

/**
 * Up to 3 extra views for a flower slug (card image itself is view #1).
 * Its own extra shots come first, then sibling colour varieties.
 */
export function flowerGallery(slug: string, all: Array<{ slug: string; imageUrl: string }>): string[] {
  const own = (EXTRA_VIEWS[slug] ?? []).map((s) => `/images/products/${s}.jpg`);

  const species = Object.values(FLOWER_SPECIES).find((members) => members.includes(slug));
  const bySlug = new Map(all.map((f) => [f.slug, f.imageUrl]));
  const siblings = (species ?? [])
    .filter((s) => s !== slug)
    .map((s) => bySlug.get(s))
    .filter((u): u is string => Boolean(u));

  return [...own, ...siblings].slice(0, 3);
}
