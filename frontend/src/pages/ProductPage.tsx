import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Flower, Plant, Product } from "../api/types";
import { formatPaise } from "../lib/format";
import { ErrorBox, IssueBanner, QtyStepper, Spinner } from "../components/ui";
import { PhotoCredit, ProductImage, useGalleryForProduct } from "../components/ProductImage";
import { ProductCard, priceFor } from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [alternatives, setAlternatives] = useState<Flower[]>([]);

  useEffect(() => {
    setProduct(null);
    setSelectedPhoto(0);
    setError(null);
    api<{ product: Product }>(`/api/catalog/products/${slug}`)
      .then((d) => {
        setProduct(d.product);
        if (d.product.type === "plant") {
          const first = d.product.variants.find((v) => v.inStock) ?? d.product.variants[0];
          setVariantId(first?.id ?? null);
          setQty(1);
        }
        // sold out → offer in-stock relatives instead of a dead end
        if (!d.product.inStock) {
          const word = d.product.name.split(" ").slice(-2).join(" ");
          api<{ flowers: Flower[] }>(`/api/catalog/flowers?q=${encodeURIComponent(word)}&inStock=true&sort=price_asc`)
            .then((r) => setAlternatives(r.flowers.filter((f) => f.slug !== d.product.slug).slice(0, 4)))
            .catch(() => setAlternatives([]));
        }
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  const gallery = useGalleryForProduct(
    slug ?? "",
    product?.name ?? "",
    product?.imageUrl ?? "",
    product?.type ?? "flower",
    4,
    !!product,
    (product as { colorHex?: string } | null)?.colorHex,
  );
  const frames = gallery.sources;

  const closeOnEscape = useCallback((e: KeyboardEvent) => { if (e.key === "Escape") setLightbox(false); }, []);
  useEffect(() => {
    if (!lightbox) return;
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [lightbox, closeOnEscape]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={error} /></div>;
  if (!product) return <Spinner label="Opening the product page…" />;

  const addToCart = async () => {
    if (!user) {
      toast("info", "Please sign in to start a cart — it stays saved to your account.");
      navigate("/login", { state: { from: `/product/${slug}` } });
      return;
    }
    setAdding(true);
    try {
      if (product.type === "flower") {
        await api("/api/cart/items", { method: "POST", body: { kind: "FLOWER", flowerId: product.id, stems: qty } });
      } else if (product.type === "bouquet") {
        await api("/api/cart/items", { method: "POST", body: { kind: "BOUQUET", bouquetId: product.id, qty } });
      } else {
        if (!variantId) throw new Error("Please choose a pot & size first");
        await api("/api/cart/items", { method: "POST", body: { kind: "PLANT", variantId, qty } });
      }
      toast("success", `${product.name} added to your cart`);
      setIssues([]);
    } catch (e) {
      const err = e as { message: string; details?: { issues?: string[] } };
      setIssues(err.details?.issues ?? [err.message]);
      toast("error", err.message);
    } finally {
      setAdding(false);
    }
  };

  const priceLabel =
    product.type === "flower" ? `${formatPaise(product.pricePerStemPaise)} / stem`
    : product.type === "bouquet" ? formatPaise(product.pricePaise)
    : product.variants.find((v) => v.id === variantId)?.pricePaise
      ? formatPaise(product.variants.find((v) => v.id === variantId)!.pricePaise)
      : "Choose a pot & size";

  const maxQty =
    product.type === "flower" ? Math.max(1, Math.min(24, product.stockStems))
    : product.type === "bouquet" ? Math.max(1, Math.min(20, product.availableQty))
    : Math.max(1, Math.min(20, product.variants.find((v) => v.id === variantId)?.stock ?? 1));

  const canAdd =
    product.type === "flower" ? product.inStock
    : product.type === "bouquet" ? product.inStock
    : Boolean(variantId && product.variants.find((v) => v.id === variantId)?.inStock);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-forest-600">
        <Link to={product.type === "flower" ? "/flowers" : product.type === "bouquet" ? "/bouquets" : "/plants"} className="hover:underline">
          ← Back to {product.type === "flower" ? "flowers" : product.type === "bouquet" ? "bouquets" : "plants"}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* photography */}
        <div className="card overflow-hidden p-2">
          <button
            type="button"
            onClick={() => frames.length > 0 && setLightbox(true)}
            className="block w-full cursor-zoom-in text-left"
            aria-label="Open larger photo"
          >
            <ProductImage
              sources={[frames[selectedPhoto] ?? frames[0]]}
              alt={`${product.name} — photograph ${selectedPhoto + 1}`}
              loading={gallery.loading}
              className="aspect-square w-full"
              imgClassName="transition duration-500 hover:scale-[1.02]"
            />
          </button>

          <div className="grid grid-cols-4 gap-2 p-2" aria-label={`${frames.length} photographs of ${product.name}`}>
            {frames.map((src, index) => (
              <button key={`${src}-${index}`} type="button" onClick={() => setSelectedPhoto(index)}
                aria-label={`View image ${index + 1}`} aria-pressed={selectedPhoto === index}
                className={`overflow-hidden rounded-lg border-2 transition ${selectedPhoto === index ? "border-forest-600" : "border-transparent hover:border-forest-300"}`}>
                <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover"
                  onError={(e) => { e.currentTarget.style.opacity = "0.3"; }} />
              </button>
            ))}
          </div>

          <div className="flex items-end justify-between gap-3 px-2 pb-2">
            <PhotoCredit photo={gallery.meta[selectedPhoto]} />
            <p className="text-[10px] leading-snug text-forest-700/50">
              {gallery.loading ? "Loading species photography…" : "Reference photographs of this species — the exact cultivar and bloom size vary with the farm cut."}
            </p>
          </div>
        </div>

        {/* details */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-forest-50 text-forest-700">
              {product.type === "flower" ? "Loose stems" : product.type === "bouquet" ? "Ready bouquet" : "Plant"}
            </span>
            {product.inStock
              ? <span className="badge bg-forest-100 text-forest-800">In stock</span>
              : <span className="badge bg-red-100 text-red-700">Out of stock</span>}
          </div>
          <h1 className="mt-3 text-3xl text-forest-800">{product.name}</h1>
          <p className="mt-1 text-xl font-semibold text-forest-700">{priceLabel}</p>
          <p className="mt-4 leading-relaxed text-forest-900/80">{product.description}</p>

          {product.type === "plant" && (
            <div className="card mt-5 divide-y divide-cream-200 text-sm">
              <div className="flex gap-3 px-4 py-3"><span>💧</span><div><p className="font-semibold">Watering</p><p className="text-forest-700/80">{product.careWatering}</p></div></div>
              <div className="flex gap-3 px-4 py-3"><span>☀️</span><div><p className="font-semibold">Light</p><p className="text-forest-700/80">{product.careLight}</p></div></div>
              {product.careNotes && (
                <div className="flex gap-3 px-4 py-3"><span>📝</span><div><p className="font-semibold">Care notes</p><p className="text-forest-700/80">{product.careNotes}</p></div></div>
              )}
            </div>
          )}

          {product.type === "plant" && (
            <div className="mt-5">
              <p className="label">Pot & size</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <button key={v.id} disabled={!v.inStock}
                    className={`chip ${v.id === variantId ? "chip-on" : v.inStock ? "chip-off" : "cursor-not-allowed border-cream-200 bg-cream-200/50 text-forest-700/40 line-through"}`}
                    onClick={() => setVariantId(v.id)}>
                    {v.label} · {formatPaise(v.pricePaise)}
                    <span className="ml-1.5 text-[10px] opacity-70">{v.inStock ? `(${v.stock} left)` : "(sold out)"}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <QtyStepper value={qty} max={maxQty} onChange={setQty} />
            <button className="btn-primary" disabled={!canAdd || adding} onClick={addToCart}>
              {adding ? "Adding…" : canAdd ? "Add to cart" : "Out of stock"}
            </button>
            <Link to="/builder" className="btn-ghost">or build your own bouquet →</Link>
          </div>

          {!product.inStock && alternatives.length > 0 && (
            <div className="mt-6">
              <p className="label">In stock, closest to this</p>
              <div className="grid grid-cols-2 gap-3">
                {alternatives.map((f) => (
                  <ProductCard key={f.id} slug={f.slug} name={f.name} image={f.imageUrl} kind="flower"
                    priceLabel={priceFor(f.pricePerStemPaise, "/ stem")} inStock={f.inStock} colorHex={f.colorHex} />
                ))}
              </div>
            </div>
          )}

          {issues.length > 0 && <div className="mt-4"><IssueBanner issues={issues} /></div>}

          {product.type === "flower" && (
            <p className="mt-4 text-xs text-forest-700/60">
              {product.stockStems} stems in stock right now · stock lives at the stem level, exactly like the warehouse.
            </p>
          )}

          <p className="mt-4 rounded-xl bg-cream-200/60 px-3.5 py-2.5 text-xs text-forest-800">
            🚚 We deliver across India (PIN codes 1–8) · 📱 UPI / card / netbanking or 💵 cash on delivery — see{" "}
            <Link to="/delivery" className="font-semibold underline">delivery &amp; payment</Link>.
          </p>
        </div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-forest-900/85 p-4" role="dialog" aria-modal="true" aria-label={`${product.name} photographs`} onClick={() => setLightbox(false)}>
          <div className="max-h-[80vh] w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <img src={frames[selectedPhoto] ?? frames[0]} alt={product.name} className="mx-auto max-h-[72vh] w-auto rounded-xl object-contain" />
            <div className="mt-3 flex items-center justify-between gap-3 text-cream-50">
              <PhotoCredit photo={gallery.meta[selectedPhoto]} className="!text-cream-200/70" />
              <div className="flex items-center gap-2">
                <button className="btn btn-sm border border-cream-50/40 text-cream-50 hover:bg-forest-700" onClick={() => setSelectedPhoto((p) => (p - 1 + frames.length) % frames.length)}>←</button>
                <span className="text-xs tabular-nums">{selectedPhoto + 1} / {frames.length}</span>
                <button className="btn btn-sm border border-cream-50/40 text-cream-50 hover:bg-forest-700" onClick={() => setSelectedPhoto((p) => (p + 1) % frames.length)}>→</button>
                <button className="btn btn-sm bg-cream-50 text-forest-900" onClick={() => setLightbox(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
