'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billingApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Receipt, Search, Eye, RotateCcw, Printer, Phone,
  Calendar, CheckCircle2, AlertCircle, X, Loader2, IndianRupee, Share2, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { getPublicInvoiceUrl, formatWhatsAppBillMessage } from '@/lib/utils';

export default function BillingHistoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewBillId, setViewBillId] = useState<string | null>(null);
  const [returnBillData, setReturnBillData] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['billsHistory', page, search],
    queryFn: () => billingApi.list({ page, limit: 15, search }).then((r) => r.data),
    placeholderData: (prev) => prev,
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container" style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Sales Invoices & Returns</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Search historical bills, view tax breakdowns, reprint receipts & process customer returns
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="search-container" style={{ maxWidth: 400, position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'rgb(113,113,122)',
        }} />
        <input
          type="text"
          className="input"
          placeholder="Search by invoice # (e.g. INV-00001) or customer phone…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Desktop Invoices Table */}
      <div className="table-wrapper desktop-table">
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date & Time</th>
              <th>Customer</th>
              <th>Cashier</th>
              <th>Payment Mode</th>
              <th>Grand Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : bills.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: 48, color: 'rgb(113,113,122)' }}>
                  <Receipt size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                  No bills found
                </td>
              </tr>
            ) : (
              bills.map((b: any) => (
                <tr key={b.id}>
                  <td>
                    <code style={{ fontWeight: 700, color: 'rgb(167,139,250)' }}>{b.billNumber}</code>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>
                    {format(new Date(b.createdAt), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>
                      {b.customer?.name && b.customer.name !== 'Walk-in Customer' ? b.customer.name : 'Walk-in Customer'}
                    </div>
                    {(b.customer?.phone || b.customerPhone) && (
                      <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>{b.customer?.phone || b.customerPhone}</div>
                    )}
                  </td>
                  <td>{b.biller?.name}</td>
                  <td><span className="badge badge-gray">{b.paymentMode}</span></td>
                  <td>
                    <div style={{ fontWeight: 800, color: Number(b.grandTotal) < 0 ? 'rgb(239,100,100)' : 'rgb(52,211,153)' }}>
                      ₹{Number(b.grandTotal).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${
                      b.status === 'PAID' ? 'badge-success' :
                      b.status === 'RETURNED' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        title="View & Print Invoice"
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => setViewBillId(b.id)}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        title="Send via 1-Click WhatsApp (Free)"
                        className="btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'rgb(52,211,153)' }}
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
                      {b.status === 'PAID' && (
                        <button
                          title="Process Return"
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.75rem', color: 'rgb(251,191,36)' }}
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

      {/* Mobile Bill Card List */}
      <div className="mobile-card-list" style={{ display: 'none' }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mobile-item-card">
              <div className="skeleton" style={{ height: 18, width: '50%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 14, width: '30%' }} />
            </div>
          ))
        ) : bills.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgb(113,113,122)' }}>
            <Receipt size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
            No bills found
          </div>
        ) : (
          bills.map((b: any) => (
            <div key={b.id} className="mobile-item-card">
              <div className="card-top">
                <div style={{ flex: 1 }}>
                  <code style={{ fontWeight: 700, color: 'rgb(167,139,250)', fontSize: '0.88rem' }}>{b.billNumber}</code>
                  <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', marginTop: 2 }}>
                    {format(new Date(b.createdAt), 'dd MMM yyyy, hh:mm a')}
                  </div>
                </div>
                <span className={`badge ${b.status === 'PAID' ? 'badge-success' : b.status === 'RETURNED' ? 'badge-warning' : 'badge-danger'}`}>
                  {b.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                    {b.customer?.name && b.customer.name !== 'Walk-in Customer' ? b.customer.name : 'Walk-in Customer'}
                  </div>
                  {(b.customer?.phone || b.customerPhone) && (
                    <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>{b.customer?.phone || b.customerPhone}</div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: Number(b.grandTotal) < 0 ? 'rgb(239,100,100)' : 'rgb(52,211,153)' }}>
                    ₹{Number(b.grandTotal).toFixed(2)}
                  </div>
                  <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>{b.paymentMode}</span>
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
                  style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgb(52,211,153)' }}
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
                {b.status === 'PAID' && (
                  <button
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgb(251,191,36)' }}
                    onClick={() => setReturnBillData(b)}
                  >
                    <RotateCcw size={13} /> Return
                  </button>
                )}
              </div>
            </div>
          ))
        )}
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

      {/* ── Bill Detail & Thermal Print Modal ────────────────────────────── */}
      {viewBillId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)', padding: 16,
        }} onClick={() => setViewBillId(null)}>
          <div className="glass-card modal-content animate-fadeIn" style={{ width: 440, maxHeight: '90vh', padding: 24, overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Invoice Receipt</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4, color: 'rgb(52,211,153)' }}
                  onClick={() => {
                    if (!billDetail) return;
                    const phone = billDetail.customer?.phone || billDetail.customerPhone || '';
                    const invoiceUrl = getPublicInvoiceUrl(billDetail.id);
                    const text = formatWhatsAppBillMessage(billDetail, invoiceUrl);
                    const url = phone
                      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
                      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                    window.open(url, '_blank');
                  }}
                >
                  <Share2 size={13} /> WhatsApp
                </button>
                <a
                  href={`/bill/${viewBillId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <Printer size={13} /> Full PDF Invoice
                </a>
                <button onClick={() => setViewBillId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            {isLoadingBill ? (
              <div className="skeleton" style={{ height: 300 }} />
            ) : billDetail && (
              <div style={{
                background: 'white', color: '#111', padding: '20px', borderRadius: 8,
                fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.4,
              }}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem' }}>RETAIL TAX INVOICE</div>
                  <div>Invoice: <strong>{billDetail.billNumber}</strong></div>
                  <div>Date: {format(new Date(billDetail.createdAt), 'dd/MM/yyyy hh:mm a')}</div>
                  {billDetail.customer && <div>Customer: {billDetail.customer.name || billDetail.customer.phone}</div>}
                </div>

                <div style={{ borderTop: '1px dashed #444', borderBottom: '1px dashed #444', padding: '8px 0', margin: '8px 0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', fontWeight: 700, marginBottom: 4 }}>
                    <span>ITEM</span>
                    <span style={{ textAlign: 'center' }}>QTY</span>
                    <span style={{ textAlign: 'right' }}>AMT</span>
                  </div>
                  {billDetail.items?.map((it: any) => (
                    <div key={it.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', margin: '4px 0' }}>
                      <div>{it.itemNameAtSale}</div>
                      <div style={{ textAlign: 'center' }}>{Number(it.qty).toFixed(0)}</div>
                      <div style={{ textAlign: 'right' }}>₹{Number(it.lineTotal).toFixed(2)}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Subtotal:</span>
                    <span>₹{Number(billDetail.subtotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tax (GST):</span>
                    <span>₹{Number(billDetail.taxTotal).toFixed(2)}</span>
                  </div>
                  {Number(billDetail.discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Discount:</span>
                      <span>−₹{Number(billDetail.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem', borderTop: '1px dashed #444', paddingTop: 6 }}>
                    <span>GRAND TOTAL:</span>
                    <span>₹{Number(billDetail.grandTotal).toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666', marginTop: 4 }}>
                    <span>Payment Mode:</span>
                    <span>{billDetail.paymentMode}</span>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.7rem', color: '#666', borderTop: '1px dotted #ccc', paddingTop: 8 }}>
                  Thank you for shopping with us! 🙏
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
      background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: 16,
    }} onClick={onClose}>
      <div className="glass-card modal-content animate-fadeIn" style={{ width: 500, maxWidth: '100%', padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Process Return for {bill.billNumber}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(113,113,122)' }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'rgb(161,161,170)', marginBottom: 16 }}>
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
                  <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>Billed: {Number(it.qty).toFixed(0)} units @ ₹{Number(it.priceAtSale).toFixed(2)}</div>
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
