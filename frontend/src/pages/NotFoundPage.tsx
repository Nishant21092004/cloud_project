import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      <p className="text-5xl">🥀</p>
      <h1 className="mt-4 text-3xl text-forest-800">This stem has snapped</h1>
      <p className="mt-2 text-forest-700/70">The page you were looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-6">Back to the shop</Link>
    </div>
  );
}
