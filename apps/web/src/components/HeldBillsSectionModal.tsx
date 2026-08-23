'use client';

import { PauseCircle, PlayCircle, Trash2, X, Clock, User, Phone, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface HeldBillsSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  heldBills: any[];
  onResumeHeld: (holdId: string) => void;
  isResuming?: boolean;
}

export default function HeldBillsSectionModal({
  isOpen,
  onClose,
  heldBills,
  onResumeHeld,
  isResuming,
}: HeldBillsSectionModalProps) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 2200,
        background: 'rgba(9, 9, 11, 0.85)',
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
          width: '100%', maxWidth: 580, maxHeight: '85vh',
          background: 'rgb(24, 24, 32)',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderRadius: 24,
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          display: 'flex', flexDirection: 'column', gap: 16,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 12,
              background: 'rgba(251, 191, 36, 0.15)',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PauseCircle size={22} color="rgb(251, 191, 36)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ffffff', margin: 0 }}>
                Parked Orders & Held Bills ({heldBills.length})
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgb(161, 161, 170)', margin: 0 }}>
                All staff & owners can continue any parked order
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

        {/* List of Held Bills */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
          {heldBills.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#a1a1aa' }}>
              <ShoppingBag size={42} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: '#f4f4f5' }}>
                No Parked Bills Currently
              </div>
              <div style={{ fontSize: '0.8rem' }}>
                When you click "Hold" on an active cart, it will appear here for any worker to resume.
              </div>
            </div>
          ) : (
            heldBills.map((held, idx) => {
              let parsedCart: any = {};
              try {
                parsedCart = typeof held.cartData === 'string' ? JSON.parse(held.cartData) : held.cartData;
              } catch {}

              const items = parsedCart.items || [];
              const itemCount = items.reduce((acc: number, i: any) => acc + (i.qty || 1), 0);
              const estTotal = items.reduce((acc: number, i: any) => acc + (i.priceAtSale || 0) * (i.qty || 1), 0);
              const customerName = held.customerName || parsedCart.customerName || '';
              const customerPhone = held.customerPhone || parsedCart.customerPhone || '';
              const timeAgo = held.createdAt ? formatDistanceToNow(new Date(held.createdAt), { addSuffix: true }) : '';

              return (
                <div
                  key={held.id}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 16,
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'rgb(251, 191, 36)' }}>
                          Parked Order #{heldBills.length - idx}
                        </span>
                        {timeAgo && (
                          <span style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> {timeAgo}
                          </span>
                        )}
                      </div>

                      {(customerName || customerPhone) && (
                        <div style={{ fontSize: '0.78rem', color: '#e4e4e7', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={13} color="rgb(167, 139, 250)" />
                          <span>{customerName || 'Customer'}</span>
                          {customerPhone && <span style={{ color: '#a1a1aa' }}>({customerPhone})</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'rgb(52, 211, 153)' }}>
                        ₹{estTotal.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {items.length > 0 && (
                    <div style={{
                      padding: '8px 12px', borderRadius: 10,
                      background: 'rgba(0,0,0,0.2)', fontSize: '0.76rem', color: '#d4d4d8',
                      display: 'flex', flexWrap: 'wrap', gap: '6px 12px',
                    }}>
                      {items.slice(0, 4).map((it: any, i: number) => (
                        <span key={i}>
                          • {it.name || 'Item'} <strong style={{ color: 'rgb(167, 139, 250)' }}>x{it.qty}</strong>
                        </span>
                      ))}
                      {items.length > 4 && (
                        <span style={{ color: '#a1a1aa' }}>+{items.length - 4} more</span>
                      )}
                    </div>
                  )}

                  {/* Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 800, borderRadius: 10 }}
                      disabled={isResuming}
                      onClick={() => {
                        onResumeHeld(held.id);
                        onClose();
                      }}
                    >
                      {isResuming ? (
                        <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      ) : (
                        <><PlayCircle size={14} /> Resume Order & Continue</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
