'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  TooltipItem
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useReviewStore } from '@/store/reviewStore';
import { useDatesStore } from '@/store/datesStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { format, subDays, startOfToday, endOfToday, isSameDay, parseISO, startOfDay, startOfWeek, endOfWeek, subYears, addDays, formatISO, endOfDay, startOfMonth, subMonths, differenceInDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Subject, Review, PomodoroSession, Topic } from '@/types';
import { useDarkMode } from '@/hooks/useDarkMode';

// Registrando os componentes necessários
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  Title
);

type StatsPeriod = 'today' | 'week' | 'month' | 'annual' | 'custom';

// Variável para throttling do tooltip
let lastTooltipUpdate = 0;

// Tipos para os detalhes das atividades
type DailyActivity = PomodoroSession | Review;

export default function Stats() {
  const [period, setPeriod] = useState<StatsPeriod>('today');
  const [customStartDate, setCustomStartDate] = useState<Date>(startOfToday());
  const [customEndDate, setCustomEndDate] = useState<Date>(endOfToday());
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const isDarkMode = useDarkMode();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);
  
  const heatmapScrollRef = useRef<HTMLDivElement>(null);
  
  // Estado para controlar a tooltip
  const [tooltip, setTooltip] = useState({ 
    show: false, 
    text: '', 
    x: 0, 
    y: 0 
  });
  
  // Estado para detalhes da célula clicada
  const [selectedDateDetails, setSelectedDateDetails] = useState<Date | null>(null);
  const [selectedActivities, setSelectedActivities] = useState<DailyActivity[]>([]);
  
  // Tamanhos para o heatmap (definidos no escopo do componente)
  const heatmapCellSize = 11; // Tamanho do quadrado em pixels
  const heatmapCellGap = 2; // Espaçamento entre células
  
  // Acesso direto aos limiares de tempo do heatmap
  const { heatmapThresholds } = useSettingsStore();
  
  const { getSubjectsWithTopics } = useSubjectStore();
  const { topics } = useTopicStore();
  const { 
    sessions: pomodoroSessions, 
    isRunning, 
    currentTopicId, 
    elapsedSeconds 
  } = usePomodoroStore();
  const { reviews } = useReviewStore();
  const { getDates } = useDatesStore();
  const { resetStats, resetPomodoros, weeklyGoal, weeklyGoalEndDate } = useSettingsStore();
  const { simulados } = useSimuladosStore();
  
  const subjects = getSubjectsWithTopics();
  
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // Defina o breakpoint que considerar mobile, ex: 768px
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);
  
  // Efeito para rolar o heatmap para a direita em mobile
  useEffect(() => {
    if (isMobileView && heatmapScrollRef.current) {
      const container = heatmapScrollRef.current;
      console.log('[HeatmapScroll] Attempting to scroll. isMobileView:', isMobileView);

      requestAnimationFrame(() => {
        setTimeout(() => {
          if (heatmapScrollRef.current) { // Re-verificar ref em caso de unmount
            const currentContainer = heatmapScrollRef.current;
            const targetScrollLeft = currentContainer.scrollWidth - currentContainer.clientWidth;
            
            console.log('[HeatmapScroll] Calculated values:', {
              scrollWidth: currentContainer.scrollWidth,
              clientWidth: currentContainer.clientWidth,
              currentScrollLeft: currentContainer.scrollLeft,
              targetScrollLeft: targetScrollLeft,
            });

            if (targetScrollLeft > 0) {
              // Só rola se houver algo para rolar e se não já estiver na posição correta
              // Adicionar uma pequena tolerância para evitar loops de rolagem se houver pequenas imprecisões de float
              if (Math.abs(currentContainer.scrollLeft - targetScrollLeft) > 1) {
                 currentContainer.scrollLeft = targetScrollLeft;
                 console.log('[HeatmapScroll] Scrolled to:', currentContainer.scrollLeft);
              } else {
                console.log('[HeatmapScroll] Already at target scroll position or close enough.');
              }
            } else {
              console.log('[HeatmapScroll] No scroll needed or not scrollable (scrollWidth <= clientWidth).');
            }
          } else {
            console.log('[HeatmapScroll] Ref became null before scroll execution.');
          }
        }, 100); // Delay aumentado para 100ms para maior segurança no cálculo do layout.
      });
    }
    // Opcional: Resetar scroll para a esquerda se não for mais mobile view e se houver scroll.
    // else if (!isMobileView && heatmapScrollRef.current && heatmapScrollRef.current.scrollLeft > 0) {
    //   heatmapScrollRef.current.scrollLeft = 0;
    //   console.log('[HeatmapScroll] Reset scroll to left for desktop view.');
    // }
  }, [isMobileView, pomodoroSessions]); 
  
  // Calcula as datas do período selecionado
  const calculateDateRange = (): { startDate: Date; endDate: Date } => {
    const today = startOfToday(); 
    const endOfCurrentDay = endOfToday();
    let startDate: Date;
    let endDate: Date;
    
    switch (period) {
      case 'today':
        startDate = today;
        endDate = endOfCurrentDay;
        break;
      case 'week':
        startDate = startOfDay(subDays(today, 6));
        endDate = endOfCurrentDay;
        break;
      case 'month':
        startDate = startOfDay(subDays(today, 29));
        endDate = endOfCurrentDay;
        break;
      case 'annual':
        startDate = startOfDay(subYears(today, 1));
        endDate = endOfCurrentDay;
        break;
      case 'custom':
        startDate = startOfDay(customStartDate);
        endDate = endOfDay(customEndDate);
        break;
      default:
        startDate = today;
        endDate = endOfCurrentDay;
        break;
    }
    return { startDate, endDate };
  };
  
  // Formata o tempo de estudo
  const formatStudyTime = (minutes: number): string => {
    // Arredonda para evitar casas decimais desnecessárias
    const roundedMinutes = Math.round(minutes);
    
    if (roundedMinutes < 1) return '0 min';
    
    const hours = Math.floor(roundedMinutes / 60);
    const remainingMinutes = roundedMinutes % 60;
    
    if (hours === 0) {
      return `${roundedMinutes} min`;
    } else {
      return `${hours}h${remainingMinutes > 0 ? `:${remainingMinutes.toString().padStart(2, '0')}` : ''}`;
    }
  };
  
  // Filtra as sessões Pomodoro pelo período
  const getFilteredPomodoroSessions = (): PomodoroSession[] => {
    const { startDate, endDate } = calculateDateRange();
    return pomodoroSessions.filter((session: PomodoroSession) => {
      const sessionDate = parseISO(session.date); // Converte ISO string para Date
      return sessionDate >= startDate && sessionDate <= endDate;
    });
  };
  
  // Filtra as revisões pelo período
  const getFilteredReviews = (): Review[] => {
    const { startDate, endDate } = calculateDateRange();
    return reviews.filter((review: Review) => {
      const reviewDate = review.completed && review.date ? new Date(review.date) : new Date(review.scheduledDate);
      return reviewDate >= startDate && reviewDate <= endDate;
    });
  };

  // Encontra o Subject ID a partir do Topic ID
  const findSubjectIdForTopic = (topicId: string): string | null => {
    for (const subject of subjects) {
      if (subject.topics.some((t: Topic) => t.id === topicId)) {
        return subject.id;
      }
    }
    return null;
  };
  
  // Obtém os dados de sessão por assunto, incluindo sessão Pomodoro ativa
  const getSessionsBySubject = (): Map<string, { time: number; color: string }> => {
    const { startDate, endDate } = calculateDateRange(); // Pega as datas do período selecionado em Stats

    // Filtra as sessões JÁ SALVAS que estão dentro do período selecionado
    const filteredSavedSessions = pomodoroSessions.filter((session: PomodoroSession) => {
      try {
        const sessionDate = parseISO(session.date);
        return sessionDate >= startDate && sessionDate <= endDate;
      } catch (e) {
        console.error("Error parsing session date in getSessionsBySubject:", session.date, e);
        return false;
      }
    });

    const subjectMap = new Map<string, { time: number; color: string }>();

    // Inicializa o mapa com todas as matérias (tempo 0)
    subjects.forEach(subject => {
      subjectMap.set(subject.id, { time: 0, color: subject.color });
    });

    // Soma a duração das sessões SALVAS para cada matéria
    filteredSavedSessions.forEach((session: PomodoroSession) => {
      const subjectId = findSubjectIdForTopic(session.topicId);
      if (subjectId) {
        const subjectData = subjectMap.get(subjectId);
        if (subjectData) {
          subjectMap.set(subjectId, { 
            time: subjectData.time + session.duration, // Soma a duração salva
            color: subjectData.color 
          });
        }
      }
    });

    // ADICIONA o tempo da sessão ATIVA, se houver e estiver no período
    if (isRunning && currentTopicId) {
      // Verifica se o dia atual está dentro do período selecionado
      const today = new Date();
      if (today >= startDate && today <= endDate) {
        const subjectId = findSubjectIdForTopic(currentTopicId);
        if (subjectId) {
          const subjectData = subjectMap.get(subjectId);
          const currentSessionMinutes = Math.floor(elapsedSeconds / 60);
          
          if (subjectData) {
            // Adiciona os minutos da sessão ativa ao tempo já existente da matéria
            subjectMap.set(subjectId, {
              time: subjectData.time + currentSessionMinutes,
              color: subjectData.color
            });
          } else {
            // Se a matéria da sessão ativa não tinha sessões salvas no período,
            // inicializa ela no mapa apenas com o tempo da sessão ativa.
            const subject = subjects.find(s => s.id === subjectId);
            if (subject) {
              subjectMap.set(subjectId, {
                time: currentSessionMinutes,
                color: subject.color
              });
            }
          }
        }
      }
    }

    return subjectMap;
  };
  
  // Calcula o tempo total de estudo - SIMPLIFICADO
  const calculateTotalStudyTime = (): number => {
    // Pega o mapa de tempo por assunto já filtrado pelo período
    const subjectMap = getSessionsBySubject();
    let totalTimeFromSaved = 0;
    subjectMap.forEach(value => {
      totalTimeFromSaved += value.time;
    });

    // Retorna apenas o tempo total das sessões salvas
    return totalTimeFromSaved;
  };
  
  // Calcula o tempo médio por sessão Pomodoro
  const calculateAverageSessionTime = (): number => {
    const filteredSessions = getFilteredPomodoroSessions();
    if (filteredSessions.length === 0) return 0;
    const totalTime = filteredSessions.reduce((acc: number, session: PomodoroSession) => acc + session.duration, 0);
    return Math.round(totalTime / filteredSessions.length);
  };
  
  // Conta as revisões completadas no período
  const countCompletedReviews = (): number => {
    const filteredReviews = getFilteredReviews();
    return filteredReviews.filter(review => review.completed).length;
  };
  
  // Prepara os dados para o gráfico de pizza - SIMPLIFICADO
  const getPieChartData = () => {
    // Pega o mapa de tempo por assunto já filtrado pelo período
    const subjectMap = getSessionsBySubject(); 
    
    // Prepara os dados do gráfico diretamente do subjectMap
    const labels: string[] = [];
    const data: number[] = [];
    const backgroundColors: string[] = [];
    const borderColors: string[] = [];

    subjectMap.forEach((value, key) => {
        const subject = subjects.find(s => s.id === key);
        if (subject && value.time > 0) { // Apenas adiciona se houver tempo
              labels.push(subject.name);
            data.push(value.time); // Usa diretamente o tempo acumulado das sessões salvas
              backgroundColors.push(value.color + '80'); 
              borderColors.push(value.color);
            }
    });
    
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    };
  };
  
  // Prepara dados para gráfico de barras (Revisões Completadas vs. Pendentes)
  const getBarChartData = () => {
    const filteredReviews = getFilteredReviews(); // Pega revisões filtradas pelo período
    const completed = filteredReviews.filter(review => review.completed).length;
    const pending = filteredReviews.filter(review => !review.completed).length;
    
    return {
      labels: ['Completadas', 'Pendentes'], // Labels para as barras
      datasets: [
        {
          label: 'Número de Revisões', // Label geral do dataset
          data: [completed, pending], // Dados: [contagem_completadas, contagem_pendentes]
          backgroundColor: [
            'rgba(75, 192, 192, 0.6)', // Cor para completadas
            'rgba(255, 159, 64, 0.6)' // Cor para pendentes
          ],
          borderColor: [
            'rgb(75, 192, 192)',
            'rgb(255, 159, 64)'
          ],
          borderWidth: 1,
        },
      ],
    };
  };
  

  
  // Calcula o tempo total de estudo na semana atual - SIMPLIFICADO
  const calculateWeeklyStudyTime = (): number => {
    // Obtém o período da semana atual (Domingo a Sábado)
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 0 }); 
    const weekEnd = endOfWeek(today, { weekStartsOn: 0 });
    
    // Filtra todas as sessões pela semana atual
    const weeklySessions = pomodoroSessions.filter((session: PomodoroSession) => {
      const sessionDate = parseISO(session.date);
      return sessionDate >= weekStart && sessionDate <= weekEnd;
    });
    
    // Soma todas as sessões da semana
    const weeklyTotal = weeklySessions.reduce((total: number, session: PomodoroSession) => 
      total + session.duration, 0);
    
    return weeklyTotal;
  };
  
  // Prepara os dados para o heatmap (Refatorado com Logs)
  const getHeatMapData = () => {
    console.log("Calculando dados do Heatmap...");
    // Se não tiver sessões, retorna vazio imediatamente
    if (!pomodoroSessions || pomodoroSessions.length === 0) {
      console.log("Heatmap: Sem sessões para processar.");
      return [];
    }
    
    // Contar o TEMPO TOTAL (minutos) estudado em cada dia
    const dateDurationMap = new Map<string, number>();
    
    // Soma a duração das sessões por dia
    for (const session of pomodoroSessions) {
      // Pula sessões sem data ou duração válida (precaução)
      if (!session.date || session.duration == null) continue; 
      
      try {
      const dateStr = session.date.split('T')[0]; // Formato YYYY-MM-DD
        const currentDuration = dateDurationMap.get(dateStr) || 0;
        dateDurationMap.set(dateStr, currentDuration + session.duration);
      } catch (error) {
        console.error("Erro ao processar data da sessão para heatmap:", session.date, error);
      }
    }
    
    console.log("Heatmap - Mapa de Duração por Data:", dateDurationMap);
    
    // Converte para o formato esperado pelo heatmap, filtrando dias com 0 minutos
    const heatmapData = Array.from(dateDurationMap.entries())
      .filter(([date, totalMinutes]) => totalMinutes > 0) 
      .map(([date, totalMinutes]) => {
        let formattedDate = date; // Fallback
        let formattedTime = `${totalMinutes} min`; // Fallback
        try {
      const parsedDate = parseISO(date);
          formattedDate = format(parsedDate, "dd 'de' MMMM, yyyy", { locale: pt });
          formattedTime = formatStudyTime(totalMinutes); 
        } catch (error) {
            console.error("Erro ao formatar data/hora do heatmap:", date, totalMinutes, error);
        }
      
      return {
          date, // Mantém YYYY-MM-DD para o componente HeatMap
          count: totalMinutes, // Passa os minutos totais
          content: `${formattedDate}: ${formattedTime} de estudo` 
      };
    });

    console.log("Heatmap - Dados Finais:", heatmapData);
    
    return heatmapData;
  };
  
  // Função para buscar atividades de uma data específica
  const getActivitiesForDate = (date: Date): DailyActivity[] => {
    const activities: DailyActivity[] = [];
    
    // Buscar Sessões Pomodoro
    const daySessions = pomodoroSessions.filter(session => 
      isSameDay(parseISO(session.date), date)
    );
    activities.push(...daySessions);
    
    // Buscar Revisões (concluídas ou agendadas para o dia)
    const dayReviews = reviews.filter(review => {
      const reviewDate = review.completed && review.date ? new Date(review.date) : new Date(review.scheduledDate);
      return isSameDay(reviewDate, date);
    });
    activities.push(...dayReviews);
    
    // Ordenar por data/hora (opcional, mas útil)
    activities.sort((a, b) => {
        const dateA = (a as PomodoroSession).date || (a as Review).date || (a as Review).scheduledDate;
        const dateB = (b as PomodoroSession).date || (b as Review).date || (b as Review).scheduledDate;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
    });

    return activities;
  };
  
  // Handler para clique na célula
  const handleCellClick = (date: Date | null) => {
    if (date) {
      const activities = getActivitiesForDate(date);
      setSelectedDateDetails(date);
      setSelectedActivities(activities);
    } else {
      // Se clicar em célula vazia ou fora do range, limpa a seleção
      setSelectedDateDetails(null);
      setSelectedActivities([]);
    }
  };
  
  // --- Renderização --- 
  const totalStudyTime = calculateTotalStudyTime();
  const weeklyStudyTime = calculateWeeklyStudyTime();
  const remainingTimeToGoal = Math.max(0, weeklyGoal - weeklyStudyTime);
  const isGoalCompleted = remainingTimeToGoal <= 0;
  const today = new Date();
  const weekEndDate = endOfWeek(today, { weekStartsOn: 0 });
  const formattedWeekEndDate = format(weekEndDate, "dd 'de' MMMM", { locale: pt });
  const averageSessionTime = calculateAverageSessionTime();
  const completedReviewsCount = countCompletedReviews();
  const totalDatesStudied = getDates().length;
  
  // Efeito para mostrar o confete quando a meta for atingida
  useEffect(() => {
    if (isGoalCompleted && period === 'week') {
      setShowConfetti(true);
      
      // Remove o confete após 3 segundos
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isGoalCompleted, period]);
  
  // Formata o tempo restante para atingir a meta
  const formatRemainingTime = (): string => {
    if (isGoalCompleted) return "Meta atingida!";
    return formatStudyTime(remainingTimeToGoal);
  };

  // Calcula a porcentagem de progresso
  const weeklyProgress = Math.min(100, Math.round((weeklyStudyTime / weeklyGoal) * 100));

  // ========== NOVAS FUNCIONALIDADES ==========
  
  // 1. COMPARATIVO TEMPORAL INTELIGENTE
  const temporalComparisons = useMemo(() => {
    const now = new Date();
    const currentWeekStart = startOfWeek(now, { weekStartsOn: 0 });
    const lastWeekStart = subDays(currentWeekStart, 7);
    const lastWeekEnd = subDays(currentWeekStart, 1);
    
    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = subMonths(currentMonthStart, 1);
    const lastMonthEnd = subDays(currentMonthStart, 1);
    
    // Tempo desta semana vs semana passada
    const thisWeekTime = weeklyStudyTime;
    const lastWeekTime = getFilteredPomodoroSessions()
      .filter(session => {
        const sessionDate = parseISO(session.date);
        return sessionDate >= lastWeekStart && sessionDate <= lastWeekEnd;
      })
      .reduce((total, session) => total + session.duration, 0);
    
    // Tempo este mês vs mês passado
    const thisMonthTime = getFilteredPomodoroSessions()
      .filter(session => {
        const sessionDate = parseISO(session.date);
        return sessionDate >= currentMonthStart;
      })
      .reduce((total, session) => total + session.duration, 0);
    
    const lastMonthTime = getFilteredPomodoroSessions()
      .filter(session => {
        const sessionDate = parseISO(session.date);
        return sessionDate >= lastMonthStart && sessionDate <= lastMonthEnd;
      })
      .reduce((total, session) => total + session.duration, 0);
    
    // Simulados este mês vs mês passado
    const currentMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');
    
    const thisMonthSimulados = simulados.filter(s => s.date.startsWith(currentMonth)).length;
    const lastMonthSimulados = simulados.filter(s => s.date.startsWith(lastMonth)).length;
    
    // Melhor e pior dia da semana (média histórica)
    const dayAverages = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dayIndex];
      const daySessions = getFilteredPomodoroSessions()
        .filter(session => parseISO(session.date).getDay() === dayIndex);
      
      const totalTime = daySessions.reduce((sum, session) => sum + session.duration, 0);
      const avgTime = daySessions.length > 0 ? totalTime / daySessions.length : 0;
      
      return { day: dayName, avgTime, totalSessions: daySessions.length };
    }).filter(day => day.totalSessions > 0);
    
    const bestDay = dayAverages.reduce((best, current) => 
      current.avgTime > best.avgTime ? current : best, 
      dayAverages[0] || { day: 'N/A', avgTime: 0 }
    );
    
    const worstDay = dayAverages.reduce((worst, current) => 
      current.avgTime < worst.avgTime ? current : worst,
      dayAverages[0] || { day: 'N/A', avgTime: 0 }
    );
    
    return {
      weekComparison: { current: thisWeekTime, previous: lastWeekTime },
      monthComparison: { current: thisMonthTime, previous: lastMonthTime },
      simuladosComparison: { current: thisMonthSimulados, previous: lastMonthSimulados },
      bestDay,
      worstDay
    };
  }, [weeklyStudyTime, simulados, period]);
  
  // 2. SISTEMA DE METAS DINÂMICAS
  const dynamicGoals = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const daysInWeek = 7;
    const daysPassed = differenceInDays(now, weekStart) + 1; // +1 para incluir hoje
    const daysRemaining = daysInWeek - daysPassed;
    
    // Meta diária baseada na meta semanal
    const dailyGoal = weeklyGoal / daysInWeek;
    
    // Tempo estudado hoje
    const todayTime = getFilteredPomodoroSessions()
      .filter(session => isSameDay(parseISO(session.date), now))
      .reduce((total, session) => total + session.duration, 0);
    
    // Progresso da meta diária
    const dailyProgress = Math.min(100, Math.round((todayTime / dailyGoal) * 100));
    
    // Projeção semanal baseada no ritmo atual
    const projectedWeeklyTime = daysPassed > 0 ? (weeklyStudyTime / daysPassed) * daysInWeek : 0;
    
    // Tempo necessário por dia restante para atingir meta
    const timeNeededPerRemainingDay = daysRemaining > 0 ? 
      Math.max(0, (weeklyGoal - weeklyStudyTime) / daysRemaining) : 0;
    
    return {
      dailyGoal,
      todayTime,
      dailyProgress,
      projectedWeeklyTime,
      timeNeededPerRemainingDay,
      daysRemaining,
      daysPassed
    };
  }, [weeklyStudyTime, weeklyGoal]);
  
  // 3. INSIGHTS DA SEMANA
  const weeklyInsights = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    
    // Revisões desta semana
    const thisWeekReviews = reviews.filter(review => {
      if (!review.completed) return false;
      const reviewDate = new Date(review.date);
      return reviewDate >= weekStart;
    });
    
    // Tópico mais revisado
    const topicReviewCounts = thisWeekReviews.reduce((acc, review) => {
      acc[review.topicId] = (acc[review.topicId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostReviewedTopicId = Object.entries(topicReviewCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    
    const mostReviewedTopic = mostReviewedTopicId ? 
      topics.find((t: Topic) => t.id === mostReviewedTopicId) : null;
    
    const mostReviewedCount = topicReviewCounts[mostReviewedTopicId] || 0;
    
    // Performance em simulados desta semana
    const thisWeekSimulados = simulados.filter(s => {
      const simuladoDate = parseISO(s.date);
      return simuladoDate >= weekStart;
    });
    
    let bestPerformanceSubject = null;
    let worstPerformanceSubject = null;
    let avgPerformance = 0;
    
    if (thisWeekSimulados.length > 0) {
      // Performance por matéria
      const subjectPerformances = subjects.map(subject => {
        const subjectSimulados = thisWeekSimulados.filter(s => s.subjectId === subject.id);
        if (subjectSimulados.length === 0) return null;
        
        const avgScore = subjectSimulados.reduce((acc, s) => acc + (s.hits / s.questions), 0) / subjectSimulados.length * 100;
        return { subject, avgScore, count: subjectSimulados.length };
      }).filter(Boolean);
      
      if (subjectPerformances.length > 0) {
        bestPerformanceSubject = subjectPerformances.reduce((best, current) => 
          current!.avgScore > best!.avgScore ? current : best
        );
        worstPerformanceSubject = subjectPerformances.reduce((worst, current) => 
          current!.avgScore < worst!.avgScore ? current : worst
        );
      }
      
      // Performance média geral desta semana
      avgPerformance = thisWeekSimulados.reduce((acc, s) => acc + (s.hits / s.questions), 0) / thisWeekSimulados.length * 100;
    }
    
    // Matéria com mais tempo estudado
    const subjectStudyTime = subjects.map(subject => {
      const subjectTime = getFilteredPomodoroSessions()
        .filter(session => {
          const sessionDate = parseISO(session.date);
          if (sessionDate < weekStart) return false;
          
          const topic = topics.find((t: Topic) => t.id === session.topicId);
          return topic?.subjectId === subject.id;
        })
        .reduce((total, session) => total + session.duration, 0);
      
      return { subject, time: subjectTime };
    }).filter(item => item.time > 0);
    
    const mostStudiedSubject = subjectStudyTime.reduce((most, current) => 
      current.time > most.time ? current : most,
      subjectStudyTime[0] || null
    );
    
    return {
      mostReviewedTopic,
      mostReviewedCount,
      bestPerformanceSubject,
      worstPerformanceSubject,
      avgPerformance,
      mostStudiedSubject,
      thisWeekSimulados: thisWeekSimulados.length
    };
  }, [reviews, topics, subjects, simulados]);
  
  const pieChartData = getPieChartData();
  const barChartData = getBarChartData();
  
  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' as const },
      title: { display: true, text: 'Distribuição do tempo por disciplina' },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<"pie">) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed !== null) {
              // Usa a função formatStudyTime para exibir "Xh:Ymin" ou "Z min"
              label += formatStudyTime(context.parsed); 
            }
            return label;
          }
        }
      }
    },
  };
  
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Coloca as labels no eixo Y para melhor leitura
    scales: {
       x: { // Eixo X agora representa a contagem
          beginAtZero: true,
          title: { display: true, text: 'Quantidade' }
       }
       // Não precisa mais do eixo Y explícito para as labels
    },
    plugins: {
      legend: { display: false }, // Legenda não é tão necessária com labels diretas
      title: { display: true, text: 'Revisões Completadas vs. Pendentes' }, // Título está correto
    },
  };
  


  // Prepara os dados para os gráficos com cores adaptadas ao tema
  const getChartOptions = (options: any) => {
    return {
      ...options,
      scales: options.scales 
        ? {
            ...options.scales,
            y: options.scales.y 
              ? {
                  ...options.scales.y,
                  ticks: { color: isDarkMode ? 'white' : undefined },
                  grid: { color: isDarkMode ? '#444' : undefined },
                  title: options.scales.y.title 
                    ? {
                        ...options.scales.y.title,
                        color: isDarkMode ? 'white' : undefined
                      }
                    : undefined
                }
              : undefined,
            x: {
              ticks: { color: isDarkMode ? 'white' : undefined },
              grid: { color: isDarkMode ? '#444' : undefined }
            }
          }
        : undefined,
      plugins: {
        ...options.plugins,
        legend: {
          ...options.plugins.legend,
          labels: {
            color: isDarkMode ? 'white' : undefined
          }
        },
        title: {
          ...options.plugins.title,
          color: isDarkMode ? 'white' : undefined
        }
      }
    };
  };

  // Função para resetar os pomodoros completados no período de 1 dia
  const handleResetDailyPomodoros = () => {
    resetPomodoros();
    // Recarrega os dados
    setRefreshCounter(prev => prev + 1);
  };

  // Função para resetar todas as estatísticas
  const handleResetAllStats = () => {
    resetStats();
    setShowResetConfirm(false);
    // Recarrega os dados
    setRefreshCounter(prev => prev + 1);
  };

  // Formata a data final da meta salva no store
  const formattedGoalEndDate = weeklyGoalEndDate 
    ? format(parseISO(weeklyGoalEndDate), "dd 'de' MMMM", { locale: pt })
    : "Definir Meta"; // Texto placeholder se a data não estiver definida

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0">
        <div className="flex items-center">
          <h2 className="text-2xl font-bold dark:text-white">Dashboard</h2>
        </div>
        {/* Seletor de período */}
        <div className="flex space-x-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto">
          {(['today', 'week', 'month', 'annual', 'custom'] as StatsPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-sm transition-colors flex-shrink-0 ${
                period === p
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300'
              }`}
            >
              { {today: 'Hoje', week: 'Semana', month: 'Mês', annual: 'Anual', custom: 'Personalizado'}[p] }
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 relative">
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          <div className="confetti-container">
            {Array.from({ length: 50 }).map((_, index) => (
              <div 
                key={index}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-5%`,
                  animationDelay: `${Math.random() * 3}s`,
                  backgroundColor: [
                    '#1a73e8', '#ea4335', '#34a853', '#fbbc04', 
                    '#ff6d01', '#9c27b0', '#673ab7', '#2196f3'
                  ][Math.floor(Math.random() * 8)],
                  width: `${5 + Math.random() * 7}px`,
                  height: `${5 + Math.random() * 7}px`,
                }}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Inputs de Data Personalizada (aparem condicionalmente) */}
      {period === 'custom' && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="w-full sm:w-auto">
            <label htmlFor="customStartDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data de Início:
            </label>
            <input
              type="date"
              id="customStartDate"
              value={format(customStartDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  setCustomStartDate(startOfDay(parseISO(dateValue)));
                }
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              max={format(customEndDate, 'yyyy-MM-dd')} 
            />
          </div>
          <div className="w-full sm:w-auto">
            <label htmlFor="customEndDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Data de Fim:
            </label>
            <input
              type="date"
              id="customEndDate"
              value={format(customEndDate, 'yyyy-MM-dd')}
              onChange={(e) => {
                const dateValue = e.target.value;
                if (dateValue) {
                  setCustomEndDate(endOfDay(parseISO(dateValue)));
                }
              }}
              className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
              min={format(customStartDate, 'yyyy-MM-dd')} 
            />
          </div>
        </div>
      )}
      
      {/* ========== SEÇÃO 1: MÉTRICAS DEPENDENTES DO FILTRO ========== */}
      
      {/* Principais cards de estatísticas - dependem do filtro de tempo */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
            <h3 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
              📚 Tempo Total
            </h3>
            <p className="text-lg sm:text-xl font-bold dark:text-white break-words">{formatStudyTime(totalStudyTime)}</p>
        </div>
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
            <h3 className="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-1">
              ✅ Revisões Feitas
            </h3>
            <p className="text-lg sm:text-xl font-bold dark:text-white">{completedReviewsCount}</p>
        </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            <h3 className="text-xs font-medium text-indigo-700 dark:text-indigo-300 mb-1">
              📅 Dias Estudados
            </h3>
            <p className="text-lg sm:text-xl font-bold dark:text-white">{totalDatesStudied}</p>
      </div>
          <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
            <h3 className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
              🕒 Último Estudo
            </h3>
            <p className="text-xs sm:text-sm font-semibold dark:text-white">
                {(() => {
                  const dates = getDates();
                  if (dates.length === 0) return 'Nenhum';
                  const dateObjects = dates.map(dStr => {
                    try {
                      if (dStr.includes('T')) return parseISO(dStr);
                      return parseISO(dStr + 'T00:00:00'); 
                    } catch (e) {
                      console.error("Erro ao parsear data de getDates:", dStr, e);
                      return new Date(NaN); 
                    }
                }).filter(d => !isNaN(d.getTime()));

                if (dateObjects.length === 0) return 'N/A';

                  const maxTimestamp = Math.max(...dateObjects.map(d => d.getTime()));
                return format(new Date(maxTimestamp), 'dd/MM', { locale: pt });
                })()}
            </p>
          </div>
        </div>

        {/* Gráficos - dependem do filtro de tempo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico de pizza */}
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg h-56">
            <h3 className="text-sm font-medium mb-2 text-center dark:text-white">📊 Distribuição por Matéria</h3>
            {pieChartData.labels.length > 0 ? (
              <Pie data={pieChartData} options={getChartOptions(pieOptions)} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                Sem dados de tempo para o período.
              </div>
            )}
          </div>
          
          {/* Gráfico de barras */}
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg h-56">
            <h3 className="text-sm font-medium mb-2 text-center dark:text-white">📈 Revisões por Status</h3>
            <Bar data={barChartData} options={getChartOptions(barOptions)} />
          </div>
        </div>

        {/* Comparativo temporal - relacionado ao filtro de tempo */}
        <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center">
            📊 Comparativo Temporal
          </h3>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
              <p className="font-medium text-blue-700 dark:text-blue-300">Esta Semana</p>
              <p className="text-lg font-bold">{formatStudyTime(temporalComparisons.weekComparison.current)}</p>
              <p className={`text-xs ${temporalComparisons.weekComparison.current >= temporalComparisons.weekComparison.previous ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {temporalComparisons.weekComparison.previous === 0 ? 'Primeira semana' : 
                  `${temporalComparisons.weekComparison.current >= temporalComparisons.weekComparison.previous ? '+' : ''}${formatStudyTime(temporalComparisons.weekComparison.current - temporalComparisons.weekComparison.previous)}`
                }
              </p>
            </div>
            
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
              <p className="font-medium text-blue-700 dark:text-blue-300">Este Mês</p>
              <p className="text-lg font-bold">{formatStudyTime(temporalComparisons.monthComparison.current)}</p>
              <p className={`text-xs ${temporalComparisons.monthComparison.current >= temporalComparisons.monthComparison.previous ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {temporalComparisons.monthComparison.previous === 0 ? 'Primeiro mês' :
                  `${temporalComparisons.monthComparison.current >= temporalComparisons.monthComparison.previous ? '+' : ''}${formatStudyTime(temporalComparisons.monthComparison.current - temporalComparisons.monthComparison.previous)}`
                }
              </p>
            </div>
            
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
              <p className="font-medium text-blue-700 dark:text-blue-300">Melhor Dia</p>
              <p className="text-sm font-bold">{temporalComparisons.bestDay.day}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{formatStudyTime(temporalComparisons.bestDay.avgTime)} média</p>
            </div>
            
            <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
              <p className="font-medium text-blue-700 dark:text-blue-300">Simulados</p>
              <p className="text-lg font-bold">{temporalComparisons.simuladosComparison.current}</p>
              <p className={`text-xs ${temporalComparisons.simuladosComparison.current >= temporalComparisons.simuladosComparison.previous ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {temporalComparisons.simuladosComparison.previous === 0 ? 'Primeiro mês' :
                  `${temporalComparisons.simuladosComparison.current >= temporalComparisons.simuladosComparison.previous ? '+' : ''}${temporalComparisons.simuladosComparison.current - temporalComparisons.simuladosComparison.previous} vs mês anterior`
                }
              </p>
            </div>
          </div>
        </div>

        {/* ========== SEÇÃO 2: METAS E INSIGHTS ========== */}

        {/* Sistema de Metas - foco principal semanal */}
        <div className={`p-3 ${isGoalCompleted ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800' : 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'} rounded-lg border`}>
          <h3 className="text-sm font-semibold text-green-700 dark:text-green-300 mb-3 flex items-center">
            🎯 Sistema de Metas
          </h3>
          
          <div className="space-y-3">
            {/* Meta Semanal Principal */}
            <div className="p-3 bg-white/70 dark:bg-gray-800/70 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Meta Semanal</span>
                <span className={`text-sm font-bold ${isGoalCompleted ? 'text-green-600 dark:text-green-400' : 'text-green-700 dark:text-green-300'}`}>
                  {weeklyProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${isGoalCompleted ? 'bg-green-600 dark:bg-green-500' : 'bg-green-600 dark:bg-green-500'}`}
                  style={{ width: `${Math.min(100, weeklyProgress)}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-bold text-green-700 dark:text-green-300">
                    {isGoalCompleted ? (
                      <span className="flex items-center text-green-600 dark:text-green-400">
                        Parabéns! 🎉
                      </span>
                    ) : (
                      formatRemainingTime()
                    )}
                  </p>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {isGoalCompleted ? "Meta concluída!" : "Faltando"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Meta: {formatStudyTime(weeklyGoal)}</span>
                  <br />
                  <span className="text-xs text-green-600 dark:text-green-400">Atual: {formatStudyTime(weeklyStudyTime)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Meta Diária */}
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Progresso Hoje</span>
                  <span className="text-xs font-bold text-green-700 dark:text-green-300">{dynamicGoals.dailyProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div 
                    className="bg-green-600 dark:bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, dynamicGoals.dailyProgress)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-green-600 dark:text-green-400">{formatStudyTime(dynamicGoals.todayTime)}</span>
                  <span className="text-gray-500 dark:text-gray-400">Meta: {formatStudyTime(dynamicGoals.dailyGoal)}</span>
                </div>
              </div>

              {/* Projeção Semanal */}
              <div className="p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-xs font-medium text-green-700 dark:text-green-300 mb-1">Projeção Semanal</p>
                <p className="text-lg font-bold text-green-700 dark:text-green-300">
                  {formatStudyTime(dynamicGoals.projectedWeeklyTime)}
                </p>
                <p className={`text-xs ${dynamicGoals.projectedWeeklyTime >= weeklyGoal ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {dynamicGoals.projectedWeeklyTime >= weeklyGoal ? 
                    `✅ Meta será atingida!` : 
                    dynamicGoals.daysRemaining > 0 ?
                      `Precisa de ${formatStudyTime(dynamicGoals.timeNeededPerRemainingDay)}/dia` :
                      `Meta não atingida desta vez`
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Insights da Semana - dependem do filtro */}
        {(weeklyInsights.mostReviewedTopic || weeklyInsights.bestPerformanceSubject || weeklyInsights.mostStudiedSubject) && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-2 flex items-center">
              💡 Insights da Semana
            </h3>
            
            <div className="space-y-2 text-xs">
              {weeklyInsights.mostReviewedTopic && (
                <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="text-purple-600 dark:text-purple-400">📚</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    <strong>Tópico mais revisado:</strong> {weeklyInsights.mostReviewedTopic.title} ({weeklyInsights.mostReviewedCount} revisões)
                  </span>
                </div>
              )}
              
              {weeklyInsights.bestPerformanceSubject && (
                <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="text-purple-600 dark:text-purple-400">🏆</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    <strong>Melhor performance:</strong> {weeklyInsights.bestPerformanceSubject.subject.name} ({weeklyInsights.bestPerformanceSubject.avgScore.toFixed(1)}% média)
                  </span>
                </div>
              )}

              {weeklyInsights.worstPerformanceSubject && weeklyInsights.worstPerformanceSubject !== weeklyInsights.bestPerformanceSubject && (
                <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="text-purple-600 dark:text-purple-400">⚠️</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    <strong>Precisa de atenção:</strong> {weeklyInsights.worstPerformanceSubject.subject.name} ({weeklyInsights.worstPerformanceSubject.avgScore.toFixed(1)}% média)
                  </span>
                </div>
              )}
              
              {weeklyInsights.mostStudiedSubject && (
                <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="text-purple-600 dark:text-purple-400">⏱️</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    <strong>Mais estudada:</strong> {weeklyInsights.mostStudiedSubject.subject.name} ({formatStudyTime(weeklyInsights.mostStudiedSubject.time)})
                  </span>
                </div>
              )}

              {weeklyInsights.thisWeekSimulados > 0 && (
                <div className="flex items-center gap-2 p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                  <span className="text-purple-600 dark:text-purple-400">📝</span>
                  <span className="text-gray-800 dark:text-gray-200">
                    <strong>Simulados esta semana:</strong> {weeklyInsights.thisWeekSimulados} realizados
                    {weeklyInsights.avgPerformance > 0 && (
                      <span className="ml-1">({weeklyInsights.avgPerformance.toFixed(1)}% média)</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== SEÇÃO 3: DADOS GERAIS (NÃO DEPENDEM DO FILTRO) ========== */}
        
        {/* Performance em Simulados - visão geral */}
        {simulados.length > 0 && (
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
              <h3 className="text-sm font-semibold text-purple-700 dark:text-purple-300">📊 Performance em Simulados</h3>
              <button
                onClick={() => {
                  const event = new CustomEvent('navigate-to-simulados');
                  window.dispatchEvent(event);
                }}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 font-medium underline sm:self-auto self-start"
              >
                Ver análise completa →
              </button>
            </div>
            
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {simulados.length}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Total</p>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {simulados.length > 0 
                    ? (simulados.reduce((acc, s) => acc + (s.hits / s.questions), 0) / simulados.length * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Média Geral</p>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-gray-800/50 rounded">
                <p className="text-lg font-bold text-purple-700 dark:text-purple-300">
                  {simulados.filter(s => s.date.startsWith(format(new Date(), 'yyyy-MM'))).length}
                </p>
                <p className="text-xs text-purple-600 dark:text-purple-400">Este Mês</p>
              </div>
            </div>
          </div>
        )}

        {/* Histórico de Atividades - Heatmap */}
        <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <h3 className="text-base font-medium mb-3 text-center dark:text-white">Histórico de Atividades</h3>
          <div ref={heatmapScrollRef} className="w-full overflow-x-auto" 
               aria-label="Histórico de atividades de estudo" 
               role="figure" 
               aria-description="Mapa de calor mostrando a frequência de sessões de estudo durante os últimos 12 meses">
            {(() => {
              // 1. Obter os dados para o heatmap de forma simplificada
              const heatmapData = (() => {
                // Se não tiver sessões, retorna vazio
                if (!pomodoroSessions || pomodoroSessions.length === 0) {
                  return [];
                }
                
                // Contar o tempo estudado em cada dia
                const dateDurationMap = new Map<string, number>();
                
                pomodoroSessions.forEach(session => {
                  if (!session.date || session.duration == null) return;
                  
                  try {
                    const dateStr = session.date.split('T')[0]; // YYYY-MM-DD
                    const currentDuration = dateDurationMap.get(dateStr) || 0;
                    dateDurationMap.set(dateStr, currentDuration + session.duration);
                  } catch (error) {
                    console.error("Erro ao processar data:", error);
                  }
                });
                
                // Converter para o formato do heatmap
                return Array.from(dateDurationMap.entries())
                  .filter(([_, minutes]) => minutes > 0)
                  .map(([date, minutes]) => ({
                    date,
                    count: minutes,
                    content: `${date}: ${formatStudyTime(minutes)}`
                  }));
              })();
              
              // 2. Funções auxiliares para o heatmap
              const getColor = (count: number) => {
                if (!count || count === 0) return isDarkMode ? '#2d3748' : '#f3f4f6';
                
                // Esquema de cores para diferentes níveis de atividade - melhor gradiente para modo escuro
                const colorLevels = isDarkMode 
                  ? ['#4f46e530', '#4f46e545', '#6366f160', '#7c3aed75', '#9333ea85', '#a855f790'] 
                  : ['#dbeafe', '#bfdbfe', '#93c5fd', '#60a5fa', '#3b82f6', '#2563eb'];
                
                // Usa os limiares personalizados do store
                if (count < heatmapThresholds.level1) return colorLevels[0];
                if (count < heatmapThresholds.level2) return colorLevels[1];
                if (count < heatmapThresholds.level3) return colorLevels[2];
                if (count < heatmapThresholds.level4) return colorLevels[3];
                if (count < heatmapThresholds.level5) return colorLevels[4];
                return colorLevels[5];
              };
              
              // 3. Construir o calendário personalizado
              // Configuração do calendário
              const endDate = new Date(); // Hoje
              const startDate = subYears(endDate, 1); // Exatamente um ano atrás
              const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
              
              // Definindo tipos explícitos
              type DayCellData = {
                date: string; 
                minutes: number;
                tooltip: string;
                isToday: boolean;
              };

              // Obter dados de atividade (minutos por dia)
              const activityMap = new Map<string, number>(
                heatmapData.map(item => [item.date, item.count])
              );

              // Gerar TODOS os dias do período (um ano completo)
              const allDays: DayCellData[] = [];
              const monthLabelsData: { label: string; columnIndex: number }[] = [];
              
              // Começar no domingo da primeira semana
              let currentDay = startOfDay(startDate);
              // Retroceder até o domingo anterior (início da semana)
              while (currentDay.getDay() !== 0) {
                currentDay = subDays(currentDay, 1);
              }
              
              // Variáveis para controlar a posição
              let weekIndex = 0;
              let currentMonth = -1;
              
              // Gerar os dias até o final do período + dias restantes da última semana
              while (currentDay <= endDate || currentDay.getDay() !== 0) {
                const dateKey = format(currentDay, 'yyyy-MM-dd');
                const minutes = activityMap.get(dateKey) || 0;
                const inRange = currentDay >= startDate && currentDay <= endDate;
                
                // Verificar se começou um novo mês para os rótulos
                if (currentDay.getMonth() !== currentMonth && currentDay.getDay() === 0) {
                  currentMonth = currentDay.getMonth();
                  const monthName = format(currentDay, 'MMM', { locale: pt });
                  monthLabelsData.push({ 
                    label: monthName, 
                    columnIndex: weekIndex 
                  });
                }

                // Adicionar o dia ao array principal (apenas se estiver no período de interesse)
                if (inRange) {
                  allDays.push({
                    date: dateKey,
                    minutes,
                    tooltip: minutes > 0 
                      ? `${format(currentDay, "dd 'de' MMMM, yyyy", { locale: pt })}: ${formatStudyTime(minutes)}`
                      : `Sem estudo em ${format(currentDay, "dd 'de' MMMM, yyyy", { locale: pt })}`,
                    isToday: isSameDay(currentDay, new Date())
                  });
                }

                // Avança para o próximo dia
                currentDay = addDays(currentDay, 1);
                
                // Se este era o último dia da semana, incrementa o índice da semana
                if (currentDay.getDay() === 0) {
                  weekIndex++;
                }
              }
              
              // Número total de semanas para o grid
              const totalWeeks = weekIndex;
              
              // Determinar o tamanho adequado para as células e o grid
              // Usando as variáveis do escopo do componente
              const cellSize = heatmapCellSize; 
              const cellGap = heatmapCellGap; 
              const cellUnit = cellSize + cellGap; // Tamanho total incluindo espaço
              
              // 4. Renderizar o heatmap estilo GitHub
              return (
                <div className="github-style-heatmap centered-heatmap">
                  {/* Container para meses e grid */}
                  <div className="heatmap-content-wrapper">
                    {/* Rótulos dos meses */}
                    <div className="month-labels">
                      {monthLabelsData.map(({ label, columnIndex }) => (
                        <div 
                          key={`month-${label}-${columnIndex}`} 
                          className="month-label"
                          style={{
                            left: `${columnIndex * cellUnit}px`
                          }}
                        >
                          {label}
                        </div>
                      ))}
                    </div>
                    
                    {/* Container para dias da semana e grid */}
                    <div className="days-and-grid-container">
                      {/* Rótulos dos dias da semana */}
                      <div className="weekday-labels">
                        {dayNames.map((day, index) => (
                          <div key={`day-${index}`} className="weekday-label">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Grid de células (dias) */}
                      <div 
                        className="days-grid"
                        style={{
                          gridTemplateRows: `repeat(7, ${cellSize}px)`,
                          gridTemplateColumns: `repeat(${totalWeeks}, ${cellSize}px)`,
                          gap: `${cellGap}px`,
                          gridAutoFlow: 'column' // Fluxo de preenchimento por coluna, não por linha
                        }}
                      >
                        {/* Primeiro geramos os dias da semana (linhas) */}
                        {[0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => (
                          // Depois geramos as semanas (colunas) para cada dia
                          Array.from({ length: totalWeeks }).map((_, weekIndex) => {
                            // Primeiro domingo da grade
                            const firstSunday = startOfWeek(startDate, { weekStartsOn: 0 });
                            // Data atual baseada no dia da semana e índice da semana
                            const dayDate = addDays(firstSunday, dayOfWeek + (weekIndex * 7));
                            const dateKey = format(dayDate, 'yyyy-MM-dd');
                            const dayData = allDays.find(d => d.date === dateKey);
                            const cellIndex = (dayOfWeek * totalWeeks) + weekIndex;
                            
                            // Se este dia está fora do período, renderize célula vazia
                            if (!dayData && (dayDate < startDate || dayDate > endDate)) {
                              return (
                                <div 
                                  key={`empty-${cellIndex}`} 
                                  className="day-cell outside-range"
                                ></div>
                              );
                            }
                            
                            const minutes = dayData?.minutes || 0;
                            const isToday = dayData?.isToday || false;
                            const tooltipText = dayData?.tooltip || '';
                            
                            return (
                              <div 
                                key={`cell-${cellIndex}`}
                                className={`day-cell ${isToday ? 'today' : ''} ${minutes > 0 ? 'has-activity' : ''}`}
                                style={{
                                  backgroundColor: getColor(minutes),
                                  gridRow: dayOfWeek + 1,
                                  gridColumn: weekIndex + 1
                                }}
                                aria-label={tooltipText}
                                data-tooltip={tooltipText}
                                onClick={() => handleCellClick(minutes > 0 ? dayDate : null)}
                                onMouseEnter={(e: React.MouseEvent) => {
                                  const currentTooltipText = e.currentTarget.getAttribute('data-tooltip') || '';
                                  setTooltip({
                                    show: true,
                                    text: currentTooltipText,
                                    x: e.clientX,
                                    y: e.clientY
                                  });
                                }}
                                onMouseMove={(e: React.MouseEvent) => {
                                  // Throttle tooltip updates para melhorar performance
                                  const now = Date.now();
                                  if (!lastTooltipUpdate || now - lastTooltipUpdate > 16) {
                                    lastTooltipUpdate = now;
                                  setTooltip(prev => ({
                                    ...prev,
                                    x: e.clientX,
                                    y: e.clientY
                                  }));
                                  }
                                }}
                                onMouseLeave={() => {
                                  setTooltip(prev => ({
                                    ...prev,
                                    show: false
                                  }));
                                }}
                              ></div>
                            );
                          })
                        )).flat()}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
          
          {/* Legenda de cores */}
          <div className="color-scale-legend">
            <span className="legend-text">Tempo de estudo:</span>
            
            {/* Array com informações dos níveis */}
            {[
              { level: 0, label: '0 min', range: 'Nenhum estudo' },
              { level: 1, label: `1-${heatmapThresholds.level1-1} min`, range: `Menos de ${heatmapThresholds.level1} minutos` },
              { level: 2, label: `${heatmapThresholds.level1}-${heatmapThresholds.level2-1} min`, range: `Entre ${heatmapThresholds.level1} e ${heatmapThresholds.level2} minutos` },
              { level: 3, label: `${heatmapThresholds.level2}-${heatmapThresholds.level3-1} min`, range: `Entre ${heatmapThresholds.level2} e ${heatmapThresholds.level3} minutos` },
              { level: 4, label: `${heatmapThresholds.level3}-${heatmapThresholds.level4-1} min`, range: `Entre ${heatmapThresholds.level3} e ${heatmapThresholds.level4} minutos` },
              { level: 5, label: `${heatmapThresholds.level4}-${heatmapThresholds.level5-1} min`, range: `Entre ${heatmapThresholds.level4} e ${heatmapThresholds.level5} minutos` },
              { level: 6, label: `${heatmapThresholds.level5}+ min`, range: `Mais de ${heatmapThresholds.level5} minutos` }
            ].map((item) => (
              <div 
                key={item.level}
                className="legend-item"
                title={item.range}
              >
                <div 
                  className="color-box"
                style={{ 
                    backgroundColor: item.level === 0 
                      ? (isDarkMode ? '#2d3748' : '#f3f4f6') 
                      : isDarkMode 
                        ? [`#4f46e530`, `#4f46e545`, `#6366f160`, `#7c3aed75`, `#9333ea85`, `#a855f790`][item.level-1]
                        : [`#dbeafe`, `#bfdbfe`, `#93c5fd`, `#60a5fa`, `#3b82f6`, `#2563eb`][item.level-1],
                    border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
                  }}
                  aria-label={item.range}
              />
                <span className="level-label">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Área de Detalhes das Atividades */}
      {selectedDateDetails && (
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg lg:col-span-2 overflow-x-auto">
            <h3 className="text-base font-medium mb-3 dark:text-white">
            Atividades de {format(selectedDateDetails, "dd 'de' MMMM, yyyy", { locale: pt })}
          </h3>
          {selectedActivities.length > 0 ? (
            <ul className="space-y-2">
              {selectedActivities.map((activity, index) => {
                const isPomodoro = 'duration' in activity;
                const topicId = (activity as PomodoroSession).topicId || (activity as Review).topicId;
                const subjectId = findSubjectIdForTopic(topicId);
                const subject = subjects.find(s => s.id === subjectId);
                const topic = subject?.topics.find(t => t.id === topicId);

                return (
                  <li key={index} className="text-sm p-2 rounded bg-white dark:bg-gray-600 shadow-sm overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center">
                      <span className={`font-semibold mr-2 ${isPomodoro ? 'text-blue-600 dark:text-blue-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                        {isPomodoro ? '[Foco]' : (activity as Review).completed ? '[Revisão ✓]' : '[Revisão]'}
                    </span>
                        <span className="mt-1 sm:mt-0 dark:text-gray-300 break-words text-xs">
                        {subject?.name || 'N/A'} - {topic?.title || 'N/A'}
                      {isPomodoro && ` (${formatStudyTime((activity as PomodoroSession).duration)})`}
                    </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Nenhuma atividade neste dia.</p>
          )}
        </div>
      )}

      {/* Tooltip global controlado por React */}
      {tooltip.show && (
        <div 
          className="fixed z-[9999] px-3 py-2 rounded-md text-sm pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 80}px`, // Aumentado para 60px acima do cursor
            transform: 'translate(-50%, 0)', // Apenas centralizar horizontalmente
            backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            color: isDarkMode ? '#e5e7eb' : '#1f2937',
            border: `1px solid ${isDarkMode ? '#4b5563' : '#e5e7eb'}`,
            boxShadow: `0 3px 10px ${isDarkMode ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)'}`,
            maxWidth: '300px',
            whiteSpace: 'normal'
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Modal de confirmação */}
      {showResetConfirm && (
          <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 max-w-sm mx-4">
              <h3 className="text-lg font-semibold mb-3 dark:text-white">Reiniciar Estatísticas</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
              Esta ação vai reiniciar todas as estatísticas de estudo. Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetAllStats}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
              >
                Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      <style jsx>{`
        .confetti-container {
          position: absolute;
          width: 100%;
          height: 100%;
        }
        
        .confetti-piece {
          position: absolute;
          animation: confetti-fall 3s linear forwards;
        }
        
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(720deg);
          }
        }

        @media (max-width: 768px) {
          .heatmap-content-wrapper {
            width: 100vw;
            margin-left: calc(-50vw + 50%);
            padding: 0 16px;
            box-sizing: border-box;
          }
          
          .days-grid {
            min-width: 800px;
            padding: 0 8px;
          }
          
          .weekday-labels,
          .month-labels {
            min-width: 800px;
            padding: 0 8px;
          }
          
          .level-label {
              font-size: 7px;
          }
        }
        
        .color-scale-legend {
          display: flex;
          align-items: center;
          justify-content: center;
            gap: 4px;
          flex-wrap: wrap;
            margin-top: 8px;
          max-width: 100%;
            padding: 0 8px;
            ${isDarkMode ? 'background: rgba(31, 41, 55, 0.4); border-radius: 6px; padding: 6px 8px;' : ''}
            overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .legend-text {
            font-size: 9px;
          font-weight: 500;
          color: ${isDarkMode ? '#a1a1aa' : '#6b7280'};
            margin-right: 3px;
        }
        
        .legend-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          cursor: help;
        }

        .color-box {
          width: 11px;
          height: 11px;
          border-radius: 2px;
          ${isDarkMode ? 'box-shadow: 0 0 2px rgba(255, 255, 255, 0.1);' : ''}
        }

        .level-label {
          font-size: 9px;
          color: ${isDarkMode ? '#a1a1aa' : '#6b7280'};
          white-space: nowrap;
        }

        .heatmap-content-wrapper::-webkit-scrollbar {
          height: 8px;
        }
        
        .heatmap-content-wrapper::-webkit-scrollbar-track {
          background: ${isDarkMode ? '#1f2937' : '#f3f4f6'};
          border-radius: 4px;
        }
        
        .heatmap-content-wrapper::-webkit-scrollbar-thumb {
          background-color: ${isDarkMode ? '#4b5563' : '#cbd5e1'};
          border-radius: 4px;
        }
        
        .heatmap-content-wrapper::-webkit-scrollbar-thumb:hover {
          background-color: ${isDarkMode ? '#6b7280' : '#94a3b8'};
        }

        /* Adiciona um cursor pointer para células com atividade */
        .day-cell.has-activity {
          cursor: pointer;
        }

        .mobile-heatmap-rtl {
          direction: rtl;
        }

        .mobile-heatmap-rtl > div {
          direction: ltr; /* Garante que o conteúdo dos filhos não seja invertido */
        }
        
        /* Especificidade para os rótulos de mês e dia dentro do RTL */
        .mobile-heatmap-rtl .month-labels,
        .mobile-heatmap-rtl .weekday-labels,
        .mobile-heatmap-rtl .days-grid {
          direction: ltr;
        }

        /* Se as células individuais do grid também precisarem de direção LTR explicitamente */
        .mobile-heatmap-rtl .days-grid > div {
            direction: ltr;
        }
      `}</style>
    </div>
  );
} 