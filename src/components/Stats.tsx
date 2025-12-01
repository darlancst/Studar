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
  const { sessions, startSession } = usePomodoroStore();
  const { reviews } = useReviewStore();
  const { studyDates: dates } = useDatesStore();
  const { weeklyGoal } = useSettingsStore();
  const { simulados } = useSimuladosStore();
  const { schedules, weeklyItems, blockItems, completedScheduleItems } = useScheduleStore();
  const isDarkMode = useDarkMode();

  const [period, setPeriod] = useState<StatsPeriod>('week');
  const [customStartDate, setCustomStartDate] = useState(subDays(new Date(), 30).toISOString().split('T')[0]);
  const [customEndDate, setCustomEndDate] = useState(new Date().toISOString().split('T')[0]);

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
    plannedItems = plannedItems.filter(item => !completedScheduleItems.includes(item.id));

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
    <div className="space-y-3 pb-20 animate-fade-in">
      {/* 1. Widget "Agora" - Command Center */}
      <div className="w-full" id="tour-pomodoro-widget">
        {nextSubject ? (
          <div className="relative overflow-hidden bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:shadow-md group">
            {/* Subtle Gradient Background */}
            <div
              className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-transparent to-current opacity-[0.03] dark:opacity-[0.08] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"
              style={{ color: nextSubject.color }}
            />

            <div className="relative z-10 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
              <div className="flex-1 min-w-0 w-full">
                <div className="flex items-center justify-between sm:justify-start gap-3 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    Próxima Sessão
                  </span>
                  {nextItem?.startTime && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700">
                      <ClockIcon className="w-3 h-3 text-gray-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 tabular-nums">
                        {nextItem.startTime} - {nextItem.endTime}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div
                    className="mt-1.5 w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: nextSubject.color }}
                  />
                  <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white leading-tight truncate">
                      {nextSubject.name}
                    </h2>
                    {nextTopic && (
                      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base mt-0.5 line-clamp-1">
                        {nextTopic.title}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleStartSession}
                className="w-full sm:w-auto group/btn relative overflow-hidden bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-xl font-medium text-sm shadow-sm hover:shadow transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <div className="absolute inset-0 bg-white/10 dark:bg-black/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                <PlayIcon className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Iniciar Foco</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center gap-2 min-h-[160px]">
            <div className="w-24 h-24 relative mb-2">
              <img
                src="/dashboard-empty.gif"
                alt="Sem planos"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Sem estudos por hoje</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comemore!</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. Cabeçalho e Filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <h2 className="text-2xl font-bold dark:text-white">Estatísticas</h2>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg overflow-x-auto max-w-full">
          {(['today', 'week', 'month', 'annual', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${period === p
                ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              {p === 'today' && 'Hoje'}
              {p === 'week' && '7 Dias'}
              {p === 'month' && '30 Dias'}
              {p === 'annual' && 'Ano'}
              {p === 'custom' && 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      {period === 'custom' && (
        <div className="flex gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Início</label>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fim</label>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="p-2 border rounded-lg text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
      )}

      {/* 3. Cards de Resumo (KPIs) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" id="tour-stats-kpi">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <ClockIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Tempo Total</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.floor(totalStudyTime / 60)}h {totalStudyTime % 60}m
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Sessões</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalSessions}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <ClipboardDocumentCheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Revisões</span>
          </div>
          <div className="mt-1">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {totalReviews}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <TrophyIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">Meta</span>
          </div>
          <div className="mt-1">
            <div className="flex items-end gap-1 mb-1">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {Math.floor(weeklyProgress.percentage)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-orange-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${weeklyProgress.percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700" id="tour-heatmap">
        <h3 className="text-lg font-semibold mb-1 dark:text-white flex items-center gap-2">
          <FireIcon className="w-5 h-5 text-orange-500" />
          Consistência de Estudos
        </h3>
        <Heatmap />
      </div>

      {/* Gráficos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Evolução do Estudo</h3>
          <div className="flex-1 min-h-[250px]">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
          <h3 className="text-lg font-semibold mb-3 dark:text-white">Distribuição por Matéria</h3>
          <div className="flex-1 min-h-[250px] flex items-center justify-center">
            <Doughnut data={pieChartData} options={pieOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}