import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSubjectStore } from '@/store/subjectStore';
import { PlusIcon, TrashIcon, XMarkIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function BlockScheduleEditor() {
    const { blockItems, addBlockItem, removeBlockItem, activeScheduleId } = useScheduleStore();
    const { subjects } = useSubjectStore();

    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [description, setDescription] = useState('');
    const [restDays, setRestDays] = useState<number[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Auto-set End Date to Start Date when Start Date changes (if End Date is empty)
    useEffect(() => {
        if (startDate && !endDate) {
            setEndDate(startDate);
        }
    }, [startDate]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectId || !startDate || !endDate || !activeScheduleId) return;

        addBlockItem({
            scheduleId: activeScheduleId,
            subjectId: selectedSubjectId,
            startDate,
            endDate,
            description,
            restDays
        });

        // Reset form and close modal
        setSelectedSubjectId('');
        setStartDate('');
        setEndDate('');
        setDescription('');
        setRestDays([]);
        setIsModalOpen(false);
    };

    const toggleRestDay = (dayIndex: number) => {
        setRestDays(prev =>
            prev.includes(dayIndex)
                ? prev.filter(d => d !== dayIndex)
                : [...prev, dayIndex]
        );
    };

    // Filtrar itens apenas do cronograma ativo
    const scheduleItems = blockItems.filter(item => item.scheduleId === activeScheduleId);

    const sortedItems = [...scheduleItems].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
    );

    if (!activeScheduleId) return null;

    return (
        <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div>
                    <h3 className="text-lg font-semibold dark:text-white">Blocos de Estudo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organize seu estudo por períodos dedicados.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors shadow-sm"
                >
                    <PlusIcon className="h-5 w-5" />
                    Adicionar Bloco
                </button>
            </div>

            {/* List of Blocks */}
            <div className="space-y-3">
                {sortedItems.length === 0 ? (
                    <div className="p-12 text-center bg-gray-50 dark:bg-gray-800/50 rounded-lg border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum bloco planejado</p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Clique em "Adicionar Bloco" para começar.</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {sortedItems.map((item) => {
                            const subject = subjects.find(s => s.id === item.subjectId);
                            return (
                                <div
                                    key={item.id}
                                    className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-primary-300 dark:hover:border-primary-700 transition-colors group"
                                >
                                    <div className="flex items-start gap-4">
                                        <div
                                            className="w-1.5 self-stretch rounded-full bg-gray-200 dark:bg-gray-700 shrink-0"
                                            style={{ backgroundColor: subject?.color }}
                                        />
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">
                                                {subject?.name || 'Matéria removida'}
                                            </h4>

                                            <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-300">
                                                <CalendarIcon className="h-4 w-4 text-gray-400" />
                                                <span className="font-medium">
                                                    {format(parseISO(item.startDate), "dd/MM/yy")}
                                                </span>
                                                <span className="text-gray-400">→</span>
                                                <span className="font-medium">
                                                    {format(parseISO(item.endDate), "dd/MM/yy")}
                                                </span>
                                            </div>

                                            {item.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">
                                                    {item.description}
                                                </p>
                                            )}

                                            {item.restDays && item.restDays.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mt-2.5">
                                                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center">
                                                        Descanso:
                                                    </span>
                                                    {item.restDays.sort().map(d => (
                                                        <span key={d} className="text-[10px] font-semibold bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900/30 uppercase tracking-wide">
                                                            {weekDays[d]}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeBlockItem(item.id)}
                                        className="self-end sm:self-center text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                        title="Remover Bloco"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-scale-up">
                        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Novo Bloco de Estudo
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddItem} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Matéria
                                </label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full p-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                                    required
                                >
                                    <option value="">Selecione uma matéria...</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                                    ))}
                                </select>
                                <div className="mt-1 text-right">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsModalOpen(false);
                                            window.dispatchEvent(new CustomEvent('open-subject-manager'));
                                        }}
                                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                                    >
                                        + Nova Matéria
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Início
                                    </label>
                                    <input
                                        type="date"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full p-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Fim
                                    </label>
                                    <input
                                        type="date"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full p-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                    Descrição (Opcional)
                                </label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Ex: Focar em Álgebra Linear"
                                    className="w-full p-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Dias de Descanso (Sem estudo)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {weekDays.map((day, index) => (
                                        <button
                                            key={index}
                                            type="button"
                                            onClick={() => toggleRestDay(index)}
                                            className={`
                                                w-9 h-9 rounded-full text-xs font-bold flex items-center justify-center transition-all
                                                ${restDays.includes(index)
                                                    ? 'bg-red-100 text-red-600 border-2 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800 shadow-sm scale-105'
                                                    : 'bg-gray-50 text-gray-500 border border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                                                }
                                            `}
                                            title={restDays.includes(index) ? 'Dia de descanso' : 'Dia de estudo'}
                                        >
                                            {day.charAt(0)}
                                        </button>
                                    ))}
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    Selecione os dias da semana em que você <strong>não</strong> estudará esta matéria.
                                </p>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={!selectedSubjectId || !startDate || !endDate}
                                    className="w-full py-3 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20"
                                >
                                    Adicionar Bloco
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
