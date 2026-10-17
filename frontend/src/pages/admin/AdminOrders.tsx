/**
 * Admin order desk — filter orders, walk them through the strict
 * Placed → Confirmed → Preparing → Out for Delivery → Delivered
 * timeline, handle COD collection / verified refunds, and cancel.
 */
import { useCallback, useEffect, useState } from "react";
import { api } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { ErrorBox, Spinner } from "../../components/ui";
import { formatDateTime, formatPaise, PAYMENT_STATUS_LABELS, statusTone, STATUS_LABELS } from "../../lib/format";
import type { Order } from "../../api/types";

interface OrderListRow {
  id: string; orderNumber: string; status: string; paymentMethod: string; paymentStatus: string;
  totalPaise: number; recipientName: string; phone: string; pincode: string;
  deliveryDate: string; createdAt: string; itemCount: number;
  user: { name: string; email: string };
}

const STATUS_FILTERS = ["", "PLACED", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const PAYMENT_FILTERS = ["", "PENDING", "PAID", "COD_PENDING", "COD_COLLECTED", "REFUND_REQUESTED", "REFUNDED", "CANCELLED"];

const NEXT: Record<string, string> = {
  PLACED: "CONFIRMED",
  CONFIRMED: "PREPARING",
  PREPARING: "OUT_FOR_DELIVERY",
  OUT_FOR_DELIVERY: "DELIVERED",
};

export function AdminOrders() {
  const toast = useToast();
  const [rows, setRows] = useState<OrderListRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null); // expanded orderNumber

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (q.trim()) params.set("q", q.trim());
    api<{ orders: OrderListRow[] }>(`/api/admin/orders?${params.toString()}`)
      .then((d) => setRows(d.orders)).catch((e) => setError(e.message));
  }, [status, paymentStatus, q]);
  useEffect(load, [load]);

  const advance = async (o: OrderListRow) => {
    const next = NEXT[o.status];
    if (!next) return;
    try {
      await api(`/api/admin/orders/${o.orderNumber}/status`, { method: "PATCH", body: { status: next } });
      toast("success", `${o.orderNumber} → ${STATUS_LABELS[next]}`);
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  const cancel = async (o: OrderListRow) => {
    const reason = window.prompt(`Reason for cancelling ${o.orderNumber}? (shown to the customer)`);
    if (!reason || reason.trim().length < 3) return;
    try {
      await api(`/api/admin/orders/${o.orderNumber}/cancel`, { method: "POST", body: { reason: reason.trim() } });
      toast("success", `${o.orderNumber} cancelled — stock restored exactly once`);
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  const patchPayment = async (o: OrderListRow, paymentStatus: string, note?: string) => {
    try {
      await api(`/api/admin/orders/${o.orderNumber}/payment-status`, { method: "PATCH", body: { paymentStatus, note } });
      toast("success", `${o.orderNumber} payment → ${PAYMENT_STATUS_LABELS[paymentStatus]}`);
      load();
    } catch (e) { toast("error", e instanceof Error ? e.message : "Failed"); }
  };

  if (error) return <ErrorBox message={error} onRetry={load} />;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s ? STATUS_LABELS[s] : "All fulfilment"}</option>)}
        </select>
        <select className="input w-48" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          {PAYMENT_FILTERS.map((s) => <option key={s} value={s}>{s ? PAYMENT_STATUS_LABELS[s] : "All payments"}</option>)}
        </select>
        <input className="input w-56" placeholder="Search order / name / phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {!rows ? <Spinner label="Loading orders…" /> : rows.length === 0 ? (
        <p className="card px-4 py-10 text-center text-sm text-forest-700/70">No orders match these filters.</p>
      ) : (
        <div className="card divide-y divide-cream-200 p-0">
          {rows.map((o) => (
            <div key={o.id}>
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button className="min-w-36 text-left font-mono text-sm font-semibold text-forest-800 hover:underline"
                  onClick={() => setOpen(open === o.orderNumber ? null : o.orderNumber)}>
                  {o.orderNumber}
                </button>
                <div className="min-w-36 flex-1">
                  <p className="text-sm text-forest-900">{o.recipientName} · {o.user.name}</p>
                  <p className="text-xs text-forest-700/70">{o.pincode} · {o.itemCount} item{o.itemCount === 1 ? "" : "s"} · {formatDateTime(o.createdAt)}</p>
                </div>
                <span className={`badge ${statusTone(o.status)}`}>{STATUS_LABELS[o.status] ?? o.status}</span>
                <span className={`badge ${statusTone(o.paymentStatus)}`}>{PAYMENT_STATUS_LABELS[o.paymentStatus] ?? o.paymentStatus}</span>
                <span className="text-xs text-forest-600/70">{o.paymentMethod}</span>
                <p className="font-semibold text-forest-900">{formatPaise(o.totalPaise)}</p>
                {NEXT[o.status] && (
                  <button className="btn-primary btn-sm" onClick={() => advance(o)}>
                    → {STATUS_LABELS[NEXT[o.status]]}
                  </button>
                )}
                {!["DELIVERED", "CANCELLED"].includes(o.status) && (
                  <button className="btn-ghost btn-sm text-red-600" onClick={() => cancel(o)}>Cancel</button>
                )}
              </div>
              {open === o.orderNumber && (
                <OrderDetail number={o.orderNumber} onPaymentAction={(ps, note) => patchPayment(o, ps, note)} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrderDetail({ number, onPaymentAction }: { number: string; onPaymentAction: (paymentStatus: string, note?: string) => void }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<{ order: Order }>(`/api/admin/orders/${number}`).then((d) => setOrder(d.order)).catch((e) => setErr(e.message));
  }, [number]);

  if (err) return <div className="px-4 pb-4"><ErrorBox message={err} /></div>;
  if (!order) return <Spinner label="Loading order…" />;

  const refundable = order.paymentStatus === "REFUND_REQUESTED";

  return (
    <div className="grid gap-4 bg-cream-100/60 px-4 py-4 md:grid-cols-3">
      <div className="md:col-span-2 space-y-3">
        {order.items.map((it) => {
          const snap = it.customSnapshot;
          return (
            <div key={it.id} className="rounded-xl bg-white p-3 text-sm shadow-card">
              <p className="font-medium text-forest-900">{it.qty}× {it.title}</p>
              {it.subtitle && <p className="text-xs text-forest-700/70">{it.subtitle}</p>}
              {snap && "flowers" in snap && (
                <p className="mt-1 text-xs text-forest-700/70">
                  {snap.flowers.map((f) => `${f.stems}× ${f.name}`).join(" + ")}
                  {snap.greetingMessage ? ` · card: “${snap.greetingMessage}”` : ""}
                </p>
              )}
              {snap && "recipe" in snap && (
                <p className="mt-1 text-xs text-forest-700/70">
                  {snap.recipe.map((r) => `${r.stems}× ${r.name}`).join(" + ")}
                </p>
              )}
              <p className="mt-1 font-semibold text-forest-800">{formatPaise(it.lineTotalPaise)}</p>
            </div>
          );
        })}
        <div className="rounded-xl bg-white p-3 text-sm shadow-card">
          <p className="font-medium text-forest-900">Timeline</p>
          <ol className="mt-1 space-y-1 text-xs text-forest-700/80">
            {order.events.map((ev) => (
              <li key={ev.id}>
                {formatDateTime(ev.createdAt)} — <b>{ev.status}</b> by {ev.actorRole}{ev.note ? `: ${ev.note}` : ""}
              </li>
            ))}
          </ol>
          {order.cancelReason && <p className="mt-2 text-xs text-red-600">Cancelled: {order.cancelReason}</p>}
          {order.refundNote && <p className="mt-1 text-xs text-sky-700">{order.refundNote}</p>}
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="rounded-xl bg-white p-3 shadow-card">
          <p className="font-medium text-forest-900">Deliver to</p>
          <p className="text-forest-700/80">{order.recipientName} · {order.phone}</p>
          <p className="text-forest-700/80">{order.addressLine}, {order.city}, {order.state} — {order.pincode}</p>
          <p className="mt-1 text-forest-700/80">📅 {new Date(order.deliveryDate).toLocaleDateString("en-IN")} · {order.slotLabel}</p>
        </div>
        <div className="rounded-xl bg-white p-3 shadow-card">
          <p className="font-medium text-forest-900">Payment</p>
          <p className="text-forest-700/80">Subtotal {formatPaise(order.subtotalPaise)} + delivery {formatPaise(order.deliveryFeePaise)} = <b>{formatPaise(order.totalPaise)}</b></p>
          {order.payments.map((p) => (
            <p key={p.id} className="mt-1 text-xs text-forest-600/80">
              {p.provider} · {p.status} · {formatPaise(p.amountPaise)}{p.rzpPaymentId ? ` · ${p.rzpPaymentId}` : ""}
            </p>
          ))}
          {order.paymentMethod === "COD" && order.paymentStatus === "COD_PENDING" && (
            <button className="btn-secondary btn-sm mt-2" onClick={() => onPaymentAction("COD_COLLECTED")}>
              Mark cash collected
            </button>
          )}
          {refundable && (
            <button className="btn-secondary btn-sm mt-2"
              onClick={() => {
                const note = window.prompt("Paste the Razorpay refund ID / confirmation after verifying in the dashboard:");
                if (note) onPaymentAction("REFUNDED", note);
              }}>
              Mark refunded (after verifying in Razorpay)
            </button>
          )}
          {refundable && (
            <p className="mt-1 text-[11px] text-sky-700">
              REFUNDED is only recorded here after the refund is verified in the Razorpay dashboard — the store never fakes a completed refund.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
