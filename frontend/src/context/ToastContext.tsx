import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; kind: "success" | "error" | "info"; message: string };

const ToastContext = createContext<{ toast: (kind: Toast["kind"], message: string) => void } | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((kind: Toast["kind"], message: string) => {
    const id = nextId++;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto max-w-md rounded-full px-4 py-2.5 text-sm font-medium shadow-lift ${
              t.kind === "success" ? "bg-forest-700 text-cream-50"
              : t.kind === "error" ? "bg-red-600 text-white"
              : "bg-forest-800/90 text-cream-100"
            }`}
            role="status"
          >
            {t.kind === "success" ? "🌿 " : t.kind === "error" ? "⚠️ " : "ℹ️ "}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx.toast;
}
