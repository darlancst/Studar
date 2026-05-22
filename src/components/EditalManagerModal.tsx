'use client';

import { useState } from 'react';
import { XMarkIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useSubjectStore } from '@/store/subjectStore';
import { useEditalStore } from '@/store/editalStore';
import { useGoalStore } from '@/store/goalStore';
import { useRegisterModal } from '@/hooks/useRegisterModal';

interface EditalManagerModalProps {
  onClose: () => void;
}

interface JsonImportEntry {
  materia: string;
  topicos: string[];
}

export default function EditalManagerModal({ onClose }: EditalManagerModalProps) {
  const { subjects, addSubject } = useSubjectStore();
  const { items, addItems, toggleItem, deleteItemsBySubjectAndGoal, deleteItemsByGoal, deleteLegacyItems } = useEditalStore();
  const { goals, activeGoalId, setActiveGoal, addGoal, deleteGoal } = useGoalStore();
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [activeSubjectId, setActiveSubjectId] = useState<string>(subjects[0]?.id || '');

  // Items belonging to active goal
  const currentItems = items.filter(i => i.goalId === activeGoalId);
  // Legacy items (no goalId at all) — these are the "stuck" ones the user can't delete
  const legacyItems = items.filter(i => !i.goalId);

  const [showImport, setShowImport] = useState(currentItems.length === 0);

  useRegisterModal(true, onClose);

  const handleImport = () => {
    setImportError('');
    setImportSuccess('');

    if (!activeGoalId) {
      setImportError('Crie e selecione um concurso primeiro.');
      return;
    }

    try {
      const parsed: JsonImportEntry[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('O JSON deve ser uma lista (array).');

      let totalImported = 0;
      const notFound: string[] = [];

      parsed.forEach((entry) => {
        let subject = subjects.find(
          s => s.name.toLowerCase().trim() === entry.materia.toLowerCase().trim()
        );

        if (!subject) {
          // Auto-create missing subjects
          const randomColors = ['#14b8a6', '#f43f5e', '#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#f97316'];
          const randomColor = randomColors[Math.floor(Math.random() * randomColors.length)];
          subject = addSubject(entry.materia.trim(), randomColor);
        }

        const existingOrderMax = currentItems
          .filter(i => i.subjectId === subject.id)
          .reduce((max, i) => Math.max(max, i.order), -1);

        const newItems = entry.topicos.map((title, idx) => ({
          subjectId: subject.id,
          title,
          completed: false,
          order: existingOrderMax + idx + 1,
          goalId: activeGoalId,
        }));

        addItems(newItems);
        totalImported += newItems.length;
      });

      if (totalImported > 0) {
        setImportSuccess(`${totalImported} tópico(s) importado(s)!`);
        setJsonInput('');
        setTimeout(() => setShowImport(false), 1500);
      } else {
        setImportError(`Nenhum tópico importado.`);
      }
    } catch (e: any) {
      setImportError(`Erro ao processar JSON: ${e.message}`);
    }
  };

  const handleNewGoal = () => {
    if (goals.length >= 3) {
      alert('Você atingiu o limite de 3 concursos.');
      return;
    }
    const name = prompt('Nome do Concurso (ex: Banco do Brasil):');
    if (name?.trim()) {
      let finalName = name.trim();
      if (finalName.length > 40) {
        finalName = finalName.substring(0, 40) + '...';
      }
      addGoal(finalName, '#14b8a6');
    }
  };

  const subjectsWithCurrentItems = subjects.filter(s => currentItems.some(i => i.subjectId === s.id));
  const activeItems = currentItems
    .filter(i => i.subjectId === activeSubjectId)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[85vh] flex flex-col my-auto">
        {/* Header com Seletor de Concurso */}
        <div className="flex flex-col gap-2 p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gerenciar Edital</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeGoalId || ''}
              onChange={(e) => setActiveGoal(e.target.value)}
              className="flex-1 min-w-0 truncate bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm rounded-lg p-2 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              {goals.length === 0 && <option value="" disabled>Nenhum concurso criado</option>}
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
            <button
              onClick={handleNewGoal}
              disabled={goals.length >= 3}
              className="flex-shrink-0 px-3 py-2 bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 text-sm font-medium rounded-lg disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              + Novo
            </button>
            {activeGoalId && (
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja apagar este concurso inteiro?')) {
                    deleteGoal(activeGoalId);
                    deleteItemsByGoal(activeGoalId);
                  }
                }}
                className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Apagar este concurso"
              >
                <TrashIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Aviso de itens legados (sem concurso) */}
          {legacyItems.length > 0 && (
            <div className="mx-3 mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl flex items-start gap-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                  {legacyItems.length} tópico(s) sem concurso vinculado
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-0.5">
                  Estes são de importações anteriores ao sistema de concursos.
                </p>
              </div>
              <button
                onClick={() => { if (confirm(`Apagar os ${legacyItems.length} tópicos antigos (sem concurso)?`)) deleteLegacyItems(); }}
                className="text-xs text-red-500 hover:text-red-600 font-medium whitespace-nowrap flex-shrink-0"
              >
                Apagar
              </button>
            </div>
          )}

          {/* Importação JSON */}
          {showImport ? (
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 mt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Importar via JSON</h3>
                {currentItems.length > 0 && (
                  <button onClick={() => setShowImport(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    Ocultar
                  </button>
                )}
              </div>
              <textarea
                value={jsonInput}
                onChange={e => { setJsonInput(e.target.value); setImportError(''); setImportSuccess(''); }}
                placeholder='Cole o JSON aqui... Ex: [{ "materia": "...", "topicos": ["..."] }]'
                rows={2}
                className="w-full text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
              />
              {importError && <p className="text-xs text-red-500 mt-1">{importError}</p>}
              {importSuccess && <p className="text-xs text-teal-600 dark:text-teal-400 mt-1">{importSuccess}</p>}

              {jsonInput.trim() && (
                <button
                  onClick={handleImport}
                  className="mt-2 w-full py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors"
                >
                  ✓ Importar tópicos
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowImport(true)}
                className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline"
              >
                + Importar mais tópicos
              </button>
            </div>
          )}

          {/* Lista de tópicos por matéria */}
          {subjectsWithCurrentItems.length > 0 && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tópicos do Edital</h3>
                <button
                  onClick={() => {
                    if (confirm('Apagar TODO o edital deste concurso?')) {
                      if (activeGoalId) deleteItemsByGoal(activeGoalId);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Limpar
                </button>
              </div>

              {/* Tabs de matérias */}
              <div className="flex gap-2 flex-wrap pb-3 mb-3">
                {subjectsWithCurrentItems.map(s => {
                  const sItems = currentItems.filter(i => i.subjectId === s.id);
                  const sDone = sItems.filter(i => i.completed).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSubjectId(s.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${activeSubjectId === s.id
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      style={activeSubjectId === s.id ? { backgroundColor: s.color } : {}}
                    >
                      {s.name}
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${activeSubjectId === s.id ? 'bg-black/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {sDone}/{sItems.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Lista de tópicos da matéria ativa */}
              <div className="space-y-1">
                {activeItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${item.completed
                      ? 'bg-teal-50 dark:bg-teal-900/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                  >
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${item.completed
                      ? 'bg-teal-500 border-teal-500'
                      : 'border-gray-300 dark:border-gray-600'
                      }`}>
                      {item.completed && <CheckCircleIcon className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className={`text-sm flex-1 ${item.completed
                      ? 'line-through text-gray-400 dark:text-gray-500'
                      : 'text-gray-700 dark:text-gray-300'
                      }`}>
                      {item.title}
                    </span>
                  </button>
                ))}
              </div>

              {/* Botão apagar matéria (escopo correto: só do concurso ativo) */}
              {activeSubjectId && activeItems.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Apagar todos os tópicos desta matéria neste concurso?'))
                      deleteItemsBySubjectAndGoal(activeSubjectId, activeGoalId);
                  }}
                  className="mt-3 text-xs text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Apagar tópicos desta matéria
                </button>
              )}
            </div>
          )}

          {/* Empty state */}
          {subjectsWithCurrentItems.length === 0 && activeGoalId && (
            <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
              Nenhum tópico neste concurso ainda. Importe um JSON acima!
            </div>
          )}
          {!activeGoalId && goals.length === 0 && (
            <div className="p-6 text-center text-gray-400 dark:text-gray-500 text-sm">
              Crie um concurso clicando em "+ Novo" para começar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
