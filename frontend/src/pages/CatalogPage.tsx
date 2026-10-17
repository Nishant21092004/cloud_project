import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Bouquet, CatalogMeta, Flower, Plant } from "../api/types";
import { ProductCard, priceFor } from "../components/ProductCard";
import { ProductImage, useGalleryForProduct, PhotoCredit } from "../components/ProductImage";
import { EmptyState, ErrorBox, PageTitle, Spinner } from "../components/ui";
import { formatPaise } from "../lib/format";

type Category = "flowers" | "bouquets" | "plants";

const META: Record<Category, { title: string; subtitle: string; noun: string }> = {
  flowers: { title: "Flowers by stem", subtitle: "Mix any stems — every one of them also works in the bouquet builder.", noun: "flowers" },
  bouquets: { title: "Ready-made bouquets", subtitle: "Hand-tied recipes; availability comes from the stems in each recipe.", noun: "bouquets" },
  plants: { title: "Plants & pots", subtitle: "Pick your pot and size — price and stock live on the variant.", noun: "plants" },
};

const SORTS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
  { value: "name", label: "A–Z" },
];

const PAGE_SIZE = 24;

interface ListResponse {
  flowers?: Flower[];
  bouquets?: Bouquet[];
  plants?: Plant[];
  meta?: CatalogMeta;
}

