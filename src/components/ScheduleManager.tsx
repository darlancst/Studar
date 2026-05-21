import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useScheduleStore, ScheduleMode } from '@/store/scheduleStore';
import WeeklyScheduleEditor from './WeeklyScheduleEditor';
import BlockScheduleEditor from './BlockScheduleEditor';
import { PlusIcon, TrashIcon, CalendarDaysIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRegisterModal } from '@/hooks/useRegisterModal';

export default function ScheduleManager() {
    const {
        schedules,
        activeScheduleId,
        addSchedule,
        deleteSchedule,
        setActiveSchedule
    } = useScheduleStore();

    const [showCreateForm, setShowCreateForm] = useState(false);

    useRegisterModal(showCreateForm, () => setShowCreateForm(false));
    const [newName, setNewName] = useState('');
    const [newStartDate, setNewStartDate] = useState('');
    const [newEndDate, setNewEndDate] = useState('');
    const [newMode, setNewMode] = useState<ScheduleMode>('weekly');

    const activeSchedule = schedules.find(s => s.id === activeScheduleId);

    const handleCreateSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        if (newName && newStartDate && newEndDate) {
            addSchedule(newName, newStartDate, newEndDate, newMode);
            setShowCreateForm(false);
            setNewName('');
            setNewStartDate('');
            setNewEndDate('');
            setNewMode('weekly');
        }
    };

    const handleDeleteSchedule = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este cronograma?')) {
            if (confirm('Esta ação é irreversível e excluirá todo o histórico e planejamento deste cronograma. Deseja realmente continuar?')) {
                deleteSchedule(id);
            }
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="text-2xl font-bold dark:text-white">Cronogramas de Estudo</h2>
                <button
                    id="tour-schedule-btn"
                    onClick={() => setShowCreateForm(true)}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2 text-sm font-medium shadow-sm transition-colors"
                >
                    <PlusIcon className="h-5 w-5" />
                    Novo Cronograma
                </button>
            </div>

            {/* Lista de Cronogramas (Tabs) */}
            {schedules.length > 0 && (
                <div
                    className="flex overflow-x-auto p-1 pb-2 gap-2 scrollbar-hide"
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {schedules.map((schedule) => (
                        <div
                            key={schedule.id}
                            onClick={() => setActiveSchedule(schedule.id)}
                            className={`
                flex-shrink-0 cursor-pointer p-3 rounded-lg border transition-all min-w-[200px] group relative
                ${activeScheduleId === schedule.id
                                    ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/30 dark:border-primary-800 ring-2 ring-primary-500'
                                    : 'bg-white border-gray-200 hover:border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:hover:border-gray-600'
                                }
              `}
                        >
                            <div className="flex justify-between items-start">
                                <h3 className={`font-semibold text-sm ${activeScheduleId === schedule.id ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {schedule.name}
                                </h3>
                                {activeScheduleId === schedule.id && (
                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                                        Selecionado
                                    </span>
                                )}
                                <button
                                    onClick={(e) => handleDeleteSchedule(schedule.id, e)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="mt-2 flex items-center text-xs text-gray-500 dark:text-gray-400 gap-1">
                                <CalendarDaysIcon className="h-3 w-3" />
                                <span>
                                    {format(parseISO(schedule.startDate), 'dd/MM/yy')} - {format(parseISO(schedule.endDate), 'dd/MM/yy')}
                                </span>
                            </div>
                            <div className="mt-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                {schedule.mode === 'weekly' ? 'Ciclo Semanal' : 'Blocos'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Formulário de Criação */}
            {showCreateForm && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto flex justify-center items-center">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                            <h2 className="text-xl font-semibold dark:text-white">Criar Novo Cronograma</h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleCreateSchedule} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="Ex: Concurso Banco do Brasil"
                                        className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início</label>
                                        <input
                                            type="date"
                                            value={newStartDate}
                                            onChange={(e) => setNewStartDate(e.target.value)}
                                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim</label>
                                        <input
                                            type="date"
                                            value={newEndDate}
                                            onChange={(e) => setNewEndDate(e.target.value)}
                                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                            required
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Planejamento</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setNewMode('weekly')}
                                            className={`p-2 text-sm rounded-md border text-center transition-colors ${newMode === 'weekly'
                                                ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            Ciclo Semanal
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setNewMode('block')}
                                            className={`p-2 text-sm rounded-md border text-center transition-colors ${newMode === 'block'
                                                ? 'bg-primary-50 border-primary-500 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                                : 'border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700'
                                                }`}
                                        >
                                            Blocos de Estudo
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {newMode === 'weekly'
                                            ? 'Rotina que se repete toda semana (ex: Matéria X toda segunda).'
                                            : 'Períodos dedicados a matérias (ex: Matéria Y de 01/01 a 15/01).'
                                        }
                                    </p>
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-4 py-2 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700"
                                    >
                                        Criar Cronograma
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Editor do Cronograma Ativo */}
            {activeSchedule ? (
                <div className="animate-fade-in">
                    {activeSchedule.mode === 'weekly' ? <WeeklyScheduleEditor /> : <BlockScheduleEditor />}
                </div>
            ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700">
                    <CalendarDaysIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Nenhum cronograma selecionado</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Selecione um cronograma acima ou crie um novo para começar.</p>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="mt-4 text-primary-600 dark:text-primary-400 font-medium hover:underline"
                    >
                        Criar meu primeiro cronograma
                    </button>
                </div>
            )}
        </div>
    );
}
