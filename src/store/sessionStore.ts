import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { firebaseSync } from '@/services/firebaseSync';

export interface PomodoroSession {
  id: string;
  topicId: string;
  duration: number;
  completedAt: Date;
}

interface SessionState {
  sessions: PomodoroSession[];
  addSession: (topicId: string, duration: number) => void;
  getSessions: () => PomodoroSession[];
  getSessionsByTopicId: (topicId: string) => PomodoroSession[];
  getTotalStudyTime: () => number;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      addSession: (topicId, duration) => {
        const newSession: PomodoroSession = {
          id: uuidv4(),
          topicId,
          duration,
          completedAt: new Date(),
        };
        set((state) => {
          const newState = [...state.sessions, newSession];
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { sessions: newState };
        });
      },
      getSessions: () => get().sessions,
      getSessionsByTopicId: (topicId) =>
        get().sessions.filter((session) => session.topicId === topicId),
      getTotalStudyTime: () =>
        get().sessions.reduce((total, session) => total + session.duration, 0),
    }),
    {
      name: 'pomodoroSessions',
      skipHydration: true,
    }
  )
);
