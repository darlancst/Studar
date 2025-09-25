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

  const filteredSimulados = useMemo(() => {
    return simulados.filter(s => {
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">Meus Simulados</h1>
        <button
          onClick={handleAddNew}
          className="w-full sm:w-auto bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
        >
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna Principal - Lista de Simulados */}
        <div className="xl:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Lista de Simulados</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">
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
        <div className="space-y-4">
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