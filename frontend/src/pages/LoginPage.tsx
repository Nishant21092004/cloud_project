import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      toast("success", `Welcome back, ${user.name.split(" ")[0]}!`);
      navigate(user.role === "ADMIN" && from === "/" ? "/admin" : from);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="card p-8">
        <h1 className="text-2xl text-forest-800">Welcome back</h1>
        <p className="mt-1 text-sm text-forest-700/70">Your cart, addresses and orders live in your account.</p>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>

        <p className="mt-5 text-center text-sm text-forest-700/70">
          New here? <Link to="/register" state={{ from }} className="font-semibold text-forest-700 hover:underline">Create an account</Link>
        </p>
        <div className="mt-6 rounded-xl bg-cream-200/60 px-4 py-3 text-xs leading-relaxed text-forest-700/70">
          <p className="font-semibold text-forest-700">Demonstration logins</p>
          <p>Customer — demo@bloomnest.test / Demo@1234</p>
          <p>Admin — admin@bloomnest.test / Admin@1234</p>
        </div>
      </div>
    </div>
  );
}
