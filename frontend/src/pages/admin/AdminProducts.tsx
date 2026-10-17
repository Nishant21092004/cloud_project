/**
 * Admin product management — flowers, bouquets (with recipes), plants
 * (with variants) and customisation options. Price inputs are ₹; the
 * API always receives integer paise. Editing catalogue prices never
 * rewrites historical orders — those keep their own snapshots.
 */
import { useCallback, useEffect, useState } from "react";
import { api, uploadImage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { ErrorBox, Spinner } from "../../components/ui";
import { formatPaise } from "../../lib/format";

type Tab = "flowers" | "bouquets" | "plants" | "options";

export function AdminProducts() {
  const [tab, setTab] = useState<Tab>("flowers");
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "flowers", label: "Flowers" },
    { id: "bouquets", label: "Bouquets" },
    { id: "plants", label: "Plants" },
    { id: "options", label: "Options" },
  ];
  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`chip ${tab === t.id ? "chip-on" : "chip-off"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "flowers" && <FlowersTab />}
      {tab === "bouquets" && <BouquetsTab />}
      {tab === "plants" && <PlantsTab />}
      {tab === "options" && <OptionsTab />}
    </div>
  );
}

/* ── shared form helpers ────────────────────────────────────────────── */

const rupeesToPaise = (rupees: string): number => Math.round(parseFloat(rupees || "0") * 100);
const paiseToRupees = (paise: number): string => String(paise / 100);

function ImagePicker({ url, onChange }: { url: string; onChange: (url: string) => void }) {
  const [busy, setBusy] = useState(false);
  const pick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const { url } = await uploadImage(file);
      onChange(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center gap-3">
      {url ? (
        <img src={url} alt="" className="h-12 w-12 rounded-lg object-cover" />
      ) : (
        <div className="h-12 w-12 rounded-lg bg-cream-200" />
      )}
      <div className="flex-1">
        <input className="input" placeholder="/images/… or upload" value={url} onChange={(e) => onChange(e.target.value)} />
        <label className="mt-1 inline-block cursor-pointer text-xs font-medium text-forest-600 hover:underline">
          {busy ? "Uploading…" : "Upload image (JPG/PNG/WebP, ≤5 MB)"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </div>
    </div>
  );
}

function ArchiveToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button className={`chip ${active ? "chip-on" : "chip-off"}`} onClick={onToggle}>
      {active ? "Active" : "Archived"}
    </button>
  );
}

/* ── flowers ────────────────────────────────────────────────────────── */

interface FlowerRow {
  id: string; slug: string; name: string; description: string; colorHex: string; imageUrl: string;
  pricePerStemPaise: number; stockStems: number; lowStockThreshold: number; active: boolean;
}

function emptyFlower(): FlowerRow {
  return { id: "", slug: "", name: "", description: "", colorHex: "#e56b8c", imageUrl: "", pricePerStemPaise: 3000, stockStems: 50, lowStockThreshold: 20, active: true };
}

function FlowerForm({ initial, onDone }: { initial: FlowerRow; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isNew = initial.id === "";
  const set = <K extends keyof FlowerRow>(k: K, v: FlowerRow[K]) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: f.name, description: f.description, colorHex: f.colorHex, imageUrl: f.imageUrl,
        pricePerStemPaise: rupeesToPaise(paiseToRupees(f.pricePerStemPaise)),
        stockStems: f.stockStems, lowStockThreshold: f.lowStockThreshold, active: f.active,
      };
      if (isNew) await api("/api/admin/flowers", { method: "POST", body });
      else await api(`/api/admin/flowers/${f.id}`, { method: "PATCH", body });
      toast("success", isNew ? "Flower added" : "Flower saved");
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">Name
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Blue Orchid" />
        </label>
        <label className="label">Colour
          <input type="color" className="input h-11 w-24 p-1" value={f.colorHex} onChange={(e) => set("colorHex", e.target.value)} />
        </label>
        <label className="label sm:col-span-2">Description
          <textarea className="input" rows={2} value={f.description} onChange={(e) => set("description", e.target.value)} />
        </label>
        <label className="label">Price per stem (₹)
          <input className="input" type="number" min={1} step={0.5} value={paiseToRupees(f.pricePerStemPaise)} onChange={(e) => set("pricePerStemPaise", rupeesToPaise(e.target.value))} />
        </label>
        <label className="label">Stock (stems)
          <input className="input" type="number" min={0} value={f.stockStems} onChange={(e) => set("stockStems", Number(e.target.value))} />
        </label>
        <label className="label">Low-stock alert at
          <input className="input" type="number" min={0} value={f.lowStockThreshold} onChange={(e) => set("lowStockThreshold", Number(e.target.value))} />
        </label>
        <div className="label">Image<ImagePicker url={f.imageUrl} onChange={(u) => set("imageUrl", u)} /></div>
      </div>
      <div className="flex items-center gap-3">
        <ArchiveToggle active={f.active} onToggle={() => set("active", !f.active)} />
        <div className="flex-1" />
        <button className="btn-ghost btn-sm" onClick={onDone} disabled={busy}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={busy || !f.name || !f.description || !f.imageUrl}>
          {busy ? "Saving…" : isNew ? "Add flower" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function FlowersTab() {
  const toast = useToast();
  const [rows, setRows] = useState<FlowerRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FlowerRow | null>(null);

  const load = useCallback(() => {
    api<{ flowers: FlowerRow[] }>("/api/admin/flowers").then((d) => setRows(d.flowers)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const toggleActive = async (f: FlowerRow) => {
    try {
      await api(`/api/admin/flowers/${f.id}`, { method: "PATCH", body: { active: !f.active } });
      toast("success", f.active ? `${f.name} archived` : `${f.name} re-activated`);
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!rows) return <Spinner label="Loading flowers…" />;

  return (
    <div className="space-y-4">
      {editing ? <FlowerForm initial={editing} onDone={() => { setEditing(null); load(); }} /> : (
        <button className="btn-primary btn-sm" onClick={() => setEditing(emptyFlower())}>+ Add flower</button>
      )}
      <div className="card divide-y divide-cream-200 p-0">
        {rows.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <img src={f.imageUrl} alt="" className="h-12 w-12 rounded-lg bg-cream-100 object-cover" />
            <div className="min-w-40 flex-1">
              <p className="font-medium text-forest-900">{f.name} {!f.active && <span className="badge ml-1 bg-cream-200 text-forest-600">archived</span>}</p>
              <p className="text-xs text-forest-700/70">{f.slug} · stock {f.stockStems} stems (alert ≤ {f.lowStockThreshold})</p>
            </div>
            <p className="font-semibold text-forest-800">{formatPaise(f.pricePerStemPaise)}<span className="text-xs font-normal text-forest-600">/stem</span></p>
            <ArchiveToggle active={f.active} onToggle={() => toggleActive(f)} />
            <button className="btn-secondary btn-sm" onClick={() => setEditing(f)}>Edit</button>
          </div>
        ))}
        {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-forest-700/70">No flowers yet.</p>}
      </div>
    </div>
  );
}

/* ── bouquets + recipes ─────────────────────────────────────────────── */

interface RecipeRow { flowerId: string; stems: number; flower?: { name: string; colorHex: string } }
interface BouquetRow {
  id: string; slug: string; name: string; description: string; imageUrl: string; pricePaise: number; active: boolean;
  recipe: RecipeRow[];
}

function emptyBouquet(): BouquetRow {
  return { id: "", slug: "", name: "", description: "", imageUrl: "", pricePaise: 49900, active: true, recipe: [] };
}

function BouquetForm({ initial, flowers, onDone }: { initial: BouquetRow; flowers: FlowerRow[]; onDone: () => void }) {
  const toast = useToast();
  const [b, setB] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isNew = initial.id === "";

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: b.name, description: b.description, imageUrl: b.imageUrl,
        pricePaise: rupeesToPaise(paiseToRupees(b.pricePaise)), active: b.active,
        recipe: b.recipe.map((r) => ({ flowerId: r.flowerId, stems: r.stems })),
      };
      if (isNew) await api("/api/admin/bouquets", { method: "POST", body });
      else await api(`/api/admin/bouquets/${b.id}`, { method: "PATCH", body });
      toast("success", isNew ? "Bouquet added" : "Bouquet saved");
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const setRecipe = (idx: number, patch: Partial<RecipeRow>) =>
    setB((p) => ({ ...p, recipe: p.recipe.map((r, i) => (i === idx ? { ...r, ...patch } : r)) }));

  return (
    <div className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">Name<input className="input" value={b.name} onChange={(e) => setB((p) => ({ ...p, name: e.target.value }))} /></label>
        <label className="label">Price (₹)
          <input className="input" type="number" min={1} step={0.5} value={paiseToRupees(b.pricePaise)} onChange={(e) => setB((p) => ({ ...p, pricePaise: rupeesToPaise(e.target.value) }))} />
        </label>
        <label className="label sm:col-span-2">Description
          <textarea className="input" rows={2} value={b.description} onChange={(e) => setB((p) => ({ ...p, description: e.target.value }))} />
        </label>
        <div className="label sm:col-span-2">Image<ImagePicker url={b.imageUrl} onChange={(u) => setB((p) => ({ ...p, imageUrl: u }))} /></div>
      </div>

      <div>
        <p className="label mb-1">Recipe — stems consumed from flower stock when sold</p>
        <div className="space-y-2">
          {b.recipe.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <select className="input flex-1" value={r.flowerId} onChange={(e) => setRecipe(i, { flowerId: e.target.value })}>
                <option value="">Select flower…</option>
                {flowers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
              <input className="input w-24" type="number" min={1} max={50} value={r.stems}
                onChange={(e) => setRecipe(i, { stems: Math.max(1, Number(e.target.value) || 1) })} />
              <span className="text-xs text-forest-600">stems</span>
              <button className="btn-ghost btn-sm text-red-600" onClick={() => setB((p) => ({ ...p, recipe: p.recipe.filter((_, j) => j !== i) }))}>✕</button>
            </div>
          ))}
          <button className="btn-secondary btn-sm"
            onClick={() => setB((p) => ({ ...p, recipe: [...p.recipe, { flowerId: "", stems: 3 }] }))}>
            + Add flower to recipe
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ArchiveToggle active={b.active} onToggle={() => setB((p) => ({ ...p, active: !p.active }))} />
        <div className="flex-1" />
        <button className="btn-ghost btn-sm" onClick={onDone} disabled={busy}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save} disabled={busy || !b.name || !b.description || !b.imageUrl || b.recipe.some((r) => !r.flowerId)}>
          {busy ? "Saving…" : isNew ? "Add bouquet" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function BouquetsTab() {
  const toast = useToast();
  const [rows, setRows] = useState<BouquetRow[] | null>(null);
  const [flowers, setFlowers] = useState<FlowerRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<BouquetRow | null>(null);

  const load = useCallback(() => {
    Promise.all([
      api<{ bouquets: BouquetRow[] }>("/api/admin/bouquets"),
      api<{ flowers: FlowerRow[] }>("/api/admin/flowers"),
    ]).then(([b, f]) => { setRows(b.bouquets); setFlowers(f.flowers); }).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const toggleActive = async (bq: BouquetRow) => {
    try {
      await api(`/api/admin/bouquets/${bq.id}`, { method: "PATCH", body: { active: !bq.active } });
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!rows) return <Spinner label="Loading bouquets…" />;

  return (
    <div className="space-y-4">
      {editing ? <BouquetForm initial={editing} flowers={flowers} onDone={() => { setEditing(null); load(); }} /> : (
        <button className="btn-primary btn-sm" onClick={() => setEditing(emptyBouquet())}>+ Add bouquet</button>
      )}
      <div className="card divide-y divide-cream-200 p-0">
        {rows.map((bq) => (
          <div key={bq.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <img src={bq.imageUrl} alt="" className="h-12 w-12 rounded-lg bg-cream-100 object-cover" />
            <div className="min-w-40 flex-1">
              <p className="font-medium text-forest-900">{bq.name} {!bq.active && <span className="badge ml-1 bg-cream-200 text-forest-600">archived</span>}</p>
              <p className="text-xs text-forest-700/70">
                {bq.recipe.map((r) => `${r.stems}× ${r.flower?.name ?? "?"}`).join(" + ") || "no recipe"}
              </p>
            </div>
            <p className="font-semibold text-forest-800">{formatPaise(bq.pricePaise)}</p>
            <ArchiveToggle active={bq.active} onToggle={() => toggleActive(bq)} />
            <button className="btn-secondary btn-sm" onClick={() => setEditing(bq)}>Edit</button>
          </div>
        ))}
        {rows.length === 0 && <p className="px-4 py-8 text-center text-sm text-forest-700/70">No bouquets yet.</p>}
      </div>
    </div>
  );
}

/* ── plants + variants ──────────────────────────────────────────────── */

interface VariantRow { id: string; label: string; potType: string; size: string; pricePaise: number; stock: number; active: boolean }
interface PlantRow {
  id: string; slug: string; name: string; description: string; imageUrl: string;
  careWatering: string; careLight: string; careNotes: string | null; active: boolean; variants: VariantRow[];
}

function emptyPlant(): PlantRow {
  return {
    id: "", slug: "", name: "", description: "", imageUrl: "",
    careWatering: "", careLight: "", careNotes: null, active: true, variants: [],
  };
}

function PlantForm({ initial, onDone }: { initial: PlantRow; onDone: () => void }) {
  const toast = useToast();
  const [p, setP] = useState(initial);
  const [busy, setBusy] = useState(false);
  const isNew = initial.id === "";
  const set = <K extends keyof PlantRow>(k: K, v: PlantRow[K]) => setP((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setBusy(true);
    try {
      if (isNew) {
        const body = {
          name: p.name, description: p.description, imageUrl: p.imageUrl,
          careWatering: p.careWatering, careLight: p.careLight,
          careNotes: p.careNotes ?? undefined, active: p.active,
          variants: p.variants.map((v) => ({
            potType: v.potType, size: v.size, label: v.label,
            pricePaise: rupeesToPaise(paiseToRupees(v.pricePaise)), stock: v.stock,
          })),
        };
        await api("/api/admin/plants", { method: "POST", body });
      } else {
        await api(`/api/admin/plants/${p.id}`, {
          method: "PATCH",
          body: {
            name: p.name, description: p.description, imageUrl: p.imageUrl,
            careWatering: p.careWatering, careLight: p.careLight,
            careNotes: p.careNotes ?? undefined, active: p.active,
          },
        });
      }
      toast("success", isNew ? "Plant added" : "Plant saved");
      onDone();
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="label">Name<input className="input" value={p.name} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="label">Light needs<input className="input" value={p.careLight} onChange={(e) => set("careLight", e.target.value)} placeholder="e.g. Bright indirect light" /></label>
        <label className="label sm:col-span-2">Description<textarea className="input" rows={2} value={p.description} onChange={(e) => set("description", e.target.value)} /></label>
        <label className="label">Watering<input className="input" value={p.careWatering} onChange={(e) => set("careWatering", e.target.value)} placeholder="e.g. Every 5–7 days" /></label>
        <label className="label">Care notes (optional)<input className="input" value={p.careNotes ?? ""} onChange={(e) => set("careNotes", e.target.value || null)} /></label>
        <div className="label sm:col-span-2">Image<ImagePicker url={p.imageUrl} onChange={(u) => set("imageUrl", u)} /></div>
      </div>

      {isNew && (
        <div>
          <p className="label mb-1">Variants — pot type × size with price and stock</p>
          <div className="space-y-2">
            {p.variants.map((v, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                <input className="input" placeholder="Pot (Nursery)" value={v.potType}
                  onChange={(e) => setP((prev) => ({ ...prev, variants: prev.variants.map((x, j) => (j === i ? { ...x, potType: e.target.value } : x)) }))} />
                <input className="input" placeholder="Size (M)" value={v.size}
                  onChange={(e) => setP((prev) => ({ ...prev, variants: prev.variants.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)) }))} />
                <input className="input" placeholder="Label shown" value={v.label}
                  onChange={(e) => setP((prev) => ({ ...prev, variants: prev.variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) }))} />
                <input className="input" type="number" min={1} placeholder="₹ price" value={v.pricePaise ? paiseToRupees(v.pricePaise) : ""}
                  onChange={(e) => setP((prev) => ({ ...prev, variants: prev.variants.map((x, j) => (j === i ? { ...x, pricePaise: rupeesToPaise(e.target.value) } : x)) }))} />
                <div className="flex gap-2">
                  <input className="input" type="number" min={0} placeholder="Stock" value={v.stock}
                    onChange={(e) => setP((prev) => ({ ...prev, variants: prev.variants.map((x, j) => (j === i ? { ...x, stock: Number(e.target.value) } : x)) }))} />
                  <button className="btn-ghost btn-sm text-red-600"
                    onClick={() => setP((prev) => ({ ...prev, variants: prev.variants.filter((_, j) => j !== i) }))}>✕</button>
                </div>
              </div>
            ))}
            <button className="btn-secondary btn-sm"
              onClick={() => setP((prev) => ({ ...prev, variants: [...prev.variants, { id: "", label: "", potType: "", size: "", pricePaise: 0, stock: 10, active: true }] }))}>
              + Add variant
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <ArchiveToggle active={p.active} onToggle={() => set("active", !p.active)} />
        <div className="flex-1" />
        <button className="btn-ghost btn-sm" onClick={onDone} disabled={busy}>Cancel</button>
        <button className="btn-primary btn-sm" onClick={save}
          disabled={busy || !p.name || !p.description || !p.imageUrl || !p.careLight || !p.careWatering || (isNew && p.variants.length === 0)}>
          {busy ? "Saving…" : isNew ? "Add plant" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

function PlantsTab() {
  const toast = useToast();
  const [rows, setRows] = useState<PlantRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PlantRow | null>(null);

  const load = useCallback(() => {
    api<{ plants: PlantRow[] }>("/api/admin/plants").then((d) => setRows(d.plants)).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  const saveVariant = async (plant: PlantRow, v: VariantRow, patch: { pricePaise?: number; stock?: number; active?: boolean }) => {
    try {
      await api(`/api/admin/plant-variants/${v.id}`, { method: "PATCH", body: patch });
      toast("success", `Variant updated`);
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!rows) return <Spinner label="Loading plants…" />;

  return (
    <div className="space-y-4">
      {editing ? <PlantForm initial={editing} onDone={() => { setEditing(null); load(); }} /> : (
        <button className="btn-primary btn-sm" onClick={() => setEditing(emptyPlant())}>+ Add plant</button>
      )}
      {rows.map((p) => (
        <div key={p.id} className="card p-4">
          <div className="flex flex-wrap items-center gap-3">
            <img src={p.imageUrl} alt="" className="h-12 w-12 rounded-lg bg-cream-100 object-cover" />
            <div className="min-w-40 flex-1">
              <p className="font-medium text-forest-900">{p.name} {!p.active && <span className="badge ml-1 bg-cream-200 text-forest-600">archived</span>}</p>
              <p className="text-xs text-forest-700/70">💧 {p.careWatering} · ☀️ {p.careLight}</p>
            </div>
            <button className="btn-secondary btn-sm" onClick={() => setEditing(p)}>Edit details</button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[500px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-forest-600/70">
                  <th className="py-1 pr-3">Variant</th><th className="py-1 pr-3">Pot</th><th className="py-1 pr-3">Size</th>
                  <th className="py-1 pr-3">Price ₹</th><th className="py-1 pr-3">Stock</th><th className="py-1 pr-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200">
                {p.variants.map((v) => (
                  <VariantRowEditor key={v.id} v={v} onSave={(patch) => saveVariant(p, v, patch)} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
      {rows.length === 0 && <p className="text-center text-sm text-forest-700/70">No plants yet.</p>}
    </div>
  );
}

function VariantRowEditor({ v, onSave }: { v: VariantRow; onSave: (patch: { pricePaise?: number; stock?: number; active?: boolean }) => void }) {
  const [price, setPrice] = useState(paiseToRupees(v.pricePaise));
  const [stock, setStock] = useState(String(v.stock));
  const dirty = rupeesToPaise(price) !== v.pricePaise || Number(stock) !== v.stock;
  return (
    <tr>
      <td className="py-1.5 pr-3">
        {v.label} {!v.active && <span className="badge bg-cream-200 text-forest-600">archived</span>}
      </td>
      <td className="py-1.5 pr-3 text-forest-700/80">{v.potType}</td>
      <td className="py-1.5 pr-3 text-forest-700/80">{v.size}</td>
      <td className="py-1.5 pr-3">
        <input className="input w-24" type="number" min={1} step={0.5} value={price} onChange={(e) => setPrice(e.target.value)} />
      </td>
      <td className="py-1.5 pr-3">
        <input className="input w-20" type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value)} />
      </td>
      <td className="py-1.5">
        <div className="flex gap-2">
          <button className="btn-primary btn-sm" disabled={!dirty}
            onClick={() => onSave({ pricePaise: rupeesToPaise(price), stock: Number(stock) })}>Save</button>
          <button className={`btn-sm ${v.active ? "btn-ghost" : "btn-secondary"}`}
            onClick={() => onSave({ active: !v.active })}>{v.active ? "Archive" : "Restore"}</button>
        </div>
      </td>
    </tr>
  );
}

/* ── customisation options ──────────────────────────────────────────── */

interface OptionRow { id: string; name: string; chargePaise: number; active: boolean; kind?: "ADDON" | "CARD" }
interface OptionsData { wrappings: OptionRow[]; ribbons: OptionRow[]; extras: OptionRow[] }

function OptionsTab() {
  const toast = useToast();
  const [data, setData] = useState<OptionsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api<OptionsData>("/api/admin/options").then(setData).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!data) return <Spinner label="Loading options…" />;

  const groups: Array<{ type: "wrapping" | "ribbon" | "extra"; title: string; rows: OptionRow[]; showKind: boolean }> = [
    { type: "wrapping", title: "Wrapping options", rows: data.wrappings, showKind: false },
    { type: "ribbon", title: "Ribbon options", rows: data.ribbons, showKind: false },
    { type: "extra", title: "Extras & greeting cards", rows: data.extras, showKind: true },
  ];

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <OptionGroup key={g.type} group={g} reload={load} />
      ))}
    </div>
  );
}

function OptionGroup({ group, reload }: { group: { type: string; title: string; rows: OptionRow[]; showKind: boolean }; reload: () => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [charge, setCharge] = useState("");
  const [kind, setKind] = useState<"ADDON" | "CARD">("ADDON");

  const add = async () => {
    try {
      const body: Record<string, unknown> = { name, chargePaise: rupeesToPaise(charge) };
      if (group.showKind) body.kind = kind;
      await api(`/api/admin/options/${group.type}`, { method: "POST", body });
      toast("success", `${name} added`);
      setName(""); setCharge("");
      reload();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  const patch = async (o: OptionRow, body: Record<string, unknown>) => {
    try {
      await api(`/api/admin/options/${group.type}/${o.id}`, { method: "PATCH", body });
      reload();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="card p-4">
      <h3 className="font-display text-lg text-forest-900">{group.title}</h3>
      <div className="mt-2 divide-y divide-cream-200">
        {group.rows.map((o) => (
          <OptionRowEditor key={o.id} o={o} showKind={group.showKind} onSave={(body) => patch(o, body)} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className="input w-44" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input w-28" type="number" min={0} placeholder="₹ charge" value={charge} onChange={(e) => setCharge(e.target.value)} />
        {group.showKind && (
          <select className="input w-36" value={kind} onChange={(e) => setKind(e.target.value as "ADDON" | "CARD")}>
            <option value="ADDON">Addon</option>
            <option value="CARD">Greeting card</option>
          </select>
        )}
        <button className="btn-secondary btn-sm" onClick={add} disabled={!name || charge === ""}>+ Add</button>
      </div>
    </div>
  );
}

function OptionRowEditor({ o, showKind, onSave }: { o: OptionRow; showKind: boolean; onSave: (body: Record<string, unknown>) => void }) {
  const [name, setName] = useState(o.name);
  const [charge, setCharge] = useState(paiseToRupees(o.chargePaise));
  const dirty = name !== o.name || rupeesToPaise(charge) !== o.chargePaise;
  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      <input className="input w-44" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="input w-28" type="number" min={0} step={0.5} value={charge} onChange={(e) => setCharge(e.target.value)} />
      {showKind && <span className="badge bg-cream-200 text-forest-700">{o.kind === "CARD" ? "card" : "addon"}</span>}
      <button className="btn-primary btn-sm" disabled={!dirty} onClick={() => onSave({ name, chargePaise: rupeesToPaise(charge) })}>Save</button>
      <button className={`btn-sm ${o.active ? "btn-ghost" : "btn-secondary"}`} onClick={() => onSave({ active: !o.active })}>
        {o.active ? "Disable" : "Enable"}
      </button>
    </div>
  );
}
