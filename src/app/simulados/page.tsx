'use client';

import { useState, useMemo, useEffect } from 'react';
import SimuladosList from '@/components/simulados/SimuladosList';
import AddSimuladoForm from '@/components/simulados/AddSimuladoForm';
import { Simulado } from '@/types';
import SimuladosStats from '@/components/simulados/SimuladosStats';
import SimuladosFilters from '@/components/simulados/SimuladosFilters';
import { useSimuladosStore } from '@/store/simuladosStore';
import SimuladosChart from '@/components/simulados/SimuladosChart';
import Pagination from '@/components/Pagination';
import { useTopicStore } from '@/store/topicStore';
import { useGoalStore } from '@/store/goalStore';

import { PlusIcon } from '@heroicons/react/24/outline';

const ITEMS_PER_PAGE = 5;

const SimuladosPage = () => {
  const [showForm, setShowForm] = useState(false);
  const [simuladoToEdit, setSimuladoToEdit] = useState<Simulado | undefined>(undefined);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { simulados, removeSimulado } = useSimuladosStore();
  const { goals, activeGoalId, setActiveGoal } = useGoalStore();

  const filteredSimulados = useMemo(() => {
    return simulados.filter(s => {
      // Filtrar por concurso ativo
      if (activeGoalId && s.goalId && s.goalId !== activeGoalId) return false;
      if (activeGoalId && !s.goalId) return false; // Hide legacy/general if a goal is active, or we could show them. Let's hide them to be strict.
      
      const simuladoDate = new Date(s.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;

      if (start) start.setUTCHours(0, 0, 0, 0);
      if (end) end.setUTCHours(23, 59, 59, 999);

      const dateMatch = (!start || simuladoDate >= start) && (!end || simuladoDate <= end);
      if (!dateMatch) return false;

      // Lógica para o novo filtro "Geral"
      if (selectedSubject === '__general__') {
        return !s.topicId;
      }

      // Lógica de filtro padrão
      const subjectMatch = !selectedSubject || s.subjectId === selectedSubject;
      const topicMatch = !selectedTopic || s.topicId === selectedTopic;

      return subjectMatch && topicMatch;
    });
  }, [simulados, selectedSubject, selectedTopic, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filteredSimulados.length]);

  const totalPages = Math.ceil(filteredSimulados.length / ITEMS_PER_PAGE);
  const paginatedSimulados = filteredSimulados.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleEdit = (simulado: Simulado) => {
    setSimuladoToEdit(simulado);
    setShowForm(true);
  };

  const handleAddNew = () => {
    setSimuladoToEdit(undefined);
    setShowForm(true);
  }

  const handleCloseForm = () => {
    setShowForm(false);
    setSimuladoToEdit(undefined);
  }

  const handleRemove = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este simulado?')) {
      removeSimulado(id);
    }
  }

  const handleAnalyze = (type: 'materia' | 'topico', id: string) => {
    handleClearFilters();
    if (type === 'materia') {
      setSelectedSubject(id);
    } else {
      const topic = useTopicStore.getState().topics.find(t => t.id === id);
      if (topic) {
        setSelectedSubject(topic.subjectId);
        setSelectedTopic(id);
      }
    }
  };

  const handleClearFilters = () => {
    setSelectedSubject('');
    setSelectedTopic('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Meus Simulados</h1>
          {goals.length > 0 && (
            <select
              value={activeGoalId || ''}
              onChange={(e) => setActiveGoal(e.target.value)}
              className="bg-gray-100 dark:bg-gray-800 border-none text-sm rounded-lg p-1.5 text-gray-900 dark:text-white focus:ring-2 focus:ring-teal-500 font-medium cursor-pointer"
            >
              {goals.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>
        <button
          onClick={handleAddNew}
          className="w-full sm:w-auto bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm flex items-center justify-center gap-2 text-center"
        >
          <PlusIcon className="h-5 w-5" />
          Adicionar Simulado
        </button>
      </div>

      {/* Filtros */}
      <SimuladosFilters
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        onClearFilters={handleClearFilters}
      />

      {/* Layout Principal - 2 Colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* Coluna Principal - Lista de Simulados */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Lista de Simulados</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredSimulados.length} simulado(s)
              </span>
            </div>
            <SimuladosList simulados={paginatedSimulados} onEdit={handleEdit} onRemove={handleRemove} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>

        {/* Sidebar - Estatísticas e Análises */}
        <div className="space-y-3">
          <SimuladosStats simulados={filteredSimulados} onAnalyze={handleAnalyze} />
          <SimuladosChart simulados={filteredSimulados} />
        </div>
      </div>

      {/* Modal */}
      {showForm && <AddSimuladoForm simuladoToEdit={simuladoToEdit} onClose={handleCloseForm} />}
    </div>
  );
};

export default SimuladosPage;