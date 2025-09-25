'use client';

import { useSubjectStore } from "@/store/subjectStore";
import { useTopicStore } from "@/store/topicStore";

interface SimuladosFiltersProps {
  selectedSubject: string;
  setSelectedSubject: (id: string) => void;
  selectedTopic: string;
  setSelectedTopic: (id: string) => void;
  startDate: string;
  setStartDate: (date: string) => void;
  endDate: string;
  setEndDate: (date: string) => void;
  onClearFilters: () => void;
}

export default function SimuladosFilters({
  selectedSubject,
  setSelectedSubject,
  selectedTopic,
  setSelectedTopic,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  onClearFilters,
}: SimuladosFiltersProps) {
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);

  const availableTopics = topics.filter(t => t.subjectId === selectedSubject);

  const handleSubjectChange = (id: string) => {
    setSelectedSubject(id);
    setSelectedTopic('');
  };

  const hasActiveFilters = selectedSubject || selectedTopic || startDate || endDate;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filtros</h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
          >
            Limpar tudo
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Matéria
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-primary-500 focus:ring-primary-500"
          >
            <option value="">Todas</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>{subject.name}</option>
            ))}
            <option value="__general__">Simulados Gerais (Sem Tópico)</option>
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Tópico
          </label>
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            disabled={!selectedSubject || selectedSubject === '__general__'}
            className="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-primary-500 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="">Todos</option>
            {availableTopics.map(topic => (
              <option key={topic.id} value={topic.id}>{topic.title}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Data inicial
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
            Data final
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full text-sm rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 focus:border-primary-500 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
} 