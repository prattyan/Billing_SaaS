'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { itemsApi, categoriesApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Plus, Search, Package, AlertTriangle, Edit2, Trash2,
  RefreshCw, Loader2, X, Filter, Camera, Tag, Layers, Check, Lock
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import BarcodeScannerModal from '@/components/BarcodeScannerModal';

export default function InventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [showRestockModal, setShowRestockModal] = useState<any>(null);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showCameraLookup, setShowCameraLookup] = useState(false);
  const [prefilledBarcode, setPrefilledBarcode] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);

  // Query items
  const { data, isLoading } = useQuery({
    queryKey: ['items', page, search, selectedCategory, filterLowStock],
    queryFn: () => itemsApi.list({
      page,
      limit: 20,
      search,
      categoryId: selectedCategory === 'ALL' ? undefined : selectedCategory,
      lowStock: filterLowStock,
    }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  // Query categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  const { data: planUsage } = useQuery({
    queryKey: ['planUsage'],
    queryFn: () => itemsApi.planUsage().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onSuccess: () => {
      toast.success('Item deactivated');
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['posCatalog'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['planUsage'] });
    },
    onError: () => toast.error('Failed to delete item'),
  });

  const PLAN_LIMITS_MAP: Record<string, number> = { STARTER: 10, GROWTH: 100, BUSINESS: 500, ENTERPRISE: 2000 };
  const currentTier = planUsage?.currentTier ?? 'STARTER';
  const tierLimit = PLAN_LIMITS_MAP[currentTier] ?? planUsage?.tierLimit ?? 10;
  const currentSkuCount = planUsage?.currentSkuCount ?? 0;
  const isOverLimit = currentSkuCount >= tierLimit;

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
        toast.error(`Barcode "${cleanBarcode}" is NOT found in stock.`, {
          id: 'inventory-stock-err-toast',
          duration: 4000,
        });
      }
    } catch {
      toast.error(`Barcode "${cleanBarcode}" is NOT found in stock.`, {
        id: 'inventory-stock-err-toast',
        duration: 4000,
      });
    }
  };

  const items: any[] = data?.items ?? [];
  const meta = data?.meta;

  return (
    <div className="page-container" style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Inventory & Products</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            {meta?.total ?? '—'} registered items across {categories.length} categories
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowCategoriesModal(true)}
          >
            <Tag size={16} color="rgb(139,92,246)" /> Manage Categories ({categories.length})
          </button>
          <button
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => setShowCameraLookup(true)}
            title="Scan an existing product barcode to restock inventory"
          >
            <Camera size={16} /> Scan to Restock
          </button>
          <button
            className={isOverLimit ? "btn-secondary" : "btn-primary"}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isOverLimit ? 'rgba(239, 68, 68, 0.1)' : undefined,
              border: isOverLimit ? '1px solid rgba(239, 68, 68, 0.35)' : undefined,
              color: isOverLimit ? '#f87171' : undefined,
            }}
            title={isOverLimit ? `SKU limit reached (${currentSkuCount}/${tierLimit} products). Upgrade your plan to add more.` : undefined}
            onClick={() => {
              if (isOverLimit) {
                toast.error(`SKU Limit Reached (${currentSkuCount}/${tierLimit} products). Upgrade your subscription plan to add more items.`);
              }
              setPrefilledBarcode('');
              setShowAddModal(true);
            }}
          >
            {isOverLimit ? <Lock size={15} /> : <Plus size={16} />}
            <span>{isOverLimit ? `Add Product (Locked)` : 'Add Product'}</span>
          </button>
        </div>
      </div>

      {/* Plan usage bar */}
      {planUsage && (() => {
        const PLAN_LIMITS_MAP: Record<string, number> = { STARTER: 10, GROWTH: 100, BUSINESS: 500, ENTERPRISE: 2000 };
        const tierLimit = PLAN_LIMITS_MAP[planUsage.currentTier] ?? planUsage.tierLimit ?? 10;
        const currentCount = planUsage.currentSkuCount ?? 0;
        const usagePercent = Math.min(100, Math.round((currentCount / tierLimit) * 100));

        return (
          <div className="card plan-usage-bar" style={{ marginBottom: 20, padding: '14px 20px' }}>
            <div className="plan-usage-text" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgb(161,161,170)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {planUsage.currentTier} Plan
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 700, marginLeft: 12 }}>
                  {currentCount} / {tierLimit} SKUs
                </span>
              </div>
              <span style={{
                fontSize: '0.875rem', fontWeight: 800,
                color: usagePercent >= 90 ? 'rgb(239,100,100)' : usagePercent >= 70 ? 'rgb(245,158,11)' : '#4ade80',
              }}>
                {usagePercent}%
              </span>
            </div>
            <div style={{ height: 6, background: 'rgb(var(--surface-3))', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999, transition: 'width 0.5s ease',
                width: `${usagePercent}%`,
                background: usagePercent >= 90
                  ? 'rgb(239,68,68)'
                  : usagePercent >= 70
                  ? 'rgb(245,158,11)'
                  : 'rgb(22, 163, 74)',
              }} />
            </div>
          </div>
        );
      })()}

      {/* Filters Bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-container" style={{ flex: 1, minWidth: 260, maxWidth: 400, position: 'relative' }}>
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

        {/* Category Dropdown Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Tag size={15} color="rgb(161,161,170)" />
          <select
            className="input"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            style={{ minWidth: 160, padding: '8px 12px', fontSize: '0.85rem' }}
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((cat: any) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <button
          className={filterLowStock ? 'btn-primary' : 'btn-secondary'}
          style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={() => setFilterLowStock(!filterLowStock)}
        >
          <AlertTriangle size={14} />
          Low Stock
        </button>
      </div>

      {/* Desktop Table */}
      <div className="table-wrapper desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product / Item</th>
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
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '48px', color: 'rgb(113,113,122)' }}>
                  <Package size={36} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  No items found in this filter
                </td>
              </tr>
            ) : (
              items.map((item: any) => (
                <tr key={item.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fafafa' }}>{item.name}</div>
                    <div style={{ fontSize: '0.72rem', color: 'rgb(161,161,170)' }}>{item.brand ? `${item.brand} · ` : ''}{item.unit}</div>
                  </td>
                  <td>
                    <code style={{
                      fontSize: '0.72rem', background: 'rgb(var(--surface-3))',
                      padding: '2px 6px', borderRadius: 4, color: '#a1a1aa'
                    }}>
                      {item.barcode ?? '—'}
                    </code>
                  </td>
                  <td>
                    {item.category ? (
                      <span className="badge badge-purple" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                        {item.category.name}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>Uncategorized</span>
                    )}
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
                        title="Edit Item & Category"
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => setShowEditModal(item)}
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        title="Restock Inventory"
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => setShowRestockModal(item)}
                      >
                        <RefreshCw size={12} />
                      </button>
                      <button
                        title="Delete Item"
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

      {/* Category Manager Modal */}
      {showCategoriesModal && (
        <ManageCategoriesModal
          onClose={() => setShowCategoriesModal(false)}
        />
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
          categories={categories}
          isOverLimit={isOverLimit}
          currentTier={currentTier}
          tierLimit={tierLimit}
          currentSkuCount={currentSkuCount}
          onClose={() => { setShowAddModal(false); setPrefilledBarcode(''); }}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['items'] });
            qc.invalidateQueries({ queryKey: ['posCatalog'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            qc.invalidateQueries({ queryKey: ['planUsage'] });
            setShowAddModal(false);
            setPrefilledBarcode('');
          }}
          onOpenCategoryManager={() => setShowCategoriesModal(true)}
        />
      )}

      {/* Edit Item Modal */}
      {showEditModal && (
        <EditItemModal
          item={showEditModal}
          categories={categories}
          onClose={() => setShowEditModal(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['items'] });
            qc.invalidateQueries({ queryKey: ['posCatalog'] });
            qc.invalidateQueries({ queryKey: ['dashboard'] });
            setShowEditModal(null);
          }}
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

// ── Category Manager Modal ───────────────────────────────────────────────────

function ManageCategoriesModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then((r) => r.data),
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    try {
      await categoriesApi.create({ name: newCatName.trim() });
      toast.success(`Category "${newCatName.trim()}" created!`);
      setNewCatName('');
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Existing items will become uncategorized.`)) return;
    try {
      await categoriesApi.delete(id);
      toast.success(`Category "${name}" deleted`);
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['items'] });
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to delete category');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1100,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(5px)',
    }} onClick={onClose}>
      <div className="glass-card modal-content" style={{ width: 440, padding: 24 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={18} color="rgb(139,92,246)" /> Manage Product Categories
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Add Form */}
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input
            type="text"
            className="input"
            placeholder="New Category Name (e.g. Dairy, Snacks, Beverages)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1, fontSize: '0.85rem' }}
          />
          <button type="submit" className="btn-primary" style={{ padding: '0 16px', flexShrink: 0 }} disabled={isSubmitting || !newCatName.trim()}>
            {isSubmitting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '+ Add'}
          </button>
        </form>

        {/* Categories List */}
        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: 'center' }}><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : categories.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'rgb(161,161,170)', fontSize: '0.82rem' }}>
              No custom categories yet. Add categories like Dairy, Bakery, Electronics to organize your products!
            </div>
          ) : (
            categories.map((cat: any) => (
              <div key={cat.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="badge badge-purple" style={{ fontSize: '0.78rem', fontWeight: 600 }}>{cat.name}</span>
                </div>
                <button
                  onClick={() => handleDelete(cat.id, cat.name)}
                  style={{ background: 'none', border: 'none', color: 'rgb(239,68,68)', cursor: 'pointer', padding: 4 }}
                  title="Delete category"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
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
      <div className="glass-card modal-content" style={{ width: 400, padding: 28 }} onClick={(e) => e.stopPropagation()}>
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
            {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Restocking...</> : 'Restock'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Add Item Modal ────────────────────────────────────────────────────────────

function AddItemModal({
  initialBarcode = '',
  categories = [],
  isOverLimit = false,
  currentTier = 'STARTER',
  tierLimit = 10,
  currentSkuCount = 0,
  onClose,
  onSuccess,
  onOpenCategoryManager,
}: {
  initialBarcode?: string;
  categories: any[];
  isOverLimit?: boolean;
  currentTier?: string;
  tierLimit?: number;
  currentSkuCount?: number;
  onClose: () => void;
  onSuccess: () => void;
  onOpenCategoryManager: () => void;
}) {
  const router = useRouter();
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const { register, handleSubmit, setValue, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: '',
      categoryId: '',
      unit: 'piece',
      mrp: '',
      offerPrice: '',
      taxPercent: '0',
      barcode: initialBarcode,
      initialStock: '0',
    },
  });

  const onSubmit = async (data: any) => {
    if (isOverLimit) {
      toast.error(`Plan limit reached (${currentSkuCount}/${tierLimit} SKUs). Please upgrade to add more products.`);
      return;
    }

    try {
      await itemsApi.create({
        ...data,
        categoryId: data.categoryId || undefined,
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
        <div className="glass-card modal-content" style={{ width: 520, padding: 28, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Add New Product</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Over Limit Warning Banner */}
          {isOverLimit && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 12,
              padding: '14px 16px',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}>
              <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#f87171', marginBottom: 3 }}>
                  Plan Limit Reached ({currentSkuCount} / {tierLimit} SKUs)
                </div>
                <p style={{ fontSize: '0.78rem', color: 'rgb(148, 163, 184)', margin: '0 0 10px 0', lineHeight: 1.4 }}>
                  Your shop has reached the maximum of <strong style={{ color: '#f8fafc' }}>{tierLimit} products</strong> allowed on the <strong style={{ color: '#f8fafc' }}>{currentTier}</strong> plan. Upgrade your plan to unlock more product capacity.
                </p>
                <button
                  type="button"
                  className="btn-primary"
                  style={{
                    fontSize: '0.78rem',
                    padding: '6px 14px',
                    borderRadius: 8,
                    background: 'rgb(22, 163, 74)',
                    fontWeight: 700,
                  }}
                  onClick={() => {
                    onClose();
                    router.push('/subscription');
                  }}
                >
                  ⚡ Upgrade Subscription Plan
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Item / Product Name *</label>
              <input type="text" className="input" placeholder="e.g. Amul Milk 1L" disabled={isOverLimit} {...register('name', { required: true })} />
            </div>

            {/* Category Field */}
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="label" style={{ marginBottom: 0 }}>Product Category</label>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: '#4ade80', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  onClick={onOpenCategoryManager}
                >
                  + Add / Manage Categories
                </button>
              </div>
              <select className="input" disabled={isOverLimit} {...register('categoryId')}>
                <option value="">Select Category (Optional)</option>
                {categories.map((cat: any) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">MRP (₹) *</label>
              <input type="number" className="input" placeholder="0.00" min="0" step="0.01" disabled={isOverLimit} {...register('mrp', { required: true })} />
            </div>
            <div>
              <label className="label">Offer/Selling Price (₹)</label>
              <input type="number" className="input" placeholder="Leave blank = MRP" min="0" step="0.01" disabled={isOverLimit} {...register('offerPrice')} />
            </div>
            <div>
              <label className="label">Unit</label>
              <select className="input" disabled={isOverLimit} {...register('unit')}>
                {['piece', 'kg', 'litre', 'pack', 'box', 'dozen'].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">GST % (Tax)</label>
              <select className="input" disabled={isOverLimit} {...register('taxPercent')}>
                {['0', '5', '12', '18', '28'].map((t) => (
                  <option key={t} value={t}>{t}%</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Barcode (optional)</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Scan or enter barcode"
                  disabled={isOverLimit}
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
                    background: 'rgba(22,163,74,0.12)',
                    border: '1px solid rgba(22,163,74,0.3)',
                    color: '#4ade80',
                  }}
                  disabled={isOverLimit}
                  onClick={() => setShowBarcodeScanner(true)}
                  title="Scan barcode with device camera"
                >
                  <Camera size={16} />
                </button>
              </div>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="label">Initial Stock Quantity</label>
              <input type="number" className="input" placeholder="0" min="0" step="any" disabled={isOverLimit} {...register('initialStock')} />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || isOverLimit}
                style={{
                  opacity: isOverLimit ? 0.5 : 1,
                  cursor: isOverLimit ? 'not-allowed' : 'pointer',
                }}
              >
                {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Adding...</> : '+ Add Product'}
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

// ── Edit Item Modal ───────────────────────────────────────────────────────────

function EditItemModal({
  item,
  categories = [],
  onClose,
  onSuccess,
}: {
  item: any;
  categories: any[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      name: item.name || '',
      categoryId: item.categoryId || '',
      brand: item.brand || '',
      unit: item.unit || 'piece',
      mrp: item.mrp || '',
      offerPrice: item.offerPrice || '',
      taxPercent: item.taxPercent || '0',
      barcode: item.barcode || '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await itemsApi.update(item.id, {
        ...data,
        categoryId: data.categoryId || undefined,
        mrp: Number(data.mrp),
        offerPrice: data.offerPrice ? Number(data.offerPrice) : undefined,
        taxPercent: Number(data.taxPercent),
      });
      toast.success(`Updated ${data.name}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Update failed');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={onClose}>
      <div className="glass-card modal-content" style={{ width: 500, padding: 28, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Edit Product: {item.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Item Name *</label>
            <input type="text" className="input" {...register('name', { required: true })} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Category</label>
            <select className="input" {...register('categoryId')}>
              <option value="">Uncategorized</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">MRP (₹) *</label>
            <input type="number" className="input" step="0.01" {...register('mrp', { required: true })} />
          </div>
          <div>
            <label className="label">Offer Price (₹)</label>
            <input type="number" className="input" step="0.01" {...register('offerPrice')} />
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
            <label className="label">GST %</label>
            <select className="input" {...register('taxPercent')}>
              {['0', '5', '12', '18', '28'].map((t) => (
                <option key={t} value={t}>{t}%</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Barcode</label>
            <input type="text" className="input" {...register('barcode')} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
