/** API response types — mirror backend/src/modules (kept in sync manually). */

export interface User {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  phone?: string | null;
}

export interface Flower {
  id: string; slug: string; name: string; description: string; colorHex: string; imageUrl: string;
  pricePerStemPaise: number; stockStems: number; lowStockThreshold: number; active: boolean;
  inStock: boolean; unitLabel: string;
}

export interface CompositionLine { flowerId: string; name: string; colorHex: string; stems: number }

export interface Bouquet {
  id: string; slug: string; name: string; description: string; imageUrl: string;
  pricePaise: number; inStock: boolean; availableQty: number; composition: CompositionLine[];
}

export interface PlantVariant {
  id: string; label: string; potType: string; size: string; pricePaise: number; stock: number; inStock: boolean;
}

export interface Plant {
  id: string; slug: string; name: string; description: string; imageUrl: string;
  careWatering: string; careLight: string; careNotes: string | null;
  priceFromPaise: number | null; totalStock: number; inStock: boolean; variants: PlantVariant[];
}

export type Product =
  | ({ type: "flower" } & Flower)
  | ({ type: "bouquet" } & Bouquet)
  | ({ type: "plant" } & Plant);

export interface Option { id: string; name: string; chargePaise: number }
export interface ExtraOption extends Option { kind: "ADDON" | "CARD" }
export interface BuilderOptions { wrappings: Option[]; ribbons: Option[]; extras: ExtraOption[] }

export interface PriceLine { label: string; detail?: string; unitPaise: number; qty: number; totalPaise: number; colorHex?: string }
export interface Pricing {
  ok: boolean;
  lines: PriceLine[];
  subtotalPaise: number;
  totalStems: number;
  errors?: Array<{ code: string; message: string }>;
}

export interface CustomSnapshot {
  flowers: Array<{ flowerId: string; name: string; colorHex: string; pricePerStemPaise: number; stems: number }>;
  wrapping: { name: string; chargePaise: number } | null;
  ribbon: { name: string; chargePaise: number } | null;
  extras: Array<{ name: string; chargePaise: number }>;
  greetingMessage: string | null;
  subtotalPaise: number;
}

export type CartItemKind = "FLOWER" | "BOUQUET" | "PLANT" | "CUSTOM";

export interface CartLine {
  itemId: string; kind: CartItemKind; title: string; subtitle: string | null;
  image: string | null; colorHex: string | null;
  qty: number; unitPaise: number; lineTotalPaise: number;
  flowerId: string | null; plantVariantId: string | null; bouquetId: string | null; customBouquetId: string | null;
  config: CustomSnapshot | null; maxQty: number; issues: string[];
}

export interface Cart {
  cartId: string; lines: CartLine[]; subtotalPaise: number; hasIssues: boolean;
  fingerprint: string; itemCount: number;
}

export interface Quote {
  fingerprint: string; subtotalPaise: number; deliveryFeePaise: number; totalPaise: number;
  itemCount: number;
  lines: Array<{ title: string; subtitle: string | null; qty: number; lineTotalPaise: number; issues: string[] }>;
}

export type OrderStatus = "PLACED" | "CONFIRMED" | "PREPARING" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "DEMO_PAID" | "FAILED" | "COD_PENDING" | "COD_COLLECTED" | "REFUND_REQUESTED" | "REFUNDED" | "CANCELLED";

export interface OrderItem {
  id: string; kind: CartItemKind; title: string; subtitle: string | null;
  qty: number; stems: number | null; unitPricePaise: number; lineTotalPaise: number;
  customSnapshot: CustomSnapshot | { recipe: CompositionLine[] } | null;
}

export interface OrderEvent { id: string; status: string; note: string | null; actorRole: string; createdAt: string }

export interface PaymentRow {
  id: string; provider: string; rzpOrderId: string | null; rzpPaymentId: string | null;
  amountPaise: number; status: string; method: string | null; createdAt: string;
}

export interface Order {
  id: string; orderNumber: string; status: OrderStatus; paymentMethod: "COD" | "RAZORPAY" | "DEMO_ONLINE";
  paymentStatus: PaymentStatus; subtotalPaise: number; deliveryFeePaise: number; totalPaise: number;
  recipientName: string; phone: string; pincode: string; addressLine: string; city: string; state: string;
  deliveryDate: string; slotLabel: string; expiresAt: string | null; cancelledAt: string | null;
  cancelReason: string | null; refundNote: string | null; createdAt: string;
  items: OrderItem[]; events: OrderEvent[]; payments: PaymentRow[];
  itemCount?: number; user?: { name: string; email: string };
}

export interface Address {
  id: string; recipientName: string; phone: string; pincode: string;
  line1: string; line2: string | null; city: string; state: string; isDefault: boolean;
}

export interface Slot { id: string; label: string }

export interface CheckoutQuotePayload {
  quote: Quote;
}

export interface Serviceability { pincode: string; serviceable: boolean; deliveryFeePaise: number | null; city: string | null; demoCoverage?: boolean }

export interface AdminStats {
  ordersToday: number; totalOrders: number; deliveredCount: number; pendingPayments: number;
  revenueCollectedPaise: number;
  ordersByStatus: Record<string, number>;
  lowStock: {
    flowers: Array<{ id: string; name: string; stock: number; threshold: number; unit: string }>;
    plantVariants: Array<{ id: string; name: string; stock: number; threshold: number; unit: string }>;
  };
}

export interface AdminFlower extends Flower { }
export interface AdminBouquet extends Bouquet { active: boolean; recipe?: CompositionLine[] }
export interface AdminPlant extends Plant { active: boolean }

export interface PaymentConfig { enabled: boolean; keyId: string | null }
