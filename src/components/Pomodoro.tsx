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
    incrementElapsedTime
  } = usePomodoroStore();

  const { generateReviewsForTopic } = useReviewStore();

  const { schedules, weeklyItems, blockItems, completedScheduleItems, toggleScheduleItemCompletion } = useScheduleStore();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [selectedTopicOverrides, setSelectedTopicOverrides] = useState<Record<string, string>>({});
  // Rastreia os tópicos já estudados para cada item de cronograma (bloco/semanal)
  // Formato: { itemId: [topicId1, topicId2, ...] }
  const [completedTopicsPerItem, setCompletedTopicsPerItem] = useState<Record<string, string[]>>({});
  // Rastreia qual item está no modo "O que você estudou?" (após clicar ✓)
  const [finishingItemId, setFinishingItemId] = useState<string>('');


  // Wake Lock: impede a tela do celular de desligar enquanto o timer roda
  useWakeLock(isRunning);

  // Quando o timer começa, retoma, ou transiciona (foco→pausa→foco), salva o timestamp atual
  useEffect(() => {
    if (isRunning) {
      timerStartRef.current = Date.now();
      timeRemainingAtStartRef.current = usePomodoroStore.getState().timeRemaining;
    }
  }, [isRunning, currentState]);

  // Função para recalcular o tempo com base no relógio real
  const recalculateTimer = useCallback(() => {
    if (!isRunning || !timerStartRef.current) return;

    const now = Date.now();
    const elapsedMs = now - timerStartRef.current;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);
    const newTimeRemaining = timeRemainingAtStartRef.current - elapsedSeconds;

    if (newTimeRemaining <= 0) {
      // Timer terminou (pode ter terminado enquanto a tela estava desligada)
      usePomodoroStore.setState({ timeRemaining: 0 });

      // Atualiza o tempo de estudo decorrido
      const totalFocusElapsed = timeRemainingAtStartRef.current; // todo o tempo restante foi consumido
      const prevElapsed = usePomodoroStore.getState().elapsedSeconds;
      incrementElapsedTime(totalFocusElapsed - (timeRemainingAtStartRef.current - usePomodoroStore.getState().timeRemaining));

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
      const prevTimeRemaining = usePomodoroStore.getState().timeRemaining;
      const secondsPassed = prevTimeRemaining - newTimeRemaining;
      if (secondsPassed > 0) {
        incrementElapsedTime(secondsPassed);
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
      const isCompleted = !item.isAvulso && completedScheduleItems.includes(item.id);
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
  }, [schedules, weeklyItems, blockItems, topics, completedScheduleItems]);

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

    // 1. If item selected, use it
    if (selectedItemId) {
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
            // Args: title, subjectId, description, customDate, linkedScheduleItemId
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
    // 2. If no item selected but we have a current paused topic, resume it
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

    // 7. Resetar o timer
    resetTimer();
    usePomodoroStore.setState({ activeTopicId: null, activeSubjectId: null, activeScheduleItemId: null });
    // NÃO limpar selectedItemId - mantém o item selecionado para permitir adicionar outro tópico
  };

  // Função para FINALIZAR o bloco (marcar como concluído e encerrar)
  const handleFinishBlock = (itemId?: string) => {
    const targetId = itemId || selectedItemId;
    if (!targetId) return;

    // Marca o bloco como concluído
    toggleScheduleItemCompletion(targetId);

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
    if (!selectedItemId) return true; // Nothing selected

    const selectedPlan = todayPlannedItems.find(p => p.item.id === selectedItemId);
    if (!selectedPlan) return true;

    // Permitir iniciar sem tópico definido — o tópico será preenchido ao finalizar
    return false;
  }, [currentState, currentTopicId, selectedItemId, todayPlannedItems]);

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

  return (
    <div className="max-w-md mx-auto space-y-8 pb-24">
      {/* Header Minimalista */}
      <div className="flex items-center justify-between px-2">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Foco</h2>
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 transition-colors ${currentState === 'focus'
          ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
          : 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${currentState === 'focus' ? 'bg-primary-500' : 'bg-green-500'
            }`}></span>
          {getStatusText()}
        </div>
      </div>

      {/* Timer Principal */}
      <div className="flex flex-col items-center justify-center py-4">
        <div className="relative">
          <div className="text-8xl font-light tracking-tighter text-gray-900 dark:text-white font-mono tabular-nums select-none">
            {formatTime(timeRemaining)}
          </div>
        </div>

        <p className="text-gray-500 dark:text-gray-400 text-sm mt-4 font-medium">
          {currentState === 'focus' && !isRunning ? 'Selecione uma tarefa para começar' :
            currentState === 'focus' ? 'Mantenha o foco' : 'Hora de relaxar'}
        </p>
      </div>

      {/* Controles Minimalistas */}
      <div className="flex items-center justify-center gap-8">
        <button
          onClick={resetTimer}
          className="group p-4 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title="Reiniciar"
        >
          <ArrowPathIcon className="h-6 w-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </button>

        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={isStartDisabled}
            className="bg-primary-600 hover:bg-primary-700 text-white rounded-2xl p-6 shadow-xl shadow-primary-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
          >
            <PlayIcon className="h-10 w-10 pl-1" />
          </button>
        ) : (
          <button
            onClick={pauseTimer}
            className="bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-2xl p-6 shadow-xl transition-all transform hover:scale-105 active:scale-95"
          >
            <PauseIcon className="h-10 w-10" />
          </button>
        )}

        <button
          onClick={() => skipToNext(false)}
          className="group p-4 rounded-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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

      {/* Seção de Itens Planejados para Hoje */}
      {todayPlannedItems.length > 0 && (
        <div className="space-y-4 animate-fade-in px-2">
          <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest text-center">
            Planejado para Hoje
          </h3>
          <div className="space-y-3">
            {todayPlannedItems.map((plannedItem, index) => {
              const { item, status } = plannedItem;
              const subject = subjects.find(s => s.id === item.subjectId);
              if (!subject) return null;

              const isCompleted = status === 'completed';
              const isSelected = selectedItemId === item.id;
              const linkedTopic = topics.find(t => t.linkedScheduleItemId === item.id);

              // Determine which topic is effectively selected (linked, pre-defined, or overridden)
              // If override exists, try to find topic by name for display purposes
              let effectiveTopic = linkedTopic;
              if (!effectiveTopic && item.topicId) {
                effectiveTopic = topics.find(t => t.id === item.topicId);
              }
              if (!effectiveTopic && selectedTopicOverrides[item.id]) {
                effectiveTopic = topics.find(t => t.title.toLowerCase() === selectedTopicOverrides[item.id].toLowerCase() && t.subjectId === item.subjectId);
              }

              // Lock other items if timer is running for a specific item
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
                          {linkedTopic ? linkedTopic.title : subject.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {linkedTopic && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {subject.name}
                            </span>
                          )}
                          {!linkedTopic && item.topicId && (
                            <span className={`text-xs font-medium ${isLocked ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              {topics.find(t => t.id === item.topicId)?.title}
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
                          // Se o item já tem tópico definido, finaliza direto
                          if (item.topicId || linkedTopic) {
                            handleFinishContent(item.id);
                          } else {
                            // Entra no modo "O que você estudou?" — pede o tópico
                            setFinishingItemId(item.id);
                            // Pausa o timer se estiver rodando
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

                  {/* Tópicos já estudados neste bloco */}
                  {completedTopicsPerItem[item.id] && completedTopicsPerItem[item.id].length > 0 && !isCompleted && (
                    <div className="pl-5 animate-fade-in">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Tópicos estudados:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {completedTopicsPerItem[item.id].map(topicId => {
                          const topic = topics.find(t => t.id === topicId);
                          return topic ? (
                            <span key={topicId} className="text-xs bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full border border-green-100 dark:border-green-900/50 flex items-center gap-1">
                              <CheckCircleIcon className="h-3 w-3" />
                              {topic.title}
                            </span>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Input de tópico — aparece ao clicar ✓ (modo finalização) ou ao ter tópicos já estudados */}
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
                        {/* Botão Confirmar — só aparece quando tem texto digitado */}
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

                      {/* Botão Cancelar — volta ao estado normal sem registrar */}
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

                      {/* Botão Finalizar Estudo - aparece quando já estudou pelo menos 1 tópico */}
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

      <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-8">
        <span>{completedPomodoros}</span>
        <span>sessões hoje</span>
      </div>
    </div>
  );
}