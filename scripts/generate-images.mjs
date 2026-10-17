#!/usr/bin/env node
/**
 * BloomNest product illustration generator.
 * ------------------------------------------------------------------
 * Generates ALL product images as original SVG illustrations so the
 * project ships with zero third-party copyright risk and works fully
 * offline. Run:  node scripts/generate-images.mjs
 * Output: frontend/public/images/products/*.svg  (+ manifest.json)
 *
 * Every image is deterministic: the same slug always produces the
 * same picture (seeded PRNG), so re-running never churns the repo.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "frontend", "public", "images", "products");
mkdirSync(OUT, { recursive: true });

/* ---------------- deterministic PRNG ---------------- */
function rngFor(seed) {
  let s = 2166136261;
  for (const ch of seed) { s ^= ch.charCodeAt(0); s = Math.imul(s, 16777619) >>> 0; }
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const pick = (rand, arr) => arr[Math.floor(rand() * arr.length) % arr.length];

/* ---------------- palette ---------------- */
const CREAM = "#faf6ee";
const GREEN = "#3f6b4f";
const GREEN_D = "#2f5d3a";
const GREEN_L = "#7fa88c";
const STEM = "#4c7a58";

/* ---------------- helpers ---------------- */
function svgDoc(w, h, body, bg = CREAM) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  <radialGradient id="bg" cx="50%" cy="42%" r="75%">
    <stop offset="0%" stop-color="#fffdf7"/><stop offset="100%" stop-color="${bg}"/>
  </radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<circle cx="${w / 2}" cy="${h * 0.44}" r="${Math.min(w, h) * 0.42}" fill="none" stroke="#e7dfcf" stroke-width="2" stroke-dasharray="1 7" stroke-linecap="round"/>
${body}
</svg>\n`;
}
const el = (x, y, rx, ry, fill, rot = 0, extra = "") =>
  `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${rx}" ry="${ry}" fill="${fill}" transform="rotate(${rot.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})" ${extra}/>`;

/* ---------------- flower heads ---------------- */
// simple rounded petals around a centre
function roundHead(x, y, r, color, dark, rand, petals = 6) {
  let s = "";
  for (let i = 0; i < petals; i++) {
    const a = (360 / petals) * i + rand() * 8;
    s += el(x + Math.cos((a * Math.PI) / 180) * r * 0.62, y + Math.sin((a * Math.PI) / 180) * r * 0.62, r * 0.5, r * 0.42, color, a);
  }
  s += `<circle cx="${x}" cy="${y}" r="${r * 0.42}" fill="${dark}"/>`;
  s += `<circle cx="${x - r * 0.12}" cy="${y - r * 0.12}" r="${r * 0.18}" fill="#ffffff" opacity="0.35"/>`;
  return s;
}
// pointed petals (lily / orchid family)
function pointedHead(x, y, r, color, deep, rand, petals = 6, stamens = true, stamenColor = "#e9b44c") {
  let s = "";
  for (let i = 0; i < petals; i++) {
    const a = (360 / petals) * i + rand() * 6;
    const tipX = x + Math.cos((a * Math.PI) / 180) * r, tipY = y + Math.sin((a * Math.PI) / 180) * r;
    const s1x = x + Math.cos(((a + 28) * Math.PI) / 180) * r * 0.42, s1y = y + Math.sin(((a + 28) * Math.PI) / 180) * r * 0.42;
    const s2x = x + Math.cos(((a - 28) * Math.PI) / 180) * r * 0.42, s2y = y + Math.sin(((a - 28) * Math.PI) / 180) * r * 0.42;
    s += `<path d="M ${x} ${y} Q ${s1x} ${s1y} ${tipX} ${tipY} Q ${s2x} ${s2y} ${x} ${y} Z" fill="${color}" stroke="${deep}" stroke-width="${r * 0.03}"/>`;
  }
  s += `<circle cx="${x}" cy="${y}" r="${r * 0.14}" fill="${deep}"/>`;
  if (stamens) {
    for (let i = 0; i < 5; i++) {
      const a = (360 / 5) * i + rand() * 20;
      const tx = x + Math.cos((a * Math.PI) / 180) * r * 0.55, ty = y + Math.sin((a * Math.PI) / 180) * r * 0.55;
      s += `<line x1="${x}" y1="${y}" x2="${tx.toFixed(1)}" y2="${ty.toFixed(1)}" stroke="${stamenColor}" stroke-width="${Math.max(1.5, r * 0.05)}"/><circle cx="${tx.toFixed(1)}" cy="${ty.toFixed(1)}" r="${Math.max(1.6, r * 0.07)}" fill="${stamenColor}"/>`;
    }
  }
  return s;
}
// ray petals with textured disc (gerbera / sunflower / chrysanth / marigold)
function rayHead(x, y, r, petalColor, coreColor, rand, rays = 18, petalW = 0.16) {
  let s = "";
  for (let i = 0; i < rays; i++) {
    const a = (360 / rays) * i + rand() * 4;
    s += el(x + Math.cos((a * Math.PI) / 180) * r * 0.68, y + Math.sin((a * Math.PI) / 180) * r * 0.68, r * 0.46, r * petalW, petalColor, a);
  }
  s += `<circle cx="${x}" cy="${y}" r="${r * 0.38}" fill="${coreColor}"/>`;
  for (let i = 0; i < 14; i++) {
    const a = rand() * 360, rr = rand() * r * 0.3;
    s += `<circle cx="${(x + Math.cos((a * Math.PI) / 180) * rr).toFixed(1)}" cy="${(y + Math.sin((a * Math.PI) / 180) * rr).toFixed(1)}" r="${r * 0.035}" fill="#00000022"/>`;
  }
  return s;
}
// pom-pom (marigold / carnation)
function pomHead(x, y, r, color, deep, rand) {
  let s = "";
  for (let i = 0; i < 9; i++) {
    const a = rand() * 360, rr = rand() * r * 0.55;
    s += `<circle cx="${(x + Math.cos((a * Math.PI) / 180) * rr).toFixed(1)}" cy="${(y + Math.sin((a * Math.PI) / 180) * rr).toFixed(1)}" r="${r * 0.42}" fill="${color}" opacity="0.9"/>`;
  }
  s += `<circle cx="${x}" cy="${y}" r="${r * 0.5}" fill="${deep}" opacity="0.55"/>`;
  s += `<circle cx="${x - r * 0.15}" cy="${y - r * 0.15}" r="${r * 0.16}" fill="#ffffff" opacity="0.4"/>`;
  return s;
}
// tulip cup
function tulipHead(x, y, r, color, deep) {
  return `<path d="M ${x - r * 0.55} ${y - r * 0.75} Q ${x - r * 0.72} ${y + r * 0.35} ${x} ${y + r * 0.62} Q ${x + r * 0.72} ${y + r * 0.35} ${x + r * 0.55} ${y - r * 0.75} Q ${x} ${y - r * 0.15} ${x - r * 0.55} ${y - r * 0.75} Z" fill="${color}"/>
<path d="M ${x} ${y - r * 0.72} Q ${x - r * 0.35} ${y} ${x} ${y + r * 0.6} Q ${x + r * 0.35} ${y} ${x} ${y - r * 0.72} Z" fill="${deep}" opacity="0.5"/>`;
}
// tuberose spike: column of small florets
function tuberoseSpike(x, yTop, len, rand) {
  let s = `<line x1="${x}" y1="${yTop - 20}" x2="${x}" y2="${yTop + len}" stroke="${STEM}" stroke-width="5"/>`;
  const n = 11;
  for (let i = 0; i < n; i++) {
    const yy = yTop + (len * i) / n;
    const r = 12 - i * 0.4 + rand() * 2;
    s += `<circle cx="${x}" cy="${yy.toFixed(1)}" r="${r.toFixed(1)}" fill="#fffdf6" stroke="#e3dcc8" stroke-width="1.5"/>`;
    for (const dx of [-r * 0.85, r * 0.85]) {
      s += `<circle cx="${(x + dx).toFixed(1)}" cy="${(yy + r * 0.5).toFixed(1)}" r="${(r * 0.7).toFixed(1)}" fill="#fffef9" stroke="#e3dcc8" stroke-width="1.2"/>`;
    }
  }
  return s;
}

const HEAD = {
  rose: (x, y, r, c, rand) => roundHead(x, y, r, c, shade(c, -28), rand, 6),
  lily: (x, y, r, c, rand) => pointedHead(x, y, r, c, shade(c, -35), rand, 6),
  orchid: (x, y, r, c, rand) => pointedHead(x, y, r, c, shade(c, -40), rand, 5, true, "#c0392b"),
  carnation: (x, y, r, c, rand) => pomHead(x, y, r, c, shade(c, -30), rand),
  gerbera: (x, y, r, c, rand) => rayHead(x, y, r, c, shade(c, -55), rand, 20, 0.13),
  sunflower: (x, y, r, c, rand) => rayHead(x, y, r, c, "#7d5a2e", rand, 22, 0.15),
  marigold: (x, y, r, c, rand) => pomHead(x, y, r, c, shade(c, -25), rand),
  tulip: (x, y, r, c) => tulipHead(x, y, r, c, shade(c, -30)),
  chrysanthemum: (x, y, r, c, rand) => rayHead(x, y, r, c, shade(c, -45), rand, 26, 0.08),
  tuberose: (x, y, r, c, rand) => tuberoseSpike(x, y - r, r * 2.6, rand),
};
function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
  return `#${((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1)}`;
}

