import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { firebaseSync } from '@/services/firebaseSync';

export interface Goal {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
}

interface GoalState {
  goals: Goal[];
  activeGoalId: string | null;
  addGoal: (name: string, color: string) => Goal | null;
  updateGoal: (id: string, data: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  setActiveGoal: (id: string | null) => void;
  getGoalById: (id: string) => Goal | undefined;
}

const storage = typeof window !== 'undefined'
  ? createJSONStorage(() => localStorage)
  : undefined;

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: [],
      activeGoalId: null,

      addGoal: (name, color) => {
        const state = get();
        if (state.goals.length >= 3) return null; // Limit of 3 goals

        const newGoal: Goal = {
          id: uuidv4(),
          name,
          color,
          createdAt: new Date(),
        };

        set((state) => {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
          return { 
            goals: [...state.goals, newGoal],
            // Auto-select if it's the first goal
            activeGoalId: state.goals.length === 0 ? newGoal.id : state.activeGoalId
          };
        });
        return newGoal;
      },

      updateGoal: (id, data) => {
        set((state) => {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
          return {
            goals: state.goals.map((goal) =>
              goal.id === id ? { ...goal, ...data } : goal
            ),
          };
        });
      },

      deleteGoal: (id) => {
        set((state) => {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
          const newGoals = state.goals.filter((goal) => goal.id !== id);
          return {
            goals: newGoals,
            activeGoalId: state.activeGoalId === id 
              ? (newGoals.length > 0 ? newGoals[0].id : null) 
              : state.activeGoalId
          };
        });
      },

      setActiveGoal: (id) => {
        set({ activeGoalId: id });
        setTimeout(() => firebaseSync.syncToCloud(), 100);
      },

      getGoalById: (id) => {
        return get().goals.find((goal) => goal.id === id);
      },
    }),
    {
      name: 'goals-storage',
      storage,
    }
  )
);
