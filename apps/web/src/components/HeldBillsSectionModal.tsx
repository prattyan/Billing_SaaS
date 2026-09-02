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
        className="card"
        style={{
          width: '100%', maxWidth: 580, maxHeight: '85vh',
          background: '#ffffff',
          border: '1px solid rgb(var(--border-rgb))',
          borderRadius: 20,
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.12)',
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
              background: 'rgba(234, 179, 8, 0.12)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <PauseCircle size={22} color="#b45309" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>
                Parked & Held Orders
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'rgb(var(--text-secondary))', margin: 0 }}>
                Restore cart items or discard old held bills
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgb(var(--surface-2))',
              border: 'none',
              borderRadius: 8,
              padding: 6,
              cursor: 'pointer',
              color: 'rgb(var(--text-secondary))',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* List of Held Bills */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingRight: 4 }}>
          {heldBills.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: 'rgb(var(--text-muted))' }}>
              <ShoppingBag size={42} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 4, color: 'rgb(var(--text-primary))' }}>
                No Parked Bills Currently
              </div>
              <div style={{ fontSize: '0.8rem', color: 'rgb(var(--text-secondary))' }}>
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
                    background: 'rgb(var(--surface-2))',
                    border: '1px solid rgb(var(--border-rgb))',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#d97706' }}>
                          Parked Order #{heldBills.length - idx}
                        </span>
                        {timeAgo && (
                          <span style={{ fontSize: '0.74rem', color: 'rgb(var(--text-muted))', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} /> {timeAgo}
                          </span>
                        )}
                      </div>

                      {(customerName || customerPhone) && (
                        <div style={{ fontSize: '0.8rem', color: 'rgb(var(--text-primary))', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <User size={13} color="rgb(var(--color-primary-dark))" />
                          <span>{customerName || 'Customer'}</span>
                          {customerPhone && <span style={{ color: 'rgb(var(--text-secondary))' }}>({customerPhone})</span>}
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--color-primary-dark))' }}>
                        ₹{estTotal.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'rgb(var(--text-secondary))' }}>
                        {itemCount} {itemCount === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </div>

                  {/* Items Preview */}
                  {items.length > 0 && (
                    <div style={{
                      padding: '8px 12px', borderRadius: 10,
                      background: '#ffffff', border: '1px solid rgb(var(--border-rgb))',
                      fontSize: '0.78rem', color: 'rgb(var(--text-secondary))',
                      display: 'flex', flexWrap: 'wrap', gap: '6px 12px',
                    }}>
                      {items.slice(0, 4).map((it: any, i: number) => (
                        <span key={i}>
                          • {it.name || 'Item'} <strong style={{ color: 'rgb(var(--text-primary))' }}>x{it.qty}</strong>
                        </span>
                      ))}
                      {items.length > 4 && (
                        <span style={{ color: 'rgb(var(--text-muted))' }}>+{items.length - 4} more</span>
                      )}
                    </div>
                  )}

                  {/* Action */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: '8px 18px', fontSize: '0.82rem', fontWeight: 800, borderRadius: 999 }}
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
