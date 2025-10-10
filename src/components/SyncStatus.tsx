'use client';

import { useState, useEffect } from 'react';
import { firebaseSync } from '@/services/firebaseSync';
import { useAuthStore } from '@/store/authStore';
import { clearAllAppData } from '@/utils/clearAllData';
import { CloudArrowUpIcon, CloudArrowDownIcon, WifiIcon, UserIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AuthModal from './AuthModal';

export default function SyncStatus() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'not-configured'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Configurar sync com usuário autenticado (ou deviceId se não autenticado)
    firebaseSync.setUser(user);
    if (user) {
      firebaseSync.initialSync();
    }
  }, [user]);

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
    if (isAuthenticated) {
      // Limpar dados locais e stores antes do logout
      clearAllAppData();
      await logout();
      // Recarregar para garantir UI limpa
      window.location.reload();
    } else {
      // Abrir modal de login
      setShowAuthModal(true);
    }
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
    if (!isAuthenticated) return 'Dados locais';
    
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
    if (!isAuthenticated) return 'text-gray-500';
    
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
      <div className="fixed right-3 bottom-16 sm:top-4 sm:bottom-auto sm:right-4 z-20">
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-full sm:rounded-lg shadow border border-gray-200/60 dark:border-gray-700/60 p-1.5 sm:p-3 max-w-[80vw] sm:max-w-xs">
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Status de Sync */}
            <div className="flex items-center space-x-2">
              {getStatusIcon()}
              <div className="flex flex-col">
                <span className={`hidden sm:inline text-xs font-medium ${getStatusColor()}`}>
                  {getStatusText()}
                </span>
              </div>
            </div>

            {/* Botão de Auth */}
            <button
              onClick={handleAuthAction}
              className={`flex items-center space-x-2 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full sm:rounded-lg text-[10px] sm:text-xs font-medium transition-colors ${
                isAuthenticated
                  ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                  : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
              }`}
            >
              {isAuthenticated ? (
                <>
                  <ArrowRightOnRectangleIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Sair</span>
                </>
              ) : (
                <>
                  <UserIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </>
              )}
            </button>
          </div>

          {/* Indicators ocultos em telas pequenas para reduzir footprint */}
          <div className="hidden sm:block">
            {!isAuthenticated && (
              <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
                💡 Faça login para sincronizar entre dispositivos
              </div>
            )}
            {isAuthenticated && syncStatus === 'offline' && (
              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
                📱 Modo offline - dados serão sincronizados quando conectar
              </div>
            )}
          </div>
        </div>
      </div>

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />
    </>
  );
} 