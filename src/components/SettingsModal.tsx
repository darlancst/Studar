'use client';

import { useState, useEffect } from 'react';
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
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { useSettingsStore, HeatmapThresholds } from '@/store/settingsStore';
import { createClient } from '@/lib/supabase/client';

interface SettingsModalProps {
  onClose: () => void;
}
const supabase = createClient();

export default function SettingsModal({ onClose }: SettingsModalProps) {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetAction, setResetAction] = useState<'stats' | 'all'>('all');
  
  const { 
    settings,
    toggleDarkMode, 
    resetAllData, 
    setWeeklyGoal,
    setReviewIntervals,
  } = useSettingsStore(state => ({
    settings: state.settings,
    toggleDarkMode: state.toggleDarkMode,
    resetAllData: state.resetAllData,
    setWeeklyGoal: state.setWeeklyGoal,
    setReviewIntervals: state.setReviewIntervals,
  }));

  const { darkMode, weeklyGoal, reviewIntervals, heatmapThresholds } = settings;
  
  // Estado para gerenciar o valor da meta semanal no formulário
  const [goalHours, setGoalHours] = useState(Math.floor(weeklyGoal / 60));
  const [goalMinutes, setGoalMinutes] = useState(weeklyGoal % 60);

  // Estado para gerenciar os intervalos de revisão
  const [intervals, setIntervals] = useState<number[]>(reviewIntervals);
  const [newInterval, setNewInterval] = useState<number>(1);
  
  // Estado para gerenciar os limiares de tempo do heatmap
  const [thresholds, setThresholds] = useState<HeatmapThresholds>({...heatmapThresholds});

  // Atualizar o estado local quando as configurações mudarem
  useEffect(() => {
    setIntervals(reviewIntervals);
    setThresholds({...heatmapThresholds});
  }, [reviewIntervals, heatmapThresholds]);

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
    resetAllData();
    setShowResetConfirm(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login'; // Redireciona para a página de login
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4 max-h-[90vh] overflow-y-auto">
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

        <div className="p-6 space-y-6">
          {/* Seção de Aparência */}
          <div className="pb-4 border-b dark:border-gray-700">
            <div className="flex items-center mb-4">
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
            <div className="mt-4 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                Desenvolvido por <a href="https://github.com/darlancst" target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">darlancst</a>
                </p>
            </div>
          </div>
          
          {/* Seção de Metas */}
          <div className="pb-4 border-b dark:border-gray-700">
            <div className="flex items-center mb-4">
              <ChartBarIcon className="h-5 w-5 mr-2 text-green-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Metas</h3>
            </div>
            <div className="space-y-4">
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
                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
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
                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
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
          <div className="pb-4 border-b dark:border-gray-700">
            <div className="flex items-center mb-4">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Intervalos de Revisão</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Intervalos atuais (dias):
                </label>
                <div className="flex flex-wrap gap-2 mb-4">
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
                      className="block w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
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
          
          {/* Seção de personalização das cores do Histórico de Atividades */}
          <div className="pb-4 border-b dark:border-gray-700">
            <div className="flex items-center mb-4">
              <PaintBrushIcon className="h-5 w-5 mr-2 text-purple-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Histórico de Atividades</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Personalizar cores conforme o tempo de estudo:
                </label>
                
                <div className="space-y-4">
                  {/* Level 1 - primeira cor (mais clara) */}
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-sm mr-3" style={{ 
                      backgroundColor: darkMode ? '#1e40af20' : '#dbeafe',
                      border: '1px solid',
                      borderColor: darkMode ? '#1e40af40' : '#bfdbfe'
                    }}></div>
                    <span className="text-gray-700 dark:text-gray-300 mr-2">Até</span>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={thresholds.level1}
                      onChange={(e) => handleThresholdChange('level1', parseInt(e.target.value) || 1)}
                      className="w-20 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">min</span>
                  </div>
                  
                  {/* Level 2 */}
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-sm mr-3" style={{ 
                      backgroundColor: darkMode ? '#1e40af40' : '#bfdbfe',
                      border: '1px solid',
                      borderColor: darkMode ? '#1e40af60' : '#93c5fd'
                    }}></div>
                    <span className="text-gray-700 dark:text-gray-300 mr-2">Até</span>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={thresholds.level2}
                      onChange={(e) => handleThresholdChange('level2', parseInt(e.target.value) || 1)}
                      className="w-20 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">min</span>
                  </div>
                  
                  {/* Level 3 */}
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-sm mr-3" style={{ 
                      backgroundColor: darkMode ? '#1e40af60' : '#93c5fd',
                      border: '1px solid',
                      borderColor: darkMode ? '#1e40af80' : '#60a5fa'
                    }}></div>
                    <span className="text-gray-700 dark:text-gray-300 mr-2">Até</span>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={thresholds.level3}
                      onChange={(e) => handleThresholdChange('level3', parseInt(e.target.value) || 1)}
                      className="w-20 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">min</span>
                  </div>
                  
                  {/* Level 4 */}
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-sm mr-3" style={{ 
                      backgroundColor: darkMode ? '#1e40af80' : '#60a5fa',
                      border: '1px solid',
                      borderColor: darkMode ? '#1e40afA0' : '#3b82f6'
                    }}></div>
                    <span className="text-gray-700 dark:text-gray-300 mr-2">Até</span>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={thresholds.level4}
                      onChange={(e) => handleThresholdChange('level4', parseInt(e.target.value) || 1)}
                      className="w-20 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">min</span>
                  </div>
                  
                  {/* Level 5 */}
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-sm mr-3" style={{ 
                      backgroundColor: darkMode ? '#1e40afA0' : '#3b82f6',
                      border: '1px solid',
                      borderColor: darkMode ? '#1e40afC0' : '#2563eb'
                    }}></div>
                    <span className="text-gray-700 dark:text-gray-300 mr-2">Até</span>
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={thresholds.level5}
                      onChange={(e) => handleThresholdChange('level5', parseInt(e.target.value) || 1)}
                      className="w-20 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm p-2"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">min</span>
                  </div>
                  
                  {/* Level 6 (mais escura) */}
                  <div className="flex items-center">
                    <div className="w-6 h-6 rounded-sm mr-3" style={{ 
                      backgroundColor: darkMode ? '#1e40afC0' : '#2563eb',
                      border: '1px solid',
                      borderColor: darkMode ? '#1e40af' : '#1d4ed8'
                    }}></div>
                    <span className="text-gray-700 dark:text-gray-300">Mais de {thresholds.level5} min</span>
                  </div>
                </div>
                
                {/* Botões para salvar ou resetar */}
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={handleResetThresholds}
                    className="px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 text-sm flex items-center"
                  >
                    <ArrowPathIcon className="h-4 w-4 mr-1" />
                    Resetar
                  </button>
                  <button
                    onClick={handleSaveThresholds}
                    className="px-3 py-1 rounded-md bg-primary-600 text-white hover:bg-primary-700 text-sm flex items-center"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* Seção de Reset de Dados */}
          <div>
            <div className="flex items-center mb-4">
              <ArrowPathIcon className="h-5 w-5 mr-2 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Dados e Estatísticas</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <ClockIcon className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-gray-700 dark:text-gray-300">Pomodoros</span>
                </div>
                <button
                  onClick={handleResetAllData}
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

          {/* Seção da Conta */}
          <div className="pb-4 border-b dark:border-gray-700">
            <div className="flex items-center mb-4">
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Conta</h3>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-700 dark:text-gray-300">Sair da sua conta</span>
              <button
                onClick={handleLogout}
                className="flex items-center px-4 py-2 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/30 text-sm"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center">
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
    </div>
  );
} 