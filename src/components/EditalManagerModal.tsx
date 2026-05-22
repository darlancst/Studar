'use client';

import { useState } from 'react';
import { XMarkIcon, TrashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { useSubjectStore } from '@/store/subjectStore';
import { useEditalStore } from '@/store/editalStore';
import { useRegisterModal } from '@/hooks/useRegisterModal';

interface EditalManagerModalProps {
  onClose: () => void;
}

interface JsonImportEntry {
  materia: string;
  topicos: string[];
}

export default function EditalManagerModal({ onClose }: EditalManagerModalProps) {
  const { subjects } = useSubjectStore();
  const { items, addItems, toggleItem, deleteItemsBySubject, resetEdital } = useEditalStore();
  const [jsonInput, setJsonInput] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [showImport, setShowImport] = useState(items.length === 0);
  const [activeSubjectId, setActiveSubjectId] = useState<string>(subjects[0]?.id || '');

  useRegisterModal(true, onClose);

  const handleImport = () => {
    setImportError('');
    setImportSuccess('');
    try {
      const parsed: JsonImportEntry[] = JSON.parse(jsonInput);
      if (!Array.isArray(parsed)) throw new Error('O JSON deve ser uma lista (array).');

      let totalImported = 0;
      const notFound: string[] = [];

      parsed.forEach((entry) => {
        const subject = subjects.find(
          s => s.name.toLowerCase().trim() === entry.materia.toLowerCase().trim()
        );

        if (!subject) {
          notFound.push(entry.materia);
          return;
        }

        const existingOrderMax = items
          .filter(i => i.subjectId === subject.id)
          .reduce((max, i) => Math.max(max, i.order), -1);

        const newItems = entry.topicos.map((title, idx) => ({
          subjectId: subject.id,
          title,
          completed: false,
          order: existingOrderMax + idx + 1,
        }));

        addItems(newItems);
        totalImported += newItems.length;
      });

      if (totalImported > 0) {
        setImportSuccess(`${totalImported} tópico(s) importado(s) com sucesso!${notFound.length > 0 ? ` Matérias não encontradas: ${notFound.join(', ')}.` : ''}`);
        setJsonInput('');
        setTimeout(() => setShowImport(false), 1500);
      } else {
        setImportError(`Nenhum tópico importado. Matérias não encontradas: ${notFound.join(', ')}. Verifique se os nomes correspondem às suas matérias cadastradas.`);
      }
    } catch (e: any) {
      setImportError(`Erro ao processar JSON: ${e.message}`);
    }
  };

  const subjectsWithItems = subjects.filter(s => items.some(i => i.subjectId === s.id));
  const activeItems = items
    .filter(i => i.subjectId === activeSubjectId)
    .sort((a, b) => a.order - b.order);

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onTouchStart={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Gerenciar Edital</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Importação JSON */}
          {showImport ? (
            <div className="p-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Importar via JSON</h3>
                {items.length > 0 && (
                  <button onClick={() => setShowImport(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    Ocultar
                  </button>
                )}
              </div>
              <textarea
                value={jsonInput}
                onChange={e => { setJsonInput(e.target.value); setImportError(''); setImportSuccess(''); }}
                placeholder='Cole o JSON gerado aqui... Ex: [{ "materia": "...", "topicos": ["..."] }]'
                rows={2}
                className="w-full text-xs font-mono border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 resize-none"
              />
              {importError && <p className="text-xs text-red-500 mt-2">{importError}</p>}
              {importSuccess && <p className="text-xs text-teal-600 dark:text-teal-400 mt-2">{importSuccess}</p>}
              
              {jsonInput.trim() && (
                <button
                  onClick={handleImport}
                  className="mt-3 w-full py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors shadow-sm"
                >
                  ✓ Importar tópicos
                </button>
              )}
            </div>
          ) : (
            <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setShowImport(true)}
                className="text-xs text-teal-600 dark:text-teal-400 font-medium hover:underline flex items-center gap-1"
              >
                + Importar mais tópicos
              </button>
            </div>
          )}

          {/* Lista de tópicos por matéria */}
          {subjectsWithItems.length > 0 && (
            <div className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tópicos do Edital</h3>
                <button
                  onClick={() => { if (confirm('Apagar TODO o edital?')) resetEdital(); }}
                  className="text-xs text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Limpar tudo
                </button>
              </div>

              {/* Tabs de matérias */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-3 scrollbar-hide snap-x">
                {subjectsWithItems.map(s => {
                  const sItems = items.filter(i => i.subjectId === s.id);
                  const sDone = sItems.filter(i => i.completed).length;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setActiveSubjectId(s.id)}
                      className={`flex-shrink-0 snap-start flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${activeSubjectId === s.id
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
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {activeItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => toggleItem(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${item.completed
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

              {/* Botão apagar matéria */}
              {activeSubjectId && (
                <button
                  onClick={() => { if (confirm('Apagar todos os tópicos desta matéria?')) deleteItemsBySubject(activeSubjectId); }}
                  className="mt-3 text-xs text-red-400 hover:text-red-500 transition-colors flex items-center gap-1"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Apagar tópicos desta matéria
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
