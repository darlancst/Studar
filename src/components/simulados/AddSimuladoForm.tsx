'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSimuladosStore } from '@/store/simuladosStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { Simulado } from '@/types';
import { useReviewStore } from '@/store/reviewStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

const PERFORMANCE_THRESHOLD = 0.7; // 70%

interface AddSimuladoFormProps {
  onClose: () => void;
  simuladoToEdit?: Simulado;
}

export default function AddSimuladoForm({ onClose, simuladoToEdit }: AddSimuladoFormProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [questions, setQuestions] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeSpent, setTimeSpent] = useState(0);

  const { addSimulado, updateSimulado } = useSimuladosStore();
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
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

    const simuladoData = { name: generatedName, date, subjectId, topicId, questions, hits, timeSpent };

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
    <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-xl font-semibold dark:text-white">{simuladoToEdit ? 'Editar Simulado' : 'Adicionar Simulado'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Matéria</label>
                <select id="subject" value={subjectId} onChange={(e) => { setSubjectId(e.target.value); setTopicId(''); }} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500" required>
                  <option value="">Selecione</option>
                  {subjects.map(subject => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tópico (Opcional)</label>
                <select id="topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500" disabled={!subjectId}>
                  <option value="">Selecione</option>
                  {availableTopics.map(topic => (
                    <option key={topic.id} value={topic.id}>{topic.title}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data</label>
              <input type="date" id="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500" required />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="questions" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nº Questões</label>
                <input type="number" id="questions" value={questions} onChange={(e) => setQuestions(Number(e.target.value))} min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500" required />
              </div>
              <div>
                <label htmlFor="hits" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nº Acertos</label>
                <input type="number" id="hits" value={hits} onChange={(e) => setHits(Number(e.target.value))} min="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500" />
              </div>
              <div>
                <label htmlFor="timeSpent" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tempo (min)</label>
                <input type="number" id="timeSpent" value={timeSpent} onChange={(e) => setTimeSpent(Number(e.target.value))} min="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm dark:bg-gray-700 dark:border-gray-600 focus:border-primary-500 focus:ring-primary-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={onClose} className="px-4 py-2 rounded bg-gray-200 dark:bg-gray-700">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded bg-primary-600 text-white hover:bg-primary-700">
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