'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, LogOut, Store, BarChart3, Clock, RotateCcw } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user?.role !== 'SUPER_ADMIN') {
      toast.error('Access restricted to Super Admins');
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || user?.role !== 'SUPER_ADMIN') return null;

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken') ?? '';
    try {
      await authApi.logout(refreshToken);
    } catch {}
    clearAuth();
    toast.success('Logged out');
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'rgb(9,9,11)' }}>
      {/* Superadmin Sidebar */}
      <aside className="sidebar" style={{ borderRight: '1px solid rgba(139,92,246,0.15)' }}>
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgb(239,68,68), rgb(139,92,246))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShieldCheck size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Super Admin</div>
            <div style={{ fontSize: '0.65rem', color: 'rgb(239,100,100)', fontWeight: 700, textTransform: 'uppercase' }}>
              Platform Owner
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '16px 0' }}>
          <Link href="/superadmin" className="sidebar-nav-item active">
            <Store size={17} className="nav-icon" />
            <span>Tenant Shops</span>
          </Link>
          <Link href="/superadmin?tab=approvals" className="sidebar-nav-item">
            <Clock size={17} className="nav-icon" />
            <span>Subscription Approvals</span>
          </Link>
          <Link href="/superadmin?tab=recovery" className="sidebar-nav-item">
            <RotateCcw size={17} className="nav-icon" />
            <span>10-Day Recovery Queue</span>
          </Link>
        </nav>

        <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '0.75rem', color: 'rgb(161,161,170)', marginBottom: 8 }}>
            Logged in as <strong>{user?.email}</strong>
          </div>
          <button onClick={handleLogout} className="sidebar-nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'rgb(239,100,100)' }}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <main className="main-content" style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
