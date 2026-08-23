'use client';

import { use, useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import {
  Printer, Share2, CheckCircle2, Store,
  Phone, Calendar, User, ArrowLeft, Loader2, FileText, Check, Copy
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { getPublicInvoiceUrl, formatWhatsAppBillMessage } from '@/lib/utils';

export default function BillInvoiceClient({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const billId = resolvedParams.id;

  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadBill() {
      try {
        setLoading(true);
        const res = await billingApi.getPublic(billId);
        setBill(res.data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Invoice not found or expired');
      } finally {
        setLoading(false);
      }
    }
    if (billId) {
      loadBill();
    }
  }, [billId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!bill) return;
    const rawPhone = bill.customer?.phone || bill.customerPhone || '';
    const phone = rawPhone.startsWith('GUEST-') ? '' : rawPhone;
    const invoiceUrl = getPublicInvoiceUrl(bill.id);
    const text = formatWhatsAppBillMessage(bill, invoiceUrl);

    const url = phone
      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    const url = getPublicInvoiceUrl(billId);
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#a1a1aa', gap: 12,
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'rgb(139, 92, 246)' }} />
        <p style={{ fontWeight: 600 }}>Loading Official Invoice...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#a1a1aa', padding: 24, textAlign: 'center',
      }}>
        <FileText size={48} style={{ opacity: 0.3, marginBottom: 12 }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fafafa', marginBottom: 6 }}>Invoice Not Found</h2>
        <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>{error || 'This invoice may have been deleted or the link is invalid.'}</p>
        <Link href="/" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <ArrowLeft size={16} /> Return to Home
        </Link>
      </div>
    );
  }

  const tenant = bill.tenant;
  const settings = tenant?.shopSettings;
  const rawCustomerPhone = bill.customer?.phone || bill.customerPhone || '';
  const customerPhone = rawCustomerPhone.startsWith('GUEST-') ? '' : rawCustomerPhone;
  const customerName = bill.customer?.name || bill.customerName || (customerPhone ? '' : 'Walk-in Customer');

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#fafafa', padding: '24px 16px' }}>
      {/* Action Toolbar */}
      <div style={{
        maxWidth: 480, margin: '0 auto 20px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap',
      }} className="hide-print">
        <button onClick={handlePrint} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          <Printer size={16} /> Print Tax Invoice
        </button>
        <button onClick={handleShareWhatsApp} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem', color: '#25D366', borderColor: 'rgba(37, 211, 102, 0.3)' }}>
          <Share2 size={16} /> WhatsApp Receipt
        </button>
        <button onClick={handleCopyLink} className="btn-secondary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
          {copied ? <Check size={16} color="rgb(52,211,153)" /> : <Copy size={16} />}
          {copied ? 'Copied Link' : 'Copy Link'}
        </button>
      </div>

      {/* Invoice Container */}
      <div
        className="receipt-paper"
        style={{
          maxWidth: 480, margin: '0 auto', background: '#ffffff', color: '#09090b', borderRadius: 16,
          padding: '28px 24px 36px', fontFamily: '"Courier Prime", Courier, monospace', fontSize: '0.82rem',
          lineHeight: 1.4, boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#000' }}>
            {tenant?.name || 'RETAIL SUPERMARKET'}
          </div>
          {settings?.address && (
            <div style={{ fontSize: '0.72rem', color: '#3f3f46', marginTop: 2 }}>{settings.address}</div>
          )}
          {settings?.phone && (
            <div style={{ fontSize: '0.72rem', color: '#3f3f46' }}>Ph: {settings.phone}</div>
          )}
          {settings?.gstin && (
            <div style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: 4 }}>GSTIN: {settings.gstin}</div>
          )}
        </div>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem', margin: '8px 0' }}>
          ==========================================
        </div>

        <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>TAX INVOICE</span>
            <span>{bill.billNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.72rem' }}>
            <span>Date:</span>
            <span>{bill.createdAt ? format(new Date(bill.createdAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}</span>
          </div>
          {(customerName || customerPhone) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.72rem' }}>
              <span>Customer:</span>
              <span>{customerName} {customerPhone ? `(${customerPhone})` : ''}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.72rem' }}>
            <span>Cashier:</span>
            <span>{bill.biller?.name || 'Store Operator'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.72rem' }}>
            <span>Payment Mode:</span>
            <span style={{ fontWeight: 700, color: '#000' }}>{bill.paymentMode}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem', margin: '8px 0' }}>
          ------------------------------------------
        </div>

        {/* Item Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', margin: '6px 0' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #a1a1aa', textAlign: 'left' }}>
              <th style={{ paddingBottom: 4 }}>ITEM</th>
              <th style={{ paddingBottom: 4, textAlign: 'center' }}>QTY</th>
              <th style={{ paddingBottom: 4, textAlign: 'right' }}>PRICE</th>
              <th style={{ paddingBottom: 4, textAlign: 'right' }}>AMT</th>
            </tr>
          </thead>
          <tbody>
            {bill.items?.map((item: any, idx: number) => {
              const itemName = item.item?.name || item.name || 'Item';
              const qty = Number(item.qty);
              const price = Number(item.priceAtSale || item.price);
              const amount = Number(item.lineTotal || (qty * price));
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #f4f4f5' }}>
                  <td style={{ padding: '6px 0', wordBreak: 'break-word', maxWidth: 160 }}>
                    <div style={{ fontWeight: 700 }}>{itemName}</div>
                    {item.taxPercent > 0 && (
                      <div style={{ fontSize: '0.64rem', color: '#71717a' }}>Tax: {item.taxPercent}%</div>
                    )}
                  </td>
                  <td style={{ padding: '6px 0', textAlign: 'center', verticalAlign: 'top' }}>{qty}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', verticalAlign: 'top' }}>₹{price.toFixed(2)}</td>
                  <td style={{ padding: '6px 0', textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>₹{amount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem', margin: '8px 0' }}>
          ------------------------------------------
        </div>

        {/* Totals Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>₹{Number(bill.subtotal).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Tax / GST:</span>
            <span>₹{Number(bill.taxTotal).toFixed(2)}</span>
          </div>
          {Number(bill.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#15803d', fontWeight: 700 }}>
              <span>Discount Applied:</span>
              <span>−₹{Number(bill.discount).toFixed(2)}</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900,
            borderTop: '2px solid #000', borderBottom: '2px solid #000', padding: '6px 0', marginTop: 4,
          }}>
            <span>GRAND TOTAL:</span>
            <span>₹{Number(bill.grandTotal).toFixed(2)}</span>
          </div>
        </div>

        {/* Footer Greetings */}
        <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.72rem', color: '#52525b' }}>
          <div style={{ fontWeight: 800, color: '#000', fontSize: '0.8rem', marginBottom: 2 }}>THANK YOU FOR SHOPPING!</div>
          <div>Please visit again. Have a great day!</div>
          <div style={{ fontSize: '0.64rem', color: '#a1a1aa', marginTop: 8 }}>
            Powered by BillFlow SaaS · Tax Invoice
          </div>
        </div>
      </div>
    </div>
  );
}
