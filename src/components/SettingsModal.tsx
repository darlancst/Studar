'use client';

import { useState, useEffect } from 'react';
import { useRegisterModal } from '@/hooks/useRegisterModal';
import {
  XMarkIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  PaintBrushIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckIcon,
  PaperAirplaneIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import { useSettingsStore, HeatmapThresholds } from '@/store/settingsStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useAuthStore } from '@/store/authStore';
import { useVacationStore } from '@/store/vacationStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useEditalStore } from '@/store/editalStore';
import { useGoalStore } from '@/store/goalStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SyncStatus from '@/components/SyncStatus';
import { ALARM_OPTIONS, playAlarmSound } from '@/utils/sounds';

interface SettingsModalProps {
  onClose: () => void;
}

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetAction, setResetAction] = useState<'stats' | 'all'>('all');
  const [showVacationModal, setShowVacationModal] = useState(false);

  useRegisterModal(showResetConfirm, () => setShowResetConfirm(false));
  useRegisterModal(showVacationModal, () => setShowVacationModal(false));
  const [vacationStartDate, setVacationStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [vacationEndDate, setVacationEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { user } = useAuthStore();
  const { vacationPeriods, addVacation } = useVacationStore();
  const {
    darkMode,
    toggleDarkMode,
    resetStats,
    resetPomodoros,
    resetAllData,
    weeklyGoal,
    setWeeklyGoal,
    reviewIntervals,
    setReviewIntervals,
    heatmapThresholds,
    setHeatmapThresholds,
    soundEnabled,
    toggleSoundEnabled
  } = useSettingsStore();

  const { settings: pomodoroSettings, updateSettings: updatePomodoroSettings } = usePomodoroStore();

  // Estado para gerenciar o valor da meta semanal no formulário
  const [goalHours, setGoalHours] = useState(Math.floor(weeklyGoal / 60));
  const [goalMinutes, setGoalMinutes] = useState(weeklyGoal % 60);

  // Estado para gerenciar os intervalos de revisão
  const [intervals, setIntervals] = useState<number[]>(reviewIntervals);
  const [newInterval, setNewInterval] = useState<number>(1);

  // Estado para gerenciar os limiares de tempo do heatmap
  const [thresholds, setThresholds] = useState<HeatmapThresholds>({ ...heatmapThresholds });

  // Estados locais para campos do Pomodoro (armazenados como string para permitir digitação livre e campo vazio)
  const [localFocus, setLocalFocus] = useState(pomodoroSettings.focusDuration.toString());
  const [localShortBreak, setLocalShortBreak] = useState(pomodoroSettings.shortBreakDuration.toString());
  const [localLongBreak, setLocalLongBreak] = useState(pomodoroSettings.longBreakDuration.toString());
  const [localLongBreakInterval, setLocalLongBreakInterval] = useState(pomodoroSettings.longBreakInterval.toString());

  // Atualizar o estado local quando as configurações mudarem
  useEffect(() => {
    setIntervals(reviewIntervals);
    setThresholds({ ...heatmapThresholds });
    setLocalFocus(pomodoroSettings.focusDuration.toString());
    setLocalShortBreak(pomodoroSettings.shortBreakDuration.toString());
    setLocalLongBreak(pomodoroSettings.longBreakDuration.toString());
    setLocalLongBreakInterval(pomodoroSettings.longBreakInterval.toString());
  }, [reviewIntervals, heatmapThresholds, pomodoroSettings]);

  // Função para atualizar a meta de tempo semanal
  const handleUpdateWeeklyGoal = () => {
    const totalMinutes = (goalHours * 60) + goalMinutes;
    setWeeklyGoal(totalMinutes);
  };

  // Função para adicionar um novo intervalo
  const handleAddInterval = () => {
    if (newInterval > 0 && !intervals.includes(newInterval)) {
      const updatedIntervals = [...intervals, newInterval];
      setIntervals(updatedIntervals);
      setReviewIntervals(updatedIntervals);
      setNewInterval(1);
    }
  };

  // Função para remover um intervalo
  const handleRemoveInterval = (intervalToRemove: number) => {
    if (intervals.length > 1) { // Manter pelo menos um intervalo
      const updatedIntervals = intervals.filter(interval => interval !== intervalToRemove);
      setIntervals(updatedIntervals);
      setReviewIntervals(updatedIntervals);
    }
  };

  // Função para atualizar um limiar específico
  const handleThresholdChange = (level: keyof HeatmapThresholds, value: number) => {
    const updatedThresholds = { ...thresholds, [level]: value };
    setThresholds(updatedThresholds);
  };

  // Função para salvar os limiares atualizados
  const handleSaveThresholds = () => {
    // Ordenar os valores para garantir consistência (level1 < level2 < level3 < etc)
    const orderedThresholds: HeatmapThresholds = {
      level1: Math.min(thresholds.level1, thresholds.level2, thresholds.level3, thresholds.level4, thresholds.level5),
      level2: 0,
      level3: 0,
      level4: 0,
      level5: 0
    };

    // Encontrar o próximo valor maior para cada nível
    const values = [thresholds.level1, thresholds.level2, thresholds.level3, thresholds.level4, thresholds.level5].sort((a, b) => a - b);
    orderedThresholds.level1 = values[0];
    orderedThresholds.level2 = values[1];
    orderedThresholds.level3 = values[2];
    orderedThresholds.level4 = values[3];
    orderedThresholds.level5 = values[4];

    setThresholds(orderedThresholds);
    setHeatmapThresholds(orderedThresholds);
  };

  // Função para resetar os limiares para os valores padrão
  const handleResetThresholds = () => {
    const defaultThresholds: HeatmapThresholds = {
      level1: 30,
      level2: 60,
      level3: 120,
      level4: 180,
      level5: 240
    };
    setThresholds(defaultThresholds);
    setHeatmapThresholds(defaultThresholds);
  };

  // Função para resetar todas as estatísticas
  const handleResetStats = () => {
    resetStats();
    setShowResetConfirm(false);
  };

  // Função para resetar os pomodoros
  const handleResetPomodoros = () => {
    resetPomodoros();
  };

  // Função para resetar todos os dados
  const handleResetAllData = () => {
    resetAllData();
    setShowResetConfirm(false);
  };

  const handleShowResetConfirm = (type: 'stats' | 'all') => {
    setResetAction(type);
    setShowResetConfirm(true);
  };

  const handleConfirmReset = () => {
    if (resetAction === 'stats') {
      handleResetStats();
    } else {
      handleResetAllData();
    }
  };

  // Função para aplicar folga de 1 dia
  const handleDayOff = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    addVacation(today, today);
    alert('Folga aplicada! Todas as tarefas foram adiadas para amanhã.');
  };

  // Função para aplicar período de férias
  const handleApplyVacation = () => {
    if (vacationStartDate && vacationEndDate) {
      addVacation(vacationStartDate, vacationEndDate);
      setShowVacationModal(false);
      alert('Férias aplicadas! Todas as tarefas foram adiadas.');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md max-h-full overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <div className="flex items-center">
            <Cog6ToothIcon className="h-6 w-6 mr-2 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-semibold dark:text-white">Configurações</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Seção de Conta */}
          {user && (
            <div className="pb-4 border-b dark:border-gray-700">
              <div className="flex items-center mb-2">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Conectado como:</span>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white truncate">
                {user.email}
              </p>
            </div>
          )}

          {/* Seção de Sincronização */}
          <div className="pb-4 border-b dark:border-gray-700">
            <div className="flex items-center mb-4">
              <ArrowPathIcon className="h-5 w-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sincronização</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Status e ações de sincronização da sua conta.
            </p>
            <div className="relative">
              <SyncStatus />
            </div>
          </div>

          {/* Seção de Aparência */}
          <div className="pb-3 border-b dark:border-gray-700">
            <div className="flex items-center mb-2">
              <PaintBrushIcon className="h-5 w-5 mr-2 text-indigo-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Aparência</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Tema</span>
              <button
                onClick={toggleDarkMode}
                className="flex items-center px-4 py-2 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              >
                {darkMode ? (
                  <>
                    <SunIcon className="h-5 w-5 mr-2 text-yellow-500" aria-hidden="true" />
                    Modo Claro
                  </>
                ) : (
                  <>
                    <MoonIcon className="h-5 w-5 mr-2 text-indigo-500" aria-hidden="true" />
                    Modo Escuro
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Seção de Pomodoro */}
          <div className="pb-3 border-b dark:border-gray-700">
            <div className="flex items-center mb-2">
              <ClockIcon className="h-5 w-5 mr-2 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Pomodoro</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Foco (min)
                </label>
                <input
                  type="number"
                  value={localFocus}
                  onChange={(e) => setLocalFocus(e.target.value)}
                  onBlur={() => {
                    let val = parseInt(localFocus);
                    if (isNaN(val) || val < 1) {
                      val = 25;
                    }
                    setLocalFocus(val.toString());
                    updatePomodoroSettings({ focusDuration: val });
                  }}
                  className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pausa Curta (min)
                </label>
                <input
                  type="number"
                  value={localShortBreak}
                  onChange={(e) => setLocalShortBreak(e.target.value)}
                  onBlur={() => {
                    let val = parseInt(localShortBreak);
                    if (isNaN(val) || val < 1) {
                      val = 5;
                    }
                    setLocalShortBreak(val.toString());
                    updatePomodoroSettings({ shortBreakDuration: val });
                  }}
                  className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Pausa Longa (min)
                </label>
                <input
                  type="number"
                  value={localLongBreak}
                  onChange={(e) => setLocalLongBreak(e.target.value)}
                  onBlur={() => {
                    let val = parseInt(localLongBreak);
                    if (isNaN(val) || val < 1) {
                      val = 15;
                    }
                    setLocalLongBreak(val.toString());
                    updatePomodoroSettings({ longBreakDuration: val });
                  }}
                  className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Intervalo P. Longa
                </label>
                <input
                  type="number"
                  value={localLongBreakInterval}
                  onChange={(e) => setLocalLongBreakInterval(e.target.value)}
                  onBlur={() => {
                    let val = parseInt(localLongBreakInterval);
                    if (isNaN(val) || val < 1) {
                      val = 4;
                    }
                    setLocalLongBreakInterval(val.toString());
                    updatePomodoroSettings({ longBreakInterval: val });
                  }}
                  className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                />
              </div>

              {/* Configuração de Som do Alarme */}
              <div className="col-span-2 mt-2 pt-2 border-t dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Som do Alarme
                  </label>
                  <button
                    type="button"
                    onClick={() => updatePomodoroSettings({ soundEnabled: !pomodoroSettings.soundEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none ${
                      pomodoroSettings.soundEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                        pomodoroSettings.soundEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {pomodoroSettings.soundEnabled && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Escolha o som e clique para testar:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {ALARM_OPTIONS.map(sound => {
                        const isSelected = (pomodoroSettings.selectedSound || 'digital') === sound.value;
                        return (
                          <button
                            key={sound.value}
                            type="button"
                            onClick={() => {
                              updatePomodoroSettings({ selectedSound: sound.value });
                              playAlarmSound(sound.value);
                            }}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all text-center hover:scale-[1.02] active:scale-95 cursor-pointer ${
                              isSelected
                                ? 'border-primary-500 bg-primary-50/80 dark:bg-primary-950/40 shadow-sm ring-1 ring-primary-500/30'
                                : 'border-gray-200/80 dark:border-gray-700/80 hover:border-gray-300 dark:hover:border-gray-600 bg-white/50 dark:bg-gray-800/40'
                            }`}
                          >
                            <span className="text-xl mb-0.5">{sound.emoji}</span>
                            <span className={`text-xs font-semibold truncate w-full ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                              {sound.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>


          {/* Seção de Metas */}
          <div className="pb-3 border-b dark:border-gray-700">
            <div className="flex items-center mb-2">
              <ChartBarIcon className="h-5 w-5 mr-2 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Metas</h3>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meta semanal de estudo
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label htmlFor="goalHours" className="sr-only">
                      Horas
                    </label>
                    <input
                      type="number"
                      id="goalHours"
                      min="0"
                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 pr-8"
                      style={{ appearance: 'textfield' }}
                      value={goalHours}
                      onChange={(e) => setGoalHours(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">h</span>
                  <div className="flex-1">
                    <label htmlFor="goalMinutes" className="sr-only">
                      Minutos
                    </label>
                    <input
                      type="number"
                      id="goalMinutes"
                      min="0"
                      max="59"
                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 pr-8"
                      style={{ appearance: 'textfield' }}
                      value={goalMinutes}
                      onChange={(e) => setGoalMinutes(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <span className="text-gray-500 dark:text-gray-400">min</span>
                  <button
                    type="button"
                    onClick={handleUpdateWeeklyGoal}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Revisões */}
          <div className="pb-3 border-b dark:border-gray-700">
            <div className="flex items-center mb-2">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Intervalos de Revisão</h3>
            </div>
            <div className="space-y-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Intervalos atuais (dias):
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {intervals.sort((a, b) => a - b).map((interval) => (
                    <div key={interval} className="inline-flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-md">
                      <span className="text-gray-800 dark:text-gray-200">{interval} {interval === 1 ? 'dia' : 'dias'}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInterval(interval)}
                        className="ml-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label htmlFor="newInterval" className="sr-only">
                      Novo intervalo (dias)
                    </label>
                    <input
                      type="number"
                      id="newInterval"
                      min="1"
                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2 pr-8"
                      style={{ appearance: 'textfield' }}
                      value={newInterval}
                      onChange={(e) => setNewInterval(parseInt(e.target.value) || 1)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddInterval}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    <PlusIcon className="h-5 w-5" aria-hidden="true" />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Seção de Férias/Folgas */}
          <div className="pb-3 border-b dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <SunIcon className="h-5 w-5 mr-2 text-yellow-500" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Férias e Folgas</h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              Pause seus cronogramas temporariamente.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDayOff}
                className="w-full px-4 py-2.5 rounded-lg bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 border border-cyan-200 dark:border-cyan-800 transition-colors flex items-center justify-center gap-2"
              >
                <SunIcon className="h-5 w-5" />
                Tirar Folga Hoje (1 dia)
              </button>
              <button
                onClick={() => setShowVacationModal(true)}
                className="w-full px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-800 transition-colors flex items-center justify-center gap-2"
              >
                <CalendarIcon className="h-5 w-5" />
                Programar Férias...
              </button>
              {vacationPeriods.length > 0 && (
                <div className="mt-2 pt-2 border-t dark:border-gray-700">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Histórico:</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {vacationPeriods.slice(-5).reverse().map((v) => (
                      <div key={v.id} className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                        {format(parseISO(v.startDate), "dd/MM/yy", { locale: ptBR })}
                        {v.startDate !== v.endDate && (
                          <span> a {format(parseISO(v.endDate), "dd/MM/yy", { locale: ptBR })}</span>
                        )}
                        <span className="text-gray-400">({v.days} {v.days === 1 ? 'dia' : 'dias'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gerenciamento de Dados */}
          <div className="pt-2">
            <div className="flex items-center mb-2">
              <TrashIcon className="h-5 w-5 mr-2 text-red-500" />
              <h3 className="text-lg font-medium text-red-600 dark:text-red-400">Zona de Perigo</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">Pomodoros</span>
                </div>
                <button
                  onClick={handleResetPomodoros}
                  className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm flex items-center"
                >
                  <ArrowPathIcon className="h-4 w-4 mr-1" />
                  Reiniciar contagem
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ChartBarIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">Estatísticas</span>
                </div>
                <button
                  onClick={() => handleShowResetConfirm('stats')}
                  className="px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/30 text-sm flex items-center"
                >
                  <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                  Reiniciar estatísticas
                </button>
              </div>

              <div className="border-t dark:border-gray-700 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Backup Manual de Segurança</h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={() => {
                      const data = {
                        subjects: useSubjectStore.getState().subjects,
                        topics: useTopicStore.getState().topics,
                        reviews: useReviewStore.getState().reviews,
                        pomodoroSessions: usePomodoroStore.getState().sessions,
                        simulados: useSimuladosStore.getState().simulados,
                        editalItems: useEditalStore.getState().items,
                        goals: useGoalStore.getState().goals,
                        activeGoalId: useGoalStore.getState().activeGoalId,
                        schedules: useScheduleStore.getState().schedules,
                        weeklyItems: useScheduleStore.getState().weeklyItems,
                        blockItems: useScheduleStore.getState().blockItems,
                        completedScheduleItems: useScheduleStore.getState().completedScheduleItems,
                        vacationPeriods: useVacationStore.getState().vacationPeriods,
                        settings: useSettingsStore.getState(),
                        exportDate: new Date().toISOString()
                      };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `studar-backup-${new Date().toISOString().split('T')[0]}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    className="w-full px-3 py-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/30 text-sm flex items-center justify-center font-medium"
                  >
                    Exportar Backup
                  </button>
                  <label className="w-full px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/30 text-sm flex items-center justify-center cursor-pointer font-medium">
                    Importar Backup
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = async (event) => {
                          try {
                            const data = JSON.parse(event.target?.result as string);
                            if (data.subjects) useSubjectStore.setState({ subjects: data.subjects });
                            if (data.topics) useTopicStore.setState({ topics: data.topics });
                            if (data.reviews) useReviewStore.setState({ reviews: data.reviews });
                            if (data.pomodoroSessions) usePomodoroStore.setState({ sessions: data.pomodoroSessions });
                            if (data.simulados) useSimuladosStore.setState({ simulados: data.simulados });
                            if (data.editalItems) useEditalStore.setState({ items: data.editalItems });
                            if (data.goals) useGoalStore.setState({ goals: data.goals, activeGoalId: data.activeGoalId || null });
                            if (data.schedules) useScheduleStore.setState({ schedules: data.schedules });
                            if (data.weeklyItems) useScheduleStore.setState({ weeklyItems: data.weeklyItems });
                            if (data.blockItems) useScheduleStore.setState({ blockItems: data.blockItems });
                            if (data.completedScheduleItems) useScheduleStore.setState({ completedScheduleItems: data.completedScheduleItems });
                            if (data.vacationPeriods) useVacationStore.setState({ vacationPeriods: data.vacationPeriods });
                            
                            // Forçar sync pra nuvem
                            import('@/services/firebaseSync').then(m => m.firebaseSync.syncToCloud());
                            alert('Backup importado com sucesso!');
                          } catch (err) {
                            alert('Arquivo de backup inválido.');
                          }
                        };
                        reader.readAsText(file);
                        e.target.value = ''; // reset input
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="border-t dark:border-gray-700 pt-4 mt-4">
                <button
                  onClick={() => handleShowResetConfirm('all')}
                  className="w-full px-4 py-2 rounded-md bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/30 flex items-center justify-center"
                >
                  <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                  Reiniciar todos os dados
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Esta ação reiniciará todos os dados, incluindo estatísticas, histórico de sessões e contadores.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white text-red-600 dark:text-red-400 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
              {resetAction === 'stats' ? 'Reiniciar Estatísticas' : 'Reiniciar Todos os Dados'}
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              {resetAction === 'stats' ? (
                <>Tem certeza que deseja reiniciar todas as estatísticas? Isso <strong className="font-bold text-red-600 dark:text-red-400">excluirá permanentemente</strong> todos os seus registros de estudo e progresso. Esta ação não pode ser desfeita.</>
              ) : (
                <>Tem certeza que deseja reiniciar todos os dados? Isso <strong className="font-bold text-red-600 dark:text-red-400">excluirá permanentemente</strong> todas as suas matérias, tópicos, revisões, sessões de estudo e estatísticas. Esta ação não pode ser desfeita.</>
              )}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 mr-1" />
                Cancelar
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center"
              >
                <CheckIcon className="h-4 w-4 mr-1" />
                Sim, Reiniciar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Férias */}
      {showVacationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 dark:text-white text-cyan-600 dark:text-cyan-400 flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              Programar Férias
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Todas as tarefas a partir da data inicial serão adiadas.
            </p>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Início</label>
                <input type="date" value={vacationStartDate} onChange={(e) => setVacationStartDate(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Término</label>
                <input type="date" value={vacationEndDate} onChange={(e) => setVacationEndDate(e.target.value)} min={vacationStartDate} className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
              <p className="text-xs text-amber-700 dark:text-amber-400"><strong>O que será adiado:</strong> Revisões, Blocos, Cronogramas e Simulados.</p>
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setShowVacationModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center">
                <XMarkIcon className="h-4 w-4 mr-1" />Cancelar
              </button>
              <button onClick={handleApplyVacation} className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 flex items-center">
                <CheckIcon className="h-4 w-4 mr-1" />Aplicar Férias
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}