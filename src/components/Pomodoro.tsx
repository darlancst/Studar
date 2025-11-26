'use client';

import { useState, useEffect, useRef } from 'react';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useTopicStore } from '@/store/topicStore';
import { useSubjectStore } from '@/store/subjectStore';
import { PomodoroSettings } from '@/types';
import { isSameDay } from 'date-fns';

export default function Pomodoro() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [showStartButton, setShowStartButton] = useState(false);

  const {
    currentState,
    isRunning,
    timeRemaining,
    currentTopicId,
    completedPomodoros,
    elapsedSeconds,
    settings,
    startTimer,
    pauseTimer,
    resetTimer,
    skipToNext,

    incrementElapsedTime,
    completeFocusSession,
    interruptFocusSession,
  } = usePomodoroStore();

  const { topics } = useTopicStore();
  const { subjects } = useSubjectStore();

  // Filtrar tópicos para mostrar apenas os de hoje
  const today = new Date();
  const todaysTopics = topics.filter(topic => {
    try {
      const topicDate = new Date(topic.createdAt);
      return isSameDay(topicDate, today);
    } catch (e) {
      console.error("Erro ao parsear data do tópico:", topic.createdAt, e);
      return false;
    }
  });

  // Formatação do tempo
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Referência para o áudio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sons disponíveis
  const sounds = {
    rain: { name: 'Chuva', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
    forest: { name: 'Floresta', url: 'https://actions.google.com/sounds/v1/ambiences/forest_morning.ogg' },
    coffee: { name: 'Cafeteria', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  };

  // Efeito para tocar/pausar o som
  useEffect(() => {
    if (settings.soundEnabled && isRunning && currentState === 'focus') {
      if (!audioRef.current) {
        audioRef.current = new Audio(sounds[settings.selectedSound as keyof typeof sounds]?.url);
        audioRef.current.loop = true;
      } else if (audioRef.current.src !== sounds[settings.selectedSound as keyof typeof sounds]?.url) {
        audioRef.current.src = sounds[settings.selectedSound as keyof typeof sounds]?.url;
      }

      audioRef.current.play().catch(e => console.error("Erro ao tocar áudio:", e));
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [isRunning, settings.soundEnabled, settings.selectedSound, currentState]);

  // Atualiza o timer a cada segundo
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const state = usePomodoroStore.getState();

        if (state.timeRemaining <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);

          // Se estava em foco, APENAS incrementa o último segundo para contagem precisa
          // A sessão será salva pelo skipToNext
          if (state.currentState === 'focus') {
            state.incrementElapsedTime(1);
            // state.updateCurrentSession(true); // REMOVIDO - skipToNext fará o addSession
          }

          // Define isRunning como false ANTES de chamar skipToNext se for pausa
          // skipToNext cuidará de isRunning para o próximo estado.
          usePomodoroStore.setState({ isRunning: false, timeRemaining: 0 });

          // Avança para o próximo estado (pausa ou foco) - Isso chamará addSession se aplicável
          state.skipToNext();

        } else {
          // Decrementa o tempo restante sempre
          usePomodoroStore.setState({ timeRemaining: state.timeRemaining - 1 });

          // Incrementa elapsedSeconds APENAS se estiver em foco
          if (state.currentState === 'focus') {
            state.incrementElapsedTime(1);
          }
        }
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]); // A dependência é apenas isRunning

  // Título com base no estado atual
  const getStateTitle = (): string => {
    switch (currentState) {
      case 'focus':
        return 'Foco';
      case 'shortBreak':
        return 'Pausa Curta';
      case 'longBreak':
        return 'Pausa Longa';
      default:
        return 'Pomodoro';
    }
  };

  // Calcula os minutos diretamente do estado elapsedSeconds
  const displaySessionMinutes = Math.floor(elapsedSeconds / 60);

  // Função para calcular a porcentagem de progresso do timer
  const getProgressPercentage = (): number => {
    let totalTime: number;

    switch (currentState) {
      case 'focus':
        totalTime = settings.focusDuration * 60;
        break;
      case 'shortBreak':
        totalTime = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        totalTime = settings.longBreakDuration * 60;
        break;
      default:
        totalTime = settings.focusDuration * 60;
        break;
    }

    if (totalTime === 0) return 0;

    const elapsed = totalTime - timeRemaining;
    return Math.min(Math.max(elapsed / totalTime, 0), 1);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-2xl font-bold">Timer Pomodoro</h2>

      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-2.5">
        {/* Seleção de tópico */}
        <div className="mb-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Tópico de Estudo
          </label>
          <select
            value={currentTopicId || ''}
            onChange={(e) => {
              const newTopicId = e.target.value || null;
              const state = usePomodoroStore.getState();
              const previousTopicId = state.currentTopicId; // Guarda o ID anterior

              // Antes de mudar, INTERROMPE a sessão do TÓPICO ANTERIOR (se estava em foco)
              if (state.currentState === 'focus' && previousTopicId && state.elapsedSeconds > 0) {
                // Chama a ação centralizada para atualizar a sessão anterior
                interruptFocusSession(previousTopicId, state.elapsedSeconds);
                // Resetar elapsedSeconds ao trocar de tópico durante foco
                usePomodoroStore.setState({ elapsedSeconds: 0, lastMinuteUpdate: 0 });
              }

              // Atualiza o tópico atual no estado
              usePomodoroStore.setState({ currentTopicId: newTopicId });

              // Lógica para mostrar botão "Começar" e resetar timer
              if (newTopicId && !state.isRunning) {
                setShowStartButton(true);
                resetTimer();
              } else {
                setShowStartButton(false);
              }
            }}
            className="w-full p-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            disabled={isRunning}
          >
            <option value="">Selecione um tópico</option>
            {/* Mapear sobre os tópicos de hoje */}
            {todaysTopics.map((topic) => {
              const subject = subjects.find((s) => s.id === topic.subjectId);
              return (
                <option key={topic.id} value={topic.id}>
                  {subject?.name} - {topic.title}
                </option>
              );
            })}
          </select>
        </div>

        {/* Exibição do Timer com Layout Compacto */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-2">
          {/* SVG Circle Progress - Menor */}
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 flex-shrink-0">
            <svg
              className="transform -rotate-90 w-full h-full"
              viewBox="0 0 240 240"
            >
              {/* Background circle */}
              <circle
                cx="120"
                cy="120"
                r="100"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="120"
                cy="120"
                r="100"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                className={`transition-all duration-1000 ease-linear ${currentState === 'focus' ? 'text-primary-500' :
                  currentState === 'shortBreak' ? 'text-green-500' :
                    currentState === 'longBreak' ? 'text-blue-500' :
                      'text-gray-400'
                  } ${timeRemaining <= 60 && isRunning ? 'animate-pulse' : ''}`}
                style={{
                  strokeDasharray: `${2 * Math.PI * 100}`,
                  strokeDashoffset: `${2 * Math.PI * 100 * (1 - getProgressPercentage())}`,
                  filter: timeRemaining <= 10 && isRunning ? 'drop-shadow(0 0 8px currentColor)' : 'none',
                }}
              />
            </svg>
            {/* Timer Text */}
            <div
              className={`absolute inset-0 flex items-center justify-center dark:text-white text-xl sm:text-2xl font-bold transition-all duration-300 ${timeRemaining <= 10 && isRunning ? 'animate-pulse text-red-500 dark:text-red-400' : ''
                }`}
            >
              {formatTime(timeRemaining)}
            </div>
          </div>

          {/* Informações do Timer - Ao Lado */}
          <div className="text-center sm:text-left space-y-1">
            <p className="text-lg font-medium dark:text-white">{getStateTitle()}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Pomodoros completados: <span className="font-semibold">{completedPomodoros}</span>
            </p>

            {/* Mostra o tempo contabilizado na sessão atual */}
            {currentState === 'focus' && currentTopicId && isRunning && (
              <p className="text-xs text-green-600 dark:text-green-400">
                ⏱️ Tempo atual: <span className="font-semibold">{displaySessionMinutes} min</span>
              </p>
            )}

            {/* Informação do estado atual em mobile */}
            <div className="sm:hidden mt-2">
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${currentState === 'focus' ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' :
                currentState === 'shortBreak' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                  currentState === 'longBreak' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                    'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                {currentState === 'focus' ? '🎯 Foco' :
                  currentState === 'shortBreak' ? '☕ Pausa Curta' :
                    currentState === 'longBreak' ? '🛋️ Pausa Longa' : '⏸️ Pausado'}
              </div>
            </div>
          </div>
        </div>

        {/* Controles Compactos */}
        <div className="timer-controls mt-1">
          {/* Botão Começar (aparece apenas quando showStartButton é true) */}
          {showStartButton ? (
            <div className="flex justify-center">
              <button
                onClick={() => {
                  if (currentTopicId) {
                    startTimer(currentTopicId);
                    setShowStartButton(false);
                  }
                }}
                className="px-6 py-2 text-sm font-medium bg-green-600 text-white hover:bg-green-700 rounded-md transition-colors"
                disabled={!currentTopicId}
              >
                🎯 Começar
              </button>
            </div>
          ) : (
            /* Layout organizado para 3 botões - Mais compacto */
            <div className="flex justify-center gap-2 max-w-sm mx-auto">
              <button
                onClick={() => {
                  if (isRunning) {
                    pauseTimer();
                  } else {
                    if (currentState === 'focus' || currentState === 'idle') {
                      if (currentTopicId) {
                        if (currentState === 'idle' || timeRemaining === settings.focusDuration * 60) {
                          startTimer(currentTopicId);
                        } else {
                          usePomodoroStore.setState({ isRunning: true });
                        }
                        setShowStartButton(false);
                      }
                    } else {
                      usePomodoroStore.setState({ isRunning: true });
                    }
                  }
                }}
                className={`flex-1 px-3 py-1.5 text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 rounded-md transition-colors ${(!isRunning && (currentState === 'focus' || currentState === 'idle') && !currentTopicId)
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
                disabled={!isRunning && (currentState === 'focus' || currentState === 'idle') && !currentTopicId}
              >
                {isRunning
                  ? '⏸️ Pausar'
                  : (currentState === 'focus' || currentState === 'idle')
                    ? '▶️ Iniciar'
                    : '▶️ Retomar'}
              </button>

              <button
                onClick={resetTimer}
                className={`px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors ${currentState === 'idle' && !isRunning && elapsedSeconds === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : ''
                  }`}
                disabled={currentState === 'idle' && !isRunning && elapsedSeconds === 0}
              >
                🔄
              </button>

              <button
                onClick={skipToNext}
                className="px-3 py-1.5 text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-md transition-colors"
              >
                ⏭️
              </button>
            </div>
          )}
        </div>


      </div>
    </div>
  );
} 