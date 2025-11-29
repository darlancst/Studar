import { useState, useEffect, useRef } from 'react';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { useReviewStore } from '@/store/reviewStore';
import { PlayIcon, PauseIcon, StopIcon, ForwardIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { format, startOfDay, isWithinInterval, parseISO, getDay, isSameDay } from 'date-fns';
import confetti from 'canvas-confetti';

export default function Pomodoro() {
  const { subjects } = useSubjectStore();
  const { topics } = useTopicStore();
  const {
    activeSubjectId,
    activeTopicId,
    currentState,
    isRunning,
    timeRemaining,
    completedPomodoros,
    startTimer,
    pauseTimer,
    resetTimer,
    skipToNext,
    incrementElapsedTime
  } = usePomodoroStore();

  const { generateReviewsForTopic } = useReviewStore();

  const { schedules, weeklyItems, blockItems, completedScheduleItems, toggleScheduleItemCompletion } = useScheduleStore();

  const [selectedItemId, setSelectedItemId] = useState<string>('');

  // Sync with active session from store (Context API)
  useEffect(() => {
    // Tenta encontrar o item planejado correspondente ao tópico ativo para destacar na lista
    if (activeTopicId) {
      const plannedItem = getTodayPlannedItems().find(p => p.item.topicId === activeTopicId);
      if (plannedItem) {
        setSelectedItemId(plannedItem.item.id);
      }
    }
  }, [activeTopicId]);

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
          const audio = new Audio('/notification.mp3');
          audio.play().catch(e => console.log('Audio play failed', e));

          if (currentState === 'focus') {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }

          skipToNext();
        } else {
          incrementElapsedTime(1);
          usePomodoroStore.setState(state => ({ timeRemaining: state.timeRemaining - 1 }));
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, currentState, skipToNext, incrementElapsedTime]);

  // Obter itens planejados para hoje
  const getTodayPlannedItems = () => {
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

    return plannedItems.map(item => {
      const isCompleted = completedScheduleItems.includes(item.id);
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
  };

  const todayPlannedItems = getTodayPlannedItems();

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    let subjectIdToStart = '';

    if (selectedItemId) {
      const selectedPlan = todayPlannedItems.find(p => p.item.id === selectedItemId);
      if (selectedPlan) {
        subjectIdToStart = selectedPlan.item.topicId || selectedPlan.item.subjectId;
      }
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

    // 2. Se houver um tópico ativo, gera revisões (First Study)
    if (activeTopicId) {
      // Gera as revisões (1, 7, 30 dias)
      generateReviewsForTopic(activeTopicId);
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
      usePomodoroStore.setState({ activeTopicId: null, activeSubjectId: null });
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
          <StopIcon className="h-6 w-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
        </button>

        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={currentState === 'focus' && !selectedItemId}
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
          onClick={skipToNext}
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

              return (
                <div
                  key={index}
                  onClick={() => {
                    if (!isCompleted) setSelectedItemId(item.id);
                  }}
                  className={`group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer
                    ${isCompleted
                      ? 'bg-gray-50 border-transparent dark:bg-gray-800/30 opacity-60'
                      : isSelected
                        ? 'bg-white dark:bg-gray-800 border-primary-500 ring-1 ring-primary-500 shadow-md'
                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 shadow-sm hover:shadow-md'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-1.5 h-12 rounded-full transition-all ${isSelected ? 'scale-y-110' : 'scale-y-90 opacity-70'}`}
                      style={{ backgroundColor: subject.color, filter: isCompleted ? 'grayscale(100%)' : 'none' }}
                    />
                    <div>
                      <p className={`font-semibold text-base ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {linkedTopic ? linkedTopic.title : subject.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {linkedTopic && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {subject.name}
                          </span>
                        )}
                        {!linkedTopic && item.topicId && (
                          <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
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
                        Selecionado
                      </span>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFinishContent(item.id);
                      }}
                      className={`p-2 rounded-full transition-all ${isCompleted
                        ? 'text-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'text-gray-300 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20'
                        }`}
                    >
                      <CheckCircleIcon className="h-6 w-6" />
                    </button>
                  </div>
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