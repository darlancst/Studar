'use client';

import { useState, useEffect } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { 
  BellIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  XMarkIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { format, isToday, differenceInDays, isPast } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Notification {
  id: string;
  type: 'warning' | 'urgent' | 'success' | 'info' | 'streak';
  title: string;
  message: string;
  action?: string;
  actionData?: any;
  priority: number;
  dismissible: boolean;
  icon: any;
  color: string;
}

interface SmartNotificationsProps {
  onAction?: (action: string, data?: any) => void;
  maxNotifications?: number;
}

export default function SmartNotifications({ 
  onAction, 
  maxNotifications = 3 
}: SmartNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [isMinimized, setIsMinimized] = useState(false);

  const { getTopicRecommendations, userPatterns } = useIntelligenceStore();
  const reviews = useReviewStore((state) => state.reviews);
  const { weeklyGoal, weeklyGoalEndDate } = useSettingsStore();
  const pomodoroSessions = usePomodoroStore((state) => state.sessions);
  const simulados = useSimuladosStore((state) => state.simulados);

  const generateNotifications = () => {
    const newNotifications: Notification[] = [];

    // 1. Urgent Reviews
    const overdueReviews = reviews.filter(r => 
      !r.completed && 
      isPast(new Date(r.scheduledDate)) &&
      differenceInDays(new Date(), new Date(r.scheduledDate)) > 2
    );

    if (overdueReviews.length > 0) {
      newNotifications.push({
        id: 'urgent-reviews',
        type: 'urgent',
        title: '⚠️ Revisões Críticas!',
        message: `Você tem ${overdueReviews.length} revisão(ões) atrasada(s) há mais de 2 dias`,
        action: 'navigate-to-calendar',
        actionData: { action: 'review' },
        priority: 100,
        dismissible: false,
        icon: ExclamationTriangleIcon,
        color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
      });
    }

    // 2. Today's Reviews
    const todayReviews = reviews.filter(r => 
      !r.completed && isToday(new Date(r.scheduledDate))
    );

    if (todayReviews.length > 0) {
      newNotifications.push({
        id: 'today-reviews',
        type: 'warning',
        title: '📋 Revisões de Hoje',
        message: `${todayReviews.length} revisão(ões) programada(s) para hoje`,
        action: 'navigate-to-calendar',
        actionData: { action: 'review' },
        priority: 80,
        dismissible: true,
        icon: ClockIcon,
        color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
      });
    }

    // 3. Weekly Goal Status
    if (weeklyGoal && weeklyGoalEndDate) {
      const endDate = new Date(weeklyGoalEndDate);
      const daysLeft = Math.max(0, differenceInDays(endDate, new Date()));
      
      // Calculate current progress
      const currentWeekSessions = pomodoroSessions.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      });
      
      const currentMinutes = currentWeekSessions.reduce((acc, s) => acc + s.duration, 0);
      const progressPercent = (currentMinutes / weeklyGoal) * 100;

      if (daysLeft <= 2 && progressPercent < 70) {
        newNotifications.push({
          id: 'weekly-goal-risk',
          type: 'warning',
          title: '🎯 Meta Semanal em Risco',
          message: `Faltam ${daysLeft} dia(s) para atingir sua meta. Você está em ${progressPercent.toFixed(0)}%`,
          action: 'navigate-to-pomodoro',
          priority: 70,
          dismissible: true,
          icon: ClockIcon,
          color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
        });
      } else if (progressPercent >= 100) {
        newNotifications.push({
          id: 'weekly-goal-complete',
          type: 'success',
          title: '🎉 Meta Cumprida!',
          message: `Parabéns! Você atingiu ${progressPercent.toFixed(0)}% da sua meta semanal`,
          priority: 60,
          dismissible: true,
          icon: TrophyIcon,
          color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
        });
      }
    }

    // 4. Consistency Streak
    if (userPatterns.consistencyStreak >= 7) {
      newNotifications.push({
        id: 'streak-achievement',
        type: 'streak',
        title: '🔥 Streak Incrível!',
        message: `${userPatterns.consistencyStreak} dias consecutivos estudando! Continue assim!`,
        priority: 50,
        dismissible: true,
        icon: FireIcon,
        color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
      });
    } else if (userPatterns.consistencyStreak === 0) {
      // Check if user hasn't studied today
      const hasStudiedToday = pomodoroSessions.some(s => 
        isToday(new Date(s.date))
      );
      
      if (!hasStudiedToday) {
        newNotifications.push({
          id: 'no-study-today',
          type: 'info',
          title: '💡 Que tal estudar hoje?',
          message: 'Você ainda não iniciou nenhuma sessão de estudo hoje',
          action: 'navigate-to-pomodoro',
          priority: 40,
          dismissible: true,
          icon: SparklesIcon,
          color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
        });
      }
    }

    // 5. Weak Performance Alert
    if (simulados.length >= 3) {
      const recentSimulados = simulados
        .filter(s => differenceInDays(new Date(), new Date(s.date)) <= 14)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 3);

      if (recentSimulados.length >= 2) {
        const avgPerformance = recentSimulados.reduce((acc, s) => 
          acc + (s.hits / s.questions * 100), 0
        ) / recentSimulados.length;

        if (avgPerformance < 60) {
          newNotifications.push({
            id: 'weak-performance',
            type: 'warning',
            title: '📉 Performance em Declínio',
            message: `Seus últimos simulados: ${avgPerformance.toFixed(0)}% de média. Que tal revisar?`,
            action: 'navigate-to-simulados',
            priority: 75,
            dismissible: true,
            icon: ExclamationTriangleIcon,
            color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
          });
        }
      }
    }

    // 6. High Priority Recommendations
    const recommendations = getTopicRecommendations();
    const highPriorityRec = recommendations.find(r => r.priority >= 80);
    
    if (highPriorityRec) {
      newNotifications.push({
        id: 'high-priority-topic',
        type: 'urgent',
        title: '🚨 Tópico Crítico',
        message: `${highPriorityRec.topicTitle} precisa de atenção urgente: ${highPriorityRec.reason}`,
        action: 'high-priority-action',
        actionData: { topicId: highPriorityRec.topicId },
        priority: highPriorityRec.priority,
        dismissible: true,
        icon: ExclamationTriangleIcon,
        color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
      });
    }

    // Filter dismissed and sort by priority
    const filteredNotifications = newNotifications
      .filter(n => !dismissedIds.has(n.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxNotifications);

    setNotifications(filteredNotifications);
  };

  useEffect(() => {
    generateNotifications();
    
    // Refresh every 30 seconds
    const interval = setInterval(generateNotifications, 30000);
    return () => clearInterval(interval);
  }, [reviews, pomodoroSessions, simulados, weeklyGoal, dismissedIds, maxNotifications]);

  const dismissNotification = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleAction = (notification: Notification) => {
    if (notification.action) {
      onAction?.(notification.action, notification.actionData);
      
      // Auto-dismiss actionable notifications
      if (notification.dismissible) {
        dismissNotification(notification.id);
      }
    }
  };

  const clearAll = () => {
    notifications.forEach(n => {
      if (n.dismissible) {
        dismissNotification(n.id);
      }
    });
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <BellIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Notificações ({notifications.length})
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {notifications.some(n => n.dismissible) && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Limpar
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ChevronRightIcon 
              className={`h-4 w-4 transition-transform ${isMinimized ? '' : 'rotate-90'}`}
            />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {!isMinimized && (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const IconComponent = notification.icon;
            
            return (
              <div
                key={notification.id}
                className={`border rounded-lg p-3 transition-all ${notification.color}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <IconComponent className="h-4 w-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium mb-1">
                      {notification.title}
                    </h4>
                    <p className="text-xs opacity-90 mb-2">
                      {notification.message}
                    </p>
                    
                    {notification.action && (
                      <button
                        onClick={() => handleAction(notification)}
                        className="text-xs font-medium underline hover:no-underline"
                      >
                        Resolver →
                      </button>
                    )}
                  </div>

                  {notification.dismissible && (
                    <button
                      onClick={() => dismissNotification(notification.id)}
                      className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
                    >
                      <XMarkIcon className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 