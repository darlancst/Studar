'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { firebaseSync } from '@/services/firebaseSync';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useSessionStore } from '@/store/sessionStore';

export default function HydrationWrapper({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const { user } = useAuth();

  // Garantir que estamos no cliente
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const syncAndHydrate = async () => {
      // Hidratar manualmente os stores do Zustand
      if (typeof window !== 'undefined') {
        await useSubjectStore.persist.rehydrate();
        await useTopicStore.persist.rehydrate();
        await useSessionStore.persist.rehydrate();
      }

      // Sincronizar com Firebase se usuário estiver logado
      if (user) {
        firebaseSync.setUser(user);
        await firebaseSync.initialSync();
      }
      
      setIsHydrated(true);
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new Event('dataSync'));
    };

    syncAndHydrate();
  }, [user, isClient]);

  // Durante SSR e hidratação inicial, mostrar loader
  if (!isClient || !isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return <>{children}</>;
} 