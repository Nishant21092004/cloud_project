import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, newIdempotencyKey } from "../api/client";
import type { Address, Cart, Order, Quote, Serviceability, Slot } from "../api/types";
import { deliveryDayLabel, formatPaise } from "../lib/format";
import { ErrorBox, IssueBanner, PageTitle, Spinner } from "../components/ui";
import { useToast } from "../context/ToastContext";

type PaymentMethod = "COD" | "RAZORPAY" | "DEMO_ONLINE";

interface NewAddress {
  recipientName: string; phone: string; pincode: string; line1: string; line2: string; city: string; state: string;
}

const EMPTY_ADDRESS: NewAddress = { recipientName: "", phone: "", pincode: "", line1: "", line2: "", city: "", state: "" };

function normalizePhone(input: string): string {
  const n = input.trim().replace(/[\s()-]/g, "");
  if (n.startsWith("+91")) return n.slice(3);
  if (n.startsWith("91") && n.length === 12) return n.slice(2);
  if (n.startsWith("0") && n.length === 11) return n.slice(1);
  return n;
}

function nextDays(n: number): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);
    out.push(d);
  }
  return out;
}

export function CheckoutPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<{ enabled: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"saved" | "new">(addresses.length ? "saved" : "new");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<NewAddress>(EMPTY_ADDRESS);
  const [serviceability, setServiceability] = useState<Serviceability | null>(null);

  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [slotId, setSlotId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");

  const [placing, setPlacing] = useState(false);
  const [issues, setIssues] = useState<string[]>([]);
  const [confirmUpdate, setConfirmUpdate] = useState<Quote | null>(null);
  const idemKey = useRef(newIdempotencyKey());

  useEffect(() => {
    Promise.all([
      api<{ cart: Cart }>("/api/cart"),
      api<{ addresses: Address[] }>("/api/addresses"),
      api<{ slots: Slot[] }>("/api/catalog/delivery-slots"),
      api<{ enabled: boolean }>("/api/payments/config"),
    ])
      .then(([c, a, s, p]) => {
        setCart(c.cart);
        setAddresses(a.addresses);
        if (a.addresses.length > 0) {
          setMode("saved");
          setAddressId((a.addresses.find((x) => x.isDefault) ?? a.addresses[0]).id);
        }
        setSlots(s.slots);
        if (s.slots[0]) setSlotId(s.slots[0].id);
        setPaymentConfig(p);
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  // serviceability + fee for the chosen pincode
  const pincode = mode === "saved" ? addresses.find((a) => a.id === addressId)?.pincode ?? "" : newAddress.pincode;
  useEffect(() => {
    setServiceability(null);
    if (!/^\d{6}$/.test(pincode)) return;
    let active = true;
    const t = setTimeout(() => {
      api<Serviceability>(`/api/catalog/serviceability/${pincode}`)
        .then((result) => { if (active) setServiceability(result); })
        .catch(() => { if (active) setServiceability(null); });
    }, 250);
    return () => { active = false; clearTimeout(t); };
  }, [pincode]);

  const days = useMemo(() => nextDays(7), []);
  const deliveryFee = serviceability?.serviceable ? serviceability.deliveryFeePaise ?? 0 : null;
  const total = cart && deliveryFee !== null ? cart.subtotalPaise + deliveryFee : null;

  const placeOrder = async (confirmedQuote?: { fingerprint: string; subtotalPaise: number; deliveryFeePaise: number }) => {
    if (!cart) return;
    setPlacing(true);
    setIssues([]);
    try {
      const body = {
        ...(mode === "saved" ? { addressId } : { address: clean(newAddress) }),
        slotId,
        deliveryDate,
        paymentMethod,
        ...(confirmedQuote ? { confirmPricing: confirmedQuote } : {}),
      };
      const data = await api<{ order: Order; replayed: boolean }>("/api/orders", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": idemKey.current },
      });
      toast("success", `Order ${data.order.orderNumber} placed${paymentMethod === "DEMO_ONLINE" ? " (payment simulated — no charge)" : ""}! 🌷`);
      navigate(`/orders/${data.order.orderNumber}`);
    } catch (e) {
      const err = e as { code?: string; message: string; details?: { quote?: Quote; issues?: string[] } };
      if (err.code === "PRICE_CHANGED" && err.details?.quote) {
        setConfirmUpdate(err.details.quote);
        toast("info", "Totals were refreshed — please confirm the updated amount.");
      } else if (err.code === "OUT_OF_STOCK") {
        setIssues(err.details?.issues ?? [err.message]);
      } else {
        setIssues([err.message]);
      }
    } finally {
      setPlacing(false);
    }
  };

  if (loadError) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={loadError} /></div>;
  if (!cart || !paymentConfig) return <Spinner label="Preparing checkout…" />;
  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-4xl">🛒</p>
        <h1 className="mt-3 text-xl font-semibold">Nothing to check out</h1>
        <button className="btn-primary mt-5" onClick={() => navigate("/bouquets")}>Browse bouquets</button>
      </div>
    );
  }

  const addressReady = mode === "saved" ? Boolean(addressId) : validateAddress(newAddress);
  const ready = Boolean(addressReady && slotId && serviceability?.serviceable && total !== null && !placing);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageTitle title="Checkout" subtitle="Stock, prices and delivery availability are re-validated the moment you place the order." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* address */}
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">1 · Delivery address</h2>
            {addresses.length > 0 && (
              <div className="mb-3 flex gap-2">
                <button className={`chip ${mode === "saved" ? "chip-on" : "chip-off"}`} onClick={() => setMode("saved")}>Saved addresses</button>
                <button className={`chip ${mode === "new" ? "chip-on" : "chip-off"}`} onClick={() => setMode("new")}>New address</button>
              </div>
            )}
            {mode === "saved" ? (
              <div className="space-y-2">
                {addresses.map((a) => (
                  <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 text-sm ${addressId === a.id ? "border-forest-500 bg-forest-50/50" : "border-cream-300"}`}>
                    <input type="radio" className="mt-1 accent-forest-700" checked={addressId === a.id} onChange={() => setAddressId(a.id)} />
                    <span>
                      <span className="font-semibold">{a.recipientName}</span> · {a.phone}
                      <span className="block text-forest-700/80">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}</span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Recipient name" value={newAddress.recipientName} onChange={(v) => setNewAddress({ ...newAddress, recipientName: v })} placeholder="Asha Verma" />
                <Field label="Phone" value={newAddress.phone} onChange={(v) => setNewAddress({ ...newAddress, phone: v })} placeholder="98XXXXXXXX (0 / +91 also accepted)" />
                <Field label="PIN code" value={newAddress.pincode} onChange={(v) => setNewAddress({ ...newAddress, pincode: v.replace(/\D/g, "").slice(0, 6) })} placeholder="110001" />
                <Field label="City" value={newAddress.city} onChange={(v) => setNewAddress({ ...newAddress, city: v })} placeholder="New Delhi" />
                <Field label="State" value={newAddress.state} onChange={(v) => setNewAddress({ ...newAddress, state: v })} placeholder="Delhi" />
                <Field label="Address line 1" value={newAddress.line1} onChange={(v) => setNewAddress({ ...newAddress, line1: v })} placeholder="Flat 4B, Rose Apartments" className="sm:col-span-2" />
                <Field label="Address line 2 (optional)" value={newAddress.line2} onChange={(v) => setNewAddress({ ...newAddress, line2: v })} placeholder="Near Central Park" className="sm:col-span-2" />
              </div>
            )}
            {pincode.length === 6 && serviceability && (
              serviceability.serviceable ? (
                <p className="mt-3 rounded-xl bg-forest-50 px-4 py-2.5 text-sm text-forest-800">
                  ✅ {serviceability.demoCoverage ? "Demo India-wide delivery estimate" : "Delivery configured"} for {serviceability.city ?? "this PIN"} — ₹{(serviceability.deliveryFeePaise! / 100).toFixed(0)}
                </p>
              ) : (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  PIN {pincode} is outside our configured demo delivery coverage. Check the six digits.
                </p>
              )
            )}
          </section>

          {/* date + slot */}
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">2 · When should we deliver?</h2>
            <div className="flex flex-wrap gap-2">
              {days.map((d) => {
                const iso = d.toISOString().slice(0, 10);
                return (
                  <button key={iso} className={`chip ${deliveryDate === iso ? "chip-on" : "chip-off"}`} onClick={() => setDeliveryDate(iso)}>
                    {deliveryDayLabel(d)}
                  </button>
                );
              })}
            </div>
            <p className="label mt-4">Slot</p>
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button key={s.id} className={`chip ${slotId === s.id ? "chip-on" : "chip-off"}`} onClick={() => setSlotId(s.id)}>{s.label}</button>
              ))}
            </div>
          </section>

          {/* payment */}
          <section className="card p-5">
            <h2 className="mb-3 text-lg font-semibold">3 · Payment</h2>
            <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${paymentMethod === "COD" ? "border-forest-500 bg-forest-50/50" : "border-cream-300"}`}>
              <input type="radio" className="mt-1 accent-forest-700" checked={paymentMethod === "COD"} onChange={() => setPaymentMethod("COD")} />
              <span className="text-sm">
                <span className="font-semibold">Cash on Delivery</span>
                <span className="block text-forest-700/80">Pay the courier when your flowers arrive. Always available.</span>
              </span>
            </label>
            <label className={`mt-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${paymentMethod === "DEMO_ONLINE" ? "border-forest-500 bg-forest-50/50" : "border-cream-300"}`}>
              <input type="radio" className="mt-1 accent-forest-700" checked={paymentMethod === "DEMO_ONLINE"} onChange={() => setPaymentMethod("DEMO_ONLINE")} />
              <span className="text-sm">
                <span className="font-semibold">Online payment (UPI / cards / netbanking) — demo</span>
                <span className="block text-forest-700/80">Simulated successful online payment for evaluation. No gateway opens, NO money is charged or transferred.</span>
              </span>
            </label>
            <label className={`mt-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${paymentMethod === "RAZORPAY" ? "border-forest-500 bg-forest-50/50" : "border-cream-300"} ${!paymentConfig.enabled ? "opacity-60" : ""}`}>
              <input type="radio" className="mt-1 accent-forest-700" disabled={!paymentConfig.enabled} checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} />
              <span className="text-sm">
                <span className="font-semibold">Pay online with Razorpay (test gateway)</span>
                <span className="block text-forest-700/80">
                  {paymentConfig.enabled
                    ? "Razorpay checkout: UPI, cards and netbanking (use test keys for a classroom demo)."
                    : "Connect Razorpay test keys on the server to activate secure UPI/cards/netbanking. Never enter real payment details in test mode."}
                </span>
              </span>
            </label>
          </section>

          {issues.length > 0 && <IssueBanner issues={issues} />}
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <h2 className="text-lg font-semibold">Order summary</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {cart.lines.map((l) => (
                <li key={l.itemId} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">{l.title}{l.kind === "FLOWER" ? ` × ${l.qty}` : l.qty > 1 ? ` × ${l.qty}` : ""}</span>
                  <span className="tabular-nums">{formatPaise(l.lineTotalPaise)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 space-y-1 border-t border-cream-200 pt-3 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatPaise(cart.subtotalPaise)}</span></div>
              <div className="flex justify-between">
                <span>Delivery</span>
                <span className="tabular-nums">{deliveryFee === null ? "—" : formatPaise(deliveryFee)}</span>
              </div>
              <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-bold">
                <span>Total</span>
                <span className="tabular-nums text-forest-700">{total === null ? "—" : formatPaise(total)}</span>
              </div>
            </div>

            {confirmUpdate && (
              <div className="mt-3 rounded-xl border border-marigold-400/50 bg-marigold-400/10 p-3 text-xs">
                <p className="font-semibold text-marigold-600">Prices changed while you were checking out</p>
                <p className="mt-1">New total: <strong>{formatPaise(confirmUpdate.totalPaise)}</strong>. Review and confirm below.</p>
              </div>
            )}

            <button
              className="btn-primary mt-4 w-full"
              disabled={!ready}
              onClick={() =>
                confirmUpdate
                  ? placeOrder({ fingerprint: confirmUpdate.fingerprint, subtotalPaise: confirmUpdate.subtotalPaise, deliveryFeePaise: confirmUpdate.deliveryFeePaise })
                  : placeOrder({ fingerprint: cart.fingerprint, subtotalPaise: cart.subtotalPaise, deliveryFeePaise: deliveryFee ?? 0 })
              }
            >
              {placing ? "Placing order…" : confirmUpdate ? `Confirm & place — ${formatPaise(confirmUpdate.totalPaise)}` : `Place order${total !== null ? ` — ${formatPaise(total)}` : ""}`}
            </button>
            {!ready && !placing && (
              <p className="mt-2 text-center text-xs text-red-700" role="status">
                {!addressReady ? "Complete the recipient, valid mobile number, PIN, city, state and full address to continue."
                  : !slotId ? "Select a delivery slot."
                  : !serviceability?.serviceable ? "Enter a six-digit PIN within demo delivery coverage."
                  : "Checking delivery charges…"}
              </p>
            )}
            <p className="mt-2 text-center text-[11px] text-forest-700/50">
              🔒 Double-click safe · one idempotency key per checkout attempt
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function clean(a: NewAddress) {
  return {
    recipientName: a.recipientName.trim(),
    phone: normalizePhone(a.phone),
    pincode: a.pincode.trim(),
    line1: a.line1.trim(),
    ...(a.line2.trim() ? { line2: a.line2.trim() } : {}),
    city: a.city.trim(),
    state: a.state.trim(),
  };
}

function validateAddress(a: NewAddress): boolean {
  return Boolean(
    a.recipientName.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(normalizePhone(a.phone)) &&
    /^\d{6}$/.test(a.pincode.trim()) &&
    a.line1.trim().length >= 5 &&
    a.city.trim().length >= 2 &&
    a.state.trim().length >= 2,
  );
}

function Field({ label, value, onChange, placeholder, className = "" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
