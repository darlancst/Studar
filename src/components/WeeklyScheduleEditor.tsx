import { useState } from 'react';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function WeeklyScheduleEditor() {
    const { weeklyItems, addWeeklyItem, removeWeeklyItem, activeScheduleId } = useScheduleStore();
    const { subjects } = useSubjectStore();
    const { topics } = useTopicStore();

    const [selectedDay, setSelectedDay] = useState(0); // 0 = Domingo
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');
    const [isExpanded, setIsExpanded] = useState(false);

    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    const handleAddItem = () => {
        if (!selectedSubjectId || !activeScheduleId) return;

        addWeeklyItem({
            scheduleId: activeScheduleId,
            subjectId: selectedSubjectId,
            dayOfWeek: selectedDay,
            startTime,
            endTime,
        });

        // Reset selection but keep day/time for easier batch entry
        setSelectedSubjectId('');
    };

    // Filtrar itens apenas do cronograma ativo
    const scheduleItems = weeklyItems.filter(item => item.scheduleId === activeScheduleId);

    const sortedItems = [...scheduleItems].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
    });

    if (!activeScheduleId) return null;

    return (
        <div className="space-y-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between p-2 text-left bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                        <PlusIcon className="h-3.5 w-3.5" />
                        Adicionar Item
                    </span>
                    <span className="text-[10px] text-gray-500 transform transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        ▼
                    </span>
                </button>

                {isExpanded && (
                    <div className="p-2 border-t border-gray-200 dark:border-gray-700 animate-fade-in-down">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Dia</label>
                                <select
                                    value={selectedDay}
                                    onChange={(e) => setSelectedDay(Number(e.target.value))}
                                    className="w-full p-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    {weekDays.map((day, index) => (
                                        <option key={index} value={index}>{day}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="col-span-2 md:col-span-1">
                                <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Matéria</label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full p-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">Selecione...</option>
                                    {subjects.map((subject) => (
                                        <option key={subject.id} value={subject.id}>{subject.name}</option>
                                    ))}
                                </select>
                            </div>



                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Início</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full p-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">Fim</label>
                                <input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full p-1 text-xs border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                />
                            </div>

                            <button
                                onClick={handleAddItem}
                                disabled={!selectedSubjectId}
                                className="col-span-2 md:col-span-1 bg-primary-600 text-white p-1 rounded hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs h-[26px]"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                <span>Adicionar</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-1.5">
                {weekDays.map((day, dayIndex) => {
                    const dayItems = sortedItems.filter(item => item.dayOfWeek === dayIndex);

                    return (
                        <div key={day} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-1.5 min-h-[100px] shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col">
                            <h4 className="text-xs font-bold text-center mb-1 text-gray-500 dark:text-gray-400 uppercase tracking-wider border-b border-gray-200 dark:border-gray-700 pb-1">
                                {day.slice(0, 3)}
                            </h4>

                            <div className="space-y-1 flex-1">
                                {dayItems.map((item) => {
                                    const subject = subjects.find(s => s.id === item.subjectId);
                                    return (
                                        <div
                                            key={item.id}
                                            className="px-1 py-0.5 rounded-[4px] text-[10px] relative group border dark:border-gray-700 leading-tight"
                                            style={{
                                                backgroundColor: subject ? `${subject.color}15` : undefined,
                                                borderLeft: subject ? `2px solid ${subject.color}` : undefined
                                            }}
                                        >
                                            <div className="font-semibold dark:text-white truncate pr-3">
                                                {subject?.name || 'Removida'}
                                                {item.topicId && (
                                                    <span className="font-normal text-gray-600 dark:text-gray-300 ml-1">
                                                        - {topics.find(t => t.id === item.topicId)?.title}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-gray-500 dark:text-gray-400 text-[9px]">
                                                {item.startTime}-{item.endTime}
                                            </div>

                                            <button
                                                onClick={() => removeWeeklyItem(item.id)}
                                                className="absolute top-0.5 right-0.5 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-red-50 rounded"
                                                title="Remover"
                                            >
                                                <TrashIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                                {dayItems.length === 0 && (
                                    <div className="flex-1 flex items-center justify-center text-gray-300 dark:text-gray-700 text-[10px] italic">
                                        -
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div >
    );
}
