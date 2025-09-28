'use client';

import { useSimuladosStore } from '@/store/simuladosStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Simulado } from '@/types';

interface SimuladosListProps {
  simulados: Simulado[];
  onEdit: (simulado: Simulado) => void;
  onRemove: (id: string) => void;
}

export default function SimuladosList({ simulados, onEdit, onRemove }: SimuladosListProps) {
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);

  const getSubjectName = (subjectId: string) => {
    return subjects.find((s) => s.id === subjectId)?.name || 'N/A';
  };

  const getTopicTitle = (topicId?: string) => {
    if (!topicId) return 'Geral';
    return topics.find((t) => t.id === topicId)?.title || 'N/A';
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 70) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (simulados.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Nenhum simulado encontrado para os filtros selecionados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {simulados.map((simulado) => {
        const percentage = (simulado.hits / simulado.questions) * 100;
        return (
          <div key={simulado.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Header do Simulado */}
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xs font-semibold text-gray-900 dark:text-white truncate mr-2">
                    {simulado.name || `Simulado de ${new Date(simulado.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}`}
                  </h3>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => onEdit(simulado)} 
                      className="p-0.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      title="Editar simulado"
                    >
                      <PencilIcon className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => onRemove(simulado.id)} 
                      className="p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      title="Excluir simulado"
                    >
                      <TrashIcon className="h-3 w-3" />
                    </button>
                  </div>
                </div>

                {/* Informações do Simulado */}
                <div className="space-y-0.5">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {getSubjectName(simulado.subjectId)} → {getTopicTitle(simulado.topicId)}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(simulado.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}
                      {simulado.timeSpent && ` • ${simulado.timeSpent} min`}
                    </p>
                    {simulado.timeSpent && simulado.questions > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {(simulado.timeSpent / simulado.questions).toFixed(1)} min/q
                      </p>
                    )}
                  </div>
                </div>

                {/* Resultado */}
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-baseline space-x-1.5">
                    <span className={`text-base font-bold ${getPerformanceColor(percentage)}`}>
                      {percentage.toFixed(1)}%
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({simulado.hits}/{simulado.questions})
                    </span>
                  </div>
                  
                  {/* Badge de Performance */}
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                    percentage >= 80 ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' :
                    percentage >= 70 ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' :
                    percentage >= 60 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                  }`}>
                    {percentage >= 80 ? 'Ótimo' :
                     percentage >= 70 ? 'Bom' :
                     percentage >= 60 ? 'Regular' : 'Precisa Melhorar'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 