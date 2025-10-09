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
  timeRemaining: number; // em segundos
  completedPomodoros: number;
  elapsedSeconds: number; // segundos decorridos na sessão atual
  lastMinuteUpdate: number; // timestamp da última atualização de minuto
  
  // Sessões (do Pomodoro, não do estudo geral)
  sessions: PomodoroSession[];
  
  // Configurações
  settings: PomodoroSettings;
  
  // Ações
  startTimer: (topicId: string) => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipToNext: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  incrementElapsedTime: (seconds: number) => void;
  
  // Sessões Pomodoro
  addSession: (topicId: string, duration: number) => void;
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
};

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set, get) => ({
      // Estado inicial
      currentState: 'idle',
      isRunning: false,
      currentTopicId: null,
      timeRemaining: DEFAULT_SETTINGS.focusDuration * 60, // em segundos
      completedPomodoros: 0,
      elapsedSeconds: 0,
      lastMinuteUpdate: 0,
      
      sessions: [],
      settings: DEFAULT_SETTINGS,
      
      startTimer: (topicId) => {
        // startTimer agora SEMPRE inicia um novo ciclo de foco
        set({
          isRunning: true,
          currentTopicId: topicId,
          currentState: 'focus',
          timeRemaining: get().settings.focusDuration * 60, // Garante que o tempo é resetado
          elapsedSeconds: 0, // Sempre reseta ao iniciar novo ciclo
          lastMinuteUpdate: Date.now(), 
        });
      },
      
      pauseTimer: () => {
        // SE ESTAVA EM FOCO, ADICIONA O TEMPO DECORRIDO COMO NOVA SESSÃO
        if (get().currentState === 'focus' && get().currentTopicId && get().elapsedSeconds > 0) {
          // get().updateCurrentSession(true); // REMOVIDO
          const elapsedMinutes = Math.floor(get().elapsedSeconds / 60);
          if (elapsedMinutes > 0) {
            get().addSession(get().currentTopicId!, elapsedMinutes);
          }
          // Resetar elapsedSeconds após salvar, pois a pausa interrompe o ciclo atual
          set({ elapsedSeconds: 0, lastMinuteUpdate: 0 }); 
        }
        set({
          isRunning: false,
        });
      },
      
      resetTimer: () => {
        const { currentState, settings } = get();
        let timeRemaining;
        
        switch (currentState) {
          case 'focus':
            timeRemaining = settings.focusDuration * 60;
            break;
          case 'shortBreak':
            timeRemaining = settings.shortBreakDuration * 60;
            break;
          case 'longBreak':
            timeRemaining = settings.longBreakDuration * 60;
            break;
          default:
            timeRemaining = settings.focusDuration * 60;
        }
        
        if (currentState === 'focus') {
          get().updateCurrentSession(true); // Força atualização ao resetar
        }
        
        set({
          isRunning: false,
          timeRemaining,
          elapsedSeconds: 0,
          lastMinuteUpdate: 0,
        });
      },
      
      skipToNext: () => {
        const { currentState, settings, completedPomodoros, currentTopicId, elapsedSeconds } = get();
        let nextState: PomodoroState = 'focus';
        let timeRemaining: number;
        let newCompletedPomodoros = completedPomodoros;
        let shouldBeRunning = false; // Pausa começa rodando, foco começa parado
        
        if (currentState === 'focus') {
          newCompletedPomodoros = completedPomodoros + 1;
          
          // AO FINAL DE UM FOCO, ADICIONA UMA NOVA SESSÃO COM A DURAÇÃO COMPLETA
          if (currentTopicId) {
            // get().updateCurrentSession(true); // REMOVIDO
            const focusMinutes = settings.focusDuration;
            if (focusMinutes > 0) {
              get().addSession(currentTopicId, focusMinutes);
            }
          }
          
          if (newCompletedPomodoros % settings.longBreakInterval === 0) {
            nextState = 'longBreak';
            timeRemaining = settings.longBreakDuration * 60;
            shouldBeRunning = true; // Iniciar timer da pausa longa automaticamente
          } else {
            nextState = 'shortBreak';
            timeRemaining = settings.shortBreakDuration * 60;
            shouldBeRunning = true; // Iniciar timer da pausa curta automaticamente
          }
        } else { // Vindo de uma pausa
          nextState = 'focus';
          timeRemaining = settings.focusDuration * 60;
          shouldBeRunning = false; // Foco começa parado, esperando o usuário iniciar
        }
        
        set({
          currentState: nextState,
          timeRemaining,
          completedPomodoros: newCompletedPomodoros,
          isRunning: shouldBeRunning,
          elapsedSeconds: 0, // Reseta segundos para o novo ciclo/pausa
          lastMinuteUpdate: shouldBeRunning ? Date.now() : 0,
        });
      },
      
      updateSettings: (newSettings) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...newSettings,
          },
        }));
        
        const { currentState } = get();
        if (currentState === 'idle' || !get().isRunning) {
          set({
            timeRemaining: get().settings.focusDuration * 60,
            elapsedSeconds: 0,
          });
        }
      },
      
      incrementElapsedTime: (seconds) => {
        const { currentState, elapsedSeconds, currentTopicId } = get();
        
        if (currentState !== 'focus' || !currentTopicId || !get().isRunning) return;
        
        const newElapsedSeconds = elapsedSeconds + seconds;
        const now = Date.now();
        
        set({ elapsedSeconds: newElapsedSeconds });
      },
      
      addSession: (topicId, duration) => {
        if (duration <= 0) return; 
        
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
      },
      
      updateCurrentSession: (forceUpdate = false) => {
        const { currentTopicId, elapsedSeconds, sessions } = get();
        const currentMinutes = Math.floor(elapsedSeconds / 60);

        if (!currentTopicId) return; // Sai se não houver tópico selecionado

        const todayStr = new Date().toISOString().split('T')[0]; 
        const todaySessionIndex = sessions.findIndex(s => 
          s.topicId === currentTopicId && 
          s.date.startsWith(todayStr)
        );

        if (todaySessionIndex > -1) {
          // Sessão já existe para hoje e este tópico
          const currentSavedDuration = sessions[todaySessionIndex].duration;

          // Calcula a duração que deve ser salva (garante não diminuir)
          const durationToSet = Math.max(currentSavedDuration, currentMinutes);

          // Condições para atualizar:
          // 1. Se forçado (forceUpdate=true), E houver tempo decorrido (elapsedSeconds > 0), E a duração calculada for diferente da salva.
          // OU
          // 2. Se NÃO forçado (tick normal), E os minutos atuais forem maiores que os salvos.
          const shouldUpdate =
            (forceUpdate && elapsedSeconds > 0 && durationToSet !== currentSavedDuration) ||
            (!forceUpdate && currentMinutes > currentSavedDuration);

          if (shouldUpdate) {
            const updatedSessions = [...sessions];
            updatedSessions[todaySessionIndex] = { 
              ...sessions[todaySessionIndex], 
              duration: durationToSet // Usa a duração calculada
            };
            set({ sessions: updatedSessions });
            if (typeof window !== 'undefined') {
              setTimeout(() => firebaseSync.syncToCloud(), 100);
            }
          }
        } else {
          // Nenhuma sessão existe para hoje e este tópico. Adiciona se currentMinutes > 0.
          if (currentMinutes > 0) {
            get().addSession(currentTopicId, currentMinutes);
          }
        }
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
    }),
    {
      name: 'pomodoro-storage',
      storage: {
        getItem: (name: string): StorageValue<PomodoroStore> | null => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          const parsed = JSON.parse(str);
          // Não faremos migração aqui, apenas retornamos o estado como está.
          // A conversão Date -> string deve ser feita na lógica do store se necessário.
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