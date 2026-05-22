import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Simulado } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { firebaseSync } from '@/services/firebaseSync';

interface SimuladosState {
  simulados: Simulado[];
  addSimulado: (simulado: Omit<Simulado, 'id'>) => void;
  updateSimulado: (simulado: Simulado) => void;
  removeSimulado: (id: string) => void;
  deleteSimuladosByGoal: (goalId: string) => void;
  getSimuladosBySubject: (subjectId: string) => Simulado[];
}

export const useSimuladosStore = create<SimuladosState>()(
  persist(
    (set, get) => ({
      simulados: [],
      addSimulado: (simulado) =>
        set((state) => {
          const newState = [...state.simulados, { ...simulado, id: uuidv4() }];
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { simulados: newState };
        }),
      updateSimulado: (updatedSimulado) =>
        set((state) => {
          const newState = state.simulados.map((s) =>
            s.id === updatedSimulado.id ? updatedSimulado : s
          );
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { simulados: newState };
        }),
      removeSimulado: (id) =>
        set((state) => {
          const newState = state.simulados.filter((s) => s.id !== id);
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { simulados: newState };
        }),
      deleteSimuladosByGoal: (goalId) =>
        set((state) => {
          const newState = state.simulados.filter((s) => s.goalId !== goalId);
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { simulados: newState };
        }),
      getSimuladosBySubject: (subjectId: string) => {
        return get().simulados.filter(s => s.subjectId === subjectId);
      }
    }),
    {
      name: 'simulados-storage',
    }
  )
); 