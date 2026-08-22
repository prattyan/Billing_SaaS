'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  Settings, LogOut, CreditCard, Truck, Bell, ShoppingBag,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'POS / Billing', icon: ShoppingCart, highlight: true },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/suppliers', label: 'Suppliers', icon: Truck },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, tenant, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, rgb(139,92,246), rgb(109,40,217))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShoppingBag size={18} color="white" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>BillFlow</div>
            <div style={{
              fontSize: '0.65rem', color: 'rgb(113,113,122)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {tenant?.name ?? 'Your Shop'}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {navItems.map(({ href, label, icon: Icon, highlight }) => {
            const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                style={highlight && !isActive ? {
                  background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.15)',
                  color: 'rgb(167,139,250)',
                  margin: '4px 8px',
                } : {}}
              >
                <Icon size={17} className="nav-icon" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                {highlight && <span style={{
                  marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700,
                  background: 'rgba(139,92,246,0.2)', color: 'rgb(167,139,250)',
                  padding: '2px 6px', borderRadius: 999, flexShrink: 0,
                }}>POS</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info + logout */}
        <div style={{
          padding: '12px 8px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Plan badge */}
          <div style={{
            margin: '0 8px 8px',
            padding: '8px 12px',
            background: 'rgba(139,92,246,0.08)',
            border: '1px solid rgba(139,92,246,0.12)',
            borderRadius: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.7rem', color: 'rgb(161,161,170)', fontWeight: 600 }}>
              {tenant?.planTier ?? 'STARTER'} Plan
            </span>
            <span className="badge badge-purple" style={{ fontSize: '0.6rem' }}>Active</span>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px', margin: '0 0 4px',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, rgb(139,92,246), rgb(52,211,153))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, fontSize: '0.75rem', fontWeight: 800,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgb(113,113,122)', textTransform: 'capitalize' }}>
                {user?.role?.toLowerCase()}
              </div>
            </div>
          </div>

          <button onClick={handleLogout} className="sidebar-nav-item" style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: 'rgb(239,100,100)' }}>
            <LogOut size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content" style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
