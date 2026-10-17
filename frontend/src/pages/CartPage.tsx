import { MiniPhoto } from "../components/ProductImage";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Cart, CartLine } from "../api/types";
import { formatPaise } from "../lib/format";
import { EmptyState, ErrorBox, IssueBanner, PageTitle, Spinner } from "../components/ui";
import { useToast } from "../context/ToastContext";

export function CartPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [cart, setCart] = useState<Cart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const load = useCallback(() => {
    api<{ cart: Cart }>("/api/cart")
      .then((d) => setCart(d.cart))
      .catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const mutate = async (fn: () => Promise<unknown>, itemId: string) => {
    setBusyItem(itemId);
    try {
      const d = (await fn()) as { cart: Cart };
      setCart(d.cart);
    } catch (e) {
      toast("error", (e as Error).message);
      load();
    } finally {
      setBusyItem(null);
    }
  };

  const setQty = (line: CartLine, next: number) => {
    if (line.kind === "CUSTOM") return;
    const body = line.kind === "FLOWER" ? { stems: next } : { qty: next };
    void mutate(() => api(`/api/cart/items/${line.itemId}`, { method: "PATCH", body }), line.itemId);
  };

  const remove = (line: CartLine) => void mutate(() => api(`/api/cart/items/${line.itemId}`, { method: "DELETE" }), line.itemId);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={error} onRetry={load} /></div>;
  if (!cart) return <Spinner label="Fetching your cart…" />;

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14">
        <EmptyState
          title="Your cart is empty"
          hint="Add loose stems, a ready bouquet, a plant — or design something of your own."
          action={{ to: "/bouquets", label: "Browse bouquets" }}
        />
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/flowers" className="btn-secondary btn-sm">Flowers</Link>
          <Link to="/plants" className="btn-secondary btn-sm">Plants</Link>
          <Link to="/builder" className="btn-secondary btn-sm">Build a bouquet</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageTitle title="Your cart" subtitle="Prices are re-verified against live stock every time you open this page." />

      {cart.hasIssues && (
        <div className="mb-4">
          <IssueBanner issues={cart.lines.flatMap((l) => l.issues)} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <ul className="space-y-3">
          {cart.lines.map((line) => (
            <li key={line.itemId} className={`card flex gap-4 p-4 transition ${busyItem === line.itemId ? "opacity-50" : ""} ${line.issues.length > 0 ? "ring-1 ring-marigold-400/60" : ""}`}>
              {line.image ? (
                <MiniPhoto slug={line.flowerId ?? line.bouquetId ?? line.plantVariantId ?? line.itemId} name={line.title} image={line.image ?? ""} colorHex={line.colorHex ?? undefined}
                  kind={line.kind === "PLANT" ? "plant" : line.kind === "BOUQUET" || line.kind === "CUSTOM" ? "bouquet" : "flower"}
                  className="h-20 w-20 shrink-0 rounded-xl" />
              ) : (
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-forest-50 text-2xl">💐</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold leading-tight">{line.title}</p>
                    <p className="truncate text-xs text-forest-700/60">{line.subtitle}</p>
                  </div>
                  <button className="text-xs font-semibold text-red-500 hover:text-red-700" onClick={() => remove(line)}>Remove</button>
                </div>

                {line.kind === "CUSTOM" && line.config && (
                  <details className="mt-2 text-xs text-forest-700/80">
                    <summary className="cursor-pointer font-semibold text-forest-700">View composition</summary>
                    <ul className="mt-1.5 space-y-0.5">
                      {line.config.flowers.map((f) => (
                        <li key={f.flowerId}>{f.stems} × {f.name} — {formatPaise(f.pricePerStemPaise * f.stems)}</li>
                      ))}
                      {line.config.wrapping && <li>Wrapping: {line.config.wrapping.name} — {formatPaise(line.config.wrapping.chargePaise)}</li>}
                      {line.config.ribbon && <li>Ribbon: {line.config.ribbon.name} — {formatPaise(line.config.ribbon.chargePaise)}</li>}
                      {line.config.extras.map((x) => <li key={x.name}>{x.name} — {formatPaise(x.chargePaise)}</li>)}
                      {line.config.greetingMessage && <li className="italic">“{line.config.greetingMessage}”</li>}
                    </ul>
                  </details>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  {line.kind === "CUSTOM" ? (
                    <Link to={`/builder?item=${line.itemId}`} className="btn-secondary btn-sm">Edit bouquet</Link>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="inline-flex items-center rounded-full border border-cream-300 bg-white">
                        <button className="px-3 py-1 text-forest-700 disabled:opacity-30"
                          disabled={line.qty <= 1 || busyItem === line.itemId}
                          onClick={() => setQty(line, line.qty - 1)}>−</button>
                        <span className="min-w-7 text-center text-sm font-bold">
                          {line.kind === "FLOWER" ? `${line.qty} stems` : line.qty}
                        </span>
                        <button className="px-3 py-1 text-forest-700 disabled:opacity-30"
                          disabled={line.qty >= line.maxQty || busyItem === line.itemId}
                          onClick={() => setQty(line, line.qty + 1)}>+</button>
                      </div>
                      {line.maxQty > 0 && line.qty >= line.maxQty && <span className="text-[11px] text-forest-700/50">max available</span>}
                    </div>
                  )}
                  <p className="font-semibold tabular-nums">{formatPaise(line.lineTotalPaise)}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">Summary</h2>
            <div className="mt-3 flex justify-between text-sm">
              <span>{cart.itemCount} item{cart.itemCount === 1 ? "" : "s"}</span>
              <span />
            </div>
            <div className="mt-1 flex justify-between border-b border-cream-200 pb-3 text-sm">
              <span>Subtotal</span>
              <span className="font-semibold tabular-nums">{formatPaise(cart.subtotalPaise)}</span>
            </div>
            <p className="mt-2 text-xs text-forest-700/60">Delivery is calculated per PIN code at checkout.</p>
            <button
              className="btn-primary mt-4 w-full"
              disabled={cart.hasIssues}
              onClick={() => navigate("/checkout")}
            >
              {cart.hasIssues ? "Fix stock issues first" : "Proceed to checkout"}
            </button>
            <button className="btn-ghost btn-sm mt-2 w-full" onClick={() => mutate(() => api("/api/cart", { method: "DELETE" }), "all")}>
              Empty cart
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
