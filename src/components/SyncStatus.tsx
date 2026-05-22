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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'not-configured' | 'conflict'>('offline');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Configurar sync com usuário autenticado (ou deviceId se não autenticado)
    firebaseSync.setUser(user);
    if (user) {
      // Verificar conflito antes de iniciar a sync
      firebaseSync.checkCloudData().then(hasCloud => {
        const hasLocal = firebaseSync.hasLocalData();
        if (hasCloud && hasLocal) {
          setSyncStatus('conflict');
        } else {
          firebaseSync.initialSync();
        }
      });
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

  const handleResolveConflict = async (choice: 'cloud' | 'local') => {
    setSyncStatus('syncing');
    if (choice === 'cloud') {
      await firebaseSync.syncFromCloud();
    } else {
      await firebaseSync.syncToCloud();
    }
    setSyncStatus('synced');
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
      case 'conflict':
        return <ExclamationTriangleIcon className="w-4 h-4 text-orange-500 animate-pulse" />;
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
      case 'conflict':
        return 'Conflito de Dados';
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
      case 'conflict':
        return 'text-orange-600 dark:text-orange-400 font-bold';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>{getStatusText()}</span>
        </div>
        <button
          onClick={handleAuthAction}
          className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
            isAuthenticated
              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40'
              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
          }`}
        >
          {isAuthenticated ? (
            <>
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
              <span>Sair</span>
            </>
          ) : (
            <>
              <UserIcon className="w-4 h-4" />
              <span>Entrar</span>
            </>
          )}
        </button>
      </div>

      {!isAuthenticated && (
        <div className="mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded">
          Faça login para sincronizar entre dispositivos
        </div>
      )}
      {isAuthenticated && syncStatus === 'offline' && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded">
          Modo offline - dados serão sincronizados quando conectar
        </div>
      )}

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
      />

      {/* Modal de Conflito */}
      {syncStatus === 'conflict' && (
        <div className="fixed inset-0 z-[100] bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full border border-orange-200 dark:border-orange-900/50">
            <div className="flex items-center gap-3 text-orange-600 dark:text-orange-400 mb-4">
              <ExclamationTriangleIcon className="w-8 h-8" />
              <h3 className="text-lg font-bold">Conflito de Dados</h3>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Encontramos dados de estudo salvos localmente neste celular, mas você também possui um perfil com dados na nuvem. O que deseja fazer?
            </p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleResolveConflict('local')}
                className="w-full text-left p-3 rounded-lg border-2 border-blue-200 dark:border-blue-900 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <div className="font-semibold text-blue-700 dark:text-blue-400">Subir dados do celular (Recomendado)</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Substitui os dados antigos da nuvem pelo seu progresso atual neste dispositivo.
                </div>
              </button>
              
              <button
                onClick={() => handleResolveConflict('cloud')}
                className="w-full text-left p-3 rounded-lg border-2 border-orange-200 dark:border-orange-900 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
              >
                <div className="font-semibold text-orange-700 dark:text-orange-400">Baixar dados da nuvem</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Apaga o progresso local deste celular e restaura o que estava salvo na sua conta.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 