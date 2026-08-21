import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useScheduleStore, CompletedScheduleItem } from '@/store/scheduleStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { useEditalStore } from '@/store/editalStore';
import { useGoalStore } from '@/store/goalStore';
import { supabase } from '@/lib/supabaseClient';

export interface UserData {
  subjects: any[];
  topics: any[];
  reviews: any[];
  pomodoroSessions: any[];
  simulados: any[];
  settings: any;
  editalItems?: any[];
  goals?: any[];
  activeGoalId?: string | null;
  schedules?: any[];
  activeScheduleId?: string | null;
  weeklyItems?: any[];
  blockItems?: any[];
  completedScheduleItems?: CompletedScheduleItem[];
  lastSync: number;
}

export class FirebaseSync {
  private userId: string | null = null;
  private unsubscribes: (() => void)[] = [];

  private getStorageKey(): string | null {
    if (this.userId) return this.userId;
    if (typeof window === 'undefined') return null;
    try {
      let deviceId = localStorage.getItem('deviceId');
      if (!deviceId) {
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
      // Usando Supabase em vez da API Route inexistente
      const { error } = await supabase
        .from('user_data')
        .upsert(
          { id: key, data: userData, updated_at: new Date().toISOString() },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('❌ Erro ao salvar na nuvem:', e);
      return false;
    }
  }

  private async kvLoad(): Promise<UserData | null> {
    const key = this.getStorageKey();
    if (!key) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('id', key)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = 0 rows returned (esperado em novos usuários)
        console.error('Erro ao buscar dados do Supabase:', error);
        return null;
      }

      if (!data) return null;
      
      return (data.data as UserData) || null;
    } catch (e) {
      console.error('❌ Erro ao carregar da nuvem:', e);
      return null;
    }
  }

  // Novo método para verificar apenas se há dados na nuvem (usado na resolução de conflito)
  async checkCloudData(): Promise<boolean> {
    const data = await this.kvLoad();
    return data !== null;
  }

  // Verifica se há dados locais relevantes (ex: criou matérias ou sessoes offline)
  hasLocalData(): boolean {
    const subjects = useSubjectStore.getState().subjects;
    const pomodoros = usePomodoroStore.getState().sessions;
    return subjects.length > 0 || pomodoros.length > 0;
  }

