import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Bouquet, Flower, Plant } from "../api/types";
import { ProductCard, priceFor } from "../components/ProductCard";

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
            Loose stems from ₹10, ready-made bouquets, easy plants — or design your own bouquet petal by petal
            with our builder and get it hand-tied the same day.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link to="/builder" className="btn bg-marigold-500 text-forest-900 hover:bg-marigold-400">Build a bouquet 🌸</Link>
            <Link to="/bouquets" className="btn border border-cream-50/40 text-cream-50 hover:bg-forest-700/60">Shop bouquets</Link>
          </div>
        </div>
      </section>

      {/* categories */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { to: "/flowers", title: "Flowers by stem", sub: "Roses from ₹30 · marigolds from ₹10", img: "/images/products/rose-red.svg" },
            { to: "/bouquets", title: "Ready bouquets", sub: "Hand-tied, recipe-backed freshness", img: "/images/products/blush-romance.svg" },
            { to: "/plants", title: "Plants & pots", sub: "From ₹99 with care guides", img: "/images/products/snake-plant.svg" },
          ].map((c) => (
            <Link key={c.to} to={c.to} className="card group flex items-center gap-4 overflow-hidden p-4 transition hover:shadow-lift">
              <img src={c.img} alt="" className="h-20 w-20 rounded-xl bg-cream-200 object-cover" />
              <div>
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
                accent={`${f.stockStems} in stock`} />
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
