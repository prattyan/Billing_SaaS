'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi, categoriesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Package, AlertTriangle, Edit2, Trash2,
  RefreshCw, Loader2, X, BarChart2, Filter, Camera,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState<any>(null);
  const [showCameraLookup, setShowCameraLookup] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['items', page, search, filterLowStock],
    queryFn: () => itemsApi.list({ page, limit: 20, search, lowStock: filterLowStock }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: planUsage } = useQuery({
    queryKey: ['planUsage'],
    queryFn: () => itemsApi.planUsage().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onSuccess: () => { toast.success('Item deactivated'); qc.invalidateQueries({ queryKey: ['items'] }); },
    onError: () => toast.error('Failed to delete item'),
  });

  const handleCameraScanInInventory = async (barcode: string) => {
    const cleanBarcode = barcode.trim();
    if (!cleanBarcode) return;

    try {
      const res = await itemsApi.lookupBarcode(cleanBarcode);
      if (res.data) {
        toast.success(`Found in stock: ${res.data.name} (Current: ${res.data.currentStock} ${res.data.unit})`, {
          id: 'inventory-stock-toast',
        });
        setShowRestockModal(res.data);
        setShowCameraLookup(false);
      } else {
        toast.error(`❌ Barcode "${cleanBarcode}" is NOT found in stock. Only existing inventory items can be scanned for restocking. Please add this item first.`, {
          id: 'inventory-stock-err-toast',
          duration: 4000,
        });
      }
    } catch {
      toast.error(`❌ Barcode "${cleanBarcode}" is NOT found in stock. Only existing inventory items can be scanned for restocking. Please add this item first.`, {
        id: 'inventory-stock-err-toast',
        duration: 4000,
      });
    }
  };

  const items: any[] = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Inventory & Stock</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            {meta?.total ?? '—'} registered stock items
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowCameraLookup(true)}
            title="Scan an existing product barcode to restock inventory"
          >
            <Camera size={16} /> Scan to Restock
          </button>
          <button
            className="btn-primary"
            onClick={() => {
              setPrefilledBarcode('');
              setShowAddModal(true);
            }}
          >
            <Plus size={16} /> Add Item to Stock
          </button>
        </div>
      </div>

      {/* Plan usage bar */}
      {planUsage && (
        <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgb(161,161,170)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {planUsage.currentTier} Plan
              </span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, marginLeft: 12 }}>
                {planUsage.currentSkuCount} / {planUsage.tierLimit} SKUs
              </span>
            </div>
            <span style={{
              fontSize: '0.875rem', fontWeight: 800,
              color: planUsage.usagePercent >= 90 ? 'rgb(239,100,100)' : planUsage.usagePercent >= 70 ? 'rgb(245,158,11)' : 'rgb(52,211,153)',
            }}>
              {planUsage.usagePercent}%
            </span>
          </div>
          <div style={{ height: 6, background: 'rgb(var(--surface-3))', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
              width: `${Math.min(100, planUsage.usagePercent)}%`,
              background: planUsage.usagePercent >= 90
                ? 'rgb(239,68,68)'
                : planUsage.usagePercent >= 70
                ? 'rgb(245,158,11)'
                : 'linear-gradient(90deg, rgb(139,92,246), rgb(52,211,153))',
            }} />
          </div>
          {planUsage.suggestedUpgrade && (
            <p style={{ fontSize: '0.75rem', color: 'rgb(251,191,36)', marginTop: 6 }}>
              ⚠️ Approaching limit — consider upgrading to {planUsage.suggestedUpgrade}
            </p>
          )}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={15} style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: 'rgb(113,113,122)',
          }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name, barcode, brand…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ paddingLeft: 36 }}
          />
        </div>
        <button
          className={filterLowStock ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '10px 16px', fontSize: '0.8rem' }}
          onClick={() => setFilterLowStock(!filterLowStock)}
        >
          <AlertTriangle size={14} />
          Low Stock
        </button>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Barcode</th>
              <th>Category</th>
              <th>MRP</th>
              <th>Offer Price</th>
              <th>GST</th>
              <th>Stock</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'rgb(113,113,122)' }}>
                  <Package size={32} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  No items found
                </td>
              </tr>
            ) : (
              items.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>{item.brand} · {item.unit}</div>
                  </td>
                  <td>
                    <code style={{
                      fontSize: '0.72rem', background: 'rgb(var(--surface-3))',
                      padding: '2px 6px', borderRadius: 4,
                    }}>
                      {item.barcode ?? '—'}
                    </code>
                  </td>
                  <td>
                    {item.category ? (
                      <span className="badge badge-purple">{item.category.name}</span>
                    ) : '—'}
                  </td>
                  <td style={{ fontWeight: 600 }}>₹{Number(item.mrp).toFixed(2)}</td>
                  <td style={{ color: 'rgb(52,211,153)', fontWeight: 600 }}>
                    ₹{Number(item.offerPrice ?? item.mrp).toFixed(2)}
                  </td>
                  <td>{Number(item.taxPercent)}%</td>
                  <td>
                    <div style={{
                      fontWeight: 700,
                      color: item.isLowStock ? 'rgb(239,100,100)' : 'rgb(var(--text-primary))',
                    }}>
                      {Number(item.currentStock).toFixed(0)} {item.unit}
                      {item.isLowStock && <AlertTriangle size={12} style={{ display: 'inline', marginLeft: 4 }} />}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${item.isActive ? 'badge-success' : 'badge-gray'}`}>
                      {item.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        title="Restock"
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => setShowRestockModal(item)}
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        title="Delete"
                        className="btn-danger"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => {
                          if (confirm(`Deactivate "${item.name}"?`)) {
                            deleteMutation.mutate(item.id);
                          }
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: p === page ? 'rgb(var(--color-primary))' : 'rgb(var(--surface-2))',
                color: p === page ? 'white' : 'rgb(var(--text-secondary))',
                fontWeight: 600, fontSize: '0.875rem',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <RestockModal
          item={showRestockModal}
          onClose={() => setShowRestockModal(null)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['items'] }); setShowRestockModal(null); }}
        />
      )}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          initialBarcode={prefilledBarcode}
          onClose={() => { setShowAddModal(false); setPrefilledBarcode(''); }}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['items'] }); qc.invalidateQueries({ queryKey: ['planUsage'] }); setShowAddModal(false); setPrefilledBarcode(''); }}
        />
      )}

      {/* Barcode Scanner Modal for Restock Scan */}
      <BarcodeScannerModal
        isOpen={showCameraLookup}
        onClose={() => setShowCameraLookup(false)}
        onScan={handleCameraScanInInventory}
        title="Scan Barcode to Restock Item"
        subtitle="Point camera at registered product barcode to restock inventory quantity"
      />
    </div>
  );
}

// ── Restock Modal ─────────────────────────────────────────────────────────────

function RestockModal({ item, onClose, onSuccess }: { item: any; onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: { quantity: 1, costPrice: '', invoiceRef: '' },
  });

  const onSubmit = async (data: any) => {
    try {
      await itemsApi.restock(item.id, { ...data, quantity: Number(data.quantity) });
      toast.success(`Restocked ${data.quantity} units of ${item.name}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Restock failed');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="glass-card" style={{ width: 400, padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Restock: {item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgb(113,113,122)', marginBottom: 20 }}>
          Current stock: <strong style={{ color: 'white' }}>{Number(item.currentStock).toFixed(0)} {item.unit}</strong>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Quantity to Add *</label>
            <input type="number" className="input" min="0.001" step="any" {...register('quantity', { required: true, min: 0.001 })} />
          </div>
          <div>
            <label className="label">Purchase/Cost Price (₹)</label>
            <input type="number" className="input" placeholder="Optional" min="0" step="0.01" {...register('costPrice')} />
          </div>
          <div>
            <label className="label">Invoice Reference</label>
            <input type="text" className="input" placeholder="e.g. INV-2024-001" {...register('invoiceRef')} />
          </div>
          <button type="submit" className="btn-primary" style={{ justifyContent: 'center' }} disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Restocking...</> : '✓ Restock'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Add Item Modal ────────────────────────────────────────────────────────────

