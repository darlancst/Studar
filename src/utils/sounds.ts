/**
 * Utility para gerar sons de notificação usando Web Audio API
 * Não requer arquivos de áudio externos
 */

let audioContext: AudioContext | null = null;

/**
 * Inicializa o AudioContext (necessário para alguns navegadores após interação do usuário)
 */
function getAudioContext(): AudioContext {
    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContext;
}

/**
 * Toca um som de notificação agradável (tipo "ding")
 * Usa síntese de áudio, não precisa de arquivos externos
 */
export function playNotificationSound(): void {
    try {
        const ctx = getAudioContext();

        // Criar osciladores para um som mais rico
        const oscillator1 = ctx.createOscillator();
        const oscillator2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        // Configurar frequências (acorde agradável)
        oscillator1.type = 'sine';
        oscillator1.frequency.setValueAtTime(880, ctx.currentTime); // A5

        oscillator2.type = 'sine';
        oscillator2.frequency.setValueAtTime(1320, ctx.currentTime); // E6

        // Configurar envelope de volume (fade in/out suave)
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

        // Conectar nós
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(ctx.destination);

        // Tocar som
        oscillator1.start(ctx.currentTime);
        oscillator2.start(ctx.currentTime);
        oscillator1.stop(ctx.currentTime + 0.8);
        oscillator2.stop(ctx.currentTime + 0.8);

    } catch (error) {
        console.log('Falha ao tocar som de notificação:', error);
    }
}

/**
 * Toca um som de sucesso (tom ascendente)
 */
export function playSuccessSound(): void {
    try {
        const ctx = getAudioContext();
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = 'sine';

        // Tom ascendente
        oscillator.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        oscillator.frequency.linearRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        oscillator.frequency.linearRampToValueAtTime(1046.50, ctx.currentTime + 0.3); // C6

        // Envelope
        gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.3);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);

    } catch (error) {
        console.log('Falha ao tocar som de sucesso:', error);
    }
}
