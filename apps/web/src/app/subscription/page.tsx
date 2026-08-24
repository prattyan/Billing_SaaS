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
    price: '₹10,000',
    priceLabel: '₹10,000 / year',
    priceNum: 10000,
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
    price: '₹20,000',
    priceLabel: '₹20,000 / year',
    priceNum: 20000,
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
    price: '₹30,000',
    priceLabel: '₹30,000 / year',
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

  const currentTier = data?.currentTier ?? 'STARTER';
  const currentPlanDef = PLANS.find((p) => p.id === currentTier);
  const skuLimit = currentPlanDef?.skuLimit ?? (data?.skuLimit ?? 10);
  const skuCount = data?.skuCount ?? 0;
  const usagePercent = Math.min(100, Math.round((skuCount / skuLimit) * 100));
  const pendingRequest = data?.pendingRequest ?? null;
  const hasPending = !!pendingRequest;

  return (
    <div className="page-container" style={{ padding: '32px 24px', maxWidth: 1100, margin: '0 auto' }}>

      {/* Page heading */}
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 10 }}>
          Subscription & Pricing
        </h1>
        <p style={{ color: 'rgb(148,163,184)', fontSize: '0.95rem', maxWidth: 500, margin: '0 auto' }}>
          Tiered by active inventory SKU capacity. Upgrade instantly via Cashfree — no lock-in.
        </p>
      </div>

      {/* Pending approval banner */}
      {hasPending && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 14,
          background: 'rgba(251,191,36,0.07)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 12, padding: '16px 20px', marginBottom: 28,
        }}>
          <Clock size={20} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontWeight: 700, color: '#fbbf24', fontSize: '0.9rem', marginBottom: 4 }}>
              Upgrade Request Pending Approval
            </div>
            <div style={{ color: 'rgb(148,163,184)', fontSize: '0.82rem' }}>
              Your upgrade request to <strong style={{ color: '#f8fafc' }}>{pendingRequest.requestedPlanTier}</strong> plan
              is awaiting super admin review. Your current <strong style={{ color: '#f8fafc' }}>{currentTier}</strong> plan
              remains active until approved. You will be notified once reviewed.
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
          padding: '24px 28px',
        }}
      >
        {/* Green top accent bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'rgb(22, 163, 74)',
          borderRadius: '12px 12px 0 0',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20, marginBottom: 22 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
              <Crown size={18} color="rgb(22,163,74)" />
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800 }}>
                {currentTier} Plan
              </h2>
              <span className="badge badge-success" style={{ fontSize: '0.68rem' }}>
                {data?.subscriptionStatus ?? 'ACTIVE'}
              </span>
            </div>
            <p style={{ color: 'rgb(100,116,139)', fontSize: '0.85rem' }}>
              {data?.subscriptionExpiry
                ? `Active until ${format(new Date(data.subscriptionExpiry), 'MMMM dd, yyyy')}`
                : 'Free tier — unlimited active lifetime'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: 'rgb(100,116,139)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              SKU Capacity
            </div>
            <div style={{ fontSize: '1.9rem', fontWeight: 800, color: usagePercent >= 90 ? '#f87171' : '#4ade80', lineHeight: 1 }}>
              {skuCount}<span style={{ fontSize: '1rem', color: 'rgb(100,116,139)', fontWeight: 500 }}>/{skuLimit}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgb(100,116,139)', marginTop: 2 }}>SKUs used</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 7, background: 'rgb(38, 40, 52)', borderRadius: 999, overflow: 'hidden', marginBottom: 10 }}>
          <div style={{
            height: '100%', borderRadius: 999, transition: 'width 0.6s ease',
            width: `${usagePercent}%`,
            background: usagePercent >= 90 ? '#ef4444' : usagePercent >= 75 ? '#f59e0b' : 'rgb(22, 163, 74)',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgb(100,116,139)' }}>
          <span>{usagePercent}% utilized</span>
          <span>{skuLimit - skuCount} slots remaining</span>
        </div>

        {data?.subscriptionStatus === 'GRACE' && (
          <div className="alert alert-warning" style={{ marginTop: 16 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Grace Period Active:</strong> You have exceeded your {currentTier} limit ({skuCount}/{skuLimit} SKUs). Please upgrade before{' '}
              {data.gracePeriodEndsAt ? format(new Date(data.gracePeriodEndsAt), 'MMM dd, yyyy') : 'the end of your 7-day grace period'}.
            </div>
          </div>
        )}
      </div>

      {/* Pricing Cards — matches the provided design layout */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Choose Your Plan</h2>
        <p style={{ color: 'rgb(100,116,139)', fontSize: '0.85rem', marginTop: 6 }}>
          All plans include core POS billing. Upgrade anytime.
        </p>
      </div>

      <div
        className="pricing-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          marginBottom: 48,
          alignItems: 'stretch',
        }}
      >
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isPendingPlan = hasPending && pendingRequest?.requestedPlanTier === plan.id;
          const isLower =
            (currentTier === 'ENTERPRISE' && plan.id !== 'ENTERPRISE') ||
            (currentTier === 'BUSINESS' && (plan.id === 'STARTER' || plan.id === 'GROWTH')) ||
            (currentTier === 'GROWTH' && plan.id === 'STARTER');

          return (
            <div
              key={plan.id}
              className="animate-fadeIn"
              style={{
                background: 'rgb(18, 20, 26)',
                border: isCurrent
                  ? '2px solid rgb(22, 163, 74)'
                  : isPendingPlan
                  ? '2px solid rgba(251,191,36,0.7)'
                  : plan.popular
                  ? '1px solid rgba(22,163,74,0.4)'
                  : '1px solid rgb(38, 40, 52)',
                borderRadius: 14,
                padding: '32px 20px 20px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transition: 'border-color 0.15s ease, transform 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              {/* BEST SELLER badge centered on top border — exact match to design */}
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: -13,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgb(22, 163, 74)',
                  color: 'white',
                  fontSize: '0.62rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  padding: '3px 12px',
                  borderRadius: 999,
                  whiteSpace: 'nowrap',
                }}>
                  BEST SELLER
                </div>
              )}

              {isCurrent && !plan.popular && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgb(22, 163, 74)', color: 'white',
                  fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                }}>
                  CURRENT PLAN
                </div>
              )}

              {isPendingPlan && (
                <div style={{
                  position: 'absolute', top: -13, left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#f59e0b', color: 'white',
                  fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase',
                  letterSpacing: '0.08em', padding: '3px 12px', borderRadius: 999, whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <Clock size={9} /> PENDING APPROVAL
                </div>
              )}

              {/* Plan header */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <h3 style={{
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: plan.popular ? '#4ade80' : isCurrent ? '#4ade80' : 'rgb(148,163,184)',
                  marginBottom: 12,
                  letterSpacing: '0.01em',
                  textTransform: 'uppercase',
                }}>
                  {plan.name}
                </h3>

                {/* Price — separate amount from label to prevent wrapping */}
                {plan.priceNum === 0 ? (
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                    Free
                    <div style={{ fontSize: '0.8rem', color: 'rgb(100,116,139)', fontWeight: 500, marginTop: 3 }}>for everyone</div>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '1.55rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                      {plan.price}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgb(100,116,139)', fontWeight: 500, marginTop: 4 }}>per year</div>
                  </div>
                )}

                {/* Users row */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  marginTop: 10,
                  fontSize: '0.72rem',
                  color: 'rgb(100,116,139)',
                  fontWeight: 500,
                }}>
                  <Users size={12} />
                  {plan.users}
                </div>
              </div>

              {/* Divider */}
              <hr style={{ border: 'none', borderTop: '1px solid rgb(38,40,52)', margin: '0 0 18px' }} />

              {/* Features list */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 24 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: '0.8rem', color: 'rgb(148,163,184)' }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'rgba(22,163,74,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Check size={11} color="rgb(74,222,128)" strokeWidth={3} />
                    </div>
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {/* CTA Button */}
              {isCurrent ? (
                <button disabled style={{
                  width: '100%', padding: '10px 0', borderRadius: 9,
                  border: '1px solid rgba(22,163,74,0.4)', background: 'rgba(22,163,74,0.08)',
                  color: '#4ade80', fontWeight: 700, fontSize: '0.88rem', cursor: 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  <CheckCircle2 size={16} /> Active Plan
                </button>
              ) : isPendingPlan ? (
                <button disabled style={{
                  width: '100%', padding: '10px 0', borderRadius: 9,
                  border: '1px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.08)',
                  color: '#fbbf24', fontWeight: 700, fontSize: '0.88rem', cursor: 'default',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                }}>
                  <Clock size={15} /> Awaiting Approval
                </button>
              ) : isLower ? (
                <button disabled style={{
                  width: '100%', padding: '10px 0', borderRadius: 9,
                  border: '1px solid rgb(38,40,52)', background: 'transparent',
                  color: 'rgb(100,116,139)', fontWeight: 600, fontSize: '0.88rem', cursor: 'not-allowed',
                }}>
                  Included
                </button>
              ) : hasPending ? (
                <button disabled style={{
                  width: '100%', padding: '10px 0', borderRadius: 9,
                  border: '1px solid rgb(38,40,52)', background: 'transparent',
                  color: 'rgb(100,116,139)', fontWeight: 600, fontSize: '0.82rem', cursor: 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                  <Clock size={13} /> Approval Pending
                </button>
              ) : (
                <button
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={upgradeMutation.isPending && upgradingTier === plan.id}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 9,
                    border: '1px solid rgba(255,255,255,0.12)',
                    background: plan.popular ? 'rgb(22,163,74)' : 'transparent',
                    color: plan.popular ? 'white' : '#f8fafc',
                    fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!plan.popular) {
                      e.currentTarget.style.borderColor = 'rgba(22,163,74,0.5)';
                      e.currentTarget.style.background = 'rgba(22,163,74,0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!plan.popular) {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
                      e.currentTarget.style.background = 'transparent';
                    }
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
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
        <CreditCard size={18} color="rgb(22,163,74)" />
        <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Payment Receipts</h2>
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
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'rgb(100,116,139)' }}>Loading history...</td></tr>
            ) : !data?.history?.length ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 28, color: 'rgb(100,116,139)' }}>No past subscription payments yet</td></tr>
            ) : (
              data.history.map((sub: any) => (
                <tr key={sub.id}>
                  <td>{format(new Date(sub.createdAt), 'dd MMM yyyy')}</td>
                  <td><span className="badge badge-success">{sub.planTier}</span></td>
                  <td style={{ fontWeight: 700, color: '#4ade80' }}>
                    ₹{Number(sub.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </td>
                  <td><code style={{ fontSize: '0.78rem' }}>{sub.cashfreeOrderId || sub.id.slice(-8)}</code></td>
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
