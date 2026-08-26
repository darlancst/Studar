import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler,
  TooltipItem
} from 'chart.js';
import { Pie, Bar, Doughnut, Line } from 'react-chartjs-2';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useGoalStore } from '@/store/goalStore';
import { useEditalStore } from '@/store/editalStore';
import { useReviewStore } from '@/store/reviewStore';
import { useDatesStore } from '@/store/datesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useVacationStore } from '@/store/vacationStore';
import {
  format,
  subDays,
  startOfToday,
  endOfToday,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
  endOfWeek,
  subYears,
  addDays,
  formatISO,
  endOfDay,
  startOfMonth,
  subMonths,
  differenceInDays,
  eachDayOfInterval,
  isWithinInterval,
  getDay,
  differenceInMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Subject, Review, PomodoroSession, Topic } from '@/types';
import { useDarkMode } from '@/hooks/useDarkMode';
import Heatmap from './Heatmap';
import EditalProgressCard from './EditalProgressCard';
import {
  ChartBarIcon,
  ClockIcon,
  FireIcon,
  BookOpenIcon,
  CheckCircleIcon,
  TrophyIcon,
  PlayIcon,
  ChartPieIcon,
  SparklesIcon,
  AcademicCapIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

// Registrando os componentes necessários
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
  Filler
);

type StatsPeriod = 'today' | 'week' | 'month' | 'annual' | 'custom';

