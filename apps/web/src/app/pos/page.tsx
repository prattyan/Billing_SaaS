'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi, billingApi, customersApi } from '@/lib/api';
import { useCartStore, useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import {
  Scan, Search, X, Plus, Minus, Trash2, ShoppingCart,
  Phone, User, Loader2, CheckCircle2, PauseCircle, PlayCircle,
  ChevronDown, Receipt, IndianRupee, Tag, Camera, Printer, Share2, FileText, ExternalLink,
} from 'lucide-react';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';
import ThermalPrinterBillModal from '@/components/ThermalPrinterBillModal';

const PAYMENT_MODES = [
  { id: 'CASH', label: 'Cash', emoji: '💵' },
  { id: 'UPI', label: 'UPI', emoji: '📱' },
  { id: 'CARD', label: 'Card', emoji: '💳' },
  { id: 'WALLET', label: 'Wallet', emoji: '👛' },
];

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

  // Held bills
  const { data: heldBills } = useQuery({
    queryKey: ['heldBills'],
    queryFn: () => billingApi.getHeld().then((r) => r.data),
  });

  // ── USB Barcode Scanner (HID → rapid keystrokes + Enter) ───────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If focused on an input that isn't the search bar, skip
      const active = document.activeElement;
      if (active && active !== searchInputRef.current &&
          (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

      if (e.key === 'Enter' && barcodeBuffer.current.length >= 4) {
        handleBarcodeScanned(barcodeBuffer.current);
        barcodeBuffer.current = '';
        clearTimeout(barcodeTimer.current);
        return;
      }

      if (e.key.length === 1) { // single printable char
        barcodeBuffer.current += e.key;
        clearTimeout(barcodeTimer.current);
        barcodeTimer.current = setTimeout(() => {
          barcodeBuffer.current = '';
        }, 100); // USB scanner sends chars < 100ms apart
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
        // Fallback: search in catalog by barcode / query
        const searchRes = await itemsApi.list({ search: cleanBarcode, limit: 5 });
        const match = searchRes.data.items?.find(
          (i: any) => i.barcode === cleanBarcode || i.name?.toLowerCase() === cleanBarcode.toLowerCase(),
        );
        if (match) {
          item = match;
        }
      }

      if (!item) {
        toast.error(`❌ Barcode "${cleanBarcode}" is NOT in stock. Only registered stock items can be scanned for selling.`, {
          duration: 5000,
          id: `barcode-err-${cleanBarcode}`,
        });
        return;
      }

      if (Number(item.currentStock) <= 0) {
        toast(`⚠️ Out of stock notice: "${item.name}" has 0 stock.`, {
          icon: '⚠️',
          duration: 4000,
          id: `stock-warn-${item.id}`,
        });
      }

      addItemToCart(item);
    } catch (err: any) {
      toast.error(`❌ Barcode "${cleanBarcode}" is NOT in stock. Only registered stock items can be scanned for selling.`, {
        duration: 5000,
        id: `barcode-err-${cleanBarcode}`,
      });
    }
  };

  const addItemToCart = (item: any) => {
    addItem({
      itemId: item.id,
      name: item.name,
      barcode: item.barcode,
      qty: 1,
      mrp: Number(item.mrp),
      priceAtSale: Number(item.offerPrice ?? item.mrp),
      taxPercent: Number(item.taxPercent),
      unit: item.unit,
    });
    toast.success(`${item.name} added to cart`, { duration: 1500, icon: '✅', id: `cart-add-${item.id}` });
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  // ── Item search ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setShowResults(false); return; }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await itemsApi.list({ search: searchQuery, limit: 8 });
        setSearchResults(res.data.items ?? []);
        setShowResults(true);
      } catch {} finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // ── Customer phone lookup ─────────────────────────────────────────────────

  useEffect(() => {
    const clean = customerPhoneInput.trim();
    if (clean.length < 10) {
      setCustomerSuggestion(null);
      setCustomer(clean, customerNameInput);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLookingUpCustomer(true);
      try {
        const res = await customersApi.lookupByPhone(clean);
        if (res.data) {
          setCustomerSuggestion(res.data);
          // If customer has a registered name (and it's not default "Walk-in Customer"), auto-fill it!
          if (res.data.name && res.data.name !== 'Walk-in Customer') {
            setCustomerNameInput(res.data.name);
            setCustomer(clean, res.data.name);
            toast.success(`Returning Customer: ${res.data.name}`, {
              id: 'cust-returning',
              duration: 2000,
              icon: '👤',
            });
          } else {
            setCustomer(clean, customerNameInput);
          }
        } else {
          setCustomerSuggestion(null);
          setCustomer(clean, customerNameInput);
        }
      } catch {
        setCustomerSuggestion(null);
        setCustomer(clean, customerNameInput);
      } finally {
        setIsLookingUpCustomer(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customerPhoneInput]);

  // ── Finalize bill ─────────────────────────────────────────────────────────

  const finalizeBillMutation = useMutation({
    mutationFn: () =>
      billingApi.createBill({
        items: cartItems.map((i) => ({ itemId: i.itemId, qty: Number(i.qty) })),
        customerPhone: customerPhoneInput.trim() || undefined,
        customerName: customerNameInput.trim() || undefined,
        paymentMode,
        discount: Number(discountInput) || 0,
      }),
    onSuccess: (res) => {
      setLastBill(res.data);
      clearCart();
      setCustomerPhoneInput('');
      setCustomerNameInput('');
      setCustomerSuggestion(null);
      setDiscountInput('');
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success(`✅ Bill ${res.data.billNumber} created successfully!`, { duration: 3000 });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message ?? 'Failed to create bill';
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg, { duration: 5000 });
    },
  });

  const holdBillMutation = useMutation({
    mutationFn: () => billingApi.holdBill({ items: cartItems, label: customerPhoneInput || 'Parked' }),
    onSuccess: () => {
      clearCart();
      qc.invalidateQueries({ queryKey: ['heldBills'] });
      toast.success('Cart parked! Resume anytime.');
    },
  });

  const subtotal = getSubtotal();
  const taxTotal = getTaxTotal();
  const grandTotal = Math.max(0, subtotal + taxTotal - (Number(discountInput) || 0));

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: 'rgb(var(--surface-0))',
    }}>
      {/* ── LEFT PANEL: Item search + scan ─────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        overflow: 'hidden',
      }}>
        {/* POS topbar */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgb(var(--surface-1))',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 800 }}>POS — Point of Sale</h1>
            <p style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>
              {user?.name} · Scan barcode or search items
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Hold button */}
            {cartItems.length > 0 && (
              <button
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                onClick={() => holdBillMutation.mutate()}
                disabled={holdBillMutation.isPending}
              >
                <PauseCircle size={15} /> Park Cart
              </button>
            )}
            {/* Held bills */}
            {(heldBills as any[])?.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem' }}>
                  <PlayCircle size={15} /> Held ({(heldBills as any[])?.length})
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Search bar & Camera Scanner Trigger */}
        <div style={{ padding: '16px 20px', position: 'relative' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={16} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'rgb(113,113,122)',
              }} />
              <input
                ref={searchInputRef}
                type="text"
                className="input"
                placeholder="Search by name, barcode, or brand… (or scan barcode)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (searchResults.length > 0) {
                      addItemToCart(searchResults[0]);
                    } else if (searchQuery.trim()) {
                      handleBarcodeScanned(searchQuery.trim());
                    }
                  }
                }}
                style={{ paddingLeft: '38px', paddingRight: '38px', fontSize: '0.9rem', height: 44 }}
                autoFocus
              />
              {isSearching && (
                <Loader2 size={14} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgb(139,92,246)', animation: 'spin 1s linear infinite',
                }} />
              )}
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{
                height: 44,
                padding: '0 16px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexShrink: 0,
                background: 'linear-gradient(135deg, rgb(139,92,246), rgb(52,211,153))',
                boxShadow: '0 4px 16px rgba(139,92,246,0.3)',
              }}
              onClick={() => setShowCameraScanner(true)}
            >
              <Camera size={17} />
              <span>Camera Scan</span>
            </button>
          </div>

          {/* Barcode Scanner Modal for Camera */}
          <BarcodeScannerModal
            isOpen={showCameraScanner}
            onClose={() => setShowCameraScanner(false)}
            onScan={(barcode) => {
              handleBarcodeScanned(barcode);
            }}
            title="Scan Item to Add to Cart"
            subtitle="Point camera at product barcode to instantly add it to the POS counter"
          />

          {/* Search results dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="glass-card" style={{
              position: 'absolute', top: 70, left: 20, right: 20, zIndex: 100,
              maxHeight: 320, overflowY: 'auto', padding: 8,
            }}>
              {searchResults.map((item: any) => (
                <div
                  key={item.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgb(var(--surface-2))')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => addItemToCart(item)}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: 'rgba(139,92,246,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.1rem',
                  }}>🛍️</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>
                      {item.barcode} · {item.unit} · Stock: {Number(item.currentStock).toFixed(0)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'rgb(52,211,153)' }}>
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

        {/* Cart items */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {cartItems.length === 0 ? (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', height: '60%', gap: 12,
              color: 'rgb(113,113,122)',
            }}>
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: 'rgba(139,92,246,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ShoppingCart size={32} color="rgb(139,92,246)" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 600, color: 'rgb(161,161,170)', marginBottom: 4 }}>Cart is empty</p>
                <p style={{ fontSize: '0.8rem' }}>Scan a barcode or search for an item</p>
              </div>
            </div>
          ) : (
            <div>
              {/* Cart header */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 32px',
                gap: 8, padding: '8px 0',
                fontSize: '0.68rem', fontWeight: 700, color: 'rgb(113,113,122)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                marginBottom: 4,
              }}>
                <span>Item</span>
                <span style={{ textAlign: 'center' }}>Qty</span>
                <span style={{ textAlign: 'right' }}>Price</span>
                <span style={{ textAlign: 'right' }}>Total</span>
                <span></span>
              </div>

              {cartItems.map((item) => (
                <div key={item.itemId} style={{
                  display: 'grid', gridTemplateColumns: '1fr 120px 100px 80px 32px',
                  gap: 8, alignItems: 'center', padding: '10px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 2 }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>
                      {item.unit} · {item.taxPercent}% GST
                    </div>
                  </div>

                  {/* Qty control */}
                  <div className="qty-control" style={{ justifyContent: 'center' }}>
                    <button className="qty-btn" onClick={() => updateQty(item.itemId, item.qty - 1)}>−</button>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, minWidth: 28, textAlign: 'center' }}>{item.qty}</span>
                    <button className="qty-btn" onClick={() => updateQty(item.itemId, item.qty + 1)}>+</button>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.875rem', color: 'rgb(52,211,153)', fontWeight: 600 }}>
                      ₹{item.priceAtSale.toFixed(2)}
                    </div>
                    {item.priceAtSale < item.mrp && (
                      <div style={{ fontSize: '0.68rem', color: 'rgb(113,113,122)', textDecoration: 'line-through' }}>
                        ₹{item.mrp.toFixed(2)}
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '0.875rem' }}>
                    ₹{(item.priceAtSale * item.qty * (1 + item.taxPercent / 100)).toFixed(2)}
                  </div>

                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)', padding: 4 }}
                    onClick={() => removeItem(item.itemId)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Success banner */}
        {lastBill && (
          <div className="alert alert-success" style={{ margin: '0 20px 16px', borderRadius: 12 }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Bill {lastBill.billNumber} created!</strong>
              <br />
              <span style={{ fontSize: '0.8rem' }}>₹{Number(lastBill.grandTotal).toFixed(2)} · {lastBill.paymentMode}</span>
              {lastBill.customer && <span style={{ fontSize: '0.8rem' }}> · WhatsApp sent to {lastBill.customer.phone}</span>}
            </div>
            <button
              style={{ background: 'none', border: 'none', cursor: 'pointer', marginLeft: 'auto', color: 'inherit', flexShrink: 0 }}
              onClick={() => setLastBill(null)}
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Cart summary + checkout ─────────────────────────── */}
      <div style={{
        width: 360, display: 'flex', flexDirection: 'column',
        background: 'rgb(var(--surface-1))',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Receipt size={16} color="rgb(139,92,246)" />
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>
            Bill Summary · {cartItems.length} item{cartItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Customer Phone</span>
                <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Optional for WhatsApp</span>
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgb(113,113,122)',
                }} />
                <input
                  type="tel"
                  className="input"
                  placeholder="e.g. 9876543210"
                  value={customerPhoneInput}
                  onChange={(e) => {
                    setCustomerPhoneInput(e.target.value);
                    setCustomer(e.target.value, customerNameInput);
                  }}
                  style={{ paddingLeft: 34 }}
                />
                {isLookingUpCustomer && (
                  <Loader2 size={12} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    animation: 'spin 1s linear infinite', color: 'rgb(139,92,246)',
                  }} />
                )}
              </div>
            </div>

            <div>
              <label className="label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Customer Name</span>
                <span style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Optional (Walk-in)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <User size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'rgb(113,113,122)',
                }} />
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Rahul Sharma (or leave blank)"
                  value={customerNameInput}
                  onChange={(e) => {
                    setCustomerNameInput(e.target.value);
                    setCustomer(customerPhoneInput, e.target.value);
                  }}
                  style={{ paddingLeft: 34 }}
                />
              </div>
            </div>

            {customerSuggestion && (
              <div style={{
                padding: '10px 12px', borderRadius: 8,
                background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.3)',
                fontSize: '0.78rem', color: 'rgb(110,231,183)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                  <User size={13} color="#34d399" />
                  Returning Customer: {customerSuggestion.name && customerSuggestion.name !== 'Walk-in Customer' ? customerSuggestion.name : customerSuggestion.phone}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>
                  Total Spent: ₹{Number(customerSuggestion.totalSpend).toLocaleString('en-IN', { maximumFractionDigits: 0 })} · Loyalty: {Number(customerSuggestion.loyaltyPoints).toFixed(0)} pts
                </div>
              </div>
            )}
          </div>

          {/* Payment mode */}
          <div>
            <label className="label">Payment Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PAYMENT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setPaymentMode(mode.id)}
                  style={{
                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                    background: paymentMode === mode.id ? 'rgba(139,92,246,0.15)' : 'rgb(var(--surface-2))',
                    border: `1px solid ${paymentMode === mode.id ? 'rgba(139,92,246,0.4)' : 'rgba(255,255,255,0.05)'}`,
                    color: paymentMode === mode.id ? 'rgb(167,139,250)' : 'rgb(161,161,170)',
                    fontWeight: paymentMode === mode.id ? 700 : 500,
                    fontSize: '0.8rem', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span>{mode.emoji}</span> {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discount */}
          <div>
            <label className="label">Bill Discount (₹)</label>
            <div style={{ position: 'relative' }}>
              <Tag size={14} style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                color: 'rgb(113,113,122)',
              }} />
              <input
                type="number"
                className="input"
                placeholder="0.00"
                min="0"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                style={{ paddingLeft: 34 }}
              />
            </div>
          </div>

          {/* Bill totals */}
          <div className="card" style={{ padding: '14px 16px' }}>
            {[
              { label: 'Subtotal', value: subtotal, color: 'rgb(var(--text-primary))' },
              { label: 'GST / Tax', value: taxTotal, color: 'rgb(var(--text-secondary))' },
              ...(Number(discountInput) > 0
                ? [{ label: 'Discount', value: -Number(discountInput), color: 'rgb(52,211,153)' }]
                : []),
            ].map((row) => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                marginBottom: 8, fontSize: '0.85rem',
              }}>
                <span style={{ color: 'rgb(161,161,170)' }}>{row.label}</span>
                <span style={{ color: row.color, fontWeight: 600 }}>
                  {row.value < 0 ? '−' : ''}₹{Math.abs(row.value).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="divider" />
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontSize: '1.1rem', fontWeight: 800,
            }}>
              <span>Grand Total</span>
              <span style={{ color: 'rgb(52,211,153)' }}>
                ₹{grandTotal.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Finalize button */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <button
            className="btn-primary"
            style={{ width: '100%', justifyContent: 'center', height: 48, fontSize: '1rem' }}
            disabled={cartItems.length === 0 || finalizeBillMutation.isPending}
            onClick={() => finalizeBillMutation.mutate()}
          >
            {finalizeBillMutation.isPending
              ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
              : <><CheckCircle2 size={18} /> Finalize Bill · ₹{grandTotal.toFixed(2)}</>}
          </button>
          {cartItems.length > 0 && (
            <button
              className="btn-secondary"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, fontSize: '0.8rem' }}
              onClick={() => { clearCart(); setCustomerPhoneInput(''); setCustomerNameInput(''); setDiscountInput(''); }}
            >
              <X size={14} /> Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* ── Realistic Thermal POS Printer Animation & Long Portrait Shop Receipt ── */}
      {lastBill && (
        <ThermalPrinterBillModal
          bill={lastBill}
          onClose={() => {
            setLastBill(null);
            searchInputRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
