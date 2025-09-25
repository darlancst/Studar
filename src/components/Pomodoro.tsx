'use client';

import { useState, useEffect, useRef } from 'react';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useTopicStore } from '@/store/topicStore';
import { useSubjectStore } from '@/store/subjectStore';
import { PomodoroSettings } from '@/types';
import { isSameDay } from 'date-fns';

export default function Pomodoro() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [showSettings, setShowSettings] = useState(false);
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
    updateSettings,
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
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Timer Pomodoro</h2>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          {showSettings ? 'Fechar Configurações' : 'Configurações'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        {/* Seleção de tópico */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
      
        {/* Exibição do Timer */}
        <div className="timer-display dark:text-white">
          {formatTime(timeRemaining)}
        </div>
        
        <div className="text-center mb-4">
          <p className="text-lg font-medium dark:text-white">{getStateTitle()}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Pomodoros completados: {completedPomodoros}
          </p>
          
          {/* Mostra o tempo contabilizado na sessão atual usando displaySessionMinutes */}
          {currentState === 'focus' && currentTopicId && isRunning && (
            <p className="text-sm text-green-600 dark:text-green-400 mt-1">
              Tempo atual: {displaySessionMinutes} min contabilizados
            </p>
          )}
        </div>
        
        {/* Controles */}
        <div className="timer-controls">
          {/* Botão Começar (aparece apenas quando showStartButton é true) */}
          {showStartButton && (
            <button
              onClick={() => {
                if (currentTopicId) {
                  startTimer(currentTopicId);
                  setShowStartButton(false); // Esconde o botão ao iniciar
                }
              }}
              className="timer-button bg-green-600 text-white hover:bg-green-700"
              disabled={!currentTopicId} // Desabilitado se, por algum motivo, não houver tópico
            >
              Começar
            </button>
          )}
          
          {/* Botões Play/Pause (aparem apenas quando showStartButton é false) */}
          {!showStartButton && (
            <button
              // OnClick: Lógica completa para iniciar/pausar/retomar
              onClick={() => {
                if (isRunning) {
                  pauseTimer(); // Pausa qualquer timer que esteja rodando
                } else { // Se não está rodando
                  if (currentState === 'focus' || currentState === 'idle') {
                    if(currentTopicId) {
                      // Se idle ou se o tempo restante for igual ao total, inicia NOVO timer
                      if (currentState === 'idle' || timeRemaining === settings.focusDuration * 60) {
                          startTimer(currentTopicId); 
                      } else {
                         // Se já começou (tempo restante < total), apenas RETOMA
                         usePomodoroStore.setState({ isRunning: true });
                      }
                      setShowStartButton(false); // Garante que o botão Começar não apareça
                    } 
                    // Não faz nada se não tiver tópico (botão já desabilitado)
                  } else { // Se for shortBreak ou longBreak parado
                    usePomodoroStore.setState({ isRunning: true }); // Retoma o timer da pausa
                  }
                }
              }}
              className={`timer-button bg-primary-600 text-white hover:bg-primary-700 ${
                // Desabilita apenas se for iniciar foco/idle SEM tópico
                (!isRunning && (currentState === 'focus' || currentState === 'idle') && !currentTopicId)
                 ? 'opacity-50 cursor-not-allowed' 
                 : ''
              }`}
              // Desabilita apenas se for iniciar foco/idle SEM tópico
              disabled={!isRunning && (currentState === 'focus' || currentState === 'idle') && !currentTopicId}
            >
              {/* Label: Pausar (rodando); Iniciar (parado e foco/idle); Retomar (parado e pausa) */}
              {isRunning 
                ? 'Pausar' 
                : (currentState === 'focus' || currentState === 'idle') 
                  ? 'Iniciar' 
                  : 'Retomar'}
            </button>
          )}
          
          <button
            onClick={resetTimer}
            className={`timer-button bg-gray-200 text-gray-700 hover:bg-gray-300 ${
              // Desabilita reset apenas se idle E zerado E parado
              currentState === 'idle' && !isRunning && elapsedSeconds === 0
                ? 'opacity-50 cursor-not-allowed' 
                : ''
            }`}
            disabled={currentState === 'idle' && !isRunning && elapsedSeconds === 0}
          >
            Reiniciar
          </button>
          
          <button
            onClick={skipToNext} // skipToNext agora inicia a pausa automaticamente
            className="timer-button bg-gray-200 text-gray-700 hover:bg-gray-300"
          >
            Pular
          </button>
        </div>
        
        {/* Configurações */}
        {showSettings && (
          <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-lg font-medium mb-4 dark:text-white">Configurações</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Duração de Foco (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.focusDuration}
                  onChange={(e) => updateSettings({ focusDuration: Number(e.target.value) })}
                  className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  disabled={isRunning}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pausa Curta (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.shortBreakDuration}
                  onChange={(e) => updateSettings({ shortBreakDuration: Number(e.target.value) })}
                  className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  disabled={isRunning}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pausa Longa (minutos)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.longBreakDuration}
                  onChange={(e) => updateSettings({ longBreakDuration: Number(e.target.value) })}
                  className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  disabled={isRunning}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intervalos até Pausa Longa
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.longBreakInterval}
                  onChange={(e) => updateSettings({ longBreakInterval: Number(e.target.value) })}
                  className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 