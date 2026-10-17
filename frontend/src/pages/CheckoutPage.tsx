import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, newIdempotencyKey } from "../api/client";
import type { Address, Cart, Order, PaymentConfig, Quote, Serviceability, Slot } from "../api/types";
import { deliveryDayLabel, formatPaise } from "../lib/format";
import { ErrorBox, IssueBanner, PageTitle, Spinner } from "../components/ui";
import { DemoGatewayModal } from "../components/DemoGatewayModal";
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

/** Per-field messages — a disabled button must never be a mystery. */
function addressIssues(a: NewAddress): Record<string, string> {
  const issues: Record<string, string> = {};
  if (a.recipientName.trim().length < 2) issues.recipientName = "Enter the recipient's name (2+ characters).";
  const phone = normalizePhone(a.phone);
  if (!/^[6-9]\d{9}$/.test(phone)) issues.phone = "10-digit Indian mobile, starting 6–9. A leading 0 or +91 is fine — we strip it.";
  if (!/^\d{6}$/.test(a.pincode.trim())) issues.pincode = "PIN code must be exactly 6 digits.";
  if (a.line1.trim().length < 5) issues.line1 = "House / flat and street, please.";
  if (a.city.trim().length < 2) issues.city = "City is required.";
  if (a.state.trim().length < 2) issues.state = "State is required.";
  return issues;
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
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mode, setMode] = useState<"saved" | "new">("saved");
  const [addressId, setAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<NewAddress>(EMPTY_ADDRESS);
  const [serviceability, setServiceability] = useState<Serviceability | null>(null);
  const [serviceFailed, setServiceFailed] = useState(false);

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
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const idemKey = useRef(newIdempotencyKey());

  useEffect(() => {
    Promise.all([
      api<{ cart: Cart }>("/api/cart"),
      api<{ addresses: Address[] }>("/api/addresses"),
      api<{ slots: Slot[] }>("/api/catalog/delivery-slots"),
      api<PaymentConfig>("/api/payments/config"),
    ])
      .then(([c, a, s, p]) => {
        setCart(c.cart);
        setAddresses(a.addresses);
        if (a.addresses.length > 0) {
          setMode("saved");
          setAddressId((a.addresses.find((x) => x.isDefault) ?? a.addresses[0]).id);
        } else {
          setMode("new");
        }
        setSlots(s.slots);
        if (s.slots[0]) setSlotId(s.slots[0].id);
        setPaymentConfig(p);
        // Offer prepaid first when a gateway (real or simulated) exists — COD stays available.
        setPaymentMethod(p.enabled || p.demoOnline?.enabled ? "RAZORPAY" : "COD");
        if (!p.enabled && p.demoOnline?.enabled) setPaymentMethod("DEMO_ONLINE");
      })
      .catch((e) => setLoadError(e.message));
  }, []);

  // ── delivery coverage for the chosen PIN (admin rows + India-wide estimate)
  const pincode = mode === "saved" ? addresses.find((a) => a.id === addressId)?.pincode ?? "" : newAddress.pincode;
  const checkCoverage = useCallback(() => {
    if (!/^\d{6}$/.test(pincode)) return;
    setServiceFailed(false);
    api<Serviceability>(`/api/catalog/serviceability/${pincode}`)
      .then((result) => setServiceability(result))
      .catch(() => { setServiceability(null); setServiceFailed(true); });
  }, [pincode]);

  useEffect(() => {
    setServiceability(null);
    if (!/^\d{6}$/.test(pincode)) return;
    const t = setTimeout(checkCoverage, 250);
    return () => clearTimeout(t);
  }, [pincode, checkCoverage]);

  const days = useMemo(() => nextDays(7), []);
  const deliveryFee = serviceability?.serviceable ? serviceability.deliveryFeePaise ?? 0 : null;
  const total = cart && deliveryFee !== null ? cart.subtotalPaise + deliveryFee : null;

  const addressIssuesNew = useMemo(() => addressIssues(newAddress), [newAddress]);
  const addressReady = mode === "saved" ? Boolean(addressId) : Object.keys(addressIssuesNew).length === 0;
  const coverageReady = Boolean(serviceability?.serviceable);

  const blockers: string[] = [];
  if (!addressReady) blockers.push(mode === "new" ? Object.values(addressIssuesNew)[0] : "Choose one of your saved addresses (or add a new one).");
  if (!slotId) blockers.push("Pick a delivery slot.");
  if (pincode.length !== 6) blockers.push("Enter the 6-digit PIN code of the delivery address.");
  else if (serviceFailed) blockers.push("Could not reach the delivery-coverage service — retry below.");
  else if (!coverageReady) blockers.push(`PIN ${pincode} is outside our delivery coverage${serviceability?.disabledByAdmin ? " (this zone is switched off by the shop)" : " (PINs must start 1–8)"}.`);
  if (cart && cart.lines.length === 0) blockers.push("Your cart is empty.");
  const ready = blockers.length === 0 && !placing;

  const submitOrder = async (method: PaymentMethod, demoMethod?: string): Promise<Order | null> => {
    if (!cart) return null;
    setPlacing(true);
    setIssues([]);
    try {
      const body = {
        ...(mode === "saved" ? { addressId } : { address: clean(newAddress) }),
        slotId,
        deliveryDate,
        paymentMethod: method,
        ...(confirmUpdate
          ? { confirmPricing: { fingerprint: confirmUpdate.fingerprint, subtotalPaise: confirmUpdate.subtotalPaise, deliveryFeePaise: confirmUpdate.deliveryFeePaise } }
          : { confirmPricing: { fingerprint: cart.fingerprint, subtotalPaise: cart.subtotalPaise, deliveryFeePaise: deliveryFee ?? 0 } }),
      };
      const data = await api<{ order: Order; replayed: boolean }>("/api/orders", {
        method: "POST",
        body,
        headers: { "Idempotency-Key": idemKey.current },
      });
      if (method === "DEMO_ONLINE" && demoMethod) {
        // audit trail only — the order is already placed and nothing was charged
        await api("/api/payments/demo/record", { method: "POST", body: { orderNumber: data.order.orderNumber, method: demoMethod } }).catch(() => undefined);
      }
      setGatewayOpen(false);
      idemKey.current = newIdempotencyKey();
      if (method !== "RAZORPAY") {
        toast("success", `Order ${data.order.orderNumber} placed${method === "DEMO_ONLINE" ? " (payment simulated — no money moved)" : " (pay the courier on delivery)"}! 🌷`);
        navigate(`/orders/${data.order.orderNumber}`);
      }
      return data.order;
    } catch (e) {
      const err = e as { code?: string; message: string; details?: { quote?: Quote; issues?: string[] } };
      if (err.code === "PRICE_CHANGED" && err.details?.quote) {
        setConfirmUpdate(err.details.quote);
        toast("info", "Prices or the delivery fee changed — the total has been refreshed. Press the button again to confirm.");
        // refresh the cart too so the second click cannot loop
        api<{ cart: Cart }>("/api/cart").then((d) => setCart(d.cart)).catch(() => undefined);
      } else if (err.code === "OUT_OF_STOCK") {
        setIssues(err.details?.issues ?? [err.message]);
      } else if (err.code === "NOT_SERVICEABLE") {
        setIssues([err.message]);
        checkCoverage();
      } else {
        setIssues([err.message]);
      }
      setPlacing(false);
      throw err;
    } finally {
      setPlacing(false);
    }
  };

  const openRazorpay = async (orderNumber: string, amountPaise: number, keyId: string | null) => {
    const cfg = await api<{ razorpayOrderId: string; amountPaise: number; keyId: string }>("/api/payments/razorpay/create", {
      method: "POST", body: { orderNumber },
    });
    if (!window.Razorpay) await loadRazorpayScript();
    return new Promise<void>((resolve) => {
      const rzp = new window.Razorpay!({
        key: cfg.keyId ?? keyId,
        amount: cfg.amountPaise ?? amountPaise,
        currency: "INR",
        name: "BloomNest",
        description: `Order ${orderNumber}`,
        order_id: cfg.razorpayOrderId,
        theme: { color: "#2f5d3a" },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await api("/api/payments/razorpay/verify", { method: "POST", body: { orderNumber, ...response } });
            toast("success", "Payment verified — thank you!");
          } catch (e) {
            toast("error", (e as Error).message);
          }
          resolve();
        },
        modal: { ondismiss: () => resolve() },
      });
      rzp.open();
    });
  };

  const placeOrder = async () => {
    if (!ready) return;
    try {
      if (paymentMethod === "DEMO_ONLINE") {
        // the simulated gateway opens first; the order is created when it "succeeds"
        setGatewayOpen(true);
        return;
      }
      if (paymentMethod === "RAZORPAY") {
        if (!paymentConfig?.enabled) {
          toast("info", "The real gateway is not configured on this server — use the simulated UPI/card option or Cash on Delivery.");
          return;
        }
        const placed = await submitOrder("RAZORPAY");
        if (placed && placed.paymentStatus === "PENDING") {
          // the hand-off; if the customer dismisses it the order stays PENDING
          // and stock is held until the payment window expires
          await openRazorpay(placed.orderNumber, placed.totalPaise, paymentConfig.keyId);
        }
        if (placed) navigate(`/orders/${placed.orderNumber}`);
        return;
      }
      await submitOrder("COD");
    } catch {
      /* the reason is already rendered in `issues` */
    }
  };

  if (loadError) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={loadError} onRetry={() => location.reload()} /></div>;
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageTitle title="Checkout" subtitle="Stock, prices and delivery coverage are re-validated the moment you place the order." />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {/* 1 — address */}
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
                <Field label="Recipient name" value={newAddress.recipientName} error={addressIssuesNew.recipientName} onChange={(v) => setNewAddress({ ...newAddress, recipientName: v })} placeholder="Asha Verma" />
                <Field label="Phone" value={newAddress.phone} error={addressIssuesNew.phone} onChange={(v) => setNewAddress({ ...newAddress, phone: v })} placeholder="98XXXXXXXX (0 / +91 also accepted)" />
                <Field label="PIN code" value={newAddress.pincode} error={addressIssuesNew.pincode} onChange={(v) => setNewAddress({ ...newAddress, pincode: v.replace(/\D/g, "").slice(0, 6) })} placeholder="395007" />
                <Field label="City" value={newAddress.city} error={addressIssuesNew.city} onChange={(v) => setNewAddress({ ...newAddress, city: v })} placeholder="Surat" />
                <Field label="State" value={newAddress.state} error={addressIssuesNew.state} onChange={(v) => setNewAddress({ ...newAddress, state: v })} placeholder="Gujarat" />
                <Field label="Address line 1" value={newAddress.line1} error={addressIssuesNew.line1} onChange={(v) => setNewAddress({ ...newAddress, line1: v })} placeholder="Flat 4B, Rose Apartments" className="sm:col-span-2" />
                <Field label="Address line 2 (optional)" value={newAddress.line2} onChange={(v) => setNewAddress({ ...newAddress, line2: v })} placeholder="Near Central Park" className="sm:col-span-2" />
              </div>
            )}

            {/* coverage — all of India, not one city */}
            <div className="mt-3">
              {pincode.length === 6 && serviceability && serviceability.serviceable && (
                <div className="rounded-xl bg-forest-50 px-4 py-3 text-sm text-forest-800">
                  <p className="font-semibold">✅ Delivering to {serviceability.city}{serviceability.state ? `, ${serviceability.state}` : ""}</p>
                  <p className="mt-0.5 text-forest-700/80">
                    {formatPaise(serviceability.deliveryFeePaise ?? 0)} delivery · typically {serviceability.etaDaysMin}–{serviceability.etaDaysMax} day(s)
                    {serviceability.hub ? " · same-city dispatch hub" : ""}{serviceability.remote ? " · hilly/island lane, so a little slower" : ""}
                  </p>
                  <p className="mt-1 text-[11px] text-forest-700/60">
                    {serviceability.demoCoverage
                      ? "Estimated from our India-wide coverage model (PIN circles 1–8). Demo project — not a courier serviceability guarantee."
                      : "Priced from the delivery zone the shop configured for this PIN."}
                  </p>
                </div>
              )}
              {pincode.length === 6 && serviceability && !serviceability.serviceable && (
                <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                  ⛔ PIN {pincode} is outside our delivery coverage{serviceability.disabledByAdmin ? " — the shop has switched this zone off" : " (we serve PIN codes starting 1–8; 9xxxxx is Army/APO mail)"}.
                </p>
              )}
              {pincode.length === 6 && !serviceability && (
                <p className="rounded-xl bg-cream-200/70 px-4 py-2.5 text-sm text-forest-700">
                  {serviceFailed
                    ? <>Couldn't check coverage for {pincode}. <button className="font-semibold underline" onClick={checkCoverage}>Retry</button></>
                    : "Checking delivery coverage…"}
                </p>
              )}
            </div>
          </section>

          {/* 2 — date + slot */}
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
            {serviceability?.serviceable && serviceability.etaDaysMin !== null && serviceability.etaDaysMin > 1 && (
              <p className="mt-3 text-xs text-forest-700/70">
                ℹ️ This PIN normally takes {serviceability.etaDaysMin}–{serviceability.etaDaysMax} days, so “Today” may not be achievable — we will call to confirm.
              </p>
            )}
          </section>

          {/* 3 — payment */}
          <section className="card p-5">
            <h2 className="mb-1 text-lg font-semibold">3 · Payment</h2>
            <p className="mb-3 text-xs text-forest-700/70">Pay however you like — online or cash to the courier.</p>

            <PaymentOption
              selected={paymentMethod === "DEMO_ONLINE"} disabled={false}
              onSelect={() => setPaymentMethod("DEMO_ONLINE")}
              icon="📱" title="UPI / cards / netbanking"
              badge="Prepaid"
              caption={paymentConfig.enabled
                ? "Opens the payment gateway after your order is created."
                : "Simulated gateway for this demo — it records a prepaid order without contacting a bank. No money moves."}
            />
            {paymentConfig.enabled && (
              <PaymentOption
                selected={paymentMethod === "RAZORPAY"} onSelect={() => setPaymentMethod("RAZORPAY")}
                icon="⚡" title="Razorpay (test gateway)" badge="Live keys"
                caption="Real Razorpay checkout in test mode: UPI, cards, netbanking and wallets. Test cards only — never real payment details."
              />
            )}
            <PaymentOption
              selected={paymentMethod === "COD"} onSelect={() => setPaymentMethod("COD")}
              icon="💵" title="Cash on Delivery" badge="Always available"
              caption="Pay the courier when your flowers arrive. Nothing is charged now."
            />
            {!paymentConfig.enabled && (
              <p className="mt-3 rounded-xl bg-cream-200/60 px-3.5 py-2.5 text-[11px] leading-relaxed text-forest-700/80">
                Razorpay test keys are not configured on this server, so the real gateway is hidden. “UPI / cards / netbanking”
                above is the simulated demo gateway: it produces a prepaid order (<code>DEMO_PAID</code>) and is never counted
                as collected revenue in the admin dashboard.
              </p>
            )}
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
                <p className="font-semibold text-marigold-600">Totals were refreshed while you were checking out</p>
                <p className="mt-1">New total: <strong>{formatPaise(confirmUpdate.totalPaise)}</strong>. Press the button once more to confirm it.</p>
                <button className="btn-ghost btn-sm mt-1" onClick={() => { setConfirmUpdate(null); checkCoverage(); }}>Dismiss</button>
              </div>
            )}

            <button
              className={`btn-primary mt-4 w-full ${!ready ? "cursor-not-allowed" : ""}`}
              disabled={!ready}
              aria-disabled={!ready}
              onClick={placeOrder}
            >
              {placing ? "Placing order…" : confirmUpdate ? `Confirm & place — ${formatPaise(confirmUpdate.totalPaise)}` : `Place order${total !== null ? ` — ${formatPaise(total)}` : ""}`}
            </button>

            {!ready && !placing && (
              <ul className="mt-2 space-y-1 text-center text-xs text-red-700" role="status" aria-live="polite">
                {blockers.map((b, i) => <li key={i}>• {b}</li>)}
              </ul>
            )}
            <p className="mt-2 text-center text-[11px] text-forest-700/50">
              🔒 Double-click safe · one idempotency key per checkout attempt
            </p>
          </div>
        </aside>
      </div>

      {gatewayOpen && (
        <DemoGatewayModal
          amountPaise={total ?? cart.subtotalPaise}
          recipient={mode === "saved" ? addresses.find((a) => a.id === addressId)?.recipientName ?? "your recipient" : newAddress.recipientName}
          onCancel={() => setGatewayOpen(false)}
          onPaid={(method) => { void submitOrder("DEMO_ONLINE", method).catch(() => undefined); }}
        />
      )}
    </div>
  );
}

