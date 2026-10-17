import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Order } from "../api/types";
import { formatPaise, formatDateTime, PAYMENT_STATUS_LABELS, STATUS_LABELS, statusTone } from "../lib/format";
import { EmptyState, ErrorBox, PageTitle, Spinner } from "../components/ui";

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ orders: Order[] }>("/api/orders")
      .then((d) => setOrders(d.orders))
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <div className="mx-auto max-w-3xl px-4 py-10"><ErrorBox message={error} /></div>;
  if (!orders) return <Spinner label="Loading your orders…" />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <PageTitle title="My orders" subtitle="Every order keeps its original prices — even if the catalogue changes later." />
      {orders.length === 0 ? (
        <EmptyState title="No orders yet" hint="Your first bouquet is waiting to be built." action={{ to: "/bouquets", label: "Shop bouquets" }} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.orderNumber}`} className="card block p-4 transition hover:shadow-lift">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-forest-900">{o.orderNumber}</p>
                    <p className="text-xs text-forest-700/60">
                      {formatDateTime(o.createdAt)} · {o.itemCount ?? "—"} item(s) · deliver {o.slotLabel.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${statusTone(o.status)}`}>{STATUS_LABELS[o.status]}</span>
                    <span className={`badge ${statusTone(o.paymentStatus)}`}>{PAYMENT_STATUS_LABELS[o.paymentStatus]}</span>
                    <span className="font-semibold tabular-nums">{formatPaise(o.totalPaise)}</span>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
