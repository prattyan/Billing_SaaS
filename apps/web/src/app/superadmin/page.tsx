'use client';

import { useState, useEffect, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { superAdminApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ShieldCheck, Store, Users, IndianRupee, Search, Edit3,
  Power, CheckCircle2, AlertTriangle, X, Loader2, CreditCard,
  Plus, Trash2, Phone, Mail, Lock, Building2, Clock, CheckCheck, XCircle,
  ArrowRight, Sparkles, AlertCircle, RotateCcw, ShieldAlert, History, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useSearchParams, useRouter } from 'next/navigation';

function SuperAdminContent() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'shops' | 'approvals' | 'recovery'>(
    tabParam === 'approvals' ? 'approvals' : tabParam === 'recovery' ? 'recovery' : 'shops'
  );
  const [search, setSearch] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState('');
  const [editingTenant, setEditingTenant] = useState<any | null>(null);
  const [showCreateShopModal, setShowCreateShopModal] = useState(false);

  useEffect(() => {
    if (tabParam === 'approvals') {
      setActiveTab('approvals');
    } else if (tabParam === 'recovery') {
      setActiveTab('recovery');
    } else if (tabParam === 'shops') {
      setActiveTab('shops');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'shops' | 'approvals' | 'recovery') => {
    setActiveTab(tab);
    router.push(`/superadmin?tab=${tab}`);
  };

  const { data: metrics } = useQuery({
    queryKey: ['superAdminMetrics'],
    queryFn: () => superAdminApi.getMetrics().then((r) => r.data),
  });

  const { data: tenants = [], isLoading: isLoadingTenants } = useQuery({
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
      toast.success('Shop permanently purged from database');
      qc.invalidateQueries({ queryKey: ['superAdminTenants'] });
      qc.invalidateQueries({ queryKey: ['superAdminMetrics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to delete shop');
    },
  });

  const restoreShopMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.restoreTenant(id),
    onSuccess: (res: any) => {
      toast.success(res.data?.message ?? 'Shop account successfully restored!');
      qc.invalidateQueries({ queryKey: ['superAdminTenants'] });
      qc.invalidateQueries({ queryKey: ['superAdminMetrics'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to restore shop');
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

  const { data: pendingApprovals = [], isLoading: isLoadingPending } = useQuery({
    queryKey: ['pendingSubscriptions'],
    queryFn: () => superAdminApi.getPendingApprovals().then((r) => r.data),
    refetchInterval: 5000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.approveUpgrade(id),
    onSuccess: (res: any) => {
      toast.success(res.data?.message ?? 'Plan approved and activated!');
      qc.invalidateQueries({ queryKey: ['pendingSubscriptions'] });
      qc.invalidateQueries({ queryKey: ['superAdminTenants'] });
      qc.invalidateQueries({ queryKey: ['superAdminMetrics'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to approve'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => superAdminApi.rejectUpgrade(id, 'Rejected by super admin'),
    onSuccess: (res: any) => {
      toast.success(res.data?.message ?? 'Upgrade request rejected');
      qc.invalidateQueries({ queryKey: ['pendingSubscriptions'] });
    },
    onError: (err: any) => toast.error(err.response?.data?.message ?? 'Failed to reject'),
  });

  const activeTenantsList = tenants.filter((t: any) => !t.isDeleted);
  const deletedTenantsList = tenants.filter((t: any) => t.isDeleted);

  const PLAN_PRICES: Record<string, string> = {
    GROWTH: '₹10,000 / year',
    BUSINESS: '₹20,000 / year',
    ENTERPRISE: '₹30,000 / year',
  };

  const PLAN_LIMITS: Record<string, number> = {
    STARTER: 10,
    GROWTH: 100,
    BUSINESS: 500,
    ENTERPRISE: 2000,
  };

  return (
    <div className="page-container" style={{ padding: '32px 36px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>Platform Super Admin</h1>
          <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.875rem' }}>
            Live platform metrics · Tenant management · 10-day recovery queue & subscription approvals
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

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgb(var(--border-rgb))', marginBottom: 28, overflowX: 'auto', paddingBottom: 12 }}>
        <button
          onClick={() => handleTabChange('shops')}
          style={{
            padding: '8px 18px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'shops' ? 700 : 500,
            color: activeTab === 'shops' ? 'rgb(var(--color-primary-dark))' : 'rgb(var(--text-secondary))',
            background: activeTab === 'shops' ? 'rgb(var(--color-primary-light))' : 'transparent',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Store size={15} />
          <span>Active Shops ({activeTenantsList.length})</span>
        </button>

        <button
          onClick={() => handleTabChange('approvals')}
          style={{
            padding: '8px 18px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'approvals' ? 700 : 500,
            color: activeTab === 'approvals' ? '#b45309' : 'rgb(var(--text-secondary))',
            background: activeTab === 'approvals' ? 'rgba(234, 179, 8, 0.12)' : 'transparent',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={15} />
          <span>Subscription Approvals</span>
          {pendingApprovals?.length > 0 && (
            <span style={{
              background: '#b45309',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '1px 7px',
              borderRadius: 999,
            }}>
              {pendingApprovals.length}
            </span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('recovery')}
          style={{
            padding: '8px 18px',
            fontSize: '0.86rem',
            fontWeight: activeTab === 'recovery' ? 700 : 500,
            color: activeTab === 'recovery' ? '#dc2626' : 'rgb(var(--text-secondary))',
            background: activeTab === 'recovery' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
          }}
        >
          <RotateCcw size={15} />
          <span>10-Day Recovery Queue</span>
          {deletedTenantsList.length > 0 && (
            <span style={{
              background: '#dc2626',
              color: '#ffffff',
              fontSize: '0.68rem',
              fontWeight: 900,
              padding: '1px 7px',
              borderRadius: 999,
            }}>
              {deletedTenantsList.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: 10-DAY RECOVERY QUEUE ── */}
      {activeTab === 'recovery' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>10-Day Deleted Shop Recovery Queue</h2>
            <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.82rem' }}>
              Shops deleted by owners are retained safely for 10 days before permanent purging. You can recover an account and all its customer & biller data in 1 click.
            </p>
          </div>

          {deletedTenantsList.length === 0 ? (
            <div className="card" style={{ padding: '60px 24px', textAlign: 'center', background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 16 }}>
              <CheckCircle2 size={44} color="rgb(var(--color-primary-dark))" style={{ margin: '0 auto 14px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>Recovery Queue is Empty</h3>
              <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.84rem' }}>
                No shops are currently scheduled for deletion. All tenant accounts are in active standing.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {deletedTenantsList.map((t: any) => {
                const owner = t.users?.[0];
                const schedDate = t.scheduledDeletionAt ? new Date(t.scheduledDeletionAt) : new Date(Date.now() + 10 * 86400000);
                const diffMs = schedDate.getTime() - Date.now();
                const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

                return (
                  <div
                    key={t.id}
                    className="card animate-fadeIn"
                    style={{
                      padding: '20px 24px',
                      background: '#ffffff',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 18,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'rgb(var(--text-primary))' }}>
                          {t.name}
                        </span>
                        <span style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          color: '#dc2626',
                          fontSize: '0.74rem',
                          fontWeight: 800,
                          padding: '4px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(239,68,68,0.25)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                        }}>
                          <Clock size={12} /> {daysLeft} Day{daysLeft !== 1 ? 's' : ''} Remaining for Recovery
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'rgb(var(--text-muted))' }}>
                          (Scheduled deletion: {format(schedDate, 'dd MMM yyyy')})
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: 'rgb(var(--text-secondary))' }}>
                        <div>Owner: <strong style={{ color: 'rgb(var(--text-primary))' }}>{owner?.name || 'Owner'}</strong> ({owner?.email})</div>
                        <div>Preserved Bills: <strong style={{ color: 'rgb(var(--text-primary))' }}>{t._count?.bills ?? 0}</strong></div>
                        <div>Preserved Items: <strong style={{ color: 'rgb(var(--text-primary))' }}>{t._count?.items ?? 0} SKUs</strong></div>
                        <div>Preserved Staff: <strong style={{ color: 'rgb(var(--text-primary))' }}>{t._count?.users ?? 0}</strong></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      <button
                        className="btn-primary"
                        style={{
                          fontSize: '0.84rem',
                          padding: '8px 20px',
                          borderRadius: 999,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        disabled={restoreShopMutation.isPending}
                        onClick={() => {
                          if (confirm(`Restore and reactivate shop "${t.name}"?`)) {
                            restoreShopMutation.mutate(t.id);
                          }
                        }}
                      >
                        <RefreshCw size={14} /> Restore Shop
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SUBSCRIPTION APPROVALS ── */}
      {activeTab === 'approvals' && (
        <div>
          <div style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
              Pending Subscription Approvals
            </h2>
            <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.84rem' }}>
              Review manual UPI/Bank transfer subscription payments submitted by shop owners. Approve to immediately upgrade their plan limits.
            </p>
          </div>

          {isLoadingPending ? (
            <div className="card" style={{ padding: 48, textAlign: 'center', color: 'rgb(var(--text-secondary))', background: '#ffffff', borderRadius: 16 }}>
              <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
              <p>Checking pending approval queue...</p>
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="card" style={{ padding: '60px 24px', textAlign: 'center', background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 16 }}>
              <CheckCircle2 size={44} color="rgb(var(--color-primary-dark))" style={{ margin: '0 auto 14px', opacity: 0.8 }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>All Caught Up!</h3>
              <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.84rem' }}>
                There are currently no pending subscription upgrade requests waiting for approval.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {pendingApprovals.map((req: any) => {
                const curTier = req.tenant?.planTier || 'STARTER';
                const newTier = req.requestedPlanTier || 'GROWTH';
                const owner = req.tenant?.users?.[0];

                return (
                  <div
                    key={req.id}
                    className="card animate-fadeIn"
                    style={{
                      padding: '20px 24px',
                      background: '#ffffff',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 18,
                      boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 280 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'rgb(var(--text-primary))' }}>
                          {req.tenant?.name}
                        </span>
                        <span style={{
                          background: 'rgb(var(--surface-2))',
                          color: 'rgb(var(--text-secondary))',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          border: '1px solid rgb(var(--border-rgb))',
                        }}>
                          Current: {curTier} ({PLAN_LIMITS[curTier] ?? 10} SKUs)
                        </span>
                        <ArrowRight size={14} color="#d97706" />
                        <span style={{
                          background: 'rgb(var(--color-primary-light))',
                          color: 'rgb(var(--color-primary-dark))',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: 999,
                          border: '1px solid rgba(78, 159, 118, 0.3)',
                        }}>
                          Requested: {newTier} ({PLAN_LIMITS[newTier] ?? 100} SKUs)
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.78rem', color: 'rgb(var(--text-secondary))' }}>
                        <div>Owner: <strong style={{ color: 'rgb(var(--text-primary))' }}>{owner?.name || 'Owner'}</strong> ({owner?.email})</div>
                        {owner?.phone && <div>Phone: <strong style={{ color: 'rgb(var(--text-primary))' }}>{owner.phone}</strong></div>}
                        <div>Plan Price: <strong style={{ color: 'rgb(var(--color-primary-dark))' }}>{PLAN_PRICES[newTier] ?? `$${Number(req.amount).toLocaleString('en-US')}`}</strong></div>
                        <div>Date: <strong style={{ color: 'rgb(var(--text-primary))' }}>{format(new Date(req.createdAt), 'dd MMM yyyy, hh:mm a')}</strong></div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                      <button
                        className="btn-secondary"
                        style={{
                          fontSize: '0.84rem',
                          padding: '8px 16px',
                          borderRadius: 999,
                          color: '#dc2626',
                          borderColor: 'rgba(239, 68, 68, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(req.id)}
                      >
                        <XCircle size={15} />
                        <span>Reject</span>
                      </button>
                      <button
                        className="btn-primary"
                        style={{
                          fontSize: '0.84rem',
                          padding: '8px 20px',
                          borderRadius: 999,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                        disabled={approveMutation.isPending}
                        onClick={() => approveMutation.mutate(req.id)}
                      >
                        {approveMutation.isPending ? (
                          <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Activating...</>
                        ) : (
                          <><CheckCheck size={16} /> Approve & Activate Plan</>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: TENANT SHOPS ── */}
      {activeTab === 'shops' && (
        <div>
          {/* Recovery Queue Alert if any deleted shops */}
          {deletedTenantsList.length > 0 && (
            <div
              className="card"
              style={{
                marginBottom: 20,
                padding: '12px 18px',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                background: 'rgba(239, 68, 68, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                cursor: 'pointer',
              }}
              onClick={() => handleTabChange('recovery')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <RotateCcw size={16} color="#f87171" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f87171' }}>
                  {deletedTenantsList.length} Shop{deletedTenantsList.length > 1 ? 's' : ''} in 10-Day Safe Recovery Queue
                </span>
              </div>
              <button
                className="btn-secondary"
                style={{ fontSize: '0.76rem', padding: '5px 12px', borderColor: 'rgba(239,68,68,0.4)', color: '#f87171' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabChange('recovery');
                }}
              >
                View Recovery Queue →
              </button>
            </div>
          )}

          {/* Pending Approvals Notice Banner if any exist */}
          {pendingApprovals?.length > 0 && (
            <div
              className="card"
              style={{
                marginBottom: 24,
                padding: '14px 20px',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                background: 'rgba(251, 191, 36, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                cursor: 'pointer',
              }}
              onClick={() => handleTabChange('approvals')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={18} color="#fbbf24" />
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24' }}>
                  {pendingApprovals.length} Subscription Upgrade Request{pendingApprovals.length > 1 ? 's' : ''} Pending Approval
                </span>
              </div>
              <button
                className="btn-primary"
                style={{ fontSize: '0.78rem', padding: '6px 14px', background: '#f59e0b', color: '#000000', fontWeight: 800 }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleTabChange('approvals');
                }}
              >
                Review Approvals Queue →
              </button>
            </div>
          )}

          {/* Global Stat Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(100,116,139)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Active Shops</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80' }}>
                {metrics?.overview?.activeTenants ?? activeTenantsList.length}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgb(100,116,139)', marginTop: 4 }}>{tenants.length} total registered</p>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(100,116,139)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Gross Invoiced GMV</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#4ade80' }}>
                ₹{Number(metrics?.overview?.grossProcessedGMV ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgb(100,116,139)', marginTop: 4 }}>{metrics?.overview?.totalBills ?? 0} customer bills</p>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(100,116,139)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>SaaS Subscriptions Revenue</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24' }}>
                ₹{Number(metrics?.overview?.saasSubscriptionRevenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgb(100,116,139)', marginTop: 4 }}>Platform revenue collected</p>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(100,116,139)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Platform Users</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#60a5fa' }}>
                {metrics?.overview?.totalUsers ?? 0}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgb(100,116,139)', marginTop: 4 }}>Owners, Cashiers & Admins</p>
            </div>
          </div>

          {/* Filter Controls */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(100,116,139)' }} />
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
              style={{ width: 200 }}
              value={selectedPlanFilter}
              onChange={(e) => setSelectedPlanFilter(e.target.value)}
            >
              <option value="">All Plan Tiers</option>
              <option value="STARTER">Starter (10 SKUs)</option>
              <option value="GROWTH">Growth (100 SKUs)</option>
              <option value="BUSINESS">Business (500 SKUs)</option>
              <option value="ENTERPRISE">Enterprise (2,000+ SKUs)</option>
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
                ) : activeTenantsList.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'rgb(100,116,139)' }}>
                      <Store size={36} style={{ display: 'block', margin: '0 auto 12px', opacity: 0.4 }} />
                      <p style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 6 }}>No active shops found</p>
                      <p style={{ fontSize: '0.8rem', color: 'rgb(100,116,139)', marginBottom: 16 }}>Click &quot;Onboard New Shop&quot; to create a new shop and owner.</p>
                      <button className="btn-primary" onClick={() => setShowCreateShopModal(true)} style={{ background: 'rgb(22, 163, 74)' }}>
                        <Plus size={15} /> Onboard New Shop
                      </button>
                    </td>
                  </tr>
                ) : (
                  activeTenantsList.map((t: any) => {
                    const owner = t.users?.[0];
                    return (
                      <tr key={t.id}>
                        <td>
                          <div style={{ fontWeight: 700 }}>{t.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgb(100,116,139)' }}>slug: {t.slug}</div>
                        </td>
                        <td>
                          <div>{owner?.name || '—'}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgb(100,116,139)' }}>{owner?.email} · {owner?.phone || 'No phone'}</div>
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
                        <td style={{ fontSize: '0.75rem', color: 'rgb(100,116,139)' }}>
                          {format(new Date(t.createdAt), 'dd MMM yyyy')}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              onClick={() => setEditingTenant(t)}
                              title="Override Subscription Plan"
                            >
                              <Edit3 size={13} /> Edit Plan
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem', color: t.isActive ? '#f87171' : '#4ade80' }}
                              onClick={() => toggleStatusMutation.mutate({ id: t.id, isActive: !t.isActive })}
                              title={t.isActive ? 'Suspend shop' : 'Activate shop'}
                            >
                              <Power size={13} />
                            </button>
                            <button
                              className="btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem', color: '#f87171' }}
                              onClick={() => {
                                if (confirm(`Are you sure you want to permanently delete "${t.name}"?`)) {
                                  deleteShopMutation.mutate(t.id);
                                }
                              }}
                              title="Purge shop"
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
        </div>
      )}

      {/* Override Plan Modal */}
      {editingTenant && (
        <OverridePlanModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSave={(payload) => overridePlanMutation.mutate({ id: editingTenant.id, payload })}
          isPending={overridePlanMutation.isPending}
        />
      )}

      {/* Onboard New Shop Modal */}
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
    </div>
  );
}

export default function SuperAdminDashboardPage() {
  return (
    <Suspense fallback={<div style={{ padding: 24, textAlign: 'center' }}><Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} /></div>}>
      <SuperAdminContent />
    </Suspense>
  );
}

// ── Override Plan Modal ───────────────────────────────────────────────────────

function OverridePlanModal({
  tenant,
  onClose,
  onSave,
  isPending,
}: {
  tenant: any;
  onClose: () => void;
  onSave: (payload: any) => void;
  isPending: boolean;
}) {
  const { register, handleSubmit } = useForm({
    defaultValues: {
      planTier: tenant.planTier,
      status: tenant.subscriptionStatus || 'ACTIVE',
      graceDays: 7,
    },
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card modal-content animate-fadeIn" style={{ width: '100%', maxWidth: 440, padding: 28, background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>Override Plan: {tenant.name}</h2>
          <button onClick={onClose} style={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 8, padding: 6, color: 'rgb(var(--text-secondary))', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Plan Tier</label>
            <select className="input" {...register('planTier')}>
              <option value="STARTER">Starter — Free (10 SKUs)</option>
              <option value="GROWTH">Growth — $100/yr (100 SKUs)</option>
              <option value="BUSINESS">Business — $200/yr (500 SKUs)</option>
              <option value="ENTERPRISE">Enterprise — $300/yr (2,000+ SKUs)</option>
            </select>
          </div>

          <div>
            <label className="label">Subscription Status</label>
            <select className="input" {...register('status')}>
              <option value="ACTIVE">ACTIVE (Normal Operation)</option>
              <option value="GRACE">GRACE (Over Limit Warning)</option>
              <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
              <option value="EXPIRED">EXPIRED (Suspended)</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="label">Extend Grace Period (Days)</label>
            <input type="number" className="input" placeholder="7" min="0" {...register('graceDays')} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isPending} style={{ borderRadius: 999, padding: '8px 20px' }}>
              {isPending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply Override'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Onboard Shop Modal ────────────────────────────────────────────────────────

function CreateShopModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm({
    defaultValues: {
      shopName: '',
      slug: '',
      ownerName: '',
      ownerEmail: '',
      ownerPhone: '',
      ownerPassword: '',
      planTier: 'STARTER',
    },
  });

  const onSubmit = async (data: any) => {
    try {
      await superAdminApi.createTenant(data);
      toast.success(`Shop "${data.shopName}" onboarded successfully!`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create shop');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backdropFilter: 'blur(6px)', padding: 16,
      }}
      onClick={onClose}
    >
      <div className="card modal-content animate-fadeIn" style={{ width: '100%', maxWidth: 500, padding: 28, maxHeight: '90vh', overflowY: 'auto', background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={20} color="rgb(var(--color-primary-dark))" />
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>Onboard New Shop & Owner</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 8, padding: 6, color: 'rgb(var(--text-secondary))', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Shop Name *</label>
            <input type="text" className="input" placeholder="e.g. Metro Supermarket" {...register('shopName', { required: true })} />
          </div>

          <div>
            <label className="label">Custom Subdomain / Slug (optional)</label>
            <input type="text" className="input" placeholder="e.g. metro-supermarket" {...register('slug')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="label">Owner Full Name *</label>
              <input type="text" className="input" placeholder="John Doe" {...register('ownerName', { required: true })} />
            </div>
            <div>
              <label className="label">Owner Phone</label>
              <input type="text" className="input" placeholder="9876543210" {...register('ownerPhone')} />
            </div>
          </div>

          <div>
            <label className="label">Owner Login Email *</label>
            <input type="email" className="input" placeholder="owner@store.com" {...register('ownerEmail', { required: true })} />
          </div>

          <div>
            <label className="label">Temporary Password *</label>
            <input type="password" className="input" placeholder="Min 8 characters" {...register('ownerPassword', { required: true, minLength: 8 })} />
          </div>

          <div>
            <label className="label">Assigned Plan Tier</label>
            <select className="input" {...register('planTier')}>
              <option value="STARTER">Starter — Free (10 SKUs)</option>
              <option value="GROWTH">Growth — $100/yr (100 SKUs)</option>
              <option value="BUSINESS">Business — $200/yr (500 SKUs)</option>
              <option value="ENTERPRISE">Enterprise — $300/yr (2,000+ SKUs)</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 12 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ borderRadius: 999, padding: '8px 24px' }}>
              {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : 'Create Shop & Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
