import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { Subject, Topic } from '@/types';
import { useTopicStore } from './topicStore';
import { firebaseSync } from '@/services/firebaseSync';

interface SubjectState {
  subjects: Subject[];
  addSubject: (name: string, color: string) => void;
  updateSubject: (id: string, data: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  getSubjectById: (id: string) => Subject | undefined;
  getSubjectsWithTopics: () => Subject[];
  resetSubjects: () => void;
}

export const useSubjectStore = create<SubjectState>()(
  persist(
    (set, get) => ({
      subjects: [],
      addSubject: (name, color) => {
        const newSubject: Subject = {
          id: uuidv4(),
          name,
          color,
          createdAt: new Date(),
          topics: [],
        };
        set((state) => {
          const newState = [...state.subjects, newSubject];
          // Sincronizar com Firebase
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { subjects: newState };
        });
        return newSubject;
      },
      updateSubject: (id, data) => {
        set((state) => {
          const newState = state.subjects.map((subject) =>
            subject.id === id ? { ...subject, ...data } : subject
          );
          // Sincronizar com Firebase
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { subjects: newState };
        });
      },
      deleteSubject: (id) => {
        set((state) => {
          const newState = state.subjects.filter((subject) => subject.id !== id);
          // Sincronizar com Firebase
          if (typeof window !== 'undefined') {
            setTimeout(() => firebaseSync.syncToCloud(), 100);
          }
          return { subjects: newState };
        });
      },
      getSubjectById: (id) => {
        return get().subjects.find((subject) => subject.id === id);
      },
      getSubjectsWithTopics: () => {
        const topicStore = useTopicStore.getState();
        return get().subjects.map((subject) => ({
          ...subject,
          topics: topicStore.getTopicsBySubjectId(subject.id),
        }));
      },
      resetSubjects: () => {
        set({ subjects: [] });
      },
    }),
    {
      name: 'subjects',
    }
  )
);
