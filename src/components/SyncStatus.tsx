'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { firebaseSync } from '@/services/firebaseSync';
import { CloudArrowUpIcon, CloudArrowDownIcon, WifiIcon, UserIcon, ArrowRightOnRectangleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import AuthModal from './AuthModal';

export default function SyncStatus() {
  const { user, logout, isAuthenticated, isFirebaseAvailable } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'not-configured'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    if (!isFirebaseAvailable) {
      setSyncStatus('not-configured');
      return;
    }

    if (user) {
      // Configurar sync para o usuário
      firebaseSync.setUser(user);
      firebaseSync.initialSync();
    } else {
      firebaseSync.setUser(null);
    }
  }, [user, isFirebaseAvailable]);

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

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
    } else {
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
    if (syncStatus === 'not-configured') {
      return 'Firebase não configurado';
    }
    
    if (!isAuthenticated) return 'Dados apenas locais';
    
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
    if (syncStatus === 'not-configured') return 'text-amber-500';
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
                {user && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.displayName || user.email}
                  </span>
                )}
              </div>
            </div>

            {/* Botão de Auth - só mostrar se Firebase estiver configurado */}
            {isFirebaseAvailable && (
              <button
                onClick={handleAuthAction}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isAuthenticated
                    ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
                }`}
              >
                {isAuthenticated ? (
                  <>
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Sair</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Entrar</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Indicador de Firebase não configurado */}
          {syncStatus === 'not-configured' && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              ⚠️ Configure Firebase para sincronizar dados (veja FIREBASE-SETUP.md)
            </div>
          )}

          {/* Indicador de funcionamento offline */}
          {!isAuthenticated && isFirebaseAvailable && (
            <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
              ⚠️ Faça login para sincronizar entre dispositivos
            </div>
          )}

          {/* Indicador de modo offline */}
          {isAuthenticated && syncStatus === 'offline' && (
            <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
              📱 Modo offline - dados serão sincronizados quando conectar
            </div>
          )}
        </div>
      </div>

      {isFirebaseAvailable && (
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      )}
    </>
  );
} 