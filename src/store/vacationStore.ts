import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { addDays, parseISO, format, isAfter, startOfDay } from 'date-fns';
import { useReviewStore } from './reviewStore';
import { useScheduleStore } from './scheduleStore';
import { useSimuladosStore } from './simuladosStore';
import { firebaseSync } from '@/services/firebaseSync';

export interface VacationPeriod {
    id: string;
    startDate: string; // ISO date
    endDate: string;   // ISO date
    days: number;      // Número de dias de férias
    createdAt: string; // ISO datetime
}

interface VacationState {
    vacationPeriods: VacationPeriod[];

    // Adiciona um período de férias e aplica o shift
    addVacation: (startDate: string, endDate: string) => void;

    // Aplica o shift de datas em todos os stores relevantes
    applyVacationShift: (days: number, startFrom: Date) => void;

    // Remove um período do histórico (não desfaz o shift)
    removeVacationPeriod: (id: string) => void;

    // Limpa o histórico
    resetVacations: () => void;
}

const storage = typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useVacationStore = create<VacationState>()(
    persist(
        (set, get) => ({
            vacationPeriods: [],

            addVacation: (startDate, endDate) => {
                const start = parseISO(startDate);
                const end = parseISO(endDate);

                // Calcula número de dias (inclusive)
                const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                if (days <= 0) return;

                // Cria o registro de férias
                const newVacation: VacationPeriod = {
                    id: uuidv4(),
                    startDate,
                    endDate,
                    days,
                    createdAt: new Date().toISOString(),
                };

                // Salva no histórico
                set((state) => ({
                    vacationPeriods: [...state.vacationPeriods, newVacation],
                }));

                // Aplica o shift
                get().applyVacationShift(days, start);

                // Sync
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            applyVacationShift: (days, startFrom) => {
                const startOfDayFrom = startOfDay(startFrom);

                // 1. SHIFT REVISÕES (não concluídas, com data >= startFrom)
                const reviewStore = useReviewStore.getState();
                const updatedReviews = reviewStore.reviews.map(review => {
                    if (review.completed) return review;

                    const reviewDate = typeof review.scheduledDate === 'string'
                        ? parseISO(review.scheduledDate)
                        : new Date(review.scheduledDate);

                    if (isAfter(reviewDate, startOfDayFrom) || reviewDate.getTime() === startOfDayFrom.getTime()) {
                        const newScheduled = addDays(reviewDate, days);
                        return {
                            ...review,
                            scheduledDate: newScheduled,
                            date: newScheduled,
                        };
                    }
                    return review;
                });

                useReviewStore.setState({ reviews: updatedReviews });

                // 2. SHIFT BLOCOS DE ESTUDO (com endDate >= startFrom)
                const scheduleStore = useScheduleStore.getState();

                const updatedBlockItems = scheduleStore.blockItems.map(block => {
                    const blockEnd = parseISO(block.endDate);

                    if (isAfter(blockEnd, startOfDayFrom) || blockEnd.getTime() === startOfDayFrom.getTime()) {
                        return {
                            ...block,
                            startDate: format(addDays(parseISO(block.startDate), days), 'yyyy-MM-dd'),
                            endDate: format(addDays(blockEnd, days), 'yyyy-MM-dd'),
                        };
                    }
                    return block;
                });

                // 3. SHIFT CRONOGRAMAS (estende endDate para compensar dias perdidos)
                const updatedSchedules = scheduleStore.schedules.map(schedule => {
                    const scheduleEnd = parseISO(schedule.endDate);

                    if (isAfter(scheduleEnd, startOfDayFrom) || scheduleEnd.getTime() === startOfDayFrom.getTime()) {
                        return {
                            ...schedule,
                            endDate: format(addDays(scheduleEnd, days), 'yyyy-MM-dd'),
                        };
                    }
                    return schedule;
                });

                useScheduleStore.setState({
                    blockItems: updatedBlockItems,
                    schedules: updatedSchedules,
                });

                // 4. SHIFT SIMULADOS (com date >= startFrom)
                const simuladosStore = useSimuladosStore.getState();
                const updatedSimulados = simuladosStore.simulados.map(simulado => {
                    const simuladoDate = parseISO(simulado.date);

                    if (isAfter(simuladoDate, startOfDayFrom) || simuladoDate.getTime() === startOfDayFrom.getTime()) {
                        return {
                            ...simulado,
                            date: format(addDays(simuladoDate, days), 'yyyy-MM-dd'),
                        };
                    }
                    return simulado;
                });

                useSimuladosStore.setState({ simulados: updatedSimulados });

                // Sync all
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 200);
                }
            },

            removeVacationPeriod: (id) => {
                set((state) => ({
                    vacationPeriods: state.vacationPeriods.filter(v => v.id !== id),
                }));
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },

            resetVacations: () => {
                set({ vacationPeriods: [] });
                if (typeof window !== 'undefined') {
                    setTimeout(() => firebaseSync.syncToCloud(), 100);
                }
            },
        }),
        {
            name: 'vacation-storage',
            storage: storage,
        }
    )
);
