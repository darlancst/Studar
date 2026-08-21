/**
 * Utility para gerar sons de alarme usando Web Audio API
 * Não requer arquivos de áudio externos - 100% offline e imediato
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
    { value: 'sino', label: 'Sino Zen', emoji: '🔔' },
    { value: 'gongo', label: 'Gongo', emoji: '🧘' },
    { value: 'vitoria', label: 'Vitória', emoji: '🎺' },
    { value: 'radar', label: 'Radar', emoji: '🛸' },
    { value: 'chime', label: 'Cristal', emoji: '💧' },
    { value: 'campainha', label: 'Campainha', emoji: '🛎️' },
] as const;

export type AlarmSoundType = typeof ALARM_OPTIONS[number]['value'];

/**
 * Ding — tom duplo cristalino
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
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.8);
    osc2.stop(ctx.currentTime + 0.8);
}

/**
 * Sino Zen — batida ressonante com harmônicos tipo tigela tibetana
 */
function playSino(): void {
    const ctx = getAudioContext();

    for (let i = 0; i < 3; i++) {
        const offset = i * 0.45;
        const osc = ctx.createOscillator();
        const oscHarmonic = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(528, ctx.currentTime + offset); // 528Hz
        osc.frequency.exponentialRampToValueAtTime(396, ctx.currentTime + offset + 0.6);

        oscHarmonic.type = 'sine';
        oscHarmonic.frequency.setValueAtTime(1056, ctx.currentTime + offset);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.7);

        osc.connect(gain);
        oscHarmonic.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + offset);
        oscHarmonic.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.7);
        oscHarmonic.stop(ctx.currentTime + offset + 0.7);
    }
}

/**
 * Digital — bip-bip-bip clássico de alarme digital
 */
function playDigital(): void {
    const ctx = getAudioContext();

    for (let i = 0; i < 4; i++) {
        const offset = i * 0.18;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(1000, ctx.currentTime + offset);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + offset + 0.01);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + offset + 0.09);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + offset + 0.11);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.13);
    }
}

/**
 * Marimba — notas ascendentes alegres tipo xilofone
 */
function playMarimba(): void {
    const ctx = getAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, i) => {
        const offset = i * 0.13;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.45);
    });
}

/**
 * Suave — acorde harmônico gentil e relaxante
 */
function playSuave(): void {
    const ctx = getAudioContext();
    const freqs = [392, 493.88, 587.33, 783.99]; // G4, B4, D5, G5

    freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 1.6);
    });
}

/**
 * Gongo — batida grave e ressonância profunda de meditação
 */
function playGongo(): void {
    const ctx = getAudioContext();
    const freqs = [130.81, 164.81, 196.00]; // C3, E3, G3 (tríade grave)

    freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.95, ctx.currentTime + 2.0);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2.2);
    });
}

/**
 * Vitória / Fanfarra — sequência triunfante e energética
 */
function playVitoria(): void {
    const ctx = getAudioContext();
    const melody = [
        { freq: 523.25, duration: 0.12 }, // C5
        { freq: 659.25, duration: 0.12 }, // E5
        { freq: 783.99, duration: 0.12 }, // G5
        { freq: 1046.50, duration: 0.35 }, // C6
    ];

    let currentOffset = 0;
    melody.forEach((note) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.freq, ctx.currentTime + currentOffset);

        gain.gain.setValueAtTime(0, ctx.currentTime + currentOffset);
        gain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + currentOffset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + currentOffset + note.duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + currentOffset);
        osc.stop(ctx.currentTime + currentOffset + note.duration);

        currentOffset += note.duration * 0.9;
    });
}

/**
 * Radar / Sci-Fi — pulsos agudos estilo scanner futurista
 */
function playRadar(): void {
    const ctx = getAudioContext();

    for (let i = 0; i < 3; i++) {
        const offset = i * 0.22;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(1400, ctx.currentTime + offset);
        osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + offset + 0.14);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.22, ctx.currentTime + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.16);
    }
}

/**
 * Gotas de Cristal / Chime — arpeggio brilhante e límpido
 */
function playChime(): void {
    const ctx = getAudioContext();
    const freqs = [1046.50, 1318.51, 1567.98, 2093.00]; // C6, E6, G6, C7

    freqs.forEach((freq, i) => {
        const offset = i * 0.1;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);

        gain.gain.setValueAtTime(0, ctx.currentTime + offset);
        gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.55);
    });
}

/**
 * Campainha — toque duplo elegante (ding-dong)
 */
function playCampainha(): void {
    const ctx = getAudioContext();
    
    // Ding (Alto)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1174.66, ctx.currentTime); // D6
    gain1.gain.setValueAtTime(0, ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);

    // Dong (Mais baixo)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.25); // A5
    gain2.gain.setValueAtTime(0, ctx.currentTime + 0.25);
    gain2.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.27);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.25);
    osc2.stop(ctx.currentTime + 0.85);
}

/**
 * Toca o som de alarme selecionado
 */
export function playAlarmSound(type: string = 'digital'): void {
    try {
        switch (type) {
            case 'ding': playDing(); break;
            case 'sino': playSino(); break;
            case 'marimba': playMarimba(); break;
            case 'suave': playSuave(); break;
            case 'gongo': playGongo(); break;
            case 'vitoria': playVitoria(); break;
            case 'radar': playRadar(); break;
            case 'chime': playChime(); break;
            case 'campainha': playCampainha(); break;
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
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + 0.5);

    } catch (error) {
        console.log('Falha ao tocar som de sucesso:', error);
    }
}
