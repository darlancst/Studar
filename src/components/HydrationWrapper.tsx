'use client';

import { useState, useEffect } from 'react';
import { firebaseSync } from '@/services/firebaseSync';
import { useAuthStore } from '@/store/authStore';

// Este componente garante que os dados sejam carregados ANTES de renderizar a aplicação principal.
// Isso evita erros de hidratação do React (erros #425, #418, #423).

export default function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { user, verifyToken } = useAuthStore();

  // Garantir que só renderiza no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const syncAndHydrate = async () => {
      // Pequeno delay para garantir que stores foram inicializados
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verificar token do usuário (se tiver)
      await verifyToken();
      
      // Obter user atualizado após verificação
      const currentUser = useAuthStore.getState().user;
      
      // Sync inicial com userId (se autenticado) ou deviceId (se não)
      firebaseSync.setUser(currentUser);
      await firebaseSync.initialSync();
      
      // Marca como hidratado, permitindo que a UI renderize com os dados corretos.
      setIsHydrated(true);

      // Dispara um evento para que os stores possam recarregar seus estados do localStorage atualizado.
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('dataSync'));
    };

    syncAndHydrate();
  }, [isMounted, verifyToken]);

  // Não renderizar nada no servidor
  if (!isMounted || !isHydrated) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center">
          {/* Container do Ícone com Jateamento Premium e Pulsação Suave */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md border border-gray-150/70 dark:border-gray-800/80 rounded-2xl shadow-md flex items-center justify-center overflow-hidden animate-pulse">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-primary-600/5 to-blue-500/5 opacity-100" />
            <img 
              src="/icons/header-logo.png" 
              alt="Studar" 
              className="w-13 h-13 sm:w-16 sm:h-16 object-contain rounded-md"
            />
          </div>
          
          {/* Título de Marca e Subtítulo */}
          <h1 className="text-2xl sm:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400 mt-4 tracking-tight select-none">
            Studar
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 font-medium select-none tracking-wide animate-pulse">
            Iniciando sua jornada produtiva...
          </p>
        </div>
        
        {/* Indicador de carregamento discreto */}
        <div className="mt-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent dark:border-primary-400 dark:border-t-transparent opacity-80" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 