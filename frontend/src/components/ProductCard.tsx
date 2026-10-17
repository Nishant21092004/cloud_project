import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { formatPaise } from "../lib/format";
import type { ProductKind } from "../lib/photos";
import { ProductImage, useGalleryForProduct, useInView, type Gallery } from "./ProductImage";

export interface CardProps {
  slug: string;
  name: string;
  image: string;
  priceLabel: string;
  inStock: boolean;
  subtitle?: string;
  accent?: string;
  kind?: ProductKind;
  /** Petal colour, used to tint the drawn artwork when no photograph can load. */
  colorHex?: string;
}

/**
 * Catalogue card.
 *
 * Hovering is not just a zoom any more: the card slides out the *other*
 * photographs of this exact flower (3–4 frames, real species photography from
 * Wikimedia Commons) and cycles them, so a customer can judge a bloom before
 * opening the product page. Touch devices get the same strip via focus, and a
 * "N photos" chip tells everyone the gallery exists.
 */
export function ProductCard({ slug, name, image, priceLabel, inStock, subtitle, accent, kind = "flower", colorHex }: CardProps) {
  const [hovered, setHovered] = useState(false);
  const [preview, setPreview] = useState(0);
  const [ref, inView] = useInView<HTMLAnchorElement>();
  const gallery: Gallery & { degraded: boolean } = useGalleryForProduct(slug, name, image, kind, 4, inView, colorHex);
  const frames = gallery.sources.slice(0, 4);
  const timer = useRef<number | null>(null);

  // auto-advance while the pointer rests on the card, but never fight the user
  useEffect(() => {
    if (!hovered || frames.length < 2) return;
    timer.current = window.setInterval(() => setPreview((p) => (p + 1) % frames.length), 1500);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
    };
  }, [hovered, frames.length]);

  useEffect(() => { if (!hovered) setPreview(0); }, [hovered]);

  return (
    <Link
      ref={ref}
      to={`/product/${slug}`}
      className="card group relative block overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift focus-within:shadow-lift"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className="relative aspect-square overflow-hidden bg-cream-200">
        <ProductImage
          sources={[frames[preview] ?? frames[0]]}
          alt={name}
          loading={gallery.loading}
          rounded="rounded-none"
          className="h-full w-full"
          imgClassName="transition duration-500 group-hover:scale-[1.03]"
        />

        {gallery.realCount > 1 && (
          <div
            className="absolute right-2 top-2 flex max-h-[calc(100%-1rem)] translate-x-[130%] flex-col gap-1.5 rounded-xl bg-white/92 p-1.5 shadow-card backdrop-blur transition-transform duration-300 group-hover:translate-x-0 group-focus-within:translate-x-0"
            aria-label={`More photographs of ${name}`}
          >
            {frames.map((src, index) => (
              <button
                type="button"
                key={`${src}-${index}`}
                onMouseEnter={(e) => { e.preventDefault(); setPreview(index); }}
                onFocus={() => setPreview(index)}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPreview(index); }}
                aria-label={`Show photograph ${index + 1} of ${name}`}
                className={`block h-11 w-11 overflow-hidden rounded-lg border-2 transition ${preview === index ? "border-forest-600" : "border-white hover:border-forest-300"}`}
              >
                <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.opacity = "0.25"; }} />
              </button>
            ))}
          </div>
        )}

        {gallery.realCount > 1 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-forest-900/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cream-50 opacity-0 transition group-hover:opacity-100">
            {frames.length} photos · hover
          </span>
        )}
        {!inStock && <span className="badge absolute left-3 top-3 bg-red-100 text-red-700">Out of stock</span>}
        {accent && inStock && <span className="badge absolute left-3 top-3 bg-forest-700/90 text-cream-50">{accent}</span>}
      </div>

      <div className="p-4">
        <h3 className="font-semibold leading-tight text-forest-900">{name}</h3>
        {subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-forest-700/60">{subtitle}</p>}
        <p className="mt-2 text-sm font-semibold text-forest-700">{priceLabel}</p>
      </div>
    </Link>
  );
}


export function priceFor(pricePaise: number, unit?: string) {
  return `${formatPaise(pricePaise)}${unit ? ` ${unit}` : ""}`;
}
