import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
      isActive ? "bg-forest-700 text-cream-50" : "text-forest-800 hover:bg-forest-50"
    }`;

  const doLogout = async () => {
    await logout();
    setOpen(false);
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-cream-300/70 bg-cream-100/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src="/images/logo.svg" alt="BloomNest" className="h-9 w-9 rounded-lg" />
          <span className="font-display text-xl font-semibold text-forest-800">BloomNest</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          <NavLink to="/flowers" className={linkCls}>Flowers</NavLink>
          <NavLink to="/bouquets" className={linkCls}>Bouquets</NavLink>
          <NavLink to="/plants" className={linkCls}>Plants</NavLink>
          <NavLink to="/builder" className={linkCls}>Build a Bouquet</NavLink>
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link to="/admin" className="btn-ghost btn-sm">Admin</Link>
              )}
              <Link to="/orders" className="btn-ghost btn-sm">My orders</Link>
              <Link to="/cart" className="btn-primary btn-sm">Cart</Link>
              <button onClick={doLogout} className="btn-ghost btn-sm" title={user.email}>Sign out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-secondary btn-sm">Sign in</Link>
              <Link to="/cart" className="btn-primary btn-sm">Cart</Link>
            </>
          )}
        </div>

        <button className="rounded-lg p-2 text-forest-800 md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-cream-300 bg-cream-100 px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            <NavLink to="/flowers" className={linkCls} onClick={() => setOpen(false)}>Flowers</NavLink>
            <NavLink to="/bouquets" className={linkCls} onClick={() => setOpen(false)}>Bouquets</NavLink>
            <NavLink to="/plants" className={linkCls} onClick={() => setOpen(false)}>Plants</NavLink>
            <NavLink to="/builder" className={linkCls} onClick={() => setOpen(false)}>Build a Bouquet</NavLink>
            {user ? (
              <>
                {user.role === "ADMIN" && <Link to="/admin" className={linkCls({ isActive: false })} onClick={() => setOpen(false)}>Admin dashboard</Link>}
                <Link to="/orders" className={linkCls({ isActive: false })} onClick={() => setOpen(false)}>My orders</Link>
                <Link to="/cart" className={linkCls({ isActive: false })} onClick={() => setOpen(false)}>Cart</Link>
                <button onClick={doLogout} className={`${linkCls({ isActive: false })} text-left`}>Sign out</button>
              </>
            ) : (
              <Link to="/login" className={linkCls({ isActive: false })} onClick={() => setOpen(false)}>Sign in</Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
