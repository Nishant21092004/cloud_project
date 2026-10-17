/**
 * ProductImage — the only way this app renders a product picture.
 *
 * It owns one job: never show a broken image. The gallery hook hands it an
 * ordered list of candidates (admin's own upload → real species photograph →
 * seeded keyword image → drawn artwork) and this component walks down that list whenever the
 * browser reports a load failure, so an offline demo laptop still gets
 * artwork instead of a torn-photo icon.
 */
import { useEffect, useRef, useState } from "react";
import type { ProductPhoto, ProductKind } from "../lib/photos";
import { photoAttribution, rotateFor, useProductPhotos } from "../lib/photos";

/** Fires once when the element is near the viewport — no work for off-screen cards. */
export function useInView<T extends HTMLElement>(rootMargin = "240px"): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting || e.intersectionRatio > 0)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, rootMargin]);
  return [ref, inView];
}

export interface Gallery {
  sources: string[];
  meta: (ProductPhoto | undefined)[];
  loading: boolean;
  retry: () => void;
  /** How many of `sources` are real retrieved photographs (not fallback art). */
  realCount: number;
}

/** Card-sized lists use this; it defers the photograph lookup until visible. */
export function useGalleryForProduct(
  slug: string,
  name: string,
  imageUrl: string,
  kind: ProductKind,
  count = 4,
  active = true,
  colorHex?: string,
): Gallery & { degraded: boolean } {
  const gallery = useProductPhotos(name, imageUrl, kind, count, active, colorHex);
  // The species lookup is shared by every variety of one species, so rotate the
  // order per slug — that way "Red Dahlia" and "Yellow Dahlia" do not open on
  // the same photograph while still showing the same image set.
  const sources = rotateFor(gallery.sources, slug);
  const meta = rotateFor(gallery.meta, slug);
  const realCount = sources.filter((url) => !url.startsWith("/images/") && !url.startsWith("data:") && !url.includes("loremflickr.com")).length;
  return { ...gallery, sources, meta, realCount };
}

export function ProductImage({
  sources, alt, className, imgClassName, loading = false, rounded = "rounded-xl",
}: {
  sources: string[];
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: boolean;
  rounded?: string;
}) {
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [sources.join("|")]);
  const safeIndex = Math.min(index, Math.max(0, sources.length - 1));
  const src = sources[safeIndex];

  return (
    <div className={`relative overflow-hidden bg-cream-200 ${rounded} ${className ?? ""}`}>
      {loading && !src ? (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-cream-200 via-cream-100 to-cream-200" aria-hidden />
      ) : null}
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setIndex((i) => (i + 1 < sources.length ? i + 1 : i))}
          className={`h-full w-full object-cover ${imgClassName ?? ""}`}
        />
      ) : null}
    </div>
  );
}

/** Attribution for third-party photography — the licence says we should show it. */
export function PhotoCredit({ photo, className = "" }: { photo: ProductPhoto | undefined; className?: string }) {
  const text = photoAttribution(photo);
  if (!text) return null;
  if (!photo?.pageUrl) return <p className={`text-[10px] leading-snug text-forest-700/50 ${className}`}>{text}</p>;
  return (
    <p className={`text-[10px] leading-snug text-forest-700/50 ${className}`}>
      <a href={photo.pageUrl} target="_blank" rel="noreferrer noopener" className="hover:underline">
        {text}
      </a>
    </p>
  );
}

/**
 * Compact single-frame photo for cart lines, the builder's stem picker and
 * other list rows. Same source-of-truth as a card, just one image, and it
 * only asks the network once the row is close to the viewport.
 */
export function MiniPhoto({ slug, name, image, kind, colorHex, className = "h-14 w-14 rounded-xl", imgClassName = "" }: {
  slug: string;
  name: string;
  image: string;
  kind: "flower" | "plant" | "bouquet";
  colorHex?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>("160px");
  const gallery = useGalleryForProduct(slug || name, name, image, kind, 1, inView, colorHex);
  return (
    <span ref={ref} className={`block shrink-0 overflow-hidden ${className}`}>
      {inView ? (
        <ProductImage sources={gallery.sources} alt={name} loading={gallery.loading} rounded="rounded-none" className="h-full w-full" imgClassName={imgClassName} />
      ) : (
        <span className="block h-full w-full animate-pulse bg-cream-200" aria-hidden />
      )}
    </span>
  );
}
