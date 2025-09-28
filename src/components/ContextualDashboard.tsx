'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useSettingsStore } from '@/store/settingsStore';
import { 
  SunIcon,
  CloudIcon,
  MoonIcon,
  SparklesIcon,
  ClockIcon,
  TrophyIcon,
  BookOpenIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { format, isToday, differenceInHours, startOfDay } from 'date-fns';
import { pt } from 'date-fns/locale';

type TimeContext = 'morning' | 'afternoon' | 'evening' | 'night';
type UserType = 'beginner' | 'intermediate' | 'advanced' | 'casual';

interface ContextualInsight {
  id: string;
  type: 'encouragement' | 'suggestion' | 'warning' | 'celebration';
  title: string;
  message: string;
  icon: any;
  color: string;
  action?: {
    label: string;
    handler: () => void;
  };
}

interface ContextualDashboardProps {
  onNavigate?: (tab: string, data?: any) => void;
}

export default function ContextualDashboard({ onNavigate }: ContextualDashboardProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [insights, setInsights] = useState<ContextualInsight[]>([]);
  
  const { userPatterns, getTopicRecommendations } = useIntelligenceStore();
  const reviews = useReviewStore((state) => state.reviews);
  const simulados = useSimuladosStore((state) => state.simulados);
  const pomodoroSessions = usePomodoroStore((state) => state.sessions);
  const { weeklyGoal } = useSettingsStore();

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Determine time context
  const timeContext: TimeContext = useMemo(() => {
    const hour = currentTime.getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }, [currentTime]);

  // Determine user type based on usage patterns
  const userType: UserType = useMemo(() => {
    const totalSessions = pomodoroSessions.length;
    const totalSimulados = simulados.length;
    const consistencyStreak = userPatterns.consistencyStreak;

    if (totalSessions < 5 || totalSimulados === 0) return 'beginner';
    if (totalSessions < 20 || consistencyStreak < 7) return 'casual';
    if (totalSessions < 50 || consistencyStreak < 14) return 'intermediate';
    return 'advanced';
  }, [pomodoroSessions.length, simulados.length, userPatterns.consistencyStreak]);

  // Generate contextual insights
  const generateInsights = () => {
    const newInsights: ContextualInsight[] = [];

    // Time-based insights
    switch (timeContext) {
      case 'morning':
        // Check if user has studied today
        const hasStudiedToday = pomodoroSessions.some(s => isToday(new Date(s.date)));
        
        if (!hasStudiedToday) {
          newInsights.push({
            id: 'morning-start',
            type: 'encouragement',
            title: '🌅 Bom dia! Hora de estudar',
            message: 'Estudos matinais são mais eficazes. Comece com seus tópicos mais desafiadores!',
            icon: SunIcon,
            color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
            action: {
              label: 'Começar estudo',
              handler: () => onNavigate?.('pomodoro')
            }
          });
        } else {
          newInsights.push({
            id: 'morning-good',
            type: 'celebration',
            title: '✨ Ótimo começou!',
            message: 'Você já estudou hoje pela manhã. Mantenha o ritmo!',
            icon: SparklesIcon,
            color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
          });
        }

        // Morning reviews suggestion
        const morningReviews = reviews.filter(r => 
          !r.completed && isToday(new Date(r.scheduledDate))
        );
        
        if (morningReviews.length > 0) {
          newInsights.push({
            id: 'morning-reviews',
            type: 'suggestion',
            title: '📋 Revisões matinais',
            message: `${morningReviews.length} revisão(ões) programada(s) para hoje. Ideal para começar o dia!`,
            icon: BookOpenIcon,
            color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
            action: {
              label: 'Ver revisões',
              handler: () => onNavigate?.('calendar', { action: 'review' })
            }
          });
        }
        break;

      case 'afternoon':
        // Afternoon productivity check
        const morningSessionsToday = pomodoroSessions.filter(s => {
          const sessionTime = new Date(s.date);
          return isToday(sessionTime) && sessionTime.getHours() < 12;
        });

        if (morningSessionsToday.length === 0) {
          newInsights.push({
            id: 'afternoon-catchup',
            type: 'suggestion',
            title: '⏰ Hora de recuperar',
            message: 'Não estudou pela manhã? Tarde é um ótimo momento para sessões focadas!',
            icon: ClockIcon,
            color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
            action: {
              label: 'Começar agora',
              handler: () => onNavigate?.('pomodoro')
            }
          });
        }

        // Afternoon simulado suggestion
        const todaySimulados = simulados.filter(s => isToday(new Date(s.date)));
        if (todaySimulados.length === 0 && simulados.length > 0) {
          newInsights.push({
            id: 'afternoon-test',
            type: 'suggestion',
            title: '🎯 Teste seus conhecimentos',
            message: 'Tarde é ideal para simulados. Que tal testar o que estudou?',
            icon: ChartBarIcon,
            color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
            action: {
              label: 'Fazer simulado',
              handler: () => onNavigate?.('simulados')
            }
          });
        }
        break;

      case 'evening':
        // Evening review and planning
        const todaySessions = pomodoroSessions.filter(s => isToday(new Date(s.date)));
        const todayMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);

        if (todayMinutes > 0) {
          newInsights.push({
            id: 'evening-summary',
            type: 'celebration',
            title: '🌆 Ótimo dia de estudos!',
            message: `Você estudou ${todayMinutes} minutos hoje. Continue assim!`,
            icon: TrophyIcon,
            color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
          });
        }

        // Tomorrow planning
        const tomorrowReviews = reviews.filter(r => {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          return !r.completed && format(new Date(r.scheduledDate), 'yyyy-MM-dd') === format(tomorrow, 'yyyy-MM-dd');
        });

        if (tomorrowReviews.length > 0) {
          newInsights.push({
            id: 'tomorrow-prep',
            type: 'suggestion',
            title: '📅 Planejando amanhã',
            message: `${tomorrowReviews.length} revisão(ões) agendada(s) para amanhã. Esteja preparado!`,
            icon: BookOpenIcon,
            color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
          });
        }
        break;

      case 'night':
        // Night reflection
        const weekMinutes = pomodoroSessions
          .filter(s => differenceInHours(new Date(), new Date(s.date)) <= 168) // Last 7 days
          .reduce((acc, s) => acc + s.duration, 0);

        if (weekMinutes >= weeklyGoal) {
          newInsights.push({
            id: 'night-achievement',
            type: 'celebration',
            title: '🌙 Meta semanal atingida!',
            message: `Parabéns! Você completou ${weekMinutes} minutos esta semana.`,
            icon: MoonIcon,
            color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
          });
        } else {
          const remaining = weeklyGoal - weekMinutes;
          newInsights.push({
            id: 'night-planning',
            type: 'suggestion',
            title: '🌙 Planeje a semana',
            message: `Faltam ${remaining} minutos para sua meta semanal. Organize os próximos dias!`,
            icon: ClockIcon,
            color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
          });
        }
        break;
    }

    // User type specific insights
    switch (userType) {
      case 'beginner':
        newInsights.push({
          id: 'beginner-tip',
          type: 'encouragement',
          title: '🌱 Dica para iniciantes',
          message: 'Comece com sessões de 15-20 minutos. Consistência é mais importante que duração!',
          icon: SparklesIcon,
          color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
        });
        break;
      
      case 'advanced':
        const recommendations = getTopicRecommendations();
        const complexRec = recommendations.find(r => r.priority >= 70);
        
        if (complexRec) {
          newInsights.push({
            id: 'advanced-challenge',
            type: 'suggestion',
            title: '🚀 Desafio para experts',
            message: `Tópico complexo detectado: ${complexRec.topicTitle}. Pronto para o desafio?`,
            icon: TrophyIcon,
            color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
            action: {
              label: 'Aceitar desafio',
              handler: () => onNavigate?.('pomodoro', { topicId: complexRec.topicId })
            }
          });
        }
        break;
    }

    setInsights(newInsights.slice(0, 3)); // Limit to 3 insights
  };

  useEffect(() => {
    generateInsights();
    
    // Regenerate insights every 30 minutes
    const interval = setInterval(generateInsights, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeContext, userType, pomodoroSessions, reviews, simulados]);

  const getTimeIcon = () => {
    switch (timeContext) {
      case 'morning': return SunIcon;
      case 'afternoon': return CloudIcon;  
      case 'evening': return SunIcon;
      case 'night': return MoonIcon;
    }
  };

  const getTimeGreeting = () => {
    switch (timeContext) {
      case 'morning': return 'Bom dia!';
      case 'afternoon': return 'Boa tarde!';
      case 'evening': return 'Boa noite!';
      case 'night': return 'Boa madrugada!';
    }
  };

  const getContextDescription = () => {
    switch (timeContext) {
      case 'morning': return 'Momento ideal para tópicos desafiadores';
      case 'afternoon': return 'Horário perfeito para revisões e simulados';
      case 'evening': return 'Hora de revisar o que foi estudado';
      case 'night': return 'Planeje seus estudos de amanhã';
    }
  };

  if (insights.length === 0) {
    return null;
  }

  const TimeIcon = getTimeIcon();

  return (
    <div className="space-y-3">
      {/* Time-based header */}
      <div className="flex items-center space-x-3 p-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="p-2 bg-white dark:bg-gray-700 rounded-full">
          <TimeIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {getTimeGreeting()}
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            {getContextDescription()} • {format(currentTime, 'HH:mm')}
          </p>
        </div>
        <div className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
          {userType === 'beginner' && '🌱 Iniciante'}
          {userType === 'casual' && '🎯 Casual'}  
          {userType === 'intermediate' && '📚 Intermediário'}
          {userType === 'advanced' && '🚀 Avançado'}
        </div>
      </div>

      {/* Contextual insights */}
      <div className="space-y-2">
        {insights.map((insight) => {
          const IconComponent = insight.icon;
          
          return (
            <div
              key={insight.id}
              className={`border rounded-lg p-3 transition-all ${insight.color}`}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <IconComponent className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-xs opacity-90 mb-2">
                    {insight.message}
                  </p>
                  
                  {insight.action && (
                    <button
                      onClick={insight.action.handler}
                      className="text-xs font-medium underline hover:no-underline"
                    >
                      {insight.action.label} →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 