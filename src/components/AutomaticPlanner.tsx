'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useSettingsStore } from '@/store/settingsStore';
import { 
  CalendarDaysIcon,
  ClockIcon,
  SparklesIcon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  DocumentChartBarIcon,
  ArrowRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { 
  format, 
  addDays, 
  startOfDay, 
  endOfDay, 
  differenceInDays,
  isToday, 
  isTomorrow,
  getDay,
  setHours,
  setMinutes 
} from 'date-fns';
import { pt } from 'date-fns/locale';

interface PlanTask {
  id: string;
  type: 'study' | 'review' | 'simulate' | 'break';
  title: string;
  description: string;
  duration: number; // minutes
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subjectId?: string;
  topicId?: string;
  scheduledTime?: Date;
  completed?: boolean;
  urgent?: boolean;
  dependencies?: string[]; // task IDs that should be completed first
}

interface DayPlan {
  date: Date;
  dayName: string;
  totalDuration: number;
  tasks: PlanTask[];
  efficiency: number; // 0-100 based on user patterns
}

interface WeeklyPlan {
  weekStart: Date;
  weekEnd: Date;
  totalHours: number;
  goalProgress: number;
  days: DayPlan[];
  insights: string[];
}

interface AutomaticPlannerProps {
  planDays?: number;
  onExecuteTask?: (task: PlanTask) => void;
}

export default function AutomaticPlanner({ 
  planDays = 7, 
  onExecuteTask 
}: AutomaticPlannerProps) {
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDay, setSelectedDay] = useState<DayPlan | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [plannerSettings, setPlannerSettings] = useState({
    dailyGoal: 120, // minutes
    preferredStartTime: 9, // hour
    preferredEndTime: 22, // hour
    includeWeekends: true,
    focusOnWeakAreas: true,
    balanceSubjects: true,
    intensiveMode: false,
  });

  // Store hooks
  const simulados = useSimuladosStore((state) => state.simulados);
  const reviews = useReviewStore((state) => state.reviews);
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
  const { weeklyGoal } = useSettingsStore();
  const { userPatterns, getTopicRecommendations } = useIntelligenceStore();

  const generateWeeklyPlan = () => {
    setIsGenerating(true);
    
    try {
      const startDate = startOfDay(new Date());
      const endDate = addDays(startDate, planDays - 1);
      const recommendations = getTopicRecommendations();
      
      const days: DayPlan[] = [];
      const insights: string[] = [];
      
      // Calculate daily goal
      const dailyMinutes = plannerSettings.dailyGoal;
      const weekdaysInPlan = Array.from({ length: planDays }, (_, i) => {
        const day = addDays(startDate, i);
        return plannerSettings.includeWeekends || (getDay(day) !== 0 && getDay(day) !== 6);
      }).filter(Boolean).length;
      
      for (let i = 0; i < planDays; i++) {
        const currentDay = addDays(startDate, i);
        const dayOfWeek = getDay(currentDay);
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Skip weekends if not included
        if (isWeekend && !plannerSettings.includeWeekends) {
          continue;
        }
        
        const dayEfficiency = userPatterns.bestStudyHours.includes(plannerSettings.preferredStartTime) ? 95 : 
                            userPatterns.preferredStudyDays.includes(dayOfWeek) ? 85 : 70;
        
        const tasks: PlanTask[] = [];
        let usedMinutes = 0;
        
        // 1. Add urgent reviews first
        const urgentReviews = reviews.filter(r => 
          !r.completed && 
          format(new Date(r.scheduledDate), 'yyyy-MM-dd') === format(currentDay, 'yyyy-MM-dd') &&
          differenceInDays(new Date(), new Date(r.scheduledDate)) >= 0
        );
        
        urgentReviews.forEach(review => {
          const topic = topics.find(t => t.id === review.topicId);
          const subject = subjects.find(s => s.id === topic?.subjectId);
          
          if (topic && subject && usedMinutes < dailyMinutes) {
            tasks.push({
              id: `review-${review.id}`,
              type: 'review',
              title: `Revisar ${topic.title}`,
              description: `Revisão espaçada de ${subject.name}`,
              duration: 15,
              priority: differenceInDays(new Date(), new Date(review.scheduledDate)) > 2 ? 'urgent' : 'high',
              topicId: topic.id,
              subjectId: subject.id,
              urgent: differenceInDays(new Date(), new Date(review.scheduledDate)) > 2,
              scheduledTime: setMinutes(setHours(currentDay, plannerSettings.preferredStartTime), usedMinutes)
            });
            usedMinutes += 15;
          }
        });
        
        // 2. Add high-priority study sessions
        const dailyRecommendations = recommendations
          .filter(rec => rec.priority >= 70)
          .slice(0, 3);
        
        dailyRecommendations.forEach(rec => {
          if (usedMinutes >= dailyMinutes - 25) return; // Leave space
          
          const studyDuration = Math.min(rec.estimatedTime, 45);
          const subject = subjects.find(s => s.id === topics.find(t => t.id === rec.topicId)?.subjectId);
          
          tasks.push({
            id: `study-${rec.topicId}-${i}`,
            type: 'study',
            title: `Estudar ${rec.topicTitle}`,
            description: `${rec.reason} (${subject?.name})`,
            duration: studyDuration,
            priority: rec.priority >= 90 ? 'urgent' : rec.priority >= 80 ? 'high' : 'medium',
            topicId: rec.topicId,
            subjectId: subject?.id,
            scheduledTime: setMinutes(setHours(currentDay, plannerSettings.preferredStartTime), usedMinutes + 15)
          });
          usedMinutes += studyDuration;
        });
        
        // 3. Add study breaks
        if (usedMinutes >= 50) {
          tasks.push({
            id: `break-${i}-1`,
            type: 'break',
            title: 'Pausa',
            description: 'Descanso para manter o foco',
            duration: 10,
            priority: 'medium',
            scheduledTime: setMinutes(setHours(currentDay, plannerSettings.preferredStartTime), usedMinutes)
          });
          usedMinutes += 10;
        }
        
        // 4. Add simulados for performance tracking
        if (i % 2 === 0 && usedMinutes < dailyMinutes - 20) { // Every other day
          const subjectForTest = subjects.find(s => {
            const subjectSimulados = simulados.filter(sim => sim.subjectId === s.id);
            return subjectSimulados.length === 0 || 
                   differenceInDays(new Date(), new Date(subjectSimulados[subjectSimulados.length - 1]?.date || 0)) >= 3;
          });
          
          if (subjectForTest) {
            tasks.push({
              id: `simulate-${subjectForTest.id}-${i}`,
              type: 'simulate',
              title: `Simulado de ${subjectForTest.name}`,
              description: 'Teste de conhecimento para avaliar progresso',
              duration: 20,
              priority: 'medium',
              subjectId: subjectForTest.id,
              scheduledTime: setMinutes(setHours(currentDay, plannerSettings.preferredStartTime), usedMinutes + 15)
            });
            usedMinutes += 20;
          }
        }
        
        // 5. Fill remaining time with balanced subjects
        if (plannerSettings.balanceSubjects && usedMinutes < dailyMinutes - 25) {
          const remainingTime = dailyMinutes - usedMinutes - 10; // Leave buffer
          const subjectsToBalance = subjects.filter(s => 
            !tasks.some(task => task.subjectId === s.id && task.type === 'study')
          );
          
          if (subjectsToBalance.length > 0 && remainingTime >= 25) {
            const timePerSubject = Math.floor(remainingTime / Math.min(subjectsToBalance.length, 2));
            
            subjectsToBalance.slice(0, 2).forEach(subject => {
              const subjectTopics = topics.filter(t => t.subjectId === subject.id);
              const randomTopic = subjectTopics[Math.floor(Math.random() * subjectTopics.length)];
              
              if (randomTopic && timePerSubject >= 25) {
                tasks.push({
                  id: `balance-${subject.id}-${i}`,
                  type: 'study',
                  title: `Estudar ${randomTopic.title}`,
                  description: `Sessão de balanceamento - ${subject.name}`,
                  duration: timePerSubject,
                  priority: 'low',
                  topicId: randomTopic.id,
                  subjectId: subject.id,
                  scheduledTime: setMinutes(setHours(currentDay, plannerSettings.preferredStartTime), usedMinutes + 15)
                });
                usedMinutes += timePerSubject;
              }
            });
          }
        }
        
        // Sort tasks by scheduled time
        tasks.sort((a, b) => (a.scheduledTime?.getTime() || 0) - (b.scheduledTime?.getTime() || 0));
        
        days.push({
          date: currentDay,
          dayName: format(currentDay, 'EEEE', { locale: pt }),
          totalDuration: usedMinutes,
          tasks,
          efficiency: dayEfficiency
        });
      }
      
      // Generate insights
      const totalPlannedHours = days.reduce((acc, day) => acc + day.totalDuration, 0) / 60;
      const avgDailyHours = totalPlannedHours / days.length;
      
      insights.push(`📊 Plano de ${planDays} dias com ${totalPlannedHours.toFixed(1)}h de estudo`);
      insights.push(`⏰ Média de ${avgDailyHours.toFixed(1)}h por dia`);
      
      if (totalPlannedHours * 60 >= weeklyGoal) {
        insights.push(`🎯 Este plano atinge sua meta semanal!`);
      } else {
        insights.push(`📈 Adicione ${((weeklyGoal - totalPlannedHours * 60) / 60).toFixed(1)}h para atingir sua meta`);
      }
      
      const urgentTasksCount = days.reduce((acc, day) => 
        acc + day.tasks.filter(t => t.priority === 'urgent').length, 0
      );
      
      if (urgentTasksCount > 0) {
        insights.push(`⚠️ ${urgentTasksCount} tarefa(s) urgente(s) incluída(s)`);
      }
      
      const goalProgress = Math.min(100, (totalPlannedHours * 60 / weeklyGoal) * 100);
      
      setWeeklyPlan({
        weekStart: startDate,
        weekEnd: endDate,
        totalHours: totalPlannedHours,
        goalProgress,
        days,
        insights
      });
      
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    // Generate initial plan
    generateWeeklyPlan();
  }, [plannerSettings, planDays]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'study': return BookOpenIcon;
      case 'review': return ClockIcon;
      case 'simulate': return DocumentChartBarIcon;
      case 'break': return SparklesIcon;
      default: return BookOpenIcon;
    }
  };

  const formatTime = (date: Date | undefined) => {
    return date ? format(date, 'HH:mm') : '--:--';
  };

  if (isGenerating) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center space-x-2 mb-3">
          <CalendarDaysIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            🧠 Gerando Plano Personalizado
          </h3>
        </div>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-white/50 dark:bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!weeklyPlan) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <div className="text-center py-4">
          <CalendarDaysIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Erro ao gerar plano. Tente novamente.
          </p>
        </div>
      </div>
    );
  }

  // Day details modal
  if (selectedDay) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
          <div className="p-4 border-b dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">
                  {isToday(selectedDay.date) ? 'Hoje' : 
                   isTomorrow(selectedDay.date) ? 'Amanhã' :
                   format(selectedDay.date, 'EEEE, dd/MM', { locale: pt })}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedDay.tasks.length} tarefas • {Math.floor(selectedDay.totalDuration / 60)}h {selectedDay.totalDuration % 60}min
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
              >
                <span className="sr-only">Fechar</span>
                ✕
              </button>
            </div>
          </div>

          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {selectedDay.tasks.map((task, index) => {
              const TaskIcon = getTaskIcon(task.type);
              const priorityColor = getPriorityColor(task.priority);
              
              return (
                <div key={task.id} className={`border rounded-lg p-3 ${priorityColor}`}>
                  <div className="flex items-start space-x-3">
                    <TaskIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-semibold">{task.title}</h4>
                        <span className="text-xs font-medium">
                          {formatTime(task.scheduledTime)}
                        </span>
                      </div>
                      <p className="text-xs opacity-90 mb-2">{task.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium">
                          {task.duration} min
                        </span>
                        <button
                          onClick={() => {
                            onExecuteTask?.(task);
                            setSelectedDay(null);
                          }}
                          className="flex items-center space-x-1 px-2 py-1 bg-white/50 hover:bg-white/70 dark:bg-black/20 dark:hover:bg-black/30 rounded text-xs transition-colors"
                        >
                          <PlayIcon className="h-3 w-3" />
                          <span>Começar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <CalendarDaysIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            🧠 Plano de Estudos Inteligente
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded transition-colors"
            title="Configurações"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </button>
          <button
            onClick={generateWeeklyPlan}
            className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 rounded transition-colors"
            title="Regenerar plano"
          >
            <ArrowPathIcon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Meta Diária (min)</label>
              <input
                type="number"
                value={plannerSettings.dailyGoal}
                onChange={(e) => setPlannerSettings(prev => ({ ...prev, dailyGoal: parseInt(e.target.value) || 120 }))}
                className="w-full text-xs p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                min="30"
                max="480"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Início (hora)</label>
              <select
                value={plannerSettings.preferredStartTime}
                onChange={(e) => setPlannerSettings(prev => ({ ...prev, preferredStartTime: parseInt(e.target.value) }))}
                className="w-full text-xs p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
              >
                {Array.from({length: 16}, (_, i) => i + 6).map(hour => (
                  <option key={hour} value={hour}>{hour}:00</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { key: 'includeWeekends', label: 'Fins de semana' },
              { key: 'focusOnWeakAreas', label: 'Focar pontos fracos' },
              { key: 'balanceSubjects', label: 'Balancear matérias' },
              { key: 'intensiveMode', label: 'Modo intensivo' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={plannerSettings[key as keyof typeof plannerSettings] as boolean}
                  onChange={(e) => setPlannerSettings(prev => ({ ...prev, [key]: e.target.checked }))}
                  className="rounded"
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Plan Overview */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            Visão Geral ({format(weeklyPlan.weekStart, 'dd/MM')} - {format(weeklyPlan.weekEnd, 'dd/MM')})
          </h4>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-800/50 px-2 py-1 rounded-full">
            {weeklyPlan.goalProgress.toFixed(0)}% da meta
          </span>
        </div>
        
        <div className="space-y-1 text-xs text-indigo-600 dark:text-indigo-400">
          {weeklyPlan.insights.map((insight, index) => (
            <p key={index}>{insight}</p>
          ))}
        </div>
      </div>

      {/* Daily Schedule */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {weeklyPlan.days.map((day) => {
          const urgentTasks = day.tasks.filter(t => t.priority === 'urgent');
          const highTasks = day.tasks.filter(t => t.priority === 'high');
          
          return (
            <button
              key={format(day.date, 'yyyy-MM-dd')}
              onClick={() => setSelectedDay(day)}
              className="w-full text-left p-3 bg-white/50 hover:bg-white/70 dark:bg-black/20 dark:hover:bg-black/30 rounded-lg transition-all"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
                    {isToday(day.date) ? '🔥 Hoje' : 
                     isTomorrow(day.date) ? '⏰ Amanhã' :
                     format(day.date, 'EEE dd/MM', { locale: pt })}
                  </span>
                  {urgentTasks.length > 0 && (
                    <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400">
                    {Math.floor(day.totalDuration / 60)}h {day.totalDuration % 60}min
                  </span>
                  <ArrowRightIcon className="h-3 w-3 text-indigo-400" />
                </div>
              </div>
              
              <div className="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400">
                <span>{day.tasks.length} tarefa(s)</span>
                <div className="flex items-center space-x-1">
                  {urgentTasks.length > 0 && (
                    <span className="bg-red-100 dark:bg-red-900/30 px-1 py-0.5 rounded text-red-700 dark:text-red-400">
                      {urgentTasks.length} urgente(s)
                    </span>
                  )}
                  {highTasks.length > 0 && (
                    <span className="bg-orange-100 dark:bg-orange-900/30 px-1 py-0.5 rounded text-orange-700 dark:text-orange-400">
                      {highTasks.length} importante(s)
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
        <p className="text-xs text-indigo-600 dark:text-indigo-400 text-center">
          Plano gerado com base em seus padrões de estudo e performance
        </p>
      </div>
    </div>
  );
} 