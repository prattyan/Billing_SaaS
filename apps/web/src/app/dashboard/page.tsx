'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import {
  TrendingUp, Package, AlertTriangle, Receipt,
  ShoppingCart, Users, Activity, ArrowUpRight, DollarSign, Sparkles
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';
import { format } from 'date-fns';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="card" style={{ padding: '12px 16px', fontSize: '0.8rem', border: '1px solid rgb(var(--border-rgb))', boxShadow: '0 4px 14px rgba(0,0,0,0.06)' }}>
      <div style={{ color: 'rgb(var(--text-secondary))', marginBottom: 4, fontWeight: 600 }}>{label} ({item?.date || ''})</div>
      <div style={{ fontWeight: 800, color: 'rgb(var(--color-primary-dark))', fontSize: '1.05rem' }}>
        ${Number(payload[0].value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style={{ color: 'rgb(var(--text-muted))', fontSize: '0.72rem', marginTop: 4, fontWeight: 500 }}>
        {item?.bills ?? 0} invoice{item?.bills === 1 ? '' : 's'}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then((r) => r.data),
  });

  const stats = [
    {
      label: "Today's Revenue",
      value: `$${Number(data?.today?.revenue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      sub: `${data?.today?.bills ?? 0} bills today`,
      icon: DollarSign,
      color: 'rgb(var(--color-primary-dark))',
      bg: 'rgb(var(--color-primary-light))',
    },
    {
      label: 'Monthly Revenue',
      value: `$${Number(data?.month?.revenue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      sub: `${data?.month?.bills ?? 0} bills this month`,
      icon: TrendingUp,
      color: '#2563eb',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Total Products (SKUs)',
      value: data?.inventory?.totalItems?.toLocaleString() ?? '—',
      sub: 'Active registered stock',
      icon: Package,
      color: '#7c3aed',
      bg: 'rgba(124,58,237,0.1)',
    },
    {
      label: 'Low Stock Alerts',
      value: data?.inventory?.lowStockItems ?? '—',
      sub: `${data?.inventory?.nearExpiryItems ?? 0} near expiry`,
      icon: AlertTriangle,
      color: '#d97706',
      bg: 'rgba(245,158,11,0.12)',
      urgent: (data?.inventory?.lowStockItems ?? 0) > 0,
    },
  ];

  const chartData = data?.weeklyRevenue ?? [
    { day: 'Mon', date: '', revenue: 1200, bills: 4 },
    { day: 'Tue', date: '', revenue: 2100, bills: 7 },
    { day: 'Wed', date: '', revenue: 1800, bills: 6 },
    { day: 'Thu', date: '', revenue: 2900, bills: 9 },
    { day: 'Fri', date: '', revenue: 3400, bills: 12 },
    { day: 'Sat', date: '', revenue: 4200, bills: 15 },
    { day: 'Sun', date: '', revenue: 3900, bills: 14 },
  ];

  return (
    <div className="page-container" style={{ padding: '32px 36px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            Dashboard Overview <Activity size={20} color="rgb(var(--color-primary))" />
          </h1>
          <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.875rem' }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")} · Live shop performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/pos" className="btn-primary">
            <ShoppingCart size={15} /> Open POS Biller
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 18,
        marginBottom: 32,
      }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card animate-fadeIn"
            style={stat.urgent ? { borderColor: 'rgba(245,158,11,0.5)', background: 'rgba(245,158,11,0.02)' } : {}}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgb(var(--text-muted))', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {stat.label}
                </p>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'rgb(var(--text-primary))' }}>
                  {isLoading ? <div className="skeleton" style={{ width: 90, height: 34 }} /> : stat.value}
                </div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <stat.icon size={20} color={stat.color} />
              </div>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'rgb(var(--text-secondary))', fontWeight: 500 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts + quick actions */}
      <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 32 }}>
        {/* Revenue chart */}
        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 2 }}>Weekly Sales Trend</h2>
              <p style={{ fontSize: '0.78rem', color: 'rgb(var(--text-secondary))' }}>7-day revenue performance</p>
            </div>
            <span className="badge badge-success">
              ● Live Auto-Sync
            </span>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(78, 159, 118)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgb(78, 159, 118)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(148,163,184)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgb(148,163,184)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="rgb(78, 159, 118)"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>Quick Shortcuts</h2>

          {[
            { href: '/pos', label: 'New POS Sale', sub: 'Open terminal biller', icon: ShoppingCart, color: 'rgb(var(--color-primary-dark))', bg: 'rgb(var(--color-primary-light))' },
            { href: '/inventory', label: 'Add / Restock Items', sub: 'Manage products & stock', icon: Package, color: '#2563eb', bg: 'rgba(59,130,246,0.1)' },
            { href: '/customers', label: 'Manage Customers', sub: 'View profiles & points', icon: Users, color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
            { href: '/reports?range=today', label: "Today's Tax Report", sub: 'Sales & GST breakdown', icon: Receipt, color: '#d97706', bg: 'rgba(245,158,11,0.12)' },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 12,
                background: 'rgb(var(--surface-2))',
                border: '1px solid rgb(var(--border-rgb))',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--color-primary))';
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(var(--border-rgb))';
                  e.currentTarget.style.background = 'rgb(var(--surface-2))';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: action.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.icon size={17} color={action.color} />
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, color: 'rgb(var(--text-primary))' }}>{action.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgb(var(--text-secondary))' }}>{action.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top selling items */}
      {data?.topItemsToday?.length > 0 && (
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 16 }}>
            Top Selling Products Today
          </h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank & Product Name</th>
                  <th>Units Sold</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topItemsToday.map((item: any, i: number) => (
                  <tr key={item.itemId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600 }}>
                        <span style={{
                          width: 26, height: 26, borderRadius: 8, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: 'rgb(var(--color-primary-light))',
                          fontSize: '0.75rem', fontWeight: 700, color: 'rgb(var(--color-primary-dark))',
                        }}>{i + 1}</span>
                        {item.itemNameAtSale}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{Number(item.qty ?? item._sum?.qty ?? 0).toFixed(0)}</td>
                    <td style={{ color: 'rgb(var(--color-primary-dark))', fontWeight: 700 }}>
                      ${Number(item.lineTotal ?? item._sum?.lineTotal ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
