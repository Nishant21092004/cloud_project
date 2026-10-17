/**
 * Deterministic per-product artwork, drawn in the browser as an inline SVG
 * data-URI — no files, no network, no copyright question.
 *
 * Why: the photograph pipeline (Wikimedia Commons) needs internet. On a demo
 * laptop without network, every card would otherwise collapse to one generic
 * flower silhouette, which is exactly the "these are not real flowers" problem
 * the catalogue started with. This keeps each listing *individually* recognisable:
 * the petals are the product's own colour, the shape is seeded from its slug,
 * and the same product always draws the same picture.
 */
import type { ProductKind } from "./photos";

const cache = new Map<string, string>();

/** Tiny deterministic PRNG (FNV-1a → xorshift), same style as scripts/generate-images.mjs. */
function rngFor(seed: string) {
  let s = 2166136261;
  for (const ch of seed) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619) >>> 0; }
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}

function shade(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const num = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const parts = [0, 2, 4].map((i) => Math.max(0, Math.min(255, parseInt(num.slice(i, i + 2), 16) + amount)));
  return `#${parts.map((p) => p.toString(16).padStart(2, "0")).join("")}`;
}

export function artworkFor(name: string, kind: ProductKind, colorHex = "#d98a9e"): string {
  const key = `${kind}|${name}|${colorHex}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const rand = rngFor(key);
  const petal = /^#[0-9a-fA-F]{6}$/.test(colorHex) ? colorHex : "#d98a9e";
  const deep = shade(petal, -46);
  const light = shade(petal, 42);
  const stem = kind === "flower" ? "#4c7a58" : "#3f6b4f";
  const W = 400;
  const H = 400;
  const cx = W / 2;
  const body: string[] = [];

  if (kind === "bouquet") {
    // wrapped cone + a cluster of heads
    body.push(`<path d="M${cx - 96} 150 L${cx + 96} 150 L${cx + 34} 356 L${cx - 34} 356 Z" fill="#e7d3b8" stroke="#c9ab86" stroke-width="3"/>`);
    body.push(`<path d="M${cx - 96} 150 L${cx + 96} 150 L${cx + 78} 196 L${cx - 78} 196 Z" fill="#f3e6d0"/>`);
    const spots = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2 + rand();
      return [cx + Math.cos(a) * (34 + rand() * 52), 118 - Math.sin(a) * (18 + rand() * 30)] as const;
    });
    for (const [x, y] of spots) {
      body.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(16 + rand() * 9).toFixed(1)}" fill="${petal}" opacity="0.94"/>`);
      body.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(6 + rand() * 3).toFixed(1)}" fill="${deep}"/>`);
    }
  } else if (kind === "plant") {
    // pot + leaves
    body.push(`<path d="M${cx - 74} 262 L${cx + 74} 262 L${cx + 54} 356 L${cx - 54} 356 Z" fill="#c8794f" stroke="#a55f3c" stroke-width="3"/>`);
    body.push(`<rect x="${cx - 82}" y="${244}" width="164" height="24" rx="7" fill="#d98a63"/>`);
    for (let i = 0; i < 9; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      const t = i / 9;
      const len = 120 - t * 46;
      const y0 = 250 - t * 96;
      body.push(
        `<path d="M${cx} ${y0.toFixed(1)} q ${(dir * len * 0.55).toFixed(1)} ${(-len * 0.5).toFixed(1)} ${(dir * len).toFixed(1)} ${(-len * 0.18).toFixed(1)} q ${(-dir * len * 0.5).toFixed(1)} ${(len * 0.34).toFixed(1)} ${(-dir * len).toFixed(1)} ${(len * 0.18).toFixed(1)} Z" fill="${i % 3 === 0 ? light : petal}" stroke="${stem}" stroke-width="2" opacity="0.95"/>`,
      );
    }
  } else {
    // a single composite flower head on a stem
    const petals = 8 + Math.floor(rand() * 6);
    const radius = 62 + rand() * 26;
    const cy = 176;
    body.push(`<path d="M${cx} ${cy + radius - 10} C ${cx - 8} 300 ${cx + 10} 320 ${cx} 372" stroke="${stem}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
    body.push(`<path d="M${cx - 4} 300 q -54 -12 -70 -46 q 46 -6 70 46 Z" fill="${shade(stem, 18)}"/>`);
    for (let i = 0; i < petals; i++) {
      const a = (i / petals) * Math.PI * 2 + rand() * 0.12;
      const px = cx + Math.cos(a) * radius * 0.72;
      const py = cy + Math.sin(a) * radius * 0.72;
      const rx = (radius * 0.46).toFixed(1);
      const ry = (radius * 0.24).toFixed(1);
      body.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" rx="${rx}" ry="${ry}" fill="${i % 2 ? petal : light}" opacity="0.95" transform="rotate(${((a * 180) / Math.PI).toFixed(1)} ${px.toFixed(1)} ${py.toFixed(1)})"/>`);
    }
    body.push(`<circle cx="${cx}" cy="${cy}" r="${(radius * 0.3).toFixed(1)}" fill="${deep}"/>`);
    body.push(`<circle cx="${cx}" cy="${cy}" r="${(radius * 0.16).toFixed(1)}" fill="${shade(deep, -26)}"/>`);
  }

  const label = name.length > 26 ? `${name.slice(0, 25)}…` : name;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${label}">
<rect width="${W}" height="${H}" fill="#faf6ee"/>
<circle cx="${cx}" cy="180" r="150" fill="#f3ecdc"/>
${body.join("\n")}
<text x="${cx}" y="392" text-anchor="middle" font-family="Georgia, serif" font-size="17" fill="#264c31">${escapeXml(label)}</text>
</svg>`;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replace(/\s+/g, " "))}`;
  cache.set(key, uri);
  return uri;
}

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
