import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await register({ name: form.name, email: form.email, password: form.password, phone: form.phone || undefined });
      toast("success", "Account created — happy blooming!");
      navigate(from);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8">
        <h1 className="text-2xl text-forest-800">Create your account</h1>
        <p className="mt-1 text-sm text-forest-700/70">Accounts are customer accounts — store admins are provisioned separately.</p>
        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="name">Full name</label>
            <input id="name" className="input" required minLength={2} value={form.name} onChange={set("name")} placeholder="Asha Verma" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={form.email} onChange={set("email")} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Mobile (optional)</label>
            <input id="phone" className="input" inputMode="numeric" pattern="[6-9]\d{9}" title="10-digit Indian mobile number" value={form.phone} onChange={set("phone")} placeholder="98XXXXXXXX" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password (min 8 characters)</label>
            <input id="password" className="input" type="password" required minLength={8} value={form.password} onChange={set("password")} placeholder="••••••••" />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create account"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-forest-700/70">
          Already have one? <Link to="/login" state={{ from }} className="font-semibold text-forest-700 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