  setUser(user: { id?: string } | null) {
    this.userId = user?.id || null;
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  private canSync(): boolean {
    return typeof window !== 'undefined';
  }

  async syncToCloud() {
    try {
      const subjects = useSubjectStore.getState().subjects;
      const topics = useTopicStore.getState().topics;
      const reviews = useReviewStore.getState().reviews;
      const pomodoroSessions = usePomodoroStore.getState().sessions;
      const simulados = useSimuladosStore.getState().simulados;
      const settingsState = useSettingsStore.getState();
      const settings = {
        darkMode: settingsState.darkMode,
        weeklyGoal: settingsState.weeklyGoal,
        weeklyGoalEndDate: settingsState.weeklyGoalEndDate,
        reviewIntervals: settingsState.reviewIntervals,
        heatmapThresholds: settingsState.heatmapThresholds,
        notificationsEnabled: settingsState.notificationsEnabled,
        notifyPomodoro: settingsState.notifyPomodoro,
        notifyDailyReviews: settingsState.notifyDailyReviews,
        notifyStreak: settingsState.notifyStreak,
      };

      const editalItems = useEditalStore.getState().items;
      const { goals, activeGoalId } = useGoalStore.getState();
      const { schedules, activeScheduleId, weeklyItems, blockItems, completedScheduleItems } = useScheduleStore.getState();

      const userData: UserData = {
        subjects,
        topics,
        reviews,
        pomodoroSessions,
        simulados,
        settings,
        editalItems,
        goals,
        activeGoalId,
        schedules,
        activeScheduleId,
        weeklyItems,
        blockItems,
        completedScheduleItems,
        lastSync: Date.now(),
      };

      const savedOnKv = await this.kvSave(userData);
      if (savedOnKv) {
        console.log('✅ Dados sincronizados com sucesso para a Nuvem');
        try { localStorage.setItem('lastSync', String(userData.lastSync)); } catch { }
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erro ao sincronizar para nuvem:', error);
      return false;
    }
  }

  async syncFromCloud() {
    try {
      const userData: UserData | null = await this.kvLoad();

      if (userData) {
        useSubjectStore.setState({ subjects: userData.subjects || [] });
        useTopicStore.setState({ topics: userData.topics || [] });
        useReviewStore.setState({ reviews: userData.reviews || [] });
        usePomodoroStore.setState({ sessions: userData.pomodoroSessions || [] });
        useSimuladosStore.setState({ simulados: userData.simulados || [] });
        if (Array.isArray(userData.editalItems)) {
          useEditalStore.setState({ items: userData.editalItems });
        }
        if (Array.isArray(userData.goals)) {
          useGoalStore.setState({ 
            goals: userData.goals, 
            activeGoalId: userData.activeGoalId !== undefined ? userData.activeGoalId : null 
          });
        }
        
        // Restaurar Cronogramas
        if (Array.isArray(userData.schedules)) {
          useScheduleStore.setState({ schedules: userData.schedules });
        }
        if (userData.activeScheduleId !== undefined) {
          useScheduleStore.setState({ activeScheduleId: userData.activeScheduleId });
        }
        if (Array.isArray(userData.weeklyItems)) {
          useScheduleStore.setState({ weeklyItems: userData.weeklyItems });
        }
        if (Array.isArray(userData.blockItems)) {
          useScheduleStore.setState({ blockItems: userData.blockItems });
        }
        if (userData.completedScheduleItems) {
          useScheduleStore.setState({ completedScheduleItems: userData.completedScheduleItems });
        }

        if (userData.settings) {
          const s = useSettingsStore.getState();
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
          if (typeof userData.settings.notificationsEnabled === 'boolean') {
            useSettingsStore.setState({ notificationsEnabled: userData.settings.notificationsEnabled });
          }
          if (typeof userData.settings.notifyPomodoro === 'boolean') {
            useSettingsStore.setState({ notifyPomodoro: userData.settings.notifyPomodoro });
          }
          if (typeof userData.settings.notifyDailyReviews === 'boolean') {
            useSettingsStore.setState({ notifyDailyReviews: userData.settings.notifyDailyReviews });
          }
          if (typeof userData.settings.notifyStreak === 'boolean') {
            useSettingsStore.setState({ notifyStreak: userData.settings.notifyStreak });
          }
        }

        try { localStorage.setItem('lastSync', String(userData.lastSync || Date.now())); } catch { }

        console.log('✅ Dados baixados da nuvem e stores reidratadas com sucesso');
        window.dispatchEvent(new CustomEvent('dataSync'));
        return true;
      }
    } catch (error) {
      console.error('❌ Erro ao baixar dados da nuvem:', error);
      return false;
    }
    return false;
  }

  startRealtimeSync() {
    // Sem realtime nativo configurado para poupar requisições
  }

  async initialSync() {
    try {
      // 1. Verificar conflito se o usuário tiver dados locais MAS o initialSync foi chamado (provavelmente login novo)
      const hasCloudData = await this.checkCloudData();
      const hasLocal = this.hasLocalData();

      // Se for apenas inicialização normal com mesmo deviceId, não é conflito. 
      // O conflito ocorre se houver um usuário autenticado e dados locais, MAS o último sync não bate.
      // Uma heurística simples: se o usuário logou agora, a UI pode resolver.
      // Vamos deixar a lógica `initialSync` fluir normalmente. 
      // O conflito será gerenciado pela UI chamando `handleLoginSync`
      
      const cloudSyncSuccess = await this.syncFromCloud();
      if (!cloudSyncSuccess) {
        await this.syncToCloud();
      }
      return true;
    } catch (error) {
      console.error('❌ Erro na sincronização inicial:', error);
      return false;
    }
  }

  async saveData(_key: string, _data: any) {
    if (this.canSync()) {
      try {
        await this.syncToCloud();
        try { localStorage.setItem('lastSync', Date.now().toString()); } catch { }
        window.dispatchEvent(new CustomEvent('dataSync'));
        return;
      } catch (e) {
      }
    }
    try {
      localStorage.setItem('lastSync', Date.now().toString());
    } catch { }
    window.dispatchEvent(new CustomEvent('dataSync'));
  }

  cleanup() {
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
  }

  async checkConnection() {
    if (typeof navigator !== 'undefined') return navigator.onLine;
    return true;
  }
}

export const firebaseSync = new FirebaseSync();
