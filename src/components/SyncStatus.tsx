'use client';

import { useState, useEffect } from 'react';
import { firebaseSync } from '@/services/firebaseSync';
import { CloudArrowUpIcon, CloudArrowDownIcon, WifiIcon, UserIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

export default function SyncStatus() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'not-configured'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // KV-only: inicia sync uma vez
    firebaseSync.setUser(null);
    firebaseSync.initialSync();
  }, []);

  useEffect(() => {
    // Escutar eventos de sync
    const handleDataSync = () => {
      setSyncStatus('synced');
      setLastSyncTime(new Date());
    };

    const handleSyncStart = () => {
      setSyncStatus('syncing');
    };

    const handleSyncError = () => {
      setSyncStatus('error');
    };

    window.addEventListener('dataSync', handleDataSync);
    window.addEventListener('syncStart', handleSyncStart);
    window.addEventListener('syncError', handleSyncError);

    return () => {
      window.removeEventListener('dataSync', handleDataSync);
      window.removeEventListener('syncStart', handleSyncStart);
      window.removeEventListener('syncError', handleSyncError);
    };
  }, []);

  const handleAuthAction = async () => {
    // Removido: auth não é usado com KV-only
    setShowAuthModal(false);
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <CloudArrowUpIcon className="w-4 h-4 animate-pulse text-blue-500" />;
      case 'synced':
        return <CloudArrowDownIcon className="w-4 h-4 text-green-500" />;
      case 'error':
        return <WifiIcon className="w-4 h-4 text-red-500" />;
      case 'not-configured':
        return <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />;
      default:
        return <CloudArrowUpIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    // KV-only: sempre disponível
    switch (syncStatus) {
      case 'syncing':
        return 'Sincronizando...';
      case 'synced':
        return lastSyncTime ? `Sync: ${lastSyncTime.toLocaleTimeString()}` : 'Sincronizado';
      case 'error':
        return 'Erro na sync';
      default:
        return 'Offline';
    }
  };

  const getStatusColor = () => {
    // KV-only
    switch (syncStatus) {
      case 'syncing':
        return 'text-blue-500';
      case 'synced':
        return 'text-green-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <>
      <div className="fixed top-4 right-4 z-40">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-3">
          <div className="flex items-center space-x-3">
            {/* Status de Sync */}
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <div className="flex flex-col">
                <span className={`text-xs font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
                {/* KV-only: sem usuário */}
              </div>
            </div>

            {/* KV-only: sem auth */}
          </div>

          {/* Indicador de modo offline */}
          {syncStatus === 'offline' && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
              📱 Modo offline - dados serão sincronizados quando conectar
            </div>
          )}
        </div>
      </div>
    </>
  );
} 