/* ---------------- stems & leaves ---------------- */
function stemTo(x1, y1, x2, y2, bend = 0) {
  const mx = (x1 + x2) / 2 + bend;
  return `<path d="M ${x1} ${y1} Q ${mx} ${(y1 + y2) / 2} ${x2} ${y2}" stroke="${STEM}" stroke-width="7" fill="none" stroke-linecap="round"/>`;
}
function leaf(x, y, rot, size, color = GREEN_L) {
  return `<path d="M 0 0 Q ${size * 0.5} ${-size * 0.42} ${size} 0 Q ${size * 0.5} ${size * 0.42} 0 0 Z" fill="${color}" transform="translate(${x} ${y}) rotate(${rot})"/>`;
}

/* ---------------- product catalogue (mirrors prisma/seed.ts) ---------------- */
const FLOWERS = [
  { slug: "rose-red", name: "Desi Red Rose", type: "rose", color: "#c8102e" },
  { slug: "rose-pink", name: "Pink Rose", type: "rose", color: "#e56b8c" },
  { slug: "rose-white", name: "White Rose", type: "rose", color: "#f4efe2" },
  { slug: "lily-white", name: "White Asiatic Lily", type: "lily", color: "#fdfbf2" },
  { slug: "lily-pink", name: "Oriental Pink Lily", type: "lily", color: "#f2a7c3" },
  { slug: "orchid-purple", name: "Purple Orchid", type: "orchid", color: "#9b59b6" },
  { slug: "carnation-pink", name: "Pink Carnation", type: "carnation", color: "#e78fb3" },
  { slug: "gerbera-orange", name: "Orange Gerbera", type: "gerbera", color: "#f39c12" },
  { slug: "gerbera-pink", name: "Pink Gerbera", type: "gerbera", color: "#e84393" },
  { slug: "sunflower", name: "Sunflower", type: "sunflower", color: "#f4c430" },
  { slug: "marigold-orange", name: "Genda Marigold", type: "marigold", color: "#e67e22" },
  { slug: "tulip-red", name: "Red Tulip", type: "tulip", color: "#d63031" },
  { slug: "chrysanthemum-white", name: "White Chrysanthemum", type: "chrysanthemum", color: "#f7f3e8" },
  { slug: "tuberose", name: "Rajnigandha Tuberose", type: "tuberose", color: "#fffdf6" },
];
const BOUQUETS = [
  { slug: "blush-romance", members: ["rose-red", "rose-pink", "lily-pink"], wrap: "#e8c8b7" },
  { slug: "sunrise-delight", members: ["sunflower", "marigold-orange", "gerbera-orange"], wrap: "#d9b382" },
  { slug: "orchid-elegance", members: ["orchid-purple", "tuberose", "lily-white"], wrap: "#c9c1e8" },
  { slug: "carnation-comfort", members: ["carnation-pink", "chrysanthemum-white", "rose-pink"], wrap: "#f0d9de" },
  { slug: "royal-white", members: ["rose-white", "lily-white", "tuberose"], wrap: "#e6e2d6" },
  { slug: "gerbera-cheer", members: ["gerbera-orange", "gerbera-pink", "sunflower"], wrap: "#f5d9a8" },
];
const PLANTS = [
  { slug: "money-plant", name: "Money Plant", pot: "#c96f4a", kind: "money" },
  { slug: "tulsi-holy-basil", name: "Tulsi (Holy Basil)", pot: "#b0413e", kind: "tulsi" },
  { slug: "aloe-vera", name: "Aloe Vera", pot: "#d9b382", kind: "aloe" },
  { slug: "snake-plant", name: "Snake Plant", pot: "#8a9a5b", kind: "snake" },
  { slug: "jade-plant", name: "Jade Plant", pot: "#c96f4a", kind: "jade" },
  { slug: "peace-lily", name: "Peace Lily", pot: "#a67b5b", kind: "peace" },
  { slug: "areca-palm", name: "Areca Palm", pot: "#9b6b4f", kind: "areca" },
  { slug: "zz-plant", name: "ZZ Plant", pot: "#7d6b5d", kind: "zz" },
];

