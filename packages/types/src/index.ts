// ─────────────────────────────────────────────
// Shared TypeScript types across web + api
// ─────────────────────────────────────────────

export type Role = 'SUPER_ADMIN' | 'OWNER' | 'BILLER';

export type PlanTier = 'STARTER' | 'GROWTH' | 'BUSINESS' | 'ENTERPRISE';

export type SubscriptionStatus = 'ACTIVE' | 'GRACE' | 'EXPIRED' | 'CANCELLED';

export type PaymentMode = 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'SPLIT';

export type BillStatus = 'PAID' | 'RETURNED' | 'CANCELLED' | 'HELD';

export type StockTransactionType = 'RESTOCK' | 'SALE' | 'RETURN' | 'ADJUSTMENT';

export type NotificationChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';

// ─────────────────────────────────────────────
// Plan tier config
// ─────────────────────────────────────────────

export const PLAN_LIMITS: Record<PlanTier, number> = {
  STARTER: 10,
  GROWTH: 100,
  BUSINESS: 500,
  ENTERPRISE: 2000,
};

export const PLAN_PRICES: Record<Exclude<PlanTier, 'STARTER'>, number> = {
  GROWTH: 10000,
  BUSINESS: 20000,
  ENTERPRISE: 30000,
};

export const GRACE_PERIOD_DAYS = 7;

// ─────────────────────────────────────────────
// API response types
// ─────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ─────────────────────────────────────────────
// Auth types
// ─────────────────────────────────────────────

export interface JwtPayload {
  sub: string;         // user id
  email: string;
  role: Role;
  tenantId: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  shopName: string;
  ownerName: string;
  email: string;
  phone: string;
  password: string;
}

// ─────────────────────────────────────────────
// Cart / POS types (used in both frontend and backend)
// ─────────────────────────────────────────────

export interface CartItem {
  itemId: string;
  name: string;
  barcode?: string;
  qty: number;
  mrp: number;
  priceAtSale: number;
  taxPercent: number;
  taxAmount: number;
  lineTotal: number;
  unit: string;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  discount: number;
  taxTotal: number;
  grandTotal: number;
  paymentMode: PaymentMode;
  paymentDetails?: Record<string, number>;
}

// ─────────────────────────────────────────────
// Subscription plan upgrade suggestion
// ─────────────────────────────────────────────

export interface PlanUsage {
  currentTier: PlanTier;
  currentSkuCount: number;
  tierLimit: number;
  usagePercent: number;
  suggestedUpgrade?: PlanTier;
  isOverLimit: boolean;
  gracePeriodEndsAt?: string;
}
