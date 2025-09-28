'use client';

import { useMemo } from 'react';
import { useSubjectStore } from '@/store/subjectStore';
import { Simulado } from '@/types';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { ChartBarIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';

interface PontosFracos {
  id: string;
  name: string;
  type: 'materia' | 'topico';
  media: number;
  count: number;
}

interface SimuladosStatsProps {
  simulados: Simulado[];
  onAnalyze: (type: 'materia' | 'topico', id: string) => void;
}

export default function SimuladosStats({ simulados, onAnalyze }: SimuladosStatsProps) {
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
  const scheduleReviewsForTopic = useReviewStore((state) => state.scheduleReviewsForTopic);

  const stats = useMemo(() => {
    if (simulados.length === 0) {
      return {
        totalSimulados: 0,
        mediaGeral: 0,
        desempenhoPorMateria: [],
        pontosFracos: [],
        pontosFortes: [],
        topicosEmQueda: [],
      };
    }

    const totalSimulados = simulados.length;
    const mediaGeral = simulados.reduce((acc, s) => acc + (s.hits / s.questions), 0) / totalSimulados * 100;

    const desempenhoPorMateria = subjects.map(subject => {
      const simuladosDaMateria = simulados.filter(s => s.subjectId === subject.id);
      if (simuladosDaMateria.length === 0) return null;
      const media = simuladosDaMateria.reduce((acc, s) => acc + (s.hits / s.questions), 0) / simuladosDaMateria.length * 100;
      return { id: subject.id, name: subject.name, type: 'materia' as const, media, count: simuladosDaMateria.length };
    }).filter(Boolean) as PontosFracos[];

    const desempenhoPorTopico = topics.map(topic => {
      const simuladosDoTopico = simulados.filter(s => s.topicId === topic.id);
      if (simuladosDoTopico.length === 0) return null;
      const media = simuladosDoTopico.reduce((acc, s) => acc + (s.hits / s.questions), 0) / simuladosDoTopico.length * 100;
      return { id: topic.id, name: topic.title, type: 'topico' as const, media, count: simuladosDoTopico.length };
    }).filter(Boolean) as PontosFracos[];

    const pontosFracos = [...desempenhoPorTopico, ...desempenhoPorMateria]
      .sort((a, b) => a.media - b.media)
      .slice(0, 3);

    const pontosFortes = [...desempenhoPorTopico, ...desempenhoPorMateria]
      .filter(p => p.media < 100)
      .sort((a, b) => b.media - a.media)
      .slice(0, 3);

    const topicosEmQueda = desempenhoPorTopico.filter(topico => {
        if (topico.count < 4) return false;

        const todosSimuladosDoTopico = simulados
          .filter(s => s.topicId === topico.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const recentes = todosSimuladosDoTopico.slice(0, 3);
        const mediaRecente = recentes.reduce((acc, s) => acc + (s.hits / s.questions), 0) / recentes.length * 100;

        return topico.media - mediaRecente > 15;
      });

    return {
      totalSimulados,
      mediaGeral,
      desempenhoPorMateria: desempenhoPorMateria.map(m => ({ subjectName: m.name, media: m.media.toFixed(1) })),
      pontosFracos,
      pontosFortes,
      topicosEmQueda,
    };
  }, [simulados, subjects, topics]);

  const getPerformanceColor = (media: number) => {
    if (media < 60) return 'text-red-600 dark:text-red-400';
    if (media < 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-800 dark:text-gray-200';
  };

  const handleScheduleReview = (topicId: string, topicName: string) => {
    if (window.confirm(`Deseja agendar um ciclo de revisões para o tópico "${topicName}"?`)) {
      scheduleReviewsForTopic(topicId);
      alert(`Revisões para "${topicName}" agendadas com sucesso!`);
    }
  };

  if (stats.totalSimulados === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 text-center">
        <p className="text-gray-500 dark:text-gray-400">Nenhuma estatística para exibir. Realize um simulado!</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4">
        <h2 className="text-lg font-bold mb-3">Estatísticas</h2>
        
        {/* Cards Resumo - Layout Compacto */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-3 mb-4">
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-xl font-bold">{stats.totalSimulados}</p>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">Média Geral</p>
            <p className="text-xl font-bold">{stats.mediaGeral.toFixed(1)}%</p>
          </div>
        </div>

        {/* Seções de Insights - Compactas */}
        {stats.topicosEmQueda.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2 text-orange-600 dark:text-orange-400">⚠️ Em Queda</h3>
            <div className="space-y-2">
              {stats.topicosEmQueda.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-orange-600 dark:text-orange-400">{p.media.toFixed(0)}% • {p.count} sim.</p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => onAnalyze(p.type, p.id)}
                      className="p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded"
                      title="Analisar"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleScheduleReview(p.id, p.name)}
                      className="p-1 hover:bg-orange-200 dark:hover:bg-orange-800 rounded"
                      title="Revisar"
                    >
                      <CalendarDaysIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.pontosFracos.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2 text-gray-800 dark:text-gray-200">📉 Pontos Fracos</h3>
            <div className="space-y-2">
              {stats.pontosFracos.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className={getPerformanceColor(p.media)}>{p.media.toFixed(0)}% • {p.count} sim.</p>
                  </div>
                  <div className="flex space-x-1 ml-2">
                    <button
                      onClick={() => onAnalyze(p.type, p.id)}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                      title="Analisar"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                    </button>
                    {p.type === 'topico' && (
                      <button
                        onClick={() => handleScheduleReview(p.id, p.name)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                        title="Revisar"
                      >
                        <CalendarDaysIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats.pontosFortes.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2 text-green-600 dark:text-green-400">📈 Pontos Fortes</h3>
            <div className="space-y-2">
              {stats.pontosFortes.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded text-xs">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{p.name}</p>
                    <p className="text-green-600 dark:text-green-400">{p.media.toFixed(0)}% • {p.count} sim.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 