export default function Stats() {
  const { subjects } = useSubjectStore();
  const { topics } = useTopicStore();
  const { sessions: allSessions, startSession } = usePomodoroStore();
  const { goals, activeGoalId, setActiveGoal } = useGoalStore();
  const { items: editalItems } = useEditalStore();
  const { reviews } = useReviewStore();
  const { studyDates: dates } = useDatesStore();
  const { weeklyGoal } = useSettingsStore();
  const { simulados } = useSimuladosStore();
  const { schedules, weeklyItems, blockItems, isItemCompletedForDate } = useScheduleStore();
  const { isVacationDate } = useVacationStore();
  const isDarkMode = useDarkMode();

  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [customStartDate, setCustomStartDate] = useState(subDays(new Date(), 30).toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Filtragem Mágica de Sessões Baseada no Concurso Ativo
  const activeSubjectIds = useMemo(() => {
    if (!activeGoalId) return null;
    const items = editalItems.filter(i => i.goalId === activeGoalId);
    return new Set(items.map(i => i.subjectId));
  }, [activeGoalId, editalItems]);

  const getSubjectIdForSession = (session: PomodoroSession) => {
    const topic = topics.find(t => t.id === session.topicId);
    if (topic) return topic.subjectId;
    return session.topicId; // fallback
  };

  const sessions = useMemo(() => {
    if (!activeSubjectIds) return allSessions;
    return allSessions.filter(s => {
      const sId = getSubjectIdForSession(s);
      return activeSubjectIds.has(sId);
    });
  }, [allSessions, activeSubjectIds, topics]);

  // Calcular Meta de Hoje (Horas Planejadas)
  const getTodayPlannedMinutes = () => {
    const today = new Date();
    if (isVacationDate(today)) return 0;
    const activeSchedules = schedules.filter(s => s.isActive);
    let totalMinutes = 0;

    activeSchedules.forEach(schedule => {
      const scheduleStart = parseISO(schedule.startDate);
      const scheduleEnd = parseISO(schedule.endDate);

      if (!isWithinInterval(startOfDay(today), { start: startOfDay(scheduleStart), end: startOfDay(scheduleEnd) })) {
        return;
      }

      if (schedule.mode === 'weekly') {
        const dayOfWeek = getDay(today);
        const items = weeklyItems.filter(item => item.scheduleId === schedule.id && item.dayOfWeek === dayOfWeek);
        items.forEach(item => {
          const start = parseISO(`2000-01-01T${item.startTime}`);
          const end = parseISO(`2000-01-01T${item.endTime}`);
          totalMinutes += differenceInMinutes(end, start);
        });
      } else {
        // Para blocos, assumimos 0 por enquanto ou lógica futura
      }
    });
    return totalMinutes;
  };

  const todayPlannedMinutes = getTodayPlannedMinutes();

  // Obter próximo item a estudar
  const getNextStudyItem = () => {
    const today = new Date();
    if (isVacationDate(today)) return null;
    const activeSchedules = schedules.filter(s => s.isActive);
    let plannedItems: any[] = [];

    activeSchedules.forEach(schedule => {
      const scheduleStart = parseISO(schedule.startDate);
      const scheduleEnd = parseISO(schedule.endDate);

      if (!isWithinInterval(startOfDay(today), { start: startOfDay(scheduleStart), end: startOfDay(scheduleEnd) })) {
        return;
      }

      if (schedule.mode === 'weekly') {
        const dayOfWeek = getDay(today);
        const items = weeklyItems.filter(item => item.scheduleId === schedule.id && item.dayOfWeek === dayOfWeek);
        plannedItems = [...plannedItems, ...items];
      } else {
        const items = blockItems.filter(item => {
          if (item.scheduleId !== schedule.id) return false;
          const start = parseISO(item.startDate);
          const end = parseISO(item.endDate);
          const inRange = isWithinInterval(startOfDay(today), { start: startOfDay(start), end: startOfDay(end) });
          const isRestDay = item.restDays?.includes(getDay(today));
          return inRange && !isRestDay;
        });
        plannedItems = [...plannedItems, ...items];
      }
    });

    // Filter out completed items
    const todayStr = format(today, 'yyyy-MM-dd');
    plannedItems = plannedItems.filter(item => !isItemCompletedForDate(item.id, todayStr));

    // Ordenar por horário
    plannedItems.sort((a, b) => {
      const timeA = a.startTime || '00:00';
      const timeB = b.startTime || '00:00';
      return timeA.localeCompare(timeB);
    });

    // Encontrar o primeiro item que ainda não foi "completado" (lógica simplificada baseada no horário atual ou apenas o primeiro)
    // Idealmente cruzaríamos com as sessões já feitas, mas para o widget "Agora", mostrar o próximo do horário faz sentido.
    const now = format(new Date(), 'HH:mm');
    const nextItem = plannedItems.find(item => (item.endTime || '23:59') > now) || plannedItems[plannedItems.length - 1];

    return nextItem;
  };

  const nextItem = getNextStudyItem();
  const nextSubject = nextItem ? subjects.find(s => s.id === nextItem.subjectId) : null;
  const nextTopic = nextItem?.topicId ? topics.find(t => t.id === nextItem.topicId) : null;

  const handleStartSession = () => {
    if (nextSubject) {
      startSession(nextSubject.id, nextTopic?.id);
      window.dispatchEvent(new CustomEvent('navigate-to-pomodoro'));
    }
  };

  // Calcular Horas Estudadas Hoje (Usando Sessions)
  const today = new Date();
  const todaySessions = sessions.filter(s => isSameDay(parseISO(s.date), today));
  const todayMinutes = todaySessions.reduce((acc, curr) => acc + curr.duration, 0);

  const goalProgress = todayPlannedMinutes > 0 ? Math.min(100, (todayMinutes / todayPlannedMinutes) * 100) : 0;

  // Filtrar sessões com base no período
  const filteredSessions = useMemo(() => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);

    switch (period) {
      case 'today':
        start = startOfToday();
        end = endOfToday();
        break;
      case 'week':
        start = subDays(now, 7);
        break;
      case 'month':
        start = subDays(now, 30);
        break;
      case 'annual':
        start = subYears(now, 1);
        break;
      case 'custom':
        start = parseISO(customStartDate);
        end = endOfDay(parseISO(customEndDate));
        break;
    }

    return sessions.filter(session => {
      const date = parseISO(session.date);
      return date >= start && date <= end;
    });
  }, [sessions, period, customStartDate, customEndDate]);

  // Estatísticas Gerais
  const totalStudyTime = filteredSessions.reduce((acc, session) => acc + session.duration, 0);
  const totalSessions = filteredSessions.length;
  const subjectStudyTimeOnly = filteredSessions.filter(s => !s.isReview).reduce((acc, curr) => acc + curr.duration, 0);
  const reviewsStudyTimeOnly = filteredSessions.filter(s => s.isReview).reduce((acc, curr) => acc + curr.duration, 0);

  // Calcular Revisões Feitas
  const totalReviews = useMemo(() => {
    const now = new Date();
    let start = startOfDay(now);
    let end = endOfDay(now);

    switch (period) {
      case 'today':
        start = startOfToday();
        end = endOfToday();
        break;
      case 'week':
        start = subDays(now, 7);
        break;
      case 'month':
        start = subDays(now, 30);
        break;
      case 'annual':
        start = subYears(now, 1);
        break;
      case 'custom':
        start = parseISO(customStartDate);
        end = endOfDay(parseISO(customEndDate));
        break;
    }

    return reviews.filter(r => {
      if (!r.completed || !r.date) return false;
      const reviewDate = new Date(r.date);
      return reviewDate >= start && reviewDate <= end;
    }).length;
  }, [reviews, period, customStartDate, customEndDate]);

  // Calcular Progresso da Meta Semanal
  const weeklyProgress = useMemo(() => {
    const now = new Date();
    const start = startOfWeek(now, { weekStartsOn: 1 }); // Semana começa na segunda
    const end = endOfWeek(now, { weekStartsOn: 1 });

    const weekSessions = sessions.filter(s => {
      const date = parseISO(s.date);
      return date >= start && date <= end;
    });

    const currentWeekMinutes = weekSessions.reduce((acc, s) => acc + s.duration, 0);
    const percentage = Math.min(100, (currentWeekMinutes / weeklyGoal) * 100);

    return {
      current: currentWeekMinutes,
      target: weeklyGoal,
      percentage
    };
  }, [sessions, weeklyGoal]);

  // Matéria mais estudada
  const subjectStudyTime = filteredSessions.reduce((acc, session) => {
    // Tenta encontrar o tópico
    const topic = topics.find(t => t.id === session.topicId);
    if (topic) {
      acc[topic.subjectId] = (acc[topic.subjectId] || 0) + session.duration;
    } else {
      // Se não achar tópico, tenta ver se o ID é de uma matéria diretamente
      const subject = subjects.find(s => s.id === session.topicId);
      if (subject) {
        acc[subject.id] = (acc[subject.id] || 0) + session.duration;
      }
    }
    return acc;
  }, {} as Record<string, number>);

  const mostStudiedSubjectId = Object.keys(subjectStudyTime).reduce((a, b) =>
    subjectStudyTime[a] > subjectStudyTime[b] ? a : b
    , '');

  const mostStudiedSubject = subjects.find(s => s.id === mostStudiedSubjectId);

  // Dados para o gráfico de barras (Tempo por Matéria)
  const barChartData = {
    labels: subjects.map(s => s.name),
    datasets: [
      {
        label: 'Minutos Estudados',
        data: subjects.map(s => subjectStudyTime[s.id] || 0),
        backgroundColor: subjects.map(s => s.color),
        borderRadius: 4,
      },
    ],
  };

  // Dados filtrados apenas com matérias que possuem tempo de estudo > 0
  const doughnutChartData = useMemo(() => {
    const activeSubjects = subjects.filter(s => (subjectStudyTime[s.id] || 0) > 0);
    
    return {
      labels: activeSubjects.map(s => s.name),
      datasets: [
        {
          data: activeSubjects.map(s => subjectStudyTime[s.id] || 0),
          backgroundColor: activeSubjects.map(s => s.color),
          borderWidth: isDarkMode ? 2 : 1,
          borderColor: isDarkMode ? '#111827' : '#ffffff',
          hoverOffset: 4
        },
      ],
    };
  }, [subjects, subjectStudyTime, isDarkMode]);

  const hasStudyData = useMemo(() => {
    return subjects.some(s => (subjectStudyTime[s.id] || 0) > 0);
  }, [subjects, subjectStudyTime]);

  // Dados para o gráfico de linha (Evolução Diária)
  const lineChartData = useMemo(() => {
    const days = eachDayOfInterval({
      start: period === 'today' ? startOfToday() :
        period === 'week' ? subDays(new Date(), 6) :
          period === 'month' ? subDays(new Date(), 29) :
            period === 'annual' ? subYears(new Date(), 1) :
              parseISO(customStartDate),
      end: period === 'today' ? endOfToday() :
        period === 'custom' ? parseISO(customEndDate) :
          new Date()
    });

    const data = days.map(day => {
      const daySessions = sessions.filter(s => isSameDay(parseISO(s.date), day));
      return daySessions.reduce((acc, s) => acc + s.duration, 0);
    });

    return {
      labels: days.map(day => format(day, 'dd/MM', { locale: ptBR })),
      datasets: [
        {
          label: 'Tempo Estudado',
          data: data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.06)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: isDarkMode ? '#111827' : '#ffffff',
          pointBorderWidth: 1.5,
          pointRadius: 3.5,
          pointHoverRadius: 5.5,
          pointHoverBackgroundColor: '#3b82f6',
          pointHoverBorderColor: '#ffffff',
          pointHoverBorderWidth: 2,
        }
      ]
    };
  }, [sessions, period, customStartDate, customEndDate, isDarkMode]);

  // Opções comuns dos gráficos
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          usePointStyle: true,
          padding: 20
        }
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        titleColor: isDarkMode ? '#f3f4f6' : '#111827',
        bodyColor: isDarkMode ? '#d1d5db' : '#4b5563',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        callbacks: {
          label: function (context: TooltipItem<'bar' | 'pie' | 'doughnut' | 'line'>) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }

            let val = 0;
            if (typeof context.parsed === 'number') {
              val = context.parsed;
            } else if (context.parsed !== null && typeof context.parsed === 'object' && 'y' in context.parsed) {
              val = (context.parsed as any).y;
            }

            if (val !== null && val !== undefined) {
              const hours = Math.floor(val / 60);
              const minutes = val % 60;
              if (hours > 0) {
                label += `${hours}h ${minutes}m`;
              } else {
                label += `${minutes}m`;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { 
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: { family: "'Inter', sans-serif", size: 10 },
          callback: function(value: any) {
            const val = Number(value);
            if (val === 0) return '0';
            const hours = Math.floor(val / 60);
            const minutes = val % 60;
            if (hours > 0 && minutes === 0) return `${hours}h`;
            if (hours > 0) return `${hours}h ${minutes}m`;
            return `${minutes}m`;
          }
        },
        grid: { 
          color: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderDash: [3, 3]
        }
      },
      x: {
        ticks: { 
          color: isDarkMode ? '#9ca3af' : '#6b7280',
          font: { family: "'Inter', sans-serif", size: 10 }
        },
        grid: { display: false }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '70%', // Estilo rosca premium
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: isDarkMode ? '#e5e7eb' : '#374151',
          font: {
            family: "'Inter', sans-serif",
            size: 10
          },
          usePointStyle: true,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
        titleColor: isDarkMode ? '#f3f4f6' : '#111827',
        bodyColor: isDarkMode ? '#d1d5db' : '#4b5563',
        borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb',
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: function (context: any) {
            const val = context.raw;
            const hours = Math.floor(val / 60);
            const minutes = val % 60;
            let timeStr = '';
            if (hours > 0) {
              timeStr = `${hours}h ${minutes}m`;
            } else {
              timeStr = `${minutes}m`;
            }
            return ` ${context.label}: ${timeStr}`;
          }
        }
      }
    }
  };

  return (
    <div className="space-y-2.5 pb-16">
      {/* 1. Widget "Agora" - Command Center */}
      <div className="w-full" id="tour-pomodoro-widget">
        {nextSubject ? (
          <div className="relative overflow-hidden bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-xl border border-gray-150/70 dark:border-gray-800/80 shadow-sm transition-all duration-300 hover:shadow-md hover:scale-[1.002] group">
            {/* Subtle Gradient Background */}
            <div
              className="absolute top-0 right-0 w-[260px] h-[260px] bg-gradient-to-br from-transparent to-current opacity-[0.03] dark:opacity-[0.08] rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
              style={{ color: nextSubject.color }}
            />

            <div className="relative z-10 p-3 sm:p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between sm:justify-start gap-2.5 mb-1.5">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Próxima Sessão
                  </span>
                  {nextItem?.startTime && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100/50 dark:border-gray-700/50">
                      <ClockIcon className="w-2.5 h-2.5 text-gray-400" />
                      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 tabular-nums">
                        {nextItem.startTime} - {nextItem.endTime}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-2.5">
                  <div
                    className="mt-1 w-1 h-7 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: nextSubject.color,
                      boxShadow: `0 0 8px ${nextSubject.color}80`
                    }}
                  />
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {nextSubject.name}
                    </h2>
                    {nextTopic && (
                      <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm mt-0.5 line-clamp-1">
                        {nextTopic.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartSession}
                className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-lg font-semibold text-xs shadow-md shadow-primary-500/20 hover:shadow-lg transition-all active:scale-[0.97] flex items-center justify-center gap-1.5"
              >
                <PlayIcon className="w-3.5 h-3.5" />
                <span>Iniciar Foco</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-150/60 dark:border-gray-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left transition-all">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-primary-500/10 via-primary-500/20 to-blue-500/10 dark:from-primary-500/20 dark:to-blue-500/20 flex items-center justify-center flex-shrink-0 border border-primary-500/20 shadow-inner">
                {subjects.length === 0 ? (
                  <BookOpenIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                ) : schedules.filter(s => s.isActive).length === 0 ? (
                  <CalendarDaysIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                ) : todayMinutes > 0 ? (
                  <CheckCircleIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <SparklesIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                )}
              </div>
              <div>
                {subjects.length === 0 ? (
                  <>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Comece sua jornada</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Cadastre suas matérias para organizar seus estudos</p>
                  </>
                ) : schedules.filter(s => s.isActive).length === 0 ? (
                  <>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Monte seu cronograma</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Planeje sua grade semanal ou ciclos de estudo</p>
                  </>
                ) : todayMinutes > 0 ? (
                  <>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Excelente foco hoje! ✨</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Você já acumulou {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m de dedicação
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Pronto para estudar?</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Inicie uma sessão de foco ou aproveite seu dia livre</p>
                  </>
                )}
              </div>
            </div>

            <div className="shrink-0 w-full sm:w-auto">
              {subjects.length === 0 ? (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-subject-manager'))}
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Criar Matéria
                </button>
              ) : schedules.filter(s => s.isActive).length === 0 ? (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-schedule'))}
                  className="w-full sm:w-auto px-4 py-2 bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                >
                  Criar Cronograma
                </button>
              ) : (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-pomodoro'))}
                  className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm shadow-primary-500/20 transition-all flex items-center justify-center gap-1.5"
                >
                  <PlayIcon className="w-3.5 h-3.5" />
                  <span>Iniciar Foco</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Progresso do Edital */}
      <EditalProgressCard />

      {/* 3. Cabeçalho e Filtros */}
      <div className="flex flex-row justify-between items-center gap-2 mb-1 w-full min-w-0 pt-1">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight shrink-0">Estatísticas</h2>
          {goals.length > 0 && (
            <select
              value={activeGoalId || ''}
              onChange={(e) => setActiveGoal(e.target.value)}
              className="min-w-0 truncate max-w-[120px] sm:max-w-none flex-1 sm:flex-initial bg-white/80 dark:bg-gray-950/60 backdrop-blur-md border border-gray-150/50 dark:border-gray-800/80 text-xs sm:text-sm rounded-xl py-1.5 px-2.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500/50 font-semibold cursor-pointer shadow-sm transition-all"
            >
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex bg-gray-100/90 dark:bg-gray-900/70 backdrop-blur-sm p-0.5 rounded-xl border border-gray-150/40 dark:border-gray-800/60 overflow-x-auto max-w-full shrink-0">
          {(['today', 'week', 'month', 'annual', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all whitespace-nowrap active:scale-95 ${period === p
                ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-150/40 dark:border-gray-700/50'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {p === 'today' && 'Hoje'}
              {p === 'week' && '7d'}
              {p === 'month' && '30d'}
              {p === 'annual' && 'Ano'}
              {p === 'custom' && 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex gap-3 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-3 rounded-xl border border-gray-150/70 dark:border-gray-800/80 shadow-sm">
          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">Início</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="p-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-0.5">Fim</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="p-1.5 border rounded-lg text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* 4. Cards de Resumo (KPIs) - Mobile First */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5" id="tour-stats-kpi">
        {/* Tempo Estudado */}
        <div className="group relative overflow-hidden bg-white/85 dark:bg-gray-900/60 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl shadow-sm border border-gray-150/60 dark:border-gray-800/80 hover:shadow-md hover:border-blue-300/60 dark:hover:border-blue-700/50 transition-all duration-300">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1.5 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg text-blue-600 dark:text-blue-400">
              <ClockIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estudo</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
              {Math.floor(subjectStudyTimeOnly / 60)}h {subjectStudyTimeOnly % 60}m
            </span>
          </div>
        </div>

        {/* Tempo de Revisão */}
        <div className="group relative overflow-hidden bg-white/85 dark:bg-gray-900/60 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl shadow-sm border border-gray-150/60 dark:border-gray-800/80 hover:shadow-md hover:border-purple-300/60 dark:hover:border-purple-700/50 transition-all duration-300">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1.5 bg-purple-500/10 dark:bg-purple-500/20 rounded-lg text-purple-600 dark:text-purple-400">
              <CheckCircleIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Revisão</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
              {Math.floor(reviewsStudyTimeOnly / 60)}h {reviewsStudyTimeOnly % 60}m
            </span>
          </div>
        </div>

        {/* Total de Revisões */}
        <div className="group relative overflow-hidden bg-white/85 dark:bg-gray-900/60 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl shadow-sm border border-gray-150/60 dark:border-gray-800/80 hover:shadow-md hover:border-emerald-300/60 dark:hover:border-emerald-700/50 transition-all duration-300">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1.5 bg-emerald-500/10 dark:bg-emerald-500/20 rounded-lg text-emerald-600 dark:text-emerald-400">
              <ClipboardDocumentCheckIcon className="w-3.5 h-3.5" />
            </div>
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Concluídas</span>
          </div>
          <div>
            <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight tabular-nums">
              {totalReviews}
            </span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 font-medium">cards</span>
          </div>
        </div>

        {/* Meta Semanal */}
        <div className="group relative overflow-hidden bg-white/85 dark:bg-gray-900/60 backdrop-blur-md p-3 sm:p-3.5 rounded-2xl shadow-sm border border-gray-150/60 dark:border-gray-800/80 hover:shadow-md hover:border-orange-300/60 dark:hover:border-orange-700/50 transition-all duration-300">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 bg-orange-500/10 dark:bg-orange-500/20 rounded-lg text-orange-600 dark:text-orange-400">
                <TrophyIcon className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Meta</span>
            </div>
            <span className={`text-xs font-black tabular-nums ${weeklyProgress.percentage >= 100 ? 'text-amber-500' : 'text-gray-700 dark:text-gray-300'}`}>
              {Math.floor(weeklyProgress.percentage)}%
            </span>
          </div>
          <div>
            <div className="w-full bg-gray-100/80 dark:bg-gray-800 rounded-full h-2 overflow-hidden mb-1">
              <div
                className={`h-2 rounded-full animate-fill-bar ${
                  weeklyProgress.percentage >= 100
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 animate-shimmer'
                    : weeklyProgress.percentage >= 80
                    ? 'bg-gradient-to-r from-orange-400 to-amber-500 animate-shimmer'
                    : 'bg-gradient-to-r from-primary-500 to-blue-600'
                }`}
                style={{ '--fill-width': `${Math.min(100, weeklyProgress.percentage)}%` } as React.CSSProperties}
              />
            </div>
            <div className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums flex justify-between font-medium">
              <span>{Math.floor(weeklyProgress.current / 60)}h {weeklyProgress.current % 60}m</span>
              <span>{Math.floor(weeklyProgress.target / 60)}h meta</span>
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Gráficos Analíticos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {/* Evolução do Estudo */}
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-3.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md transition-all duration-300">
          <h3 className="text-sm font-bold mb-2 dark:text-white flex items-center gap-1.5">
            <div className="p-1 bg-gradient-to-br from-primary-500/10 to-primary-600/10 dark:from-primary-500/20 dark:to-primary-600/20 rounded-md">
              <ChartBarIcon className="w-4 h-4 text-primary-500" />
            </div>
            Evolução do Estudo
          </h3>
          <div className="h-[200px]">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        {/* Distribuição por Matéria */}
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-3.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md transition-all duration-300 flex flex-col">
          <h3 className="text-sm font-bold mb-2 dark:text-white flex items-center gap-1.5">
            <div className="p-1 bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 dark:from-indigo-500/20 dark:to-indigo-600/20 rounded-md">
              <ChartPieIcon className="w-4 h-4 text-indigo-500" />
            </div>
            Distribuição por Matéria
          </h3>
          
          <div className="flex-1 h-[200px] flex items-center justify-center relative">
            {hasStudyData ? (
              <div className="w-full h-full">
                <Doughnut data={doughnutChartData} options={doughnutOptions} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-4">
                <div className="p-2 bg-gray-50 dark:bg-gray-800/50 border border-gray-100/50 dark:border-gray-700/50 rounded-full mb-2 animate-pulse">
                  <ChartPieIcon className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                </div>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Nenhum estudo registrado neste período</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">Inicie um Pomodoro para ver o equilíbrio das suas matérias!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-3.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md transition-all duration-300" id="tour-heatmap">
        <h3 className="text-sm font-bold mb-1.5 dark:text-white flex items-center gap-1.5">
          <div className="p-1 bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 rounded-md">
            <FireIcon className="w-4 h-4 text-orange-500" />
          </div>
          Consistência de Estudos
        </h3>
        <Heatmap />
      </div>
    </div>
  );
}