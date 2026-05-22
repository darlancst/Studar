'use client';

import { useState, useEffect } from 'react';
import { useRegisterModal } from '@/hooks/useRegisterModal';
import { createPortal } from 'react-dom';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useGoalStore } from '@/store/goalStore';
import { Simulado } from '@/types';
import { useReviewStore } from '@/store/reviewStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

const PERFORMANCE_THRESHOLD = 0.7; // 70%

interface AddSimuladoFormProps {
  onClose: () => void;
  simuladoToEdit?: Simulado;
}

export default function AddSimuladoForm({ onClose, simuladoToEdit }: AddSimuladoFormProps) {
  useRegisterModal(true, onClose);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questions, setQuestions] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);

  const { addSimulado, updateSimulado } = useSimuladosStore();
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
  const { activeGoalId } = useGoalStore();
  const scheduleReviewsForTopic = useReviewStore((state) => state.scheduleReviewsForTopic);

  const availableTopics = topics.filter(t => t.subjectId === subjectId);

  useEffect(() => {
    if (simuladoToEdit) {
      setDate(simuladoToEdit.date);
      setSubjectId(simuladoToEdit.subjectId);
      setTopicId(simuladoToEdit.topicId || '');
      setQuestions(simuladoToEdit.questions);
      setHits(simuladoToEdit.hits);
      setTimeSpent(simuladoToEdit.timeSpent || 0);
    }
  }, [simuladoToEdit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || questions <= 0) {
      alert('Preencha os campos obrigatórios!');
      return;
    }

    const subject = subjects.find(s => s.id === subjectId);
    const formattedDate = new Date(date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    const generatedName = `Simulado de ${subject?.name || 'Matéria'} - ${formattedDate}`;

    const simuladoData = { 
      name: generatedName, 
      date, 
      subjectId, 
      topicId, 
      questions, 
      hits, 
      timeSpent,
      goalId: activeGoalId || undefined
    };

    if (simuladoToEdit) {
      updateSimulado({ ...simuladoToEdit, ...simuladoData, name: simuladoToEdit.name || generatedName });
      // Após adicionar, verifica o desempenho para sugerir revisão
      const performance = hits / questions;
      if (topicId && performance < PERFORMANCE_THRESHOLD) {
        const topic = topics.find(t => t.id === topicId);
        if (topic && window.confirm(`Seu desempenho em "${topic.title}" foi de ${(performance * 100).toFixed(0)}%. Deseja agendar revisões para este tópico?`)) {
          scheduleReviewsForTopic(topicId);
        }
      }
    } else {
      addSimulado(simuladoData);
      // Após adicionar, verifica o desempenho para sugerir revisão
      const performance = hits / questions;
      if (topicId && performance < PERFORMANCE_THRESHOLD) {
        const topic = topics.find(t => t.id === topicId);
        if (topic && window.confirm(`Seu desempenho em "${topic.title}" foi de ${(performance * 100).toFixed(0)}%. Deseja agendar revisões para este tópico?`)) {
          scheduleReviewsForTopic(topicId);
        }
      }
    }
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-gray-750/60 backdrop-blur-sm overflow-y-auto flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 border border-gray-150/50 dark:border-gray-800/80 rounded-2xl shadow-xl w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-4 border-b border-gray-150/30 dark:border-gray-800/50">
          <h2 className="text-lg font-bold dark:text-white">{simuladoToEdit ? 'Editar Simulado' : 'Adicionar Simulado'}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject" className="block text-xs font-bold text-gray-450 dark:text-gray-400">Matéria</label>
                <select 
                  id="subject" 
                  value={subjectId} 
                  onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }} 
                  className="mt-1 block w-full p-2 text-xs rounded-xl border border-gray-250/70 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500/50 focus:border-transparent transition-all" 
                  required
                >
                  <option value="">Selecione</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="topic" className="block text-xs font-bold text-gray-455 dark:text-gray-400">Tópico (Opcional)</label>
                <select 
                  id="topic" 
                  value={topicId} 
                  onChange={(e) => setTopicId(e.target.value)} 
                  className="mt-1 block w-full p-2 text-xs rounded-xl border border-gray-250/70 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500/50 focus:border-transparent transition-all disabled:opacity-50" 
                  disabled={!subjectId}
                >
                  <option value="">Selecione</option>
                  {availableTopics.map(topic => (
                    <option key={topic.id} value={topic.id}>{topic.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="date" className="block text-xs font-bold text-gray-450 dark:text-gray-400">Data</label>
              <input 
                type="date" 
                id="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                className="mt-1 block w-full p-2 text-xs rounded-xl border border-gray-250/70 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500/50 focus:border-transparent transition-all" 
                required 
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="questions" className="block text-[11px] font-bold text-gray-450 dark:text-gray-400">Questões</label>
                <input 
                  type="number" 
                  id="questions" 
                  value={questions} 
                  onChange={(e) => setQuestions(Number(e.target.value))} 
                  min="1" 
                  className="mt-1 block w-full p-2 text-xs rounded-xl border border-gray-250/70 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500/50 focus:border-transparent transition-all" 
                  required 
                />
              </div>
              <div>
                <label htmlFor="hits" className="block text-[11px] font-bold text-gray-450 dark:text-gray-400">Acertos</label>
                <input 
                  type="number" 
                  id="hits" 
                  value={hits} 
                  onChange={(e) => setHits(Number(e.target.value))} 
                  min="0" 
                  className="mt-1 block w-full p-2 text-xs rounded-xl border border-gray-250/70 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500/50 focus:border-transparent transition-all" 
                />
              </div>
              <div>
                <label htmlFor="timeSpent" className="block text-[11px] font-bold text-gray-450 dark:text-gray-400">Tempo (min)</label>
                <input 
                  type="number" 
                  id="timeSpent" 
                  value={timeSpent} 
                  onChange={(e) => setTimeSpent(Number(e.target.value))} 
                  min="0" 
                  className="mt-1 block w-full p-2 text-xs rounded-xl border border-gray-250/70 dark:border-gray-700 bg-white dark:bg-gray-850 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-primary-500/50 focus:border-transparent transition-all" 
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-750 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary-600 text-white hover:bg-primary-700 shadow-md shadow-primary-500/10 transition-colors"
              >
                {simuladoToEdit ? 'Salvar Alterações' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}