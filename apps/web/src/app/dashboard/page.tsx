'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import {
  TrendingUp, Package, AlertTriangle, Receipt,
  IndianRupee, ShoppingCart, Users, Activity
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
    <div className="card" style={{ padding: '12px 16px', fontSize: '0.8rem', border: '1px solid rgba(22,163,74,0.3)' }}>
      <div style={{ color: 'rgb(100,116,139)', marginBottom: 4, fontWeight: 600 }}>{label} ({item?.date || ''})</div>
      <div style={{ fontWeight: 800, color: '#4ade80', fontSize: '1.05rem' }}>
        ₹{Number(payload[0].value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style={{ color: 'rgb(100,116,139)', fontSize: '0.72rem', marginTop: 4, fontWeight: 500 }}>
        {item?.bills ?? 0} invoice{item?.bills === 1 ? '' : 's'}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then((r) => r.data),
    refetchInterval: 5000, // refresh every 5s
  });

  const stats = [
    {
      label: "Today's Revenue",
      value: `₹${Number(data?.today?.revenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${data?.today?.bills ?? 0} bills today`,
      icon: IndianRupee,
      color: 'rgb(74,222,128)',
      bg: 'rgba(22,163,74,0.12)',
    },
    {
      label: 'Monthly Revenue',
      value: `₹${Number(data?.month?.revenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${data?.month?.bills ?? 0} bills this month`,
      icon: TrendingUp,
      color: 'rgb(96,165,250)',
      bg: 'rgba(59,130,246,0.12)',
    },
    {
      label: 'Total Products (SKUs)',
      value: data?.inventory?.totalItems?.toLocaleString() ?? '—',
      sub: 'Active registered stock',
      icon: Package,
      color: 'rgb(148,163,184)',
      bg: 'rgba(100,116,139,0.15)',
    },
    {
      label: 'Low Stock Alerts',
      value: data?.inventory?.lowStockItems ?? '—',
      sub: `${data?.inventory?.nearExpiryItems ?? 0} near expiry`,
      icon: AlertTriangle,
      color: 'rgb(251,191,36)',
      bg: 'rgba(245,158,11,0.12)',
      urgent: (data?.inventory?.lowStockItems ?? 0) > 0,
    },
  ];

  const chartData = data?.weeklyRevenue ?? [
    { day: 'Mon', date: '', revenue: 0, bills: 0 },
    { day: 'Tue', date: '', revenue: 0, bills: 0 },
    { day: 'Wed', date: '', revenue: 0, bills: 0 },
    { day: 'Thu', date: '', revenue: 0, bills: 0 },
    { day: 'Fri', date: '', revenue: 0, bills: 0 },
    { day: 'Sat', date: '', revenue: 0, bills: 0 },
    { day: 'Sun', date: '', revenue: 0, bills: 0 },
  ];

  return (
    <div className="page-container" style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
            Dashboard Overview <Activity size={20} color="rgb(22,163,74)" />
          </h1>
          <p style={{ color: 'rgb(100,116,139)', fontSize: '0.875rem' }}>
            {format(new Date(), "EEEE, MMMM d, yyyy")} · Live shop performance
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Link href="/pos" className="btn-primary">
            <ShoppingCart size={16} /> Open POS Biller
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="stat-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card animate-fadeIn"
            style={stat.urgent ? { borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.04)' } : {}}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgb(161,161,170)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {stat.label}
                </p>
                <div style={{ fontSize: '1.65rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#fafafa' }}>
                  {isLoading ? <div className="skeleton" style={{ width: 90, height: 34 }} /> : stat.value}
                </div>
              </div>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              }}>
                <stat.icon size={20} color={stat.color} />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgb(161,161,170)', fontWeight: 500 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts + quick actions */}
      <div className="dashboard-grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div className="glass-card" style={{ padding: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 2 }}>Weekly Sales Trend</h2>
              <p style={{ fontSize: '0.78rem', color: 'rgb(161,161,170)' }}>7-day revenue performance</p>
            </div>
            <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              ● Live Auto-Sync
            </span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(22,163,74)" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="rgb(22,163,74)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(55,57,72,0.8)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(100,116,139)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgb(100,116,139)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="rgb(22,163,74)"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="glass-card" style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 4 }}>Quick Shortcuts</h2>

          {[
            { href: '/pos', label: 'New POS Sale', sub: 'Open terminal biller', icon: ShoppingCart, color: 'rgb(74,222,128)' },
            { href: '/inventory', label: 'Add / Restock Items', sub: 'Manage products & stock', icon: Package, color: 'rgb(96,165,250)' },
            { href: '/customers', label: 'Manage Customers', sub: 'View profiles & points', icon: Users, color: 'rgb(148,163,184)' },
            { href: '/reports?range=today', label: "Today's Tax Report", sub: 'Sales & GST breakdown', icon: Receipt, color: 'rgb(251,191,36)' },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 10,
                background: 'rgb(27,29,38)',
                border: '1px solid rgb(38,40,52)',
                cursor: 'pointer', transition: 'all 0.15s ease',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(22,163,74,0.35)';
                  e.currentTarget.style.background = 'rgba(22,163,74,0.06)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgb(38,40,52)';
                  e.currentTarget.style.background = 'rgb(27,29,38)';
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: `rgba(0,0,0,0.2)`,
                  border: '1px solid rgb(55,57,72)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.icon size={17} color={action.color} />
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f8fafc' }}>{action.label}</div>
                  <div style={{ fontSize: '0.72rem', color: 'rgb(100,116,139)' }}>{action.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top selling items */}
      {data?.topItemsToday?.length > 0 && (
        <div className="glass-card" style={{ padding: 22 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, marginBottom: 16 }}>
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
                          width: 26, height: 26, borderRadius: 7, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(22,163,74,0.15)',
                          fontSize: '0.75rem', fontWeight: 700, color: '#4ade80',
                        }}>{i + 1}</span>
                        {item.itemNameAtSale}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700 }}>{Number(item.qty ?? item._sum?.qty ?? 0).toFixed(0)}</td>
                    <td style={{ color: 'rgb(52,211,153)', fontWeight: 700 }}>
                      ₹{Number(item.lineTotal ?? item._sum?.lineTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
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
