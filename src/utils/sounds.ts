/**
 * Utility para gerar sons de alarme usando Web Audio API
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
    // Resume se estiver suspenso (política de autoplay do browser)
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    return audioContext;
}

/**
 * Opções de alarme disponíveis
 */
export const ALARM_OPTIONS = [
    { value: 'digital', label: 'Digital', emoji: '⏰' },
    { value: 'marimba', label: 'Marimba', emoji: '🎵' },
    { value: 'suave', label: 'Suave', emoji: '✨' },
] as const;

export type AlarmSoundType = typeof ALARM_OPTIONS[number]['value'];

/**
 * Ding — tom duplo agradável (padrão)
 */
function playDing(): void {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, ctx.currentTime); // E6

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
}

/**
 * Sino — batida grave tipo sino de igreja, repetida 3x
 */
function playSino(): void {
    const ctx = getAudioContext();

    for (let i = 0; i < 3; i++) {
        const offset = i * 0.5;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime + offset); // A4
        osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + offset + 0.4);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.5);
    }
}

/**
 * Digital — bip-bip-bip clássico de alarme digital
 */
function playDigital(): void {
    const ctx = getAudioContext();

    for (let i = 0; i < 4; i++) {
        const offset = i * 0.2;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, ctx.currentTime + offset);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + offset + 0.01);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + offset + 0.1);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.15);
    }
}

/**
 * Marimba — notas ascendentes tipo xilofone
 */
function playMarimba(): void {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
        const offset = i * 0.15;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + offset + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.4);
    });
}

/**
 * Suave — acorde gentil e longo
 */
function playSuave(): void {
    const ctx = getAudioContext();
    const freqs = [392, 493.88, 587.33]; // G4, B4, D5

    freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.5);
    });
}

/**
 * Toca o som de alarme selecionado
 */
export function playAlarmSound(type: string = 'digital'): void {
    try {
        switch (type) {
            case 'sino': playSino(); break;
            case 'marimba': playMarimba(); break;
            case 'suave': playSuave(); break;
            case 'digital':
            default: playDigital(); break;
        }
    } catch (error) {
        console.log('Falha ao tocar som de alarme:', error);
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
