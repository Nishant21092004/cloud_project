/** Stable photo variations; remote images need an internet connection.
 * LoremFlickr imagery is illustrative and may not depict the exact cultivar.
 * Fallbacks are bundled SVGs, never broken image icons.
 */
export function fallbackImage(image: string, kind: "flower" | "plant" | "bouquet") {
  if (image.startsWith("/images/products/") && image.endsWith(".svg")) return image;
  return kind === "plant" ? "/images/products/fallback-plant.svg" : "/images/products/fallback-flower.svg";
}
export function photoGallery(name: string, current: string, kind: "flower" | "plant" | "bouquet"): string[] {
  const plain = name.toLowerCase().replace(/\([^)]*\)/g, "").replace(/[^a-z ]/g, "").trim().split(/\s+/);
  const family = plain.find((w) => ["rose", "lily", "orchid", "carnation", "gerbera", "sunflower", "marigold", "tulip", "chrysanthemum", "tuberose", "iris", "gladiolus", "daisy", "aster", "lisianthus", "peony", "delphinium", "hydrangea", "jasmine", "lotus", "dahlia", "pothos", "philodendron", "monstera", "fern", "palm", "cactus", "plant", "succulent", "anthurium", "aloe", "bamboo"].includes(w)) ?? plain.slice(-2).join("-");
  const keyword = kind === "bouquet" ? "flower-bouquet" : `${family},${kind === "plant" ? "plant" : "flower"}`;
  const hash = Array.from(name).reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return [current, ...[1, 2, 3].map((i) => `https://loremflickr.com/640/640/${encodeURIComponent(keyword)}?lock=${(hash + i * 977) % 99991}`)];
}
