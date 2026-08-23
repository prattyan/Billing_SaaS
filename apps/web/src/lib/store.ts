import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'SUPER_ADMIN' | 'OWNER' | 'BILLER';
  tenantId: string | null;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  planTier: string;
  subscriptionStatus: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tenant: Tenant | null, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      setAuth: (user, tenant, accessToken, refreshToken) => {
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        set({ user, tenant, accessToken, refreshToken, isAuthenticated: true });
      },

      clearAuth: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, tenant: null, accessToken: null, refreshToken: null, isAuthenticated: false });
      },
    }),
    {
      name: 'billing-saas-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);

// ── Cart store (POS) ─────────────────────────────────────────────────────────

interface CartItem {
  itemId: string;
  name: string;
  barcode?: string;
  qty: number;
  mrp: number;
  priceAtSale: number;
  taxPercent: number;
  unit: string;
  stock?: number;
}

interface CartState {
  items: CartItem[];
  discount: number;
  paymentMode: string;
  customerPhone: string;
  customerName: string;
  addItem: (item: CartItem) => void;
  updateQty: (itemId: string, qty: number) => void;
  removeItem: (itemId: string) => void;
  setDiscount: (discount: number) => void;
  setPaymentMode: (mode: string) => void;
  setCustomer: (phone: string, name?: string) => void;
  clearCart: () => void;
  getSubtotal: () => number;
  getTaxTotal: () => number;
  getGrandTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  discount: 0,
  paymentMode: 'CASH',
  customerPhone: '',
  customerName: '',

  addItem: (newItem) =>
    set((state) => {
      const existing = state.items.find((i) => i.itemId === newItem.itemId);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.itemId === newItem.itemId ? { ...i, qty: i.qty + 1 } : i,
          ),
        };
      }
      return { items: [...state.items, newItem] };
    }),

  updateQty: (itemId, qty) =>
    set((state) => ({
      items:
        qty <= 0
          ? state.items.filter((i) => i.itemId !== itemId)
          : state.items.map((i) => (i.itemId === itemId ? { ...i, qty } : i)),
    })),

  removeItem: (itemId) =>
    set((state) => ({ items: state.items.filter((i) => i.itemId !== itemId) })),

  setDiscount: (discount) => set({ discount }),
  setPaymentMode: (paymentMode) => set({ paymentMode }),
  setCustomer: (phone, name) => set({ customerPhone: phone, customerName: name ?? '' }),
  clearCart: () =>
    set({ items: [], discount: 0, paymentMode: 'CASH', customerPhone: '', customerName: '' }),

  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, i) => {
      const taxRate = i.taxPercent / 100;
      return sum + i.priceAtSale * i.qty;
    }, 0);
  },

  getTaxTotal: () => {
    const { items } = get();
    return items.reduce((sum, i) => {
      const taxRate = i.taxPercent / 100;
      return sum + i.priceAtSale * i.qty * taxRate;
    }, 0);
  },

  getGrandTotal: () => {
    const { getSubtotal, getTaxTotal, discount } = get();
    return Math.max(0, getSubtotal() + getTaxTotal() - discount);
  },
}));