/* ---------------- compositions ---------------- */
function flowerImage(f) {
  const rand = rngFor(f.slug);
  const cx = 400, baseY = 760;
  let body = "";
  // foliage + side stems
  body += stemTo(cx - 10, baseY, cx - 150, 320, 30) + leaf(cx - 80, 560, -30, 90) + leaf(cx - 130, 430, -70, 70);
  body += stemTo(cx + 10, baseY, cx + 165, 350, -30) + leaf(cx + 90, 580, 25, 85) + leaf(cx + 140, 450, 65, 66);
  // side blooms
  body += HEAD[f.type](cx - 150, 305, f.type === "tuberose" ? 46 : 62, f.color, rand);
  body += HEAD[f.type](cx + 165, 335, f.type === "tuberose" ? 42 : 56, f.color, rand);
  // hero bloom
  body += stemTo(cx, baseY, cx, 250, 0) + leaf(cx - 55, 500, -12, 100) + leaf(cx + 60, 470, 100, 95);
  body += HEAD[f.type](cx, 240, f.type === "tuberose" ? 58 : 105, f.color, rand);
  // ground shadow
  body += `<ellipse cx="${cx}" cy="${baseY + 8}" rx="150" ry="18" fill="#00000012"/>`;
  return svgDoc(800, 800, body);
}

