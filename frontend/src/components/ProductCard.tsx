import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatPaise } from "../lib/format";

export interface CardProps {
  slug: string;
  name: string;
  image: string;
  /** Extra views of the same product (hover gallery). Card image is view #1. */
  gallery?: string[];
  priceLabel: string;
  inStock: boolean;
  subtitle?: string;
  accent?: string;
}

export function ProductCard({ slug, name, image, gallery, priceLabel, inStock, subtitle, accent }: CardProps) {
  const views = useMemo(
    () => [image, ...(gallery ?? [])].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4),
    [image, gallery],
  );
  const [active, setActive] = useState(0);
  const [hovering, setHovering] = useState(false);
  const [paused, setPaused] = useState(false);
  useEffect(() => setActive(0), [slug]);

  // While hovering the card, cycle through the 3–4 views automatically.
  useEffect(() => {
    if (!hovering || paused || views.length < 2) return;
    const id = window.setInterval(() => setActive((i) => (i + 1) % views.length), 1100);
    return () => window.clearInterval(id);
  }, [hovering, paused, views.length]);

  return (
    <Link
      to={`/product/${slug}`}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => { setHovering(false); setPaused(false); setActive(0); }}
      className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="relative aspect-square overflow-hidden bg-cream-200">
        {views.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${name} — view ${i + 1}`}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition duration-300 ${
              i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0"
            }`}
          />
        ))}
        {!inStock && (
          <span className="badge absolute left-3 top-3 bg-red-100 text-red-700">Out of stock</span>
        )}
        {accent && inStock && (
          <span className="badge absolute left-3 top-3 bg-forest-700/90 text-cream-50">{accent}</span>
        )}
        {views.length > 1 && (
          <div
            className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {views.map((src, i) => (
              <span
                key={src}
                role="presentation"
                onMouseEnter={() => setActive(i)}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === active ? "w-5 bg-forest-700" : "w-1.5 bg-forest-700/40 group-hover:bg-forest-700/70"
                }`}
              />
            ))}
          </div>
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
