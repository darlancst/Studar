import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Review } from '@/types';
import { useSettingsStore } from './settingsStore';
import { addDays, parseISO, isWithinInterval, startOfDay, getDay } from 'date-fns';
import { firebaseSync } from '@/services/firebaseSync';
import { useVacationStore } from './vacationStore';

interface ReviewState {
  reviews: Review[];
  addReview: (topicId: string, scheduledDate: Date) => void;
  scheduleReviewsForTopic: (topicId: string) => void;
  generateReviewsForTopic: (topicId: string) => void;
  completeReview: (reviewId: string) => void;
  toggleReviewCompletion: (id: string) => void;
  updateReview: (id: string, updates: Partial<Review>) => void;
  deleteReview: (id: string) => void;
  deleteReviewsByTopicId: (topicId: string) => void;
  getReviewsByDate: (date: Date) => Review[];
  getPendingReviewsByDate: (date: Date) => Review[];
  resetReviews: () => void;
  checkAndPushReviews: (schedules: any[], weeklyItems: any[], blockItems: any[]) => void;
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      reviews: [],
      addReview: (topicId, scheduledDate) => {
        const newReview: Review = {
          id: uuidv4(),
          topicId,
          scheduledDate,
          completed: false,
          date: scheduledDate,
        };
        set((state) => ({
          reviews: [...state.reviews, newReview],
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      scheduleReviewsForTopic: (topicId) => {
        const { reviewIntervals } = useSettingsStore.getState();
        const today = new Date();

        reviewIntervals.forEach(days => {
          const scheduledDate = addDays(today, days);
          get().addReview(topicId, scheduledDate);
        });

        console.log(`Scheduled ${reviewIntervals.length} reviews for topic ${topicId}`);
        console.log(`Scheduled ${reviewIntervals.length} reviews for topic ${topicId}`);
      },
      generateReviewsForTopic: (topicId) => {
        const { reviewIntervals } = useSettingsStore.getState();
        const existingReviews = get().reviews.filter(r => r.topicId === topicId);

        // If there are already reviews for this topic, do not generate new ones
        if (existingReviews.length > 0) {
          console.log(`Reviews already exist for topic ${topicId}, skipping generation.`);
          return;
        }

        const today = new Date();

        reviewIntervals.forEach(days => {
          const scheduledDate = addDays(today, days);
          get().addReview(topicId, scheduledDate);
        });
      },
      completeReview: (reviewId) => {
        set((state) => ({
          reviews: state.reviews.map((review) => {
            if (review.id === reviewId) {
              return {
                ...review,
                completed: true,
                date: new Date()
              };
            }
            return review;
          }),
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      toggleReviewCompletion: (id) => {
        set((state) => ({
          reviews: state.reviews.map((review) => {
            if (review.id === id) {
              const isNowCompleted = !review.completed;
              return {
                ...review,
                completed: isNowCompleted,
                date: isNowCompleted ? new Date() : review.scheduledDate
              };
            }
            return review;
          }),
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      updateReview: (id, updates) => {
        set((state) => ({
          reviews: state.reviews.map((review) =>
            review.id === id ? { ...review, ...updates } : review
          ),
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      deleteReview: (id) => {
        set((state) => ({
          reviews: state.reviews.filter((review) => review.id !== id),
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      deleteReviewsByTopicId: (topicId) => {
        set((state) => ({
          reviews: state.reviews.filter((review) => review.topicId !== topicId),
        }));
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      getReviewsByDate: (date) => {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        return get().reviews.filter((review) => {
          const reviewDate = new Date(review.scheduledDate);
          return reviewDate >= startOfDay && reviewDate <= endOfDay;
        });
      },
      getPendingReviewsByDate: (date) => {
        return get().getReviewsByDate(date).filter((review) => !review.completed);
      },
      resetReviews: () => {
        set({ reviews: [] });
        if (typeof window !== 'undefined') {
          setTimeout(() => firebaseSync.syncToCloud(), 100);
        }
      },
      checkAndPushReviews: (schedules, weeklyItems, blockItems) => {
        const activeSchedules = schedules.filter((s: any) => s.isActive);
        if (activeSchedules.length === 0) return;

        const hasWeeklyItems = weeklyItems.some((i: any) => activeSchedules.some((s: any) => s.id === i.scheduleId));
        const hasBlockItems = blockItems.some((i: any) => activeSchedules.some((s: any) => s.id === i.scheduleId));
        if (!hasWeeklyItems && !hasBlockItems) return;

        let changed = false;
        const updatedReviews = get().reviews.map(review => {
          if (review.completed) return review;

          const reviewDate = typeof review.scheduledDate === 'string' 
            ? parseISO(review.scheduledDate) 
            : new Date(review.scheduledDate);

          let current = new Date(reviewDate);
          let pushed = false;
          let iterations = 0;

          while (iterations < 30) {
            const isVacation = useVacationStore.getState().isVacationDate(current);
            let plannedCount = 0;

            if (!isVacation) {
              activeSchedules.forEach((schedule: any) => {
                const scheduleStart = parseISO(schedule.startDate);
                const scheduleEnd = parseISO(schedule.endDate);

                if (!isWithinInterval(startOfDay(current), { start: startOfDay(scheduleStart), end: startOfDay(scheduleEnd) })) {
                  return;
                }

                if (schedule.mode === 'weekly') {
                  const dayOfWeek = getDay(current);
                  const itemsCount = weeklyItems.filter((item: any) => item.scheduleId === schedule.id && item.dayOfWeek === dayOfWeek).length;
                  plannedCount += itemsCount;
                } else {
                  const itemsCount = blockItems.filter((item: any) => {
                    if (item.scheduleId !== schedule.id) return false;
                    const start = parseISO(item.startDate);
                    const end = parseISO(item.endDate);
                    const inRange = isWithinInterval(startOfDay(current), { start: startOfDay(start), end: startOfDay(end) });
                    const isRestDay = item.restDays?.includes(getDay(current));
                    return inRange && !isRestDay;
                  }).length;
                  plannedCount += itemsCount;
                }
              });
            }

            if (plannedCount > 0) {
              break;
            } else {
              current = addDays(current, 1);
              pushed = true;
              iterations++;
            }
          }

          if (pushed) {
            changed = true;
            return {
              ...review,
              scheduledDate: current,
              date: current,
            };
          }

          return review;
        });

        if (changed) {
          set({ reviews: updatedReviews });
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
        }
      },
    }),
    {
      name: 'review-storage',
    }
  )
); 