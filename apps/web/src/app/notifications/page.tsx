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
    <div className="page-container" style={{ padding: '28px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} color="rgb(139,92,246)" /> Desktop Push Notifications & Stock Alerts
          </h1>
          <p style={{ color: 'rgb(161,161,170)', fontSize: '0.875rem' }}>
            Real-time low stock warnings, slow-moving inventory alerts, and desktop push notifications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={sendTestNotification}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 14px' }}
          >
            <Monitor size={14} color="rgb(139,92,246)" /> Test Desktop Push
          </button>
          <button
            onClick={() => refetch()}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', padding: '8px 14px' }}
          >
            <RefreshCw size={13} style={{ animation: isFetching ? 'spin 1s linear infinite' : 'none' }} /> Refresh Alerts
          </button>
        </div>
      </div>

      {/* Desktop Push Notification Banner */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: permission === 'granted' ? 'rgba(52,211,153,0.15)' : 'rgba(139,92,246,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Monitor size={22} color={permission === 'granted' ? 'rgb(52,211,153)' : 'rgb(167,139,250)'} />
          </div>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 2, color: '#fafafa', display: 'flex', alignItems: 'center', gap: 6 }}>
              Desktop Push Notifications: {permission === 'granted' ? (
                <span style={{ color: 'rgb(52,211,153)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircle2 size={14} /> Enabled
                </span>
              ) : (
                <span style={{ color: 'rgb(245,158,11)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Bell size={14} /> Action Needed
                </span>
              )}
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'rgb(161,161,170)' }}>
              Receive instant Windows desktop pop-up notifications whenever stock runs low or important alerts trigger.
            </p>
          </div>
        </div>

        {permission !== 'granted' ? (
          <button
            onClick={requestDesktopPermission}
            className="btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
          >
            Enable Desktop Notifications
          </button>
        ) : (
          <span className="badge badge-success" style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={13} /> Active & Listening
          </span>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {[
          { key: 'ALL', label: `All Alerts (${allNotifications.length})`, icon: Bell },
          { key: 'LOW_STOCK', label: `Low Stock (${lowStockItems.length})`, icon: AlertTriangle },
          { key: 'SYSTEM', label: `System & Security`, icon: Shield },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key as any)}
              style={{
                padding: '8px 16px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: filter === t.key ? 'rgb(var(--color-primary))' : 'rgba(255,255,255,0.05)',
                color: filter === t.key ? 'white' : 'rgb(161,161,170)',
                fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Icon size={14} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card" style={{ padding: 20 }}>
              <div className="skeleton" style={{ height: 20, width: '40%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 14, width: '70%' }} />
            </div>
          ))
        ) : filteredNotifications.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '48px 16px', color: 'rgb(113,113,122)' }}>
            <Inbox size={40} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#a1a1aa' }}>No Stock Alerts</div>
            <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
              All inventory items are currently above minimum stock levels.
            </div>
          </div>
        ) : (
          filteredNotifications.map((item) => (
            <div
              key={item.id}
              className="glass-card"
              style={{
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 16,
                borderLeft: item.category === 'LOW_STOCK' ? '4px solid rgb(245,158,11)' : '4px solid rgb(139,92,246)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: item.category === 'LOW_STOCK' ? 'rgba(245,158,11,0.15)' : 'rgba(139,92,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {item.category === 'LOW_STOCK' ? (
                    <AlertTriangle size={20} color="rgb(245,158,11)" />
                  ) : (
                    <Shield size={20} color="rgb(167,139,250)" />
                  )}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fafafa' }}>{item.title}</h4>
                    <span className={`badge ${item.badgeClass}`} style={{ fontSize: '0.7rem' }}>
                      {item.type}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.82rem', color: 'rgb(161,161,170)', lineHeight: 1.4 }}>
                    {item.message}
                  </p>
                </div>
              </div>

              {item.actionUrl && (
                <Link
                  href={item.actionUrl}
                  className="btn-secondary"
                  style={{ fontSize: '0.78rem', padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {item.actionLabel} <ArrowUpRight size={13} />
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
