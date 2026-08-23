'use client';

import { useState, useEffect, useCallback } from 'react';
import { billingApi } from '@/lib/api';
import { getOfflineBills, removeOfflineBill } from '@/lib/offlineSync';
import toast from 'react-hot-toast';
import { WifiOff, RefreshCw, CheckCircle2, CloudUpload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

export default function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPendingQueue = useCallback(() => {
    const queue = getOfflineBills();
    setPendingCount(queue.length);
  }, []);

  const syncPendingBills = useCallback(async () => {
    const queue = getOfflineBills();
    if (queue.length === 0) return;

    setIsSyncing(true);
    toast.loading(`Syncing ${queue.length} offline bills to database...`, { id: 'offline-sync' });

    let syncedCount = 0;
    for (const item of queue) {
      try {
        await billingApi.create(item.payload);
        removeOfflineBill(item.id);
        syncedCount++;
      } catch (err: any) {
        console.error('Failed to sync offline bill:', err);
      }
    }

    setIsSyncing(false);
    checkPendingQueue();
    qc.invalidateQueries({ queryKey: ['bills'] });
    qc.invalidateQueries({ queryKey: ['posCatalog'] });
    qc.invalidateQueries({ queryKey: ['items'] });

    if (syncedCount > 0) {
      toast.success(`Successfully synced ${syncedCount} offline bills to cloud database!`, { id: 'offline-sync', duration: 5000 });
    } else {
      toast.dismiss('offline-sync');
    }
  }, [checkPendingQueue, qc]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);
    checkPendingQueue();

    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Internet connection restored!');
      syncPendingBills();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.error('Device is offline. Bills will be saved locally on device.', { duration: 5000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check on mount if online and has pending bills
    if (navigator.onLine) {
      syncPendingBills();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkPendingQueue, syncPendingBills]);

  return (
    <>
      {children}

      {/* Floating Offline & Sync Status Banner */}
      {(!isOnline || pendingCount > 0 || isSyncing) && (
        <div style={{
          position: 'fixed',
          bottom: 74,
          right: 16,
          zIndex: 3000,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 999,
          background: !isOnline
            ? 'rgba(239, 68, 68, 0.95)'
            : isSyncing
            ? 'rgba(139, 92, 246, 0.95)'
            : 'rgba(16, 185, 129, 0.95)',
          color: '#ffffff',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
          fontSize: '0.82rem',
          fontWeight: 800,
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          {!isOnline ? (
            <>
              <WifiOff size={16} />
              <span>Offline Mode ({pendingCount} bills queued)</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} />
              <span>Syncing {pendingCount} offline bills...</span>
            </>
          ) : (
            <>
              <CloudUpload size={16} />
              <span>{pendingCount} bills ready to sync</span>
              <button
                type="button"
                onClick={syncPendingBills}
                style={{
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  color: 'white',
                  borderRadius: 999,
                  padding: '2px 10px',
                  fontSize: '0.74rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  marginLeft: 4,
                }}
              >
                Sync Now
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
