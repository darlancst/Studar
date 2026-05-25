import { create } from 'zustand';
import { persist, StorageValue } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { PomodoroSession, PomodoroSettings, PomodoroState } from '@/types';
import { useDatesStore } from './datesStore';
import { firebaseSync } from '@/services/firebaseSync';

interface PomodoroStore {
  // Estado atual
  currentState: PomodoroState;
  isRunning: boolean;
  currentTopicId: string | null;
  activeSubjectId: string | null; // Contexto de navegação
  activeTopicId: string | null;   // Contexto de navegação
  activeScheduleItemId: string | null; // ID do item de cronograma específico (para desambiguação)
  timeRemaining: number; // em segundos
  completedPomodoros: number;
  elapsedSeconds: number; // segundos decorridos na sessão atual
  lastMinuteUpdate: number; // timestamp da última atualização de minuto
  tempSessionIds: string[]; // IDs das sessões temporárias (criadas em pausas) para rollback
  activeSessionId: string | null; // ID da sessão ativamente sendo incrementada no minuto a minuto
  currentCycleSessionIds: string[]; // IDs das sessões geradas no ciclo atual de foco
  zenMode: boolean;

  // Sessões (do Pomodoro, não do estudo geral)
  sessions: PomodoroSession[];

  // Configurações
  settings: PomodoroSettings;

  // Ações
  startTimer: (topicId: string) => void;
  startSession: (subjectId: string, topicId?: string) => void; // Ação centralizada para iniciar sessão
  setActiveScheduleItemId: (id: string | null) => void; // Define o item de cronograma ativo
  pauseTimer: () => void;
  resetTimer: () => void;
  skipToNext: (completed?: boolean) => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  incrementElapsedTime: (seconds: number) => void;
  toggleZenMode: (val?: boolean) => void;
  linkSessionsToTopic: (sessionIds: string[], topicId: string) => void;

  // Sessões Pomodoro
  addSession: (topicId: string, duration: number) => string | null; // Retorna ID da sessão criada
  deleteSession: (sessionId: string) => void;
  updateCurrentSession: (forceUpdate?: boolean) => void; // Atualiza a sessão atual em tempo real
  getSessionsByTopicId: (topicId: string) => PomodoroSession[];
  getTotalStudyTimeByTopicId: (topicId: string) => number; // Tempo total histórico apenas das sessões pomodoro
  getCurrentSessionTime: () => number; // Retorna o tempo da sessão atual em minutos
  completeFocusSession: (topicId: string, durationInSeconds: number) => void;
  interruptFocusSession: (topicId: string, durationInSeconds: number) => void;
}



