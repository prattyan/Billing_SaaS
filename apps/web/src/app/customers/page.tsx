'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Search, Users, Phone, Award, IndianRupee, ShoppingBag, Eye, X,
  Calendar, ArrowUpRight, Plus, Edit2, Trash2, Mail, CheckCircle2,
  Receipt, Loader2, Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { getPublicInvoiceUrl, formatWhatsAppBillMessage } from '@/lib/utils';

export default function CustomersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Modal states for Create / Edit
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [formPhone, setFormPhone] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['customers', page, search],
    queryFn: () => customersApi.list({ page, limit: 15, search }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: customerDetail, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['customerDetail', selectedCustomerId],
    queryFn: () => (selectedCustomerId ? customersApi.get(selectedCustomerId).then((r) => r.data) : null),
    enabled: !!selectedCustomerId,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: { phone: string; name?: string; email?: string }) =>
      customersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('✅ Customer created successfully!');
      closeCustomerModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to create customer');
    },
  });

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { phone?: string; name?: string; email?: string } }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      qc.invalidateQueries({ queryKey: ['customerDetail', editingCustomer?.id] });
      toast.success('✅ Customer updated successfully!');
      closeCustomerModal();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to update customer');
    },
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
      toast.success('✅ Customer removed');
      if (selectedCustomerId) setSelectedCustomerId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to delete customer');
    },
  });

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormPhone('');
    setFormName('');
    setFormEmail('');
    setIsCustomerModalOpen(true);
  };

  const openEditModal = (c: any) => {
    setEditingCustomer(c);
    setFormPhone(c.phone || '');
    setFormName(c.name || '');
    setFormEmail(c.email || '');
    setIsCustomerModalOpen(true);
  };

  const closeCustomerModal = () => {
    setIsCustomerModalOpen(false);
    setEditingCustomer(null);
    setFormPhone('');
    setFormName('');
    setFormEmail('');
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone.trim()) {
      toast.error('Customer phone number is required');
      return;
    }

    const payload = {
      phone: formPhone.trim(),
      name: formName.trim() || undefined,
      email: formEmail.trim() || undefined,
    };

    if (editingCustomer) {
      updateCustomerMutation.mutate({ id: editingCustomer.id, data: payload });
    } else {
      createCustomerMutation.mutate(payload);
    }
  };

  const customers: any[] = data?.customers ?? [];
  const meta = data?.meta;

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Customers</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Auto-captured from counter sales & manual registry · Loyalty points & order history
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', fontSize: '0.875rem' }}
        >
          <Plus size={16} /> Add New Customer
        </button>
      </div>

      {/* Search Filter */}
      <div style={{ maxWidth: 400, position: 'relative', marginBottom: 20 }}>
        <Search size={15} style={{
          position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
          color: 'rgb(113,113,122)',
        }} />
        <input
          type="text"
          className="input"
          placeholder="Search by phone or name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ paddingLeft: 36 }}
        />
      </div>

      {/* Customers Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Total Orders</th>
              <th>Total Spend</th>
              <th>Loyalty Points</th>
              <th>First Visit</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'rgb(113,113,122)' }}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                  No customer records found. Add a customer or make a sale at the POS counter!
                </td>
              </tr>
            ) : (
              customers.map((c: any) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(52,211,153,0.2))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.75rem', color: 'rgb(167,139,250)',
                      }}>
                        {c.name?.[0]?.toUpperCase() ?? c.phone?.slice(-2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{c.name || 'Walk-in Customer'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>ID: {c.id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                      <Phone size={12} color="rgb(113,113,122)" />
                      <code>{c.phone}</code>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: c.email ? 'rgb(161,161,170)' : 'rgb(113,113,122)' }}>
                      {c.email || '—'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{c._count?.bills ?? 0}</td>
                  <td>
                    <span style={{ color: 'rgb(52,211,153)', fontWeight: 700 }}>
                      ₹{Number(c.totalSpend).toFixed(2)}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Award size={13} color="rgb(251,191,36)" />
                      <span style={{ fontWeight: 600, color: 'rgb(251,191,36)' }}>
                        {Number(c.loyaltyPoints).toFixed(0)}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'rgb(161,161,170)' }}>
                    {format(new Date(c.createdAt), 'dd MMM yyyy')}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => setSelectedCustomerId(c.id)}
                        className="btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4 }}
                        title="View order history"
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        onClick={() => openEditModal(c)}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                        title="Edit Customer"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete customer ${c.name || c.phone}?`)) {
                            deleteCustomerMutation.mutate(c.id);
                          }
                        }}
                        className="btn-secondary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'rgb(248,113,113)' }}
                        title="Delete Customer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: p === page ? 'rgb(var(--color-primary))' : 'rgb(var(--surface-2))',
                color: p === page ? 'white' : 'rgb(var(--text-secondary))',
                fontWeight: 600, fontSize: '0.875rem',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Add / Edit Customer Modal ────────────────────────────────────── */}
      {isCustomerModalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1200,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
          onClick={closeCustomerModal}
        >
          <div
            className="glass-card animate-fadeIn"
            style={{ width: '100%', maxWidth: 460, padding: 24, borderRadius: 16 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={18} color="rgb(167,139,250)" />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>
                  {editingCustomer ? 'Edit Customer Details' : 'Add New Customer'}
                </h3>
              </div>
              <button onClick={closeCustomerModal} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(161,161,170)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="label">Phone Number * (WhatsApp / Calling)</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(113,113,122)' }} />
                  <input
                    type="tel"
                    required
                    className="input"
                    placeholder="9876543210"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>

              <div>
                <label className="label">Customer Full Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Rahul Sharma"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div>
                <label className="label">Email Address (Optional)</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgb(113,113,122)' }} />
                  <input
                    type="email"
                    className="input"
                    placeholder="rahul@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    style={{ paddingLeft: 36 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={closeCustomerModal}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center' }}
                  disabled={createCustomerMutation.isPending || updateCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending || updateCustomerMutation.isPending ? (
                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                  ) : (
                    <>{editingCustomer ? 'Update Customer' : 'Save Customer'}</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Customer Detail Slide-out / Modal ────────────────────────────── */}
      {selectedCustomerId && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1100,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
            display: 'flex', justifyContent: 'flex-end',
          }}
          onClick={() => setSelectedCustomerId(null)}
        >
          <div
            className="glass-card"
            style={{
              width: '100%', maxWidth: 480, height: '100%',
              borderRadius: 0, padding: 28, overflowY: 'auto',
              display: 'flex', flexDirection: 'column', gap: 20,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Customer Profile</h2>
              <button
                onClick={() => setSelectedCustomerId(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(161,161,170)' }}
              >
                <X size={20} />
              </button>
            </div>

            {isLoadingDetail ? (
              <div style={{ padding: 40, textAlign: 'center' }}><div className="skeleton" style={{ height: 100 }} /></div>
            ) : customerDetail ? (
              <>
                {/* Profile card */}
                <div style={{
                  padding: 18, background: 'rgb(var(--surface-2))', borderRadius: 14,
                  display: 'flex', flexDirection: 'column', gap: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: 'linear-gradient(135deg, rgb(139,92,246), rgb(52,211,153))',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 800, fontSize: '1.1rem', color: 'white',
                    }}>
                      {customerDetail.name?.[0]?.toUpperCase() ?? customerDetail.phone?.slice(-2)}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                        {customerDetail.name ?? 'Walk-in Customer'}
                      </h3>
                      <div style={{ fontSize: '0.8rem', color: 'rgb(161,161,170)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Phone size={12} /> {customerDetail.phone}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
                    <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.72rem', color: 'rgb(161,161,170)' }}>Total Spend</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'rgb(52,211,153)', marginTop: 2 }}>
                        ₹{Number(customerDetail.totalSpend).toFixed(2)}
                      </div>
                    </div>
                    <div style={{ padding: 10, background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                      <div style={{ fontSize: '0.72rem', color: 'rgb(161,161,170)' }}>Loyalty Points</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'rgb(251,191,36)', marginTop: 2 }}>
                        {Number(customerDetail.loyaltyPoints).toFixed(0)} pts
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase History */}
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoppingBag size={16} color="rgb(139,92,246)" /> Purchase History ({customerDetail.bills?.length ?? 0})
                  </h3>

                  {customerDetail.bills?.length === 0 ? (
                    <div style={{ padding: 24, textAlign: 'center', color: 'rgb(113,113,122)', fontSize: '0.85rem' }}>
                      No bills recorded yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {customerDetail.bills?.map((b: any) => (
                        <div key={b.id} style={{
                          padding: '12px 14px', borderRadius: 10, background: 'rgb(var(--surface-2))',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{b.billNumber}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', marginTop: 2 }}>
                              {format(new Date(b.createdAt), 'dd MMM yyyy, hh:mm a')} · {b._count?.items ?? 0} items · {b.paymentMode}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: 'rgb(52,211,153)', fontSize: '0.9rem' }}>
                              ₹{Number(b.grandTotal).toFixed(2)}
                            </div>
                            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                              <button
                                type="button"
                                title="Send Bill to Customer via 1-Click WhatsApp"
                                onClick={() => {
                                  const phone = customerDetail.phone || '';
                                  const invoiceUrl = getPublicInvoiceUrl(b.id);
                                  const text = formatWhatsAppBillMessage(b, invoiceUrl);
                                  const url = phone
                                    ? `https://wa.me/91${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
                                    : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
                                  window.open(url, '_blank');
                                }}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgb(52,211,153)', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 3, padding: 0, fontWeight: 600 }}
                              >
                                <Share2 size={11} /> WhatsApp
                              </button>
                              <a
                                href={`/bill/${b.id}`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '0.72rem', color: 'rgb(167,139,250)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}
                              >
                                Invoice <ArrowUpRight size={10} />
                              </a>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
