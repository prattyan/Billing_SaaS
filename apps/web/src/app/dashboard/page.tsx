'use client';

import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import {
  TrendingUp, Package, AlertTriangle, Receipt,
  IndianRupee, ShoppingCart, Users, Calendar,
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
    <div className="glass-card" style={{ padding: '10px 14px', fontSize: '0.8rem' }}>
      <div style={{ color: 'rgb(161,161,170)', marginBottom: 2 }}>{label} ({item?.date || ''})</div>
      <div style={{ fontWeight: 700, color: 'rgb(52,211,153)', fontSize: '0.95rem' }}>
        ₹{Number(payload[0].value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div style={{ color: 'rgb(113,113,122)', fontSize: '0.72rem', marginTop: 2 }}>
        {item?.bills ?? 0} invoice{item?.bills === 1 ? '' : 's'}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => reportsApi.dashboard().then((r) => r.data),
    refetchInterval: 30000, // refresh every 30s
  });

  const stats = [
    {
      label: "Today's Revenue",
      value: `₹${Number(data?.today?.revenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${data?.today?.bills ?? 0} bills today`,
      icon: IndianRupee,
      color: 'rgb(52,211,153)',
      bg: 'rgba(52,211,153,0.1)',
    },
    {
      label: 'Monthly Revenue',
      value: `₹${Number(data?.month?.revenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      sub: `${data?.month?.bills ?? 0} bills this month`,
      icon: TrendingUp,
      color: 'rgb(139,92,246)',
      bg: 'rgba(139,92,246,0.1)',
    },
    {
      label: 'Total Items (SKUs)',
      value: data?.inventory?.totalItems?.toLocaleString() ?? '—',
      sub: 'Active inventory items',
      icon: Package,
      color: 'rgb(59,130,246)',
      bg: 'rgba(59,130,246,0.1)',
    },
    {
      label: 'Low Stock Alerts',
      value: data?.inventory?.lowStockItems ?? '—',
      sub: `${data?.inventory?.nearExpiryItems ?? 0} near expiry`,
      icon: AlertTriangle,
      color: 'rgb(245,158,11)',
      bg: 'rgba(245,158,11,0.1)',
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
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Dashboard</h1>
        <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
          {format(new Date(), "EEEE, MMMM d, yyyy")} · Real-time overview
        </p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16,
        marginBottom: 28,
      }}>
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="stat-card animate-fadeIn"
            style={stat.urgent ? { borderColor: 'rgba(245,158,11,0.3)' } : {}}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'rgb(113,113,122)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  {stat.label}
                </p>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {isLoading ? <div className="skeleton" style={{ width: 80, height: 32 }} /> : stat.value}
                </div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <stat.icon size={18} color={stat.color} />
              </div>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts + quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, marginBottom: 24 }}>
        {/* Revenue chart */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 2 }}>Weekly Revenue</h2>
              <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>This week's sales trend</p>
            </div>
            <span className="badge badge-success">Live</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgb(139,92,246)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="rgb(139,92,246)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'rgb(113,113,122)' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: 'rgb(113,113,122)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="rgb(139,92,246)"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick actions */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 4 }}>Quick Actions</h2>

          {[
            { href: '/pos', label: 'New Sale', sub: 'Open POS billing screen', icon: ShoppingCart, color: 'rgb(139,92,246)' },
            { href: '/inventory?action=add', label: 'Add Item', sub: 'Add new inventory item', icon: Package, color: 'rgb(52,211,153)' },
            { href: '/customers', label: 'Customers', sub: 'View customer history', icon: Users, color: 'rgb(59,130,246)' },
            { href: '/reports?range=today', label: "Today's Report", sub: 'Sales & tax summary', icon: Receipt, color: 'rgb(245,158,11)' },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 10,
                background: 'rgb(var(--surface-2))',
                border: '1px solid rgba(255,255,255,0.04)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(139,92,246,0.2)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                  background: `${action.color}18`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <action.icon size={16} color={action.color} />
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{action.label}</div>
                  <div style={{ fontSize: '0.7rem', color: 'rgb(113,113,122)' }}>{action.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Top selling items */}
      {data?.topItemsToday?.length > 0 && (
        <div className="card">
          <h2 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 16 }}>
            Top Sellers Today
          </h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.topItemsToday.map((item: any, i: number) => (
                  <tr key={item.itemId}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          width: 24, height: 24, borderRadius: 6, display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: 'rgba(139,92,246,0.1)',
                          fontSize: '0.7rem', fontWeight: 800, color: 'rgb(167,139,250)',
                        }}>{i + 1}</span>
                        {item.itemNameAtSale}
                      </div>
                    </td>
                    <td>{Number(item.qty ?? item._sum?.qty ?? 0).toFixed(0)}</td>
                    <td style={{ color: 'rgb(52,211,153)', fontWeight: 600 }}>
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
