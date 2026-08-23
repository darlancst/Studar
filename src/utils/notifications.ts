/**
 * Utilitário de Notificações no Celular e Navegador (Web Notifications & Service Worker)
 * Suporta PWA instalado no smartphone (Android/iOS 16.4+) e navegadores desktop.
 */

export type NotificationPermissionStatus = 'granted' | 'denied' | 'default' | 'unsupported';

export interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  renotify?: boolean;
  vibratePattern?: number[];
}

/**
 * Verifica se a API de Notificações é suportada no ambiente atual
 */
export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window;
}

/**
 * Retorna o status atual de permissão de notificações
 */
export function getNotificationPermission(): NotificationPermissionStatus {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission as NotificationPermissionStatus;
}

/**
 * Obtém a ServiceWorkerRegistration de forma segura sem travar o event loop
 */
export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;

  try {
    // 1. Tenta obter o registro existente imediatamente se já estiver ativo
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing && existing.active) return existing;

    // 2. Se não houver registro, tenta registrar o sw.js padrão
    if (!existing) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch (regErr) {
        console.warn('Tentativa de registrar /sw.js falhou:', regErr);
      }
    }

    // 3. Aguarda navigator.serviceWorker.ready com timeout de 4000ms (essencial em redes móveis)
    const readyPromise = navigator.serviceWorker.ready;
    const readyTimeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));
    const readyReg = await Promise.race([readyPromise, readyTimeout]);
    if (readyReg) return readyReg;

    // 4. Se o timeout estourou mas o existing existe (ex: em processo de ativação)
    if (existing) return existing;

    // 5. Última tentativa de obter o registro
    const finalCheck = await navigator.serviceWorker.getRegistration();
    if (finalCheck) return finalCheck;

    return null;
  } catch (err) {
    console.warn('Erro ao obter ServiceWorkerRegistration:', err);
    return null;
  }
}

/**
 * Solicita permissão ao usuário para enviar notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    let permission: NotificationPermission;
    const requestResult = Notification.requestPermission();
    if (requestResult && typeof (requestResult as any).then === 'function') {
      permission = await requestResult;
    } else {
      // Suporte para navegadores mais antigos baseados em callback
      permission = await new Promise<NotificationPermission>((resolve) => {
        Notification.requestPermission((p) => resolve(p));
      });
    }

    // Se concedido, pré-registra o Service Worker para garantir prontidão
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
      } catch {
        // Ignora falha de registro silenciosa
      }
    }

    return permission === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão de notificação:', error);
    return false;
  }
}

/**
 * Dispara uma notificação nativa com suporte a Service Worker e vibração
 */
export async function sendNotification(
  title: string,
  options?: ExtendedNotificationOptions
): Promise<boolean> {
  if (!isNotificationSupported()) {
    console.warn('API de Notificações não é suportada neste navegador.');
    return false;
  }

  if (Notification.permission !== 'granted') {
    console.warn('Permissão de Notificações não está concedida. Status atual:', Notification.permission);
    return false;
  }

  const defaultIcon = '/icons/icon-192x192.png';
  const defaultBadge = '/icons/icon-192x192.png';
  const vibratePattern = options?.vibratePattern || options?.vibrate || [200, 100, 200];
  const tag = options?.tag || (options?.renotify ? 'studar-notification' : undefined);

  // Opções sanitizadas estritas para compatibilidade total (W3C / Android Chrome)
  const notificationOptions: Record<string, any> = {
    body: options?.body || '',
    icon: options?.icon || defaultIcon,
    badge: options?.badge || defaultBadge,
    vibrate: vibratePattern,
    ...(tag ? { tag } : {}),
    ...(options?.renotify ? { renotify: true } : {}),
    ...(options?.data ? { data: options.data } : {}),
    ...(options?.requireInteraction ? { requireInteraction: options.requireInteraction } : {}),
  };

  // Se houver suporte à API de vibração nativa no celular, ativa
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && vibratePattern.length > 0) {
    try {
      navigator.vibrate(vibratePattern);
    } catch {
      // Ignora erro se vibração falhar
    }
  }

  // 1. Tenta disparar via Service Worker (obrigatório para Android Chrome / PWA)
  try {
    const registration = await getServiceWorkerRegistration();
    if (registration && typeof registration.showNotification === 'function') {
      await registration.showNotification(title, notificationOptions);
      console.log('Notificação disparada com sucesso via Service Worker');
      return true;
    }
  } catch (e) {
    console.warn('Falha ao enviar via Service Worker, tentando fallback da janela:', e);
  }

  // 2. Fallback para Notification API padrão da janela (Desktop Chrome, Firefox, Edge, Safari)
  if (typeof Notification !== 'undefined') {
    try {
      const notification = new Notification(title, notificationOptions);
      notification.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
        }
        notification.close();
      };
      console.log('Notificação disparada com sucesso via window.Notification');
      return true;
    } catch (e) {
      console.warn('Erro ao instanciar Notification na janela:', e);
    }
  }

  return false;
}

/**
 * Dispara notificação de fim de ciclo de Pomodoro
 */
export async function sendPomodoroNotification(
  type: 'focus_completed' | 'break_completed',
  topicName?: string
): Promise<boolean> {
  if (type === 'focus_completed') {
    const title = '🎉 Foco Concluído!';
    const body = topicName
      ? `Você concluiu seu bloco de estudos em "${topicName}". Hora de descansar!`
      : 'Excelente sessão de foco! Faça uma pausa para recarregar as energias.';

    return sendNotification(title, {
      body,
      tag: 'pomodoro-focus-completed',
      renotify: true,
      vibratePattern: [200, 100, 200, 100, 300],
    });
  } else {
    const title = '⏰ Pausa Finalizada!';
    const body = 'Seu intervalo terminou. Pronto para mais um ciclo de alto rendimento?';

    return sendNotification(title, {
      body,
      tag: 'pomodoro-break-completed',
      renotify: true,
      vibratePattern: [300, 150, 300],
    });
  }
}

/**
 * Dispara notificação de teste para o usuário validar no celular
 */
export async function sendTestNotification(): Promise<boolean> {
  return sendNotification('🔔 Notificações Ativadas no Studar!', {
    body: 'Tudo pronto! Você receberá avisos quando seus ciclos de foco terminarem e lembretes de estudo.',
    tag: 'studar-test-notification',
    renotify: true,
    vibratePattern: [200, 100, 200],
  });
}