export function CatalogPage({ category }: { category: Category }) {
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [sort, setSort] = useState("newest");
  const [inStock, setInStock] = useState(false);
  const [maxPrice, setMaxPrice] = useState("");
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

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
    setVisible(PAGE_SIZE);
    const path = category === "flowers" ? "/api/catalog/flowers" : category === "bouquets" ? "/api/catalog/bouquets" : "/api/catalog/plants";
    let cancelled = false;
    // debounced so typing "hydn…" does not fire a request per keystroke
    const timer = setTimeout(() => {
      api<ListResponse>(`${path}?${query}`)
        .then((res) => { if (!cancelled) setData(res); })
        .catch((e) => { if (!cancelled) setError(e.message); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [category, query]);

  const items: Array<Flower | Bouquet | Plant> = data
    ? category === "flowers" ? data.flowers ?? [] : category === "bouquets" ? data.bouquets ?? [] : data.plants ?? []
    : [];
  const meta = data?.meta;
  const unavailable = meta?.unavailable;
  const shown = items.slice(0, visible);
  const outOfStock = items.filter((i) => !i.inStock).length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageTitle title={META[category].title} subtitle={META[category].subtitle} />

      {/* filters */}
      <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-48 flex-1">
          <label className="label" htmlFor="q">Search</label>
          <input
            id="q" className="input" autoComplete="off"
            placeholder={category === "plants" ? "e.g. snake plant, tulsi, monstera…" : "e.g. rose, genda marigold, hydrangea…"}
            value={q} onChange={(e) => setQ(e.target.value)}
          />
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

      {!loading && items.length > 0 && (
        <p className="mb-4 px-1 text-xs text-forest-700/70">
          {items.length} {META[category].noun} match
          {outOfStock > 0 && <> · {outOfStock} currently out of stock (shown, with a photo, so you know we carry the variety)</>}
          {" "}· photography of each species is loaded from Wikimedia Commons — hover a card for more frames.
        </p>
      )}

      {loading ? (
        <Spinner label="Loading the garden…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={() => setQ((x) => x)} />
      ) : items.length === 0 && q.trim() ? (
        // No dead ends: an item we do not list is reported as OUT OF STOCK,
        // with a real photograph and the nearest things we do have.
        <UnavailableResult term={q.trim()} category={category} meta={unavailable} />
      ) : items.length === 0 ? (
        <EmptyState title="No products in these filters" hint="Try clearing the price or stock filters — the catalogue has 350+ listings." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {category === "flowers" &&
              (shown as Flower[]).map((f) => (
                <ProductCard key={f.id} slug={f.slug} name={f.name} image={f.imageUrl} kind="flower"
                  priceLabel={priceFor(f.pricePerStemPaise, "/ stem")} inStock={f.inStock}
                  accent={f.stockStems > 0 ? `${f.stockStems} stems` : undefined}
                  subtitle={f.description} colorHex={f.colorHex} />
              ))}
            {category === "bouquets" &&
              (shown as Bouquet[]).map((b) => (
                <ProductCard key={b.id} slug={b.slug} name={b.name} image={b.imageUrl} kind="bouquet"
                  priceLabel={priceFor(b.pricePaise)} inStock={b.inStock}
                  accent={b.inStock && b.availableQty <= 5 ? `Only ${b.availableQty} left` : undefined}
                  subtitle={b.composition.map((c) => `${c.stems}× ${c.name}`).join(", ")} />
              ))}
            {category === "plants" &&
              (shown as Plant[]).map((p) => (
                <ProductCard key={p.id} slug={p.slug} name={p.name} image={p.imageUrl} kind="plant"
                  priceLabel={p.priceFromPaise ? `From ${priceFor(p.priceFromPaise)}` : "Unavailable"}
                  inStock={p.inStock} subtitle={`💧 ${p.careWatering}`} />
              ))}
          </div>
          {items.length > shown.length && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <button className="btn-secondary" onClick={() => setVisible((v) => v + PAGE_SIZE * 2)}>
                Show {Math.min(PAGE_SIZE * 2, items.length - shown.length)} more
              </button>
              <p className="text-xs text-forest-700/60">Showing {shown.length} of {items.length}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * The "we don't stock that (right now)" state. A customer who searches
 * "blue rose" should learn that we cannot supply it today — not stare at
 * "0 results". Same photograph pipeline as a product card, real label.
 */
function UnavailableResult({ term, category, meta }: { term: string; category: Category; meta?: CatalogMeta["unavailable"] }) {
  const kind = category === "plants" ? "plant" : category === "bouquets" ? "bouquet" : "flower";
  const gallery = useGalleryForProduct(`unavailable:${term}`, term, "", kind, 4, true);
  const similar = meta?.similar ?? [];

  return (
    <div className="space-y-6">
      <div className="card flex flex-col gap-5 p-5 sm:flex-row">
        <div className="w-full shrink-0 sm:w-44">
          <ProductImage sources={gallery.sources} alt={`${term} — reference photograph`} loading={gallery.loading} className="aspect-square w-full" />
          <PhotoCredit photo={gallery.meta[0]} className="mt-1.5" />
        </div>
        <div className="min-w-0">
          <span className="badge bg-red-100 text-red-700">Out of stock</span>
          <h3 className="mt-2 text-xl font-semibold text-forest-900">{term}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-forest-700/80">
            We cannot supply <strong>{term}</strong> right now — it is not in this season's catalogue, so it is marked
            out of stock rather than hidden. Photographs shown are reference images of the variety, not a listing.
          </p>
          {meta?.foundIn && meta.foundInName && (
            <p className="mt-2 rounded-xl bg-forest-50 px-3 py-2 text-sm text-forest-800">
              🌿 We do stock <Link to={`/${meta.foundIn}?q=${encodeURIComponent(meta.foundInName.split(" ").slice(0, 2).join(" "))}`} className="font-semibold hover:underline">“{meta.foundInName}”</Link>{" "}
              <span className="text-forest-700/60">— it lives under {meta.foundIn}, not {category}.</span>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link to="/builder" className="btn-primary btn-sm">Build a custom bouquet instead</Link>
            <Link to={`/${category === "bouquets" ? "flowers" : category}`} className="btn-secondary btn-sm">Browse {category}</Link>
          </div>
        </div>
      </div>

      {similar.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-forest-700/70">Closest we have</h4>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {similar.map((s) => (
              <Link key={s.slug} to={`/product/${s.slug}`} className="card flex items-center gap-3 p-3 transition hover:shadow-lift">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-forest-900">{s.name}</span>
                  <span className="mt-0.5 block text-xs text-forest-700/70">{s.pricePaise ? formatPaise(s.pricePaise) : "—"} · {s.inStock ? "in stock" : "out of stock"}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