function bouquetImage(b) {
  const rand = rngFor(b.slug);
  const cx = 400, wrapTop = 470, baseY = 730;
  const byType = b.members.map((m) => FLOWERS.find((f) => f.slug === m));
  let body = "";
  // wrap cone (behind stems)
  body += `<path d="M ${cx - 165} ${wrapTop} L ${cx + 165} ${wrapTop} L ${cx} ${baseY + 40} Z" fill="${b.wrap}" stroke="#00000018" stroke-width="3"/>`;
  body += `<path d="M ${cx - 165} ${wrapTop} L ${cx} ${baseY + 40} L ${cx - 40} ${wrapTop} Z" fill="#00000010"/>`;
  // ribbon band + bow
  body += `<rect x="${cx - 92}" y="${wrapTop + 118}" width="184" height="34" rx="14" fill="${shade(b.wrap, -45)}"/>`;
  body += `<circle cx="${cx}" cy="${wrapTop + 135}" r="16" fill="${shade(b.wrap, -60)}"/>`;
  // blooms fanned above wrap
  const heads = [];
  for (let i = 0; i < 9; i++) {
    const f = byType[i % byType.length];
    heads.push({ f, dx: -150 + (i % 5) * 75 + rand() * 14, dy: 150 + Math.floor(i / 5) * 95 + rand() * 18, r: f.type === "tuberose" ? 40 : 58 + rand() * 10 });
  }
  heads.sort((a, c) => a.dy - c.dy);
  for (const h of heads) {
    body += stemTo(cx, wrapTop + 130, cx + h.dx, h.dy + h.dy * 0.9, (h.dx) * 0.25);
  }
  for (const h of heads) {
    body += HEAD[h.f.type](cx + h.dx, h.dy + h.dy * 0.9, h.r, h.f.color, rand);
  }
  // a couple of leaves poking out
  body += leaf(cx - 205, 300, -140, 95) + leaf(cx + 210, 320, 140, 90);
  body += `<ellipse cx="${cx}" cy="${baseY + 55}" rx="130" ry="16" fill="#00000012"/>`;
  return svgDoc(800, 800, body);
}

