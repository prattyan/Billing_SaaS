'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi, subscriptionsApi } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import {
  Receipt, Search, Eye, RotateCcw, Printer, Phone,
  Calendar, CheckCircle2, AlertCircle, X, Loader2, IndianRupee, Share2,
  Download, ArrowUpRight, CreditCard, ChevronDown, MoreHorizontal, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { getPublicInvoiceUrl, formatWhatsAppBillMessage } from '@/lib/utils';

export default function BillingHistoryPage() {
  const qc = useQueryClient();
  const { user, tenant } = useAuthStore();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewBillId, setViewBillId] = useState<string | null>(null);
  const [returnBillData, setReturnBillData] = useState<any | null>(null);

  // Bills query
  const { data, isLoading } = useQuery({
    queryKey: ['billsHistory', page, search],
    queryFn: () => billingApi.list({ page, limit: 15, search }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  // Subscription info query for Current Plan Summary card
  const { data: subData } = useQuery({
    queryKey: ['subscriptionCurrent'],
    queryFn: () => subscriptionsApi.current().then((r) => r.data),
  });

  const { data: billDetail, isLoading: isLoadingBill } = useQuery({
    queryKey: ['billDetail', viewBillId],
    queryFn: () => (viewBillId ? billingApi.get(viewBillId).then((r) => r.data) : null),
    enabled: !!viewBillId,
  });

  const returnMutation = useMutation({
    mutationFn: (payload: any) => billingApi.returnBill(payload),
    onSuccess: () => {
      toast.success('Return processed & inventory stock adjusted!');
      setReturnBillData(null);
      qc.invalidateQueries({ queryKey: ['billsHistory'] });
      qc.invalidateQueries({ queryKey: ['items'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Return failed');
    },
  });

  const bills: any[] = data?.bills ?? [];
  const meta = data?.meta;

  const currentTier = subData?.currentTier ?? tenant?.planTier ?? 'GROWTH';
  const skuLimit = subData?.skuLimit ?? 5000;
  const skuCount = subData?.skuCount ?? 4850;
  const usagePercentage = Math.min(100, Math.round((skuCount / skuLimit) * 100));

  const planCostMap: Record<string, string> = {
    STARTER: 'Free',
    GROWTH: '$5698',
    BUSINESS: '$12000',
    ENTERPRISE: '$30000',
  };

  const handleExportCSV = () => {
    if (!bills.length) {
      toast.error('No invoices to download');
      return;
    }
    const headers = ['Invoice ID', 'Date', 'Customer', 'Amount', 'Payment Mode', 'Status'];
    const rows = bills.map((b) => [
      b.billNumber,
      format(new Date(b.createdAt), 'dd MMM yyyy'),
      b.customer?.name || 'Walk-in Customer',
      b.grandTotal,
      b.paymentMode,
      b.status
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `invoices_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Invoices exported to CSV!');
  };

  return (
    <div className="page-container" style={{ padding: '32px 36px', maxWidth: 1400, margin: '0 auto' }}>
      {/* ── Top Row: Current Plan Summary & Payment Method Cards (matches reference image) ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 20,
        marginBottom: 36,
      }}>
        {/* Card 1: Current Plan Summary */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'rgb(var(--text-primary))' }}>
              Current Plan Summary
            </h2>
            <Link href="/subscription" className="btn-primary" style={{ padding: '6px 16px', fontSize: '0.8rem' }}>
              Upgrade
            </Link>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 22,
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgb(var(--text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                Plan Name
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                {currentTier.charAt(0) + currentTier.slice(1).toLowerCase()} Plan
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgb(var(--text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                Billing Cycle
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                Monthly
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgb(var(--text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 4 }}>
                Plan Cost
              </div>
              <div style={{ fontSize: '0.98rem', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                {planCostMap[currentTier] ?? '$5698'}
              </div>
            </div>
          </div>

          {/* Usage bar */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgb(var(--text-muted))', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 6 }}>
              Usage
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgb(var(--text-secondary))', marginBottom: 8, fontWeight: 500 }}>
              {skuCount} out of {skuLimit >= 1000 ? `${(skuLimit / 1000).toFixed(0)}k` : skuLimit} monthly active SKUs
            </div>
            <div style={{ height: 9, background: 'rgb(var(--surface-2))', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${usagePercentage}%`,
                background: 'rgb(var(--color-primary))',
                borderRadius: 999,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        </div>

        {/* Card 2: Payment Method */}
        <div className="card" style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 20 }}>
              Payment Method
            </h2>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 18px',
              borderRadius: 12,
              background: 'rgb(var(--surface-2))',
              border: '1px solid rgb(var(--border-rgb))',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {/* Mastercard Logo Circles */}
                <div style={{ position: 'relative', width: 34, height: 22 }}>
                  <span style={{ position: 'absolute', left: 0, width: 22, height: 22, borderRadius: '50%', background: '#eb001b', display: 'inline-block' }} />
                  <span style={{ position: 'absolute', left: 12, width: 22, height: 22, borderRadius: '50%', background: '#f79e1b', opacity: 0.85, display: 'inline-block' }} />
                </div>

                <div>
                  <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'rgb(var(--text-primary))' }}>
                    Master Card
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgb(var(--text-secondary))', fontFamily: 'monospace' }}>
                    •••• •••• 4002
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))', marginTop: 2 }}>
                    Expiry on 20/2026
                  </div>
                </div>
              </div>

              <Link
                href="/subscription"
                style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: 'rgb(var(--text-primary))',
                  textDecoration: 'none',
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: '#ffffff',
                  border: '1px solid rgb(var(--border-rgb))',
                }}
              >
                Change
              </Link>
            </div>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'rgb(var(--text-secondary))', marginTop: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'rgb(var(--text-muted))' }}>Email:</span>
            <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{user?.email ?? 'billing@acme.corp'}</span>
          </div>
        </div>
      </div>

      {/* ── Section Header: Invoice (matches reference image) ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
        flexWrap: 'wrap',
        gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
            Invoice
          </h1>
          <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.875rem' }}>
            Effortlessly handle your billing and invoices right here.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* Search Box */}
          <div style={{ position: 'relative', width: 280 }}>
            <Search size={14} style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'rgb(var(--text-muted))',
            }} />
            <input
              type="text"
              className="input"
              placeholder="Search Invoice # or Customer..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 36, borderRadius: 999, height: 38 }}
            />
          </div>

          <button
            onClick={handleExportCSV}
            className="btn-primary"
            style={{ height: 38, padding: '0 20px', gap: 6 }}
          >
            <Download size={15} />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* ── Modern Invoices Table matching reference design ── */}
      <div className="table-wrapper desktop-table" style={{ background: '#ffffff', borderRadius: 16, border: '1px solid rgb(var(--border-rgb))' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Invoice ID</span> <ChevronDown size={13} />
                </div>
              </th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Billing Date</span> <ChevronDown size={13} />
                </div>
              </th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Plan / Customer</span> <ChevronDown size={13} />
                </div>
              </th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Amount</span> <ChevronDown size={13} />
                </div>
              </th>
              <th>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>Status</span> <ChevronDown size={13} />
                </div>
              </th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 18, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 56, color: 'rgb(var(--text-muted))' }}>
                  <Receipt size={36} style={{ opacity: 0.35, display: 'block', margin: '0 auto 10px' }} />
                  <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>No invoices found</p>
                  <p style={{ fontSize: '0.8rem', marginTop: 4 }}>Create a POS sale to generate invoices automatically.</p>
                </td>
              </tr>
            ) : (
              bills.map((b: any) => (
                <tr key={b.id}>
                  <td>
                    <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                      {b.billNumber}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem', color: 'rgb(var(--text-secondary))' }}>
                    {format(new Date(b.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>
                      {b.customer?.name && b.customer.name !== 'Walk-in Customer' ? b.customer.name : 'Growth Plan'}
                    </div>
                    {(b.customer?.phone || b.customerPhone) && (
                      <div style={{ fontSize: '0.7rem', color: 'rgb(var(--text-muted))' }}>{b.customer?.phone || b.customerPhone}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', fontSize: '0.92rem' }}>
                      ${Number(b.grandTotal).toFixed(0)}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      b.status === 'PAID' ? 'badge-success' :
                      b.status === 'RETURNED' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {b.status === 'PAID' ? 'Paid' : b.status === 'RETURNED' ? 'Returned' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <button
                        title="View Official Invoice"
                        className="btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.75rem' }}
                        onClick={() => setViewBillId(b.id)}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        title="Share WhatsApp"
                        className="btn-secondary"
                        style={{ padding: '5px 12px', fontSize: '0.75rem', color: 'rgb(var(--color-primary-dark))' }}
                        onClick={() => {
                          const phone = b.customer?.phone || b.customerPhone || '';
                          const invoiceUrl = getPublicInvoiceUrl(b.id);
                          const text = formatWhatsAppBillMessage(b, invoiceUrl);
                          const url = phone
                            ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
                            : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                          window.open(url, '_blank');
                        }}
                      >
                        <Share2 size={13} /> Share
                      </button>
                      {b.status === 'PAID' && (
                        <button
                          title="Process Return"
                          className="btn-secondary"
                          style={{ padding: '5px 8px', fontSize: '0.75rem', color: 'rgb(var(--color-accent))' }}
                          onClick={() => setReturnBillData(b)}
                        >
                          <RotateCcw size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Bill Card List (< 1024px) */}
      <div className="mobile-card-list">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mobile-item-card">
              <div className="skeleton" style={{ height: 18, width: '50%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 14, width: '30%' }} />
            </div>
          ))
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgb(var(--text-muted))' }}>
            <Receipt size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
            No bills found
          </div>
        ) : (
          bills.map((b: any) => (
            <div key={b.id} className="mobile-item-card">
              <div className="card-top">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', fontSize: '0.9rem' }}>{b.billNumber}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: 2 }}>
                    {format(new Date(b.createdAt), 'dd MMM yyyy')}
                  </div>
                </div>
                <span className={`badge ${b.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>
                  {b.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    {b.customer?.name && b.customer.name !== 'Walk-in Customer' ? b.customer.name : 'Growth Plan'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: 'rgb(var(--text-primary))' }}>
                    ${Number(b.grandTotal).toFixed(0)}
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4 }}
                  onClick={() => setViewBillId(b.id)}
                >
                  <Eye size={13} /> View
                </button>
                <button
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgb(var(--color-primary-dark))' }}
                  onClick={() => {
                    const phone = b.customer?.phone || b.customerPhone || '';
                    const invoiceUrl = getPublicInvoiceUrl(b.id);
                    const text = formatWhatsAppBillMessage(b, invoiceUrl);
                    const url = phone
                      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
                      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Share2 size={13} /> WhatsApp
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 36, height: 36, borderRadius: 999, cursor: 'pointer',
                background: p === page ? 'rgb(var(--color-primary))' : 'rgb(var(--surface-1))',
                color: p === page ? 'white' : 'rgb(var(--text-secondary))',
                border: p === page ? 'none' : '1px solid rgb(var(--border-rgb))',
                fontWeight: 600, fontSize: '0.85rem',
                boxShadow: p === page ? '0 2px 8px rgba(78,159,118,0.3)' : 'none',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Bill Detail & Invoice Preview Modal ────────────────────────────── */}
      {viewBillId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)', padding: 16,
        }} onClick={() => setViewBillId(null)}>
          <div className="glass-card modal-content animate-fadeIn" style={{ width: 460, maxHeight: '90vh', padding: 24, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Invoice Receipt</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <a
                  href={`/bill/${viewBillId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Eye size={13} /> Full Official Invoice
                </a>
                <button onClick={() => setViewBillId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {isLoadingBill ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : billDetail && (
              <div style={{
                background: '#ffffff', color: '#111', padding: '24px', borderRadius: 12,
                border: '1px solid rgb(var(--border-rgb))',
                fontSize: '0.82rem', lineHeight: 1.5,
              }}>
                <div style={{ textAlign: 'center', marginBottom: 14 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'rgb(var(--color-primary-dark))' }}>RETAIL TAX INVOICE</div>
                  <div style={{ color: 'rgb(var(--text-secondary))' }}>Invoice: <strong>{billDetail.billNumber}</strong></div>
                  <div style={{ color: 'rgb(var(--text-muted))', fontSize: '0.75rem' }}>{format(new Date(billDetail.createdAt), 'dd MMM yyyy, hh:mm a')}</div>
                </div>

                <div style={{ borderTop: '1px solid rgb(var(--border-rgb))', borderBottom: '1px solid rgb(var(--border-rgb))', padding: '10px 0', margin: '12px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontWeight: 700, marginBottom: 6, color: 'rgb(var(--text-secondary))', fontSize: '0.74rem' }}>
                    <span>ITEM</span>
                    <span style={{ textAlign: 'center' }}>QTY</span>
                    <span style={{ textAlign: 'right' }}>AMT</span>
                  </div>
                  {billDetail.items?.map((it: any) => (
                    <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', margin: '4px 0', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 500 }}>{it.itemNameAtSale}</div>
                      <div style={{ textAlign: 'center', color: 'rgb(var(--text-secondary))' }}>{Number(it.qty).toFixed(0)}</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>${Number(it.lineTotal).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgb(var(--text-secondary))' }}>
                    <span>Subtotal:</span>
                    <span>${Number(billDetail.subtotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgb(var(--text-secondary))' }}>
                    <span>Tax (VAT):</span>
                    <span>${Number(billDetail.taxTotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', borderTop: '1px solid rgb(var(--border-rgb))', paddingTop: 8, marginTop: 4 }}>
                    <span>AMOUNT DUE:</span>
                    <span style={{ color: 'rgb(var(--color-primary-dark))' }}>${Number(billDetail.grandTotal).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Return / Refund Modal ───────────────────────────────────────── */}
      {returnBillData && (
        <ReturnBillModal
          bill={returnBillData}
          onClose={() => setReturnBillData(null)}
          onConfirm={(payload: any) => returnMutation.mutate(payload)}
          isPending={returnMutation.isPending}
        />
      )}
    </div>
  );
}

// ── Return Bill Component ──────────────────────────────────────────────

function ReturnBillModal({ bill, onClose, onConfirm, isPending }: any) {
  const { data: fullBill, isLoading } = useQuery({
    queryKey: ['fullBillForReturn', bill.id],
    queryFn: () => billingApi.get(bill.id).then((r) => r.data),
  });

  const { register, handleSubmit } = useForm();

  const onSubmit = (data: any) => {
    const returnItems = fullBill.items.map((it: any) => ({
      itemId: it.itemId,
      qty: Number(data[`qty_${it.itemId}`] || it.qty),
    })).filter((i: any) => i.qty > 0);

    onConfirm({
      originalBillId: bill.id,
      items: returnItems,
      reason: data.reason || 'Customer Return',
    });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: 16,
    }} onClick={onClose}>
      <div className="glass-card modal-content animate-fadeIn" style={{ width: 500, maxWidth: '100%', padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Process Return for {bill.billNumber}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(var(--text-muted))' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgb(var(--text-secondary))', marginBottom: 16 }}>
          Select items and quantities being returned. Stock will be restored automatically.
        </p>

        {isLoading ? (
          <div className="skeleton" style={{ height: 160 }} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {fullBill?.items?.map((it: any) => (
              <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{it.itemNameAtSale}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))' }}>Billed: {Number(it.qty).toFixed(0)} units @ ${Number(it.priceAtSale).toFixed(2)}</div>
                </div>
                <div style={{ width: 90 }}>
                  <input
                    type="number"
                    className="input"
                    defaultValue={Number(it.qty)}
                    min={0}
                    max={Number(it.qty)}
                    {...register(`qty_${it.itemId}`)}
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="label">Return Reason</label>
              <input type="text" className="input" placeholder="e.g. Defective piece / Changed mind" {...register('reason')} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn-danger" disabled={isPending}>
                {isPending ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</> : 'Confirm Return & Restock'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
