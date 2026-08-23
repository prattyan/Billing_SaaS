'use client';

import { useState } from 'react';
import { X, CheckCircle2, QrCode, ShieldCheck, AlertCircle, Save, Loader2 } from 'lucide-react';

interface UpiQrPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotal: number;
  upiId?: string;
  shopName?: string;
  onConfirmPayment: () => void;
  isPending: boolean;
  onSaveUpiId?: (newUpiId: string) => Promise<void>;
}

export default function UpiQrPaymentModal({
  isOpen,
  onClose,
  grandTotal,
  upiId: initialUpiId,
  shopName = 'Retail Shop',
  onConfirmPayment,
  isPending,
  onSaveUpiId,
}: UpiQrPaymentModalProps) {
  const [tempUpiId, setTempUpiId] = useState('');
  const [currentUpiId, setCurrentUpiId] = useState(initialUpiId || '');
  const [isSavingUpi, setIsSavingUpi] = useState(false);

  if (!isOpen) return null;

  const upiIdToUse = currentUpiId || initialUpiId || '';
  const cleanAmount = grandTotal.toFixed(2);
  const upiDeepLink = upiIdToUse
    ? `upi://pay?pa=${encodeURIComponent(upiIdToUse)}&pn=${encodeURIComponent(shopName)}&am=${cleanAmount}&cu=INR&tn=${encodeURIComponent('Shop Bill Payment')}`
    : '';

  const qrImageUrl = upiDeepLink
    ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upiDeepLink)}`
    : '';

  const handleSaveUpi = async () => {
    if (!tempUpiId.trim()) return;
    try {
      setIsSavingUpi(true);
      if (onSaveUpiId) {
        await onSaveUpiId(tempUpiId.trim());
      }
      setCurrentUpiId(tempUpiId.trim());
    } finally {
      setIsSavingUpi(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2500,
      background: 'rgba(9, 9, 11, 0.88)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      animation: 'fadeIn 0.2s ease-out',
    }}
    onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 440,
          background: 'rgb(24, 24, 32)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 24,
          padding: '24px 22px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 30px rgba(139, 92, 246, 0.15)',
          position: 'relative',
          display: 'flex', flexDirection: 'column', gap: 16,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'linear-gradient(135deg, rgb(139, 92, 246), rgb(52, 211, 153))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)',
            }}>
              <QrCode size={20} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Instant UPI Payment QR
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'rgb(161, 161, 170)', margin: 0 }}>
                Scan with GPay, PhonePe, Paytm, BHIM, or CRED
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, padding: 6, cursor: 'pointer', color: 'rgb(161,161,170)',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Bill Amount Badge */}
        <div style={{
          padding: '12px 16px', borderRadius: 14,
          background: 'rgba(52, 211, 153, 0.08)',
          border: '1px solid rgba(52, 211, 153, 0.25)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'rgb(110, 231, 183)', fontWeight: 600, display: 'block' }}>
              Amount Payable via UPI
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 900, color: 'rgb(52, 211, 153)' }}>
              ₹{cleanAmount}
            </span>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#a1a1aa' }}>
            <div style={{ fontWeight: 700, color: '#f4f4f5' }}>{shopName}</div>
            {upiIdToUse && <div style={{ fontSize: '0.7rem', color: 'rgb(167, 139, 250)' }}>{upiIdToUse}</div>}
          </div>
        </div>

        {/* QR Code Container or Missing UPI ID prompt */}
        {!upiIdToUse ? (
          <div style={{
            padding: 20, borderRadius: 16,
            background: 'rgba(245, 158, 11, 0.08)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center',
          }}>
            <AlertCircle size={32} color="rgb(251, 191, 36)" style={{ margin: '0 auto' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'rgb(251, 191, 36)', marginBottom: 4 }}>
                Merchant UPI ID Not Configured
              </div>
              <div style={{ fontSize: '0.78rem', color: '#d4d4d8' }}>
                Enter your shop's UPI ID below to generate dynamic payment QR codes:
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <input
                type="text"
                className="input"
                placeholder="e.g. shopname@upi or 9876543210@paytm"
                value={tempUpiId}
                onChange={(e) => setTempUpiId(e.target.value)}
                style={{ height: 38, fontSize: '0.84rem' }}
              />
              <button
                type="button"
                className="btn-primary"
                style={{ height: 38, padding: '0 14px', fontSize: '0.8rem', flexShrink: 0 }}
                disabled={!tempUpiId.trim() || isSavingUpi}
                onClick={handleSaveUpi}
              >
                {isSavingUpi ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={14} /> Save</>}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: '#ffffff',
              padding: 14,
              borderRadius: 18,
              boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
              border: '2px solid rgba(139, 92, 246, 0.4)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageUrl}
                alt="UPI Payment QR Code"
                style={{ width: 220, height: 220, display: 'block', borderRadius: 8 }}
              />
            </div>

            {/* App badges */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', fontSize: '0.7rem', color: '#a1a1aa' }}>
              <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#4285F4', fontWeight: 700 }}>GPay</span>
              <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#5f259f', fontWeight: 700 }}>PhonePe</span>
              <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#00baf2', fontWeight: 700 }}>Paytm</span>
              <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#f58220', fontWeight: 700 }}>BHIM</span>
              <span style={{ padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#eab308', fontWeight: 700 }}>CRED</span>
            </div>
          </div>
        )}

        {/* Footer Confirm Action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
          <button
            type="button"
            className="btn-primary"
            style={{
              width: '100%', height: 46, fontSize: '0.95rem', fontWeight: 800, borderRadius: 14,
              background: 'linear-gradient(135deg, rgb(16, 185, 129), rgb(5, 150, 105))',
              boxShadow: '0 4px 18px rgba(16, 185, 129, 0.4)',
              justifyContent: 'center',
            }}
            disabled={!upiIdToUse || isPending}
            onClick={onConfirmPayment}
          >
            {isPending ? (
              <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Processing Bill...</>
            ) : (
              <><CheckCircle2 size={18} /> Confirm Payment Paid · ₹{cleanAmount}</>
            )}
          </button>

          <button
            type="button"
            className="btn-secondary"
            style={{ width: '100%', height: 38, fontSize: '0.8rem', justifyContent: 'center' }}
            onClick={onClose}
          >
            Cancel / Choose Another Mode
          </button>
        </div>
      </div>
    </div>
  );
}
