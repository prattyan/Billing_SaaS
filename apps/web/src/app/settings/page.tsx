'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Settings, Store, Users, Plus, ShieldCheck, Printer,
  MessageSquare, UserPlus, Trash2, Loader2, Save, KeyRound,
  AlertTriangle, X, ShieldAlert, ArrowRight, CheckCircle2
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function SettingsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'general' | 'pos' | 'staff' | 'danger'>('general');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showDeleteShopModal, setShowDeleteShopModal] = useState(false);

  // Settings query
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['shopSettings'],
    queryFn: () => tenantsApi.getSettings().then((r) => r.data),
  });

  // Profile query
  const { data: profile } = useQuery({
    queryKey: ['shopProfile'],
    queryFn: () => tenantsApi.getProfile().then((r) => r.data),
  });

  // Staff query
  const { data: staffList, isLoading: isLoadingStaff } = useQuery({
    queryKey: ['staffList'],
    queryFn: () => usersApi.getStaff().then((r) => r.data),
    enabled: activeTab === 'staff',
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => tenantsApi.updateSettings(data),
    onSuccess: () => {
      toast.success('Settings saved successfully!');
      qc.invalidateQueries({ queryKey: ['shopSettings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to update settings');
    },
  });

  const removeStaffMutation = useMutation({
    mutationFn: (id: string) => usersApi.removeStaff(id),
    onSuccess: () => {
      toast.success('Staff member deactivated');
      qc.invalidateQueries({ queryKey: ['staffList'] });
    },
  });

  const deleteShopMutation = useMutation({
    mutationFn: () => tenantsApi.deleteMyShop(),
    onSuccess: (res: any) => {
      toast.success(res.data?.message ?? 'Shop scheduled for deletion (10-day recovery window active)');
      clearAuth();
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      router.push('/login');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message ?? 'Failed to delete shop');
    },
  });

  return (
    <div className="page-container" style={{ padding: '28px 24px' }}>
      {/* Header */}
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>Shop Settings</h1>
        <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.875rem' }}>
          Configure billing defaults, GSTIN, WhatsApp e-invoices, cashier accounts & shop controls
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgb(var(--border-rgb))', paddingBottom: 12, marginBottom: 28, overflowX: 'auto' }}>
        {[
          { id: 'general', label: 'Shop Details & GST', icon: Store },
          { id: 'pos', label: 'POS & Billing Rules', icon: Printer },
          { id: 'staff', label: 'Staff / Cashier Logins', icon: Users },
          { id: 'danger', label: 'Danger Zone', icon: AlertTriangle, isDanger: true },
        ].map((t) => {
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 18px',
                borderRadius: 999,
                border: 'none',
                cursor: 'pointer',
                background: isActive
                  ? t.isDanger ? 'rgba(239,68,68,0.1)' : 'rgb(var(--color-primary-light))'
                  : 'transparent',
                color: isActive
                  ? t.isDanger ? '#dc2626' : 'rgb(var(--color-primary-dark))'
                  : 'rgb(var(--text-secondary))',
                fontWeight: isActive ? 700 : 500,
                fontSize: '0.86rem',
                transition: 'all 0.15s ease',
              }}
            >
              <t.icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: General Details ──────────────────────────────────────── */}
      {activeTab === 'general' && (
        <GeneralSettingsForm
          initialData={settings}
          profile={profile}
          onSave={(data: any) => updateSettingsMutation.mutate(data)}
          isPending={updateSettingsMutation.isPending}
        />
      )}

      {/* ── TAB 2: POS Rules ───────────────────────────────────────────── */}
      {activeTab === 'pos' && (
        <PosSettingsForm
          initialData={settings}
          onSave={(data: any) => updateSettingsMutation.mutate(data)}
          isPending={updateSettingsMutation.isPending}
        />
      )}

      {/* ── TAB 3: Staff / Cashiers ────────────────────────────────────── */}
      {activeTab === 'staff' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 2 }}>Cashier & Staff Logins</h2>
              <p style={{ fontSize: '0.82rem', color: 'rgb(var(--text-secondary))' }}>
                Cashiers can only perform sales & view stock. They cannot alter pricing or delete records.
              </p>
            </div>
            <button
              className="btn-primary"
              style={{ borderRadius: 999, padding: '8px 20px', fontSize: '0.85rem' }}
              onClick={() => setShowAddStaffModal(true)}
            >
              <UserPlus size={15} /> Add Cashier
            </button>
          </div>

          <div className="table-wrapper desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Email / Login</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Total Bills Created</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingStaff ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading staff…</td></tr>
                ) : staffList?.map((staff: any) => (
                  <tr key={staff.id}>
                    <td style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>{staff.name}</td>
                    <td style={{ color: 'rgb(var(--text-secondary))' }}>{staff.email}</td>
                    <td style={{ color: 'rgb(var(--text-secondary))' }}>{staff.phone || '—'}</td>
                    <td>
                      <span className="badge badge-purple">{staff.role}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'rgb(var(--text-primary))' }}>{staff._count?.bills ?? 0}</td>
                    <td>
                      <span className={`badge ${staff.isActive ? 'badge-success' : 'badge-gray'}`}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {staff.role !== 'OWNER' && (
                          <button
                            className="btn-danger"
                            style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: 8 }}
                            onClick={() => {
                              if (confirm(`Deactivate staff login for "${staff.name}"?`)) {
                                removeStaffMutation.mutate(staff.id);
                              }
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: Danger Zone ─────────────────────────────────────────── */}
      {activeTab === 'danger' && (
        <div style={{ maxWidth: 640 }}>
          <div
            className="card"
            style={{
              padding: 28,
              background: '#ffffff',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 16,
              boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <ShieldAlert size={22} color="#dc2626" />
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#dc2626', margin: 0 }}>
                Delete Shop Account
              </h2>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.5, marginBottom: 16 }}>
              Deleting your shop will immediately deactivate your account and log out all cashiers.
            </p>

            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 12,
                padding: '16px 18px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}
            >
              <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: '0.84rem', color: 'rgb(var(--text-primary))', lineHeight: 1.45 }}>
                <strong style={{ color: '#d97706', display: 'block', marginBottom: 2 }}>10-Day Safe Recovery Guarantee:</strong>
                All your customer records, items, bills, inventory, and sales history will be safely preserved for <strong>10 days</strong>. If deleted by mistake, a platform Super Admin can restore your entire shop and data within this 10-day period.
              </div>
            </div>

            <button
              type="button"
              className="btn-danger"
              style={{ padding: '10px 22px', fontSize: '0.88rem', fontWeight: 700 }}
              onClick={() => setShowDeleteShopModal(true)}
            >
              <Trash2 size={16} /> Request Shop Deletion (10-Day Grace Period)
            </button>
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <AddStaffModal
          onClose={() => setShowAddStaffModal(false)}
          onSuccess={() => { qc.invalidateQueries({ queryKey: ['staffList'] }); setShowAddStaffModal(false); }}
        />
      )}

      {/* Delete Shop Confirmation Modal */}
      {showDeleteShopModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', padding: 16,
          }}
          onClick={() => setShowDeleteShopModal(false)}
        >
          <div
            className="card modal-content animate-fadeIn"
            style={{ width: '100%', maxWidth: 480, padding: 28, background: '#ffffff', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.15)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={22} color="#dc2626" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', margin: 0 }}>Confirm Shop Deletion</h3>
              </div>
              <button onClick={() => setShowDeleteShopModal(false)} style={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 8, padding: 6, color: 'rgb(var(--text-secondary))', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'rgb(var(--text-primary))', marginBottom: 14 }}>
              Are you sure you want to delete <strong style={{ color: '#dc2626' }}>{profile?.name || 'your shop'}</strong>?
            </p>

            <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', padding: '14px 16px', borderRadius: 12, fontSize: '0.82rem', color: 'rgb(var(--text-secondary))', lineHeight: 1.5, marginBottom: 22 }}>
              • All cashiers will be logged out immediately.<br />
              • Your database records remain intact in the 10-day recovery queue.<br />
              • A Super Admin can recover your account within 10 days if requested.
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowDeleteShopModal(false)}
                disabled={deleteShopMutation.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{ background: '#dc2626', color: '#ffffff', border: 'none' }}
                onClick={() => deleteShopMutation.mutate()}
                disabled={deleteShopMutation.isPending}
              >
                {deleteShopMutation.isPending ? (
                  <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</>
                ) : (
                  'Confirm & Schedule Deletion'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── General Settings Form ──────────────────────────────────────────────

function GeneralSettingsForm({ initialData, profile, onSave, isPending }: any) {
  const { register, handleSubmit } = useForm({
    values: {
      gstin: initialData?.gstin ?? '',
      address: initialData?.address ?? '',
      billPrefix: initialData?.billPrefix ?? 'INV',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="card animate-fadeIn" style={{ maxWidth: 640, padding: 28, background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label">Shop Name</label>
          <input type="text" className="input" value={profile?.name ?? ''} disabled style={{ opacity: 0.7, background: 'rgb(var(--surface-2))' }} />
          <p style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: 4 }}>Shop name can only be changed by platform support.</p>
        </div>

        <div>
          <label className="label">GSTIN / Tax ID</label>
          <input type="text" className="input" placeholder="29AABCU9603R1ZX" {...register('gstin')} />
          <p style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: 4 }}>Printed on customer tax invoices</p>
        </div>

        <div>
          <label className="label">Invoice Number Prefix</label>
          <input type="text" className="input" placeholder="INV" maxLength={8} {...register('billPrefix')} />
          <p style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: 4 }}>e.g. INV will generate bills numbered INV-00001, INV-00002</p>
        </div>

        <div>
          <label className="label">Store Address</label>
          <textarea className="input" rows={3} placeholder="123 Market Street, Suite 400" {...register('address')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" className="btn-primary" disabled={isPending} style={{ borderRadius: 999, padding: '8px 24px' }}>
            {isPending ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={15} /> Save Changes</>}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── POS Settings Form ──────────────────────────────────────────────────

function PosSettingsForm({ initialData, onSave, isPending }: any) {
  const { register, handleSubmit } = useForm({
    values: {
      upiId: initialData?.upiId ?? '',
      requireCustomerPhone: initialData?.requireCustomerPhone ?? false,
      whatsappEnabled: initialData?.whatsappEnabled ?? true,
      thermalPrinterWidth: initialData?.thermalPrinterWidth ?? 80,
      loyaltyEarnRate: Number(initialData?.loyaltyEarnRate ?? 1),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="card animate-fadeIn" style={{ maxWidth: 640, padding: 28, background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Shop Merchant UPI ID */}
        <div>
          <label className="label">Merchant / Shop UPI ID (for Dynamic QR Payment)</label>
          <input
            type="text"
            className="input"
            placeholder="e.g. myshop@upi or 9876543210@paytm"
            {...register('upiId')}
          />
          <p style={{ fontSize: '0.74rem', color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            Used to generate dynamic instant UPI QR codes on the POS billing screen when paying via GPay, PhonePe, Paytm, etc. (Read-only at checkout).
          </p>
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {/* Toggle 1: Mandatory Phone */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))' }}>Require Customer Mobile Number</div>
            <div style={{ fontSize: '0.76rem', color: 'rgb(var(--text-secondary))' }}>
              When enabled, cashiers must enter a 10-digit customer phone number before finalizing any bill.
            </div>
          </div>
          <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'rgb(var(--color-primary))', cursor: 'pointer' }} {...register('requireCustomerPhone')} />
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {/* Toggle 2: WhatsApp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'rgb(var(--text-primary))' }}>WhatsApp Digital Invoice</div>
            <div style={{ fontSize: '0.76rem', color: 'rgb(var(--text-secondary))' }}>
              Automatically dispatch PDF receipt download link via WhatsApp to customer after billing.
            </div>
          </div>
          <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'rgb(var(--color-primary))', cursor: 'pointer' }} {...register('whatsappEnabled')} />
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {/* Printer width */}
        <div>
          <label className="label">Thermal Printer Receipt Width</label>
          <select className="input" {...register('thermalPrinterWidth', { valueAsNumber: true })}>
            <option value={80}>80mm (Standard 3-inch POS Thermal Printer)</option>
            <option value={58}>58mm (2-inch Mobile Bluetooth / Handheld Printer)</option>
          </select>
        </div>

        {/* Loyalty rate */}
        <div>
          <label className="label">Loyalty Points Earn Rate</label>
          <input type="number" step="0.1" min="0" className="input" placeholder="1.0" {...register('loyaltyEarnRate', { valueAsNumber: true })} />
          <p style={{ fontSize: '0.72rem', color: 'rgb(var(--text-muted))', marginTop: 4 }}>
            Points awarded per $100 spent (e.g. 1.0 = 1% cashback in points)
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" className="btn-primary" disabled={isPending} style={{ borderRadius: 999, padding: '8px 24px' }}>
            {isPending ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={15} /> Save POS Rules</>}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Add Staff Modal ────────────────────────────────────────────────────

function AddStaffModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<any>({
    defaultValues: { role: 'BILLER', name: '', email: '', phone: '', password: '' },
  });

  const onSubmit = async (data: any) => {
    try {
      await usersApi.createStaff(data);
      toast.success('Cashier account created successfully!');
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Failed to create staff account');
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)', padding: 16,
    }} onClick={onClose}>
      <div className="card modal-content animate-fadeIn" style={{ width: '100%', maxWidth: 440, padding: 28, background: '#ffffff', border: '1px solid rgb(var(--border-rgb))', borderRadius: 20, boxShadow: '0 20px 48px rgba(0,0,0,0.12)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>Add Staff Member / Cashier</h2>
          <button onClick={onClose} style={{ background: 'rgb(var(--surface-2))', border: 'none', borderRadius: 8, padding: 6, color: 'rgb(var(--text-secondary))', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className="input" placeholder="e.g. Alex Johnson" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Email Address (Login ID) *</label>
            <input type="email" className="input" placeholder="alex@yourshop.com" {...register('email', { required: true })} />
          </div>
          <div>
            <label className="label">Mobile Phone</label>
            <input type="tel" className="input" placeholder="9876543210" {...register('phone')} />
          </div>
          <div>
            <label className="label">Password (Min 8 chars) *</label>
            <input type="password" className="input" placeholder="••••••••" {...register('password', { required: true, minLength: 8 })} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" {...register('role')}>
              <option value="BILLER">Biller / Cashier (Restricted to POS & Stock View)</option>
              <option value="OWNER">Shop Admin / Manager</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 10 }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={isSubmitting} style={{ borderRadius: 999, padding: '8px 20px' }}>
              {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : '+ Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