const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25, // 25 minutos
  shortBreakDuration: 5, // 5 minutos
  longBreakDuration: 15, // 15 minutos
  longBreakInterval: 4, // A cada 4 pomodoros
  soundEnabled: true,
  selectedSound: 'ding',
};

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      currentState: 'idle',
      isRunning: false,
      currentTopicId: null,
      activeSubjectId: null,
      activeTopicId: null,
      activeScheduleItemId: null,
      timeRemaining: DEFAULT_SETTINGS.focusDuration * 60, // em segundos
      completedPomodoros: 0,
      elapsedSeconds: 0,
      lastMinuteUpdate: 0,
      tempSessionIds: [],
      activeSessionId: null,
      currentCycleSessionIds: [],
      zenMode: false,

      sessions: [],
      settings: DEFAULT_SETTINGS,

      setActiveScheduleItemId: (id) => set({ activeScheduleItemId: id }),

      startTimer: (topicId) => {
        const { currentTopicId, currentState, timeRemaining, isRunning } = get();

        // Se já estiver rodando com o mesmo tópico, não faz nada
        if (isRunning && currentTopicId === topicId) return;

        // Se estiver pausado (não rodando), com o mesmo tópico, e ainda tiver tempo
        // Então APENAS retoma (set isRunning = true) sem resetar o tempo
        if (!isRunning && currentTopicId === topicId && timeRemaining > 0 && currentState === 'focus') {
          set({
            isRunning: true,
            lastMinuteUpdate: Date.now(),
          });
          return;
        }

        // Caso contrário (novo tópico, ou tempo acabou, ou não é foco), inicia novo ciclo
        const duration = Math.max(1, get().settings.focusDuration || 25);
        set({
          isRunning: true,
          currentTopicId: topicId,
          currentState: 'focus',
          timeRemaining: duration * 60, // Reseta o tempo
          elapsedSeconds: 0,
          lastMinuteUpdate: Date.now(),
          tempSessionIds: [], // Limpa sessões temporárias ao iniciar novo ciclo
          activeSessionId: null, // Inicia novo ciclo de foco com sessão ativa limpa
        });
      },

      startSession: (subjectId, topicId) => {
        // Define o contexto ativo
        set({
          activeSubjectId: subjectId,
          activeTopicId: topicId || null,
          activeSessionId: null,
          currentCycleSessionIds: [],
        });

        // Se houver um tópico específico, inicia o timer diretamente
        if (topicId) {
          get().startTimer(topicId);
        } else {
          // Se for apenas a matéria, prepara o estado mas não inicia o timer automaticamente
          // O usuário deve selecionar o tópico ou iniciar manualmente se a lógica permitir
          // Mas para manter o fluxo fluido, se já tivermos o ID, iniciamos.
          // Se não tivermos topicId, apenas resetamos o timer para o estado inicial de foco
          const duration = Math.max(1, get().settings.focusDuration || 25);
          set({
            isRunning: false,
            currentTopicId: null, // Limpa o tópico atual pois não temos um específico
            currentState: 'focus',
            timeRemaining: duration * 60,
            elapsedSeconds: 0,
            tempSessionIds: [],
            activeSessionId: null,
            currentCycleSessionIds: [],
          });
        }
      },

      pauseTimer: () => {
        // A gravação ocorre incrementalmente em tempo real minuto a minuto!
        // Não é necessário gerar sessões adicionais ou resetar elapsedSeconds na pausa.
        set({
          isRunning: false,
        });
      },

      resetTimer: () => {
        const { currentState, settings, activeSessionId } = get();

        // REINICIAR: Se o usuário cancelou o foco atual antes de salvar/completar, deleta a sessão ativa do ciclo
        if (currentState === 'focus' && activeSessionId) {
          get().deleteSession(activeSessionId);
        }

        let timeRemaining;

        switch (currentState) {
          case 'focus':
            timeRemaining = Math.max(1, settings.focusDuration || 25) * 60;
            break;
          case 'shortBreak':
            timeRemaining = Math.max(1, settings.shortBreakDuration || 5) * 60;
            break;
          case 'longBreak':
            timeRemaining = Math.max(1, settings.longBreakDuration || 15) * 60;
            break;
          default:
            timeRemaining = Math.max(1, settings.focusDuration || 25) * 60;
        }

        set({
          isRunning: false,
          timeRemaining,
          elapsedSeconds: 0,
          lastMinuteUpdate: 0,
          tempSessionIds: [],
          activeSessionId: null,
          currentCycleSessionIds: [], // Limpa as sessões do ciclo que foi descartado
        });
      },

      skipToNext: (completed = false) => {
        const { currentState, settings, completedPomodoros, currentTopicId, activeSessionId } = get();
        let nextState: PomodoroState = 'focus';
        let timeRemaining: number;
        let newCompletedPomodoros = completedPomodoros;
        let shouldBeRunning = false; // Pausa começa rodando, foco começa parado

        if (currentState === 'focus') {
          // Incrementa se completado naturalmente
          if (completed) {
            newCompletedPomodoros = completedPomodoros + 1;
            
            // Se concluiu mas a sessão ativa de minuto a minuto não havia sido criada (ex: foco de < 1 min)
            if (!activeSessionId && currentTopicId) {
              const focusMinutes = settings.focusDuration;
              if (focusMinutes > 0) {
                get().addSession(currentTopicId, focusMinutes);
              }
            }
          }

          if (newCompletedPomodoros % settings.longBreakInterval === 0) {
            nextState = 'longBreak';
            timeRemaining = Math.max(1, settings.longBreakDuration || 15) * 60;
            shouldBeRunning = true;
          } else {
            nextState = 'shortBreak';
            timeRemaining = Math.max(1, settings.shortBreakDuration || 5) * 60;
            shouldBeRunning = true;
          }
        } else { // Vindo de uma pausa
          nextState = 'focus';
          timeRemaining = Math.max(1, settings.focusDuration || 25) * 60;
          shouldBeRunning = false;
        }

        set({
          currentState: nextState,
          timeRemaining,
          completedPomodoros: newCompletedPomodoros,
          isRunning: shouldBeRunning,
          elapsedSeconds: 0, // Reseta segundos para o novo ciclo/pausa
          lastMinuteUpdate: shouldBeRunning ? Date.now() : 0,
          tempSessionIds: [],
          activeSessionId: null, // Limpa a sessão ativa para o próximo ciclo
        });
      },

      updateSettings: (newSettings) => {
        // Validate settings to prevent 0 or negative values
        if (newSettings.focusDuration !== undefined && newSettings.focusDuration < 1) newSettings.focusDuration = 1;
        if (newSettings.shortBreakDuration !== undefined && newSettings.shortBreakDuration < 1) newSettings.shortBreakDuration = 1;
        if (newSettings.longBreakDuration !== undefined && newSettings.longBreakDuration < 1) newSettings.longBreakDuration = 1;
        if (newSettings.longBreakInterval !== undefined && newSettings.longBreakInterval < 1) newSettings.longBreakInterval = 1;

        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));

        const { currentState } = get();
        if (currentState === 'idle' || !get().isRunning) {
          set({
            timeRemaining: Math.max(1, (newSettings.focusDuration || get().settings.focusDuration || 25)) * 60,
            elapsedSeconds: 0,
          });
        }
      },

      incrementElapsedTime: (seconds) => {
        const { currentState, elapsedSeconds, currentTopicId, activeSessionId, currentCycleSessionIds } = get();

        if (currentState !== 'focus' || !currentTopicId || !get().isRunning) return;

        const newElapsedSeconds = elapsedSeconds + seconds;

        // Compara minutos inteiros acumulados antes e depois
        const oldMinutes = Math.floor(elapsedSeconds / 60);
        const newMinutes = Math.floor(newElapsedSeconds / 60);

        set({ elapsedSeconds: newElapsedSeconds });

        if (newMinutes > oldMinutes) {
          const minutesDiff = newMinutes - oldMinutes;

          if (activeSessionId) {
            // Incrementa os minutos da sessão ativa
            set((state) => ({
              sessions: state.sessions.map((s) =>
                s.id === activeSessionId ? { ...s, duration: s.duration + minutesDiff } : s
              ),
            }));
            
            if (typeof window !== 'undefined') {
              setTimeout(() => firebaseSync.syncToCloud(), 100);
            }
          } else {
            // Cria a sessão inicial do ciclo
            const newSessionId = get().addSession(currentTopicId, newMinutes);
            if (newSessionId) {
              set({
                activeSessionId: newSessionId,
                currentCycleSessionIds: [...currentCycleSessionIds, newSessionId],
              });
            }
          }
        }
      },

      toggleZenMode: (val) => set((state) => ({ zenMode: val !== undefined ? val : !state.zenMode })),

      addSession: (topicId, duration) => {
        if (duration <= 0) return null;

        const newSession: PomodoroSession = {
          id: uuidv4(),
          topicId,
          duration,
          date: new Date().toISOString(),
        };

        set((state) => ({
          sessions: [...state.sessions, newSession],
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }

        useDatesStore.getState().addDate(new Date(newSession.date));
        return newSession.id;
      },

      deleteSession: (sessionId) => {
        set((state) => ({
          sessions: state.sessions.filter(s => s.id !== sessionId)
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },

      updateCurrentSession: (forceUpdate = false) => {
        // Deprecated/Not used in new logic but kept for interface compatibility if needed
      },

      getSessionsByTopicId: (topicId) => {
        return get().sessions.filter((session) => session.topicId === topicId);
      },

      getTotalStudyTimeByTopicId: (topicId) => {
        const sessions = get().getSessionsByTopicId(topicId);
        return sessions.reduce((total, session) => total + session.duration, 0);
      },

      getCurrentSessionTime: () => {
        const { elapsedSeconds, currentState, currentTopicId, isRunning } = get();
        if (currentState !== 'focus' || !currentTopicId || !isRunning) return 0;
        return Math.floor(elapsedSeconds / 60);
      },

      completeFocusSession: (topicId, durationInSeconds) => {
        const durationInMinutes = Math.floor(durationInSeconds / 60);
        if (durationInMinutes > 0) {
          get().addSession(topicId, durationInMinutes);
        }
      },

      interruptFocusSession: (topicId, durationInSeconds) => {
        const durationInMinutes = Math.floor(durationInSeconds / 60);
        if (durationInMinutes > 0) {
          get().addSession(topicId, durationInMinutes);
        }
      },

      linkSessionsToTopic: (sessionIds, topicId) => {
        if (sessionIds.length === 0) return;
        set((state) => ({
          sessions: state.sessions.map((s) =>
            sessionIds.includes(s.id) ? { ...s, topicId } : s
          ),
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
    }),
    {
      name: 'pomodoro-storage',
      storage: {
        getItem: (name: string): StorageValue<PomodoroStore> | null => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Ensure tempSessionIds, activeSessionId, and currentCycleSessionIds exist if loading from old state
          if (!parsed.state.tempSessionIds) {
            parsed.state.tempSessionIds = [];
          }
          if (parsed.state.activeSessionId === undefined) {
            parsed.state.activeSessionId = null;
          }
          if (!parsed.state.currentCycleSessionIds) {
            parsed.state.currentCycleSessionIds = [];
          }
          return parsed;
        },
        setItem: (name: string, value: StorageValue<PomodoroStore>): void => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name: string): void => {
          localStorage.removeItem(name);
        },
      },
    }
  )
); 