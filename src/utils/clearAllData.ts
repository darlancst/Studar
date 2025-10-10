import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useSessionStore } from '@/store/sessionStore';
import { useSettingsStore } from '@/store/settingsStore';

export function clearAllAppData() {
  // Resetar stores para estados vazios/padrão
  try { useSubjectStore.setState({ subjects: [] }); } catch {}
  try { useTopicStore.setState({ topics: [] }); } catch {}
  try { useReviewStore.setState({ reviews: [] }); } catch {}
  try { useSimuladosStore.setState({ simulados: [] }); } catch {}
  try { useSessionStore.setState({ sessions: [] }); } catch {}
  try {
    // Pomodoro: limpar sessões e contadores principais
    usePomodoroStore.setState({ sessions: [], completedPomodoros: 0, isRunning: false, currentTopicId: null, elapsedSeconds: 0, lastMinuteUpdate: 0 });
  } catch {}
  try {
    // Settings: usar funções existentes para resetar estatísticas e pomodoros
    const s = useSettingsStore.getState();
    if (s.resetStats) s.resetStats();
    if (s.resetPomodoros) s.resetPomodoros();
  } catch {}

  // Limpar localStorage completamente para não restar nada (inclui deviceId, lastSync, persistências das stores)
  if (typeof window !== 'undefined') {
    try { localStorage.clear(); } catch {}
  }

  // Notificar UI
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new Event('dataSync'));
  }
}


