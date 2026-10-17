-- Demo-only payment state, deliberately distinct from verified real payments.
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'DEMO_ONLINE';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'DEMO_PAID';
