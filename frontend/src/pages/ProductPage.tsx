import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Product } from "../api/types";
import { formatPaise } from "../lib/format";
import { ErrorBox, IssueBanner, QtyStepper, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { photoGallery, fallbackImage } from "../lib/photos";

export function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);

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
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={error} /></div>;
  if (!product) return <Spinner />;

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

  const photos = photoGallery(product.name, product.imageUrl, product.type);
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <nav className="mb-4 text-sm text-forest-600">
        <Link to={product.type === "flower" ? "/flowers" : product.type === "bouquet" ? "/bouquets" : "/plants"} className="hover:underline">
          ← Back to {product.type === "flower" ? "flowers" : product.type === "bouquet" ? "bouquets" : "plants"}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="card overflow-hidden p-2">
          <img src={photos[selectedPhoto]} alt={`${product.name} reference photo ${selectedPhoto + 1}`} className="aspect-square w-full rounded-xl object-cover"
            onError={(e) => { const fallback = fallbackImage(product.imageUrl, product.type); if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; }} />
          <div className="grid grid-cols-4 gap-2 p-2" aria-label="View four reference photographs">
            {photos.map((src, index) => <button type="button" key={index} onClick={() => setSelectedPhoto(index)}
              aria-label={`View image ${index + 1}`} aria-pressed={selectedPhoto === index}
              className={`overflow-hidden rounded-lg border-2 ${selectedPhoto === index ? "border-forest-600" : "border-transparent"}`}>
              <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover"
                onError={(e) => { const fallback = fallbackImage(product.imageUrl, product.type); if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; }} />
            </button>)}
          </div>
          <p className="px-2 pb-2 text-xs text-forest-700/60">Reference photographs are illustrative; the exact cultivar may vary.</p>
        </div>

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
              {adding ? "Adding…" : canAdd ? "Add to cart" : "Unavailable"}
            </button>
            <Link to="/builder" className="btn-ghost">or build your own bouquet →</Link>
          </div>

          {issues.length > 0 && <div className="mt-4"><IssueBanner issues={issues} /></div>}

          {product.type === "flower" && (
            <p className="mt-4 text-xs text-forest-700/60">
              {product.stockStems} stems in stock right now · stock lives at the stem level, exactly like the warehouse.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
