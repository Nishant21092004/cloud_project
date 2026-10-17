/** Live dashboard — every number is queried from real order records, never hardcoded. */
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AdminStats } from "../../api/types";
import { formatPaise, STATUS_LABELS } from "../../lib/format";
import { EmptyState, ErrorBox, Spinner } from "../../components/ui";

export function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminStats>("/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!stats) return <Spinner label="Loading dashboard…" />;

  const cards = [
    { label: "Orders today", value: String(stats.ordersToday) },
    { label: "Total orders", value: String(stats.totalOrders) },
    { label: "Delivered", value: String(stats.deliveredCount) },
    { label: "Payment pending", value: String(stats.pendingPayments) },
    { label: "Revenue collected", value: formatPaise(stats.revenueCollectedPaise) },
  ];

  const statusRows = Object.entries(stats.ordersByStatus).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-forest-600/70">{c.label}</p>
            <p className="mt-1 font-display text-2xl text-forest-900">{c.value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-display text-lg text-forest-900">Orders by status</h2>
          {statusRows.length === 0 ? (
            <p className="mt-2 text-sm text-forest-700/70">No orders yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {statusRows.map(([status, count]) => (
                <li key={status} className="flex items-center justify-between text-sm">
                  <span className="text-forest-800">{STATUS_LABELS[status] ?? status}</span>
                  <span className="rounded-full bg-cream-200 px-2.5 py-0.5 font-medium text-forest-800">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="font-display text-lg text-forest-900">Low stock</h2>
          <p className="text-xs text-forest-700/70">Restock before these run out during checkout.</p>
          {stats.lowStock.flowers.length === 0 && stats.lowStock.plantVariants.length === 0 ? (
            <EmptyState title="All stocked up" hint="Nothing is below its low-stock threshold right now." />
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {stats.lowStock.flowers.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <span className="text-forest-800">{f.name}</span>
                  <span className="badge bg-red-100 text-red-700">
                    {f.stock} / {f.threshold} {f.unit}
                  </span>
                </li>
              ))}
              {stats.lowStock.plantVariants.map((v) => (
                <li key={v.id} className="flex items-center justify-between">
                  <span className="text-forest-800">{v.name}</span>
                  <span className="badge bg-red-100 text-red-700">
                    {v.stock} / {v.threshold} {v.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
