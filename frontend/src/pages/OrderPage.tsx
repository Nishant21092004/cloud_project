import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import type { Order } from "../api/types";
import { deliveryDayLabel, formatDate, formatDateTime, formatPaise, PAYMENT_STATUS_LABELS, STATUS_LABELS, statusTone } from "../lib/format";
import { ErrorBox, IssueBanner, PageTitle, Spinner } from "../components/ui";
import { useToast } from "../context/ToastContext";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const TIMELINE: Array<{ key: string; label: string }> = [
  { key: "PLACED", label: "Placed" },
  { key: "CONFIRMED", label: "Confirmed" },
  { key: "PREPARING", label: "Preparing" },
  { key: "OUT_FOR_DELIVERY", label: "Out for delivery" },
  { key: "DELIVERED", label: "Delivered" },
];

export function OrderPage() {
  const { orderNumber } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const load = useCallback(() => {
    api<{ order: Order }>(`/api/orders/${orderNumber}`)
      .then((d) => setOrder(d.order))
      .catch((e) => setError(e.message));
  }, [orderNumber]);

  useEffect(load, [load]);

  const cancel = async () => {
    setBusy(true);
    try {
      const d = await api<{ order: Order }>(`/api/orders/${orderNumber}/cancel`, {
        method: "POST",
        body: { reason: cancelReason || undefined },
      });
      setOrder(d.order);
      toast("success", "Order cancelled — stock has been released.");
      setShowCancel(false);
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /** Razorpay Test-Mode payment: create gateway order → checkout.js → verify. */
  const payNow = async () => {
    setBusy(true);
    try {
      const cfg = await api<{ razorpayOrderId: string; amountPaise: number; keyId: string }>(
        `/api/payments/razorpay/create`,
        { method: "POST", body: { orderNumber } },
      );
      if (!window.Razorpay) await loadRazorpayScript();
      const rzp = new window.Razorpay!({
        key: cfg.keyId,
        amount: cfg.amountPaise,
        currency: "INR",
        name: "BloomNest",
        description: `Order ${orderNumber}`,
        order_id: cfg.razorpayOrderId,
        prefill: { name: order?.recipientName, contact: order?.phone },
        theme: { color: "#2f5d3a" },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await api(`/api/payments/razorpay/verify`, { method: "POST", body: { orderNumber, ...response } });
            toast("success", "Payment verified — thank you!");
            load();
          } catch (e) {
            toast("error", (e as Error).message);
            load();
          }
        },
        modal: { ondismiss: () => toast("info", "Payment window closed — you can pay anytime before the order expires.") },
      });
      rzp.open();
    } catch (e) {
      toast("error", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={error} onRetry={load} /></div>;
  if (!order) return <Spinner label="Opening your receipt…" />;

  const cancellable = ["PLACED", "CONFIRMED", "PREPARING"].includes(order.status);
  const activeIdx = TIMELINE.findIndex((t) => t.key === order.status);
  const needPayment = order.paymentMethod === "RAZORPAY" && order.paymentStatus === "PENDING" && order.status !== "CANCELLED";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageTitle title={`Order ${order.orderNumber}`} subtitle={`Placed ${formatDateTime(order.createdAt)} · receipt`} />

      {/* success banner */}
      {order.status !== "CANCELLED" && (
        <div className="mb-5 rounded-2xl bg-forest-700 px-5 py-4 text-cream-50">
          <p className="font-semibold">🌷 Thank you, {order.recipientName.split(" ")[0]}!</p>
          <p className="text-sm text-cream-100/85">
            Delivering {deliveryDayLabel(order.deliveryDate)}, {order.slotLabel.toLowerCase()} to {order.city}.
            {order.paymentStatus === "PAID" && " Payment received."}
            {order.paymentStatus === "DEMO_PAID" && " Demo payment simulated. No actual money was charged."}
            {order.paymentStatus === "COD_PENDING" && " Keep cash ready at delivery."}
          </p>
        </div>
      )}

      {/* status + actions */}
      <div className="card mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${statusTone(order.status)}`}>{STATUS_LABELS[order.status]}</span>
            <span className={`badge ${statusTone(order.paymentStatus)}`}>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>
            <span className="badge bg-cream-200 text-forest-700">{order.paymentMethod === "COD" ? "Cash on Delivery" : "Razorpay"}</span>
          </div>
          <div className="flex gap-2">
            {needPayment && (
              <button className="btn-blush btn-sm" disabled={busy} onClick={payNow}>Pay now</button>
            )}
            {cancellable && (
              <button className="btn-secondary btn-sm" onClick={() => setShowCancel(!showCancel)}>Cancel order</button>
            )}
          </div>
        </div>

        {needPayment && order.expiresAt && (
          <p className="mt-3 text-xs text-marigold-600">
            ⏳ Stock is reserved for this order until {formatDateTime(order.expiresAt)}. After that it's released automatically.
          </p>
        )}
        {order.paymentStatus === "REFUND_REQUESTED" && (
          <p className="mt-3 rounded-xl bg-sky-50 px-4 py-2.5 text-xs text-sky-800">
            {order.refundNote ?? "Refund initiated. It will show as Refunded only after being verified in the payment dashboard."}
          </p>
        )}

        {showCancel && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">Cancel this order?</p>
            <p className="mt-1 text-xs text-red-600/80">
              Reserved stock returns to the shop immediately.
              {order.paymentStatus === "PAID" && " A refund will be initiated — completed only after verification in the payment dashboard."}
            </p>
            <input className="input mt-2" placeholder="Reason (optional)" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            <div className="mt-3 flex gap-2">
              <button className="btn btn-sm bg-red-600 text-white hover:bg-red-700" disabled={busy} onClick={cancel}>{busy ? "Cancelling…" : "Yes, cancel order"}</button>
              <button className="btn-ghost btn-sm" onClick={() => setShowCancel(false)}>Keep order</button>
            </div>
          </div>
        )}

        {/* fulfilment timeline */}
        {order.status !== "CANCELLED" && (
          <ol className="mt-6 flex items-start">
            {TIMELINE.map((t, i) => {
              const done = i <= activeIdx;
              return (
                <li key={t.key} className="relative flex flex-1 flex-col items-center text-center">
                  {i < TIMELINE.length - 1 && (
                    <div className={`absolute left-1/2 top-3.5 h-0.5 w-full ${i < activeIdx ? "bg-forest-600" : "bg-cream-200"}`} />
                  )}
                  <div className={`relative flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${done ? "bg-forest-700 text-cream-50" : "bg-cream-200 text-forest-700/50"}`}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`mt-1.5 text-[11px] leading-tight ${done ? "font-semibold text-forest-800" : "text-forest-700/40"}`}>{t.label}</span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {/* items */}
      <div className="card mb-5 divide-y divide-cream-200">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="font-semibold">{item.title}</p>
              {item.subtitle && <p className="text-xs text-forest-700/60">{item.subtitle}</p>}
              {item.kind === "CUSTOM" && item.customSnapshot && "flowers" in item.customSnapshot && (
                <details className="mt-1.5 text-xs text-forest-700/80">
                  <summary className="cursor-pointer font-semibold text-forest-700">Custom composition</summary>
                  <ul className="mt-1 space-y-0.5">
                    {item.customSnapshot.flowers.map((f) => (
                      <li key={f.flowerId}>{f.stems} × {f.name} — {formatPaise(f.pricePerStemPaise * f.stems)}</li>
                    ))}
                    {item.customSnapshot.wrapping && <li>Wrapping: {item.customSnapshot.wrapping.name} — {formatPaise(item.customSnapshot.wrapping.chargePaise)}</li>}
                    {item.customSnapshot.ribbon && <li>Ribbon: {item.customSnapshot.ribbon.name} — {formatPaise(item.customSnapshot.ribbon.chargePaise)}</li>}
                    {item.customSnapshot.extras.map((x) => <li key={x.name}>{x.name} — {formatPaise(x.chargePaise)}</li>)}
                    {item.customSnapshot.greetingMessage && <li className="italic">“{item.customSnapshot.greetingMessage}”</li>}
                  </ul>
                </details>
              )}
              <p className="mt-1 text-xs text-forest-700/60">
                {item.kind === "FLOWER" ? `${item.stems} stems` : item.qty > 1 ? `Qty ${item.qty}` : ""}
                {" · "}{formatPaise(item.unitPricePaise)} each
              </p>
            </div>
            <p className="shrink-0 font-semibold tabular-nums">{formatPaise(item.lineTotalPaise)}</p>
          </div>
        ))}
        <div className="space-y-1 p-4 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span className="tabular-nums">{formatPaise(order.subtotalPaise)}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span className="tabular-nums">{formatPaise(order.deliveryFeePaise)}</span></div>
          <div className="flex justify-between border-t border-cream-200 pt-2 text-base font-bold">
            <span>Total</span><span className="tabular-nums text-forest-700">{formatPaise(order.totalPaise)}</span>
          </div>
        </div>
      </div>

      {/* delivery + timeline events */}
      <div className="grid gap-5 md:grid-cols-2">
        <div className="card p-5 text-sm">
          <h3 className="mb-2 font-semibold">Delivery details</h3>
          <p className="font-medium">{order.recipientName} · {order.phone}</p>
          <p className="text-forest-700/80">{order.addressLine}, {order.city}, {order.state} — {order.pincode}</p>
          <p className="mt-2">📅 {deliveryDayLabel(order.deliveryDate)} ({formatDate(order.deliveryDate)}) · {order.slotLabel}</p>
        </div>
        <div className="card p-5 text-sm">
          <h3 className="mb-2 font-semibold">Order timeline</h3>
          <ul className="space-y-2">
            {order.events.map((ev) => (
              <li key={ev.id} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-forest-500" />
                <span>
                  <span className="font-medium">{ev.status.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}</span>
                  {ev.note && <span className="block text-xs text-forest-700/60">{ev.note}</span>}
                  <span className="block text-[11px] text-forest-700/40">{formatDateTime(ev.createdAt)} · {ev.actorRole.toLowerCase()}</span>
                </span>
              </li>
            ))}
          </ul>
          {order.status === "CANCELLED" && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">
              Cancelled {order.cancelledAt && formatDateTime(order.cancelledAt)}{order.cancelReason ? ` — ${order.cancelReason}` : ""}
            </p>
          )}
        </div>
      </div>

      <IssueBanner issues={[]} />
      <p className="mt-6 text-center text-sm">
        <Link to="/orders" className="font-semibold text-forest-700 hover:underline">← All my orders</Link>
      </p>
    </div>
  );
}

function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay checkout — check your internet connection"));
    document.body.appendChild(s);
  });
}
