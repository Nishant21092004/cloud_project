/** Delivery configuration — serviceable PIN codes with fees, and delivery slots. */
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { ErrorBox, Spinner } from "../../components/ui";
import { formatPaise } from "../../lib/format";

interface PincodeRow { pincode: string; city: string | null; deliveryFeePaise: number; active: boolean }
interface SlotRow { id: string; label: string; sortOrder: number; active: boolean }

export function AdminSettings() {
  const toast = useToast();
  const [pincodes, setPincodes] = useState<PincodeRow[] | null>(null);
  const [slots, setSlots] = useState<SlotRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [pin, setPin] = useState("");
  const [city, setCity] = useState("");
  const [fee, setFee] = useState("");

  const [slotLabel, setSlotLabel] = useState("");
  const [slotOrder, setSlotOrder] = useState("0");

  const load = useCallback(() => {
    Promise.all([
      api<{ pincodes: PincodeRow[] }>("/api/admin/pincodes"),
      api<{ slots: SlotRow[] }>("/api/admin/slots"),
    ]).then(([p, s]) => { setPincodes(p.pincodes); setSlots(s.slots); }).catch((e) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!pincodes || !slots) return <Spinner label="Loading delivery settings…" />;

  const addPincode = async () => {
    try {
      await api("/api/admin/pincodes", {
        method: "POST",
        body: { pincode: pin, city: city || undefined, deliveryFeePaise: Math.round(parseFloat(fee || "0") * 100) },
      });
      toast("success", `PIN ${pin} is serviceable`);
      setPin(""); setCity(""); setFee("");
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  const addSlot = async () => {
    try {
      await api("/api/admin/slots", { method: "POST", body: { label: slotLabel, sortOrder: Number(slotOrder) || 0 } });
      toast("success", "Slot added");
      setSlotLabel(""); setSlotOrder("0");
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  const patchPincode = async (p: PincodeRow, body: Record<string, unknown>) => {
    try { await api(`/api/admin/pincodes/${p.pincode}`, { method: "PATCH", body }); load(); }
    catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  const patchSlot = async (s: SlotRow, body: Record<string, unknown>) => {
    try { await api(`/api/admin/slots/${s.id}`, { method: "PATCH", body }); load(); }
    catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="card p-5">
        <h2 className="font-display text-lg text-forest-900">Serviceable PIN codes</h2>
        <p className="text-xs text-forest-700/70">Checkout refuses addresses outside this list.</p>
        <div className="mt-3 space-y-1.5">
          {pincodes.map((p) => (
            <PinRow key={p.pincode} p={p} onSave={(body) => patchPincode(p, body)} />
          ))}
          {pincodes.length === 0 && <p className="text-sm text-forest-700/70">No PIN codes yet — add the first one below.</p>}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-cream-200 pt-3">
          <input className="input w-28" placeholder="PIN code" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
          <input className="input w-40" placeholder="City (optional)" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="input w-28" type="number" min={0} placeholder="₹ fee" value={fee} onChange={(e) => setFee(e.target.value)} />
          <button className="btn-secondary btn-sm" onClick={addPincode} disabled={pin.length !== 6 || fee === ""}>+ Add / update</button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg text-forest-900">Delivery slots</h2>
        <p className="text-xs text-forest-700/70">Customers pick one at checkout, up to 7 days ahead.</p>
        <div className="mt-3 space-y-1.5">
          {slots.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 text-forest-800">{s.label}</span>
              <span className="text-xs text-forest-600/60">order {s.sortOrder}</span>
              <button className={`btn-sm ${s.active ? "btn-ghost" : "btn-secondary"}`}
                onClick={() => patchSlot(s, { active: !s.active })}>{s.active ? "Disable" : "Enable"}</button>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2 border-t border-cream-200 pt-3">
          <input className="input flex-1" placeholder="e.g. Evening 5–9 PM" value={slotLabel} onChange={(e) => setSlotLabel(e.target.value)} />
          <input className="input w-20" type="number" min={0} value={slotOrder} onChange={(e) => setSlotOrder(e.target.value)} />
          <button className="btn-secondary btn-sm" onClick={addSlot} disabled={slotLabel.length < 2}>+ Add</button>
        </div>
      </section>
    </div>
  );
}

function PinRow({ p, onSave }: { p: PincodeRow; onSave: (body: Record<string, unknown>) => void }) {
  const [fee, setFee] = useState(String(p.deliveryFeePaise / 100));
  const dirty = Math.round(parseFloat(fee || "0") * 100) !== p.deliveryFeePaise;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-16 font-mono font-medium text-forest-900">{p.pincode}</span>
      <span className="flex-1 text-forest-700/80">{p.city ?? "—"}</span>
      <input className="input w-24" type="number" min={0} step={0.5} value={fee} onChange={(e) => setFee(e.target.value)} />
      <button className="btn-primary btn-sm" disabled={!dirty} onClick={() => onSave({ deliveryFeePaise: Math.round(parseFloat(fee) * 100) })}>Save</button>
      <button className={`btn-sm ${p.active ? "btn-ghost" : "btn-secondary"}`}
        onClick={() => onSave({ active: !p.active })}>{p.active ? "Disable" : "Enable"}</button>
      <span className="hidden w-20 sm:inline text-xs text-forest-600/60">{formatPaise(p.deliveryFeePaise)}</span>
    </div>
  );
}
