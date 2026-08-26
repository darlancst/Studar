import { useMemo, useState, useEffect } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useVacationStore } from '@/store/vacationStore';
import { parseISO, isWithinInterval, startOfDay, getDay, isSameDay, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function NextSessionDisplay() {
    const { schedules, weeklyItems, blockItems, isItemCompletedForDate } = useScheduleStore();
    const { subjects } = useSubjectStore();
    const { topics } = useTopicStore();
    const { isVacationDate, vacationPeriods } = useVacationStore();
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update current time every minute to keep "next" accurate
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(new Date());
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const nextSession = useMemo(() => {
        const today = new Date();
        const activeSchedules = schedules.filter(s => s.isActive);

        // Helper to get items for a specific date
        const getItemsForDate = (date: Date) => {
            if (isVacationDate(date)) return [];
            let itemsForDate: any[] = [];
            activeSchedules.forEach(schedule => {
                const scheduleStart = parseISO(schedule.startDate);
                const scheduleEnd = parseISO(schedule.endDate);

                if (!isWithinInterval(startOfDay(date), { start: startOfDay(scheduleStart), end: startOfDay(scheduleEnd) })) {
                    return;
                }

                if (schedule.mode === 'weekly') {
                    const dayOfWeek = getDay(date);
                    const items = weeklyItems.filter(item => item.scheduleId === schedule.id && item.dayOfWeek === dayOfWeek);
                    itemsForDate = [...itemsForDate, ...items];
                } else {
                    const items = blockItems.filter(item => {
                        if (item.scheduleId !== schedule.id) return false;
                        const start = parseISO(item.startDate);
                        const end = parseISO(item.endDate);
                        const inRange = isWithinInterval(startOfDay(date), { start: startOfDay(start), end: startOfDay(end) });
                        const isRestDay = item.restDays?.includes(getDay(date));
                        return inRange && !isRestDay;
                    });
                    itemsForDate = [...itemsForDate, ...items];
                }
            });
            return itemsForDate;
        };

        const todayItems = getItemsForDate(today);
        const currentTimeString = format(currentTime, 'HH:mm');

        // 1. Check for CURRENT session (now is within start-end)
        const currentItem = todayItems.find(item => {
            if (isItemCompletedForDate(item.id, format(today, 'yyyy-MM-dd'))) return false;
            if (item.startTime && item.endTime) {
                return currentTimeString >= item.startTime && currentTimeString <= item.endTime;
            }
            return false;
        });

        if (currentItem) {
            const subject = subjects.find(s => s.id === currentItem.subjectId);
            if (subject) {
                return {
                    label: 'Agora',
                    subjectName: subject.name,
                    time: `${currentItem.startTime} - ${currentItem.endTime}`
                };
            }
        }

        // 2. Check for NEXT session today
        const upcomingItems = todayItems.filter(item => {
            if (isItemCompletedForDate(item.id, format(today, 'yyyy-MM-dd'))) return false;
            if (item.startTime) {
                return item.startTime > currentTimeString;
            }
            return false;
        });

        upcomingItems.sort((a, b) => a.startTime.localeCompare(b.startTime));

        if (upcomingItems.length > 0) {
            const nextItem = upcomingItems[0];
            const subject = subjects.find(s => s.id === nextItem.subjectId);
            if (subject) {
                return {
                    label: 'Próx',
                    subjectName: subject.name,
                    time: nextItem.startTime
                };
            }
        }

        // 3. Check for TOMORROW's first session
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowItems = getItemsForDate(tomorrow);

        tomorrowItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));

        // Filter out items without start time for "Next" display logic
        const validTomorrowItems = tomorrowItems.filter(i => i.startTime);

        if (validTomorrowItems.length > 0) {
            const nextItem = validTomorrowItems[0];
            const subject = subjects.find(s => s.id === nextItem.subjectId);
            if (subject) {
                return {
                    label: 'Amanhã',
                    subjectName: subject.name,
                    time: nextItem.startTime
                };
            }
        }

        return null;

    }, [schedules, weeklyItems, blockItems, isItemCompletedForDate, subjects, currentTime, isVacationDate, vacationPeriods]);

    if (!nextSession) {
        return null;
    }

    return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 rounded-full border border-gray-100 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 animate-fade-in whitespace-nowrap max-w-[250px] sm:max-w-none overflow-hidden">
            <span className={`w-1.5 h-1.5 rounded-full ${nextSession.label === 'Agora' ? 'bg-green-500' : 'bg-primary-500'} animate-pulse shrink-0`}></span>
            <span className="truncate">
                {nextSession.label}: <span className="font-semibold text-gray-900 dark:text-white">{nextSession.subjectName}</span> <span className="text-gray-400 dark:text-gray-500">({nextSession.time})</span>
            </span>
        </div>
    );
}
