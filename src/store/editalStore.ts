'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EditalItem } from '@/types';

interface EditalStore {
  items: EditalItem[];
  addItems: (newItems: Omit<EditalItem, 'id'>[]) => void;
  toggleItem: (id: string) => void;
  deleteItemsBySubject: (subjectId: string) => void;
  resetEdital: () => void;
}

export const useEditalStore = create<EditalStore>()(
  persist(
    (set) => ({
      items: [],

      addItems: (newItems) => {
        set((state) => {
          const itemsWithIds: EditalItem[] = newItems.map((item) => ({
            ...item,
            id: `edital_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          }));
          return { items: [...state.items, ...itemsWithIds] };
        });
      },

      toggleItem: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, completed: !item.completed } : item
          ),
        }));
      },

      deleteItemsBySubject: (subjectId) => {
        set((state) => ({
          items: state.items.filter((item) => item.subjectId !== subjectId),
        }));
      },

      resetEdital: () => set({ items: [] }),
    }),
    { name: 'edital-storage' }
  )
);
