import { useEffect, useMemo, useState } from "react";
import { api } from "../api/client";
import type { Bouquet, Flower, Plant } from "../api/types";
import { ProductCard, priceFor } from "../components/ProductCard";
import { EmptyState, ErrorBox, PageTitle, Spinner } from "../components/ui";
import { photoGallery, fallbackImage } from "../lib/photos";

type Category = "flowers" | "bouquets" | "plants";

const META: Record<Category, { title: string; subtitle: string }> = {
  flowers: { title: "Flowers by stem", subtitle: "Mix any stems — they all work in the bouquet builder too." },
  bouquets: { title: "Ready-made bouquets", subtitle: "Hand-tied recipes; stock is real — when the stems run out, it's gone." },
  plants: { title: "Plants & pots", subtitle: "Pick your pot and size — price and stock per variant." },
};

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "name", label: "A–Z" },
];

export function CatalogPage({ category }: { category: Category }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("newest");
  const [inStock, setInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [data, setData] = useState<{ flowers?: Flower[]; bouquets?: Bouquet[]; plants?: Plant[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set("q", q.trim());
    if (sort) p.set("sort", sort);
    if (inStock) p.set("inStock", "true");
    if (maxPrice && !Number.isNaN(Number(maxPrice))) p.set("maxPrice", maxPrice);
    return p.toString();
  }, [q, sort, inStock, maxPrice]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const t = setTimeout(() => {
      api<{ flowers?: Flower[]; bouquets?: Bouquet[]; plants?: Plant[] }>(category === "flowers" ? `/api/catalog/flowers?${query}` : category === "bouquets" ? `/api/catalog/bouquets?${query}` : `/api/catalog/plants?${query}`)
        .then((res) => setData(res))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(t);
  }, [category, query]);

  const items = data
    ? category === "flowers" ? data.flowers ?? [] : category === "bouquets" ? data.bouquets ?? [] : data.plants ?? []
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageTitle title={META[category].title} subtitle={META[category].subtitle} />

      {/* filters */}
      <div className="card mb-6 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input id="q" className="input" placeholder={category === "plants" ? "e.g. snake plant" : "e.g. rose"} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {category !== "plants" && (
          <div className="w-32">
            <label className="label" htmlFor="maxp">Max ₹</label>
            <input id="maxp" className="input" type="number" min={0} placeholder="any" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
          </div>
        )}
        <div className="w-36">
          <label className="label" htmlFor="sort">Sort</label>
          <select id="sort" className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <label className={`chip mb-1 select-none ${inStock ? "chip-on" : "chip-off"}`}>
          <input type="checkbox" className="mr-1.5 accent-forest-700" checked={inStock} onChange={(e) => setInStock(e.target.checked)} />
          In stock only
        </label>
        {(q || inStock || maxPrice || sort !== "newest") && (
          <button className="btn-ghost btn-sm mb-1" onClick={() => { setQ(""); setSort("newest"); setInStock(false); setMaxPrice(""); }}>Clear filters</button>
        )}
      </div>

      {loading ? (
        <Spinner label="Loading the garden…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => setQ((x) => x)} />
      ) : items.length === 0 ? (
        q.trim() && !inStock && !maxPrice ? <UnavailableSearch term={q.trim()} category={category} />
          : <EmptyState title="No products in these filters" hint="Try clearing filters or changing the price/stock settings." />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {category === "flowers" &&
            (items as Flower[]).map((f) => (
              <ProductCard key={f.id} slug={f.slug} name={f.name} image={f.imageUrl} kind="flower"
                priceLabel={priceFor(f.pricePerStemPaise, "/ stem")} inStock={f.inStock}
                accent={f.stockStems > 0 ? `${f.stockStems} stems` : undefined}
                subtitle={f.description} />
            ))}
          {category === "bouquets" &&
            (items as Bouquet[]).map((b) => (
              <ProductCard key={b.id} slug={b.slug} name={b.name} image={b.imageUrl} kind="bouquet"
                priceLabel={priceFor(b.pricePaise)} inStock={b.inStock}
                accent={b.inStock && b.availableQty <= 5 ? `Only ${b.availableQty} left` : undefined}
                subtitle={b.composition.map((c) => `${c.stems}× ${c.name}`).join(", ")} />
            ))}
          {category === "plants" &&
            (items as Plant[]).map((p) => (
              <ProductCard key={p.id} slug={p.slug} name={p.name} image={p.imageUrl} kind="plant"
                priceLabel={p.priceFromPaise ? `From ${priceFor(p.priceFromPaise)}` : "Unavailable"}
                inStock={p.inStock} subtitle={`💧 ${p.careWatering}`} />
            ))}
        </div>
      )}
    </div>
  );
}

function UnavailableSearch({ term, category }: { term: string; category: Category }) {
  const kind = category === "plants" ? "plant" : category === "bouquets" ? "bouquet" : "flower";
  const sample = photoGallery(term, fallbackImage("", kind), kind)[1];
  return (
    <div className="card flex max-w-lg items-center gap-4 p-5">
      <img src={sample} alt={`Illustrative ${term} reference photograph`} className="h-28 w-28 shrink-0 rounded-xl object-cover"
        onError={(e) => { e.currentTarget.src = fallbackImage("", kind); }} />
      <div>
        <span className="badge bg-red-100 text-red-700">Out of stock</span>
        <h3 className="mt-2 text-lg font-semibold text-forest-900">{term}</h3>
        <p className="mt-1 text-xs text-forest-700/70">This item isn't currently in our catalogue. The photo is illustrative, not a product listing. Please try another variety.</p>
      </div>
    </div>
  );
}
