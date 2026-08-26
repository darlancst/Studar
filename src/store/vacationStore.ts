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

    // Helper para verificar se uma data é de férias
    isVacationDate: (date: Date | string) => boolean;

    // Helper para obter o período de férias de uma data
    getVacationPeriodForDate: (date: Date | string) => VacationPeriod | undefined;

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

            isVacationDate: (date) => {
                const periods = get().vacationPeriods;
                if (!periods || periods.length === 0) return false;

                const dateStr = typeof date === 'string'
                    ? (date.includes('T') ? date.split('T')[0] : date)
                    : format(date, 'yyyy-MM-dd');

                return periods.some(period => {
                    const startStr = period.startDate.includes('T') ? period.startDate.split('T')[0] : period.startDate;
                    const endStr = period.endDate.includes('T') ? period.endDate.split('T')[0] : period.endDate;
                    return dateStr >= startStr && dateStr <= endStr;
                });
            },

            getVacationPeriodForDate: (date) => {
                const periods = get().vacationPeriods;
                if (!periods || periods.length === 0) return undefined;

                const dateStr = typeof date === 'string'
                    ? (date.includes('T') ? date.split('T')[0] : date)
                    : format(date, 'yyyy-MM-dd');

                return periods.find(period => {
                    const startStr = period.startDate.includes('T') ? period.startDate.split('T')[0] : period.startDate;
                    const endStr = period.endDate.includes('T') ? period.endDate.split('T')[0] : period.endDate;
                    return dateStr >= startStr && dateStr <= endStr;
                });
            },

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

                // 2. SHIFT BLOCOS DE ESTUDO
                const scheduleStore = useScheduleStore.getState();

                const updatedBlockItems = scheduleStore.blockItems.map(block => {
                    const blockStart = parseISO(block.startDate);
                    const blockEnd = parseISO(block.endDate);

                    // Se o bloco termina a partir do início das férias
                    if (isAfter(blockEnd, startOfDayFrom) || blockEnd.getTime() === startOfDayFrom.getTime()) {
                        // Se o bloco começa a partir do início das férias, desloca tudo
                        if (isAfter(blockStart, startOfDayFrom) || blockStart.getTime() === startOfDayFrom.getTime()) {
                            return {
                                ...block,
                                startDate: format(addDays(blockStart, days), 'yyyy-MM-dd'),
                                endDate: format(addDays(blockEnd, days), 'yyyy-MM-dd'),
                            };
                        }
                        // Se o bloco já havia começado antes das férias, preserva startDate e estende endDate
                        return {
                            ...block,
                            endDate: format(addDays(blockEnd, days), 'yyyy-MM-dd'),
                        };
                    }
                    return block;
                });

                // 3. SHIFT CRONOGRAMAS (estende endDate para compensar dias perdidos)
                const updatedSchedules = scheduleStore.schedules.map(schedule => {
                    const scheduleStart = parseISO(schedule.startDate);
                    const scheduleEnd = parseISO(schedule.endDate);

                    if (isAfter(scheduleEnd, startOfDayFrom) || scheduleEnd.getTime() === startOfDayFrom.getTime()) {
                        if (isAfter(scheduleStart, startOfDayFrom) || scheduleStart.getTime() === startOfDayFrom.getTime()) {
                            return {
                                ...schedule,
                                startDate: format(addDays(scheduleStart, days), 'yyyy-MM-dd'),
                                endDate: format(addDays(scheduleEnd, days), 'yyyy-MM-dd'),
                            };
                        }
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
