'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CreditCard, Check, AlertTriangle, Zap, Loader2, CheckCircle2, Users, Crown, Clock
} from 'lucide-react';
import { format } from 'date-fns';

const PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    skuLimit: 10,
    price: 'Free',
    priceLabel: 'Free for everyone',
    priceNum: 0,
    users: '1 User per account',
    desc: 'Perfect for small local grocery counters & boutique shops',
    features: [
      'Up to 10 SKU items',
      'Unlimited sales billing',
      'Barcode scanning (USB + camera)',
      'Customer phone directory',
      'WhatsApp digital e-bills',
      'Standard sales reports',
    ],
  },
  {
    id: 'GROWTH',
    name: 'Growth',
    skuLimit: 100,
    price: '$5698',
    priceLabel: '$5698 / year',
    priceNum: 5698,
    popular: true,
    users: 'Up to 5 staff logins',
    desc: 'Designed for expanding convenience stores and supermarkets',
    features: [
      'Up to 100 SKU items',
      'Everything in Starter',
      'Supplier & Purchase Order management',
      'Damage/Loss stock adjustments audit trail',
      'Itemized GST tax filing reports',
      'Up to 5 staff cashier logins',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    skuLimit: 500,
    price: '$12000',
    priceLabel: '$12000 / year',
    priceNum: 12000,
    users: 'Unlimited staff accounts',
    desc: 'For high-volume multi-counter shopping stores',
    features: [
      'Up to 500 SKU items',
      'Everything in Growth',
      'Unlimited billing staff accounts',
      'Loyalty reward points engine',
      'Bulk Excel item imports/exports',
      'Priority WhatsApp support',
    ],
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    skuLimit: 2000,
    price: '$30000',
    priceLabel: '$30000 / year',
    priceNum: 30000,
    users: 'Unlimited + dedicated manager',
    desc: 'For large department stores and grocery chains',
    features: [
      'Up to 2,000+ SKU items',
      'Everything in Business',
      'Multi-counter terminal sync',
      'Automated nightly stock backup',
      'Dedicated account manager',
      'Custom ERP API integrations',
    ],
  },
];

