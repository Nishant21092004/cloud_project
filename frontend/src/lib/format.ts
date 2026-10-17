/** Formatting helpers — the API speaks integer paise, the UI speaks ₹. */

export function formatPaise(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function deliveryDayLabel(value: string | Date): string {
  const d = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.setHours(0, 0, 0, 0) - today.getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return formatDate(d);
}

export const STATUS_LABELS: Record<string, string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  PREPARING: "Preparing",
  OUT_FOR_DELIVERY: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: "Payment pending",
  PAID: "Paid online",
  FAILED: "Payment failed",
  DEMO_PAID: "Demo payment (no charge)",
  COD_PENDING: "Pay on delivery",
  COD_COLLECTED: "Cash collected",
  REFUND_REQUESTED: "Refund initiated",
  REFUNDED: "Refunded",
  CANCELLED: "Payment cancelled",
};

export function statusTone(status: string): string {
  switch (status) {
    case "DELIVERED": return "bg-forest-100 text-forest-800";
    case "CANCELLED": return "bg-red-100 text-red-700";
    case "OUT_FOR_DELIVERY": return "bg-marigold-400/20 text-marigold-600";
    case "PAID": case "COD_COLLECTED": return "bg-forest-100 text-forest-800";
    case "REFUND_REQUESTED": case "REFUNDED": return "bg-sky-100 text-sky-700";
    case "FAILED": case "CANCELLED_PAYMENT": return "bg-red-100 text-red-700";
    default: return "bg-cream-200 text-forest-700";
  }
}
