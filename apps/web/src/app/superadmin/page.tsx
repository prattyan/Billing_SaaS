'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Store, Users, IndianRupee, Search, Edit3,
  Power, CheckCircle2, AlertTriangle, X, Loader2, CreditCard,
  Plus, Trash2, Phone, Mail, Lock, Building2
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';

export default function SuperAdminDashboardPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('');
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);

  const { data: metrics, isLoading: isLoadingMetrics } = useQuery({
    queryKey: ['superAdminMetrics'],
    queryFn: () => superAdminApi.getMetrics().then((r) => r.data),
  });

  const { data: tenants, isLoading: isLoadingTenants } = useQuery({
    queryKey: ['superAdminTenants', search, selectedPlanFilter],
    queryFn: () => superAdminApi.getTenants({ search, planTier: selectedPlanFilter || undefined }).then((r) => r.data),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      superAdminApi.toggleStatus(id, { isActive }),
    onSuccess: () => {
      toast.success('Shop status updated');
      qc.invalidateQueries({ queryKey: ['superAdminTenants'] });
      qc.invalidateQueries({ queryKey: ['superAdminMetrics'] });
    },
  });

  const deleteShopMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.deleteTenant(id),
    onSuccess: () => {
      toast.success('Shop purged from database');
      qc.invalidateQueries({ queryKey: ['superAdminTenants'] });
      qc.invalidateQueries({ queryKey: ['superAdminMetrics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to delete shop');
    },
  });

  const overridePlanMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      superAdminApi.overridePlan(id, payload),
    onSuccess: () => {
      toast.success('Tenant plan overridden successfully');
      setEditingTenant(null);
      qc.invalidateQueries({ queryKey: ['superAdminTenants'] });
      qc.invalidateQueries({ queryKey: ['superAdminMetrics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to update plan');
    },
  });

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Platform Super Admin</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Live platform metrics · Real-time shop database · Create and manage grocery shops & owners
          </p>
        </div>
        <button
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          onClick={() => setShowCreateShopModal(true)}
        >
          <Plus size={16} /> Onboard New Shop
        </button>
      </div>

      {/* Global Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Total Shops</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(139,92,246)' }}>
            {metrics?.overview?.totalTenants ?? 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgb(52,211,153)', marginTop: 4 }}>{metrics?.overview?.activeTenants ?? 0} active</p>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Gross Invoiced GMV</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(52,211,153)' }}>
            ₹{Number(metrics?.overview?.grossProcessedGMV ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', marginTop: 4 }}>{metrics?.overview?.totalBills ?? 0} customer bills</p>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>SaaS Subscriptions Revenue</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(245,158,11)' }}>
            ₹{Number(metrics?.overview?.saasSubscriptionRevenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', marginTop: 4 }}>Platform revenue collected</p>
        </div>
        <div className="stat-card">
          <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Platform Users</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(59,130,246)' }}>
            {metrics?.overview?.totalUsers ?? 0}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', marginTop: 4 }}>Owners, Cashiers & Admins</p>
        </div>
      </div>

      {/* Filter Controls */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(113,113,122)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search shops by name or slug…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 36 }}
          />
        </div>

        <select
          className="input"
          style={{ width: 180 }}
          value={selectedPlanFilter}
          onChange={(e) => setSelectedPlanFilter(e.target.value)}
        >
          <option value="">All Plan Tiers</option>
          <option value="STARTER">Starter (100 SKUs)</option>
          <option value="GROWTH">Growth (2k SKUs)</option>
          <option value="BUSINESS">Business (5k SKUs)</option>
          <option value="ENTERPRISE">Enterprise (10k SKUs)</option>
        </select>
      </div>

      {/* Tenants Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Shop Name</th>
              <th>Owner Contact</th>
              <th>Plan Tier</th>
              <th>SKU Count</th>
              <th>Total Bills</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoadingTenants ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading tenants…</td></tr>
            ) : tenants?.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'rgb(161,161,170)' }}>
                  <Store size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>No shops in database yet</p>
                  <p style={{ fontSize: '0.8rem', color: 'rgb(113,113,122)', marginBottom: 16 }}>Click &quot;Onboard New Shop&quot; to create your first live shop and owner.</p>
                  <button className="btn-primary" onClick={() => setShowCreateShopModal(true)}>
                    <Plus size={15} /> Onboard New Shop
                  </button>
                </td>
              </tr>
            ) : (
              tenants?.map((t: any) => {
                const owner = t.users?.[0];
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>slug: {t.slug}</div>
                    </td>
                    <td>
                      <div>{owner?.name || '—'}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>{owner?.email} · {owner?.phone || 'No phone'}</div>
                    </td>
                    <td>
                      <span className="badge badge-purple">{t.planTier}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 700 }}>{t.skuCount} SKUs</div>
                    </td>
                    <td>{t._count?.bills ?? 0}</td>
                    <td>
                      <span className={`badge ${t.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {t.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>
                      {format(new Date(t.createdAt), 'dd MMM yyyy')}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          title="Override Plan"
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => setEditingTenant(t)}
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          title={t.isActive ? 'Suspend Shop' : 'Activate Shop'}
                          className={t.isActive ? 'btn-secondary' : 'btn-primary'}
                          style={{ padding: '6px 10px', fontSize: '0.75rem', color: t.isActive ? 'rgb(239,100,100)' : 'white' }}
                          onClick={() => {
                            if (confirm(`${t.isActive ? 'Suspend' : 'Activate'} "${t.name}"?`)) {
                              toggleStatusMutation.mutate({ id: t.id, isActive: !t.isActive });
                            }
                          }}
                        >
                          <Power size={13} />
                        </button>
                        <button
                          title="Purge Shop from Database"
                          className="btn-danger"
                          style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                          onClick={() => {
                            if (confirm(`Permanently delete "${t.name}" and ALL its items, bills, and users?`)) {
                              deleteShopMutation.mutate(t.id);
                            }
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Shop Modal */}
      {showCreateShopModal && (
        <CreateShopModal
          onClose={() => setShowCreateShopModal(false)}
          onSuccess={() => {
            setShowCreateShopModal(false);
            qc.invalidateQueries({ queryKey: ['superAdminTenants'] });
            qc.invalidateQueries({ queryKey: ['superAdminMetrics'] });
          }}
        />
      )}

      {/* Override Plan Modal */}
      {editingTenant && (
        <OverridePlanModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSave={(payload: any) => overridePlanMutation.mutate({ id: editingTenant.id, payload })}
          isPending={overridePlanMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Create Shop Modal ──────────────────────────────────────────────────

function CreateShopModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      shopName: '',
      ownerName: '',
      email: '',
      password: '',
      phone: '',
      planTier: 'STARTER',
      gstin: '',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await superAdminApi.createTenant(data);
      toast.success(`Shop "${data.shopName}" created successfully! Owner login: ${data.email}`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create shop');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', padding: 16,
    }} onClick={onClose}>
      <div className="glass-card animate-fadeIn" style={{ width: '100%', maxWidth: 540, padding: 28, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, rgb(139,92,246), rgb(52,211,153))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={20} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Onboard New Shop</h2>
              <p style={{ fontSize: '0.75rem', color: 'rgb(161,161,170)' }}>Create shop tenant and owner account</p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="label">Shop / Supermarket Name *</label>
            <input type="text" className="input" placeholder="e.g. Metro Grocery Mart" {...register('shopName', { required: true })} />
          </div>

          <div>
            <label className="label">Owner Full Name *</label>
            <input type="text" className="input" placeholder="e.g. Amit Verma" {...register('ownerName', { required: true })} />
          </div>

          <div>
            <label className="label">Owner Mobile Number</label>
            <input type="tel" className="input" placeholder="9876543210" {...register('phone')} />
          </div>

          <div>
            <label className="label">Owner Email *</label>
            <input type="email" className="input" placeholder="owner@shop.com" {...register('email', { required: true })} />
          </div>

          <div>
            <label className="label">Owner Initial Password *</label>
            <input type="password" className="input" placeholder="Minimum 6 characters" {...register('password', { required: true, minLength: 6 })} />
          </div>

          <div>
            <label className="label">Initial Plan Tier</label>
            <select className="input" {...register('planTier')}>
              <option value="STARTER">Starter (100 SKUs - Free)</option>
              <option value="GROWTH">Growth (2,000 SKUs - ₹499/mo)</option>
              <option value="BUSINESS">Business (5,000 SKUs - ₹999/mo)</option>
              <option value="ENTERPRISE">Enterprise (10,000+ SKUs - ₹1,999/mo)</option>
            </select>
          </div>

          <div>
            <label className="label">GSTIN (Optional)</label>
            <input type="text" className="input" placeholder="e.g. 29ABCDE1234F1Z5" {...register('gstin')} />
          </div>

          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating Shop...</> : '✓ Create & Onboard Shop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Override Plan Modal ────────────────────────────────────────────────

function OverridePlanModal({ tenant, onClose, onSave, isPending }: any) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      planTier: tenant.planTier,
      subscriptionStatus: tenant.subscriptionStatus,
    },
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: 16,
    }} onClick={onClose}>
      <div className="glass-card animate-fadeIn" style={{ width: 440, padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Override Plan: {tenant.name}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Plan Tier</label>
            <select className="input" {...register('planTier')}>
              <option value="STARTER">Starter (100 SKUs - Free)</option>
              <option value="GROWTH">Growth (2,000 SKUs)</option>
              <option value="BUSINESS">Business (5,000 SKUs)</option>
              <option value="ENTERPRISE">Enterprise (10,000+ SKUs)</option>
            </select>
          </div>
          <div>
            <label className="label">Subscription Status</label>
            <select className="input" {...register('subscriptionStatus')}>
              <option value="ACTIVE">ACTIVE</option>
              <option value="GRACE">GRACE</option>
              <option value="EXPIRED">EXPIRED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending}>
              {isPending ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : 'Save Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
