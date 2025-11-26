// KV-only sync service (Vercel KV via API routes)
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useFlashcardStore } from '@/store/flashcardStore';

// Interface para dados do usuário no Firebase
export interface UserData {
  subjects: any[];
  topics: any[];
  reviews: any[];
  pomodoroSessions: any[];
  simulados: any[];
  decks: any[];
  cards: any[];
  settings: any;
  lastSync: number;
}

export class FirebaseSync {
  private userId: string | null = null;
  private unsubscribes: (() => void)[] = [];

  // Usa o userId quando disponível; caso contrário, um deviceId persistido localmente
  private getStorageKey(): string | null {
    if (this.userId) return this.userId;
    if (typeof window === 'undefined') return null;
    try {
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
        // Gera um id estável para o dispositivo (anônimo)
        deviceId = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
          ? crypto.randomUUID()
          : `dev_${Math.random().toString(36).slice(2)}`;
        localStorage.setItem('deviceId', deviceId);
      }
      return deviceId;
    } catch {
      return null;
    }
  }

  private async kvSave(userData: UserData): Promise<boolean> {
    const key = this.getStorageKey();
    if (!key) return false;
    try {
      const res = await fetch('/api/user-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: key, data: userData }),
      });
      return res.ok;
    } catch (e) {
      console.error('❌ Erro ao salvar no KV:', e);
      return false;
    }
  }

  private async kvLoad(): Promise<UserData | null> {
    const key = this.getStorageKey();
    if (!key) return null;
    try {
      const url = `/api/user-data?userId=${encodeURIComponent(key)}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.data as UserData) || null;
    } catch (e) {
      console.error('❌ Erro ao carregar do KV:', e);
      return null;
    }
  }

  // Configurar userId do usuário autenticado
  setUser(user: { id?: string } | null) {
    this.userId = user?.id || null;
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  // Podemos sincronizar no client (via API route)
  private canSync(): boolean {
    return typeof window !== 'undefined';
  }

  // Sincronizar dados das stores para KV
  async syncToCloud() {
    try {
      // Lê diretamente das stores para evitar problemas com chaves do localStorage
      const subjects = useSubjectStore.getState().subjects;
      const topics = useTopicStore.getState().topics;
      const reviews = useReviewStore.getState().reviews;
      const pomodoroSessions = usePomodoroStore.getState().sessions;
      const simulados = useSimuladosStore.getState().simulados;
      const flashcardStore = useFlashcardStore.getState();
      const settingsState = useSettingsStore.getState();
      const settings = {
        darkMode: settingsState.darkMode,
        weeklyGoal: settingsState.weeklyGoal,
        weeklyGoalEndDate: settingsState.weeklyGoalEndDate,
        reviewIntervals: settingsState.reviewIntervals,
        heatmapThresholds: settingsState.heatmapThresholds,
      };

      const userData: UserData = {
        subjects,
        topics,
        reviews,
        pomodoroSessions,
        simulados,
        decks: flashcardStore.decks,
        cards: flashcardStore.cards,
        settings,
        lastSync: Date.now(),
      };

      // KV persistência
      const savedOnKv = await this.kvSave(userData);
      if (savedOnKv) {
        console.log('✅ Dados sincronizados com sucesso para o KV');
        try { localStorage.setItem('lastSync', String(userData.lastSync)); } catch { }
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao sincronizar para nuvem:', error);
      return false;
    }
  }

  // Sincronizar dados do KV para as stores
  async syncFromCloud() {
    try {
      const userData: UserData | null = await this.kvLoad();

      if (userData) {
        // Atualizar stores com dados da nuvem (isso persiste no localStorage através do middleware)
        useSubjectStore.setState({ subjects: userData.subjects || [] });
        useTopicStore.setState({ topics: userData.topics || [] });
        useReviewStore.setState({ reviews: userData.reviews || [] });
        usePomodoroStore.setState({ sessions: userData.pomodoroSessions || [] });
        useSimuladosStore.setState({ simulados: userData.simulados || [] });
        useFlashcardStore.setState({ decks: userData.decks || [], cards: userData.cards || [] });

        if (userData.settings) {
          const s = useSettingsStore.getState();
          // Aplicar campos conhecidos, mantendo valores atuais se ausentes
          if (typeof userData.settings.darkMode === 'boolean' && userData.settings.darkMode !== s.darkMode) {
            useSettingsStore.setState({ darkMode: userData.settings.darkMode });
          }
          if (typeof userData.settings.weeklyGoal === 'number') {
            useSettingsStore.setState({ weeklyGoal: userData.settings.weeklyGoal });
          }
          if (typeof userData.settings.weeklyGoalEndDate === 'string' || userData.settings.weeklyGoalEndDate === null) {
            useSettingsStore.setState({ weeklyGoalEndDate: userData.settings.weeklyGoalEndDate || null });
          }
          if (Array.isArray(userData.settings.reviewIntervals)) {
            useSettingsStore.setState({ reviewIntervals: userData.settings.reviewIntervals });
          }
          if (userData.settings.heatmapThresholds) {
            useSettingsStore.setState({ heatmapThresholds: userData.settings.heatmapThresholds });
          }
        }

        try { localStorage.setItem('lastSync', String(userData.lastSync || Date.now())); } catch { }

        console.log('✅ Dados baixados da nuvem e stores reidratadas com sucesso');

        // Disparar evento para atualizar UI
        window.dispatchEvent(new CustomEvent('dataSync'));
        return true;
      }
    } catch (error) {
      console.error('❌ Erro ao baixar dados da nuvem:', error);
      return false;
    }
    return false;
  }

  // Configurar sincronização em tempo real
  startRealtimeSync() {
    // KV não possui realtime nativo; sem-op
  }

  // Sincronização inicial ao fazer login
  async initialSync() {
    try {
      // Primeiro, tenta baixar dados do KV
      const cloudSyncSuccess = await this.syncFromCloud();
      if (!cloudSyncSuccess) {
        // Se não há dados na nuvem, envia dados locais
        await this.syncToCloud();
      }
      // Realtime removido no modo KV-only
      return true;
    } catch (error) {
      console.error('❌ Erro na sincronização inicial:', error);
      return false;
    }
  }

  // Função para salvar dados priorizando a nuvem, com fallback local
  async saveData(_key: string, _data: any) {
    // Primeiro tenta sincronizar com a nuvem se possível
    if (this.canSync()) {
      try {
        await this.syncToCloud();
        // Atualiza lastSync local apenas como marca de tempo
        try { localStorage.setItem('lastSync', Date.now().toString()); } catch { }
        window.dispatchEvent(new CustomEvent('dataSync'));
        return;
      } catch (e) {
        // Continua para fallback local
      }
    }

    // Fallback: persiste localmente para manter funcionamento offline
    try {
      localStorage.setItem('lastSync', Date.now().toString());
    } catch { }
    window.dispatchEvent(new CustomEvent('dataSync'));
  }

  // Limpar todos os listeners
  cleanup() {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  // Verificar status de conexão
  async checkConnection() {
    if (typeof navigator !== 'undefined') return navigator.onLine;
    return true;
  }
}

// Instância singleton
export const firebaseSync = new FirebaseSync();