export default function SubscriptionPage() {
  const qc = useQueryClient();
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptionCurrent'],
    queryFn: () => subscriptionsApi.current().then((r) => r.data),
    refetchInterval: 5000,
  });

  const upgradeMutation = useMutation({
    mutationFn: async (planTier: string) => {
      const orderRes = await subscriptionsApi.createOrder({ planTier });
      const { orderId } = orderRes.data;
      const verifyRes = await subscriptionsApi.verify({ orderId, planTier });
      return verifyRes.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Plan upgraded successfully!', { duration: 4000 });
      setUpgradingTier(null);
      qc.invalidateQueries({ queryKey: ['subscriptionCurrent'] });
      qc.invalidateQueries({ queryKey: ['planUsage'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Payment failed');
      setUpgradingTier(null);
    },
  });

  const handleUpgrade = (tier: string) => {
    setUpgradingTier(tier);
    upgradeMutation.mutate(tier);
  };

  const currentTier = data?.currentTier ?? 'GROWTH';
  const currentPlanDef = PLANS.find((p) => p.id === currentTier);
  const skuLimit = currentPlanDef?.skuLimit ?? (data?.skuLimit ?? 100);
  const skuCount = data?.skuCount ?? 48;
  const usagePercent = Math.min(100, Math.round((skuCount / skuLimit) * 100));
  const pendingRequest = data?.pendingRequest ?? null;
  const hasPending = !!pendingRequest;

  return (
    <div className="page-container" style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Page heading */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10, color: 'rgb(var(--text-primary))' }}>
          Subscription & Pricing
        </h1>
        <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.95rem', maxWidth: 500, margin: '0 auto' }}>
          Tiered by active inventory SKU capacity. Upgrade instantly — cancel anytime.
        </p>
      </div>

      {/* Pending approval banner */}
      {hasPending && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14,
          background: 'rgba(234, 179, 8, 0.08)',
          border: '1px solid rgba(234, 179, 8, 0.3)',
          borderRadius: 14, padding: '16px 20px', marginBottom: 28,
        }}>
          <Clock size={20} color="#b45309" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#b45309', fontSize: '0.9rem', marginBottom: 4 }}>
              Upgrade Request Pending Approval
            </div>
            <div style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.84rem' }}>
              Your upgrade request to <strong style={{ color: 'rgb(var(--text-primary))' }}>{pendingRequest.requestedPlanTier}</strong> plan
              is awaiting super admin review. Your current <strong style={{ color: 'rgb(var(--text-primary))' }}>{currentTier}</strong> plan
              remains active until approved.
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Overview */}
      <div
        className="card"
        style={{
          marginBottom: 44,
          position: 'relative',
          overflow: 'hidden',
          padding: '28px 32px',
        }}
      >
        {/* Green top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 4,
          background: 'rgb(var(--color-primary))',
          borderRadius: '16px 16px 0 0',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Crown size={20} color="rgb(var(--color-primary))" />
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                {currentTier} Plan
              </h2>
              <span className="badge badge-success">
                {data?.subscriptionStatus ?? 'ACTIVE'}
              </span>
            </div>
            <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.85rem' }}>
              {data?.subscriptionExpiry
                ? `Active until ${format(new Date(data.subscriptionExpiry), 'MMMM dd, yyyy')}`
                : 'Active lifetime plan'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              SKU Capacity
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: usagePercent >= 90 ? '#dc2626' : 'rgb(var(--color-primary-dark))', lineHeight: 1 }}>
              {skuCount}<span style={{ fontSize: '1.1rem', color: 'rgb(var(--text-muted))', fontWeight: 500 }}>/{skuLimit}</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: 'rgb(var(--text-muted))', marginTop: 2 }}>SKUs used</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 8, background: 'rgb(var(--surface-2))', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%', borderRadius: 999, transition: 'width 0.6s ease',
            width: `${usagePercent}%`,
            background: usagePercent >= 90 ? '#ef4444' : usagePercent >= 75 ? '#f59e0b' : 'rgb(var(--color-primary))',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgb(var(--text-secondary))' }}>
          <span>{usagePercent}% utilized</span>
          <span>{skuLimit - skuCount} slots remaining</span>
        </div>
      </div>

      {/* Pricing Cards */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(var(--text-primary))', letterSpacing: '-0.02em' }}>Choose Your Plan</h2>
        <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.875rem', marginTop: 6 }}>
          All plans include full POS billing, receipt printing, and catalog features.
        </p>
      </div>

      <div
        className="pricing-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 18,
          marginBottom: 48,
          alignItems: 'stretch',
        }}
      >
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isPendingPlan = hasPending && pendingRequest?.requestedPlanTier === plan.id;

          return (
            <div
              key={plan.id}
              className="card animate-fadeIn"
              style={{
                background: '#ffffff',
                border: isCurrent
                  ? '2px solid rgb(var(--color-primary))'
                  : isPendingPlan
                  ? '2px solid rgba(234,179,8,0.7)'
                  : plan.popular
                  ? '1.5px solid rgb(var(--color-primary))'
                  : '1px solid rgb(var(--border-rgb))',
                borderRadius: 16,
                padding: '34px 22px 24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* BEST SELLER badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgb(var(--color-primary))',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '3px 14px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(78, 159, 118, 0.3)',
                }}>
                  BEST SELLER
                </div>
              )}

              {isCurrent && !plan.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgb(var(--color-primary))', color: 'white',
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '3px 14px', borderRadius: 999, whiteSpace: 'nowrap',
                }}>
                  CURRENT PLAN
                </div>
              )}

              {/* Plan header */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h3 style={{
                  fontSize: '0.84rem',
                  fontWeight: 700,
                  color: plan.popular || isCurrent ? 'rgb(var(--color-primary-dark))' : 'rgb(var(--text-secondary))',
                  marginBottom: 12,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}>
                  {plan.name}
                </h3>

                {plan.priceNum === 0 ? (
                  <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'rgb(var(--text-primary))', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Free
                    <div style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))', fontWeight: 500, marginTop: 3 }}>for everyone</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'rgb(var(--text-primary))', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                      {plan.price}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgb(var(--text-muted))', fontWeight: 500, marginTop: 4 }}>per year</div>
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  marginTop: 10,
                  fontSize: '0.74rem',
                  color: 'rgb(var(--text-secondary))',
                  fontWeight: 500,
                }}>
                  <Users size={13} />
                  {plan.users}
                </div>
              </div>

              <hr className="divider" style={{ margin: '0 0 18px' }} />

              {/* Features list */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: '0.82rem', color: 'rgb(var(--text-secondary))' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgb(var(--color-primary-light))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Check size={11} color="rgb(var(--color-primary-dark))" strokeWidth={3} />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              {isCurrent ? (
                <button disabled style={{
                  width: '100%', padding: '10px 0', borderRadius: 999,
                  border: '1px solid rgba(78, 159, 118, 0.3)', background: 'rgb(var(--color-primary-light))',
                  color: 'rgb(var(--color-primary-dark))', fontWeight: 700, fontSize: '0.88rem', cursor: 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  <CheckCircle2 size={16} /> Active Plan
                </button>
              ) : isPendingPlan ? (
                <button disabled style={{
                  width: '100%', padding: '10px 0', borderRadius: 999,
                  border: '1px solid rgba(234,179,8,0.4)', background: 'rgba(234,179,8,0.1)',
                  color: '#b45309', fontWeight: 700, fontSize: '0.88rem', cursor: 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  <Clock size={15} /> Awaiting Approval
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgradeMutation.isPending && upgradingTier === plan.id}
                  className={plan.popular ? 'btn-primary' : 'btn-secondary'}
                  style={{
                    width: '100%', padding: '10px 0', borderRadius: 999,
                    fontWeight: 700, fontSize: '0.88rem',
                  }}
                >
                  {upgradeMutation.isPending && upgradingTier === plan.id ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : (
                    <><Zap size={15} /> Get Started</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Payment Receipts */}
      <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
        <CreditCard size={18} color="rgb(var(--color-primary))" />
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>Payment Receipts</h2>
      </div>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Plan</th>
              <th>Amount</th>
              <th>Order ID</th>
              <th>Valid Until</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'rgb(var(--text-muted))' }}>Loading history...</td></tr>
            ) : !data?.history?.length ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'rgb(var(--text-muted))' }}>No past subscription payments yet</td></tr>
            ) : (
              data.history.map((sub: any) => (
                <tr key={sub.id}>
                  <td>{format(new Date(sub.createdAt), 'dd MMM yyyy')}</td>
                  <td><span className="badge badge-success">{sub.planTier}</span></td>
                  <td style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                    ${Number(sub.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </td>
                  <td><code style={{ fontSize: '0.8rem' }}>{sub.cashfreeOrderId || sub.id.slice(-8)}</code></td>
                  <td>{format(new Date(sub.endDate), 'dd MMM yyyy')}</td>
                  <td><span className="badge badge-success">{sub.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
