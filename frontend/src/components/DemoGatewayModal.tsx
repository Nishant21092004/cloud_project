/**
 * DemoGatewayModal — the simulated payment sheet.
 * ----------------------------------------------
 * A classroom deployment has no merchant account, but a checkout demo that
 * only ever shows "Cash on Delivery" teaches nothing about prepaid flows. This
 * modal reproduces the *shape* of a real UPI/card/netbanking hand-off — method
 * picker, processing state, a confirmation with a reference id — and then the
 * storefront records the order as `DEMO_PAID` with an explicit
 * "no money moved" payment row.
 *
 * It deliberately asks for nothing: no card numbers, no VPA, no OTP. Typing
 * real financial data into a demo box would be the one genuinely bad idea
 * available here.
 */
import { useEffect, useState } from "react";
import { formatPaise } from "../lib/format";

type Method = "upi" | "card" | "netbanking" | "wallet";
type Stage = "choose" | "processing" | "done";

const METHODS: Array<{ id: Method; icon: string; label: string; blurb: string }> = [
  { id: "upi", icon: "📲", label: "UPI", blurb: "GPay / PhonePe / Paytm — the flow is simulated, no app is opened." },
  { id: "card", icon: "💳", label: "Card", blurb: "No card number is requested; a demo card is assumed." },
  { id: "netbanking", icon: "🏦", label: "Netbanking", blurb: "Choose-a-bank screen is skipped in simulation." },
  { id: "wallet", icon: "👛", label: "Wallet", blurb: "Paytm / Amazon Pay balance — simulated credit." },
];

export function DemoGatewayModal({ amountPaise, recipient, onCancel, onPaid }: {
  amountPaise: number;
  recipient: string;
  onCancel: () => void;
  onPaid: (method: Method) => void;
}) {
  const [method, setMethod] = useState<Method>("upi");
  const [stage, setStage] = useState<Stage>("choose");
  const [reference] = useState(() => `DEMO${Math.random().toString(36).slice(2, 10).toUpperCase()}`);

  useEffect(() => {
    if (stage !== "processing") return;
    const t = setTimeout(() => setStage("done"), 1500);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== "done") return;
    const t = setTimeout(() => onPaid(method), 900);
    return () => clearTimeout(t);
  }, [stage, method, onPaid]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-forest-900/70 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Simulated payment gateway">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-5 shadow-lift sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="label !mb-0.5">BloomNest · demo gateway</p>
            <h3 className="text-lg font-semibold text-forest-900">Pay {formatPaise(amountPaise)}</h3>
            <p className="mt-0.5 text-xs text-forest-700/70">For {recipient || "your recipient"}. Nothing is charged — this screen is a simulation.</p>
          </div>
          <button className="btn-ghost btn-sm" onClick={onCancel} aria-label="Cancel payment">✕</button>
        </div>

        {stage === "choose" && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button key={m.id} onClick={() => setMethod(m.id)}
                  className={`rounded-xl border p-3 text-left text-sm transition ${method === m.id ? "border-forest-500 bg-forest-50" : "border-cream-300 hover:border-forest-300"}`}>
                  <span className="block text-lg" aria-hidden>{m.icon}</span>
                  <span className="mt-1 block font-semibold text-forest-900">{m.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-forest-700/70">{m.blurb}</span>
                </button>
              ))}
            </div>
            <button className="btn-primary mt-4 w-full" onClick={() => setStage("processing")}>
              Simulate successful {METHODS.find((m) => m.id === method)?.label.toLowerCase()} payment
            </button>
            <button className="btn-ghost mt-2 w-full text-xs" onClick={onCancel}>Cancel and go back</button>
            <p className="mt-3 text-center text-[11px] leading-relaxed text-forest-700/60">
              In production this is where Razorpay's real checkout loads (test keys in <code>.env</code>). The order
              would then hold stock until the gateway confirms or the payment window expires.
            </p>
          </>
        )}

        {stage === "processing" && (
          <div className="flex flex-col items-center gap-3 py-10">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-forest-200 border-t-forest-600" />
            <p className="text-sm text-forest-800">Contacting the (imaginary) {METHODS.find((m) => m.id === method)?.label} switch…</p>
            <p className="text-xs text-forest-700/60">No network call is being made to any bank.</p>
          </div>
        )}

        {stage === "done" && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-forest-100 text-2xl">✅</div>
            <p className="mt-3 font-semibold text-forest-900">Payment simulated</p>
            <p className="mt-1 text-xs text-forest-700/70">Reference <code>{reference}</code> · your order is being created…</p>
          </div>
        )}
      </div>
    </div>
  );
}
