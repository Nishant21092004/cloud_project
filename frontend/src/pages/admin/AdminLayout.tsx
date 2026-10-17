import { NavLink, Outlet } from "react-router-dom";

const TABS = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/products", label: "Products" },
  { to: "/admin/settings", label: "Delivery settings" },
];

export function AdminLayout() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-forest-600">BloomNest staff</p>
        <h1 className="font-display text-3xl text-forest-900">Admin dashboard</h1>
        <p className="mt-1 text-sm text-forest-700/70">
          Manage catalogue, inventory and orders. Every action here is re-validated on the server.
        </p>
      </header>
      <nav className="mb-6 flex flex-wrap gap-2 border-b border-forest-100 pb-3">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-medium transition ${
                isActive ? "bg-forest-700 text-cream-50 shadow-card" : "bg-forest-50 text-forest-800 hover:bg-forest-100"
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  );
}
