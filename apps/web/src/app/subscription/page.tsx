'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  CreditCard, Check, Sparkles, AlertTriangle, ShieldCheck,
  Receipt, ArrowUpRight, Zap, Loader2, Clock, CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';

const PLANS = [
  {
    id: 'STARTER',
    name: 'Starter',
    skuLimit: 100,
    price: 'Free',
    priceNum: 0,
    desc: 'Perfect for small local grocery counters & boutique shops',
    features: [
      'Up to 100 SKU items',
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
    skuLimit: 2000,
    price: '₹10,000 / year',
    priceNum: 10000,
    popular: true,
    desc: 'Designed for expanding convenience stores and supermarkets',
    features: [
      'Up to 2,000 SKU items',
      'Everything in Starter',
      'Supplier & Purchase Order management',
      'Damage/Loss stock adjustments audit trail',
      'Itemized GST tax filing reports (CGST/SGST)',
      'Up to 5 staff cashier logins',
    ],
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    skuLimit: 5000,
    price: '₹20,000 / year',
    priceNum: 20000,
    desc: 'For high-volume multi-counter shopping stores',
    features: [
      'Up to 5,000 SKU items',
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
    skuLimit: 10000,
    price: '₹30,000 / year',
    priceNum: 30000,
    desc: 'For large department stores and grocery chains',
    features: [
      'Up to 10,000+ SKU items',
      'Everything in Business',
      'Multi-counter terminal synchronization',
      'Automated nightly stock snapshot backup',
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
  });

  const upgradeMutation = useMutation({
    mutationFn: async (planTier: string) => {
      // 1. Create order
      const orderRes = await subscriptionsApi.createOrder({ planTier });
      const { orderId } = orderRes.data;

      // 2. In sandbox/production, verify and activate
      const verifyRes = await subscriptionsApi.verify({ orderId });
      return verifyRes.data;
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Plan upgraded successfully! 🎉', { duration: 4000 });
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
  const skuCount = data?.skuCount ?? 0;
  const skuLimit = data?.skuLimit ?? 100;
  const usagePercent = Math.min(100, Math.round((skuCount / skuLimit) * 100));

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Subscription & Plan</h1>
        <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
          Tiered by active inventory SKU capacity · Instant upgrade via Cashfree
        </p>
      </div>

      {/* Current Plan Overview Card */}
      <div className="glass-card" style={{ padding: '24px 28px', marginBottom: 36, position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, rgb(139,92,246), rgb(52,211,153))',
        }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>{currentTier} Plan</h2>
              <span className="badge badge-purple" style={{ fontSize: '0.75rem' }}>
                {data?.subscriptionStatus ?? 'ACTIVE'}
              </span>
            </div>
            <p style={{ color: 'rgb(161,161,170)', fontSize: '0.85rem' }}>
              {data?.subscriptionExpiry
                ? `Active until ${format(new Date(data.subscriptionExpiry), 'MMMM dd, yyyy')}`
                : 'Free tier with unlimited active lifetime'}
            </p>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', fontWeight: 700, textTransform: 'uppercase' }}>SKU Capacity Usage</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: usagePercent >= 90 ? 'rgb(239,100,100)' : 'rgb(52,211,153)' }}>
              {skuCount} / {skuLimit} <span style={{ fontSize: '0.9rem', color: 'rgb(161,161,170)', fontWeight: 500 }}>SKUs</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ height: 8, background: 'rgb(var(--surface-3))', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{
            height: '100%', borderRadius: 999, transition: 'width 0.6s ease',
            width: `${usagePercent}%`,
            background: usagePercent >= 90
              ? 'rgb(239,68,68)'
              : usagePercent >= 75
              ? 'rgb(245,158,11)'
              : 'linear-gradient(90deg, rgb(139,92,246), rgb(52,211,153))',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>
          <span>{usagePercent}% of limit utilized</span>
          <span>{skuLimit - skuCount} SKU slots remaining</span>
        </div>

        {/* Grace period warning if applicable */}
        {data?.subscriptionStatus === 'GRACE' && (
          <div className="alert alert-warning" style={{ marginTop: 16 }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Grace Period Active:</strong> You have exceeded your {currentTier} limit ({skuCount}/{skuLimit} SKUs). Please upgrade before{' '}
              {data.gracePeriodEndsAt ? format(new Date(data.gracePeriodEndsAt), 'MMM dd, yyyy') : 'the end of your 7-day grace period'} to avoid restriction on adding new items.
            </div>
          </div>
        )}
      </div>

      {/* Plan Tiers Grid */}
      <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 20 }}>Available Subscription Tiers</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 40 }}>
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id;
          const isLower =
            (currentTier === 'ENTERPRISE' && plan.id !== 'ENTERPRISE') ||
            (currentTier === 'BUSINESS' && (plan.id === 'STARTER' || plan.id === 'GROWTH')) ||
            (currentTier === 'GROWTH' && plan.id === 'STARTER');

          return (
            <div
              key={plan.id}
              className="glass-card animate-fadeIn"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: isCurrent
                  ? '2px solid rgb(139,92,246)'
                  : plan.popular
                  ? '1px solid rgba(52,211,153,0.3)'
                  : '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -11, right: 20,
                  background: 'rgb(52,211,153)', color: 'rgb(9,9,11)',
                  fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase',
                  padding: '2px 8px', borderRadius: 999, letterSpacing: '0.05em',
                }}>
                  Most Popular
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 4 }}>{plan.name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', minHeight: 32 }}>{plan.desc}</p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
                  {plan.price}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'rgb(52,211,153)', fontWeight: 600 }}>
                  Up to {plan.skuLimit.toLocaleString()} items
                </div>
              </div>

              <div className="divider" style={{ margin: '0 0 16px' }} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.8rem', color: 'rgb(161,161,170)' }}>
                    <Check size={14} color="rgb(52,211,153)" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{f}</span>
                  </div>
                ))}
              </div>

              {isCurrent ? (
                <button className="btn-secondary" disabled style={{ width: '100%', justifyContent: 'center' }}>
                  <CheckCircle2 size={16} /> Current Active Plan
                </button>
              ) : isLower ? (
                <button className="btn-secondary" disabled style={{ width: '100%', justifyContent: 'center', opacity: 0.5 }}>
                  Included
                </button>
              ) : (
                <button
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={upgradeMutation.isPending && upgradingTier === plan.id}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {upgradeMutation.isPending && upgradingTier === plan.id ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                  ) : (
                    <><Zap size={16} /> Upgrade with Cashfree</>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Past Invoices / Receipts */}
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 16 }}>Subscription Payment Receipts</h2>
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Plan Tier</th>
              <th>Amount Paid</th>
              <th>Order ID</th>
              <th>Valid Until</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20 }}>Loading history…</td></tr>
            ) : data?.history?.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'rgb(113,113,122)' }}>No past subscription payments yet</td></tr>
            ) : (
              data?.history?.map((sub: any) => (
                <tr key={sub.id}>
                  <td>{format(new Date(sub.createdAt), 'dd MMM yyyy')}</td>
                  <td><span className="badge badge-purple">{sub.planTier}</span></td>
                  <td style={{ fontWeight: 700, color: 'rgb(52,211,153)' }}>₹{Number(sub.amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td><code>{sub.cashfreeOrderId || sub.id.slice(-8)}</code></td>
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
