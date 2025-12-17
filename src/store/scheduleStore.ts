import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { firebaseSync } from '@/services/firebaseSync';

export type ScheduleMode = 'weekly' | 'block';

export interface Schedule {
    id: string;
    name: string;
    startDate: string; // ISO Date string
    endDate: string; // ISO Date string
    isActive: boolean;
    mode: ScheduleMode;
}

export interface WeeklyScheduleItem {
    id: string;
    scheduleId: string;
    subjectId: string;
    dayOfWeek: number; // 0-6 (Sunday-Saturday)
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
    topicId?: string; // Tópico específico (opcional)
}

export interface BlockScheduleItem {
    id: string;
    scheduleId: string;
    subjectId: string;
    startDate: string; // ISO Date string
    endDate: string; // ISO Date string
    description?: string;
    restDays: number[]; // 0-6 (Sunday-Saturday) - Dias de descanso dentro do bloco
    topicIds?: string[]; // Array de tópicos (opcional para compatibilidade)
}

interface ScheduleState {
    schedules: Schedule[];
    activeScheduleId: string | null;
    weeklyItems: WeeklyScheduleItem[];
    blockItems: BlockScheduleItem[];

    // Schedule Actions
    addSchedule: (name: string, startDate: string, endDate: string, mode: ScheduleMode) => void;
    updateSchedule: (id: string, data: Partial<Schedule>) => void;
    deleteSchedule: (id: string) => void;
    setActiveSchedule: (id: string | null) => void;

    // Weekly Item Actions
    addWeeklyItem: (item: Omit<WeeklyScheduleItem, 'id'>) => void;
    removeWeeklyItem: (id: string) => void;
    updateWeeklyItem: (id: string, item: Partial<WeeklyScheduleItem>) => void;

    // Block Item Actions
    addBlockItem: (item: Omit<BlockScheduleItem, 'id'>) => void;
    removeBlockItem: (id: string) => void;
    updateBlockItem: (id: string, item: Partial<BlockScheduleItem>) => void;

    // Completed Items Tracking
    completedScheduleItems: string[]; // IDs of completed schedule items (weekly or block)
    toggleScheduleItemCompletion: (itemId: string) => void;

    resetSchedule: () => void;
}

const storage = typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useScheduleStore = create<ScheduleState>()(
    persist(
        (set, get) => ({
            schedules: [],
            activeScheduleId: null,
            weeklyItems: [],
            blockItems: [],

            addSchedule: (name, startDate, endDate, mode) => {
                const newSchedule: Schedule = {
                    id: uuidv4(),
                    name,
                    startDate,
                    endDate,
                    isActive: true,
                    mode
                };
                set((state) => ({
                    schedules: [...state.schedules, newSchedule],
                    activeScheduleId: newSchedule.id // Auto-select new schedule
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            updateSchedule: (id, data) => {
                set((state) => ({
                    schedules: state.schedules.map((s) =>
                        s.id === id ? { ...s, ...data } : s
                    )
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            deleteSchedule: (id) => {
                set((state) => ({
                    schedules: state.schedules.filter((s) => s.id !== id),
                    weeklyItems: state.weeklyItems.filter((i) => i.scheduleId !== id),
                    blockItems: state.blockItems.filter((i) => i.scheduleId !== id),
                    activeScheduleId: state.activeScheduleId === id ? null : state.activeScheduleId
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            setActiveSchedule: (id) => {
                set({ activeScheduleId: id });
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            addWeeklyItem: (item) => {
                set((state) => ({
                    weeklyItems: [...state.weeklyItems, { ...item, id: uuidv4() }]
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            removeWeeklyItem: (id) => {
                set((state) => ({
                    weeklyItems: state.weeklyItems.filter((i) => i.id !== id)
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            updateWeeklyItem: (id, item) => {
                set((state) => ({
                    weeklyItems: state.weeklyItems.map((i) =>
                        i.id === id ? { ...i, ...item } : i
                    )
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            addBlockItem: (item) => {
                set((state) => ({
                    blockItems: [...state.blockItems, { ...item, id: uuidv4() }]
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            removeBlockItem: (id) => {
                set((state) => ({
                    blockItems: state.blockItems.filter((i) => i.id !== id)
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            updateBlockItem: (id, item) => {
                set((state) => ({
                    blockItems: state.blockItems.map((i) =>
                        i.id === id ? { ...i, ...item } : i
                    )
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            completedScheduleItems: [],

            toggleScheduleItemCompletion: (itemId) => {
                set((state) => {
                    const isCompleted = state.completedScheduleItems.includes(itemId);
                    return {
                        completedScheduleItems: isCompleted
                            ? state.completedScheduleItems.filter(id => id !== itemId)
                            : [...state.completedScheduleItems, itemId]
                    };
                });
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            resetSchedule: () => {
                set({
                    schedules: [],
                    activeScheduleId: null,
                    weeklyItems: [],
                    blockItems: [],
                    completedScheduleItems: []
                });
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            }
        }),
        {
            name: 'schedule-storage',
            storage: storage,
        }
    )
);
