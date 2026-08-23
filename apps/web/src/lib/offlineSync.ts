/**
 * Offline-First Storage & Background Sync Engine
 * Manages local IndexedDB / LocalStorage queue for bills, items, and customers when offline.
 */

export interface OfflineBill {
  id: string;
  timestamp: number;
  payload: any;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

const OFFLINE_BILLS_KEY = 'bs_offline_bills_queue';
const LOCAL_CATALOG_KEY = 'bs_local_catalog_cache';
const LOCAL_CUSTOMERS_KEY = 'bs_local_customers_cache';

/**
 * Save a bill to local storage when device is offline
 */
export function saveOfflineBill(payload: any): OfflineBill {
  const existing = getOfflineBills();
  const newBill: OfflineBill = {
    id: `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    payload,
    status: 'PENDING',
  };

  const updated = [newBill, ...existing];
  if (typeof window !== 'undefined') {
    localStorage.setItem(OFFLINE_BILLS_KEY, JSON.stringify(updated));
  }
  return newBill;
}

/**
 * Get all stored offline bills
 */
export function getOfflineBills(): OfflineBill[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_BILLS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a specific offline bill after successful sync
 */
export function removeOfflineBill(id: string) {
  if (typeof window === 'undefined') return;
  const existing = getOfflineBills();
  const updated = existing.filter((b) => b.id !== id);
  localStorage.setItem(OFFLINE_BILLS_KEY, JSON.stringify(updated));
}

/**
 * Clear all offline bills
 */
export function clearOfflineBills() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(OFFLINE_BILLS_KEY);
}

/**
 * Cache catalog items locally for offline search and billing
 */
export function cacheCatalogLocally(items: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CATALOG_KEY, JSON.stringify({
      timestamp: Date.now(),
      items,
    }));
  } catch {}
}

/**
 * Retrieve cached catalog items when offline
 */
export function getLocalCatalog(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CATALOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.items || [];
  } catch {
    return [];
  }
}

/**
 * Cache customer directory locally for offline lookup
 */
export function cacheCustomersLocally(customers: any[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_CUSTOMERS_KEY, JSON.stringify(customers));
  } catch {}
}

/**
 * Get cached customers when offline
 */
export function getLocalCustomers(): any[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOMERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
