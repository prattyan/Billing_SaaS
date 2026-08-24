'use client';

import { use, useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import {
  Printer, CheckCircle2, Download,
  Phone, Calendar, User, ArrowLeft, Loader2, FileText, Check, Copy, ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { getPublicInvoiceUrl } from '@/lib/utils';

export default function BillInvoiceClient({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const billId = resolvedParams.id;

  const [bill, setBill] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#09090b', color: '#a1a1aa', gap: 12,
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'rgb(34, 197, 94)' }} />
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
      {/* Customer Action Bar */}
      <div style={{
        maxWidth: 440, margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10,
      }} className="hide-print">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#4ade80', fontSize: '0.8rem', fontWeight: 700 }}>
          <ShieldCheck size={16} />
          <span>Verified Digital Invoice</span>
        </div>
        <button
          onClick={handlePrint}
          className="btn-primary"
          style={{
            padding: '8px 18px',
            fontSize: '0.84rem',
            background: 'rgb(22, 163, 74)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 8,
          }}
        >
          <Printer size={15} /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Receipt Container */}
      <div
        className="receipt-paper"
        style={{
          maxWidth: 440, margin: '0 auto', background: '#ffffff', color: '#09090b', borderRadius: 14,
          padding: '28px 22px 32px', fontFamily: '"Courier Prime", Courier, monospace', fontSize: '0.82rem',
          lineHeight: 1.4, boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#000' }}>
            {tenant?.name || 'STORE INVOICE'}
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

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem', margin: '6px 0' }}>
          ==========================================
        </div>

        <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>TAX INVOICE</span>
            <span>{bill.billNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.72rem' }}>
            <span>Date:</span>
            <span>{bill.createdAt ? format(new Date(bill.createdAt), 'dd/MM/yyyy hh:mm a') : 'N/A'}</span>
          </div>
          {(customerName || customerPhone) && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.72rem' }}>
              <span>Customer:</span>
              <span>{customerName} {customerPhone ? `(${customerPhone})` : ''}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.72rem' }}>
            <span>Cashier:</span>
            <span>{bill.biller?.name || 'Store Staff'}</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem', margin: '6px 0' }}>
          ------------------------------------------
        </div>

        {/* Item Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', margin: '6px 0' }}>
          <thead>
            <tr style={{ borderBottom: '1px dashed #a1a1aa', textAlign: 'left' }}>
              <th style={{ paddingBottom: 4 }}>ITEM</th>
              <th style={{ paddingBottom: 4, textAlign: 'center' }}>QTY</th>
              <th style={{ paddingBottom: 4, textAlign: 'right' }}>RATE</th>
              <th style={{ paddingBottom: 4, textAlign: 'right' }}>TOTAL</th>
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
                  <td style={{ padding: '5px 0', wordBreak: 'break-word', maxWidth: 150 }}>
                    <div style={{ fontWeight: 700 }}>{itemName}</div>
                    {item.taxPercent > 0 && (
                      <div style={{ fontSize: '0.64rem', color: '#71717a' }}>Tax: {item.taxPercent}%</div>
                    )}
                  </td>
                  <td style={{ padding: '5px 0', textAlign: 'center', verticalAlign: 'top' }}>{qty}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', verticalAlign: 'top' }}>{price.toFixed(2)}</td>
                  <td style={{ padding: '5px 0', textAlign: 'right', verticalAlign: 'top', fontWeight: 700 }}>{amount.toFixed(2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem', margin: '6px 0' }}>
          ------------------------------------------
        </div>

        {/* Totals Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.78rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal (Net):</span>
            <span>₹{Number(bill.subtotal).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>GST Total:</span>
            <span>₹{Number(bill.taxTotal).toFixed(2)}</span>
          </div>
          {Number(bill.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#16a34a', fontWeight: 700 }}>
              <span>Discount:</span>
              <span>−₹{Number(bill.discount).toFixed(2)}</span>
            </div>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 900,
            borderTop: '2px dashed #000', borderBottom: '2px dashed #000', padding: '6px 0', marginTop: 4,
          }}>
            <span>TOTAL AMOUNT:</span>
            <span>₹{Number(bill.grandTotal).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#52525b', marginTop: 4 }}>
            <span>Payment Mode:</span>
            <span style={{ fontWeight: 700, color: '#000' }}>{bill.paymentMode} (PAID)</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.75rem', margin: '8px 0' }}>
          ==========================================
        </div>

        {/* Barcode & Footer Greetings */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: '0.72rem', color: '#52525b' }}>
          <div style={{ fontWeight: 800, color: '#000', fontSize: '0.82rem', marginBottom: 2 }}>
            *** THANK YOU FOR SHOPPING! ***
          </div>
          <div>Please check goods before leaving · Visit again!</div>
          <div style={{ fontSize: '0.64rem', color: '#a1a1aa', marginTop: 10 }}>
            Official GST E-Bill · Powered by BillFlow
          </div>
        </div>
      </div>
    </div>
  );
}
