import { useState, useEffect, useRef, useMemo } from 'react';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useReviewStore } from '@/store/reviewStore';
import { PlayIcon, PauseIcon, ArrowPathIcon, ForwardIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { format, startOfDay, isWithinInterval, parseISO, getDay, isSameDay } from 'date-fns';
import confetti from 'canvas-confetti';
import { playNotificationSound } from '@/utils/sounds';

export default function Pomodoro() {
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


  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        const { timeRemaining } = usePomodoroStore.getState();

        if (timeRemaining <= 1) {
          // Timer finished (check <= 1 because we are about to decrement)
          usePomodoroStore.setState({ timeRemaining: 0 });

          // Play sound
          playNotificationSound();

          if (currentState === 'focus') {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }

          skipToNext(true);
        } else {
          incrementElapsedTime(1);
          usePomodoroStore.setState(state => ({ timeRemaining: state.timeRemaining - 1 }));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentState, skipToNext, incrementElapsedTime]);

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

  const handleFinishContent = (itemId?: string) => {
    // 1. Se houver um item planejado selecionado, marca como concluído
    const targetId = itemId || selectedItemId;
    const isAlreadyCompleted = targetId && completedScheduleItems.includes(targetId);

    if (targetId) {
      toggleScheduleItemCompletion(targetId);
    }

    // 2. Identificar o tópico para gerar revisões
    let topicIdToReview = '';

    // Tenta encontrar o item planejado
    const plannedItem = todayPlannedItems.find(p => p.item.id === targetId);

    if (plannedItem) {
      // a. Tenta encontrar tópico vinculado (criado via input ou previamente vinculado)
      const linkedTopic = topics.find(t => t.linkedScheduleItemId === targetId);
      if (linkedTopic) {
        topicIdToReview = linkedTopic.id;
      }
      // b. Se não, usa o topicId do item
      else if (plannedItem.item.topicId) {
        topicIdToReview = plannedItem.item.topicId;
      }
      // c. Fallback: verifica se há um override (caso a vinculação tenha falhado por algum motivo)
      else if (selectedTopicOverrides[targetId]) {
        const overrideTopic = topics.find(t =>
          t.subjectId === plannedItem.item.subjectId &&
          t.title.toLowerCase() === selectedTopicOverrides[targetId].toLowerCase()
        );
        if (overrideTopic) topicIdToReview = overrideTopic.id;
      }
    }

    // d. Fallback final: usa o tópico ativo/corrente se não encontrou pelo item
    if (!topicIdToReview) {
      topicIdToReview = currentTopicId || activeTopicId || '';
    }

    // Gera as revisões se encontrou um tópico válido
    if (topicIdToReview) {
      // Verify if it is a real topic and not just a subject ID or invalid ID
      const isValidTopic = topics.some(t => t.id === topicIdToReview);

      if (isValidTopic) {
        // Gera as revisões (1, 7, 30 dias)
        generateReviewsForTopic(topicIdToReview);
      }
    }

    // Feedback visual - Apenas se estiver marcando como concluído (não estava concluído antes)
    if (!isAlreadyCompleted) {
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF4500']
      });
    }

    // Reseta o timer/sessão se estiver rodando o item concluído
    if (targetId === selectedItemId) {
      resetTimer();
      usePomodoroStore.setState({ activeTopicId: null, activeSubjectId: null, activeScheduleItemId: null });
      setSelectedItemId('');
    }
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

    // Check if topic is already assigned
    if (selectedPlan.item.topicId) return false;

    // Check for linked topic
    const linkedTopic = topics.find(t => t.linkedScheduleItemId === selectedItemId);
    if (linkedTopic) return false;

    // Check for user input override
    const overrideText = selectedTopicOverrides[selectedItemId];
    return !overrideText || overrideText.trim().length === 0;
  }, [currentState, currentTopicId, selectedItemId, todayPlannedItems, topics, selectedTopicOverrides]);

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
                          if (!isLocked) handleFinishContent(item.id);
                        }}
                        disabled={isLocked}
                        className={`p-2 rounded-full transition-all ${isLocked
                          ? 'text-gray-300 cursor-not-allowed'
                          : isCompleted
                            ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'text-gray-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                          }`}
                      >
                        <CheckCircleIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Topic Input for Generic Subject Items */}
                  {!linkedTopic && !item.topicId && !isCompleted && isSelected && !isRunning && (
                    <div className="pl-5 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        placeholder="O que você vai estudar?"
                        value={selectedTopicOverrides[item.id] || ''}
                        onChange={(e) => {
                          setSelectedTopicOverrides(prev => ({
                            ...prev,
                            [item.id]: e.target.value
                          }));
                        }}
                        className="w-full text-sm p-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all placeholder-gray-400 dark:placeholder-gray-600"
                      />
                    </div>
                  )}

                  {/* Show selected topic if running or completed */}
                  {!linkedTopic && !item.topicId && (isRunning || isCompleted) && effectiveTopic && (
                    <div className="pl-5 animate-fade-in">
                      <p className="text-sm text-primary-600 dark:text-primary-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                        Estudando: <span className="font-medium">{effectiveTopic.title}</span>
                      </p>
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