function plantImage(p) {
  const rand = rngFor(p.slug);
  const cx = 400, potY = 560;
  let body = "";
  // pot
  body += `<path d="M ${cx - 130} ${potY} L ${cx + 130} ${potY} L ${cx + 100} ${potY + 165} Q ${cx} ${potY + 195} ${cx - 100} ${potY + 165} Z" fill="${p.pot}"/>`;
  body += `<rect x="${cx - 145}" y="${potY - 26}" width="290" height="46" rx="18" fill="${shade(p.pot, -14)}"/>`;
  body += `<rect x="${cx - 145}" y="${potY - 26}" width="290" height="14" rx="7" fill="#ffffff30"/>`;
  const K = {
    money: () => {
      for (const [vx, sway] of [[-60, -40], [10, 30], [70, 55]]) {
        body += `<path d="M ${cx} ${potY} q ${sway * 0.4} -120 ${vx + sway} -230" stroke="${STEM}" stroke-width="6" fill="none"/>`;
        for (let i = 1; i <= 3; i++) {
          const t = i / 3.4;
          const lx = cx + sway * 0.4 * t * 3 + (vx + sway - cx) * t * 0.6;
          const ly = potY - 120 * t * 1.9;
          body += `<path d="M 0 0 C -34 -12 -34 -46 0 -52 C 34 -46 34 -12 0 0 Z" fill="${i % 2 ? GREEN : GREEN_L}" transform="translate(${lx.toFixed(0)} ${ly.toFixed(0)}) rotate(${sway * 0.6})"/>`;
        }
      }
    },
    tulsi: () => {
      for (const dx of [-46, 0, 46]) {
        body += `<line x1="${cx}" y1="${potY}" x2="${cx + dx}" y2="${potY - 210}" stroke="${STEM}" stroke-width="6"/>`;
        for (let i = 0; i < 4; i++) {
          const ly = potY - 40 - i * 52;
          body += leaf(cx + (dx * (i + 1)) / 4.6, ly, -95, 66, GREEN) + leaf(cx + (dx * (i + 1)) / 4.6, ly + 12, -85, 62, GREEN_L);
        }
        body += el(cx + dx, potY - 222, 12, 12, "#9b59b6");
      }
    },
    aloe: () => {
      for (let i = 0; i < 9; i++) {
        const a = -78 + i * 19.5 + rand() * 4;
        const rad = (a * Math.PI) / 180, len = 190 + rand() * 90;
        const tx = cx + Math.sin(rad) * len, ty = potY - Math.cos(rad) * len;
        body += `<path d="M ${cx} ${potY} Q ${cx + Math.sin(rad) * len * 0.4} ${potY - Math.cos(rad) * len * 0.55} ${tx.toFixed(0)} ${ty.toFixed(0)} Q ${(cx + Math.sin(rad) * len * 0.28).toFixed(0)} ${(potY - Math.cos(rad) * len * 0.3).toFixed(0)} ${cx} ${potY} Z" fill="${i % 2 ? "#69a275" : GREEN}"/>`;
        for (let k = 1; k < 5; k++) {
          const t = k / 5.2;
          body += el(cx + Math.sin(rad) * len * t, potY - Math.cos(rad) * len * t, 4, 2.4, "#ffffff55", a);
        }
      }
    },
    snake: () => {
      const blades = [[-95, 200, -8], [-55, 280, -4], [-15, 320, 2], [25, 260, 5], [65, 300, 8], [100, 190, 12]];
      for (const [dx, len, tilt] of blades) {
        body += `<path d="M ${cx + dx} ${potY} Q ${cx + dx + tilt * 4} ${potY - len * 0.6} ${cx + dx + tilt * 3} ${potY - len}
                 Q ${cx + dx + tilt * 3 + 26} ${potY - len * 0.6} ${cx + dx + 22} ${potY} Z" fill="${GREEN}"/>`;
        body += `<path d="M ${cx + dx + 8} ${potY - 14} Q ${cx + dx + tilt * 3 + 10} ${potY - len * 0.62} ${cx + dx + tilt * 3 + 6} ${potY - len + 14}" stroke="#d9d08f" stroke-width="5" fill="none"/>`;
      }
    },
    jade: () => {
      body += `<path d="M ${cx} ${potY} L ${cx} ${potY - 150} M ${cx} ${potY - 110} L ${cx - 70} ${potY - 200} M ${cx} ${potY - 130} L ${cx + 66} ${potY - 210} M ${cx} ${potY - 160} L ${cx - 40} ${potY - 280} M ${cx} ${potY - 160} L ${cx + 44} ${potY - 290}" stroke="#8b5e3c" stroke-width="9" fill="none" stroke-linecap="round"/>`;
      for (const [dx, dy] of [[0, -160], [-70, -210], [66, -220], [-40, -290], [44, -300], [-20, -230], [22, -240]]) {
        for (let i = 0; i < 5; i++) {
          const a = rand() * 360;
          body += `<circle cx="${cx + dx + Math.cos(a) * 34 * rand()}" cy="${potY + dy + Math.sin(a) * 26 * rand()}" r="${16 + rand() * 7}" fill="${rand() > 0.5 ? GREEN : "#5e9470"}"/>`;
        }
      }
    },
    peace: () => {
      for (let i = 0; i < 7; i++) {
        const a = -60 + i * 20, rad = (a * Math.PI) / 180, len = 150 + rand() * 110;
        body += `<path d="M ${cx} ${potY} Q ${cx + Math.sin(rad) * len * 0.5} ${potY - Math.cos(rad) * len * 0.7} ${cx + Math.sin(rad) * len * 0.55} ${potY - Math.cos(rad) * len * 1.05} Q ${cx + Math.sin(rad) * len * 0.3} ${potY - Math.cos(rad) * len * 0.5} ${cx} ${potY} Z" fill="${i % 2 ? "#2e5a3c" : GREEN_D}"/>`;
      }
      for (const [dx, dy, rot] of [[-40, -300, -30], [52, -320, 24]]) {
        body += `<path d="M 0 0 C -26 -30 -22 -78 0 -92 C 22 -78 26 -30 0 0 Z" fill="#fdfbf2" stroke="#e3dcc8" stroke-width="2" transform="translate(${cx + dx} ${potY + dy}) rotate(${rot})"/>`;
        body += `<line x1="${cx + dx}" y1="${potY + dy}" x2="${cx + dx}" y2="${potY + dy - 62}" stroke="#e9c46a" stroke-width="5"/>`;
        body += `<line x1="${cx + dx * 0.3}" y1="${potY}" x2="${cx + dx}" y2="${potY + dy}" stroke="${STEM}" stroke-width="5"/>`;
      }
    },
    areca: () => {
      for (const [tx, tilt] of [[-90, -30], [0, 0], [95, 32]]) {
        const tipx = cx + tx, tipy = potY - 320;
        body += `<line x1="${cx}" y1="${potY}" x2="${tipx}" y2="${tipy}" stroke="${STEM}" stroke-width="6"/>`;
        for (let i = 1; i <= 8; i++) {
          const t = i / 9;
          const px = cx + (tipx - cx) * t, py = potY + (tipy - potY) * t;
          body += leaf(px, py, -20 + tilt, 74 - i * 3, i % 2 ? GREEN : GREEN_L) + leaf(px, py + 4, 200 + tilt, 72 - i * 3, i % 2 ? GREEN_L : GREEN);
        }
      }
    },
    zz: () => {
      for (const [dx, len] of [[-70, 250], [-20, 320], [35, 290], [80, 230]]) {
        body += `<line x1="${cx}" y1="${potY}" x2="${cx + dx}" y2="${potY - len}" stroke="${STEM}" stroke-width="7"/>`;
        for (let i = 1; i <= Math.floor(len / 44); i++) {
          const t = i / (len / 44);
          const px = cx + dx * t, py = potY - len * t;
          body += el(px - 26, py - 8, 22, 12, "#3a7d54", -18) + el(px + 26, py - 2, 22, 12, "#2e6b47", 18);
        }
        body += el(cx + dx, potY - len - 10, 20, 12, "#4a8f60", -8);
      }
    },
  };
  (K[p.kind] || K.money)();
  body += `<ellipse cx="${cx}" cy="${potY + 185}" rx="140" ry="16" fill="#00000012"/>`;
  return svgDoc(800, 800, body);
}

