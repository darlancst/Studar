import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useSimuladosStore } from './simuladosStore';
import { useReviewStore } from './reviewStore';
import { usePomodoroStore } from './pomodoroStore';
import { useTopicStore } from './topicStore';
import { useSubjectStore } from './subjectStore';
import { isToday, isPast, differenceInDays, startOfDay } from 'date-fns';

export interface TopicRecommendation {
  topicId: string;
  topicTitle: string;
  subjectName: string;
  priority: number; // 0-100
  reason: string;
  urgency: 'baixa' | 'media' | 'alta' | 'critica';
  estimatedTime: number; // minutes
  actions: ('study' | 'review' | 'simulate')[];
}

export interface StudySession {
  id: string;
  startTime: Date;
  endTime?: Date;
  topicId: string;
  sessionType: 'pomodoro' | 'free_study';
  completed: boolean;
  pomodoroCount?: number;
}

export interface UserPattern {
  bestStudyHours: number[]; // Hours of day (0-23)
  averageSessionLength: number; // minutes
  preferredStudyDays: number[]; // Days of week (0-6)
  weakPerformanceThreshold: number; // percentage
  consistencyStreak: number; // days
}

interface IntelligenceState {
  // Current session tracking
  currentSession: StudySession | null;
  sessionHistory: StudySession[];
  
  // User patterns
  userPatterns: UserPattern;
  
  // Recommendations
  lastRecommendations: TopicRecommendation[];
  
  // Actions
  startStudySession: (topicId: string, sessionType: 'pomodoro' | 'free_study') => void;
  endCurrentSession: (completed: boolean) => void;
  getTopicRecommendations: () => TopicRecommendation[];
  analyzeUserPatterns: () => UserPattern;
  getNextBestAction: () => TopicRecommendation | null;
  updateUserPatterns: () => void;
}

const DEFAULT_PATTERNS: UserPattern = {
  bestStudyHours: [9, 10, 14, 15, 20, 21], // Default productive hours
  averageSessionLength: 25,
  preferredStudyDays: [1, 2, 3, 4, 5], // Weekdays
  weakPerformanceThreshold: 70,
  consistencyStreak: 0,
};

