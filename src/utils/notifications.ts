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
 * Solicita permissão ao usuário para enviar notificações
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!isNotificationSupported()) return false;

  try {
    const permission = await Notification.requestPermission();
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
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  const defaultIcon = '/icons/icon-192x192.png';
  const defaultBadge = '/icons/icon-192x192.png';
  const vibratePattern = options?.vibratePattern || options?.vibrate || [200, 100, 200];

  const notificationOptions: any = {
    icon: defaultIcon,
    badge: defaultBadge,
    vibrate: vibratePattern,
    silent: false,
    ...options,
  };

  // Se houver suporte à API de vibração nativa no celular, ativa
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator && vibratePattern.length > 0) {
    try {
      navigator.vibrate(vibratePattern);
    } catch {
      // Ignora erro se vibração falhar
    }
  }

  // 1. Tenta disparar via Service Worker (ideal para PWA no celular / background)
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if (registration && 'showNotification' in registration) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    } catch (e) {
      console.warn('Falha ao enviar via Service Worker, tentando fallback:', e);
    }
  }

  // 2. Fallback para Notification API padrão do navegador
  try {
    const notification = new Notification(title, notificationOptions);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch (e) {
    console.error('Erro ao instanciar Notification:', e);
    return false;
  }
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
