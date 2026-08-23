'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/lib/api';
import {
  BarChart3, TrendingUp, Package, AlertTriangle, Receipt,
  IndianRupee, Download, Calendar, Filter, FileText, ArrowDownRight, ArrowUpRight
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfDay } from 'date-fns';

type Tab = 'sales' | 'bestSellers' | 'lowStock' | 'tax' | 'stockLog';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('sales');

  // Date filters
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthStartStr = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const [fromDate, setFromDate] = useState(monthStartStr);
  const [toDate, setToDate] = useState(todayStr);

  // Queries
  const { data: salesData, isLoading: isLoadingSales } = useQuery({
    queryKey: ['reportSales', fromDate, toDate],
    queryFn: () => reportsApi.sales({ from: fromDate, to: toDate }).then((r) => r.data),
    enabled: activeTab === 'sales',
  });

  const { data: bestSellersData, isLoading: isLoadingBest } = useQuery({
    queryKey: ['reportBestSellers', fromDate, toDate],
    queryFn: () => reportsApi.bestSellers({ from: fromDate, to: toDate, limit: 25 }).then((r) => r.data),
    enabled: activeTab === 'bestSellers',
  });

  const { data: lowStockData, isLoading: isLoadingLowStock } = useQuery({
    queryKey: ['reportLowStock'],
    queryFn: () => reportsApi.lowStock().then((r) => r.data),
    enabled: activeTab === 'lowStock',
  });

  const { data: taxData, isLoading: isLoadingTax } = useQuery({
    queryKey: ['reportTax', fromDate, toDate],
    queryFn: () => reportsApi.taxReport({ from: fromDate, to: toDate }).then((r) => r.data),
    enabled: activeTab === 'tax',
  });

  const { data: stockLogData, isLoading: isLoadingStockLog } = useQuery({
    queryKey: ['reportStockMovement', fromDate, toDate],
    queryFn: () => reportsApi.stockMovement({ from: fromDate, to: toDate }).then((r) => r.data),
    enabled: activeTab === 'stockLog',
  });

  const setDatePreset = (preset: 'today' | 'week' | 'month') => {
    const today = new Date();
    if (preset === 'today') {
      setFromDate(format(today, 'yyyy-MM-dd'));
      setToDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'week') {
      setFromDate(format(subDays(today, 7), 'yyyy-MM-dd'));
      setToDate(format(today, 'yyyy-MM-dd'));
    } else if (preset === 'month') {
      setFromDate(format(startOfMonth(today), 'yyyy-MM-dd'));
      setToDate(format(today, 'yyyy-MM-dd'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="page-container" style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>Reports & Analytics</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            GST tax filing reports, sales performance, fast moving items & stock audit trails
          </p>
        </div>
        <div className="page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={handlePrint}>
            <Download size={15} /> Print / Export
          </button>
        </div>
      </div>

      {/* Date filter bar */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgb(113,113,122)', textTransform: 'uppercase' }}>Range:</span>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setDatePreset('today')}>Today</button>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setDatePreset('week')}>Last 7 Days</button>
          <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }} onClick={() => setDatePreset('month')}>This Month</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="date"
            className="input"
            style={{ width: 140, padding: '6px 10px', fontSize: '0.8rem' }}
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <span style={{ color: 'rgb(113,113,122)', fontSize: '0.8rem' }}>to</span>
          <input
            type="date"
            className="input"
            style={{ width: 140, padding: '6px 10px', fontSize: '0.8rem' }}
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 12, marginBottom: 24, overflowX: 'auto' }}>
        {[
          { id: 'sales', label: 'Sales Summary', icon: TrendingUp },
          { id: 'bestSellers', label: 'Best Sellers', icon: Package },
          { id: 'lowStock', label: 'Low Stock Alerts', icon: AlertTriangle },
          { id: 'tax', label: 'GST Tax Report', icon: Receipt },
          { id: 'stockLog', label: 'Stock Movement Audit', icon: FileText },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
              background: activeTab === tab.id ? 'rgba(139,92,246,0.15)' : 'transparent',
              color: activeTab === tab.id ? 'rgb(167,139,250)' : 'rgb(161,161,170)',
              fontWeight: activeTab === tab.id ? 700 : 500,
              fontSize: '0.875rem', transition: 'all 0.15s',
              borderBottom: activeTab === tab.id ? '2px solid rgb(139,92,246)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Sales Summary ────────────────────────────────────────── */}
      {activeTab === 'sales' && (
        <div className="animate-fadeIn">
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Gross Revenue</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(52,211,153)' }}>
                ₹{Number(salesData?.summary?.totalRevenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', marginTop: 4 }}>{salesData?.summary?.totalBills ?? 0} invoices issued</p>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Tax Collected</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(139,92,246)' }}>
                ₹{Number(salesData?.summary?.totalTax ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', marginTop: 4 }}>GST liabilities</p>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>Net Revenue</div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'rgb(59,130,246)' }}>
                ₹{Number(salesData?.summary?.netRevenue ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
              <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)', marginTop: 4 }}>Excluding tax</p>
            </div>
          </div>

          {/* Invoices List */}
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date & Time</th>
                  <th>Customer</th>
                  <th>Biller</th>
                  <th>Items</th>
                  <th>Payment</th>
                  <th>Tax</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingSales ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24 }}>Loading sales data…</td></tr>
                ) : salesData?.bills?.length === 0 ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 32, color: 'rgb(113,113,122)' }}>No bills found for this period</td></tr>
                ) : (
                  salesData?.bills?.map((b: any) => (
                    <tr key={b.id}>
                      <td><code style={{ color: 'rgb(167,139,250)', fontWeight: 700 }}>{b.billNumber}</code></td>
                      <td style={{ fontSize: '0.78rem' }}>{format(new Date(b.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                      <td>{b.customer?.name || b.customer?.phone || 'Walk-in'}</td>
                      <td>{b.biller?.name}</td>
                      <td>{b.items?.length ?? 0}</td>
                      <td><span className="badge badge-gray">{b.paymentMode}</span></td>
                      <td>₹{Number(b.taxTotal).toFixed(2)}</td>
                      <td style={{ fontWeight: 800, color: 'rgb(52,211,153)' }}>₹{Number(b.grandTotal).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: Best Sellers ─────────────────────────────────────────── */}
      {activeTab === 'bestSellers' && (
        <div className="animate-fadeIn">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Item Name</th>
                  <th>Quantity Sold</th>
                  <th>Total Sales Volume</th>
                  <th>Transactions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingBest ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24 }}>Loading best sellers…</td></tr>
                ) : bestSellersData?.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'rgb(113,113,122)' }}>No sales data in this date range</td></tr>
                ) : (
                  bestSellersData?.map((item: any, idx: number) => (
                    <tr key={item.itemId}>
                      <td>
                        <span style={{
                          width: 24, height: 24, borderRadius: 6, display: 'inline-flex',
                          alignItems: 'center', justifyContent: 'center',
                          background: idx === 0 ? 'rgba(245,158,11,0.2)' : 'rgba(139,92,246,0.1)',
                          color: idx === 0 ? 'rgb(245,158,11)' : 'rgb(167,139,250)',
                          fontWeight: 800, fontSize: '0.75rem',
                        }}>
                          #{idx + 1}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{item.itemNameAtSale}</td>
                      <td style={{ fontWeight: 700 }}>{Number(item.qty ?? item._sum?.qty ?? 0).toFixed(0)} units</td>
                      <td style={{ fontWeight: 700, color: 'rgb(52,211,153)' }}>
                        ₹{Number(item.lineTotal ?? item._sum?.lineTotal ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td>{item._count?.id ?? 0} bills</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: Low Stock Alerts ─────────────────────────────────────── */}
      {activeTab === 'lowStock' && (
        <div className="animate-fadeIn">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Reorder Threshold</th>
                  <th>Shortage</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingLowStock ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24 }}>Checking inventory levels…</td></tr>
                ) : lowStockData?.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'rgb(52,211,153)' }}>All stock levels are healthy! 🎉</td></tr>
                ) : (
                  lowStockData?.map((item: any) => {
                    const current = Number(item.currentStock);
                    const threshold = Number(item.reorderThreshold);
                    const shortage = Math.max(0, threshold - current);
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: 600 }}>{item.name}</td>
                        <td>{item.category?.name ?? '—'}</td>
                        <td style={{ fontWeight: 800, color: 'rgb(239,100,100)' }}>
                          {current.toFixed(0)} {item.unit}
                        </td>
                        <td>{threshold.toFixed(0)} {item.unit}</td>
                        <td style={{ color: 'rgb(245,158,11)', fontWeight: 700 }}>
                          −{shortage.toFixed(0)} {item.unit}
                        </td>
                        <td>
                          <span className="badge badge-danger">Needs Restock</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: GST Tax Report ────────────────────────────────────────── */}
      {activeTab === 'tax' && (
        <div className="animate-fadeIn">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700 }}>Total Taxable Turnover</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                ₹{Number(taxData?.taxableAmount ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700 }}>CGST (Central Tax)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(139,92,246)' }}>
                ₹{Number(taxData?.cgst ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700 }}>SGST (State Tax)</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(59,130,246)' }}>
                ₹{Number(taxData?.sgst ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="stat-card">
              <div style={{ fontSize: '0.72rem', color: 'rgb(113,113,122)', textTransform: 'uppercase', fontWeight: 700 }}>Total GST Liability</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'rgb(52,211,153)' }}>
                ₹{Number(taxData?.totalTaxCollected ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: 12 }}>GST Filing Breakdown (Intra-State Sale 50/50 Split)</h3>
            <p style={{ fontSize: '0.8rem', color: 'rgb(161,161,170)', marginBottom: 16 }}>
              All tax amounts calculated with Decimal.js fixed-point arithmetic for GSTR-1 / GSTR-3B monthly return filing.
            </p>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Tax Rate Breakdown</th>
                    <th>Collected Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Central GST (CGST)</td>
                    <td>50% of total GST collected</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(taxData?.cgst ?? 0).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td>State GST (SGST)</td>
                    <td>50% of total GST collected</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(taxData?.sgst ?? 0).toFixed(2)}</td>
                  </tr>
                  <tr style={{ background: 'rgba(52,211,153,0.06)' }}>
                    <td style={{ fontWeight: 800 }}>Total GST Payable</td>
                    <td>CGST + SGST</td>
                    <td style={{ fontWeight: 800, color: 'rgb(52,211,153)' }}>₹{Number(taxData?.totalTaxCollected ?? 0).toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: Stock Movement Audit Log ───────────────────────────────── */}
      {activeTab === 'stockLog' && (
        <div className="animate-fadeIn">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Quantity Delta</th>
                  <th>Cost / Sale Ref</th>
                  <th>Reason / Notes</th>
                  <th>Logged By</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingStockLog ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>Loading audit transactions…</td></tr>
                ) : stockLogData?.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: 32, color: 'rgb(113,113,122)' }}>No stock adjustments logged</td></tr>
                ) : (
                  stockLogData?.map((tx: any) => {
                    const qty = Number(tx.quantity);
                    const isPositive = qty > 0;
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.78rem' }}>{format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm a')}</td>
                        <td style={{ fontWeight: 600 }}>{tx.item?.name}</td>
                        <td>
                          <span className={`badge ${
                            tx.type === 'RESTOCK' ? 'badge-success' :
                            tx.type === 'SALE' ? 'badge-info' :
                            tx.type === 'RETURN' ? 'badge-warning' : 'badge-danger'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: isPositive ? 'rgb(52,211,153)' : 'rgb(239,100,100)' }}>
                          {isPositive ? '+' : ''}{qty.toFixed(0)} {tx.item?.unit}
                        </td>
                        <td>{tx.costPrice ? `₹${Number(tx.costPrice).toFixed(2)}` : tx.referenceId ? `Ref #${tx.referenceId.slice(-6)}` : '—'}</td>
                        <td style={{ fontSize: '0.8rem', color: 'rgb(161,161,170)' }}>{tx.reason || '—'}</td>
                        <td>{tx.createdBy?.name || 'System'}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