export const useIntelligenceStore = create<IntelligenceState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      sessionHistory: [],
      userPatterns: DEFAULT_PATTERNS,
      lastRecommendations: [],

      startStudySession: (topicId, sessionType) => {
        const newSession: StudySession = {
          id: `session_${Date.now()}`,
          startTime: new Date(),
          topicId,
          sessionType,
          completed: false,
        };

        set({ currentSession: newSession });
      },

      endCurrentSession: (completed) => {
        const current = get().currentSession;
        if (!current) return;

        const endedSession = {
          ...current,
          endTime: new Date(),
          completed,
        };

        set((state) => ({
          currentSession: null,
          sessionHistory: [...state.sessionHistory, endedSession],
        }));

        // Update user patterns after session ends
        get().updateUserPatterns();
      },

      analyzeUserPatterns: () => {
        const sessions = get().sessionHistory;
        const simulados = useSimuladosStore.getState().simulados;
        
        if (sessions.length === 0) return DEFAULT_PATTERNS;

        // Analyze best study hours
        const hourCount = new Array(24).fill(0);
        sessions.forEach(session => {
          const hour = session.startTime.getHours();
          hourCount[hour]++;
        });
        
        const bestStudyHours = hourCount
          .map((count, hour) => ({ hour, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 6)
          .map(item => item.hour);

        // Calculate average session length
        const completedSessions = sessions.filter(s => s.completed && s.endTime);
        const averageSessionLength = completedSessions.length > 0 
          ? completedSessions.reduce((acc, session) => {
              const duration = session.endTime!.getTime() - session.startTime.getTime();
              return acc + (duration / 1000 / 60); // Convert to minutes
            }, 0) / completedSessions.length
          : 25;

        // Analyze preferred study days
        const dayCount = new Array(7).fill(0);
        sessions.forEach(session => {
          const day = session.startTime.getDay();
          dayCount[day]++;
        });
        
        const preferredStudyDays = dayCount
          .map((count, day) => ({ day, count }))
          .filter(item => item.count > 0)
          .sort((a, b) => b.count - a.count)
          .map(item => item.day);

        // Calculate weak performance threshold based on simulados
        const weakPerformanceThreshold = simulados.length > 0
          ? Math.max(50, Math.min(80, 
              simulados.reduce((acc, s) => acc + (s.hits / s.questions * 100), 0) / simulados.length - 10
            ))
          : 70;

        // Calculate consistency streak - helper function inline
        const calculateConsistencyStreak = (sessions: StudySession[]) => {
          if (sessions.length === 0) return 0;

          const dates = Array.from(new Set(sessions.map(s => 
            startOfDay(s.startTime).getTime()
          ))).sort((a, b) => b - a);

          let streak = 0;
          let currentDate = startOfDay(new Date()).getTime();

          for (const sessionDate of dates) {
            if (sessionDate === currentDate) {
              streak++;
              currentDate -= 24 * 60 * 60 * 1000; // Go back one day
            } else if (sessionDate < currentDate - 24 * 60 * 60 * 1000) {
              break; // Gap found
            }
          }

          return streak;
        };

        const consistencyStreak = calculateConsistencyStreak(sessions);

        return {
          bestStudyHours,
          averageSessionLength,
          preferredStudyDays,
          weakPerformanceThreshold,
          consistencyStreak,
        };
      },

      updateUserPatterns: () => {
        const newPatterns = get().analyzeUserPatterns();
        set({ userPatterns: newPatterns });
      },

      getTopicRecommendations: () => {
        const topics = useTopicStore.getState().topics;
        const subjects = useSubjectStore.getState().subjects;
        const reviews = useReviewStore.getState().reviews;
        const simulados = useSimuladosStore.getState().simulados;
        const patterns = get().userPatterns;

        const recommendations: TopicRecommendation[] = [];

        topics.forEach(topic => {
          const subject = subjects.find(s => s.id === topic.subjectId);
          if (!subject) return;

          let priority = 0;
          let reason = '';
          let urgency: 'baixa' | 'media' | 'alta' | 'critica' = 'baixa';
          let estimatedTime = patterns.averageSessionLength;
          const actions: ('study' | 'review' | 'simulate')[] = [];

          // Check for pending reviews
          const pendingReviews = reviews.filter(r => 
            r.topicId === topic.id && 
            !r.completed && 
            (isPast(new Date(r.scheduledDate)) || isToday(new Date(r.scheduledDate)))
          );

          if (pendingReviews.length > 0) {
            const overdueDays = Math.max(...pendingReviews.map(r => 
              Math.max(0, differenceInDays(new Date(), new Date(r.scheduledDate)))
            ));
            
            priority += 30 + (overdueDays * 10);
            reason = `${pendingReviews.length} revisão(ões) pendente(s)`;
            urgency = overdueDays > 2 ? 'critica' : overdueDays > 0 ? 'alta' : 'media';
            actions.push('review');
            estimatedTime = Math.min(15, pendingReviews.length * 5);
          }

          // Check simulado performance
          const topicSimulados = simulados.filter(s => s.topicId === topic.id);
          if (topicSimulados.length > 0) {
            const avgPerformance = topicSimulados.reduce((acc, s) => 
              acc + (s.hits / s.questions * 100), 0
            ) / topicSimulados.length;

            if (avgPerformance < patterns.weakPerformanceThreshold) {
              priority += 25;
              reason = reason ? 
                `${reason} + Performance baixa (${avgPerformance.toFixed(0)}%)` :
                `Performance baixa (${avgPerformance.toFixed(0)}%)`;
              urgency = avgPerformance < 50 ? 'critica' : 'alta';
              actions.push('study');
              estimatedTime += 15;
            }

            actions.push('simulate');
          } else {
            // No simulados yet - suggest studying first
            priority += 10;
            reason = reason || 'Tópico ainda não testado';
            actions.push('study', 'simulate');
            estimatedTime += 10;
          }

          // Check how long since last study
          const pomodoroSessions = usePomodoroStore.getState().sessions;
          const topicSessions = pomodoroSessions.filter(s => s.topicId === topic.id);
          
          if (topicSessions.length === 0) {
            priority += 15;
            reason = reason || 'Nunca estudado';
            actions.push('study');
          } else {
            const lastSessionDate = new Date(Math.max(...topicSessions.map(s => 
              new Date(s.date).getTime()
            )));
            const daysSinceLastStudy = differenceInDays(new Date(), lastSessionDate);
            
            if (daysSinceLastStudy > 7) {
              priority += 10 + daysSinceLastStudy;
              reason = reason ? 
                `${reason} + Último estudo há ${daysSinceLastStudy} dias` :
                `Último estudo há ${daysSinceLastStudy} dias`;
              if (daysSinceLastStudy > 14) urgency = 'alta';
            }
          }

          // Boost priority for topics created recently but not studied
          const daysSinceCreation = differenceInDays(new Date(), new Date(topic.createdAt));
          if (daysSinceCreation <= 1 && topicSessions.length === 0) {
            priority += 20;
            reason = reason || 'Tópico criado hoje - comece logo!';
            urgency = 'media';
          }

          if (priority > 0) {
            recommendations.push({
              topicId: topic.id,
              topicTitle: topic.title,
              subjectName: subject.name,
              priority: Math.min(100, priority),
              reason,
              urgency,
              estimatedTime,
              actions: Array.from(new Set(actions)), // Remove duplicates
            });
          }
        });

        // Sort by priority and take top 10
        const sortedRecommendations = recommendations
          .sort((a, b) => b.priority - a.priority)
          .slice(0, 10);

        set({ lastRecommendations: sortedRecommendations });
        return sortedRecommendations;
      },

      getNextBestAction: () => {
        const recommendations = get().getTopicRecommendations();
        return recommendations.length > 0 ? recommendations[0] : null;
      },


    }),
    {
      name: 'intelligence-storage',
    }
  )
); 