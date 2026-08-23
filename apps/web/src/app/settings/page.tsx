'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tenantsApi, usersApi } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Settings, Store, Users, Plus, ShieldCheck, Printer,
  MessageSquare, UserPlus, Trash2, Loader2, Save, KeyRound
} from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function SettingsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'general' | 'pos' | 'staff'>('general');
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);

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

  return (
    <div className="page-container" style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Shop Settings</h1>
        <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
          Configure billing defaults, GSTIN, WhatsApp e-invoices & cashier logins
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 28, overflowX: 'auto' }}>
        {[
          { id: 'general', label: 'Shop Details & GST', icon: Store },
          { id: 'pos', label: 'POS & Billing Rules', icon: Printer },
          { id: 'staff', label: 'Staff / Cashier Logins', icon: Users },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === t.id ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: activeTab === t.id ? 'rgb(167,139,250)' : 'rgb(161,161,170)',
              fontWeight: activeTab === t.id ? 700 : 500, fontSize: '0.875rem',
            }}
          >
            <t.icon size={16} /> {t.label}
          </button>
        ))}
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Cashier & Staff Logins</h2>
              <p style={{ fontSize: '0.8rem', color: 'rgb(161,161,170)' }}>
                Cashiers can only perform sales & view stock. They cannot alter pricing or delete records.
              </p>
            </div>
            <button className="btn-primary" onClick={() => setShowAddStaffModal(true)}>
              <UserPlus size={15} /> Add Cashier
            </button>
          </div>

          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Staff Name</th>
                  <th>Email / Login</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Total Bills Created</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingStaff ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading staff…</td></tr>
                ) : staffList?.map((staff: any) => (
                  <tr key={staff.id}>
                    <td style={{ fontWeight: 600 }}>{staff.name}</td>
                    <td><code>{staff.email}</code></td>
                    <td>{staff.phone || '—'}</td>
                    <td>
                      <span className={`badge ${staff.role === 'OWNER' ? 'badge-purple' : 'badge-info'}`}>
                        {staff.role}
                      </span>
                    </td>
                    <td>{staff._count?.bills ?? 0} bills</td>
                    <td>
                      <span className={`badge ${staff.isActive ? 'badge-success' : 'badge-danger'}`}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {staff.role !== 'OWNER' && staff.isActive && (
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 8px', fontSize: '0.75rem' }}
                          onClick={() => {
                            if (confirm(`Deactivate login for ${staff.name}?`)) {
                              removeStaffMutation.mutate(staff.id);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
    <form onSubmit={handleSubmit(onSave)} className="glass-card animate-fadeIn" style={{ maxWidth: 640, padding: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <label className="label">Shop Name</label>
          <input type="text" className="input" value={profile?.name ?? ''} disabled style={{ opacity: 0.7 }} />
          <p style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)', marginTop: 4 }}>Shop name can only be changed by platform support.</p>
        </div>

        <div>
          <label className="label">GSTIN / Tax ID</label>
          <input type="text" className="input" placeholder="29AABCU9603R1ZX" {...register('gstin')} />
          <p style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)', marginTop: 4 }}>Printed on customer tax invoices</p>
        </div>

        <div>
          <label className="label">Invoice Number Prefix</label>
          <input type="text" className="input" placeholder="INV" maxLength={8} {...register('billPrefix')} />
          <p style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)', marginTop: 4 }}>e.g. INV will generate bills numbered INV-00001, INV-00002</p>
        </div>

        <div>
          <label className="label">Store Address</label>
          <textarea className="input" rows={3} placeholder="123 Market Street, Bangalore, Karnataka 560001" {...register('address')} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" className="btn-primary" disabled={isPending}>
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
      requireCustomerPhone: initialData?.requireCustomerPhone ?? false,
      whatsappEnabled: initialData?.whatsappEnabled ?? true,
      thermalPrinterWidth: initialData?.thermalPrinterWidth ?? 80,
      loyaltyEarnRate: Number(initialData?.loyaltyEarnRate ?? 1),
    },
  });

  return (
    <form onSubmit={handleSubmit(onSave)} className="glass-card animate-fadeIn" style={{ maxWidth: 640, padding: 28 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Toggle 1: Mandatory Phone */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Require Customer Mobile Number</div>
            <div style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>
              When enabled, cashiers must enter a 10-digit customer phone number before finalizing any bill.
            </div>
          </div>
          <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'rgb(139,92,246)', cursor: 'pointer' }} {...register('requireCustomerPhone')} />
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {/* Toggle 2: WhatsApp */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>WhatsApp E-Invoice Delivery</div>
            <div style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>
              Automatically trigger an official WhatsApp Cloud API bill link to the customer upon finalization.
            </div>
          </div>
          <input type="checkbox" style={{ width: 18, height: 18, accentColor: 'rgb(139,92,246)', cursor: 'pointer' }} {...register('whatsappEnabled')} />
        </div>

        <div className="divider" style={{ margin: 0 }} />

        {/* Printer width */}
        <div>
          <label className="label">Thermal Printer Paper Width</label>
          <select className="input" {...register('thermalPrinterWidth', { valueAsNumber: true })}>
            <option value={80}>80mm (Standard POS receipt)</option>
            <option value={58}>58mm (Compact portable / Bluetooth printer)</option>
          </select>
        </div>

        {/* Loyalty rate */}
        <div>
          <label className="label">Loyalty Points Earn Rate</label>
          <input type="number" step="0.1" min="0" className="input" placeholder="1.0" {...register('loyaltyEarnRate', { valueAsNumber: true })} />
          <p style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)', marginTop: 4 }}>
            Points awarded per ₹100 spent (e.g. 1.0 = 1% cashback in points)
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
          <button type="submit" className="btn-primary" disabled={isPending}>
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
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', padding: 16,
    }} onClick={onClose}>
      <div className="glass-card" style={{ width: 440, padding: 28 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 20 }}>Add Staff Member / Cashier</h2>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label className="label">Full Name *</label>
            <input type="text" className="input" placeholder="e.g. Ravi Kumar" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Email Address (Login ID) *</label>
            <input type="email" className="input" placeholder="ravi@yourshop.com" {...register('email', { required: true })} />
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
            <button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</> : '+ Create Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
