'use client';

import { useState, useEffect } from 'react';
import { firebaseSync } from '@/services/firebaseSync';

// Este componente garante que os dados do localStorage (e do Firebase)
// sejam carregados ANTES de renderizar a aplicação principal.
// Isso evita erros de hidratação do React (erros #425, #418, #423).

export default function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Garantir que só renderiza no cliente
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    const syncAndHydrate = async () => {
      // Pequeno delay para garantir que stores foram inicializados
      await new Promise(resolve => setTimeout(resolve, 100));
      // Sync inicial (KV-only)
      firebaseSync.setUser(null);
      await firebaseSync.initialSync();
      
      // Marca como hidratado, permitindo que a UI renderize com os dados corretos.
      setIsHydrated(true);

      // Dispara um evento para que os stores possam recarregar seus estados do localStorage atualizado.
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('dataSync'));
    };

    syncAndHydrate();
  }, [isMounted]);

  // Não renderizar nada no servidor
  if (!isMounted || !isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
} 