import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Bouquet, Flower, Plant } from "../api/types";
import { ProductCard, priceFor } from "../components/ProductCard";
import { ProductImage, useGalleryForProduct } from "../components/ProductImage";

/** The three doorway tiles use the same real-photography pipeline as the cards. */
function CategoryPhoto({ name, kind }: { name: string; kind: "flower" | "plant" | "bouquet" }) {
  const gallery = useGalleryForProduct(name.toLowerCase().replace(/\s+/g, "-"), name, "", kind, 1, true);
  return <ProductImage sources={gallery.sources} alt={name} loading={gallery.loading} className="h-20 w-20 shrink-0" rounded="rounded-xl" />;
}

export function HomePage() {
  const [data, setData] = useState<{ bouquets: Bouquet[]; flowers: Flower[]; plants: Plant[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<{ bouquets: Bouquet[] }>("/api/catalog/bouquets"),
      api<{ flowers: Flower[] }>("/api/catalog/flowers?sort=name&inStock=true"),
      api<{ plants: Plant[] }>("/api/catalog/plants"),
    ])
      .then(([b, f, p]) => setData({ bouquets: b.bouquets.slice(0, 3), flowers: f.flowers.slice(0, 4), plants: p.plants.slice(0, 3) }))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      {/* hero */}
      <section className="relative overflow-hidden bg-forest-800 text-cream-50">
        <img src="/images/hero.svg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28">
          <p className="badge bg-marigold-500/90 text-forest-900">Fresh from Indian farms, daily</p>
          <h1 className="mt-4 max-w-xl text-4xl leading-tight text-cream-50 sm:text-5xl">
            Say it with flowers.<br />
            <span className="text-marigold-400">Build it your way.</span>
          </h1>
          <p className="mt-4 max-w-lg text-cream-100/90">
            146 flower varieties and 193 plants — all with real photographs, not clip-art. Loose stems from ₹6,
            ready bouquets, UPI/cards or cash on delivery, and India-wide delivery on any PIN code starting 1–8.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/builder" className="btn bg-marigold-500 text-forest-900 hover:bg-marigold-400">Build a bouquet 🌸</Link>
            <Link to="/bouquets" className="btn border border-cream-50/40 text-cream-50 hover:bg-forest-700/60">Shop bouquets</Link>
            <Link to="/delivery" className="btn btn-sm border border-cream-50/30 text-cream-100 hover:bg-forest-700/60">Check my PIN code</Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-cream-100/80">
            <li>🚚 All-India delivery · 1–4 day metros</li>
            <li>💵 COD + 📱 UPI / cards / netbanking</li>
            <li>🌸 340+ species with photographs</li>
            <li>🔎 Not listed? We show it as out of stock, never “no results”</li>
          </ul>
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/flowers", title: "Flowers by stem", sub: "146 varieties · roses from ₹30, genda from ₹6", name: "Red Hybrid Tea Rose", kind: "flower" as const },
            { to: "/plants", title: "Plants & pots", sub: "193 species · care guide on every listing", name: "Money Plant (Golden Pothos)", kind: "plant" as const },
            { to: "/bouquets", title: "Ready bouquets", sub: "Hand-tied recipes · price = stems + tying", name: "Blush Romance", kind: "bouquet" as const },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="card group flex items-center gap-4 overflow-hidden p-4 transition hover:shadow-lift">
              <CategoryPhoto name={c.name} kind={c.kind} />
              <div className="min-w-0">
                <h3 className="font-semibold text-forest-900 group-hover:text-forest-700">{c.title}</h3>
                <p className="mt-0.5 text-xs text-forest-700/70">{c.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-6xl px-4">
          <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Couldn't load the shop — {error}</div>
        </div>
      )}

      {data && (
        <>
          <Section title="Bestsellers in bouquets" link="/bouquets">
            {data.bouquets.map((b) => (
              <ProductCard key={b.id} slug={b.slug} name={b.name} image={b.imageUrl} kind="bouquet"
                priceLabel={priceFor(b.pricePaise)} inStock={b.inStock}
                subtitle={b.composition.map((c) => c.name).join(" · ")} />
            ))}
          </Section>

          <Section title="Pick your own stems" link="/flowers">
            {data.flowers.map((f) => (
              <ProductCard key={f.id} slug={f.slug} name={f.name} image={f.imageUrl} kind="flower"
                priceLabel={priceFor(f.pricePerStemPaise, "/ stem")} inStock={f.inStock}
                accent={`${f.stockStems} in stock`} colorHex={f.colorHex} />
            ))}
          </Section>

          <Section title="Green friends" link="/plants">
            {data.plants.map((p) => (
              <ProductCard key={p.id} slug={p.slug} name={p.name} image={p.imageUrl} kind="plant"
                priceLabel={p.priceFromPaise ? `From ${priceFor(p.priceFromPaise)}` : "Unavailable"} inStock={p.inStock}
                subtitle={p.careWatering ? `💧 ${p.careWatering} · ☀️ ${p.careLight}` : undefined} />
            ))}
          </Section>
        </>
      )}

      {/* builder teaser */}
      <section className="mx-auto mt-8 max-w-6xl px-4">
        <div className="overflow-hidden rounded-3xl bg-forest-700 px-6 py-10 text-center text-cream-50 sm:px-12">
          <h2 className="text-2xl text-cream-50">Your bouquet, your rules</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-cream-100/85">
            Choose stems, wrapping, ribbon and a greeting card. Watch the price update live — the server
            always re-checks it at checkout, so what you see is what you pay.
          </p>
          <p className="mt-3 text-xs text-cream-100/60">e.g. 5 roses × ₹30 + 3 lilies × ₹80 + kraft wrap ₹50 + satin ribbon ₹20 = ₹460</p>
          <Link to="/builder" className="btn mt-6 bg-cream-50 text-forest-800 hover:bg-cream-200">Open the builder</Link>
        </div>
      </section>
    </div>
  );
}

function Section({ title, link, children }: { title: string; link: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex items-end justify-between">
        <h2 className="text-xl text-forest-800">{title}</h2>
        <Link to={link} className="text-sm font-semibold text-forest-600 hover:text-forest-800">View all →</Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}
