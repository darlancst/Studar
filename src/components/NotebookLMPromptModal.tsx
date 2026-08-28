'use client';

import { useState, useMemo } from 'react';
import { 
  XMarkIcon, 
  ClipboardDocumentCheckIcon, 
  ClipboardDocumentIcon, 
  SparklesIcon, 
  BookOpenIcon, 
  CalendarDaysIcon, 
  CheckCircleIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { 
  PromptPeriod, 
  QuestionStyle, 
  getPromptDataForPeriod,
  SubjectPromptData 
} from '@/utils/pdfPromptParser';
import { useRegisterModal } from '@/hooks/useRegisterModal';

interface NotebookLMPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotebookLMPromptModal({ isOpen, onClose }: NotebookLMPromptModalProps) {
  useRegisterModal(isOpen, onClose);

  const { subjects } = useSubjectStore();
  const { topics } = useTopicStore();
  const { reviews } = useReviewStore();

  const [period, setPeriod] = useState<PromptPeriod>('this_week');
  const [questionStyle, setQuestionStyle] = useState<QuestionStyle>('multiple_choice');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [onlyCompleted, setOnlyCompleted] = useState<boolean>(false);
  const [activeSubjectId, setActiveSubjectId] = useState<string>('');
  const [copiedSubjectId, setCopiedSubjectId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState<boolean>(false);

  // Obter dados agrupados por matéria
  const { subjectPrompts, periodLabel, totalReviewsInPeriod } = useMemo(() => {
    return getPromptDataForPeriod({
      period,
      reviews,
      topics,
      subjects,
      questionCount,
      questionStyle,
      onlyCompleted
    });
  }, [period, reviews, topics, subjects, questionCount, questionStyle, onlyCompleted]);

  // Manter aba ativa consistente
  const activePromptData = useMemo(() => {
    if (subjectPrompts.length === 0) return null;
    const found = subjectPrompts.find(sp => sp.subject.id === activeSubjectId);
    return found || subjectPrompts[0];
  }, [subjectPrompts, activeSubjectId]);

  if (!isOpen) return null;

  const handleCopyPrompt = (subjectId: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedSubjectId(subjectId);
    setTimeout(() => {
      setCopiedSubjectId(null);
    }, 2500);
  };

  const handleCopyAllPrompts = () => {
    const allText = subjectPrompts.map(sp => {
      return `========================================\nMATÉRIA: ${sp.subject.name.toUpperCase()}\n========================================\n\n${sp.generatedPrompt}`;
    }).join('\n\n\n');

    navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => {
      setCopiedAll(false);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-150/70 dark:border-gray-800 flex flex-col max-h-[92vh] overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-gray-150/60 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-blue-500/10 dark:from-primary-950/40 dark:via-purple-950/30 dark:to-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                Prompt para Gemini / NotebookLM
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Gere simulados e mapeie tópicos das suas revisões de PDF
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
            title="Fechar"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Seletor de Período & Configurações */}
          <div className="bg-gray-50/80 dark:bg-gray-850/50 p-3.5 sm:p-4 rounded-2xl border border-gray-150/60 dark:border-gray-800/80 space-y-3.5">
            {/* Período */}
            <div>
              <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <CalendarDaysIcon className="w-4 h-4 text-primary-500" />
                Período das Revisões
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {[
                  { id: 'this_week', label: 'Esta Semana' },
                  { id: 'last_week', label: 'Semana Passada' },
                  { id: 'this_month', label: 'Este Mês' },
                  { id: 'today', label: 'Hoje' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setPeriod(item.id as PromptPeriod)}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 text-center ${
                      period === item.id
                        ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/30'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ajustes de Questões */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-200/40 dark:border-gray-750/50">
              {/* Estilo */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Estilo de Questões
                </label>
                <select
                  value={questionStyle}
                  onChange={(e) => setQuestionStyle(e.target.value as QuestionStyle)}
                  className="w-full text-xs font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2.5 py-2 text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="multiple_choice">Múltipla Escolha (A-E)</option>
                  <option value="cebraspe">Certo / Errado (Cebraspe)</option>
                  <option value="flashcards">Flashcards / Perguntas Rápidas</option>
                </select>
              </div>

              {/* Quantidade */}
              <div>
                <label className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  Quantidade de Questões
                </label>
                <div className="flex gap-1.5">
                  {[5, 10, 15, 20].map((qty) => (
                    <button
                      key={qty}
                      type="button"
                      onClick={() => setQuestionCount(qty)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                        questionCount === qty
                          ? 'bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400 border-primary-300 dark:border-primary-800'
                          : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {qty}
                    </button>
                  ))}
                </div>
              </div>

              {/* Apenas Concluídas Toggle */}
              <div className="flex items-center justify-between sm:justify-center gap-2 pt-2 sm:pt-4">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={onlyCompleted}
                    onChange={(e) => setOnlyCompleted(e.target.checked)}
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500 dark:bg-gray-800 dark:border-gray-700"
                  />
                  <span>Apenas revisões já concluídas</span>
                </label>
              </div>
            </div>
          </div>

          {/* Conteúdo Principal: Matérias e Prompts */}
          {subjectPrompts.length > 0 ? (
            <div className="space-y-4">
              
              {/* Header com indicador e botão de copiar todos */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    Matérias Revisadas ({periodLabel}):
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/70 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
                    {subjectPrompts.length} {subjectPrompts.length === 1 ? 'matéria' : 'matérias'} • {totalReviewsInPeriod} revisões
                  </span>
                </div>

                {subjectPrompts.length > 1 && (
                  <button
                    type="button"
                    onClick={handleCopyAllPrompts}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 flex items-center gap-1.5 self-start sm:self-auto transition-all active:scale-95"
                  >
                    {copiedAll ? (
                      <>
                        <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        <span className="text-green-600 dark:text-green-400 font-bold">Todas Copiadas!</span>
                      </>
                    ) : (
                      <>
                        <ClipboardDocumentIcon className="w-4 h-4 text-gray-500" />
                        <span>Copiar Todas as Matérias</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Abas das Matérias */}
              <div className="flex flex-wrap gap-2 pb-1">
                {subjectPrompts.map((sp) => {
                  const isSelected = activePromptData?.subject.id === sp.subject.id;
                  return (
                    <button
                      key={sp.subject.id}
                      type="button"
                      onClick={() => setActiveSubjectId(sp.subject.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
                        isSelected
                          ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-md scale-[1.02] border-transparent'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: sp.subject.color }} 
                      />
                      <span>{sp.subject.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected 
                          ? 'bg-white/20 dark:bg-black/20 text-white dark:text-gray-900' 
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {sp.parsedTopics.length}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Visualização e Cópia do Prompt da Matéria Ativa */}
              {activePromptData && (
                <div className="bg-gray-50/50 dark:bg-gray-900/40 rounded-2xl border border-gray-200/80 dark:border-gray-800 p-4 space-y-4">
                  {/* Informações da matéria selecionada */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/60 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-3.5 h-3.5 rounded-full shadow-xs" 
                        style={{ backgroundColor: activePromptData.subject.color }} 
                      />
                      <div>
                        <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
                          {activePromptData.subject.name}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {activePromptData.parsedTopics.length} páginas/tópicos identificados no período
                        </p>
                      </div>
                    </div>

                    {/* Botão de Copiar */}
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(activePromptData.subject.id, activePromptData.generatedPrompt)}
                      className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all duration-200 shadow-sm active:scale-95 ${
                        copiedSubjectId === activePromptData.subject.id
                          ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-600/20'
                          : 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20'
                      }`}
                    >
                      {copiedSubjectId === activePromptData.subject.id ? (
                        <>
                          <ClipboardDocumentCheckIcon className="w-5 h-5" />
                          <span>Prompt Copiado com Sucesso!</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-5 h-5" />
                          <span>Copiar Prompt ({activePromptData.subject.name})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Resumo das páginas identificadas */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Trechos / PDFs Extraídos:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {activePromptData.parsedTopics.map((pt, idx) => (
                        <span 
                          key={idx}
                          className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-gray-200/70 dark:border-gray-700/70 text-gray-800 dark:text-gray-200 font-medium"
                        >
                          {pt.formattedLine.replace(/^•\s*/, '')}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Caixa de Texto do Prompt Formatado */}
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Prévia do Prompt Formatado:
                    </p>
                    <div className="relative">
                      <textarea
                        readOnly
                        value={activePromptData.generatedPrompt}
                        rows={10}
                        className="w-full font-mono text-xs p-3.5 bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 rounded-xl border border-gray-200 dark:border-gray-800 focus:outline-none select-all resize-y leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>
          ) : (
            /* Estado Vazio */
            <div className="text-center py-12 px-4 bg-gray-50/50 dark:bg-gray-850/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
              <BookOpenIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                Nenhuma revisão encontrada para {periodLabel.toLowerCase()}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                Realize ou agende revisões no cronograma para que o Studar compile os PDFs e páginas estudadas automaticamente.
              </p>
            </div>
          )}

          {/* Dica de Uso com NotebookLM */}
          <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/40 rounded-2xl flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1 leading-relaxed">
              <p className="font-bold">Como usar no Google NotebookLM:</p>
              <p>
                1. Abra o <strong>NotebookLM</strong> no caderno referente à matéria desejada.
              </p>
              <p>
                2. Certifique-se de que os PDFs correspondentes foram anexados como fontes no caderno.
              </p>
              <p>
                3. Cole o prompt gerado no chat do caderno. O Gemini identificará os tópicos daquelas páginas e elaborará as questões de revisão com gabarito fundamentado!
              </p>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-gray-150/60 dark:border-gray-800 flex justify-end bg-gray-50/50 dark:bg-gray-900/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 transition-all active:scale-95"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
