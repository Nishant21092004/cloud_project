import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { DeliveryCoverage, PaymentConfig, Serviceability } from "../api/types";
import { formatPaise } from "../lib/format";
import { ErrorBox, PageTitle, Spinner } from "../components/ui";

/**
 * "Do you deliver to me, and how do I pay?" — the two questions a storefront
 * always gets. Both are answered from the live API rather than static copy, so
 * the page cannot drift from what checkout actually does.
 */
export function DeliveryPage() {
  const [coverage, setCoverage] = useState<DeliveryCoverage | null>(null);
  const [payment, setPayment] = useState<PaymentConfig | null>(null);
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<Serviceability | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api<DeliveryCoverage>("/api/catalog/delivery-coverage"),
      api<PaymentConfig>("/api/payments/config"),
    ])
      .then(([c, p]) => { setCoverage(c); setPayment(p); })
      .catch((e) => setError(e.message));
  }, []);

  const check = async () => {
    if (!/^\d{6}$/.test(pin)) return;
    setChecking(true);
    setResult(null);
    try {
      setResult(await api<Serviceability>(`/api/catalog/serviceability/${pin}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setChecking(false);
    }
  };

  if (error && !coverage) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={error} /></div>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <PageTitle
        title="Delivery & payment across India"
        subtitle="We ship to every PIN code that starts with 1–8. Fees and days come from the coverage model the checkout uses — not from a hand-written city list."
      />

      <div className="grid gap-5 md:grid-cols-[1.1fr_1fr]">
        {/* checker */}
        <section className="card p-5">
          <h2 className="text-lg font-semibold">Check your PIN code</h2>
          <p className="mt-1 text-xs text-forest-700/70">Type any six-digit Indian PIN — this is the exact call checkout makes.</p>
          <div className="mt-3 flex gap-2">
            <input
              className="input" inputMode="numeric" autoComplete="off" maxLength={6}
              placeholder="e.g. 395007 (Surat)" value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              onKeyDown={(e) => { if (e.key === "Enter") void check(); }}
            />
            <button className="btn-primary" onClick={() => void check()} disabled={pin.length !== 6 || checking}>
              {checking ? "Checking…" : "Check"}
            </button>
          </div>

          {result && (
            <div className={`mt-4 rounded-xl px-4 py-3 text-sm ${result.serviceable ? "bg-forest-50 text-forest-800" : "bg-red-50 text-red-700"}`}>
              {result.serviceable ? (
                <>
                  <p className="font-semibold">✅ {result.city}{result.state ? `, ${result.state}` : ""} — we deliver here</p>
                  <ul className="mt-1.5 space-y-0.5 text-forest-700/85">
                    <li>Delivery fee: <strong>{formatPaise(result.deliveryFeePaise ?? 0)}</strong></li>
                    <li>Typical time: <strong>{result.etaDaysMin}–{result.etaDaysMax} day(s)</strong> after the cut</li>
                    <li>Postal circle: {result.circle}</li>
                    {result.hub && <li>🏠 A dispatch hub serves this sorting district, so it is same/next-day.</li>}
                    {result.remote && <li>⛰️ Hilly or island lane — we add two days and a small surcharge.</li>}
                    <li>💵 Cash on Delivery is available for this PIN.</li>
                  </ul>
                  <Link to="/flowers" className="btn-primary btn-sm mt-3">Start an order</Link>
                </>
              ) : (
                <>
                  <p className="font-semibold">⛔ PIN {result.pincode} is not serviceable</p>
                  <p className="mt-1">
                    {result.disabledByAdmin
                      ? "The shop has switched this delivery zone off in Admin → Settings."
                      : "We ship to PIN codes starting 1–8. 9xxxxx is Army/APO mail and 0xxxxx is not used in India."}
                  </p>
                </>
              )}
            </div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-forest-700/60">
            Honest caveat: this is a <strong>demo coverage model</strong> built for a cloud-computing course. A real shop
            would ask India Post or a courier API (Delhivery/BlueDart) whether a PIN is serviceable, because serviceability
            changes by pin, by weight and by season.
          </p>
        </section>

        {/* payment */}
        <section className="card p-5">
          <h2 className="text-lg font-semibold">How you can pay</h2>
          <ul className="mt-3 space-y-3 text-sm">
            <li className="flex gap-3 rounded-xl border border-cream-300 p-3">
              <span className="text-xl">💵</span>
              <span><span className="font-semibold">Cash on Delivery</span><span className="block text-forest-700/80">Pay the courier when the flowers arrive. Available on every serviceable PIN.</span></span>
            </li>
            <li className="flex gap-3 rounded-xl border border-cream-300 p-3">
              <span className="text-xl">📱</span>
              <span>
                <span className="font-semibold">UPI · Cards · Netbanking · Wallets</span>
                <span className="block text-forest-700/80">
                  {payment?.enabled ? "Live Razorpay checkout is configured on this server (test mode)." : "Offered through a simulated gateway here, because no Razorpay keys are configured on this server. Order state becomes DEMO_PAID and no money moves."}
                </span>
              </span>
            </li>
            {payment?.enabled && (
              <li className="flex gap-3 rounded-xl border border-forest-300 bg-forest-50/60 p-3">
                <span className="text-xl">⚡</span>
                <span><span className="font-semibold">Razorpay (test keys live)</span><span className="block text-forest-700/80">Signature-verified, webhook-reconciled, and stock is held until payment completes or the window expires.</span></span>
              </li>
            )}
          </ul>
          <div className="mt-3 rounded-xl bg-cream-200/60 px-3.5 py-2.5 text-xs text-forest-800">
            Prepaid orders hold stock for <code>ORDER_PAYMENT_TTL_MINUTES</code> (30 by default). If payment never lands,
            the order expires and every stem goes back on the shelf automatically.
          </div>
        </section>
      </div>

      {/* circles */}
      {coverage ? (
        <section className="mt-6">
          <h2 className="text-lg font-semibold">Coverage by postal circle</h2>
          <p className="mt-1 text-xs text-forest-700/70">{coverage.circles.length} circles · every PIN starting 1–8 · {coverage.configuredPincodes.length} individually configured zones</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {coverage.circles.map((c) => (
              <div key={c.firstDigit} className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-forest-700/60">{c.firstDigit}xxxxx</p>
                <p className="mt-1 font-semibold text-forest-900">{c.name}</p>
                <p className="mt-1 text-[11px] leading-snug text-forest-700/70">{c.states}</p>
                <p className="mt-2 text-sm font-semibold text-forest-700">{formatPaise(c.feePaise)} · {c.etaDaysMin}–{c.etaDaysMax} days</p>
                {c.cities.length > 0 && (
                  <p className="mt-2 text-[11px] leading-snug text-forest-700/60">
                    Named cities we resolve directly: {c.cities.slice(0, 5).map((x) => x.city.split(" ")[0]).join(", ")}
                    {c.cities.length > 5 ? ` +${c.cities.length - 5} more` : ""}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      ) : (
        <Spinner label="Loading coverage…" />
      )}
    </div>
  );
}
