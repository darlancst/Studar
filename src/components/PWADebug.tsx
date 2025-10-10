'use client';

import { useState, useEffect } from 'react';

export default function PWADebug() {
  const [pwaStatus, setPwaStatus] = useState<any>({});
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    const checkPWAStatus = () => {
      const status = {
        // Verifica se está em HTTPS ou localhost
        isSecure: location.protocol === 'https:' || location.hostname === 'localhost',
        
        // Verifica se já está instalado
        isInstalled: window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone,
        
        // Verifica se o Service Worker está ativo
        serviceWorker: 'serviceWorker' in navigator,
        serviceWorkerActive: false,
        
        // Verifica se o manifest está presente
        manifest: document.querySelector('link[rel="manifest"]') !== null,
        
        // Info do navegador
        userAgent: navigator.userAgent,
        isChrome: /Chrome/.test(navigator.userAgent),
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        
        // URL atual
        currentUrl: location.href,
        
        // Verifica se beforeinstallprompt foi disparado
        canInstall: false
      };

      // Verifica Service Worker ativo
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        status.serviceWorkerActive = true;
      }

      setPwaStatus(status);
    };

    checkPWAStatus();

    // Escuta evento de instalação possível
    const handleBeforeInstallPrompt = () => {
      setPwaStatus((prev: any) => ({ ...prev, canInstall: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Só mostra em desenvolvimento ou quando solicitado
  // Removido da UI por solicitação. Manter o componente inativo.
  return null;

  // Conteúdo removido
} 