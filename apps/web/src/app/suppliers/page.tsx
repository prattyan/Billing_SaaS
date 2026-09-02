'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi, itemsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Truck, Plus, Phone, Mail, MapPin, FileText, CheckCircle2,
  Package, X, Loader2, IndianRupee, ArrowDownToLine
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm, useFieldArray } from 'react-hook-form';

export default function SuppliersPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'suppliers' | 'pos'>('suppliers');
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showCreatePoModal, setShowCreatePoModal] = useState(false);

  const { data: suppliers, isLoading: isLoadingSuppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.list().then((r) => r.data),
  });

  const { data: purchaseOrders, isLoading: isLoadingPos } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: () => suppliersApi.listPos().then((r) => r.data),
    enabled: activeTab === 'pos',
  });

  const receivePoMutation = useMutation({
    mutationFn: (poId: string) => suppliersApi.receivePo(poId),
    onSuccess: () => {
      toast.success('Items received against PO & inventory stock auto-updated!');
      qc.invalidateQueries({ queryKey: ['purchaseOrders'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to receive PO');
    },
  });

  return (
    <div className="page-container" style={{ padding: '32px 36px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>Suppliers & Purchase Orders</h1>
          <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.875rem' }}>
            Manage wholesale vendor contacts & purchase orders with auto-restock
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }} onClick={() => setShowAddSupplierModal(true)}>
            <Plus size={15} /> Add Supplier
          </button>
          <button className="btn-primary" style={{ padding: '8px 20px', fontSize: '0.85rem' }} onClick={() => setShowCreatePoModal(true)}>
            <FileText size={15} /> New PO
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgb(var(--border-rgb))', paddingBottom: 12, marginBottom: 24, overflowX: 'auto' }}>
        <button
          onClick={() => setActiveTab('suppliers')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: activeTab === 'suppliers' ? 'rgb(var(--color-primary))' : 'rgb(var(--surface-2))',
            color: activeTab === 'suppliers' ? '#ffffff' : 'rgb(var(--text-secondary))',
            fontWeight: activeTab === 'suppliers' ? 700 : 500, fontSize: '0.85rem',
            transition: 'all 0.15s ease',
          }}
        >
          <Truck size={15} /> Suppliers Directory ({suppliers?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: activeTab === 'pos' ? 'rgb(var(--color-primary))' : 'rgb(var(--surface-2))',
            color: activeTab === 'pos' ? '#ffffff' : 'rgb(var(--text-secondary))',
            fontWeight: activeTab === 'pos' ? 700 : 500, fontSize: '0.85rem',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={15} /> Purchase Orders ({purchaseOrders?.length ?? 0})
        </button>
      </div>

      {/* ── TAB 1: Suppliers Directory ─────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 18 }}>
          {isLoadingSuppliers ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: 16 }} />)
          ) : suppliers?.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'rgb(var(--text-secondary))' }}>
              <Truck size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
              No suppliers added yet. Click &quot;Add Supplier&quot; to begin.
            </div>
          ) : (
            suppliers?.map((s: any) => (
              <div key={s.id} className="card animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 22, borderRadius: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 2 }}>{s.name}</h3>
                    {s.gstin && <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))' }}>GSTIN: {s.gstin}</div>}
                  </div>
                  <span className="badge badge-purple" style={{ fontSize: '0.74rem' }}>{s._count?.items ?? 0} items supplied</span>
                </div>

                <div className="divider" style={{ margin: 0 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', color: 'rgb(var(--text-secondary))' }}>
                  {s.contact && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone size={13} color="rgb(var(--text-muted))" /> {s.contact}
                    </div>
                  )}
                  {s.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Mail size={13} color="rgb(var(--text-muted))" /> {s.email}
                    </div>
                  )}
                  {s.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <MapPin size={13} color="rgb(var(--text-muted))" /> {s.address}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB 2: Purchase Orders ────────────────────────────────────── */}
      {activeTab === 'pos' && (
        <div className="table-wrapper desktop-table">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Created Date</th>
                <th>Items Count</th>
                <th>Total Value</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPos ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading purchase orders…</td></tr>
              ) : purchaseOrders?.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'rgb(var(--text-secondary))' }}>No purchase orders created yet</td></tr>
              ) : (
                purchaseOrders?.map((po: any) => (
                  <tr key={po.id}>
                    <td><code style={{ fontWeight: 700, color: 'rgb(var(--color-primary-dark))', fontFamily: 'monospace' }}>PO-{po.id.slice(-6).toUpperCase()}</code></td>
                    <td style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>{po.supplier?.name}</td>
                    <td style={{ fontSize: '0.82rem', color: 'rgb(var(--text-secondary))' }}>{format(new Date(po.createdAt), 'dd MMM yyyy')}</td>
                    <td>{po._count?.items ?? 0} items</td>
                    <td style={{ fontWeight: 700, color: 'rgb(var(--color-primary-dark))' }}>
                      ${Number(po.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${po.status === 'RECEIVED' ? 'badge-success' : 'badge-warning'}`}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {po.status === 'DRAFT' || po.status === 'SENT' ? (
                          <button
                            className="btn-primary"
                            style={{ padding: '6px 14px', fontSize: '0.75rem', borderRadius: 999 }}
                            disabled={receivePoMutation.isPending}
                            onClick={() => receivePoMutation.mutate(po.id)}
                          >
                            <ArrowDownToLine size={13} /> Receive & Restock
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'rgb(var(--color-primary-dark))', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <CheckCircle2 size={14} />
                            Received {po.receivedAt ? format(new Date(po.receivedAt), 'dd/MM/yy') : ''}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddSupplierModal && (
        <AddSupplierModal
          onClose={() => setShowAddSupplierModal(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setShowAddSupplierModal(false); }}
        />
      )}

      {/* Create PO Modal */}
      {showCreatePoModal && (
        <CreatePoModal
          suppliers={suppliers ?? []}
          onClose={() => setShowCreatePoModal(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['purchaseOrders'] }); setShowCreatePoModal(false); }}
        />
      )}
    </div>
  );
}

// ── Modals ─────────────────────────────────────────────────────────────

function AddSupplierModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async (data: any) => {
    try {
      await suppliersApi.create(data);
      toast.success('Supplier added successfully');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to add supplier');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', padding: 16,
    }} onClick={onClose}>
      <div className="card modal-content animate-fadeIn" style={{ width: '100%', maxWidth: 440, padding: 28, background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>Add New Supplier</h2>
          <button onClick={onClose} style={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgb(var(--text-secondary))' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Company / Supplier Name *</label>
            <input type="text" className="input" placeholder="e.g. Metro Wholesale" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Contact Phone</label>
            <input type="text" className="input" placeholder="9876543210" {...register('contact')} />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" className="input" placeholder="vendor@domain.com" {...register('email')} />
          </div>
          <div>
            <label className="label">GSTIN</label>
            <input type="text" className="input" placeholder="29ABCDE1234F1Z5" {...register('gstin')} />
          </div>
          <div>
            <label className="label">Address / Location</label>
            <input type="text" className="input" placeholder="City Market, Sector 4" {...register('address')} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : '+ Save Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreatePoModal({ suppliers, onClose, onSuccess }: { suppliers: any[]; onClose: () => void; onSuccess: () => void }) {
  const { data: items } = useQuery({
    queryKey: ['allItemsList'],
    queryFn: () => itemsApi.list({ limit: 100 }).then((r) => r.data.items ?? []),
  });

  const { register, control, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      supplierId: suppliers[0]?.id ?? '',
      notes: '',
      items: [{ itemId: '', quantity: 10, unitPrice: 50 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const onSubmit = async (data: any) => {
    try {
      await suppliersApi.createPo({
        supplierId: data.supplierId,
        notes: data.notes,
        items: data.items.map((i: any) => ({
          itemId: i.itemId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
        })),
      });
      toast.success('Purchase Order created in Draft status');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create PO');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', padding: 16,
    }} onClick={onClose}>
      <div className="card modal-content animate-fadeIn" style={{ width: '100%', maxWidth: 620, maxHeight: '90vh', padding: 28, overflowY: 'auto', background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>Create Purchase Order</h2>
          <button onClick={onClose} style={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgb(var(--text-secondary))' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="label">Select Supplier *</label>
            <select className="input" {...register('supplierId', { required: true })}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.contact || 'No phone'})</option>
              ))}
            </select>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <label className="label" style={{ margin: 0 }}>Order Items</label>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: '4px 12px', fontSize: '0.75rem', borderRadius: 8 }}
                onClick={() => append({ itemId: items?.[0]?.id ?? '', quantity: 10, unitPrice: 50 })}
              >
                + Add Item Row
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fields.map((field, idx) => (
                <div key={field.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center' }}>
                  <select className="input" {...register(`items.${idx}.itemId` as const, { required: true })}>
                    <option value="">Select Item…</option>
                    {items?.map((it: any) => (
                      <option key={it.id} value={it.id}>{it.name} ({it.unit})</option>
                    ))}
                  </select>
                  <input type="number" className="input" placeholder="Qty" min="1" {...register(`items.${idx}.quantity` as const, { required: true })} />
                  <input type="number" className="input" placeholder="Unit Price $" min="0" step="0.01" {...register(`items.${idx}.unitPrice` as const, { required: true })} />
                  <button type="button" onClick={() => remove(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 4 }}>
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Notes / Instructions</label>
            <input type="text" className="input" placeholder="e.g. Deliver by Friday morning" {...register('notes')} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Generating PO...</> : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
