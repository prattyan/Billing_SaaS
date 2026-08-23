'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Printer, Download, Share2, CheckCircle2, Store,
  Phone, Calendar, User, X, FileText, Sparkles, ArrowRight,
  Receipt, Check, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { getPublicInvoiceUrl, formatWhatsAppBillMessage } from '@/lib/utils';

interface ThermalPrinterBillModalProps {
  bill: any;
  onClose: () => void;
}

export default function ThermalPrinterBillModal({ bill, onClose }: ThermalPrinterBillModalProps) {
  const [isPrintingAnim, setIsPrintingAnim] = useState(true);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPrintingAnim(false);
    }, 1400);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || (e.key === 'Enter' && !isPrintingAnim)) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, isPrintingAnim]);

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const rawPhone = bill.customer?.phone || bill.customerPhone || '';
    const phone = rawPhone.startsWith('GUEST-') ? '' : rawPhone;
    const invoiceUrl = getPublicInvoiceUrl(bill.id);
    const text = formatWhatsAppBillMessage(bill, invoiceUrl);

    const url = phone
      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const tenant = bill.tenant;
  const settings = tenant?.shopSettings || tenant?.settings;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2000,
        background: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        style={{
          display: 'flex', gap: 24, alignItems: 'flex-start',
          maxWidth: 900, width: '100%', justifyContent: 'center',
          flexWrap: 'wrap-reverse',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── LEFT: THERMAL PRINTER HARDWARE & RECEIPT ROLL ─────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 380, flexShrink: 0 }}>
          {/* Printer Dispenser Machine Head */}
          <div style={{
            width: '100%', background: 'linear-gradient(180deg, #18181b 0%, #09090b 100%)',
            borderRadius: '16px 16px 4px 4px', border: '1px solid rgba(255,255,255,0.12)',
            padding: '12px 18px', boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
            position: 'relative', zIndex: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: isPrintingAnim ? '#22c55e' : '#3b82f6',
                  boxShadow: isPrintingAnim ? '0 0 12px #22c55e' : '0 0 8px #3b82f6',
                  animation: isPrintingAnim ? 'pulse 0.8s infinite' : 'none',
                }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#a1a1aa', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {isPrintingAnim ? '⚡ Thermal Head Printing…' : '✅ Print Ready · Auto-Cutter'}
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#71717a', fontWeight: 600, fontFamily: 'monospace' }}>
                POS-80MM
              </span>
            </div>

            {/* Paper Exit Slot with Metallic Lip */}
            <div style={{
              width: '100%', height: 10, background: '#000000',
              borderRadius: 4, borderBottom: '2px solid rgba(255,255,255,0.2)',
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.9)',
            }} />
          </div>

          {/* Emerged Thermal Long Portrait Receipt */}
          <div
            ref={receiptRef}
            className="receipt-paper"
            style={{
              width: '92%',
              background: '#ffffff',
              color: '#09090b',
              padding: '24px 20px 32px',
              fontFamily: '"Courier Prime", Courier, "Lucida Console", monospace',
              fontSize: '0.75rem',
              lineHeight: 1.35,
              boxShadow: '0 20px 40px rgba(0,0,0,0.4), 0 4px 12px rgba(0,0,0,0.2)',
              borderBottom: '3px dashed #d1d5db',
              position: 'relative',
              animation: 'slideOutReceipt 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
              transformOrigin: 'top center',
              maxHeight: '75vh',
              overflowY: 'auto',
            }}
          >
            {/* Store Branding Header */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', color: '#000' }}>
                {tenant?.name || 'RETAIL SUPERMARKET'}
              </div>
              {settings?.address && (
                <div style={{ fontSize: '0.68rem', color: '#3f3f46', marginTop: 2 }}>{settings.address}</div>
              )}
              {settings?.phone && (
                <div style={{ fontSize: '0.68rem', color: '#3f3f46' }}>Ph: {settings.phone}</div>
              )}
              {settings?.gstin && (
                <div style={{ fontSize: '0.7rem', fontWeight: 800, marginTop: 3 }}>GSTIN: {settings.gstin}</div>
              )}
            </div>

            {/* Separator */}
            <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '6px 0' }}>
              ================================
            </div>

            {/* Receipt Meta */}
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
                <span>
                  {bill.customer?.name && bill.customer.name !== 'Walk-in Customer'
                    ? `${bill.customer.name}${bill.customer?.phone && !bill.customer.phone.startsWith('GUEST-') ? ` (${bill.customer.phone})` : ''}`
                    : (bill.customer?.phone && !bill.customer.phone.startsWith('GUEST-') || bill.customerPhone ? `Walk-in (${bill.customer?.phone || bill.customerPhone})` : 'Walk-in Customer')}
                </span>
              </div>
            </div>

            {/* Separator */}
            <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '6px 0' }}>
              --------------------------------
            </div>

            {/* Column Headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 38px 48px 52px', fontWeight: 800, fontSize: '0.68rem', borderBottom: '1px solid #e4e4e7', paddingBottom: 4 }}>
              <span>ITEM</span>
              <span style={{ textAlign: 'center' }}>QTY</span>
              <span style={{ textAlign: 'right' }}>RATE</span>
              <span style={{ textAlign: 'right' }}>TOTAL</span>
            </div>

            {/* Items List */}
            <div style={{ padding: '6px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {bill.items?.map((item: any) => (
                <div key={item.id}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 38px 48px 52px', fontSize: '0.72rem' }}>
                    <span style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.itemNameAtSale}
                    </span>
                    <span style={{ textAlign: 'center' }}>{Number(item.qty).toFixed(0)}</span>
                    <span style={{ textAlign: 'right' }}>{Number(item.priceAtSale).toFixed(2)}</span>
                    <span style={{ textAlign: 'right', fontWeight: 800 }}>{Number(item.lineTotal).toFixed(2)}</span>
                  </div>
                  {item.barcodeAtSale && (
                    <div style={{ fontSize: '0.6rem', color: '#71717a' }}>
                      #{item.barcodeAtSale} · GST {Number(item.taxPercentAtSale)}%
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Separator */}
            <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '4px 0' }}>
              --------------------------------
            </div>

            {/* Summary Totals */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: '0.72rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
                <span>Subtotal (Net):</span>
                <span>₹{Number(bill.subtotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#52525b' }}>
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
                display: 'flex', justifyContent: 'space-between',
                fontSize: '1rem', fontWeight: 900, borderTop: '2px dashed #000',
                borderBottom: '2px dashed #000', padding: '6px 0', margin: '6px 0',
                color: '#000',
              }}>
                <span>TOTAL AMOUNT:</span>
                <span>₹{Number(bill.grandTotal).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#3f3f46' }}>
                <span>Payment Mode:</span>
                <span style={{ fontWeight: 800 }}>{bill.paymentMode} ({bill.status})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#71717a' }}>
                <span>Total Items:</span>
                <span>{bill.items?.length || 1} ({bill.items?.reduce((acc: number, i: any) => acc + Number(i.qty), 0) || 1} units)</span>
              </div>
            </div>

            {/* Separator */}
            <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.7rem', margin: '8px 0 6px' }}>
              ================================
            </div>

            {/* QR Code for Customer Self-Scan */}
            <div style={{ textAlign: 'center', marginTop: 10, padding: '8px 0', borderTop: '1px dashed #e4e4e7' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#3f3f46', marginBottom: 4 }}>
                SCAN TO DOWNLOAD E-BILL
              </div>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(getPublicInvoiceUrl(bill.id))}`}
                alt="Invoice QR Code"
                style={{ width: 88, height: 88, margin: '0 auto', display: 'block', borderRadius: 4 }}
              />
              <div style={{ fontSize: '0.58rem', color: '#71717a', marginTop: 3 }}>
                Point phone camera to view invoice
              </div>
            </div>

            {/* Barcode Stripe Graphic & Footer */}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              {/* Simulated 1D Barcode Pattern */}
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
        </div>

        {/* ── RIGHT: ACTION CONTROLS & DETAILS PANEL ───────────────────── */}
        <div style={{
          flex: '1 1 320px', maxWidth: 420,
          display: 'flex', flexDirection: 'column', gap: 16,
        }}>
          {/* Header Card */}
          <div className="glass-card animate-fadeIn" style={{ padding: 22, borderRadius: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{
                width: 44, height: 44, borderRadius: '50%',
                background: 'rgba(52,211,153,0.15)', border: '2px solid rgba(52,211,153,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={24} color="rgb(52,211,153)" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                  Sale Completed!
                </h2>
                <p style={{ fontSize: '0.78rem', color: '#a1a1aa', margin: 0 }}>
                  Invoice recorded in Supabase PostgreSQL
                </p>
              </div>
            </div>

            {/* Quick Bill Info Box */}
            <div style={{
              background: 'rgb(var(--surface-2))', borderRadius: 12, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a1a1aa' }}>Invoice Number:</span>
                <code style={{ fontWeight: 800, color: 'rgb(167,139,250)' }}>{bill.billNumber}</code>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a1a1aa' }}>Customer:</span>
                <span style={{ fontWeight: 600 }}>
                  {bill.customer?.name && bill.customer.name !== 'Walk-in Customer'
                    ? bill.customer.name
                    : (bill.customer?.phone || bill.customerPhone ? `Walk-in (${bill.customer?.phone || bill.customerPhone})` : 'Walk-in Customer')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#a1a1aa' }}>Payment Method:</span>
                <span style={{ fontWeight: 700, color: '#34d399' }}>{bill.paymentMode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 8, fontSize: '1.1rem', fontWeight: 900 }}>
                <span>Grand Total:</span>
                <span style={{ color: '#34d399' }}>₹{Number(bill.grandTotal).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="glass-card" style={{ padding: 20, borderRadius: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Print Button */}
            <button
              onClick={handlePrint}
              className="btn-primary"
              style={{
                width: '100%', height: 46, fontSize: '0.92rem', fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'linear-gradient(135deg, rgb(139,92,246) 0%, rgb(99,102,241) 100%)',
              }}
            >
              <Printer size={18} /> Print 80mm POS Receipt
            </button>

            {/* 1-Click WhatsApp Direct (100% Free) */}
            <button
              onClick={handleShareWhatsApp}
              className="btn-secondary"
              style={{
                width: '100%', height: 44, fontSize: '0.85rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)',
              }}
            >
              <Share2 size={16} /> 💬 1-Click WhatsApp (Free & Instant)
            </button>

            {/* Native OS Share Sheet & Copy Link (Two 100% Free Options) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ justifyContent: 'center', height: 38, fontSize: '0.78rem' }}
                onClick={() => {
                  const url = getPublicInvoiceUrl(bill.id);
                  if (navigator.share) {
                    navigator.share({
                      title: `Bill ${bill.billNumber}`,
                      text: `Tax Invoice for ₹${Number(bill.grandTotal).toFixed(2)} from ${bill.tenant?.name || 'Store'}`,
                      url,
                    }).catch(() => {});
                  } else {
                    navigator.clipboard.writeText(url);
                    alert('Bill link copied to clipboard!');
                  }
                }}
              >
                <Zap size={14} color="#f59e0b" /> Share / SMS
              </button>

              <button
                type="button"
                className="btn-secondary"
                style={{ justifyContent: 'center', height: 38, fontSize: '0.78rem' }}
                onClick={() => {
                  const url = getPublicInvoiceUrl(bill.id);
                  navigator.clipboard.writeText(url);
                  alert('✅ Invoice link copied! Paste anywhere.');
                }}
              >
                📋 Copy Link
              </button>
            </div>

            {/* A4 Tax Invoice PDF Link */}
            <a
              href={`/bill/${bill.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary"
              style={{
                width: '100%', height: 40, fontSize: '0.82rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <FileText size={15} /> View & Download Full A4 Invoice
            </a>

            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 0' }} />

            {/* New Sale Button */}
            <button
              onClick={onClose}
              className="btn-secondary"
              style={{
                width: '100%', height: 42, fontSize: '0.85rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              Start Next Sale <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* Printing Slide Animation Keyframes */}
      <style jsx global>{`
        @keyframes slideOutReceipt {
          0% {
            opacity: 0;
            transform: translateY(-80px) scaleY(0.2);
            max-height: 0;
          }
          40% {
            opacity: 1;
          }
          100% {
            opacity: 1;
            transform: translateY(0) scaleY(1);
            max-height: 75vh;
          }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.85); }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          .receipt-paper, .receipt-paper * {
            visibility: visible !important;
          }
          .receipt-paper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-height: none !important;
          }
        }
      `}</style>
    </div>
  );
}
