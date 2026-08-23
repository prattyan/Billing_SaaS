'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi, billingApi, customersApi, categoriesApi, tenantsApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import {
  Scan, Search, X, Plus, Minus, Trash2, ShoppingCart, ShoppingBag,
  Phone, User, Loader2, CheckCircle2, PauseCircle, PlayCircle,
  ChevronDown, Receipt, IndianRupee, Tag, Camera, Printer, Share2, FileText, ExternalLink,
  Sparkles, Layers, ArrowRight, QrCode,
} from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import ThermalPrinterBillModal from '@/components/ThermalPrinterBillModal';
import UpiQrPaymentModal from '@/components/UpiQrPaymentModal';
import HeldBillsSectionModal from '@/components/HeldBillsSectionModal';
import { saveOfflineBill, cacheCatalogLocally, getLocalCatalog } from '@/lib/offlineSync';

const PAYMENT_MODES = [
  { id: 'CASH', label: 'Cash', emoji: '💵', disabled: false },
  { id: 'UPI', label: 'UPI QR', emoji: '📱', disabled: false },
  { id: 'CARD', label: 'Card', emoji: '💳', disabled: true, badge: 'Soon' },
];

function playThermalPrintSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    for (let i = 0; i < 8; i++) {
      const startTime = ctx.currentTime + i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160 + (i % 2) * 40, startTime);
      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.07);
    }

    const cutterTime = ctx.currentTime + 0.95;
    const cutterOsc = ctx.createOscillator();
    const cutterGain = ctx.createGain();
    cutterOsc.type = 'square';
    cutterOsc.frequency.setValueAtTime(750, cutterTime);
    cutterGain.gain.setValueAtTime(0.25, cutterTime);
    cutterGain.gain.exponentialRampToValueAtTime(0.01, cutterTime + 0.05);
    cutterOsc.connect(cutterGain);
    cutterGain.connect(ctx.destination);
    cutterOsc.start(cutterTime);
    cutterOsc.stop(cutterTime + 0.05);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([40, 30, 40, 30, 80]);
    }
  } catch {}
}

