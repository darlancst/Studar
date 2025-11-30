import { useMemo } from 'react';
import { useReviewStore } from '@/store/reviewStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useTopicStore } from '@/store/topicStore';
import { startOfDay, isWithinInterval, parseISO, getDay, isSameDay, isValid } from 'date-fns';

export function useTodayStats() {
    const { getPendingReviewsByDate } = useReviewStore();
    const { schedules, weeklyItems, blockItems, completedScheduleItems } = useScheduleStore();
    const { topics } = useTopicStore();

    const stats = useMemo(() => {
        const today = new Date();
        if (!isValid(today)) return { reviews: 0, planned: 0, completed: 0, remaining: 0 };

        // 1. Pending Reviews
        const pendingReviews = getPendingReviewsByDate ? getPendingReviewsByDate(today) : [];

        // 2. Planned Items (Schedule + Standalone)
        const activeSchedules = schedules ? schedules.filter(s => s.isActive) : [];
        let plannedCount = 0;
        let completedCount = 0;

        // Schedule Items
        activeSchedules.forEach(schedule => {
            if (!schedule.startDate || !schedule.endDate) return;

            const scheduleStart = parseISO(schedule.startDate);
            const scheduleEnd = parseISO(schedule.endDate);

            if (!isValid(scheduleStart) || !isValid(scheduleEnd)) return;

            if (!isWithinInterval(startOfDay(today), { start: startOfDay(scheduleStart), end: startOfDay(scheduleEnd) })) {
                return;
            }

            if (schedule.mode === 'weekly') {
                const dayOfWeek = getDay(today);
                const items = weeklyItems ? weeklyItems.filter(item => item.scheduleId === schedule.id && item.dayOfWeek === dayOfWeek) : [];
                plannedCount += items.length;

                // Check completion
                items.forEach(item => {
                    if (completedScheduleItems && completedScheduleItems.includes(item.id)) {
                        completedCount++;
                    }
                });
            } else {
                const items = blockItems ? blockItems.filter(item => {
                    if (item.scheduleId !== schedule.id) return false;
                    if (!item.startDate || !item.endDate) return false;

                    const start = parseISO(item.startDate);
                    const end = parseISO(item.endDate);

                    if (!isValid(start) || !isValid(end)) return false;

                    const inRange = isWithinInterval(startOfDay(today), { start: startOfDay(start), end: startOfDay(end) });
                    const isRestDay = item.restDays?.includes(getDay(today));
                    return inRange && !isRestDay;
                }) : [];
                plannedCount += items.length;

                // Check completion
                items.forEach(item => {
                    if (completedScheduleItems && completedScheduleItems.includes(item.id)) {
                        completedCount++;
                    }
                });
            }
        });

        // Standalone Topics (Created today)
        const todaysTopics = topics ? topics.filter(t => {
            if (!t.createdAt) return false;
            const topicDate = typeof t.createdAt === 'string' ? parseISO(t.createdAt) : new Date(t.createdAt);
            return isValid(topicDate) && isSameDay(topicDate, today) && !t.linkedScheduleItemId;
        }) : [];

        plannedCount += todaysTopics.length;

        return {
            reviews: pendingReviews.length,
            planned: plannedCount,
            completed: completedCount,
            remaining: Math.max(0, plannedCount - completedCount)
        };
    }, [getPendingReviewsByDate, schedules, weeklyItems, blockItems, completedScheduleItems, topics]);

    return stats;
}