function AddItemModal({
  initialBarcode = '',
  onClose,
  onSuccess,
}: {
  initialBarcode?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const { register, handleSubmit, setValue, formState: { isSubmitting, errors } } = useForm({
    defaultValues: {
      name: '',
      unit: 'piece',
      mrp: '',
      offerPrice: '',
      taxPercent: '0',
      barcode: initialBarcode,
      initialStock: '0',
    },
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  const onSubmit = async (data: any) => {
    try {
      await itemsApi.create({
        ...data,
        mrp: Number(data.mrp),
        offerPrice: data.offerPrice ? Number(data.offerPrice) : undefined,
        taxPercent: Number(data.taxPercent),
        initialStock: Number(data.initialStock) || 0,
      });
      toast.success(`${data.name} added to inventory!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to add item');
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }} onClick={onClose}>
        <div className="glass-card" style={{ width: 520, padding: 28, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Add New Item</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Item Name *</label>
              <input type="text" className="input" placeholder="e.g. Amul Milk 1L" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">MRP (₹) *</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01" {...register('mrp', { required: true })} />
            </div>
            <div>
              <label className="label">Offer/Selling Price (₹)</label>
              <input type="number" className="input" placeholder="Leave blank = MRP" min="0" step="0.01" {...register('offerPrice')} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" {...register('unit')}>
                {['piece', 'kg', 'litre', 'pack', 'box', 'dozen'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">GST % (Tax)</label>
              <select className="input" {...register('taxPercent')}>
                {['0', '5', '12', '18', '28'].map((t) => (
                  <option key={t} value={t}>{t}%</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Barcode (optional)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Scan or enter barcode"
                  {...register('barcode')}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    padding: '0 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(139,92,246,0.15)',
                    border: '1px solid rgba(139,92,246,0.3)',
                    color: 'rgb(167,139,250)',
                  }}
                  onClick={() => setShowBarcodeScanner(true)}
                  title="Scan barcode with device camera"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="label">Initial Stock</label>
              <input type="number" className="input" placeholder="0" min="0" step="any" {...register('initialStock')} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Adding...</> : '+ Add Item'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <BarcodeScannerModal
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onScan={(scannedBarcode) => {
          setValue('barcode', scannedBarcode);
          setShowBarcodeScanner(false);
        }}
        title="Scan Barcode for New Item"
        subtitle="Point camera at product barcode to auto-fill the barcode field"
      />
    </>
  );
}
