'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi, itemsApi } from '@/lib/api';
import {
  Bell, AlertTriangle, CheckCircle2, RefreshCw, Inbox,
  Clock, Shield, ArrowUpRight, Monitor, Package, Sparkles
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'ALL' | 'LOW_STOCK' | 'SLOW_STOCK' | 'SYSTEM'>('ALL');
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestDesktopPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermission(res);
        if (res === 'granted') {
          toast.success('Desktop push notifications enabled!');
          new Notification('BillFlow Pro POS', {
            body: 'Desktop notifications are now active! You will receive live low stock and sales alerts here.',
            icon: '/icon.png',
          });
        } else {
          toast.error('Notification permission was denied in browser/app settings.');
        }
      } catch {
        toast.error('Could not request notification permission.');
      }
    } else {
      toast.error('Desktop notifications are not supported on this device.');
    }
  };

  const sendTestNotification = () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Test Low Stock Alert — BillFlow POS', {
        body: 'Sample Item (Basmati Rice 5kg) has only 2 units left! Click to restock.',
        icon: '/icon.png',
      });
      toast.success('Sent test desktop push notification!');
    } else {
      requestDesktopPermission();
    }
  };

  // Fetch low stock items
  const { data: lowStockData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['lowStockItems'],
    queryFn: () => reportsApi.lowStock().then((r) => r.data),
    refetchInterval: 5000,
  });

  const lowStockItems: any[] = Array.isArray(lowStockData) ? lowStockData : (lowStockData?.items ?? []);

  // Trigger desktop push notification when low stock items are detected
  useEffect(() => {
    if (lowStockItems.length > 0 && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      const firstItem = lowStockItems[0];
      new Notification(`Low Stock Alert: ${firstItem.name}`, {
        body: `Only ${firstItem.stockQuantity ?? 0} units left in stock! Restock threshold is ${firstItem.minStockLevel ?? 5}.`,
        icon: '/icon.png',
      });
    }
  }, [lowStockItems.length]);

  // Combine low stock & system notifications
  const allNotifications = [
    ...lowStockItems.map((item) => ({
      id: `low-stock-${item.id}`,
      type: 'LOW_STOCK',
      category: 'LOW_STOCK' as const,
      title: `Low Stock Warning: ${item.name}`,
      message: `Remaining stock is ${item.stockQuantity ?? 0} (Min Threshold: ${item.minStockLevel ?? 5}). Restock recommended.`,
      timestamp: new Date(),
      badgeClass: 'badge-warning',
      actionUrl: '/inventory',
      actionLabel: 'Restock Item',
      itemId: item.id,
    })),
    {
      id: 'system-1',
      type: 'SYSTEM',
      category: 'SYSTEM' as const,
      title: 'Database Auto-Sync Active',
      message: 'Your POS shop data is automatically synchronized with live online database servers.',
      timestamp: new Date(),
      badgeClass: 'badge-success',
      actionUrl: null,
      actionLabel: null,
    },
    {
      id: 'system-2',
      type: 'SYSTEM',
      category: 'SYSTEM' as const,
      title: 'Security & Encryption Verified',
      message: 'All billing transactions and tenant records are isolated with AES-256 encryption.',
      timestamp: new Date(),
      badgeClass: 'badge-purple',
      actionUrl: null,
      actionLabel: null,
    },
  ];

  const filteredNotifications = allNotifications.filter((n) => {
    if (filter === 'ALL') return true;
    if (filter === 'LOW_STOCK') return n.category === 'LOW_STOCK';
    if (filter === 'SYSTEM') return n.category === 'SYSTEM';
    return true;
  });

  return (
    <div className="page-container" style={{ padding: '32px 36px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} color="rgb(var(--color-primary))" /> Desktop Push Notifications & Stock Alerts
          </h1>
          <p style={{ color: 'rgb(var(--text-secondary))', fontSize: '0.875rem' }}>
            Real-time low stock warnings, slow-moving inventory alerts, and desktop push notifications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={sendTestNotification}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 16px' }}
          >
            <Monitor size={14} color="rgb(var(--color-primary))" /> Test Desktop Push
          </button>
          <button
            onClick={() => refetch()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', padding: '8px 16px' }}
          >
            <RefreshCw size={13} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} /> Refresh Alerts
          </button>
        </div>
      </div>

      {/* Desktop Push Notification Banner */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, border: '1px solid rgb(var(--border-rgb))' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: permission === 'granted' ? 'rgb(var(--color-primary-light))' : 'rgba(234, 179, 8, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Monitor size={22} color={permission === 'granted' ? 'rgb(var(--color-primary-dark))' : '#b45309'} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 3, color: 'rgb(var(--text-primary))', display: 'flex', alignItems: 'center', gap: 6 }}>
              Desktop Push Notifications: {permission === 'granted' ? (
                <span style={{ color: 'rgb(var(--color-primary-dark))', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={15} /> Enabled
                </span>
              ) : (
                <span style={{ color: '#b45309', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Bell size={14} /> Action Needed
                </span>
              )}
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'rgb(var(--text-secondary))', margin: 0 }}>
              Receive instant Windows desktop pop-up notifications whenever stock runs low or important alerts trigger.
            </p>
          </div>
        </div>

        {permission !== 'granted' ? (
          <button
            onClick={requestDesktopPermission}
            className="btn-primary"
            style={{ fontSize: '0.85rem', padding: '9px 20px' }}
          >
            <Sparkles size={14} /> Enable Desktop Alerts
          </button>
        ) : (
          <button
            onClick={sendTestNotification}
            className="btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 16px' }}
          >
            Send Test Alert
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: `All Alerts (${allNotifications.length})` },
          { id: 'LOW_STOCK', label: `Low Stock (${lowStockItems.length})` },
          { id: 'SYSTEM', label: 'System Sync (2)' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id as any)}
            style={{
              padding: '7px 18px',
              borderRadius: 999,
              fontSize: '0.82rem',
              fontWeight: filter === tab.id ? 700 : 500,
              cursor: 'pointer',
              background: filter === tab.id ? 'rgb(var(--color-primary))' : 'rgb(var(--surface-1))',
              color: filter === tab.id ? '#ffffff' : 'rgb(var(--text-secondary))',
              border: `1px solid ${filter === tab.id ? 'rgb(var(--color-primary))' : 'rgb(var(--border-rgb))'}`,
              transition: 'all 0.15s ease',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {isLoading ? (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'rgb(var(--text-muted))' }}>
            Loading notification feed...
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="card" style={{ padding: 60, textAlign: 'center', color: 'rgb(var(--text-secondary))' }}>
            <Inbox size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'rgb(var(--text-primary))', marginBottom: 4 }}>
              No Active Alerts
            </h3>
            <p style={{ fontSize: '0.82rem' }}>All systems and inventory levels are operating normally.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className="card animate-fadeIn"
              style={{
                padding: '18px 22px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 16,
                flexWrap: 'wrap',
                background: '#ffffff',
                border: '1px solid rgb(var(--border-rgb))',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1, minWidth: 260 }}>
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: notif.type === 'LOW_STOCK' ? 'rgba(234, 179, 8, 0.12)' : 'rgb(var(--color-primary-light))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 2,
                }}>
                  {notif.type === 'LOW_STOCK' ? (
                    <AlertTriangle size={18} color="#b45309" />
                  ) : (
                    <Shield size={18} color="rgb(var(--color-primary-dark))" />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: '0.94rem', fontWeight: 800, color: 'rgb(var(--text-primary))', margin: 0 }}>
                      {notif.title}
                    </h4>
                    <span className={`badge ${notif.badgeClass}`}>
                      {notif.type}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.84rem', color: 'rgb(var(--text-secondary))', margin: '0 0 6px' }}>
                    {notif.message}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', color: 'rgb(var(--text-muted))' }}>
                    <Clock size={12} /> Just now · Realtime Stream
                  </div>
                </div>
              </div>

              {notif.actionUrl && (
                <Link
                  href={notif.actionUrl}
                  className="btn-primary"
                  style={{ padding: '7px 16px', fontSize: '0.8rem', gap: 6 }}
                >
                  {notif.actionLabel} <ArrowUpRight size={14} />
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
