import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useWakeLock } from '@/hooks/useWakeLock';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useReviewStore } from '@/store/reviewStore';
import { PlayIcon, PauseIcon, ArrowPathIcon, ForwardIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { format, startOfDay, isWithinInterval, parseISO, getDay, isSameDay } from 'date-fns';
import confetti from 'canvas-confetti';
import { playAlarmSound } from '@/utils/sounds';
import { useSettingsStore } from '@/store/settingsStore';

export default function Pomodoro() {
  // Referência para o timestamp de quando o timer começou/retomou a contar
  const timerStartRef = useRef<number>(0);
  const timeRemainingAtStartRef = useRef<number>(0);
  const reportedElapsedSecondsRef = useRef<number>(0);
  const { subjects } = useSubjectStore();
  const { topics, addTopic } = useTopicStore();
  const {
    activeSubjectId,
    activeTopicId,
    currentTopicId,
    activeScheduleItemId,
    currentState,
    isRunning,
    timeRemaining,
    completedPomodoros,
    startTimer,
    startSession,
    setActiveScheduleItemId,
    pauseTimer,
    resetTimer,
    skipToNext,
    incrementElapsedTime,
    zenMode,
    toggleZenMode,
    settings
  } = usePomodoroStore();

  const isDarkMode = useSettingsStore((state) => state.darkMode);

  const { generateReviewsForTopic, reviews, completeReview } = useReviewStore();

  const { schedules, weeklyItems, blockItems, completedScheduleItems, isItemCompletedForDate, toggleScheduleItemCompletion } = useScheduleStore();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedTopicOverrides, setSelectedTopicOverrides] = useState<Record<string, string>>({});
  // Rastreia os tópicos já estudados para cada item de cronograma (bloco/semanal)
  // Formato: { itemId: [topicId1, topicId2, ...] }
  const [completedTopicsPerItem, setCompletedTopicsPerItem] = useState<Record<string, string[]>>({});
  // Rastreia qual item está no modo "O que você estudou?" (após clicar ✓)
  const [finishingItemId, setFinishingItemId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'schedules' | 'reviews'>('schedules');

  // Wake Lock: impede a tela do celular de desligar enquanto o timer roda
  useWakeLock(isRunning);

  // Quando o timer começa, retoma, ou transiciona (foco→pausa→foco), salva o timestamp atual
  useEffect(() => {
    if (isRunning) {
      timerStartRef.current = Date.now();
      timeRemainingAtStartRef.current = usePomodoroStore.getState().timeRemaining;
      reportedElapsedSecondsRef.current = 0;
    }
  }, [isRunning, currentState]);

  // Função para recalcular o tempo com base no relógio real
  const recalculateTimer = useCallback(() => {
    if (!isRunning || !timerStartRef.current) return;

    const now = Date.now();
    const elapsedMs = now - timerStartRef.current;
    const elapsedSecondsFromStart = Math.floor(elapsedMs / 1000);
    const newTimeRemaining = timeRemainingAtStartRef.current - elapsedSecondsFromStart;

    if (newTimeRemaining <= 0) {
      // Timer terminou (pode ter terminado enquanto a tela estava desligada)
      usePomodoroStore.setState({ timeRemaining: 0 });

      // Atualiza o tempo de estudo decorrido
      const totalFocusElapsed = timeRemainingAtStartRef.current; // todo o tempo restante foi consumido
      const deltaSeconds = totalFocusElapsed - reportedElapsedSecondsRef.current;
      if (deltaSeconds > 0) {
        incrementElapsedTime(deltaSeconds);
        reportedElapsedSecondsRef.current = totalFocusElapsed;
      }

      // Toca som do alarme (se habilitado)
      const pomodoroState = usePomodoroStore.getState();
      if (pomodoroState.settings?.soundEnabled !== false) {
        playAlarmSound(pomodoroState.settings?.selectedSound || 'ding');
      }

      if (currentState === 'focus') {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }

      skipToNext(true);
    } else {
      // Atualiza o tempo restante e o tempo de estudo decorrido
      const deltaSeconds = elapsedSecondsFromStart - reportedElapsedSecondsRef.current;
      if (deltaSeconds > 0) {
        incrementElapsedTime(deltaSeconds);
        reportedElapsedSecondsRef.current = elapsedSecondsFromStart;
      }
      usePomodoroStore.setState({ timeRemaining: newTimeRemaining });
    }
  }, [isRunning, currentState, skipToNext, incrementElapsedTime]);

  // Timer principal baseado em timestamps reais (resiliente a suspensão do browser)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        recalculateTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, recalculateTimer]);

  // Quando o usuário volta para a aba (ex: tela ligou), recalcula imediatamente
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isRunning) {
        recalculateTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, recalculateTimer]);

  // Obter itens planejados para hoje (Memoized)
  const todayPlannedItems = useMemo(() => {
    const today = new Date();
    const activeSchedules = schedules.filter(s => s.isActive);
    let plannedItems: any[] = [];

    // 1. Itens de Cronogramas (Semanal e Blocos)
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

    // 2. Tópicos Avulsos (Criados hoje, sem vínculo com cronograma)
    const todaysTopics = topics.filter(t => {
      const topicDate = typeof t.createdAt === 'string' ? parseISO(t.createdAt) : new Date(t.createdAt);
      return isSameDay(topicDate, today) && !t.linkedScheduleItemId;
    });

    const avulsoItems = todaysTopics.map(topic => ({
      id: topic.id, // Use topic ID as item ID
      subjectId: topic.subjectId,
      topicId: topic.id,
      startTime: null,
      endTime: null,
      isAvulso: true // Flag to identify
    }));

    // Combinar e formatar
    const allItems = [...plannedItems, ...avulsoItems];

    return allItems.map(item => {
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const isCompleted = !item.isAvulso && isItemCompletedForDate(item.id, todayStr);
      return { item, status: isCompleted ? 'completed' : 'pending' };
    }).sort((a, b) => {
      // 1. Sort by status (pending first)
      if (a.status !== b.status) {
        return a.status === 'pending' ? -1 : 1;
      }

      // 2. Sort by start time
      const timeA = a.item.startTime || '';
      const timeB = b.item.startTime || '';

      // Items with time come first
      if (timeA && !timeB) return -1;
      if (!timeA && timeB) return 1;

      // If both have time, sort ascending
      if (timeA && timeB) {
        return timeA.localeCompare(timeB);
      }

      return 0;
    });
  }, [schedules, weeklyItems, blockItems, topics, isItemCompletedForDate, completedScheduleItems]);

  // Obter as revisões pendentes para hoje ou atrasadas
  const todayReviews = useMemo(() => {
    const today = new Date();
    const startOfToday = startOfDay(today);
    
    return reviews.filter(review => {
      if (review.completed) return false;
      const reviewDate = typeof review.scheduledDate === 'string' 
        ? parseISO(review.scheduledDate) 
        : new Date(review.scheduledDate);
      
      // Compara o início do dia local da revisão com o início do dia de hoje
      // para evitar que vazamentos de fuso horário tragam revisões de amanhã para a lista de hoje.
      return startOfDay(reviewDate) <= startOfToday;
    });
  }, [reviews]);

  // Obter a revisão selecionada ou ativa
  const activeReview = useMemo(() => {
    if (selectedItemId) {
      return todayReviews.find(r => r.id === selectedItemId);
    }
    if (activeScheduleItemId) {
      return todayReviews.find(r => r.id === activeScheduleItemId);
    }
    return null;
  }, [selectedItemId, activeScheduleItemId, todayReviews]);

  // Obter o item selecionado ou ativo no momento
  const activePlan = useMemo(() => {
    if (selectedItemId) {
      const found = todayPlannedItems.find(p => p.item.id === selectedItemId);
      if (found) return found;
    }
    if (activeScheduleItemId) {
      const found = todayPlannedItems.find(p => p.item.id === activeScheduleItemId);
      if (found) return found;
    }
    return null;
  }, [selectedItemId, activeScheduleItemId, todayPlannedItems]);

  const activeSubject = useMemo(() => {
    if (activeReview) {
      const topic = topics.find(t => t.id === activeReview.topicId);
      if (topic) {
        return subjects.find(s => s.id === topic.subjectId) || null;
      }
    }
    if (activePlan) {
      return subjects.find(s => s.id === activePlan.item.subjectId);
    }
    if (currentTopicId) {
      const sub = subjects.find(s => s.id === currentTopicId);
      if (sub) return sub;
      const top = topics.find(t => t.id === currentTopicId);
      if (top) {
        return subjects.find(s => s.id === top.subjectId);
      }
    }
    return null;
  }, [activePlan, activeReview, currentTopicId, subjects, topics]);

  const activeTopic = useMemo(() => {
    if (activeReview) {
      return topics.find(t => t.id === activeReview.topicId) || null;
    }
    if (activePlan) {
      const { item } = activePlan;
      const overrideText = selectedTopicOverrides[item.id];
      const linkedTopic = topics.find(t => t.linkedScheduleItemId === item.id);
      let effectiveTopic = linkedTopic;
      if (!effectiveTopic && item.topicId) {
        effectiveTopic = topics.find(t => t.id === item.topicId);
      }
      if (!effectiveTopic && overrideText) {
        effectiveTopic = topics.find(t => t.title.toLowerCase() === overrideText.toLowerCase() && t.subjectId === item.subjectId);
      }
      return effectiveTopic || null;
    }
    if (currentTopicId) {
      const top = topics.find(t => t.id === currentTopicId);
      if (top) return top;
    }
    return null;
  }, [activePlan, activeReview, currentTopicId, topics, selectedTopicOverrides]);

  // Obter o tempo total da etapa atual em segundos
  const currentStageDuration = useMemo(() => {
    if (currentState === 'focus') {
      return (settings.focusDuration || 25) * 60;
    } else if (currentState === 'shortBreak') {
      return (settings.shortBreakDuration || 5) * 60;
    } else if (currentState === 'longBreak') {
      return (settings.longBreakDuration || 15) * 60;
    }
    return (settings.focusDuration || 25) * 60;
  }, [currentState, settings]);

  const progressPercentage = useMemo(() => {
    if (currentStageDuration <= 0) return 1;
    return timeRemaining / currentStageDuration;
  }, [timeRemaining, currentStageDuration]);

  // Circunferência do círculo (raio = 100)
  const circumference = 2 * Math.PI * 100;
  const strokeDashoffset = circumference * (1 - progressPercentage);

  // Determinar cores e gradientes com base no estado do Pomodoro
  const themeColorClass = useMemo(() => {
    switch (currentState) {
      case 'focus':
        return {
          gradientId: 'focus-gradient',
          gradientStart: '#0ea5e9', // primary-500
          gradientEnd: '#2563eb', // blue-600
          glow: 'rgba(14, 165, 233, 0.25)',
          bgTrack: 'text-gray-100 dark:text-gray-800/40',
          textColor: 'text-gray-900 dark:text-white',
          pulseColor: 'bg-primary-500/10'
        };
      case 'shortBreak':
        return {
          gradientId: 'short-break-gradient',
          gradientStart: '#10b981', // emerald-500
          gradientEnd: '#059669', // emerald-600
          glow: 'rgba(16, 185, 129, 0.25)',
          bgTrack: 'text-emerald-50 dark:text-emerald-950/20',
          textColor: 'text-emerald-600 dark:text-emerald-400',
          pulseColor: 'bg-emerald-500/10'
        };
      case 'longBreak':
        return {
          gradientId: 'long-break-gradient',
          gradientStart: '#6366f1', // indigo-500
          gradientEnd: '#4f46e5', // indigo-600
          glow: 'rgba(99, 102, 241, 0.25)',
          bgTrack: 'text-indigo-50 dark:text-indigo-950/20',
          textColor: 'text-indigo-600 dark:text-indigo-400',
          pulseColor: 'bg-indigo-500/10'
        };
      default:
        return {
          gradientId: 'focus-gradient',
          gradientStart: '#0ea5e9',
          gradientEnd: '#2563eb',
          glow: 'rgba(14, 165, 233, 0.25)',
          bgTrack: 'text-gray-100 dark:text-gray-800/40',
          textColor: 'text-gray-900 dark:text-white',
          pulseColor: 'bg-primary-500/10'
        };
    }
  }, [currentState]);

  // Sync with active session from store (Context API)
  useEffect(() => {
    // 1. Prioritize explicit schedule item ID (Disambiguation for multiple items of same subject)
    if (activeScheduleItemId) {
      const foundItem = todayPlannedItems.find(p => p.item.id === activeScheduleItemId);
      if (foundItem) {
        setSelectedItemId(foundItem.item.id);
        return;
      }
    }

    // 2. Prioritize currentTopicId (active/paused timer) over activeTopicId (navigation context)
    const targetId = currentTopicId || activeTopicId;

    if (targetId) {
      // 3. Try to find by topicId (Exact match for Topic sessions)
      let foundItem = todayPlannedItems.find(p => p.item.topicId === targetId);

      // 4. If not found, try to find by subjectId (For Subject-only sessions)
      // This happens when a scheduled item has no specific topic, so the subjectId is used as the identifier
      if (!foundItem) {
        foundItem = todayPlannedItems.find(p => p.item.subjectId === targetId && !p.item.topicId);
      }

      // 5. Fallback for navigation context (activeSubjectId) if no timer is running
      if (!foundItem && !currentTopicId && activeSubjectId) {
        foundItem = todayPlannedItems.find(p => p.item.subjectId === activeSubjectId);
      }

      if (foundItem) {
        setSelectedItemId(foundItem.item.id);
      }
    }
  }, [activeTopicId, currentTopicId, activeSubjectId, activeScheduleItemId, todayPlannedItems]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    let subjectIdToStart = '';

    // 1. Se for uma revisão selecionada
    if (activeReview) {
      subjectIdToStart = activeReview.topicId;
      setActiveScheduleItemId(activeReview.id);
    }
    // 2. Se for um item de cronograma selecionado
    else if (selectedItemId) {
      const selectedPlan = todayPlannedItems.find(p => p.item.id === selectedItemId);
      if (selectedPlan) {
        // Check for override first
        const overrideText = selectedTopicOverrides[selectedPlan.item.id];

        if (overrideText && !selectedPlan.item.topicId) {
          // Find existing topic or create new one
          const existingTopic = topics.find(t =>
            t.subjectId === selectedPlan.item.subjectId &&
            t.title.toLowerCase() === overrideText.toLowerCase()
          );

          if (existingTopic) {
            subjectIdToStart = existingTopic.id;
          } else {
            // Create new topic linked to this schedule item
            const newTopic = addTopic(
              overrideText,
              selectedPlan.item.subjectId,
              undefined,
              undefined,
              selectedPlan.item.id
            );
            subjectIdToStart = newTopic.id;
          }
        } else {
          // Fallback to item topic or subject
          subjectIdToStart = selectedPlan.item.topicId || selectedPlan.item.subjectId;
        }

        // Persist the specific schedule item ID to resolve ambiguity
        setActiveScheduleItemId(selectedPlan.item.id);
      }
    }
    // 3. Se no currentTopicId já tem algo pausado
    else if (currentTopicId) {
      subjectIdToStart = currentTopicId;
    }

    if (subjectIdToStart) {
      startTimer(subjectIdToStart);
    }
  };

  // Função para marcar um TÓPICO como estudado (mas NÃO marca o bloco como concluído)
  const handleFinishTopic = (itemId?: string) => {
    const targetId = itemId || selectedItemId;
    if (!targetId) return;

    const plannedItem = todayPlannedItems.find(p => p.item.id === targetId);
    if (!plannedItem) return;

    // 1. Identificar o tópico que foi estudado
    let topicIdStudied = '';

    // a. Se há um override (texto digitado pelo usuário)
    const overrideText = selectedTopicOverrides[targetId];
    if (overrideText && overrideText.trim()) {
      // Verifica se já existe um tópico com esse nome
      const existingTopic = topics.find(t =>
        t.subjectId === plannedItem.item.subjectId &&
        t.title.toLowerCase() === overrideText.toLowerCase()
      );

      if (existingTopic) {
        topicIdStudied = existingTopic.id;
      } else {
        // Cria um novo tópico
        const newTopic = addTopic(
          overrideText,
          plannedItem.item.subjectId,
          undefined,
          undefined,
          targetId
        );
        topicIdStudied = newTopic.id;
      }
    }
    // b. Se o item já tem um topicId definido
    else if (plannedItem.item.topicId) {
      const topic = topics.find(t => t.id === plannedItem.item.topicId);
      if (topic) {
        topicIdStudied = topic.id;
      }
    }

    if (!topicIdStudied) return; // Não há tópico definido

    // 1.5. Vincular as sessões acumuladas no ciclo atual de foco ao tópico estudado
    const { currentCycleSessionIds, linkSessionsToTopic } = usePomodoroStore.getState();
    linkSessionsToTopic(currentCycleSessionIds, topicIdStudied);

    // 2. Registrar o tópico como estudado para este item
    setCompletedTopicsPerItem(prev => {
      const existing = prev[targetId] || [];
      if (existing.includes(topicIdStudied)) return prev; // Já registrado
      return {
        ...prev,
        [targetId]: [...existing, topicIdStudied]
      };
    });

    // 3. Gerar revisões para o tópico
    // Usa getState() para pegar os tópicos atualizados (evita closure stale após addTopic)
    const freshTopics = useTopicStore.getState().topics;
    const isValidTopic = freshTopics.some(t => t.id === topicIdStudied);
    if (isValidTopic) {
      generateReviewsForTopic(topicIdStudied);
    }

    // 4. Limpar o input de override para permitir digitar novo tópico
    setSelectedTopicOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[targetId];
      return newOverrides;
    });

    // 5. Sair do modo de finalização (mas manter o item selecionado para adicionar mais tópicos)
    setFinishingItemId('');

    // 6. Feedback visual
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ['#10B981', '#34D399', '#6EE7B7']
    });

    // 7. Resetar o timer (limpa activeSessionId antes no store para que a sessão salva não seja descartada pelo reset)
    usePomodoroStore.setState({ activeSessionId: null, currentCycleSessionIds: [] });
    resetTimer();
    usePomodoroStore.setState({ activeTopicId: null, activeSubjectId: null, activeScheduleItemId: null });
    // NÃO limpar selectedItemId - mantém o item selecionado para permitir adicionar outro tópico
  };

  // Função para FINALIZAR o bloco (marcar como concluído e encerrar)
  const handleFinishBlock = (itemId?: string) => {
    const targetId = itemId || selectedItemId;
    if (!targetId) return;

    // Marca o bloco como concluído
    toggleScheduleItemCompletion(targetId, format(new Date(), 'yyyy-MM-dd'));

    // Feedback visual
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF4500']
    });

    // Limpar estado
    resetTimer();
    usePomodoroStore.setState({ activeTopicId: null, activeSubjectId: null, activeScheduleItemId: null });
    setSelectedItemId('');
    setFinishingItemId('');
    setSelectedTopicOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[targetId];
      return newOverrides;
    });
  };

  // Função para marcar uma REVISÃO como resolvida
  const handleFinishReview = (reviewId: string) => {
    // 1. Concluir a revisão no store
    completeReview(reviewId);

    // 2. Feedback visual festivo
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#3B82F6', '#60A5FA', '#93C5FD']
    });

    // 3. Limpar sessões ativas do timer antes de resetar para que não apague o tempo estudado real
    usePomodoroStore.setState({ activeSessionId: null, currentCycleSessionIds: [] });
    resetTimer();
    usePomodoroStore.setState({ activeTopicId: null, activeSubjectId: null, activeScheduleItemId: null });

    // 4. Limpar a seleção atual
    setSelectedItemId('');
  };

  // Mantém compatibilidade - função legada que chama a nova lógica
  const handleFinishContent = (itemId?: string) => {
    handleFinishTopic(itemId);
  };

  const getStatusColor = () => {
    switch (currentState) {
      case 'focus': return 'text-primary-600 dark:text-primary-400';
      case 'shortBreak': return 'text-green-600 dark:text-green-400';
      case 'longBreak': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusText = () => {
    switch (currentState) {
      case 'focus': return 'Foco Total';
      case 'shortBreak': return 'Pausa Curta';
      case 'longBreak': return 'Pausa Longa';
      default: return 'Pronto para Focar?';
    }
  };

  const isStartDisabled = useMemo(() => {
    if (currentState !== 'focus') return false;
    if (currentTopicId) return false; // Resuming
    if (activeReview) return false; // Se uma revisão está selecionada, pode iniciar
    if (!selectedItemId) return true; // Nothing selected

    const selectedPlan = todayPlannedItems.find(p => p.item.id === selectedItemId);
    if (!selectedPlan) return true;

    // Permitir iniciar sem tópico definido — o tópico será preenchido ao finalizar
    return false;
  }, [currentState, currentTopicId, selectedItemId, todayPlannedItems, activeReview]);

  // Keyboard shortcuts (desktop only)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (isRunning) {
            pauseTimer();
          } else if (!isStartDisabled) {
            handleStart();
          }
          break;
        case 'r':
        case 'R':
          resetTimer();
          break;
        case 's':
        case 'S':
          skipToNext(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRunning, isStartDisabled]);

  if (zenMode) {
    return (
      <div 
        className="fixed inset-0 z-50 flex flex-col justify-between items-center p-6 sm:p-10 select-none animate-fade-in bg-gray-50 dark:bg-black"
        style={{
          backgroundImage: !isDarkMode
            ? `radial-gradient(at 0% 0%, ${themeColorClass.gradientStart}08 0px, transparent 50%),
               radial-gradient(at 100% 0%, ${themeColorClass.gradientEnd}05 0px, transparent 50%)`
            : 'none'
        }}
      >
        {/* TOP BAR ZEN */}
        <div className="w-full max-w-4xl flex items-center justify-between">
          <button
            onClick={() => toggleZenMode(false)}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all shadow-sm hover:scale-105 active:scale-95 text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
            </svg>
            Sair do Foco
          </button>

          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-primary-500 animate-pulse' : 'bg-gray-400'}`} />
            <span className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              {isRunning ? 'Sessão Ativa' : 'Pausado'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 text-xs font-semibold border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            Tela Ativa
          </div>
        </div>

        {/* MIDDLE SECTION - BIG CIRCULAR TIMER */}
        <div className="flex flex-col items-center justify-center my-auto py-10">
          <div className="relative flex items-center justify-center w-72 h-72 sm:w-80 sm:h-80 md:w-96 md:h-96">
            {/* Indicador de pulsação suave em volta quando rodando */}
            {isRunning && (
              <div className={`absolute inset-0 rounded-full animate-ping opacity-15 duration-1000 ${themeColorClass.pulseColor}`} style={{ animationDuration: '4s' }} />
            )}

            {/* SVG Progress Ring */}
            <svg className="absolute w-full h-full -rotate-90 transform" viewBox="0 0 240 240">
              <defs>
                <linearGradient id={`zen-${themeColorClass.gradientId}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={themeColorClass.gradientStart} />
                  <stop offset="100%" stopColor={themeColorClass.gradientEnd} />
                </linearGradient>
              </defs>

              {/* Track Circle (Fundo) */}
              <circle
                cx="120"
                cy="120"
                r="100"
                className={`transition-colors duration-500 ${themeColorClass.bgTrack}`}
                strokeWidth="6"
                fill="transparent"
              />

              {/* Progress Circle (Frente) */}
              <circle
                cx="120"
                cy="120"
                r="100"
                stroke={`url(#zen-${themeColorClass.gradientId})`}
                strokeWidth="7"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
                style={{
                  filter: isRunning ? `drop-shadow(0 0 8px ${themeColorClass.gradientStart})` : 'none'
                }}
              />
            </svg>

            {/* Conteúdo Central do Círculo */}
            <div className="absolute flex flex-col items-center justify-center text-center px-8">
              <span className="text-6xl sm:text-7xl md:text-8xl font-light tracking-tighter text-gray-900 dark:text-white font-mono tabular-nums select-none">
                {formatTime(timeRemaining)}
              </span>
              
              <div className="mt-4 flex flex-col items-center">
                <span className={`text-xs font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-full shadow-sm ${
                  currentState === 'focus'
                    ? 'bg-primary-600 text-white dark:bg-primary-500 dark:text-gray-950'
                    : 'bg-emerald-600 text-white dark:bg-emerald-500 dark:text-gray-950'
                }`}>
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVE SUBJECT AND TOPIC DETAILS */}
          <div className="flex flex-col items-center text-center gap-3 mt-10 max-w-sm sm:max-w-md animate-fade-in-up">
            {activeSubject && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-gray-900 border border-gray-200/50 dark:border-gray-800/50 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: activeSubject.color }} />
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 tracking-wide uppercase">
                  {activeSubject.name}
                </span>
              </div>
            )}
            
            <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight leading-tight px-4">
              {activeTopic ? activeTopic.title : (activeSubject ? 'Estudo Geral' : 'Sem tarefa selecionada')}
            </h3>
            
            {activeTopic?.description && (
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs truncate">
                {activeTopic.description}
              </p>
            )}
          </div>
        </div>

        {/* BOTTOM CONTROLS */}
        <div className="w-full max-w-md flex flex-col items-center gap-8 pb-4">
          <div className="flex items-center justify-center gap-8">
            {/* Reset */}
            <button
              onClick={resetTimer}
              className="group p-4 rounded-2xl bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shadow-sm active:scale-95"
              title="Reiniciar"
            >
              <ArrowPathIcon className="h-6 w-6 transition-transform group-hover:rotate-45" />
            </button>

            {/* Play / Pause */}
            {!isRunning ? (
              <button
                onClick={handleStart}
                disabled={isStartDisabled}
                className="bg-primary-600 hover:bg-primary-700 text-white rounded-3xl p-6 shadow-xl shadow-primary-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <PlayIcon className="h-9 w-9 pl-1" />
              </button>
            ) : (
              <button
                onClick={pauseTimer}
                className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-3xl p-6 shadow-xl shadow-gray-900/30 dark:shadow-white/20 transition-all transform hover:scale-105 active:scale-95 flex items-center justify-center"
              >
                <PauseIcon className="h-9 w-9" />
              </button>
            )}

            {/* Skip */}
            <button
              onClick={() => skipToNext(false)}
              className="group p-4 rounded-2xl bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-850 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-all shadow-sm active:scale-95"
              title="Pular"
            >
              <ForwardIcon className="h-6 w-6 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
            <span>{completedPomodoros}</span>
            <span>sessões hoje</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-3 pb-16">
      {/* Header Minimalista */}
      <div className="flex flex-row justify-between items-center gap-2 mb-2 w-full min-w-0">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight shrink-0">Foco</h2>
        <div className={`px-2.5 py-1 rounded-xl text-xs font-extrabold flex items-center gap-1.5 border shadow-sm transition-all ${currentState === 'focus'
          ? 'bg-primary-600 text-white border-primary-600 dark:bg-primary-500 dark:text-gray-950 dark:border-primary-500'
          : 'bg-green-600 text-white border-green-600 dark:bg-green-500 dark:text-gray-950 dark:border-green-500'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${currentState === 'focus' 
            ? 'bg-white dark:bg-gray-950' 
            : 'bg-white dark:bg-gray-950'
            }`}></span>
          {getStatusText()}
        </div>
      </div>

      {/* Timer Principal Circular */}
      <div className="flex flex-col items-center justify-center py-3 select-none">
        <div className="relative flex items-center justify-center w-64 h-64 sm:w-72 sm:h-72">
          {/* Indicador de pulsação suave em volta quando rodando */}
          {isRunning && (
            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 duration-1000 ${themeColorClass.pulseColor}`} style={{ animationDuration: '3s' }} />
          )}

          {/* SVG Progress Ring */}
          <svg className="absolute w-full h-full -rotate-90 transform" viewBox="0 0 240 240">
            <defs>
              <linearGradient id={themeColorClass.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={themeColorClass.gradientStart} />
                <stop offset="100%" stopColor={themeColorClass.gradientEnd} />
              </linearGradient>
            </defs>

            {/* Track Circle (Fundo) */}
            <circle
              cx="120"
              cy="120"
              r="100"
              className={`transition-colors duration-500 ${themeColorClass.bgTrack}`}
              strokeWidth="7"
              fill="transparent"
            />

            {/* Progress Circle (Frente) */}
            <circle
              cx="120"
              cy="120"
              r="100"
              stroke={`url(#${themeColorClass.gradientId})`}
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300 ease-out"
              style={{
                filter: isRunning ? `drop-shadow(0 0 6px ${themeColorClass.gradientStart})` : 'none'
              }}
            />
          </svg>

          {/* Conteúdo Central do Círculo */}
          <div className="absolute flex flex-col items-center justify-center text-center px-6">
            <span className="text-5xl sm:text-6xl font-light tracking-tighter text-gray-900 dark:text-white font-mono tabular-nums select-none">
              {formatTime(timeRemaining)}
            </span>
            
            {/* Tag/Nome da Matéria/Tópico no centro */}
            <div className="mt-2 max-w-[160px] sm:max-w-[180px] flex flex-col items-center">
              {activeSubject ? (
                <span 
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white tracking-wide uppercase truncate block max-w-full"
                  style={{ backgroundColor: activeSubject.color }}
                >
                  {activeSubject.name}
                </span>
              ) : (
                <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                  {currentState === 'focus' ? 'Foco' : 'Pausa'}
                </span>
              )}
              {activeTopic && (
                <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mt-1 truncate max-w-full" title={activeTopic.title}>
                  {activeTopic.title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Botão para ativar Modo Zen abaixo do círculo */}
        {currentState !== 'idle' && (
          <button
            onClick={() => toggleZenMode(true)}
            className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-100/80 dark:bg-gray-800/80 text-gray-600 dark:text-gray-300 hover:bg-primary-50 hover:text-primary-600 dark:hover:bg-primary-950/30 dark:hover:text-primary-400 transition-all duration-300 active:scale-95 border border-gray-200/40 dark:border-gray-700/50 shadow-sm"
          >
            <SparklesIcon className="h-3.5 w-3.5" />
            Modo Zen
          </button>
        )}
      </div>

      {/* Controles Minimalistas */}
      <div className="flex items-center justify-center gap-6">
        <button
          onClick={resetTimer}
          className="group p-3 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Reiniciar"
        >
          <ArrowPathIcon className="h-6 w-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </button>

        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStartDisabled}
            className="bg-primary-600 hover:bg-primary-700 text-white rounded-2xl p-5 shadow-xl shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
          >
            <PlayIcon className="h-8 w-8 pl-1" />
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-2xl p-5 shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <PauseIcon className="h-8 w-8" />
          </button>
        )}

        <button
          onClick={() => skipToNext(false)}
          className="group p-3 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Pular"
        >
          <ForwardIcon className="h-6 w-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </button>
      </div>

      {/* Keyboard shortcuts hint (desktop only) */}
      <div className="hidden sm:flex items-center justify-center gap-4 text-[10px] text-gray-300 dark:text-gray-600">
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-400 dark:text-gray-500 font-mono">Espaço</kbd> play/pause</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-400 dark:text-gray-500 font-mono">R</kbd> reiniciar</span>
        <span><kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-400 dark:text-gray-500 font-mono">S</kbd> pular</span>
      </div>

      {/* Seletor de Abas Ergonômico Mobile-First */}
      {(todayPlannedItems.length > 0 || todayReviews.length > 0) && (
        <div className="flex justify-center mb-6 px-2">
          <div className="flex p-1 bg-gray-150/40 dark:bg-gray-900/60 backdrop-blur-md rounded-xl border border-gray-200/30 dark:border-gray-800/80 shadow-inner max-w-sm w-full">
            <button
              onClick={() => {
                setActiveTab('schedules');
                setSelectedItemId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'schedules'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-700/50 shadow-md transform scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <span>Estudos</span>
              {todayPlannedItems.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'schedules'
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                  {todayPlannedItems.length}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('reviews');
                setSelectedItemId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 text-xs font-bold rounded-lg transition-all duration-300 ${activeTab === 'reviews'
                ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200/50 dark:border-gray-700/50 shadow-md transform scale-[1.02]'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
            >
              <span>Revisões</span>
              {todayReviews.length > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'reviews'
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 animate-pulse'
                  : 'bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                  {todayReviews.length}
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Renderização da Aba de Estudos */}
      {activeTab === 'schedules' && todayPlannedItems.length > 0 && (
        <div className="space-y-3 px-2">
          <div className="space-y-2.5">
            {todayPlannedItems.map((plannedItem, index) => {
              const { item, status } = plannedItem;
              const subject = subjects.find(s => s.id === item.subjectId);
              if (!subject) return null;

              const isCompleted = status === 'completed';
              const isSelected = selectedItemId === item.id;
              const linkedTopic = topics.find(t => t.linkedScheduleItemId === item.id);

              let effectiveTopic = linkedTopic;
              if (!effectiveTopic && item.topicId) {
                effectiveTopic = topics.find(t => t.id === item.topicId);
              }
              if (!effectiveTopic && selectedTopicOverrides[item.id]) {
                effectiveTopic = topics.find(t => t.title.toLowerCase() === selectedTopicOverrides[item.id].toLowerCase() && t.subjectId === item.subjectId);
              }

              const isLocked = isRunning && !isSelected;

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (!isCompleted && !isLocked) setSelectedItemId(item.id);
                  }}
                  className={`group flex flex-col gap-3 p-4 rounded-xl border transition-all 
                    ${isLocked
                      ? 'opacity-40 grayscale cursor-not-allowed bg-gray-50 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800'
                      : isCompleted
                        ? 'bg-gray-50 border-transparent dark:bg-gray-800/30 opacity-60 cursor-default'
                        : isSelected
                          ? 'bg-white dark:bg-gray-800 border-primary-500 ring-1 ring-primary-500 shadow-md cursor-default'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md cursor-pointer'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-1.5 h-12 rounded-full transition-all ${isSelected ? 'scale-y-110' : 'scale-y-90 opacity-70'}`}
                        style={{ backgroundColor: subject.color, filter: isCompleted || isLocked ? 'grayscale(100%)' : 'none' }}
                      />
                      <div>
                        <p className={`font-semibold text-base ${isCompleted || isLocked ? 'text-gray-500' : 'text-gray-900 dark:text-white'} ${isCompleted ? 'line-through' : ''}`}>
                          {item.topicId ? (topics.find(t => t.id === item.topicId)?.title || subject.name) : subject.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.topicId && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {subject.name}
                            </span>
                          )}
                          {item.startTime && (
                            <>
                              <span className="text-gray-300 dark:text-gray-600">•</span>
                              <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                                {item.startTime} - {item.endTime}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isSelected && !isCompleted && (
                        <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-md animate-pulse">
                          {isRunning ? 'Em Andamento' : 'Selecionado'}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isLocked) return;
                          if (item.topicId) {
                            handleFinishContent(item.id);
                          } else {
                            setFinishingItemId(item.id);
                            if (isRunning) pauseTimer();
                          }
                        }}
                        disabled={isLocked}
                        className={`p-2 rounded-full transition-all ${isLocked
                          ? 'text-gray-300 cursor-not-allowed'
                          : isCompleted
                            ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                            : finishingItemId === item.id
                              ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                              : 'text-gray-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                      >
                        <CheckCircleIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {completedTopicsPerItem[item.id] && completedTopicsPerItem[item.id].length > 0 && (
                    <div className="pl-5 animate-fade-in">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                        {isCompleted ? 'Tópicos concluídos:' : 'Tópicos estudados:'}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {completedTopicsPerItem[item.id].map(topicId => {
                          const topic = topics.find(t => t.id === topicId);
                          return topic ? (
                            <span key={topicId} className={`text-xs px-2.5 py-0.5 rounded-full border flex items-center gap-1 transition-all ${isCompleted
                              ? 'bg-gray-100 text-gray-400 dark:bg-gray-800/20 dark:text-gray-500 border-gray-200 dark:border-gray-800/50 line-through'
                              : 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 border-green-100 dark:border-green-900/50'
                            }`}>
                              <CheckCircleIcon className="h-3 w-3" />
                              {topic.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {!isCompleted && isSelected && !isRunning && (finishingItemId === item.id || (completedTopicsPerItem[item.id]?.length > 0)) && (
                    <div className="pl-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={completedTopicsPerItem[item.id]?.length > 0
                            ? "Adicionar outro tópico..."
                            : "O que você estudou? (ex: pp. 45-120)"}
                          value={selectedTopicOverrides[item.id] || ''}
                          onChange={(e) => {
                            setSelectedTopicOverrides(prev => ({
                              ...prev,
                              [item.id]: e.target.value
                            }));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && selectedTopicOverrides[item.id]?.trim()) {
                              handleFinishTopic(item.id);
                            }
                          }}
                          autoFocus={finishingItemId === item.id}
                          className="flex-1 text-sm p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                        />
                        {selectedTopicOverrides[item.id]?.trim() && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFinishTopic(item.id);
                            }}
                            className="px-3 py-2 text-sm font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/50 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors whitespace-nowrap"
                          >
                            Salvar
                          </button>
                        )}
                      </div>

                      {finishingItemId === item.id && !completedTopicsPerItem[item.id]?.length && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFinishingItemId('');
                            setSelectedTopicOverrides(prev => {
                              const newOverrides = { ...prev };
                              delete newOverrides[item.id];
                              return newOverrides;
                            });
                          }}
                          className="mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        >
                          Cancelar
                        </button>
                      )}

                      {completedTopicsPerItem[item.id] && completedTopicsPerItem[item.id].length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleFinishBlock(item.id);
                          }}
                          className="mt-3 w-full py-2 px-4 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                        >
                          Finalizar Estudo do Dia
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Renderização da Aba de Revisões */}
      {activeTab === 'reviews' && (
        <div className="space-y-3 px-2">
          <div className="space-y-2.5">
            {todayReviews.length > 0 ? (
              todayReviews.map((review) => {
                const topic = topics.find(t => t.id === review.topicId);
                const subject = topic ? subjects.find(s => s.id === topic.subjectId) : null;
                if (!subject || !topic) return null;

                const isSelected = selectedItemId === review.id;
                const isLocked = isRunning && !isSelected;

                return (
                  <div
                    key={review.id}
                    onClick={() => {
                      if (!isLocked) setSelectedItemId(review.id);
                    }}
                    className={`group flex flex-col gap-3 p-4 rounded-xl border transition-all 
                      ${isLocked
                        ? 'opacity-40 grayscale cursor-not-allowed bg-gray-50 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800'
                        : isSelected
                          ? 'bg-white dark:bg-gray-800 border-primary-500 ring-1 ring-primary-500 shadow-md cursor-default'
                          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md cursor-pointer'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-1.5 h-12 rounded-full transition-all ${isSelected ? 'scale-y-110' : 'scale-y-90 opacity-70'}`}
                          style={{ backgroundColor: subject.color }}
                        />
                        <div>
                          <p className="font-semibold text-base text-gray-900 dark:text-white">
                            {topic.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {subject.name}
                            </span>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-md border border-red-100 dark:border-red-900/30">
                              Revisão Espaçada
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded-md animate-pulse">
                            {isRunning ? 'Em Andamento' : 'Selecionado'}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (isLocked) return;
                            handleFinishReview(review.id);
                          }}
                          disabled={isLocked}
                          className="p-2 rounded-full text-gray-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20"
                          title="Concluir Revisão"
                        >
                          <CheckCircleIcon className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-gray-50/30 dark:bg-gray-900/10 border border-dashed border-gray-250 dark:border-gray-800/50 p-6 rounded-xl text-center select-none animate-fade-in">
                <SparklesIcon className="h-6 w-6 mx-auto text-amber-500 mb-2 animate-bounce" />
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Revisões de hoje concluídas!</p>
                <p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Parabéns! Sua agenda de repetição espaçada está 100% em dia.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-8">
        <span>{completedPomodoros}</span>
        <span>sessões hoje</span>
      </div>
    </div>
  );
}