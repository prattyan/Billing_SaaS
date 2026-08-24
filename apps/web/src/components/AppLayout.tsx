'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  Settings, LogOut, CreditCard, Truck, Bell, ShoppingBag,
  Menu, X, FileText, ShieldCheck, Zap
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/pos', label: 'POS / Billing', icon: ShoppingCart, highlight: true },
  { href: '/inventory', label: 'Inventory & Products', icon: Package },
  { href: '/billing', label: 'Invoices / Bills', icon: FileText },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/suppliers', label: 'Suppliers & POs', icon: Truck },
  { href: '/reports', label: 'Analytics & Reports', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/subscription', label: 'Subscription', icon: CreditCard },
  { href: '/settings', label: 'Shop Settings', icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, tenant, isAuthenticated, clearAuth } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, router]);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (!isAuthenticated) return null;

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refreshToken') ?? '';
    try {
      await authApi.logout(refreshToken);
    } catch {}
    clearAuth();
    toast.success('Logged out cleanly');
    router.push('/login');
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', background: 'rgb(var(--surface-0))' }}>
      {/* ── Top Mobile Bar (< 1024px) ── */}
      <header
        className="show-mobile hide-desktop"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 80,
          background: 'rgb(12, 13, 17)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgb(55, 57, 72)',
          padding: '10px 16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
        }}
      >
        {/* Brand */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 11,
              background: 'rgb(22, 163, 74)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(22,163,74,0.3)',
            }}
          >
            <ShoppingBag size={18} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1, color: '#fafafa', letterSpacing: '-0.02em' }}>
              {tenant?.name ?? 'BillFlow Pro'}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {tenant?.planTier ?? 'PRO'}
            </div>
          </div>
        </Link>

        {/* Action icons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link
            href="/pos"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '6px 12px',
              borderRadius: 7,
              background: 'rgba(22,163,74,0.12)',
              border: '1px solid rgba(22,163,74,0.3)',
              color: '#4ade80',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ShoppingCart size={15} />
            <span>POS Sale</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgb(27, 29, 38)',
              border: '1px solid rgb(55, 57, 72)',
              color: 'rgb(250, 250, 250)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            aria-label="Open Navigation Menu"
          >
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* ── Slide-Out Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 250,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            justifyContent: 'flex-start',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: '84%',
              maxWidth: 320,
              height: '100%',
              background: 'rgb(12, 13, 17)',
              borderRight: '1px solid rgb(55, 57, 72)',
              display: 'flex',
              flexDirection: 'column',
              padding: '18px',
              boxShadow: '8px 0 32px rgba(0, 0, 0, 0.6)',
              animation: 'slideIn 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: 'rgb(22, 163, 74)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShoppingBag size={19} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fafafa' }}>BillFlow POS Pro</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgb(161, 161, 170)' }}>{tenant?.name ?? 'Shop Manager'}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgb(161, 161, 170)',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Nav list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0' }}>
              {navItems.map(({ href, label, icon: Icon, highlight }) => {
                const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '11px 14px',
                      borderRadius: 12,
                      marginBottom: 4,
                      textDecoration: 'none',
                      fontSize: '0.88rem',
                      fontWeight: isActive ? 700 : 500,
                      color: isActive ? '#4ade80' : 'rgb(148, 163, 184)',
                      background: isActive ? 'rgba(22,163,74,0.12)' : highlight ? 'rgba(22,163,74,0.06)' : 'transparent',
                      border: isActive ? '1px solid rgba(22,163,74,0.3)' : '1px solid transparent',
                    }}
                  >
                    <Icon size={17} color={isActive ? '#4ade80' : 'currentColor'} />
                    <span>{label}</span>
                    {highlight && (
                      <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, background: 'rgba(22,163,74,0.2)', color: '#4ade80', padding: '2px 7px', borderRadius: 5 }}>
                        POS
                      </span>
                    )}
                  </Link>
                );
              })}

              {isSuperAdmin && (
                <Link
                  href="/superadmin"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 14px',
                    borderRadius: 12,
                    marginTop: 8,
                    textDecoration: 'none',
                    fontSize: '0.88rem',
                    fontWeight: pathname.startsWith('/superadmin') ? 800 : 600,
                    color: 'rgb(251, 113, 133)',
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  <ShieldCheck size={18} />
                  <span>Super Admin</span>
                </Link>
              )}
            </div>

            {/* Footer User Info */}
            <div style={{ paddingTop: 14, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: 'rgb(22,163,74)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    color: 'white',
                  }}
                >
                  {user?.name?.[0]?.toUpperCase()}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fafafa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'rgb(161, 161, 170)', textTransform: 'capitalize' }}>
                    {user?.role?.toLowerCase()}
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px',
                  borderRadius: 12,
                  background: 'rgba(239,68,68,0.1)',
                  border: '1px solid rgba(239,68,68,0.25)',
                  color: '#f87171',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
        {/* Desktop Sidebar (>= 1025px) */}
        <aside className="sidebar hide-mobile">
          {/* Logo Header */}
          <div
            style={{
              padding: '22px 18px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.07)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'rgb(22, 163, 74)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShoppingBag size={19} color="white" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', lineHeight: 1.2, color: '#f8fafc', letterSpacing: '-0.015em' }}>
                BillFlow <span style={{ color: '#4ade80', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.03em' }}>POS</span>
              </div>
              <div
                style={{
                  fontSize: '0.67rem',
                  color: 'rgb(100, 116, 139)',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tenant?.name ?? 'Your Shop'}
              </div>
            </div>
          </div>

          {/* Desktop Nav Items */}
          <nav style={{ flex: 1, padding: '14px 0', overflowY: 'auto' }}>
            {navItems.map(({ href, label, icon: Icon, highlight }) => {
              const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                  style={
                    highlight && !isActive
                      ? {
                          background: 'rgba(22,163,74,0.08)',
                          border: '1px solid rgba(22,163,74,0.2)',
                          color: '#86efac',
                          margin: '2px 8px',
                        }
                      : {}
                  }
                >
                  <Icon size={18} className="nav-icon" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                  {highlight && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        background: 'rgba(22,163,74,0.2)',
                        color: '#4ade80',
                        padding: '2px 7px',
                        borderRadius: 5,
                        flexShrink: 0,
                      }}
                    >
                      POS
                    </span>
                  )}
                </Link>
              );
            })}

            {isSuperAdmin && (
              <Link
                href="/superadmin"
                className={`sidebar-nav-item ${pathname.startsWith('/superadmin') ? 'active' : ''}`}
                style={{ color: '#f87171', margin: '6px 8px' }}
              >
                <ShieldCheck size={18} className="nav-icon" />
                <span>Super Admin</span>
              </Link>
            )}
          </nav>

          {/* User info + logout */}
          <div
            style={{
              padding: '12px 8px',
              borderTop: '1px solid rgb(55, 57, 72)',
              background: 'transparent',
            }}
          >
            {/* Plan badge */}
            <div
              style={{
                margin: '0 4px 10px',
                padding: '7px 11px',
                background: 'rgba(22,163,74,0.08)',
                border: '1px solid rgba(22,163,74,0.2)',
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontSize: '0.7rem', color: 'rgb(100, 116, 139)', fontWeight: 600 }}>
                {tenant?.planTier ?? 'STARTER'} Plan
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.6rem', padding: '2px 8px' }}>
                Active
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 8px',
                margin: '0 0 6px',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'rgb(22,163,74)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'white',
                }}
              >
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#fafafa',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'rgb(161, 161, 170)', textTransform: 'capitalize' }}>
                  {user?.role?.toLowerCase()}
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="sidebar-nav-item"
              style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', color: '#f87171', margin: 0 }}
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-content" style={{ flex: 1, minWidth: 0 }}>
          {children}
        </main>
      </div>

      {/* ── Fixed Mobile Bottom Navigation Bar (< 1024px) ── */}
      <nav className="mobile-bottom-nav show-mobile hide-desktop" aria-label="Mobile Navigation">
        {/* 1. Dashboard */}
        <Link
          href="/dashboard"
          className={`mobile-nav-tab ${pathname === '/dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        {/* 2. Inventory */}
        <Link
          href="/inventory"
          className={`mobile-nav-tab ${pathname.startsWith('/inventory') ? 'active' : ''}`}
        >
          <Package size={20} />
          <span>Inventory</span>
        </Link>

        {/* 3. POS (Center Highlighting Action) */}
        <Link
          href="/pos"
          className={`mobile-nav-tab pos-highlight ${pathname.startsWith('/pos') ? 'active' : ''}`}
        >
          <div className="icon-wrapper">
            <ShoppingCart size={22} color="white" />
          </div>
          <span style={{ marginTop: -4 }}>POS Sale</span>
        </Link>

        {/* 4. Invoices / Bills */}
        <Link
          href="/billing"
          className={`mobile-nav-tab ${pathname.startsWith('/billing') ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>Bills</span>
        </Link>

        {/* 5. More Menu */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="mobile-nav-tab"
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
