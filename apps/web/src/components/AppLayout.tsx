'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard, Package, ShoppingCart, Users, BarChart3,
  Settings, LogOut, CreditCard, Truck, Bell, ShoppingBag,
  Menu, X, FileText, ShieldCheck, Zap, Search, Sun, RotateCcw,
  ChevronRight, MoreVertical, Flame, Star, LayoutGrid, CheckCircle2
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';
import { authApi } from '@/lib/api';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, tenant, isAuthenticated, clearAuth } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'favorites' | 'recently'>('favorites');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Format breadcrumbs dynamically
  const getBreadcrumbTitle = () => {
    if (pathname === '/dashboard') return '';
    if (pathname === '/billing') return 'Billing';
    if (pathname.startsWith('/bill/')) return 'Invoice';
    if (pathname.startsWith('/pos')) return 'POS Terminal';
    if (pathname.startsWith('/inventory')) return 'Inventory';
    if (pathname.startsWith('/customers')) return 'Customers';
    if (pathname.startsWith('/suppliers')) return 'Suppliers';
    if (pathname.startsWith('/reports')) return 'Reports & Analytics';
    if (pathname.startsWith('/subscription')) return 'Subscription Plan';
    if (pathname.startsWith('/settings')) return 'Settings';
    if (pathname.startsWith('/notifications')) return 'Notifications';
    if (pathname.startsWith('/superadmin')) return 'Super Admin';
    return '';
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', background: 'rgb(var(--surface-0))' }}>
      {/* ── Top Mobile Bar (< 1024px) ── */}
      <header
        className="show-mobile hide-desktop"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 80,
          background: '#ffffff',
          borderBottom: '1px solid rgb(var(--border-rgb))',
          padding: '10px 16px',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 60,
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        }}
      >
        {/* Brand */}
        <Link href="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit' }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgb(var(--color-primary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(78, 159, 118, 0.25)',
            }}
          >
            <Flame size={20} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1, color: 'rgb(var(--text-primary))', letterSpacing: '-0.02em' }}>
              {tenant?.name ?? 'BillFlow'}
            </div>
            <div style={{ fontSize: '0.65rem', color: 'rgb(var(--color-primary))', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
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
              borderRadius: 999,
              background: 'rgb(var(--color-primary-light))',
              border: '1px solid rgba(78, 159, 118, 0.2)',
              color: 'rgb(var(--color-primary-dark))',
              fontSize: '0.78rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <ShoppingCart size={14} />
            <span>POS</span>
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgb(var(--surface-2))',
              border: '1px solid rgb(var(--border-rgb))',
              color: 'rgb(var(--text-primary))',
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
          className="mobile-sheet-backdrop"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              width: '84%',
              maxWidth: 320,
              height: '100%',
              background: '#ffffff',
              borderRight: '1px solid rgb(var(--border-rgb))',
              display: 'flex',
              flexDirection: 'column',
              padding: '18px',
              boxShadow: '10px 0 30px rgba(0, 0, 0, 0.1)',
              animation: 'slideIn 0.25s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottom: '1px solid rgb(var(--border-rgb))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'rgb(var(--color-primary))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Flame size={20} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'rgb(var(--text-primary))' }}>BillFlow</div>
                  <div style={{ fontSize: '0.68rem', color: 'rgb(var(--text-secondary))' }}>{tenant?.name ?? 'Shop Manager'}</div>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgb(var(--text-muted))',
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Mobile Nav list */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgb(var(--text-muted))', padding: '6px 12px', textTransform: 'uppercase' }}>
                Dashboards
              </div>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
              >
                <LayoutDashboard size={17} className="nav-icon" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/billing"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname === '/billing' ? 'active' : ''}`}
              >
                <FileText size={17} className="nav-icon" />
                <span>Billing & Invoices</span>
              </Link>

              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgb(var(--text-muted))', padding: '12px 12px 6px', textTransform: 'uppercase' }}>
                Quick Access
              </div>
              <Link
                href="/pos"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname.startsWith('/pos') ? 'active' : ''}`}
              >
                <ShoppingCart size={17} className="nav-icon" />
                <span>POS Sale</span>
                <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>POS</span>
              </Link>
              <Link
                href="/inventory"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname.startsWith('/inventory') ? 'active' : ''}`}
              >
                <Package size={17} className="nav-icon" />
                <span>Inventory & Products</span>
              </Link>
              <Link
                href="/customers"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname.startsWith('/customers') ? 'active' : ''}`}
              >
                <Users size={17} className="nav-icon" />
                <span>Customers</span>
              </Link>
              <Link
                href="/suppliers"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname.startsWith('/suppliers') ? 'active' : ''}`}
              >
                <Truck size={17} className="nav-icon" />
                <span>Suppliers & POs</span>
              </Link>
              <Link
                href="/reports"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname.startsWith('/reports') ? 'active' : ''}`}
              >
                <BarChart3 size={17} className="nav-icon" />
                <span>Analytics & Reports</span>
              </Link>
              <Link
                href="/subscription"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname.startsWith('/subscription') ? 'active' : ''}`}
              >
                <CreditCard size={17} className="nav-icon" />
                <span>Subscription Plan</span>
              </Link>
              <Link
                href="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className={`sidebar-nav-item ${pathname.startsWith('/settings') ? 'active' : ''}`}
              >
                <Settings size={17} className="nav-icon" />
                <span>Shop Settings</span>
              </Link>

              {isSuperAdmin && (
                <Link
                  href="/superadmin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="sidebar-nav-item"
                  style={{ color: '#dc2626', marginTop: 8 }}
                >
                  <ShieldCheck size={18} />
                  <span>Super Admin</span>
                </Link>
              )}
            </div>

            {/* Footer User Info */}
            <div style={{ paddingTop: 14, borderTop: '1px solid rgb(var(--border-rgb))' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 999,
                    background: 'rgb(var(--color-primary-light))',
                    border: '1px solid rgba(78, 159, 118, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.84rem',
                    color: 'rgb(var(--color-primary-dark))',
                  }}
                >
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
                <div style={{ overflow: 'hidden', flex: 1 }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'rgb(var(--text-primary))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name ?? 'Shop Admin'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-secondary))' }}>
                    {user?.email ?? 'admin@shop.com'}
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
                  padding: '9px',
                  borderRadius: 999,
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  color: '#dc2626',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                }}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main Layout (Sidebar + Content) ── */}
      <div style={{ display: 'flex', flex: 1, minHeight: '100vh' }}>
        {/* Desktop Sidebar (>= 1025px) matching exact reference image */}
        <aside className="sidebar hide-mobile">
          {/* Logo Header */}
          <div
            style={{
              padding: '20px 20px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: 'rgb(var(--text-primary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Flame size={22} color="white" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', lineHeight: 1.2, color: 'rgb(var(--text-primary))', letterSpacing: '-0.02em' }}>
                BillFlow
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'rgb(var(--text-secondary))',
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {tenant?.name ?? 'Main Store'}
              </div>
            </div>
          </div>

          {/* Favorites / Recently Tab Switcher matching screenshot */}
          <div style={{ padding: '0 16px 10px' }}>
            <div style={{
              display: 'flex',
              gap: 4,
              padding: 3,
              background: 'rgb(var(--surface-2))',
              borderRadius: 8,
            }}>
              <button
                type="button"
                onClick={() => setActiveTab('favorites')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: activeTab === 'favorites' ? 700 : 500,
                  color: activeTab === 'favorites' ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))',
                  background: activeTab === 'favorites' ? '#ffffff' : 'transparent',
                  boxShadow: activeTab === 'favorites' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Favorites
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('recently')}
                style={{
                  flex: 1,
                  padding: '5px 8px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.74rem',
                  fontWeight: activeTab === 'recently' ? 700 : 500,
                  color: activeTab === 'recently' ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))',
                  background: activeTab === 'recently' ? '#ffffff' : 'transparent',
                  boxShadow: activeTab === 'recently' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                Recently
              </button>
            </div>

            {/* Quick dot navigation items matching image */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 8 }}>
              <Link
                href="/dashboard"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: pathname === '/dashboard' ? 600 : 500,
                  color: pathname === '/dashboard' ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1, color: 'rgb(var(--text-muted))' }}>•</span>
                <span>Overview</span>
              </Link>
              <Link
                href="/notifications"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '6px 10px',
                  borderRadius: 8,
                  fontSize: '0.8rem',
                  fontWeight: pathname === '/notifications' ? 600 : 500,
                  color: pathname === '/notifications' ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))',
                  textDecoration: 'none',
                }}
              >
                <span style={{ fontSize: '1rem', lineHeight: 1, color: 'rgb(var(--text-muted))' }}>•</span>
                <span>Notifications</span>
                <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
              </Link>
            </div>
          </div>

          {/* Desktop Nav Items Grouped */}
          <nav style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
            {/* Category: Dashboards */}
            <div className="sidebar-category-title">
              Dashboards
            </div>

            <Link
              href="/dashboard"
              className={`sidebar-nav-item ${pathname === '/dashboard' ? 'active' : ''}`}
            >
              <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
              <span>Dashboard</span>
            </Link>

            <Link
              href="/billing"
              className={`sidebar-nav-item ${pathname === '/billing' ? 'active' : ''}`}
            >
              <ChevronRight size={14} style={{ color: 'rgb(var(--text-muted))' }} />
              <span>Billing</span>
            </Link>

            <Link
              href="/billing"
              className={`sidebar-nav-item ${pathname.startsWith('/bill') || pathname === '/billing' ? 'active' : ''}`}
            >
              <FileText size={16} className="nav-icon" />
              <span>Invoice</span>
            </Link>

            {/* Category: Quick Access */}
            <div className="sidebar-category-title" style={{ marginTop: 8 }}>
              Quick Access
            </div>

            <Link
              href="/pos"
              className={`sidebar-nav-item ${pathname.startsWith('/pos') ? 'active' : ''}`}
            >
              <ShoppingCart size={16} className="nav-icon" />
              <span>POS / Billing</span>
              <span className="badge badge-success" style={{ marginLeft: 'auto', fontSize: '0.64rem', padding: '1px 8px' }}>
                POS
              </span>
            </Link>

            <Link
              href="/inventory"
              className={`sidebar-nav-item ${pathname.startsWith('/inventory') ? 'active' : ''}`}
            >
              <Package size={16} className="nav-icon" />
              <span>Inventory & Stock</span>
            </Link>

            <Link
              href="/customers"
              className={`sidebar-nav-item ${pathname.startsWith('/customers') ? 'active' : ''}`}
            >
              <Users size={16} className="nav-icon" />
              <span>Customers</span>
            </Link>

            <Link
              href="/suppliers"
              className={`sidebar-nav-item ${pathname.startsWith('/suppliers') ? 'active' : ''}`}
            >
              <Truck size={16} className="nav-icon" />
              <span>Suppliers & POs</span>
            </Link>

            <Link
              href="/reports"
              className={`sidebar-nav-item ${pathname.startsWith('/reports') ? 'active' : ''}`}
            >
              <BarChart3 size={16} className="nav-icon" />
              <span>Analytics & Reports</span>
            </Link>

            <Link
              href="/subscription"
              className={`sidebar-nav-item ${pathname.startsWith('/subscription') ? 'active' : ''}`}
            >
              <CreditCard size={16} className="nav-icon" />
              <span>Subscription Plan</span>
            </Link>

            {isSuperAdmin && (
              <Link
                href="/superadmin"
                className={`sidebar-nav-item ${pathname.startsWith('/superadmin') ? 'active' : ''}`}
                style={{ color: '#dc2626', margin: '6px 12px' }}
              >
                <ShieldCheck size={16} className="nav-icon" />
                <span>Super Admin</span>
              </Link>
            )}
          </nav>

          {/* User Profile Card & Settings at Bottom matching exact reference image */}
          <div
            style={{
              padding: '12px 14px',
              borderTop: '1px solid rgb(var(--border-rgb))',
              background: '#ffffff',
            }}
          >
            <Link
              href="/settings"
              className="sidebar-nav-item"
              style={{ margin: '0 0 2px', padding: '7px 10px', fontSize: '0.82rem' }}
            >
              <Settings size={15} />
              <span>Settings</span>
            </Link>

            <button
              onClick={handleLogout}
              className="sidebar-nav-item"
              style={{
                width: '100%',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: 'rgb(var(--text-secondary))',
                margin: '0 0 8px',
                padding: '7px 10px',
                fontSize: '0.82rem',
              }}
            >
              <LogOut size={15} />
              <span>Logout</span>
            </button>

            {/* Profile Pill Card matching screenshot */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 12,
                background: 'rgb(var(--surface-2))',
                border: '1px solid rgb(var(--border-rgb))',
              }}
            >
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  background: 'rgb(var(--color-primary-light))',
                  border: '1px solid rgba(78, 159, 118, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: 'rgb(var(--color-primary-dark))',
                }}
              >
                {user?.name?.[0]?.toUpperCase() ?? 'G'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'rgb(var(--text-primary))',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.name ?? 'Garcia Albert'}
                </div>
                <div
                  style={{
                    fontSize: '0.68rem',
                    color: 'rgb(var(--text-muted))',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.email ?? 'garcia007@outlook.com'}
                </div>
              </div>
              <MoreVertical size={15} style={{ color: 'rgb(var(--text-muted))', cursor: 'pointer' }} />
            </div>
          </div>
        </aside>

        {/* Main Content Area with Sleek Topbar */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Desktop Topbar matching exact screenshot */}
          <header className="topbar hide-mobile">
            {/* Left: Breadcrumbs navigation */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgb(var(--text-muted))' }}>
                <button
                  type="button"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgb(var(--text-muted))', padding: 2, display: 'flex', alignItems: 'center'
                  }}
                  title="Toggle view"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  type="button"
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'rgb(var(--text-muted))', padding: 2, display: 'flex', alignItems: 'center'
                  }}
                  title="Bookmark"
                >
                  <Star size={15} />
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
                <Link
                  href="/dashboard"
                  style={{
                    color: pathname === '/dashboard' ? 'rgb(var(--text-primary))' : 'rgb(var(--text-secondary))',
                    textDecoration: 'none',
                    fontWeight: pathname === '/dashboard' ? 700 : 500
                  }}
                >
                  Dashboard
                </Link>
                {getBreadcrumbTitle() && (
                  <>
                    <span style={{ color: 'rgb(var(--text-muted))' }}>/</span>
                    <span style={{ color: 'rgb(var(--text-primary))', fontWeight: 700 }}>
                      {getBreadcrumbTitle()}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right: Global Search & Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Search Bar matching screenshot */}
              <div style={{ position: 'relative' }}>
                <Search
                  size={14}
                  style={{
                    position: 'absolute',
                    left: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgb(var(--text-muted))',
                  }}
                />
                <input
                  type="text"
                  placeholder="Search Product, Supplier, Order..."
                  className="topbar-search-input"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <kbd style={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'rgb(var(--surface-2))',
                  border: '1px solid rgb(var(--border-rgb))',
                  borderRadius: 4,
                  padding: '1px 5px',
                  fontSize: '0.65rem',
                  color: 'rgb(var(--text-muted))',
                }}>
                  /
                </kbd>
              </div>

              {/* Action Icons matching screenshot */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  type="button"
                  title="Theme: Light Active"
                  style={{
                    width: 34, height: 34, borderRadius: 999,
                    background: 'rgb(var(--surface-2))', border: '1px solid rgb(var(--border-rgb))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgb(var(--text-secondary))', cursor: 'pointer',
                  }}
                >
                  <Sun size={15} />
                </button>

                <button
                  type="button"
                  title="Refresh / History"
                  onClick={() => router.refresh()}
                  style={{
                    width: 34, height: 34, borderRadius: 999,
                    background: 'rgb(var(--surface-2))', border: '1px solid rgb(var(--border-rgb))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgb(var(--text-secondary))', cursor: 'pointer',
                  }}
                >
                  <RotateCcw size={15} />
                </button>

                <Link
                  href="/notifications"
                  title="Notifications"
                  style={{
                    width: 34, height: 34, borderRadius: 999,
                    background: 'rgb(var(--surface-2))', border: '1px solid rgb(var(--border-rgb))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgb(var(--text-secondary))', textDecoration: 'none', position: 'relative',
                  }}
                >
                  <Bell size={15} />
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    width: 14, height: 14, borderRadius: '50%',
                    background: '#ef4444', color: '#ffffff',
                    fontSize: '0.58rem', fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    3
                  </span>
                </Link>

                <div
                  style={{
                    width: 34, height: 34, borderRadius: 999,
                    background: 'rgb(var(--color-primary-light))',
                    border: '1px solid rgba(78, 159, 118, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.76rem', fontWeight: 700, color: 'rgb(var(--color-primary-dark))',
                    cursor: 'pointer',
                  }}
                  title={user?.name ?? 'User Profile'}
                >
                  {user?.name?.[0]?.toUpperCase() ?? 'U'}
                </div>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="main-content" style={{ margin: 0, flex: 1, minWidth: 0 }}>
            {children}
          </main>
        </div>
      </div>

      {/* ── Fixed Mobile Bottom Navigation Bar (< 1024px) ── */}
      <nav className="mobile-bottom-nav show-mobile hide-desktop" aria-label="Mobile Navigation">
        <Link
          href="/dashboard"
          className={`mobile-nav-tab ${pathname === '/dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>

        <Link
          href="/inventory"
          className={`mobile-nav-tab ${pathname.startsWith('/inventory') ? 'active' : ''}`}
        >
          <Package size={20} />
          <span>Inventory</span>
        </Link>

        <Link
          href="/pos"
          className={`mobile-nav-tab pos-highlight ${pathname.startsWith('/pos') ? 'active' : ''}`}
        >
          <div className="icon-wrapper">
            <ShoppingCart size={22} color="white" />
          </div>
          <span style={{ marginTop: -4 }}>POS Sale</span>
        </Link>

        <Link
          href="/billing"
          className={`mobile-nav-tab ${pathname.startsWith('/billing') ? 'active' : ''}`}
        >
          <FileText size={20} />
          <span>Bills</span>
        </Link>

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
