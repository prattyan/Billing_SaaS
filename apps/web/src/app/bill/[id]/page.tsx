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

export default function PublicBillInvoicePage({ params }: { params: Promise<{ id: string }> }) {
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
        setError(err.response?.data?.message || 'Receipt not found or expired.');
      } finally {
        setLoading(false);
      }
    }
    loadBill();
  }, [billId]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    if (!bill) return;
    const phone = bill.customer?.phone || bill.customerPhone || '';
    const invoiceUrl = getPublicInvoiceUrl(bill.id);
    const text = formatWhatsAppBillMessage(bill, invoiceUrl);
    const url = phone
      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = () => {
    if (!bill) return;
    const invoiceUrl = getPublicInvoiceUrl(bill.id);
    navigator.clipboard.writeText(invoiceUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#09090b', color: '#fff', flexDirection: 'column', gap: 16
      }}>
        <Loader2 size={36} color="rgb(139,92,246)" style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>Loading official shop receipt…</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#09090b', color: '#fff', padding: 24
      }}>
        <div className="glass-card" style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <FileText size={48} color="rgb(239,68,68)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>Receipt Not Found</h2>
          <p style={{ color: '#a1a1aa', fontSize: '0.85rem', marginBottom: 24 }}>{error || 'Unable to load receipt details.'}</p>
          <Link href="/pos" className="btn-primary" style={{ display: 'inline-flex', justifyContent: 'center' }}>
            Go to POS
          </Link>
        </div>
      </div>
    );
  }

  const tenant = bill.tenant;
  const settings = tenant?.shopSettings || tenant?.settings;
  const totalUnits = bill.items?.reduce((acc: number, it: any) => acc + Number(it.qty || 0), 0) || 0;
  const invoiceUrl = getPublicInvoiceUrl(bill.id);

  const customerDisplayName = bill.customer?.name && bill.customer.name !== 'Walk-in Customer'
    ? `${bill.customer.name}${bill.customer.phone ? ` (${bill.customer.phone})` : ''}`
    : (bill.customer?.phone || bill.customerPhone ? `Walk-in (${bill.customer?.phone || bill.customerPhone})` : 'Walk-in Customer');

  return (
    <div style={{ minHeight: '100vh', background: '#09090b', color: '#f4f4f5', padding: '24px 16px' }}>
      {/* Top Action Bar (hidden when printing) */}
      <div className="no-print" style={{
        maxWidth: 420, margin: '0 auto 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
      }}>
        <Link href="/pos" className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 14px' }}>
          <ArrowLeft size={14} /> POS
        </Link>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleCopyLink}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 12px' }}
            title="Copy digital receipt URL"
          >
            {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Link'}
          </button>
          <button
            onClick={handleShareWhatsApp}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 14px', color: '#22c55e' }}
            title="Share receipt via WhatsApp"
          >
            <Share2 size={14} /> WhatsApp
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 16px' }}
          >
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* ── ONLY THIS THERMAL SHOP RECEIPT ──────────────────────────────── */}
      <div
        id="printable-receipt"
        style={{
          width: '100%',
          maxWidth: 380,
          margin: '0 auto',
          background: '#ffffff',
          color: '#111827',
          padding: '24px 20px 28px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '0.78rem',
          lineHeight: 1.4,
          borderRadius: 8,
          position: 'relative',
        }}
      >
        {/* Store Name & Header */}
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <h1 style={{
            fontSize: '1.35rem',
            fontWeight: 900,
            color: '#000000',
            letterSpacing: '0.04em',
            margin: '0 0 4px',
            textTransform: 'uppercase',
          }}>
            {tenant?.name || 'SMART POINT'}
          </h1>
          {settings?.tagline && (
            <div style={{ fontSize: '0.68rem', color: '#52525b', fontStyle: 'italic' }}>
              {settings.tagline}
            </div>
          )}
          {settings?.address && (
            <div style={{ fontSize: '0.68rem', color: '#52525b', marginTop: 2 }}>
              {settings.address}
            </div>
          )}
          {settings?.phone && (
            <div style={{ fontSize: '0.68rem', color: '#52525b' }}>
              Ph: {settings.phone}
            </div>
          )}
          {settings?.gstin && (
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#18181b', marginTop: 2 }}>
              GSTIN: {settings.gstin}
            </div>
          )}
        </div>

        {/* Separator */}
        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '4px 0 6px' }}>
          ========================================
        </div>

        {/* Receipt Meta Details */}
        <div style={{ fontSize: '0.72rem', display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
            <span>TAX INVOICE</span>
            <span>{bill.billNumber}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.68rem' }}>
            <span>Date:</span>
            <span>{format(new Date(bill.createdAt || Date.now()), 'dd/MM/yyyy hh:mm a')}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.68rem' }}>
            <span>Cashier:</span>
            <span>{bill.biller?.name || 'Counter 1'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b', fontSize: '0.68rem' }}>
            <span>Customer:</span>
            <span style={{ fontWeight: 600 }}>{customerDisplayName}</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '6px 0' }}>
          ----------------------------------------
        </div>

        {/* Itemized Table Headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 38px 48px 52px', fontWeight: 800, fontSize: '0.68rem', borderBottom: '1px solid #e4e4e7', paddingBottom: 4 }}>
          <span>ITEM</span>
          <span style={{ textAlign: 'center' }}>QTY</span>
          <span style={{ textAlign: 'right' }}>RATE</span>
          <span style={{ textAlign: 'right' }}>TOTAL</span>
        </div>

        {/* Item Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '6px 0' }}>
          {bill.items?.map((item: any) => (
            <div key={item.id} style={{ fontSize: '0.72rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 38px 48px 52px' }}>
                <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.itemNameAtSale}
                </span>
                <span style={{ textAlign: 'center' }}>{Number(item.qty).toFixed(0)}</span>
                <span style={{ textAlign: 'right' }}>{Number(item.priceAtSale).toFixed(2)}</span>
                <span style={{ textAlign: 'right', fontWeight: 700 }}>{Number(item.lineTotal).toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '0.6rem', color: '#71717a', paddingLeft: 2 }}>
                #{item.barcodeAtSale || 'SKU'} · GST {Number(item.taxPercentAtSale).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>

        {/* Separator */}
        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '4px 0' }}>
          ----------------------------------------
        </div>

        {/* Totals & Calculations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.72rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal (Net):</span>
            <span>₹{Number(bill.subtotal).toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>GST Total:</span>
            <span>₹{Number(bill.taxTotal).toFixed(2)}</span>
          </div>
          {Number(bill.discount) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#047857', fontWeight: 700 }}>
              <span>Discount:</span>
              <span>−₹{Number(bill.discount).toFixed(2)}</span>
            </div>
          )}

          <div style={{
            borderTop: '2px dashed #18181b',
            borderBottom: '2px dashed #18181b',
            padding: '6px 0',
            margin: '4px 0',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.88rem',
            fontWeight: 900,
          }}>
            <span>TOTAL AMOUNT:</span>
            <span>₹{Number(bill.grandTotal).toFixed(2)}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#3f3f46' }}>
            <span>Payment Mode:</span>
            <span style={{ fontWeight: 800 }}>{bill.paymentMode} ({bill.status})</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717a', fontSize: '0.65rem' }}>
            <span>Total Items:</span>
            <span>{bill.items?.length || 0} ({totalUnits} units)</span>
          </div>
        </div>

        {/* Separator */}
        <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '8px 0 6px' }}>
          ========================================
        </div>

        {/* QR Code for Customer Self-Scan */}
        <div style={{ textAlign: 'center', marginTop: 10, padding: '8px 0', borderTop: '1px dashed #e4e4e7' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3f3f46', marginBottom: 4 }}>
            SCAN TO DOWNLOAD E-BILL
          </div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(invoiceUrl)}`}
            alt="Invoice QR Code"
            style={{ width: 88, height: 88, margin: '0 auto', display: 'block', borderRadius: 4 }}
          />
          <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: 3 }}>
            Point phone camera to view invoice
          </div>
        </div>

        {/* Barcode Stripe Graphic & Footer */}
        <div style={{ textAlign: 'center', marginTop: 8 }}>
          <div style={{
            display: 'inline-flex', height: 26, gap: 2, alignItems: 'center',
            padding: '3px 8px', background: '#fff', margin: '0 auto 4px',
          }}>
            {Array.from({ length: 32 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
                  height: '100%',
                  background: '#18181b',
                }}
              />
            ))}
          </div>
          <div style={{ fontSize: '0.62rem', letterSpacing: '0.12em', color: '#52525b' }}>
            *{bill.billNumber}*
          </div>

          <div style={{ fontSize: '0.75rem', fontWeight: 800, marginTop: 8 }}>
            *** THANK YOU FOR SHOPPING! ***
          </div>
          <div style={{ fontSize: '0.62rem', color: '#52525b', marginTop: 2 }}>
            Please check goods before leaving · Visit again!
          </div>
        </div>
      </div>

      {/* ── PRINT STYLES FOR THERMAL POS PRINTER ───────────────────────── */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0;
            size: 80mm auto;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          #printable-receipt {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 10px !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
