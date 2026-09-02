'use client';

import { X, CheckCircle2, QrCode, ShieldCheck, AlertCircle, Loader2, Lock } from 'lucide-react';

interface UpiQrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  upiId?: string;
  shopName?: string;
  onConfirmPayment: () => void;
  isPending: boolean;
}

export default function UpiQrPaymentModal({
  isOpen,
  onClose,
  grandTotal,
  upiId,
  shopName = 'Retail Shop',
  onConfirmPayment,
  isPending,
}: UpiQrPaymentModalProps) {
  if (!isOpen) return null;

  const cleanUpiId = (upiId || '').trim();
  const cleanAmount = grandTotal.toFixed(2);

  const upiDeepLink = cleanUpiId
    ? `upi://pay?pa=${encodeURIComponent(cleanUpiId)}&pn=${encodeURIComponent(shopName)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent('Shop Bill Payment')}`
    : '';

  const qrImageUrl = upiDeepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upiDeepLink)}`
    : '';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2500,
        background: 'rgba(5, 5, 8, 0.85)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%', maxWidth: 420,
          background: '#ffffff',
          border: '1px solid rgb(var(--border-rgb))',
          borderRadius: 20,
          padding: '28px 24px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.12)',
          position: 'relative',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'rgb(var(--color-primary))',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(78, 159, 118, 0.25)',
            }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>
                Instant UPI Payment
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgb(var(--text-secondary))', margin: 0 }}>
                Scan with GPay, PhonePe, Paytm or any UPI App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgb(var(--surface-2))',
              border: 'none',
              color: 'rgb(var(--text-secondary))',
              cursor: 'pointer',
              padding: 6,
              borderRadius: 8,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Bill Amount & Locked Shop UPI Badge */}
        <div style={{
          padding: '16px 18px', borderRadius: 14,
          background: 'rgb(var(--color-primary-light))',
          border: '1px solid rgba(78, 159, 118, 0.3)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: '0.74rem', color: 'rgb(var(--text-secondary))', fontWeight: 600, display: 'block' }}>
              Amount Payable via UPI
            </span>
            <span style={{ fontSize: '1.55rem', fontWeight: 800, color: 'rgb(var(--color-primary-dark))', letterSpacing: '-0.02em' }}>
              ${cleanAmount}
            </span>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.78rem', color: 'rgb(var(--text-secondary))' }}>
            <div style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', marginBottom: 2 }}>{shopName}</div>
            {cleanUpiId && (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: '0.72rem', color: 'rgb(var(--color-primary-dark))',
                background: '#ffffff', padding: '3px 8px', borderRadius: 6,
                fontWeight: 600, border: '1px solid rgba(78, 159, 118, 0.25)',
              }}>
                <Lock size={10} /> {cleanUpiId}
              </div>
            )}
          </div>
        </div>

        {/* QR Code Container or Missing UPI ID warning */}
        {!cleanUpiId ? (
          <div style={{
            padding: 24, borderRadius: 14,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'center',
          }}>
            <AlertCircle size={32} color="#d97706" style={{ margin: '0 auto' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#d97706', marginBottom: 4 }}>
                Shop UPI ID Not Configured
              </div>
              <div style={{ fontSize: '0.78rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.4 }}>
                The shop owner can set the merchant UPI ID in <strong style={{ color: 'rgb(var(--text-primary))' }}>Settings → Shop Settings</strong>.
                UPI ID cannot be edited during checkout.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: '#ffffff',
              padding: 14,
              borderRadius: 16,
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
              border: '2px solid rgb(var(--border-rgb))',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="UPI Payment QR Code"
                style={{ width: 200, height: 200, display: 'block', borderRadius: 8 }}
              />
            </div>

            {/* Security note */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: '0.74rem', color: 'rgb(var(--text-secondary))',
            }}>
              <ShieldCheck size={14} color="rgb(var(--color-primary-dark))" />
              <span>Verified merchant payment to <strong>{cleanUpiId}</strong></span>
            </div>
          </div>
        )}

        {/* Footer Confirm Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn-primary"
            style={{
              width: '100%', height: 44, fontSize: '0.92rem', fontWeight: 800, borderRadius: 999,
              justifyContent: 'center',
            }}
            disabled={!cleanUpiId || isPending}
            onClick={onConfirmPayment}
          >
            {isPending ? (
              <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing Bill...</>
            ) : (
              <><CheckCircle2 size={16} /> Confirm Payment Paid · ${cleanAmount}</>
            )}
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', height: 38, fontSize: '0.82rem', justifyContent: 'center', borderRadius: 999 }}
            onClick={onClose}
          >
            Cancel / Choose Another Mode
          </button>
        </div>
      </div>
    </div>
  );
}
