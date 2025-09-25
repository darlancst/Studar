import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Simulado } from '@/types';
import { v4 as uuidv4 } from 'uuid';

interface SimuladosState {
  simulados: Simulado[];
  addSimulado: (simulado: Omit<Simulado, 'id'>) => void;
  updateSimulado: (simulado: Simulado) => void;
  removeSimulado: (id: string) => void;
  getSimuladosBySubject: (subjectId: string) => Simulado[];
}

export const useSimuladosStore = create<SimuladosState>()(
  persist(
    (set, get) => ({
      simulados: [],
      addSimulado: (simulado) =>
        set((state) => ({
          simulados: [...state.simulados, { ...simulado, id: uuidv4() }],
        })),
      updateSimulado: (updatedSimulado) =>
        set((state) => ({
          simulados: state.simulados.map((s) =>
            s.id === updatedSimulado.id ? updatedSimulado : s
          ),
        })),
      removeSimulado: (id) =>
        set((state) => ({
          simulados: state.simulados.filter((s) => s.id !== id),
        })),
      getSimuladosBySubject: (subjectId: string) => {
        return get().simulados.filter(s => s.subjectId === subjectId);
      }
    }),
    {
      name: 'simulados-storage',
    }
  )
); 