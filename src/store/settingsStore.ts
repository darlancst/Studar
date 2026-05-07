import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { usePomodoroStore } from './pomodoroStore';
import { useDatesStore } from './datesStore';
import { addDays, formatISO } from 'date-fns'; // Importar funções de data
import { useSubjectStore } from './subjectStore';
import { useTopicStore } from './topicStore';
import { useReviewStore } from './reviewStore';
import { firebaseSync } from '@/services/firebaseSync';

// Interface para os limiares de tempo do heatmap
export interface HeatmapThresholds {
  level1: number; // 0-level1 minutos (cor mais clara)
  level2: number; // level1-level2 minutos
  level3: number; // level2-level3 minutos
  level4: number; // level3-level4 minutos
  level5: number; // level4-level5 minutos
  // >level5 é a cor mais escura
}

interface SettingsState {
  // Tema
  darkMode: boolean;
  toggleDarkMode: () => void;
  
  // Meta semanal de estudo (em minutos)
  weeklyGoal: number;
  weeklyGoalEndDate: string | null; // NOVA: Data final da meta (ISO string)
  setWeeklyGoal: (minutes: number) => void;
  
  // Intervalos de revisão (em dias)
  reviewIntervals: number[];
  setReviewIntervals: (intervals: number[]) => void;
  
  // Limiares de tempo para as cores do heatmap (em minutos)
  heatmapThresholds: HeatmapThresholds;
  setHeatmapThresholds: (thresholds: HeatmapThresholds) => void;
  
  // Som de notificação
  soundEnabled: boolean;
  toggleSoundEnabled: () => void;
  
  // Funções de Reset
  resetStats: () => void;
  resetPomodoros: () => void; 
  resetAllData: () => void;
}

// Limiares padrão para as cores do heatmap
const DEFAULT_HEATMAP_THRESHOLDS: HeatmapThresholds = {
  level1: 30,  // 0-30 minutos (azul mais claro)
  level2: 60,  // 30-60 minutos
  level3: 120, // 1-2 horas
  level4: 180, // 2-3 horas
  level5: 240, // 3-4 horas
  // >240 minutos (4+ horas) é a cor mais escura
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      darkMode: false,
      weeklyGoal: 600, // 10 horas por semana (padrão)
      weeklyGoalEndDate: null, // Inicializa como null
      reviewIntervals: [1, 7, 30], // Intervalos padrão (1, 7 e 30 dias)
      heatmapThresholds: DEFAULT_HEATMAP_THRESHOLDS, // Limiares padrão
      soundEnabled: true, // Som habilitado por padrão
      
      // Alterna entre tema claro e escuro
      toggleDarkMode: () => {
        const newDarkMode = !get().darkMode;
        
        // Aplica a classe na tag <html> para habilitar/desabilitar o dark mode
        if (newDarkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        set({ darkMode: newDarkMode });
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      
      // Define a meta semanal de estudo E a data final
      setWeeklyGoal: (minutes: number) => {
        const newEndDate = addDays(new Date(), 7); // Calcula data daqui a 7 dias
        const newEndDateISO = formatISO(newEndDate); // Formata como string ISO
        set({ 
          weeklyGoal: minutes, 
          weeklyGoalEndDate: newEndDateISO // Salva a nova data final
        });
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      
      // Define os intervalos de revisão personalizados
      setReviewIntervals: (intervals: number[]) => {
        // Garante que os intervalos estão em ordem crescente
        const sortedIntervals = [...intervals].sort((a, b) => a - b);
        set({ reviewIntervals: sortedIntervals });
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      
      // Define os limiares de tempo para as cores do heatmap
      setHeatmapThresholds: (thresholds: HeatmapThresholds) => {
        set({ heatmapThresholds: thresholds });
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      
      // Alterna som de notificação
      toggleSoundEnabled: () => {
        set({ soundEnabled: !get().soundEnabled });
      },
      
      // Reset das estatísticas
      resetStats: () => {
        // Limpa datas de estudo
        const datesStore = useDatesStore.getState();
        if (datesStore && typeof datesStore.resetDates === 'function') {
          datesStore.resetDates();
        }
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      
      // Reset dos pomodoros completados e sessões
      resetPomodoros: () => {
        usePomodoroStore.setState({
          completedPomodoros: 0,
          sessions: [], // Limpa sessões aqui
        });
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      
      // Reset de todos os dados
      resetAllData: () => {
        const { resetStats, resetPomodoros } = get();
        resetStats();     // Limpa datas
        resetPomodoros(); // Limpa contador e sessões do pomodoro

        // Limpa Matérias
        const subjectStore = useSubjectStore.getState();
        if (subjectStore && typeof subjectStore.resetSubjects === 'function') {
          subjectStore.resetSubjects();
        }

        // Limpa Tópicos
        const topicStore = useTopicStore.getState();
        if (topicStore && typeof topicStore.resetTopics === 'function') {
          topicStore.resetTopics();
        }

        // Limpa Revisões
        const reviewStore = useReviewStore.getState();
        if (reviewStore && typeof reviewStore.resetReviews === 'function') {
          reviewStore.resetReviews();
        }

        console.log("Todos os dados resetados (incluindo matérias, tópicos, revisões, sessões e datas).");
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
    }),
    {
      name: 'settings-storage',
    }
  )
);

// Inicializa o tema quando o app carrega
if (typeof window !== 'undefined') {
  // Se estiver no browser, aplica o tema salvo
  const isDark = JSON.parse(localStorage.getItem('settings-storage') || '{"state":{"darkMode":false}}').state.darkMode;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
} 