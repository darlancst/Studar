import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Topic } from '@/types';
import { useReviewStore } from './reviewStore';
import { useSettingsStore } from './settingsStore';
import { firebaseSync } from '@/services/firebaseSync';

interface TopicState {
  topics: Topic[];
  addTopic: (title: string, subjectId: string, description?: string, customDate?: Date) => Topic;
  updateTopic: (id: string, data: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  getTopicsBySubjectId: (subjectId: string) => Topic[];
  getTopicById: (id: string) => Topic | undefined;
  resetTopics: () => void;
}

export const useTopicStore = create<TopicState>()(
  persist(
    (set, get) => ({
      topics: [],
      addTopic: (title, subjectId, description, customDate) => {
        const newTopic: Topic = {
          id: uuidv4(),
          title,
          subjectId,
          description,
          createdAt: customDate || new Date(),
        };
        set((state) => {
          const newState = [...state.topics, newTopic];
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { topics: newState };
        });
        
        const reviewStore = useReviewStore.getState();
        const settingsStore = useSettingsStore.getState();
        const today = customDate || new Date();
        
        settingsStore.reviewIntervals.forEach(days => {
          const scheduledDate = new Date(today);
          scheduledDate.setDate(today.getDate() + days);
          reviewStore.addReview(newTopic.id, scheduledDate);
        });
        
        return newTopic;
      },
      updateTopic: (id, data) => {
        set((state) => {
          const newState = state.topics.map((topic) =>
            topic.id === id ? { ...topic, ...data } : topic
          );
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { topics: newState };
        });
      },
      deleteTopic: (id) => {
        set((state) => {
          const newState = state.topics.filter((topic) => topic.id !== id);
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { topics: newState };
        });
        
        const reviewStore = useReviewStore.getState();
        reviewStore.deleteReviewsByTopicId(id);
      },
      getTopicsBySubjectId: (subjectId) => {
        return get().topics.filter((topic) => topic.subjectId === subjectId);
      },
      getTopicById: (id) => {
        return get().topics.find((topic) => topic.id === id);
      },
      resetTopics: () => {
        set({ topics: [] });
      },
    }),
    {
      name: 'topic-storage',
    }
  )
);
