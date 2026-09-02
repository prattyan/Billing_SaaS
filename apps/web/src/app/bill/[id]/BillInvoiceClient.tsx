'use client';

import { use, useEffect, useState } from 'react';
import { billingApi } from '@/lib/api';
import {
  Printer, CheckCircle2, Download, Share2,
  Phone, Calendar, User, ArrowLeft, Loader2, FileText, Check, Copy, ShieldCheck,
  Building2, CreditCard, Sparkles
} from 'lucide-react';
import { format, addDays } from 'date-fns';
import Link from 'next/link';
import { getPublicInvoiceUrl, formatWhatsAppBillMessage } from '@/lib/utils';

export default function BillInvoiceClient({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  let billId = resolvedParams?.id;
  if (typeof window !== 'undefined' && (!billId || billId === 'invoice')) {
    const searchParams = new URLSearchParams(window.location.search);
    const queryId = searchParams.get('id');
    const segments = window.location.pathname.split('/').filter(Boolean);
    const lastSeg = segments[segments.length - 1];
    if (queryId) {
      billId = queryId;
    } else if (lastSeg && lastSeg !== 'invoice' && lastSeg !== 'bill') {
      billId = lastSeg;
    }
  }

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

  const handleShareWhatsApp = () => {
    if (!bill) return;
    const rawPhone = bill.customer?.phone || bill.customerPhone || '';
    const phone = rawPhone.startsWith('GUEST-') ? '' : rawPhone;
    const invoiceUrl = getPublicInvoiceUrl(bill.id);
    const text = formatWhatsAppBillMessage(bill, invoiceUrl);
    const url = phone
      ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgb(var(--surface-0))', color: 'rgb(var(--text-secondary))', gap: 14,
      }}>
        <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', color: 'rgb(var(--color-primary))' }} />
        <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>Loading Official Invoice...</p>
      </div>
    );
  }

  if (error || !bill) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: 'rgb(var(--surface-0))', color: 'rgb(var(--text-secondary))', padding: 24, textAlign: 'center',
      }}>
        <FileText size={48} style={{ opacity: 0.3, marginBottom: 12, color: 'rgb(var(--text-muted))' }} />
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 6 }}>Invoice Not Found</h2>
        <p style={{ fontSize: '0.875rem', marginBottom: 20 }}>{error || 'This invoice may have been deleted or the link is invalid.'}</p>
        <Link href="/billing" className="btn-primary">
          Back to Billing
        </Link>
      </div>
    );
  }

  const tenant = bill.tenant;
  const settings = tenant?.shopSettings || tenant?.settings;
  const rawCustomerPhone = bill.customer?.phone || bill.customerPhone || '';
  const customerPhone = rawCustomerPhone.startsWith('GUEST-') ? '' : rawCustomerPhone;
  const customerName = bill.customer?.name || bill.customerName || (customerPhone ? 'Customer' : 'Studio Den');
  const invoiceDate = bill.createdAt ? new Date(bill.createdAt) : new Date();
  const dueDate = addDays(invoiceDate, 6);

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(var(--surface-0))', color: 'rgb(var(--text-primary))', padding: '32px 20px' }}>
      {/* ── Top Floating Action Bar (Hidden on print) ── */}
      <div
        className="hide-print"
        style={{
          maxWidth: 920,
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <Link
          href="/billing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.84rem',
            fontWeight: 600,
            color: 'rgb(var(--text-secondary))',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} /> Back to Invoices
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleShareWhatsApp}
            className="btn-secondary"
            style={{
              padding: '8px 18px',
              fontSize: '0.84rem',
              gap: 6,
              color: 'rgb(var(--color-primary-dark))',
            }}
          >
            <Share2 size={15} /> WhatsApp
          </button>

          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{
              padding: '8px 22px',
              fontSize: '0.84rem',
              gap: 6,
            }}
          >
            <Printer size={15} /> Print / Save PDF
          </button>
        </div>
      </div>

      {/* ── Exact Invoice Canvas matching reference image ── */}
      <div
        className="card invoice-sheet"
        style={{
          maxWidth: 920,
          margin: '0 auto',
          background: '#ffffff',
          borderRadius: 20,
          padding: '48px 52px',
          boxShadow: '0 4px 24px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
          border: '1px solid rgb(var(--border-rgb))',
        }}
      >
        {/* ── Header: Title, Meta Info, & Logo Box ── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 44,
          flexWrap: 'wrap',
          gap: 20,
        }}>
          <div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 16, letterSpacing: '-0.03em' }}>
              Invoice
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', rowGap: 8, fontSize: '0.86rem' }}>
              <span style={{ color: 'rgb(var(--text-muted))', fontWeight: 500 }}>Invoice No.</span>
              <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>#{bill.billNumber || 'INV0001'}</span>

              <span style={{ color: 'rgb(var(--text-muted))', fontWeight: 500 }}>Invoice Date</span>
              <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{format(invoiceDate, 'MMM dd, yyyy')}</span>

              <span style={{ color: 'rgb(var(--text-muted))', fontWeight: 500 }}>Due Date</span>
              <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{format(dueDate, 'MMM dd, yyyy')}</span>
            </div>
          </div>

          {/* Dashed "Your logo here" box matching reference image */}
          <div style={{
            width: 170,
            height: 84,
            borderRadius: 999,
            border: '1.5px dashed rgb(var(--border-rgb))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgb(var(--text-secondary))',
            fontSize: '0.85rem',
            fontWeight: 500,
            background: 'rgb(var(--surface-3))',
          }}>
            {tenant?.name ? (
              <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', textAlign: 'center', padding: '0 12px' }}>
                {tenant.name}
              </span>
            ) : (
              'Your logo here'
            )}
          </div>
        </div>

        {/* ── Billed By & Billed To Cards matching reference image ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 24,
          marginBottom: 44,
        }}>
          {/* Card 1: Billed By */}
          <div style={{
            background: 'rgb(var(--surface-3))',
            borderRadius: 14,
            padding: '24px 26px',
            border: '1px solid rgb(var(--border-subtle))',
          }}>
            <div style={{
              fontSize: '0.86rem',
              fontWeight: 700,
              color: 'rgb(var(--color-primary))',
              marginBottom: 12,
            }}>
              Billed By
            </div>

            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 8 }}>
              {tenant?.name || 'Garcia Albert'}
            </div>

            <div style={{ fontSize: '0.84rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.5, marginBottom: 12 }}>
              {settings?.address || '2834 Whispering Pines Court Orlando, USA 32801'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', rowGap: 4, fontSize: '0.82rem' }}>
              <span style={{ color: 'rgb(var(--text-muted))' }}>Email</span>
              <span style={{ color: 'rgb(var(--text-primary))', fontWeight: 500 }}>{tenant?.email || 'designs@gmail.com'}</span>

              <span style={{ color: 'rgb(var(--text-muted))' }}>Phone</span>
              <span style={{ color: 'rgb(var(--text-primary))', fontWeight: 500 }}>{settings?.phone || '+1 (555) 654 3210'}</span>
            </div>
          </div>

          {/* Card 2: Billed To */}
          <div style={{
            background: 'rgb(var(--surface-3))',
            borderRadius: 14,
            padding: '24px 26px',
            border: '1px solid rgb(var(--border-subtle))',
          }}>
            <div style={{
              fontSize: '0.86rem',
              fontWeight: 700,
              color: 'rgb(var(--color-primary))',
              marginBottom: 12,
            }}>
              Billed To
            </div>

            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 8 }}>
              {customerName}
            </div>

            <div style={{ fontSize: '0.84rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.5, marginBottom: 12 }}>
              {bill.customer?.address || '901 S. Figueroa Street, Suite 1205 Los Angeles, CA 90015'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', rowGap: 4, fontSize: '0.82rem' }}>
              <span style={{ color: 'rgb(var(--text-muted))' }}>Email</span>
              <span style={{ color: 'rgb(var(--text-primary))', fontWeight: 500 }}>{bill.customer?.email || 'info@studioden.com'}</span>

              <span style={{ color: 'rgb(var(--text-muted))' }}>Phone</span>
              <span style={{ color: 'rgb(var(--text-primary))', fontWeight: 500 }}>{customerPhone || '+1 (000) 505 0505'}</span>
            </div>
          </div>
        </div>

        {/* ── Services and Description Table matching reference image ── */}
        <div style={{ marginBottom: 44 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgb(var(--surface-2))' }}>
                <th style={{
                  padding: '14px 18px',
                  textAlign: 'left',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'rgb(var(--text-primary))',
                  borderTopLeftRadius: 10,
                  borderBottomLeftRadius: 10,
                }}>
                  Service and description
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 700, color: 'rgb(var(--text-primary))', width: 80 }}>
                  Qty
                </th>
                <th style={{ padding: '14px 18px', textAlign: 'right', fontSize: '0.82rem', fontWeight: 700, color: 'rgb(var(--text-primary))', width: 120 }}>
                  Rate
                </th>
                <th style={{
                  padding: '14px 18px',
                  textAlign: 'right',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: 'rgb(var(--text-primary))',
                  width: 120,
                  borderTopRightRadius: 10,
                  borderBottomRightRadius: 10,
                }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {bill.items?.length > 0 ? (
                bill.items.map((it: any, idx: number) => {
                  const name = it.itemNameAtSale || it.name || it.item?.name || 'UX Strategy';
                  const qty = Number(it.qty || 1);
                  const price = Number(it.priceAtSale || it.price || 500);
                  const total = Number(it.lineTotal || (qty * price));
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid rgb(var(--border-subtle))' }}>
                      <td style={{ padding: '20px 18px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
                          {name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))', lineHeight: 1.4 }}>
                          Create and send unlimited professional invoices for free. Use our unique features to collect payments faster.
                        </div>
                      </td>
                      <td style={{ padding: '20px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                        {qty}
                      </td>
                      <td style={{ padding: '20px 18px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                        ${price.toFixed(0)}
                      </td>
                      <td style={{ padding: '20px 18px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                        ${total.toFixed(0)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <>
                  <tr style={{ borderBottom: '1px solid rgb(var(--border-subtle))' }}>
                    <td style={{ padding: '20px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
                        UX Strategy
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))', lineHeight: 1.4 }}>
                        Create and send unlimited professional invoices for free. Use our unique features to collect payments faster.
                      </div>
                    </td>
                    <td style={{ padding: '20px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                      1
                    </td>
                    <td style={{ padding: '20px 18px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                      $500
                    </td>
                    <td style={{ padding: '20px 18px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                      $500
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid rgb(var(--border-subtle))' }}>
                    <td style={{ padding: '20px 18px' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
                        Design System
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'rgb(var(--text-muted))', lineHeight: 1.4 }}>
                        Create and send unlimited professional invoices for free. Use our unique features to collect payments faster.
                      </div>
                    </td>
                    <td style={{ padding: '20px 18px', textAlign: 'center', fontWeight: 600, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                      1
                    </td>
                    <td style={{ padding: '20px 18px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                      $5000
                    </td>
                    <td style={{ padding: '20px 18px', textAlign: 'right', fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))', verticalAlign: 'top' }}>
                      $5000
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Bottom Section: Bank Details, Terms & Conditions & Totals matching reference image ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 36,
          alignItems: 'flex-start',
        }}>
          {/* Left: Bank Details & Terms */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {/* Bank Account Details */}
            <div>
              <div style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: 'rgb(var(--color-primary))',
                marginBottom: 12,
              }}>
                Bank Account Details
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', rowGap: 6, fontSize: '0.82rem' }}>
                <span style={{ color: 'rgb(var(--text-muted))' }}>Bank Name</span>
                <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>HDFC Bank</span>

                <span style={{ color: 'rgb(var(--text-muted))' }}>Account Holder Name</span>
                <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>Foobar Labs</span>

                <span style={{ color: 'rgb(var(--text-muted))' }}>Account Number</span>
                <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', fontFamily: 'monospace' }}>45366287987</span>

                <span style={{ color: 'rgb(var(--text-muted))' }}>IFSC</span>
                <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))', fontFamily: 'monospace' }}>HDFC0018159</span>

                <span style={{ color: 'rgb(var(--text-muted))' }}>Account Type</span>
                <span style={{ fontWeight: 600, color: 'rgb(var(--text-primary))' }}>Savings</span>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div>
              <div style={{
                fontSize: '0.86rem',
                fontWeight: 700,
                color: 'rgb(var(--color-primary))',
                marginBottom: 8,
              }}>
                Terms and Conditions
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.5, margin: 0 }}>
                Please pay within 15 days from the date of invoice, overdue interest @ 14% will be charged on delayed payments.
              </p>
              <p style={{ fontSize: '0.8rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.5, margin: '4px 0 0' }}>
                Please quote invoice number when remitting funds.
              </p>
            </div>
          </div>

          {/* Right: Totals Summary & Amount Due */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            paddingLeft: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'rgb(var(--text-secondary))' }}>
              <span>Sub Total</span>
              <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>${Number(bill.subtotal || 5500).toFixed(0)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'rgb(var(--text-secondary))' }}>
              <span>Discount(0%)</span>
              <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>${Number(bill.discount || 0).toFixed(0)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.86rem', color: 'rgb(var(--text-secondary))' }}>
              <span>VAT(5%)</span>
              <span style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>${Number(bill.taxTotal || 275).toFixed(0)}</span>
            </div>

            {/* Big Amount Due row */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 16,
              marginTop: 10,
              borderTop: '1px solid rgb(var(--border-rgb))',
            }}>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'rgb(var(--text-primary))', letterSpacing: '-0.02em' }}>
                Amount Due
              </span>
              <span style={{ fontSize: '1.45rem', fontWeight: 800, color: 'rgb(var(--text-primary))', letterSpacing: '-0.02em' }}>
                ${Number(bill.grandTotal || 5775).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
