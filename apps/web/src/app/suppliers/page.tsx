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
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Suppliers & Purchase Orders</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Manage wholesale vendor contacts & purchase orders with auto-restock
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn-secondary" onClick={() => setShowAddSupplierModal(true)}>
            <Plus size={15} /> Add Supplier
          </button>
          <button className="btn-primary" onClick={() => setShowCreatePoModal(true)}>
            <FileText size={15} /> Create Purchase Order
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 24 }}>
        <button
          onClick={() => setActiveTab('suppliers')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === 'suppliers' ? 'rgba(139,92,246,0.15)' : 'transparent',
            color: activeTab === 'suppliers' ? 'rgb(167,139,250)' : 'rgb(161,161,170)',
            fontWeight: activeTab === 'suppliers' ? 700 : 500, fontSize: '0.875rem',
          }}
        >
          <Truck size={16} /> Suppliers Directory ({suppliers?.length ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('pos')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: activeTab === 'pos' ? 'rgba(139,92,246,0.15)' : 'transparent',
            color: activeTab === 'pos' ? 'rgb(167,139,250)' : 'rgb(161,161,170)',
            fontWeight: activeTab === 'pos' ? 700 : 500, fontSize: '0.875rem',
          }}
        >
          <FileText size={16} /> Purchase Orders ({purchaseOrders?.length ?? 0})
        </button>
      </div>

      {/* ── TAB 1: Suppliers Directory ─────────────────────────────────── */}
      {activeTab === 'suppliers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {isLoadingSuppliers ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 160 }} />)
          ) : suppliers?.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: 48, color: 'rgb(113,113,122)' }}>
              <Truck size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
              No suppliers added yet. Click &quot;Add Supplier&quot; to begin.
            </div>
          ) : (
            suppliers?.map((s: any) => (
              <div key={s.id} className="card animate-fadeIn" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{s.name}</h3>
                    {s.gstin && <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>GSTIN: {s.gstin}</div>}
                  </div>
                  <span className="badge badge-purple">{s._count?.items ?? 0} items supplied</span>
                </div>

                <div className="divider" style={{ margin: 0 }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.8rem', color: 'rgb(161,161,170)' }}>
                  {s.contact && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Phone size={13} color="rgb(113,113,122)" /> {s.contact}
                    </div>
                  )}
                  {s.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={13} color="rgb(113,113,122)" /> {s.email}
                    </div>
                  )}
                  {s.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <MapPin size={13} color="rgb(113,113,122)" /> {s.address}
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
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>PO Number</th>
                <th>Supplier</th>
                <th>Created Date</th>
                <th>Items Count</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingPos ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading purchase orders…</td></tr>
              ) : purchaseOrders?.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'rgb(113,113,122)' }}>No purchase orders created yet</td></tr>
              ) : (
                purchaseOrders?.map((po: any) => (
                  <tr key={po.id}>
                    <td><code style={{ fontWeight: 700, color: 'rgb(167,139,250)' }}>PO-{po.id.slice(-6).toUpperCase()}</code></td>
                    <td style={{ fontWeight: 600 }}>{po.supplier?.name}</td>
                    <td style={{ fontSize: '0.8rem' }}>{format(new Date(po.createdAt), 'dd MMM yyyy')}</td>
                    <td>{po._count?.items ?? 0} items</td>
                    <td style={{ fontWeight: 700, color: 'rgb(52,211,153)' }}>
                      ₹{Number(po.totalAmount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${po.status === 'RECEIVED' ? 'badge-success' : 'badge-warning'}`}>
                        {po.status}
                      </span>
                    </td>
                    <td>
                      {po.status === 'DRAFT' || po.status === 'SENT' ? (
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                          disabled={receivePoMutation.isPending}
                          onClick={() => receivePoMutation.mutate(po.id)}
                        >
                          <ArrowDownToLine size={13} /> Receive & Restock
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'rgb(52,211,153)' }}>
                          <CheckCircle2 size={13} style={{ display: 'inline', marginRight: 4 }} />
                          Received {po.receivedAt ? format(new Date(po.receivedAt), 'dd/MM/yy') : ''}
                        </span>
                      )}
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
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: 16,
    }} onClick={onClose}>
      <div className="glass-card" style={{ width: 440, padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Add New Supplier</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
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
            <input type="text" className="input" placeholder="City Market, Bangalore" {...register('address')} />
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
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: 16,
    }} onClick={onClose}>
      <div className="glass-card" style={{ width: 620, maxHeight: '90vh', padding: 28, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create Purchase Order</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
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
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
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
                  <input type="number" className="input" placeholder="Unit Price ₹" min="0" step="0.01" {...register(`items.${idx}.unitPrice` as const, { required: true })} />
                  <button type="button" onClick={() => remove(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(239,100,100)' }}>
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

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create PO (Draft)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
