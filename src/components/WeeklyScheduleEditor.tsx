import { useState, useEffect } from 'react';
import { useRegisterModal } from '@/hooks/useRegisterModal';
import { createPortal } from 'react-dom';
import { useScheduleStore } from '@/store/scheduleStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { PlusIcon, TrashIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function WeeklyScheduleEditor() {
    const { weeklyItems, addWeeklyItem, removeWeeklyItem, activeScheduleId } = useScheduleStore();
    const { subjects } = useSubjectStore();
    const { topics } = useTopicStore();

    const [selectedDay, setSelectedDay] = useState(0); // 0 = Domingo
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('09:00');
    const [isModalOpen, setIsModalOpen] = useState(false);

    useRegisterModal(isModalOpen, () => setIsModalOpen(false));

    const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

    // Auto-update end time when start time changes (default 1 hour duration)
    useEffect(() => {
        if (startTime) {
            const [hours, minutes] = startTime.split(':').map(Number);
            const endDate = new Date();
            endDate.setHours(hours + 1);
            endDate.setMinutes(minutes);
            const endHours = String(endDate.getHours()).padStart(2, '0');
            const endMinutes = String(endDate.getMinutes()).padStart(2, '0');
            setEndTime(`${endHours}:${endMinutes}`);
        }
    }, [startTime]);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSubjectId || !activeScheduleId) return;

        addWeeklyItem({
            scheduleId: activeScheduleId,
            subjectId: selectedSubjectId,
            dayOfWeek: selectedDay,
            startTime,
            endTime,
        });

        // Reset selection and close modal
        setSelectedSubjectId('');
        setIsModalOpen(false);
    };

    const getLastEndTimeForDay = (dayIndex: number): string => {
        const dayItems = scheduleItems
            .filter(item => item.dayOfWeek === dayIndex)
            .sort((a, b) => b.endTime.localeCompare(a.endTime)); // latest first
        if (dayItems.length > 0) {
            return dayItems[0].endTime; // suggest starting where last item ends
        }
        return '08:00'; // default only if no items yet
    };

    const applySmartStartTime = (dayIndex: number) => {
        const suggestedStart = getLastEndTimeForDay(dayIndex);
        setStartTime(suggestedStart);
        // endTime will auto-update via useEffect (+1h)
    };

    const handleDayClick = (dayIndex: number) => {
        setSelectedDay(dayIndex);
        applySmartStartTime(dayIndex);
        setIsModalOpen(true);
    };

    const openModal = () => {
        const today = new Date().getDay();
        setSelectedDay(today);
        applySmartStartTime(today);
        setIsModalOpen(true);
    };

    // Filtrar itens apenas do cronograma ativo
    const scheduleItems = weeklyItems.filter(item => item.scheduleId === activeScheduleId);

    const sortedItems = [...scheduleItems].sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
    });

    if (!activeScheduleId) return null;

    return (
        <div className="space-y-4">
            {/* Header with Add Button */}
            <div className="flex justify-end">
                <button
                    onClick={openModal}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 dark:text-primary-400 dark:bg-primary-900/30 dark:hover:bg-primary-900/50 rounded-lg transition-colors"
                >
                    <PlusIcon className="h-4 w-4" />
                    Adicionar Item
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2">
                {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                    const day = weekDays[dayIndex];
                    const dayItems = sortedItems.filter(item => item.dayOfWeek === dayIndex);
                    const isToday = new Date().getDay() === dayIndex;

                    return (
                        <div
                            key={day}
                            onClick={() => handleDayClick(dayIndex)}
                            className={`
                                rounded-xl p-2 min-h-[110px] flex flex-col cursor-pointer transition-all border backdrop-blur-sm
                                ${isToday
                                    ? 'bg-white/95 dark:bg-gray-900/80 border-primary-300 dark:border-primary-800 ring-1 ring-primary-500/30 shadow-md scale-[1.01]'
                                    : 'bg-white/40 dark:bg-gray-900/30 border-gray-150/40 dark:border-gray-800/40 hover:bg-white/80 dark:hover:bg-gray-900/60 hover:border-primary-200 dark:hover:border-primary-700 hover:shadow-sm'
                                }
                            `}
                        >
                            <h4 className={`
                                text-xs font-bold text-center mb-2 uppercase tracking-wider pb-1 border-b
                                ${isToday ? 'text-primary-600 dark:text-primary-400 border-primary-100 dark:border-primary-800' : 'text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700'}
                            `}>
                                {day.slice(0, 3)}
                            </h4>

                            <div className="space-y-1.5 flex-1">
                                {dayItems.map((item) => {
                                    const subject = subjects.find(s => s.id === item.subjectId);
                                    return (
                                        <div
                                            key={item.id}
                                            className="px-2 py-1 rounded-md text-[10px] relative border dark:border-gray-700 leading-tight shadow-sm"
                                            style={{
                                                backgroundColor: subject ? `${subject.color}15` : undefined,
                                                borderLeft: subject ? `3px solid ${subject.color}` : undefined
                                            }}
                                        >
                                            <div className="font-semibold dark:text-white truncate pr-5">
                                                {subject?.name || 'Removida'}
                                            </div>
                                            <div className="text-gray-500 dark:text-gray-400 text-[9px] flex items-center gap-1 mt-0.5">
                                                <ClockIcon className="h-2.5 w-2.5" />
                                                {item.startTime} - {item.endTime}
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    removeWeeklyItem(item.id);
                                                }}
                                                className="absolute top-1 right-1 text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                                                title="Remover"
                                            >
                                                <TrashIcon className="h-3 w-3" />
                                            </button>
                                        </div>
                                    );
                                })}
                                {dayItems.length === 0 && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 gap-1 group-hover:text-primary-400 transition-colors">
                                        <PlusIcon className="h-4 w-4" />
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal */}
            {isModalOpen && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 border border-gray-150/50 dark:border-gray-800/80 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-scale-up">
                        <div className="flex items-center justify-between p-4 border-b border-gray-150/30 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-900/30">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                Adicionar à {weekDays[selectedDay]}
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                <XMarkIcon className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleAddItem} className="p-5 space-y-4">
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
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full p-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        Fim
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full p-2.5 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-shadow"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={!selectedSubjectId}
                                    className="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary-500/20"
                                >
                                    Adicionar ao Cronograma
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
