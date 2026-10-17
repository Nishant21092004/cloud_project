import { fallbackImage } from "../lib/photos";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { BuilderOptions, Cart, Flower, Pricing } from "../api/types";
import { formatPaise } from "../lib/format";
import { BouquetPreview } from "../components/BouquetPreview";
import { ErrorBox, IssueBanner, PageTitle, Spinner } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

interface Selection {
  stems: Record<string, number>;
  wrappingId: string | null;
  ribbonId: string | null;
  extraIds: string[];
  message: string;
}

const EMPTY: Selection = { stems: {}, wrappingId: null, ribbonId: null, extraIds: [], message: "" };

export function BuilderPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const editItemId = params.get("item");

  const [flowers, setFlowers] = useState<Flower[] | null>(null);
  const [options, setOptions] = useState<BuilderOptions | null>(null);
  const [sel, setSel] = useState<Selection>(EMPTY);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = useRef(false);

  // load catalogue + options (+ existing config when editing a cart line)
  useEffect(() => {
    Promise.all([
      api<{ flowers: Flower[] }>("/api/catalog/flowers?sort=name"),
      api<BuilderOptions>("/api/catalog/options"),
    ])
      .then(([f, o]) => {
        setFlowers(f.flowers);
        setOptions(o);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  useEffect(() => {
    if (!editItemId || !options) return;
    api<{ cart: Cart }>("/api/cart")
      .then(({ cart }) => {
        const line = cart.lines.find((l) => l.itemId === editItemId && l.kind === "CUSTOM");
        if (!line?.config) {
          toast("error", "That custom bouquet is no longer in your cart");
          navigate("/builder", { replace: true });
          return;
        }
        const cfg = line.config;
        setSel({
          stems: Object.fromEntries(cfg.flowers.map((f) => [f.flowerId, f.stems])),
          wrappingId: options.wrappings.find((w) => w.name === cfg.wrapping?.name)?.id ?? null,
          ribbonId: options.ribbons.find((r) => r.name === cfg.ribbon?.name)?.id ?? null,
          extraIds: options.extras.filter((e) => cfg.extras.some((ce) => ce.name === e.name)).map((e) => e.id),
          message: cfg.greetingMessage ?? "",
        });
      })
      .catch((e) => toast("error", e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editItemId, options === null]);

  const configPayload = useMemo(
    () => ({
      flowers: Object.entries(sel.stems).filter(([, n]) => n > 0).map(([flowerId, stems]) => ({ flowerId, stems })),
      wrappingId: sel.wrappingId,
      ribbonId: sel.ribbonId,
      extraIds: sel.extraIds,
      greetingMessage: sel.message || null,
    }),
    [sel],
  );

  // live server-side quote (debounced) — the price can NEVER be a client guess
  useEffect(() => {
    if (!flowers) return;
    const t = setTimeout(() => {
      api<{ pricing: Pricing }>("/api/catalog/bouquet/preview", { method: "POST", body: configPayload })
        .then((d) => setPricing(d.pricing))
        .catch(() => setPricing(null));
    }, 200);
    return () => clearTimeout(t);
  }, [configPayload, flowers]);

  const setStems = useCallback((flowerId: string, n: number) => {
    dirty.current = true;
    setSel((s) => ({ ...s, stems: { ...s.stems, [flowerId]: Math.max(0, Math.min(24, n)) } }));
  }, []);

  const save = async () => {
    if (!user) {
      toast("info", "Sign in to save your bouquet to the cart.");
      navigate("/login", { state: { from: editItemId ? `/builder?item=${editItemId}` : "/builder" } });
      return;
    }
    if (!pricing?.ok) {
      toast("error", pricing?.errors?.[0]?.message ?? "Finish your bouquet first");
      return;
    }
    setSaving(true);
    try {
      if (editItemId) {
        await api(`/api/cart/items/${editItemId}`, { method: "PATCH", body: { itemId: editItemId, config: configPayload } });
        toast("success", "Bouquet updated in your cart");
      } else {
        await api("/api/cart/items", { method: "POST", body: { kind: "CUSTOM", config: configPayload } });
        toast("success", "Custom bouquet added to your cart 🌼");
      }
      navigate("/cart");
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loadError) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={loadError} /></div>;
  if (!flowers || !options) return <Spinner label="Preparing the flower bar…" />;

  const selectedFlowers = flowers.filter((f) => (sel.stems[f.id] ?? 0) > 0);
  const totalStems = Object.values(sel.stems).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <PageTitle
        title={editItemId ? "Edit your bouquet" : "Build your own bouquet"}
        subtitle="Pick stems, wrapping, ribbon and extras — the server prices every change, live."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* left: flower bar */}
        <div className="space-y-6">
          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">1 · Choose your flowers</h2>
              <span className={`badge ${totalStems >= 6 && totalStems <= 50 ? "bg-forest-100 text-forest-800" : "bg-marigold-400/20 text-marigold-600"}`}>
                {totalStems} stems · min 6, max 50
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {flowers.map((f) => {
                const n = sel.stems[f.id] ?? 0;
                const disabled = f.stockStems === 0;
                return (
                  <div key={f.id} className={`rounded-2xl border p-3 transition ${n > 0 ? "border-forest-500 bg-forest-50/60" : "border-cream-300"} ${disabled ? "opacity-50" : ""}`}>
                    <div className="flex items-center gap-3">
                      <img src={f.imageUrl} alt="" className="h-12 w-12 rounded-xl bg-cream-200 object-cover" onError={(e) => { e.currentTarget.src = fallbackImage("", "flower"); }} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{f.name}</p>
                        <p className="text-xs text-forest-700/70">
                          {formatPaise(f.pricePerStemPaise)}/stem · {f.stockStems} left
                        </p>
                      </div>
                      <span className="h-5 w-5 rounded-full border border-forest-900/20" style={{ background: f.colorHex }} />
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-cream-300 bg-white">
                        <button className="px-3 py-1 text-forest-700 disabled:opacity-30" disabled={disabled || n === 0} onClick={() => setStems(f.id, n - 1)}>−</button>
                        <span className="min-w-7 text-center text-sm font-bold">{n}</span>
                        <button className="px-3 py-1 text-forest-700 disabled:opacity-30"
                          disabled={disabled || n >= 24 || n >= f.stockStems || totalStems >= 50}
                          onClick={() => setStems(f.id, n + 1)}>+</button>
                      </div>
                      {n > 0 && <span className="text-xs font-semibold text-forest-700">{formatPaise(n * f.pricePerStemPaise)}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">2 · Wrapping & ribbon</h2>
            <p className="label">Wrapping</p>
            <div className="flex flex-wrap gap-2">
              {options.wrappings.map((w) => (
                <button key={w.id} className={`chip ${sel.wrappingId === w.id ? "chip-on" : "chip-off"}`}
                  onClick={() => { dirty.current = true; setSel((s) => ({ ...s, wrappingId: s.wrappingId === w.id ? null : w.id })); }}>
                  {w.name} · {formatPaise(w.chargePaise)}
                </button>
              ))}
            </div>
            <p className="label mt-4">Ribbon</p>
            <div className="flex flex-wrap gap-2">
              {options.ribbons.map((r) => (
                <button key={r.id} className={`chip ${sel.ribbonId === r.id ? "chip-on" : "chip-off"}`}
                  onClick={() => { dirty.current = true; setSel((s) => ({ ...s, ribbonId: s.ribbonId === r.id ? null : r.id })); }}>
                  {r.name} · {r.chargePaise === 0 ? "free" : formatPaise(r.chargePaise)}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">3 · Extras & message</h2>
            <div className="flex flex-wrap gap-2">
              {options.extras.map((x) => (
                <button key={x.id} className={`chip ${sel.extraIds.includes(x.id) ? "chip-on" : "chip-off"}`}
                  onClick={() => {
                    dirty.current = true;
                    setSel((s) => ({ ...s, extraIds: s.extraIds.includes(x.id) ? s.extraIds.filter((i) => i !== x.id) : [...s.extraIds, x.id] }));
                  }}>
                  {x.kind === "CARD" ? "💌 " : "🎁 "}{x.name} · {formatPaise(x.chargePaise)}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="label" htmlFor="msg">Greeting message (needs a greeting card)</label>
              <textarea id="msg" className="input min-h-20" maxLength={200}
                placeholder="Happy Anniversary, Meera & Arjun! — 200 characters max"
                value={sel.message}
                onChange={(e) => { dirty.current = true; setSel((s) => ({ ...s, message: e.target.value })); }} />
              <p className="mt-1 text-right text-xs text-forest-700/50">{sel.message.length}/200</p>
            </div>
          </section>
        </div>

        {/* right: live preview + bill */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <h2 className="mb-2 text-lg font-semibold">Live preview</h2>
            <div className="flex justify-center">
              <BouquetPreview
                flowers={selectedFlowers.map((f) => ({ colorHex: f.colorHex, stems: sel.stems[f.id], name: f.name }))}
                wrapColor={wrapColorOf(options.wrappings.find((w) => w.id === sel.wrappingId)?.name)}
              />
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">Your bill</h2>
            {!pricing ? (
              <Spinner label="Pricing…" />
            ) : (
              <>
                <ul className="space-y-1.5 text-sm">
                  {pricing.lines.map((l, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-medium">{l.label}</span>
                        {l.detail && !l.detail.startsWith("₹") && <span className="block truncate text-xs text-forest-700/60">{l.detail}</span>}
                      </span>
                      <span className="shrink-0 tabular-nums">{l.totalPaise === 0 ? "—" : formatPaise(l.totalPaise)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-cream-200 pt-3">
                  <span className="font-semibold">Bouquet subtotal</span>
                  <span className="text-lg font-bold tabular-nums text-forest-700">{formatPaise(pricing.subtotalPaise)}</span>
                </div>
                <p className="mt-1 text-xs text-forest-700/60">Delivery charges are calculated at checkout by PIN code.</p>
                {pricing.errors && pricing.errors.length > 0 && (
                  <div className="mt-3"><IssueBanner issues={pricing.errors.map((e) => e.message)} /></div>
                )}
                <button className="btn-primary mt-4 w-full" disabled={!pricing.ok || saving} onClick={save}>
                  {saving ? "Saving…" : editItemId ? "Update bouquet in cart" : "Save to cart"}
                </button>
                <p className="mt-2 text-center text-[11px] text-forest-700/50">
                  🔒 Prices are computed and re-verified server-side at checkout
                </p>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function wrapColorOf(name?: string): string {
  switch (name) {
    case "Kraft Paper": return "#d9b382";
    case "Jute Wrap": return "#cbb287";
    case "Premium Floral Sheet": return "#c9c1e8";
    case "Classic Paper": return "#f0d9de";
    default: return "#e8c8b7";
  }
}
