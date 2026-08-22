'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '@/lib/api';
import {
  Bell, MessageSquare, CheckCircle2, AlertCircle, Clock,
  Phone, Receipt, RefreshCw, XCircle, Inbox
} from 'lucide-react';
import { format } from 'date-fns';

export default function NotificationsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['notificationLogs', page],
    queryFn: () => notificationsApi.getLogs({ page, limit: 20 }).then((r) => r.data),
    refetchInterval: 15000,
  });

  const logs: any[] = data?.logs ?? [];
  const meta = data?.meta;

  return (
    <div style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>WhatsApp & Notification Logs</h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Real-time delivery status of digital e-bills and alerts sent via WhatsApp Cloud API
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 14px' }}
        >
          <RefreshCw size={13} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} /> Refresh
        </button>
      </div>

      {/* Meta/WhatsApp API Integration status card */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(52,211,153,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageSquare size={22} color="rgb(52,211,153)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 2 }}>WhatsApp Cloud API (Meta)</h3>
            <p style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>
              Official Meta Graph API v19.0 · High deliverability e-invoices with PDF download links
            </p>
          </div>
        </div>
        <span className="badge badge-success" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
          <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} />
          Database Synced
        </span>
      </div>

      {/* Logs Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Notification Type</th>
              <th>Channel</th>
              <th>Recipient</th>
              <th>Message ID</th>
              <th>Delivery Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton" style={{ height: 16, width: '80%' }} /></td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: 'rgb(113,113,122)' }}>
                  <Inbox size={36} style={{ opacity: 0.3, display: 'block', margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#a1a1aa' }}>No Notification Logs Yet</div>
                  <div style={{ fontSize: '0.78rem', marginTop: 4 }}>
                    When digital invoices or low-stock alerts are sent via WhatsApp, their real-time delivery status will appear here.
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log: any) => (
                <tr key={log.id}>
                  <td style={{ fontSize: '0.78rem' }}>
                    {format(new Date(log.createdAt), 'dd MMM yyyy, hh:mm a')}
                  </td>
                  <td>
                    <span className={`badge ${
                      log.type === 'BILL_DELIVERY' ? 'badge-purple' :
                      log.type === 'LOW_STOCK' ? 'badge-warning' : 'badge-gray'
                    }`}>
                      {log.type}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgb(52,211,153)', fontWeight: 600, fontSize: '0.8rem' }}>
                      <MessageSquare size={13} /> {log.channel}
                    </div>
                  </td>
                  <td><code>{log.recipient}</code></td>
                  <td style={{ fontSize: '0.75rem', color: 'rgb(113,113,122)' }}>
                    {log.messageId || '—'}
                  </td>
                  <td>
                    <span className={`badge ${
                      log.status === 'SENT' || log.status === 'DELIVERED' ? 'badge-success' :
                      log.status === 'QUEUED' ? 'badge-warning' : 'badge-danger'
                    }`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                background: p === page ? 'rgb(var(--color-primary))' : 'rgb(var(--surface-2))',
                color: p === page ? 'white' : 'rgb(var(--text-secondary))',
                fontWeight: 600, fontSize: '0.875rem',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
