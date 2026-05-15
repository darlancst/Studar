import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook que usa a Screen Wake Lock API para impedir que a tela do celular
 * desligue enquanto o timer estiver rodando.
 * 
 * - Solicita wake lock quando `isActive` = true
 * - Libera quando `isActive` = false
 * - Re-adquire automaticamente quando o usuário volta para a aba (visibilitychange)
 */
export function useWakeLock(isActive: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const requestWakeLock = useCallback(async () => {
    if (!('wakeLock' in navigator)) return;

    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
      wakeLockRef.current.addEventListener('release', () => {
        wakeLockRef.current = null;
      });
    } catch (err) {
      // Wake lock pode falhar silenciosamente (ex: bateria muito baixa)
      console.warn('Wake Lock não pôde ser ativado:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch (err) {
        // Ignora erro se já foi liberado
      }
      wakeLockRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isActive) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [isActive, requestWakeLock, releaseWakeLock]);

  // Re-adquirir o wake lock quando o usuário volta para a aba
  // (A API libera automaticamente quando a aba perde visibilidade)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, requestWakeLock]);
}
