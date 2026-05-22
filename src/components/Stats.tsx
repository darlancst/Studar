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
  CalendarIcon,
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

  // Dados para o gráfico de pizza (Distribuição)
  const pieChartData = {
    labels: subjects.map(s => s.name),
    datasets: [
      {
        data: subjects.map(s => subjectStudyTime[s.id] || 0),
        backgroundColor: subjects.map(s => s.color),
        borderWidth: 0,
      },
    ],
  };

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
          label: 'Minutos por Dia',
          data: data,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        }
      ]
    };
  }, [sessions, period, customStartDate, customEndDate]);

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
        backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
        titleColor: isDarkMode ? '#f3f4f6' : '#111827',
        bodyColor: isDarkMode ? '#d1d5db' : '#4b5563',
        borderColor: isDarkMode ? '#374151' : '#e5e7eb',
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
              label += `${hours}h ${minutes}m`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' },
        grid: { color: isDarkMode ? '#374151' : '#e5e7eb' }
      },
      x: {
        ticks: { color: isDarkMode ? '#9ca3af' : '#6b7280' },
        grid: { display: false }
      }
    }
  };

  const pieOptions = {
    ...chartOptions,
    scales: {
      x: { display: false },
      y: { display: false }
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
          <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-xl p-3 sm:p-4 shadow-sm border border-gray-150/70 dark:border-gray-800/80 flex flex-col items-center justify-center text-center gap-1.5 min-h-[120px]">
            <div className="w-16 h-16 relative">
              <img
                src="/dashboard-empty.gif"
                alt="Sem planos"
                className="w-full h-full object-contain"
              />
            </div>
            {subjects.length === 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Comece sua jornada! 📚</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Crie sua primeira matéria para começar</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('open-subject-manager'))}
                  className="mt-2 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Criar Matéria
                </button>
              </div>
            ) : schedules.filter(s => s.isActive).length === 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Monte seu cronograma 📅</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Organize seus estudos da semana</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-schedule'))}
                  className="mt-2 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                  Criar Cronograma
                </button>
              </div>
            ) : todayMinutes > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Mandou bem hoje! ✅</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Você já estudou {Math.floor(todayMinutes / 60)}h {todayMinutes % 60}m
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Dia livre! 🎉</h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">Descanse ou inicie uma sessão avulsa</p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-pomodoro'))}
                  className="mt-2 px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors shadow-sm"
                >
                  Iniciar Sessão
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. Progresso do Edital */}
      <EditalProgressCard />

      {/* 3. Cabeçalho e Filtros */}
      <div className="flex flex-row justify-between items-center gap-2 mb-2 w-full min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight shrink-0">Estatísticas</h2>
          {goals.length > 0 && (
            <select
              value={activeGoalId || ''}
              onChange={(e) => setActiveGoal(e.target.value)}
              className="min-w-0 truncate max-w-[120px] sm:max-w-none flex-1 sm:flex-initial bg-white/80 dark:bg-gray-950/60 backdrop-blur-md border border-gray-150/50 dark:border-gray-800/80 text-sm rounded-xl py-1.5 px-2.5 text-gray-900 dark:text-white focus:ring-1 focus:ring-primary-500/50 font-semibold cursor-pointer shadow-sm transition-all"
            >
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex bg-gray-100/80 dark:bg-gray-900/60 backdrop-blur-sm p-0.5 rounded-xl border border-gray-150/30 dark:border-gray-800/60 overflow-x-auto max-w-full shrink-0">
          {(['today', 'week', 'month', 'annual', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all whitespace-nowrap ${period === p
                ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm border border-gray-150/30 dark:border-gray-750/30'
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

      {/* 3. Cards de Resumo (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2" id="tour-stats-kpi">
        <div className="group bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-2.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 rounded-lg group-hover:scale-105 transition-transform">
              <ClockIcon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Tempo Total</span>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m
            </span>
          </div>
        </div>

        <div className="group bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-2.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-gradient-to-br from-purple-500/10 to-purple-600/10 dark:from-purple-500/20 dark:to-purple-600/20 rounded-lg group-hover:scale-105 transition-transform">
              <CheckCircleIcon className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Sessões</span>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {totalSessions}
            </span>
          </div>
        </div>

        <div className="group bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-2.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 dark:from-emerald-500/20 dark:to-emerald-600/20 rounded-lg group-hover:scale-105 transition-transform">
              <ClipboardDocumentCheckIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Revisões</span>
          </div>
          <div>
            <span className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
              {totalReviews}
            </span>
          </div>
        </div>

        <div className="group bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-2.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md hover:border-orange-200 dark:hover:border-orange-800/50 transition-all duration-300">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1 bg-gradient-to-br from-orange-500/10 to-orange-600/10 dark:from-orange-500/20 dark:to-orange-600/20 rounded-lg group-hover:scale-105 transition-transform">
              <TrophyIcon className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Meta Semanal</span>
          </div>
          <div>
            <div className="flex items-end justify-between mb-1">
              <span className={`text-base font-bold tabular-nums ${weeklyProgress.percentage >= 100 ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                {Math.floor(weeklyProgress.percentage)}%
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums">
                {Math.floor(weeklyProgress.current / 60)}h / {Math.floor(weeklyProgress.target / 60)}h
              </span>
            </div>
            <div className="w-full bg-gray-100/70 dark:bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-1.5 rounded-full animate-fill-bar ${
                  weeklyProgress.percentage >= 100
                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 animate-shimmer'
                    : weeklyProgress.percentage >= 80
                    ? 'bg-gradient-to-r from-orange-400 to-orange-500 animate-shimmer'
                    : 'bg-gradient-to-r from-orange-400 to-orange-500'
                }`}
                style={{ '--fill-width': `${weeklyProgress.percentage}%` } as React.CSSProperties}
              />
            </div>
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

      {/* Gráfico Principal */}
      <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-3.5 rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md transition-all duration-300">
        <h3 className="text-sm font-bold mb-2 dark:text-white">Evolução do Estudo</h3>
        <div className="min-h-[180px]">
          <Line data={lineChartData} options={chartOptions} />
        </div>
      </div>
    </div>
  );
}