import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, newIdempotencyKey } from "../api/client";
import type { Address, Cart, Order, Quote, Serviceability, Slot } from "../api/types";
import { deliveryDayLabel, formatPaise } from "../lib/format";
import { ErrorBox, IssueBanner, PageTitle, Spinner } from "../components/ui";
import { useToast } from "../context/ToastContext";

type PaymentMethod = "COD" | "RAZORPAY";

interface NewAddress {
  recipientName: string; phone: string; pincode: string; line1: string; line2: string; city: string; state: string;
}

const EMPTY_ADDRESS: NewAddress = { recipientName: "", phone: "", pincode: "", line1: "", line2: "", city: "", state: "" };

/** Indian mobile: accept 0-prefixed / +91 / 91-prefixed forms, store the clean 10 digits. */
export function normalizePhone(value: string): string {
  let p = value.replace(/[\s-]/g, "");
  if (p.startsWith("+91")) p = p.slice(3);
  else if (p.startsWith("91") && p.length === 12) p = p.slice(2);
  else if (p.startsWith("0") && p.length === 11) p = p.slice(1);
  return p;
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
  const [paymentConfig, setPaymentConfig] = useState<{ enabled: boolean; mode: "razorpay" | "sandbox"; keyId: string | null } | null>(null);
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
      api<{ enabled: boolean; mode: "razorpay" | "sandbox"; keyId: string | null }>("/api/payments/config"),
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
    const t = setTimeout(() => {
      api<Serviceability>(`/api/catalog/serviceability/${pincode}`)
        .then(setServiceability)
        .catch(() => setServiceability(null));
    }, 250);
    return () => clearTimeout(t);
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
      toast("success", `Order ${data.order.orderNumber} placed! 🌷`);
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
  const ready = addressReady && slotId && serviceability?.serviceable && total !== null && !placing;

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
                {(() => {
                  const errs = addressFieldErrors(newAddress);
                  return (
                    <>
                      <Field label="Recipient name" value={newAddress.recipientName} onChange={(v) => setNewAddress({ ...newAddress, recipientName: v })} placeholder="Asha Verma" error={errs.recipientName} />
                      <Field label="Phone" value={newAddress.phone} onChange={(v) => setNewAddress({ ...newAddress, phone: v })} placeholder="98XXXXXXXX" error={errs.phone} />
                      <Field label="PIN code" value={newAddress.pincode} onChange={(v) => setNewAddress({ ...newAddress, pincode: v.replace(/\D/g, "").slice(0, 6) })} placeholder="110001" error={errs.pincode} />
                      <Field label="City" value={newAddress.city} onChange={(v) => setNewAddress({ ...newAddress, city: v })} placeholder="New Delhi" error={errs.city} />
                      <Field label="State" value={newAddress.state} onChange={(v) => setNewAddress({ ...newAddress, state: v })} placeholder="Delhi" error={errs.state} />
                      <Field label="Address line 1" value={newAddress.line1} onChange={(v) => setNewAddress({ ...newAddress, line1: v })} placeholder="Flat 4B, Rose Apartments" className="sm:col-span-2" error={errs.line1} />
                      <Field label="Address line 2 (optional)" value={newAddress.line2} onChange={(v) => setNewAddress({ ...newAddress, line2: v })} placeholder="Near Central Park" className="sm:col-span-2" />
                    </>
                  );
                })()}
              </div>
            )}
            {pincode.length === 6 && serviceability && (
              serviceability.serviceable ? (
                <p className="mt-3 rounded-xl bg-forest-50 px-4 py-2.5 text-sm text-forest-800">
                  ✅ We deliver to {serviceability.city ?? "this PIN"} — delivery ₹{(serviceability.deliveryFeePaise! / 100).toFixed(0)}
                </p>
              ) : (
                <p className="mt-3 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  Sorry, PIN {pincode} is not serviceable yet. We deliver across 100+ Indian cities — try another PIN.
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
            <label className={`mt-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 ${paymentMethod === "RAZORPAY" ? "border-forest-500 bg-forest-50/50" : "border-cream-300"} ${!paymentConfig.enabled ? "opacity-60" : ""}`}>
              <input type="radio" className="mt-1 accent-forest-700" disabled={!paymentConfig.enabled} checked={paymentMethod === "RAZORPAY"} onChange={() => setPaymentMethod("RAZORPAY")} />
              <span className="text-sm">
                <span className="flex flex-wrap items-center gap-2 font-semibold">
                  Pay online (UPI / cards / netbanking)
                  {paymentConfig.mode === "sandbox" && (
                    <span className="rounded-full bg-marigold-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-marigold-600">Sandbox · demo</span>
                  )}
                </span>
                <span className="block text-forest-700/80">
                  {paymentConfig.mode === "razorpay"
                    ? "Secure Razorpay Test Mode — you'll complete payment right after placing the order."
                    : "Sandbox simulator drives the real payment flow (pending → paid → receipt) with demo money — no Razorpay keys needed. Set keys in .env to switch to live Razorpay Test Mode."}
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
              title={ready ? undefined : "Complete the delivery address, date & slot to enable ordering"}
              onClick={() =>
                confirmUpdate
                  ? placeOrder({ fingerprint: confirmUpdate.fingerprint, subtotalPaise: confirmUpdate.subtotalPaise, deliveryFeePaise: confirmUpdate.deliveryFeePaise })
                  : placeOrder({ fingerprint: cart.fingerprint, subtotalPaise: cart.subtotalPaise, deliveryFeePaise: deliveryFee ?? 0 })
              }
            >
              {placing ? "Placing order…" : confirmUpdate ? `Confirm & place — ${formatPaise(confirmUpdate.totalPaise)}` : `Place order${total !== null ? ` — ${formatPaise(total)}` : ""}`}
            </button>
            {!ready && !placing && (
              <p className="mt-2 text-center text-[11px] text-marigold-600">
                {mode === "new" && !validateAddress(newAddress)
                  ? "⚠️ Complete the delivery address correctly — check the red hints above"
                  : serviceability && !serviceability.serviceable
                    ? "⚠️ This PIN code is not serviceable — try another one"
                    : "⚠️ Choose a delivery date & slot"}
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
    phone: normalizePhone(a.phone.trim()),
    pincode: a.pincode.trim(),
    line1: a.line1.trim(),
    ...(a.line2.trim() ? { line2: a.line2.trim() } : {}),
    city: a.city.trim(),
    state: a.state.trim(),
  };
}

/**
 * Per-field errors for the NEW-address form. Empty fields are not nagged
 * (the placeholders guide the user); a field that HAS content but is wrong
 * gets an explicit message — this is what un-blocks a disabled Place-order
 * button when someone types e.g. "09812670193" (leading 0).
 */
export function addressFieldErrors(a: NewAddress): Partial<Record<keyof NewAddress, string>> {
  const errors: Partial<Record<keyof NewAddress, string>> = {};
  const t = (v: string) => v.trim();
  if (t(a.recipientName) && t(a.recipientName).length < 2) errors.recipientName = "Please enter the recipient's full name";
  if (t(a.phone) && !/^[6-9]\d{9}$/.test(normalizePhone(a.phone))) {
    errors.phone = t(a.phone).replace(/\D/g, "").length === 11
      ? "11 digits — remove the leading 0 (use 10 digits, e.g. 9812670193)"
      : "Enter a valid 10-digit mobile number starting 6–9";
  }
  if (t(a.pincode) && !/^\d{6}$/.test(t(a.pincode))) errors.pincode = "PIN code must be exactly 6 digits";
  if (t(a.line1) && t(a.line1).length < 5) errors.line1 = "Address is too short — house/flat + street";
  if (t(a.city) && t(a.city).length < 2) errors.city = "Enter the city";
  if (t(a.state) && t(a.state).length < 2) errors.state = "Enter the state";
  return errors;
}

function validateAddress(a: NewAddress): boolean {
  return Object.keys(addressFieldErrors(a)).length === 0 && Boolean(
    a.recipientName.trim().length >= 2 &&
    /^[6-9]\d{9}$/.test(normalizePhone(a.phone.trim())) &&
    /^\d{6}$/.test(a.pincode.trim()) &&
    a.line1.trim().length >= 5 &&
    a.city.trim().length >= 2 &&
    a.state.trim().length >= 2,
  );
}

function Field({ label, value, onChange, placeholder, className = "", error }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; className?: string; error?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input className={`input ${error ? "border-red-400 focus:border-red-500" : ""}`} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