/* ---------------- hero, logo, favicon ---------------- */
function heroImage() {
  const rand = rngFor("bloomnest-hero");
  let body = `<rect width="1440" height="620" fill="#2f5d3a"/>
  <rect y="430" width="1440" height="190" fill="#28513288"/>
  <path d="M0 470 Q 360 420 720 465 T 1440 455 V 620 H 0 Z" fill="#264c31"/>`;
  const spots = [[120, 380, "sunflower"], [300, 420, "rose"], [520, 360, "gerbera"], [760, 410, "tulip"], [980, 370, "lily"], [1200, 420, "marigold"], [1340, 380, "orchid"]];
  for (const [x, y, t] of spots) {
    body += stemTo(x, 560, x, y, rand() * 40 - 20);
    body += leaf(x + 20, (560 + y) / 2, 30, 60, "#5b8a63");
    body += HEAD[t](x, y, 46, t === "rose" ? "#e56b8c" : t === "orchid" ? "#c39bd3" : t === "lily" ? "#fdfbf2" : t === "tulip" ? "#e84393" : "#f4c430", rand);
  }
  body += `<ellipse cx="720" cy="300" rx="300" ry="120" fill="#ffffff10"/>`;
  return svgDoc(1440, 620, body, "#2f5d3a").replace('stroke="#e7dfcf" stroke-width="2" stroke-dasharray="1 7"', 'display="none"');
}
function logoImage(size = 256) {
  const r = size / 2;
  let petals = "";
  for (let i = 0; i < 6; i++) petals += el(r, r * 0.62, r * 0.3, r * 0.34, "#7fa88c", i * 60);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="#2f5d3a"/>
${petals}
<circle cx="${r}" cy="${r * 0.72}" r="${r * 0.2}" fill="#f4c430"/>
<path d="M ${r} ${size * 0.62} Q ${r - size * 0.12} ${size * 0.78} ${r} ${size * 0.9} Q ${r + size * 0.12} ${size * 0.78} ${r} ${size * 0.62} Z" fill="#7fa88c"/>
</svg>\n`;
}

/* ---------------- write everything ---------------- */
const manifest = { flowers: [], bouquets: [], plants: [], misc: [] };
for (const f of FLOWERS) {
  writeFileSync(join(OUT, `${f.slug}.svg`), flowerImage(f));
  manifest.flowers.push({ slug: f.slug, file: `images/products/${f.slug}.svg` });
}
for (const b of BOUQUETS) {
  writeFileSync(join(OUT, `${b.slug}.svg`), bouquetImage(b));
  manifest.bouquets.push({ slug: b.slug, file: `images/products/${b.slug}.svg` });
}
for (const p of PLANTS) {
  writeFileSync(join(OUT, `${p.slug}.svg`), plantImage(p));
  manifest.plants.push({ slug: p.slug, file: `images/products/${p.slug}.svg` });
}
writeFileSync(join(OUT, "..", "hero.svg"), heroImage());
writeFileSync(join(OUT, "..", "logo.svg"), logoImage());
writeFileSync(join(OUT, "..", "favicon.svg"), logoImage(64));
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(`Generated ${manifest.flowers.length + manifest.bouquets.length + manifest.plants.length} product SVGs + hero + logo in ${OUT}`);