function PaymentOption({ selected, onSelect, icon, title, caption, badge, disabled = false }: {
  selected: boolean; onSelect: () => void; icon: string; title: string; caption: string; badge?: string; disabled?: boolean;
}) {
  return (
    <label className={`mt-2 flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${selected ? "border-forest-500 bg-forest-50/60 shadow-sm" : "border-cream-300 hover:border-forest-300"} ${disabled ? "opacity-60" : ""}`}>
      <input type="radio" name="payment-method" className="mt-1.5 accent-forest-700" disabled={disabled} checked={selected} onChange={onSelect} />
      <span className="text-lg leading-none" aria-hidden>{icon}</span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-forest-900">{title}</span>
          {badge && <span className="badge bg-forest-100 text-forest-800">{badge}</span>}
        </span>
        <span className="mt-0.5 block text-forest-700/80">{caption}</span>
      </span>
    </label>
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

function Field({ label, value, onChange, placeholder, error, className = "" }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; error?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label className="label">{label}</label>
      <input className={`input ${error ? "border-red-300 focus:border-red-400 focus:ring-red-200/40" : ""}`} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-invalid={Boolean(error)} />
      {error && <p className="mt-1 text-[11px] leading-snug text-red-700">{error}</p>}
    </div>
  );
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load the Razorpay checkout script"));
    document.body.appendChild(s);
  });
}
