import { useState } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSubjectStore } from '@/store/subjectStore';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
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

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const handleAddItem = () => {
        if (!selectedSubjectId || !startDate || !endDate || !activeScheduleId) return;

        addBlockItem({
            scheduleId: activeScheduleId,
            subjectId: selectedSubjectId,
            startDate,
            endDate,
            description,
            restDays
        });

        // Reset form
        setSelectedSubjectId('');
        setStartDate('');
        setEndDate('');
        setDescription('');
        setRestDays([]);
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
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4 dark:text-white">Adicionar Bloco de Estudo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Matéria</label>
                        <select
                            value={selectedSubjectId}
                            onChange={(e) => setSelectedSubjectId(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            <option value="">Selecione...</option>
                            {subjects.map((subject) => (
                                <option key={subject.id} value={subject.id}>{subject.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <button
                        onClick={handleAddItem}
                        disabled={!selectedSubjectId || !startDate || !endDate}
                        className="bg-primary-600 text-white p-2 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        <PlusIcon className="h-5 w-5" />
                        <span>Adicionar</span>
                    </button>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (Opcional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Focar em Álgebra Linear"
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Dias de Descanso (Sem estudo)</label>
                        <div className="flex gap-2">
                            {weekDays.map((day, index) => (
                                <button
                                    key={index}
                                    onClick={() => toggleRestDay(index)}
                                    className={`
                    w-8 h-8 rounded-full text-xs font-medium flex items-center justify-center transition-colors
                    ${restDays.includes(index)
                                            ? 'bg-red-100 text-red-700 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                                            : 'bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }
                  `}
                                    title={restDays.includes(index) ? 'Dia de descanso' : 'Dia de estudo'}
                                >
                                    {day.charAt(0)}
                                </button>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Clique nos dias da semana para marcar como descanso.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <div className="p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold dark:text-white">Blocos Planejados</h3>
                </div>

                {sortedItems.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        Nenhum bloco de estudo planejado para este cronograma.
                    </div>
                ) : (
                    <div className="divide-y dark:divide-gray-700">
                        {sortedItems.map((item) => {
                            const subject = subjects.find(s => s.id === item.subjectId);
                            return (
                                <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750">
                                    <div className="flex items-center gap-4">
                                        <div
                                            className="w-3 h-12 rounded-full"
                                            style={{ backgroundColor: subject?.color || '#ccc' }}
                                        />
                                        <div>
                                            <h4 className="font-semibold text-lg dark:text-white">
                                                {subject?.name || 'Matéria removida'}
                                            </h4>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {format(parseISO(item.startDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                                {' até '}
                                                {format(parseISO(item.endDate), "dd 'de' MMM, yyyy", { locale: ptBR })}
                                            </p>
                                            {item.description && (
                                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                                    {item.description}
                                                </p>
                                            )}
                                            {item.restDays && item.restDays.length > 0 && (
                                                <div className="flex items-center gap-1 mt-1">
                                                    <span className="text-xs text-gray-500">Descanso:</span>
                                                    {item.restDays.sort().map(d => (
                                                        <span key={d} className="text-xs bg-red-50 text-red-600 px-1 rounded border border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900">
                                                            {weekDays[d]}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => removeBlockItem(item.id)}
                                        className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"
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
        </div>
    );
}
