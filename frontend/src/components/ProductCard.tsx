import { Link } from "react-router-dom";
import { formatPaise } from "../lib/format";
import { fallbackImage, photoGallery } from "../lib/photos";
import { useState } from "react";

export interface CardProps {
  slug: string;
  name: string;
  image: string;
  priceLabel: string;
  inStock: boolean;
  subtitle?: string;
  accent?: string;
  kind?: "flower" | "plant" | "bouquet";
}

export function ProductCard({ slug, name, image, priceLabel, inStock, subtitle, accent, kind = "flower" }: CardProps) {
  const [preview, setPreview] = useState(0);
  const photos = photoGallery(name, image, kind);
  return (
    <Link
      to={`/product/${slug}`}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-cream-200">
        <img
          src={photos[preview]}
          alt={name}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          onError={(e) => { const target = e.currentTarget; const fallback = fallbackImage(image, kind); if (!target.src.endsWith(fallback)) target.src = fallback; }}
        />
        <div className="absolute bottom-2 left-2 right-2 hidden grid-cols-4 gap-1.5 rounded-xl bg-white/90 p-1.5 group-hover:grid group-focus-within:grid" aria-label={`More ${name} reference photos`}>
          {photos.map((url, index) => (
            <img key={index} src={url} alt="" loading="lazy" onMouseEnter={() => setPreview(index)}
              onError={(e) => { const fallback = fallbackImage(image, kind); if (!e.currentTarget.src.endsWith(fallback)) e.currentTarget.src = fallback; }}
              className={`aspect-square w-full rounded-md border-2 object-cover ${preview === index ? "border-forest-600" : "border-white"}`} />
          ))}
        </div>
        {!inStock && (
          <span className="badge absolute left-3 top-3 bg-red-100 text-red-700">Out of stock</span>
        )}
        {accent && inStock && (
          <span className="badge absolute left-3 top-3 bg-forest-700/90 text-cream-50">{accent}</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight text-forest-900">{name}</h3>
        </div>
        {subtitle && <p className="mt-0.5 line-clamp-1 text-xs text-forest-700/60">{subtitle}</p>}
        <p className="mt-2 text-sm font-semibold text-forest-700">{priceLabel}</p>
      </div>
    </Link>
  );
}

export function priceFor(pricePaise: number, unit?: string) {
  return `${formatPaise(pricePaise)}${unit ? ` ${unit}` : ""}`;
}
