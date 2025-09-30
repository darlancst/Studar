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
  if (!showDebug && process.env.NODE_ENV === 'production') {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-2 left-2 bg-gray-800 text-white p-2 rounded text-xs z-50 opacity-50 hover:opacity-100"
      >
        Debug PWA
      </button>
    );
  }

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed bottom-2 left-2 bg-gray-800 text-white p-2 rounded text-xs z-50"
      >
        Debug PWA
      </button>
    );
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-gray-900 text-white p-4 rounded-lg shadow-lg text-xs max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-sm">PWA Debug Status</h3>
          <button onClick={() => setShowDebug(false)} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between">
            <span>🔒 Conexão Segura:</span>
            <span className={pwaStatus.isSecure ? 'text-green-400' : 'text-red-400'}>
              {pwaStatus.isSecure ? '✅ SIM' : '❌ NÃO - Precisa HTTPS!'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>📱 Já Instalado:</span>
            <span className={pwaStatus.isInstalled ? 'text-green-400' : 'text-yellow-400'}>
              {pwaStatus.isInstalled ? '✅ SIM' : '⏳ NÃO'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>⚙️ Service Worker:</span>
            <span className={pwaStatus.serviceWorker ? 'text-green-400' : 'text-red-400'}>
              {pwaStatus.serviceWorker ? '✅ Suportado' : '❌ Não suportado'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>🟢 SW Ativo:</span>
            <span className={pwaStatus.serviceWorkerActive ? 'text-green-400' : 'text-yellow-400'}>
              {pwaStatus.serviceWorkerActive ? '✅ Ativo' : '⏳ Inativo'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>📋 Manifest:</span>
            <span className={pwaStatus.manifest ? 'text-green-400' : 'text-red-400'}>
              {pwaStatus.manifest ? '✅ Presente' : '❌ Ausente'}
            </span>
          </div>

          <div className="flex justify-between">
            <span>🎯 Pode Instalar:</span>
            <span className={pwaStatus.canInstall ? 'text-green-400' : 'text-yellow-400'}>
              {pwaStatus.canInstall ? '✅ SIM' : '⏳ Aguardando...'}
            </span>
          </div>

          <div className="border-t border-gray-700 pt-2 mt-3">
            <div className="text-xs text-gray-400">
              <div><strong>Navegador:</strong> {pwaStatus.isChrome ? 'Chrome' : pwaStatus.isSafari ? 'Safari' : 'Outro'}</div>
              <div><strong>URL:</strong> {pwaStatus.currentUrl?.split('://')[0]}</div>
            </div>
          </div>

          {!pwaStatus.isSecure && (
            <div className="bg-red-900/50 p-2 rounded mt-3">
              <div className="text-red-300 font-bold">⚠️ PROBLEMA PRINCIPAL:</div>
              <div className="text-red-200 text-xs mt-1">
                PWA precisa de HTTPS para funcionar. Use Vercel, Netlify ou ngrok.
              </div>
            </div>
          )}

          {pwaStatus.isSecure && !pwaStatus.canInstall && (
            <div className="bg-yellow-900/50 p-2 rounded mt-3">
              <div className="text-yellow-300 font-bold">⏳ Aguardando...</div>
              <div className="text-yellow-200 text-xs mt-1">
                PWA precisa atender a todos os critérios. Recarregue a página.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 