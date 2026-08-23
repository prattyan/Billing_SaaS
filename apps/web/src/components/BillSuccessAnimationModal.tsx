'use client';

import { useEffect } from 'react';
import { CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';

interface BillSuccessAnimationModalProps {
  isOpen: boolean;
  bill: any;
  onRedirect: () => void;
  onClose?: () => void;
}

// Synthesized 2-tone victory chime (C5 -> G5)
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    [523.25, 783.99].forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = ctx.currentTime + index * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.35, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([60, 40, 100]);
    }
  } catch {}
}

export default function BillSuccessAnimationModal({
  isOpen,
  bill,
  onRedirect,
}: BillSuccessAnimationModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    playSuccessChime();

    // Auto-trigger navigation after 1.8 seconds of celebration animation
    const timer = setTimeout(() => {
      onRedirect();
    }, 1800);

    return () => clearTimeout(timer);
  }, [isOpen, onRedirect]);

  if (!isOpen || !bill) return null;

  const grandTotal = Number(bill.grandTotal || 0).toFixed(2);
  const customerName = bill.customer?.name && bill.customer.name !== 'Walk-in Customer'
    ? bill.customer.name
    : (bill.customer?.phone && !bill.customer.phone.startsWith('GUEST-') ? `Customer (${bill.customer.phone})` : 'Walk-in Customer');

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(9, 9, 11, 0.88)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
      animation: 'fadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      <div style={{
        width: '100%', maxWidth: 440,
        background: 'linear-gradient(145deg, rgba(24, 24, 32, 0.95), rgba(16, 16, 22, 0.98))',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: 24,
        padding: '36px 28px 28px',
        boxShadow: '0 25px 60px -15px rgba(139, 92, 246, 0.25), 0 0 40px rgba(52, 211, 153, 0.15)',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
        animation: 'scaleUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      }}>
        {/* Background Ambient Glow */}
        <div style={{
          position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
          width: 220, height: 220, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52, 211, 153, 0.25) 0%, rgba(139, 92, 246, 0.15) 50%, transparent 80%)',
          pointerEvents: 'none', filter: 'blur(30px)',
        }} />

        {/* Animated Checkmark Badge with Pulse Rings */}
        <div style={{ position: 'relative', width: 90, height: 90, margin: '0 auto 20px' }}>
          <div className="pulse-ring-1" />
          <div className="pulse-ring-2" />
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgb(52, 211, 153), rgb(16, 185, 129))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 10px 30px rgba(52, 211, 153, 0.45)',
            position: 'relative', zIndex: 2,
            animation: 'bounceCheck 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          }}>
            <CheckCircle2 size={52} color="#042f2e" strokeWidth={2.5} />
          </div>

          <Sparkles size={20} color="rgb(251, 191, 36)" style={{
            position: 'absolute', top: -4, right: -4, zIndex: 3,
            animation: 'sparkleFloat 2s ease-in-out infinite alternate',
          }} />
        </div>

        {/* Success Headlines */}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', marginBottom: 4 }}>
          Bill Finalized Successfully!
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'rgb(161, 161, 170)', marginBottom: 20 }}>
          Tax Invoice <strong style={{ color: 'rgb(167, 139, 250)' }}>#{bill.billNumber}</strong> created
        </p>

        {/* Bill Snapshot Card */}
        <div style={{
          padding: '16px 20px', borderRadius: 16,
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          marginBottom: 24,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'rgb(161, 161, 170)' }}>Grand Total</span>
            <span style={{ fontSize: '1.35rem', fontWeight: 800, color: 'rgb(52, 211, 153)' }}>
              ₹{grandTotal}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#a1a1aa' }}>
            <span>Payment Mode</span>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: 'rgba(139, 92, 246, 0.15)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'rgb(196, 181, 253)', fontWeight: 700,
            }}>
              {bill.paymentMode || 'CASH'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#a1a1aa' }}>
            <span>Customer</span>
            <span style={{ fontWeight: 600, color: '#e4e4e7' }}>{customerName}</span>
          </div>
        </div>

        {/* Animated Redirect Progress Bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'rgb(161, 161, 170)', marginBottom: 8 }}>
            <span>Opening official bill page...</span>
            <span style={{ color: 'rgb(167, 139, 250)', fontWeight: 700 }}>Redirecting</span>
          </div>
          <div style={{
            width: '100%', height: 5, borderRadius: 10,
            background: 'rgba(255, 255, 255, 0.1)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, rgb(139, 92, 246), rgb(52, 211, 153))',
              animation: 'progressFill 1.8s linear forwards',
            }} />
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          className="btn-primary"
          style={{
            width: '100%', height: 44, fontSize: '0.9rem', fontWeight: 800,
            borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onClick={onRedirect}
        >
          View Full Bill Page <ArrowRight size={16} />
        </button>

        {/* Scoped CSS Keyframes */}
        <style jsx>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleUp {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes bounceCheck {
            0% { transform: scale(0.3); opacity: 0; }
            60% { transform: scale(1.15); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes pulseRing {
            0% { transform: scale(0.9); opacity: 0.8; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          @keyframes progressFill {
            from { width: 0%; }
            to { width: 100%; }
          }
          @keyframes sparkleFloat {
            from { transform: translateY(0) rotate(0deg); }
            to { transform: translateY(-6px) rotate(15deg); }
          }
          .pulse-ring-1 {
            position: absolute; inset: -10px; border-radius: 50%;
            border: 2px solid rgba(52, 211, 153, 0.6);
            animation: pulseRing 1.6s ease-out infinite;
          }
          .pulse-ring-2 {
            position: absolute; inset: -20px; border-radius: 50%;
            border: 2px solid rgba(139, 92, 246, 0.4);
            animation: pulseRing 1.6s ease-out 0.4s infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