export default function POSPage() {
  const qc = useQueryClient();
  const {
    items: cartItems, addItem, updateQty, removeItem,
    setDiscount, setPaymentMode, setCustomer, clearCart,
    discount, paymentMode, customerPhone, customerName,
    getSubtotal, getTaxTotal, getGrandTotal,
  } = useCartStore();

  const { user } = useAuthStore();

  // Search / barcode state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [mobileCartSheetOpen, setMobileCartSheetOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBuffer = useRef('');
  const barcodeTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  // Customer state
  const [customerPhoneInput, setCustomerPhoneInput] = useState('');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [customerSuggestion, setCustomerSuggestion] = useState<any>(null);
  const [isLookingUpCustomer, setIsLookingUpCustomer] = useState(false);

  // Bill state
  const [isBillPending, setIsBillPending] = useState(false);
  const [lastBill, setLastBill] = useState<any>(null);
  const [discountInput, setDiscountInput] = useState('');
  const [pointsToRedeemInput, setPointsToRedeemInput] = useState('');

  // Catalog items for quick grid selling (with local offline caching)
  const { data: catalogData } = useQuery({
    queryKey: ['posCatalog'],
    queryFn: () => itemsApi.list({ page: 1, limit: 100 }).then((r) => r.data),
  });

  useEffect(() => {
    if (catalogData?.items) {
      cacheCatalogLocally(catalogData.items);
    }
  }, [catalogData]);

  const { data: categories } = useQuery({
    queryKey: ['posCategories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  // Modal states
  const [showUpiQrModal, setShowUpiQrModal] = useState(false);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Shop settings for UPI ID & shop name
  const { data: shopSettings } = useQuery({
    queryKey: ['shopSettings'],
    queryFn: () => tenantsApi.getSettings().then((r) => r.data),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => tenantsApi.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shopSettings'] });
      toast.success('Shop settings updated');
    },
  });

  // Held bills query
  const { data: heldBills = [] } = useQuery({
    queryKey: ['heldBills'],
    queryFn: () => billingApi.getHeld().then((r) => r.data),
  });

  // ── USB Barcode Scanner (HID → rapid keystrokes + Enter) ───────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && active !== searchInputRef.current &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      if (e.key === 'Enter' && barcodeBuffer.current.length >= 4) {
        handleBarcodeScanned(barcodeBuffer.current);
        barcodeBuffer.current = '';
        clearTimeout(barcodeTimer.current);
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeScanned = async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    try {
      let item: any = null;
      try {
        const res = await itemsApi.lookupBarcode(cleanBarcode);
        item = res.data;
      } catch {
        const searchRes = await itemsApi.list({ search: cleanBarcode, limit: 5 });
        const found = searchRes.data?.items?.find((i: any) =>
          i.barcode?.toLowerCase() === cleanBarcode.toLowerCase() ||
          i.name?.toLowerCase().includes(cleanBarcode.toLowerCase())
        );
        if (found) item = found;
      }

      if (item) {
        addItemToCart(item);
        toast.success(`Added ${item.name}`, { id: 'barcode-scan' });
        setSearchQuery('');
        setShowResults(false);
      } else {
        toast.error(`No item found for barcode: ${cleanBarcode}`);
      }
    } catch {
      toast.error('Barcode lookup failed');
    }
  };

  // ── Debounced text search ──────────────────────────────────────────────────
  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    clearTimeout(searchTimeout.current);
    if (!val.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const res = await itemsApi.list({ search: val.trim(), limit: 8 });
        setSearchResults(res.data.items ?? []);
        setShowResults(true);
      } catch {}
      setIsSearching(false);
    }, 200);
  };

  // ── Customer phone auto-lookup ─────────────────────────────────────────────
  const customerLookupTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  useEffect(() => {
    const phone = customerPhoneInput.trim();
    if (phone.length < 10) {
      setCustomerSuggestion(null);
      return;
    }
    clearTimeout(customerLookupTimeout.current);
    setIsLookingUpCustomer(true);
    customerLookupTimeout.current = setTimeout(async () => {
      try {
        const res = await customersApi.getByPhone(phone);
        if (res.data) {
          setCustomerSuggestion(res.data);
          if (res.data.name && res.data.name !== 'Walk-in Customer' && !customerNameInput) {
            setCustomerNameInput(res.data.name);
            setCustomer(phone, res.data.name);
          }
        }
      } catch {
        setCustomerSuggestion(null);
      }
      setIsLookingUpCustomer(false);
    }, 300);
  }, [customerPhoneInput]);

  const addItemToCart = (item: any) => {
    addItem({
      itemId: item.id,
      name: item.name,
      barcode: item.barcode,
      unit: item.unit,
      mrp: Number(item.mrp),
      priceAtSale: Number(item.offerPrice ?? item.mrp),
      taxPercent: Number(item.taxPercent),
      qty: 1,
      stock: Number(item.currentStock),
    });
  };

  // ── Finalize bill mutation ─────────────────────────────────────────────────
  const finalizeBillMutation = useMutation({
    mutationFn: async () => {
      const subtotal = getSubtotal();
      const taxTotal = getTaxTotal();
      const rawTotal = subtotal + taxTotal;
      const manualDiscount = Number(discountInput) || 0;
      const availablePoints = Math.floor(Number(customerSuggestion?.loyaltyPoints || 0));
      const pointsToRedeem = Math.min(Number(pointsToRedeemInput) || 0, availablePoints, Math.max(0, rawTotal - manualDiscount));

      const payload = {
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          qty: item.qty,
        })),
        paymentMode: paymentMode as any,
        discount: manualDiscount,
        pointsToRedeem: pointsToRedeem > 0 ? pointsToRedeem : undefined,
        customerPhone: customerPhoneInput || undefined,
        customerName: customerNameInput || undefined,
      };

      // Check offline status
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return { isOffline: true, payload };
      }

      try {
        const res = await billingApi.create(payload);
        return { isOffline: false, data: res.data };
      } catch (err: any) {
        if (!err.response) {
          // Network connection failed
          return { isOffline: true, payload };
        }
        throw err;
      }
    },
    onSuccess: (res: any) => {
      if (res.isOffline) {
        saveOfflineBill(res.payload);
        clearCart();
        setCustomerPhoneInput('');
        setCustomerNameInput('');
        setCustomerSuggestion(null);
        setDiscountInput('');
        setPointsToRedeemInput('');
        setMobileCartSheetOpen(false);
        toast.success('⚡ Device Offline: Bill saved locally! Will auto-sync when online.', { duration: 6000 });
        return;
      }

      const bill = res.data;
      setLastBill(bill);
      clearCart();
      setCustomerPhoneInput('');
      setCustomerNameInput('');
      setCustomerSuggestion(null);
      setDiscountInput('');
      setPointsToRedeemInput('');
      setMobileCartSheetOpen(false);
      qc.invalidateQueries({ queryKey: ['heldBills'] });
      qc.invalidateQueries({ queryKey: ['posCatalog'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      toast.success(`Bill #${bill.billNumber} created successfully!`, { duration: 4000 });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Failed to finalize bill';
      toast.error(msg);
    },
  });

  // ── Hold bill mutation ─────────────────────────────────────────────────────
  const holdBillMutation = useMutation({
    mutationFn: async () => {
      return billingApi.hold({
        items: cartItems.map((item) => ({
          itemId: item.itemId,
          name: item.name,
          unit: item.unit,
          mrp: item.mrp,
          priceAtSale: item.priceAtSale,
          taxPercent: item.taxPercent,
          qty: item.qty,
        })),
        customerPhone: customerPhoneInput || undefined,
        customerName: customerNameInput || undefined,
      });
    },
    onSuccess: () => {
      clearCart();
      setCustomerPhoneInput('');
      setCustomerNameInput('');
      setCustomerSuggestion(null);
      setDiscountInput('');
      setPointsToRedeemInput('');
      setMobileCartSheetOpen(false);
      qc.invalidateQueries({ queryKey: ['heldBills'] });
      toast.success('Bill put on hold');
    },
    onError: () => toast.error('Failed to hold bill'),
  });

  // ── Resume held bill ───────────────────────────────────────────────────────
  const resumeHeldMutation = useMutation({
    mutationFn: (holdId: string) => billingApi.resumeHeld(holdId),
    onSuccess: (res) => {
      const held = res.data;
      clearCart();
      for (const item of held.items) {
        addItem({
          itemId: item.itemId,
          name: item.name,
          unit: item.unit,
          mrp: item.mrp,
          priceAtSale: item.priceAtSale,
          taxPercent: item.taxPercent,
          qty: item.qty,
          stock: 999,
        });
      }
      if (held.customerPhone) {
        setCustomerPhoneInput(held.customerPhone);
        setCustomerNameInput(held.customerName || '');
        setCustomer(held.customerPhone, held.customerName || '');
      }
        qc.invalidateQueries({ queryKey: ['heldBills'] });
      toast.success('Held bill restored');
    },
  });

  // ── Filter catalog items (falls back to local cache when offline) ──────────
  const catalogItems = (catalogData?.items && catalogData.items.length > 0)
    ? catalogData.items
    : getLocalCatalog();

  const filteredCatalog = catalogItems.filter((item: any) => {
    const matchesCategory = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.barcode && item.barcode.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  // Calculate totals
  const subtotal = getSubtotal();
  const taxTotal = getTaxTotal();
  const rawTotal = subtotal + taxTotal;
  const manualDiscount = Number(discountInput) || 0;
  const availablePoints = Math.floor(Number(customerSuggestion?.loyaltyPoints || 0));
  const pointsRedeemed = Math.min(Number(pointsToRedeemInput) || 0, availablePoints, Math.max(0, rawTotal - manualDiscount));
  const totalDiscount = manualDiscount + pointsRedeemed;
  const grandTotal = Math.max(0, rawTotal - totalDiscount);
  const totalCartCount = cartItems.reduce((sum, item) => sum + item.qty, 0);



  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 58px)', position: 'relative' }}>
      {/* ── LEFT PANEL / MAIN POS VIEW (Catalog + Cart) ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top Sticky Bar: Search + Camera Scan */}
        <div style={{
          padding: '12px 16px',
          background: 'rgba(14, 14, 18, 0.95)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{
                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'rgb(113,113,122)', pointerEvents: 'none',
              }} />
              <input
                ref={searchInputRef}
                type="text"
                className="input"
                placeholder="Search item or scan barcode…"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                style={{ paddingLeft: 40, height: 44, fontSize: '0.9rem', borderRadius: 12 }}
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowResults(false); }}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Quick Camera Barcode Scanner */}
            <button
              className="btn-primary"
              style={{
                height: 44,
                padding: '0 16px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
                background: 'linear-gradient(135deg, rgb(139,92,246), rgb(52,211,153))',
                boxShadow: '0 4px 14px rgba(139,92,246,0.35)',
              }}
              onClick={() => setShowCameraScanner(true)}
              title="Open mobile camera barcode scanner"
            >
              <Camera size={18} />
              <span className="hide-mobile">Scan Barcode</span>
            </button>

            {/* Desktop Parked Orders / Held Bills Button */}
            <button
              className="btn-secondary"
              style={{
                height: 44,
                padding: '0 14px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: (heldBills?.length || 0) > 0 ? 'rgba(251, 191, 36, 0.12)' : undefined,
                border: (heldBills?.length || 0) > 0 ? '1px solid rgba(251, 191, 36, 0.4)' : undefined,
                color: (heldBills?.length || 0) > 0 ? 'rgb(251, 191, 36)' : undefined,
                fontWeight: 700,
              }}
              onClick={() => setShowHeldModal(true)}
              title="View parked orders & held bills"
            >
              <PauseCircle size={18} />
              <span className="hide-mobile">Held Orders</span>
              {(heldBills?.length || 0) > 0 && (
                <span style={{
                  background: 'rgb(251, 191, 36)',
                  color: '#000000',
                  borderRadius: 999,
                  padding: '1px 7px',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                }}>
                  {heldBills.length}
                </span>
              )}
            </button>

            {/* Hold Current Cart Button */}
            {cartItems.length > 0 && (
              <button
                className="btn-secondary hide-mobile"
                style={{ height: 44, padding: '0 12px', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => holdBillMutation.mutate()}
                disabled={holdBillMutation.isPending}
                title="Hold current bill"
              >
                <PauseCircle size={16} />
                <span>Park Cart</span>
              </button>
            )}
          </div>

          {/* Category Filter Carousel */}
          <div className="mobile-pill-bar" style={{ marginTop: 10 }}>
            <button
              onClick={() => setSelectedCategory('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                background: selectedCategory === 'ALL' ? 'rgb(139,92,246)' : 'rgb(var(--surface-2))',
                color: selectedCategory === 'ALL' ? 'white' : 'rgb(161,161,170)',
                border: `1px solid ${selectedCategory === 'ALL' ? 'rgb(139,92,246)' : 'rgba(255,255,255,0.06)'}`,
                transition: 'all 0.15s',
              }}
            >
              ✨ All Items ({catalogItems.length})
            </button>
            {categories?.map((cat: any) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 999,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  background: selectedCategory === cat.id ? 'rgb(139,92,246)' : 'rgb(var(--surface-2))',
                  color: selectedCategory === cat.id ? 'white' : 'rgb(161,161,170)',
                  border: `1px solid ${selectedCategory === cat.id ? 'rgb(139,92,246)' : 'rgba(255,255,255,0.06)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search Dropdown (if user searches) */}
          {showResults && searchResults.length > 0 && (
            <div className="glass-card" style={{
              position: 'absolute', top: '100%', left: 16, right: 16, zIndex: 120,
              maxHeight: 340, overflowY: 'auto', padding: 8, marginTop: 4,
              boxShadow: '0 10px 30px rgba(0,0,0,0.7)',
            }}>
              {searchResults.map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.02)',
                    marginBottom: 4,
                  }}
                  onClick={() => {
                    addItemToCart(item);
                    setShowResults(false);
                    setSearchQuery('');
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(139,92,246,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem',
                  }}>🛍️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)' }}>
                      {item.barcode} · Stock: {Number(item.currentStock).toFixed(0)} {item.unit}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'rgb(52,211,153)' }}>
                      ₹{Number(item.offerPrice ?? item.mrp).toFixed(2)}
                    </div>
                    {item.offerPrice && Number(item.offerPrice) < Number(item.mrp) && (
                      <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)', textDecoration: 'line-through' }}>
                        ₹{Number(item.mrp).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Catalog Item Grid (1-Tap Sell on Mobile & Desktop) ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 90px 16px' }}>
          {filteredCatalog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgb(113,113,122)' }}>
              <ShoppingBag size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p style={{ fontWeight: 600 }}>No items in this category</p>
              <p style={{ fontSize: '0.8rem' }}>Scan a barcode or add products in Inventory</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: 12,
            }}>
              {filteredCatalog.map((item: any) => {
                const inCart = cartItems.find((ci) => ci.itemId === item.id);
                const isOut = Number(item.currentStock) <= 0;

                return (
                  <div
                    key={item.id}
                    className="mobile-card"
                    style={{
                      cursor: isOut ? 'not-allowed' : 'pointer',
                      opacity: isOut ? 0.5 : 1,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      border: inCart ? '1px solid rgb(139,92,246)' : '1px solid rgba(255,255,255,0.06)',
                      background: inCart ? 'rgba(139,92,246,0.08)' : 'rgb(var(--surface-1))',
                    }}
                    onClick={() => {
                      if (!isOut) addItemToCart(item);
                    }}
                  >
                    {inCart && (
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        background: 'rgb(139,92,246)',
                        color: 'white',
                        borderRadius: 999,
                        width: 22,
                        height: 22,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}>
                        {inCart.qty}
                      </div>
                    )}

                    <div>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        lineHeight: 1.25,
                        marginBottom: 4,
                        color: '#fafafa',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {item.name}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'rgb(161,161,170)', marginBottom: 8 }}>
                        {item.unit} · {Number(item.currentStock) <= 5 ? (
                          <span style={{ color: 'rgb(239,100,100)', fontWeight: 700 }}>
                            {Number(item.currentStock) <= 0 ? 'Out of stock' : `${Number(item.currentStock)} left`}
                          </span>
                        ) : (
                          `Stock: ${Number(item.currentStock).toFixed(0)}`
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'rgb(52,211,153)' }}>
                          ₹{Number(item.offerPrice ?? item.mrp).toFixed(2)}
                        </div>
                        {item.offerPrice && Number(item.offerPrice) < Number(item.mrp) && (
                          <div style={{ fontSize: '0.68rem', color: 'rgb(113,113,122)', textDecoration: 'line-through' }}>
                            ₹{Number(item.mrp).toFixed(2)}
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: inCart ? 'rgb(139,92,246)' : 'rgb(var(--surface-3))',
                          border: 'none',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Mobile Floating Cart Bar (Appears when cart has items) ── */}
        {cartItems.length > 0 && (
          <div
            className="floating-cart-bar show-mobile hide-desktop"
            onClick={() => setMobileCartSheetOpen(true)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 10,
                padding: '6px 10px',
                fontWeight: 800,
                fontSize: '0.88rem',
              }}>
                🛒 {totalCartCount}
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.1 }}>₹{grandTotal.toFixed(2)}</div>
                <div style={{ fontSize: '0.68rem', opacity: 0.85 }}>Tax included</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9rem' }}>
              <span>View Cart & Pay</span>
              <ArrowRight size={18} />
            </div>
          </div>
        )}
      </div>

      {/* ── DESKTOP RIGHT PANEL: Cart summary + Checkout (>= 1025px) ── */}
      <div
        className="hide-mobile"
        style={{
          width: 380,
          display: 'flex',
          flexDirection: 'column',
          background: 'rgb(var(--surface-1))',
          borderLeft: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Receipt size={18} color="rgb(139,92,246)" />
            <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
              Active Cart ({totalCartCount})
            </span>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={clearCart}
              style={{ background: 'none', border: 'none', color: '#a1a1aa', fontSize: '0.75rem', cursor: 'pointer' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Cart items list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 20px' }}>
          {cartItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'rgb(113,113,122)' }}>
              <ShoppingCart size={36} style={{ opacity: 0.3, margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 600 }}>Cart is empty</p>
              <p style={{ fontSize: '0.75rem' }}>Tap any item from catalog or scan barcode</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {cartItems.map((item) => (
                <div
                  key={item.itemId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: 'rgb(var(--surface-2))',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div style={{ flex: 1, marginRight: 10 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgb(52,211,153)', fontWeight: 600 }}>
                      ₹{item.priceAtSale.toFixed(2)} × {item.qty} = ₹{(item.priceAtSale * item.qty).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="qty-btn" onClick={() => updateQty(item.itemId, item.qty - 1)}>−</button>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, minWidth: 20, textAlign: 'center' }}>{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.itemId, item.qty + 1)}>+</button>
                    <button
                      onClick={() => removeItem(item.itemId)}
                      style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 4 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer & Checkout Form */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Customer phone & name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(113,113,122)' }} />
              <input
                type="tel"
                className="input"
                placeholder="Customer Phone (WhatsApp bill)"
                value={customerPhoneInput}
                onChange={(e) => {
                  setCustomerPhoneInput(e.target.value);
                  setCustomer(e.target.value, customerNameInput);
                }}
                style={{ paddingLeft: 34, height: 38, fontSize: '0.82rem' }}
              />
              {isLookingUpCustomer && (
                <Loader2 size={12} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite', color: 'rgb(139,92,246)' }} />
              )}
            </div>

            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(113,113,122)' }} />
              <input
                type="text"
                className="input"
                placeholder="Customer Name (Optional)"
                value={customerNameInput}
                onChange={(e) => {
                  setCustomerNameInput(e.target.value);
                  setCustomer(customerPhoneInput, e.target.value);
                }}
                style={{ paddingLeft: 34, height: 38, fontSize: '0.82rem' }}
              />
            </div>
          </div>

          {/* Returning Customer / Loyalty Badge */}
          {customerSuggestion && (
            <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', fontSize: '0.74rem', color: 'rgb(110,231,183)' }}>
              <strong>{customerSuggestion.name || 'Returning Customer'}</strong> · Loyalty: {Number(customerSuggestion.loyaltyPoints).toFixed(0)} pts
            </div>
          )}

          {/* Loyalty points redemption */}
          {customerSuggestion && Math.floor(Number(customerSuggestion?.loyaltyPoints || 0)) > 0 && (
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, color: 'rgb(251,191,36)', marginBottom: 6 }}>
                <span>⭐ Redeem Loyalty Points</span>
                <span>{Math.floor(Number(customerSuggestion.loyaltyPoints))} pts</span>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="number"
                  className="input"
                  placeholder="Points (1 pt = ₹1)"
                  value={pointsToRedeemInput}
                  onChange={(e) => setPointsToRedeemInput(e.target.value)}
                  style={{ flex: 1, height: 32, fontSize: '0.78rem' }}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ height: 32, fontSize: '0.72rem', color: 'rgb(251,191,36)', fontWeight: 700 }}
                  onClick={() => {
                    const avail = Math.floor(Number(customerSuggestion.loyaltyPoints));
                    const maxRedeem = Math.min(avail, Math.floor(Math.max(0, rawTotal - manualDiscount)));
                    setPointsToRedeemInput(String(maxRedeem));
                  }}
                >
                  Max
                </button>
              </div>
            </div>
          )}

          {/* Payment Modes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {PAYMENT_MODES.map((mode) => {
              const isSelected = paymentMode === mode.id;
              const isDisabled = mode.disabled;

              return (
                <button
                  key={mode.id}
                  disabled={isDisabled}
                  onClick={() => {
                    if (isDisabled) {
                      toast.error('Card terminal is not configured yet. Please select Cash or UPI.');
                      return;
                    }
                    setPaymentMode(mode.id);
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 8,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.45 : 1,
                    background: isSelected ? 'rgba(139,92,246,0.2)' : 'rgb(var(--surface-2))',
                    border: `1px solid ${isSelected ? 'rgb(139,92,246)' : 'rgba(255,255,255,0.06)'}`,
                    color: isSelected ? 'rgb(167,139,250)' : 'rgb(161,161,170)',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    position: 'relative',
                  }}
                >
                  <span>{mode.emoji}</span>
                  <span>{mode.label}</span>
                  {mode.badge && (
                    <span style={{ fontSize: '0.58rem', color: '#f87171', fontWeight: 700 }}>
                      {mode.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bill Totals Box */}
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgb(var(--surface-2))', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', marginBottom: 4 }}>
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', marginBottom: 4 }}>
              <span>GST / Tax</span>
              <span>₹{taxTotal.toFixed(2)}</span>
            </div>
            {totalDiscount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgb(52,211,153)', marginBottom: 4, fontWeight: 700 }}>
                <span>Total Discount</span>
                <span>−₹{totalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.05rem', color: '#fafafa', marginTop: 6, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <span>Grand Total</span>
              <span style={{ color: 'rgb(52,211,153)' }}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Finalize Button */}
          <button
            className="btn-primary"
            style={{
              width: '100%',
              height: 48,
              fontSize: '0.95rem',
              fontWeight: 800,
              justifyContent: 'center',
              background: finalizeBillMutation.isPending
                ? 'linear-gradient(135deg, rgb(16, 185, 129), rgb(139, 92, 246))'
                : undefined,
              boxShadow: finalizeBillMutation.isPending
                ? '0 0 24px rgba(52, 211, 153, 0.6)'
                : undefined,
              transition: 'all 0.2s ease',
            }}
            disabled={cartItems.length === 0 || finalizeBillMutation.isPending}
            onClick={() => {
              if (cartItems.length === 0) return;
              if (paymentMode === 'UPI') {
                setShowUpiQrModal(true);
              } else {
                playThermalPrintSound();
                finalizeBillMutation.mutate();
              }
            }}
          >
            {finalizeBillMutation.isPending ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Printer size={18} style={{ animation: 'printerBounce 0.5s infinite alternate' }} />
                <span>Printing Bill...</span>
              </span>
            ) : (
              <>
                <CheckCircle2 size={16} /> Finalize Bill · ₹{grandTotal.toFixed(2)}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── MOBILE SLIDING CHECKOUT SHEET DRAWER (< 1025px) ── */}
      {mobileCartSheetOpen && (
        <div
          className="mobile-sheet-backdrop show-mobile hide-desktop"
          onClick={() => setMobileCartSheetOpen(false)}
        >
          <div
            className="mobile-sheet-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Receipt size={20} color="rgb(139,92,246)" />
                <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fafafa' }}>
                  Checkout ({totalCartCount} Items)
                </span>
              </div>
              <button
                onClick={() => setMobileCartSheetOpen(false)}
                style={{ background: 'none', border: 'none', color: '#a1a1aa', padding: 6, cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            {/* Mobile Cart Items List */}
            <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {cartItems.map((item) => (
                <div
                  key={item.itemId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: 12,
                    background: 'rgb(28,28,35)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div style={{ flex: 1, marginRight: 8 }}>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fafafa' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'rgb(52,211,153)', fontWeight: 600 }}>
                      ₹{item.priceAtSale.toFixed(2)} × {item.qty} = ₹{(item.priceAtSale * item.qty).toFixed(2)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button className="qty-btn" style={{ width: 32, height: 32 }} onClick={() => updateQty(item.itemId, item.qty - 1)}>−</button>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                    <button className="qty-btn" style={{ width: 32, height: 32 }} onClick={() => updateQty(item.itemId, item.qty + 1)}>+</button>
                    <button
                      onClick={() => removeItem(item.itemId)}
                      style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: 6 }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Customer Phone & Name Inputs */}
            <div style={{ marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>
                  Customer Phone (Sends Digital Bill via WhatsApp)
                </label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgb(113,113,122)' }} />
                  <input
                    type="tel"
                    className="input"
                    placeholder="e.g. 9876543210 (Optional)"
                    value={customerPhoneInput}
                    onChange={(e) => {
                      setCustomerPhoneInput(e.target.value);
                      setCustomer(e.target.value, customerNameInput);
                    }}
                    style={{ paddingLeft: 40, height: 44, fontSize: '0.9rem', borderRadius: 12 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>
                  Customer Name (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgb(113,113,122)' }} />
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Rahul Sharma"
                    value={customerNameInput}
                    onChange={(e) => {
                      setCustomerNameInput(e.target.value);
                      setCustomer(customerPhoneInput, e.target.value);
                    }}
                    style={{ paddingLeft: 40, height: 44, fontSize: '0.9rem', borderRadius: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Customer suggestion banner on mobile */}
            {customerSuggestion && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', fontSize: '0.78rem', color: 'rgb(110,231,183)', marginBottom: 12 }}>
                <strong>{customerSuggestion.name || 'Returning Customer'}</strong> · Loyalty: {Number(customerSuggestion.loyaltyPoints).toFixed(0)} pts
              </div>
            )}

            {/* Mobile Loyalty Redemption */}
            {customerSuggestion && Math.floor(Number(customerSuggestion?.loyaltyPoints || 0)) > 0 && (
              <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 12, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, color: 'rgb(251,191,36)', marginBottom: 6 }}>
                  <span>⭐ Redeem Loyalty Points</span>
                  <span>{Math.floor(Number(customerSuggestion.loyaltyPoints))} pts</span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Points (1 pt = ₹1)"
                    value={pointsToRedeemInput}
                    onChange={(e) => setPointsToRedeemInput(e.target.value)}
                    style={{ flex: 1, height: 38, fontSize: '0.85rem' }}
                  />
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ height: 38, fontSize: '0.78rem', color: 'rgb(251,191,36)', fontWeight: 800, padding: '0 14px' }}
                    onClick={() => {
                      const avail = Math.floor(Number(customerSuggestion.loyaltyPoints));
                      const maxRedeem = Math.min(avail, Math.floor(Math.max(0, rawTotal - manualDiscount)));
                      setPointsToRedeemInput(String(maxRedeem));
                    }}
                  >
                    Redeem Max
                  </button>
                </div>
              </div>
            )}

            {/* Mobile Payment Mode Picker */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a1a1aa', display: 'block', marginBottom: 6 }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {PAYMENT_MODES.map((mode) => {
                  const isSelected = paymentMode === mode.id;
                  const isDisabled = mode.disabled;

                  return (
                    <button
                      key={mode.id}
                      disabled={isDisabled}
                      onClick={() => {
                        if (isDisabled) {
                          toast.error('Card terminal is not configured yet. Please select Cash or UPI.');
                          return;
                        }
                        setPaymentMode(mode.id);
                      }}
                      style={{
                        padding: '10px 6px',
                        borderRadius: 12,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        opacity: isDisabled ? 0.45 : 1,
                        background: isSelected ? 'rgba(139,92,246,0.25)' : 'rgb(28,28,35)',
                        border: `1px solid ${isSelected ? 'rgb(139,92,246)' : 'rgba(255,255,255,0.06)'}`,
                        color: isSelected ? 'rgb(167,139,250)' : 'rgb(161,161,170)',
                        fontWeight: isSelected ? 800 : 500,
                        fontSize: '0.8rem',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{mode.emoji}</span>
                      <span>{mode.label}</span>
                      {mode.badge && (
                        <span style={{ fontSize: '0.62rem', color: '#f87171', fontWeight: 700 }}>
                          {mode.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mobile Bill Totals Summary */}
            <div style={{ padding: '12px 14px', borderRadius: 12, background: 'rgb(28,28,35)', fontSize: '0.88rem', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', marginBottom: 4 }}>
                <span>Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a1a1aa', marginBottom: 4 }}>
                <span>GST / Tax</span>
                <span>₹{taxTotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgb(52,211,153)', marginBottom: 4, fontWeight: 700 }}>
                  <span>Discount Applied</span>
                  <span>−₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.2rem', color: '#fafafa', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <span>Grand Total</span>
                <span style={{ color: 'rgb(52,211,153)' }}>₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Mobile Finalize Bill CTA */}
            <button
              className="btn-primary"
              style={{
                width: '100%',
                height: 52,
                fontSize: '1.05rem',
                fontWeight: 800,
                borderRadius: 14,
                justifyContent: 'center',
                background: finalizeBillMutation.isPending
                  ? 'linear-gradient(135deg, rgb(16, 185, 129), rgb(139, 92, 246))'
                  : 'linear-gradient(135deg, rgb(139,92,246), rgb(109,40,217))',
                boxShadow: finalizeBillMutation.isPending
                  ? '0 0 24px rgba(52, 211, 153, 0.6)'
                  : '0 4px 18px rgba(139,92,246,0.4)',
                transition: 'all 0.2s ease',
              }}
              disabled={cartItems.length === 0 || finalizeBillMutation.isPending}
              onClick={() => {
                if (cartItems.length === 0) return;
                if (paymentMode === 'UPI') {
                  setShowUpiQrModal(true);
                } else {
                  playThermalPrintSound();
                  finalizeBillMutation.mutate();
                }
              }}
            >
              {finalizeBillMutation.isPending ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Printer size={20} style={{ animation: 'printerBounce 0.5s infinite alternate' }} />
                  <span>Printing Bill...</span>
                </span>
              ) : (
                <>
                  <CheckCircle2 size={18} /> Finalize & Print Bill · ₹{grandTotal.toFixed(2)}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Realistic Thermal Receipt Modal (Mobile & Desktop) ── */}
      {lastBill && (
        <ThermalPrinterBillModal
          bill={lastBill}
          onClose={() => {
            setLastBill(null);
            searchInputRef.current?.focus();
          }}
        />
      )}

      {/* ── Camera Barcode Scanner Modal (Mobile & Desktop) ── */}
      <BarcodeScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScan={(barcode) => {
          handleBarcodeScanned(barcode);
        }}
        autoCloseOnScan={false}
        cartItems={cartItems}
        onUpdateQty={updateQty}
        onRemoveItem={removeItem}
        grandTotal={getGrandTotal()}
        title="Scan Barcode with Phone Camera"
        subtitle="Camera remains active. Scan barcodes continuously and adjust item quantities below."
      />

      {/* ── Dynamic UPI QR Code Payment Modal ── */}
      <UpiQrPaymentModal
        isOpen={showUpiQrModal}
        onClose={() => setShowUpiQrModal(false)}
        grandTotal={grandTotal}
        upiId={shopSettings?.upiId}
        shopName={shopSettings?.tenant?.name || 'Retail Store'}
        isPending={finalizeBillMutation.isPending}
        onConfirmPayment={() => {
          setShowUpiQrModal(false);
          playThermalPrintSound();
          finalizeBillMutation.mutate();
        }}
        onSaveUpiId={async (newUpiId) => {
          await updateSettingsMutation.mutateAsync({ upiId: newUpiId });
        }}
      />

      {/* ── Parked Orders & Held Bills Modal ── */}
      <HeldBillsSectionModal
        isOpen={showHeldModal}
        onClose={() => setShowHeldModal(false)}
        heldBills={heldBills}
        onResumeHeld={(holdId) => resumeHeldMutation.mutate(holdId)}
        isResuming={resumeHeldMutation.isPending}
      />

      <style jsx global>{`
        @keyframes printerBounce {
          0% { transform: translateY(0) scale(1); }
          100% { transform: translateY(-3px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
