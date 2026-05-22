'use client';

import { useState } from 'react';
import { useSubjectStore } from '@/store/subjectStore';
import { useEditalStore } from '@/store/editalStore';
import { useGoalStore } from '@/store/goalStore';
import { ChevronDownIcon, ChevronUpIcon, ListBulletIcon } from '@heroicons/react/24/outline';
import EditalManagerModal from './EditalManagerModal';

export default function EditalProgressCard() {
  const [expanded, setExpanded] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const { subjects } = useSubjectStore();
  const { items: allItems } = useEditalStore();
  const { activeGoalId } = useGoalStore();

  const items = allItems.filter(i => i.goalId === activeGoalId);

  // Se não houver itens ou se não houver um goal ativo, mostra o card de criar edital/concurso
  if (items.length === 0) {
    return (
      <>
        <div
          className="group bg-white dark:bg-gray-800/90 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 hover:shadow-md transition-all duration-300 cursor-pointer"
          onClick={() => setShowManager(true)}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 rounded-xl group-hover:scale-105 transition-transform">
              <ListBulletIcon className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Progresso do Edital</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Clique para importar seu edital</p>
            </div>
          </div>
        </div>
        {showManager && <EditalManagerModal onClose={() => setShowManager(false)} />}
      </>
    );
  }

  // Cálculos de progresso
  const totalItems = items.length;
  const completedItems = items.filter(i => i.completed).length;
  const globalPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const subjectProgress = subjects
    .map(subject => {
      const subjectItems = items.filter(i => i.subjectId === subject.id);
      if (subjectItems.length === 0) return null;
      const done = subjectItems.filter(i => i.completed).length;
      const pct = Math.round((done / subjectItems.length) * 100);
      return { subject, done, total: subjectItems.length, pct };
    })
    .filter(Boolean) as { subject: typeof subjects[0]; done: number; total: number; pct: number }[];

  return (
    <>
      <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 hover:shadow-md transition-all duration-300 overflow-hidden">
        {/* Header (sempre visível) */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center gap-2.5 text-left"
        >
          <div className="p-1.5 bg-gradient-to-br from-teal-500/10 to-teal-600/10 dark:from-teal-500/20 dark:to-teal-600/20 rounded-lg flex-shrink-0">
            <ListBulletIcon className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Progresso do Edital</span>
              <div className="flex items-center gap-1.5">
                <span className={`text-base font-bold tabular-nums ${globalPct >= 100 ? 'text-amber-500' : 'text-teal-600 dark:text-teal-400'}`}>
                  {globalPct}%
                </span>
                {expanded
                  ? <ChevronUpIcon className="w-3.5 h-3.5 text-gray-400" />
                  : <ChevronDownIcon className="w-3.5 h-3.5 text-gray-400" />
                }
              </div>
            </div>
            {/* Barra global */}
            <div className="w-full bg-gray-100/70 dark:bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full animate-fill-bar bg-gradient-to-r from-teal-400 to-teal-500"
                style={{ '--fill-width': `${globalPct}%` } as React.CSSProperties}
              />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 tabular-nums">
              {completedItems} de {totalItems} tópicos concluídos
            </p>
          </div>
        </button>

        {/* Detalhes expandidos */}
        {expanded && (
          <div className="px-3 pb-3 space-y-2 border-t border-gray-150/30 dark:border-gray-800/40 pt-2.5 animate-fade-in">
            {subjectProgress.map(({ subject, done, total, pct }) => (
              <div key={subject.id} className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] font-semibold text-gray-750 dark:text-gray-300 truncate">{subject.name}</span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums ml-2 flex-shrink-0">{done}/{total}</span>
                  </div>
                  <div className="w-full bg-gray-100/70 dark:bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full animate-fill-bar transition-all"
                      style={{
                        backgroundColor: subject.color,
                        '--fill-width': `${pct}%`,
                        opacity: pct === 0 ? 0.3 : 1
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
                <span className="text-[11px] font-semibold tabular-nums w-8 text-right flex-shrink-0" style={{ color: subject.color }}>
                  {pct}%
                </span>
              </div>
            ))}

            <button
              onClick={() => setShowManager(true)}
              className="w-full mt-1.5 text-xs font-semibold text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 text-center py-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
            >
              Gerenciar Edital →
            </button>
          </div>
        )}
      </div>

      {showManager && <EditalManagerModal onClose={() => setShowManager(false)} />}
    </>
  );
}
