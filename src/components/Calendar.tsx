'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay, startOfWeek, endOfWeek, isWithinInterval, parseISO, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlusIcon, CalendarIcon, ClockIcon, PlayIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { Topic, Review } from '@/types';

// --- Agenda Panel Component ---

interface AgendaPanelProps {
  date: Date;
  topics: Topic[];
  reviews: Review[];
  plannedItems: any[];
  onCompleteReview: (id: string) => void;
  onTopicAdded: (topic: Topic) => void;
  onCloseMobile?: () => void;
  completedScheduleItems: string[];
  onToggleScheduleItem: (itemId: string) => void;
}

function AgendaPanel({ date, topics, reviews, plannedItems, onCompleteReview, onTopicAdded, onCloseMobile, completedScheduleItems, onToggleScheduleItem }: AgendaPanelProps) {
  const { subjects } = useSubjectStore();
  const { topics: allTopics, addTopic } = useTopicStore();
  const { generateReviewsForTopic } = useReviewStore();
  const { startSession } = usePomodoroStore();
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedScheduleItemId, setSelectedScheduleItemId] = useState<string | null>(null);

  // Initialize selected subject
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicTitle.trim() && selectedSubjectId) {
      const newTopicDate = startOfDay(new Date(date));
      const newTopic = addTopic(
        newTopicTitle.trim(),
        selectedSubjectId,
        newTopicDescription.trim(),
        newTopicDate,
        selectedScheduleItemId || undefined // Pass linked item ID
      );
      onTopicAdded(newTopic);

      // Generate reviews for the new topic
      generateReviewsForTopic(newTopic.id);

      // Reset selection but do NOT mark as complete automatically
      if (selectedScheduleItemId) {
        setSelectedScheduleItemId(null);
      }

      setNewTopicTitle('');
      setNewTopicDescription('');
      setShowTopicForm(false);
    }
  };

  const handleStartSession = (subjectId: string, topicId?: string) => {
    startSession(subjectId, topicId);
    window.dispatchEvent(new CustomEvent('navigate-to-pomodoro'));
  };

  // Filter topics that are NOT linked to any schedule item for the "Tópicos Registrados" list
  const unlinkedTopics = topics.filter(t => !t.linkedScheduleItemId);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 border-l dark:border-gray-700 shadow-xl md:shadow-none">
      {/* Header */}
      <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
            {format(date, "EEEE", { locale: ptBR })}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {format(date, "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {onCloseMobile && (
          <button onClick={onCloseMobile} className="md:hidden p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full">
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Planned Items Section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              Estudos Planejados
            </h3>
            <button
              onClick={() => {
                setSelectedScheduleItemId(null);
                setShowTopicForm(!showTopicForm);
              }}
              className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
              id="tour-calendar-planned"
            >
              {showTopicForm ? 'Cancelar' : '+ Avulso'}
            </button>
          </div>

          {showTopicForm && (
            <form onSubmit={handleCreateTopic} className="mb-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border dark:border-gray-700 animate-fade-in">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Matéria</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    required
                  >
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Título</label>
                  <input
                    type="text"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    className="w-full p-2 text-sm rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="O que você estudou?"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Descrição</label>
                  <textarea
                    value={newTopicDescription}
                    onChange={(e) => setNewTopicDescription(e.target.value)}
                    rows={2}
                    className="w-full p-2 text-sm rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="Detalhes..."
                  />
                </div>
                <button
                  type="submit"
                  disabled={!newTopicTitle.trim()}
                  className="w-full py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
                >
                  Salvar Tópico
                </button>
              </div>
            </form>
          )}

          {plannedItems.length > 0 ? (
            <div className="space-y-2 mb-4">
              {plannedItems.map((item, idx) => {
                const subject = subjects.find(s => s.id === item.subjectId);
                if (!subject) return null;

                const isCompleted = completedScheduleItems.includes(item.id);
                // Find linked topic for this schedule item
                const linkedTopic = topics.find(t => t.linkedScheduleItemId === item.id);

                return (
                  <div key={idx} className={`group flex items-center justify-between p-3 border rounded-xl transition-all hover:shadow-sm ${isCompleted
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-700 opacity-75'
                    : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30'
                    }`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${isCompleted ? 'bg-gray-300 dark:bg-gray-600' : ''}`} style={{ backgroundColor: isCompleted ? undefined : subject.color }} />
                      <div className="min-w-0">
                        {linkedTopic ? (
                          <>
                            <p className={`font-semibold text-sm truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                              {linkedTopic.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{subject.name}</p>
                          </>
                        ) : (
                          <p className={`font-semibold text-sm truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                            {subject.name}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {item.startTime && (
                            <span className="flex items-center gap-1 bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border dark:border-gray-700">
                              <ClockIcon className="h-3 w-3" />
                              {item.startTime} - {item.endTime}
                            </span>
                          )}
                          {item.topicId && !linkedTopic && (
                            <span className={`font-medium truncate ${isCompleted ? 'text-gray-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              {allTopics.find(t => t.id === item.topicId)?.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
                      {!isCompleted && (
                        <button
                          onClick={() => handleStartSession(subject.id, item.topicId)}
                          className="p-1.5 text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
                          title="Estudar Agora"
                        >
                          <PlayIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => onToggleScheduleItem(item.id)}
                        className={`p-1.5 rounded-lg transition-colors ${isCompleted
                          ? 'text-yellow-600 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                          : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30'
                          }`}
                        title={isCompleted ? "Desmarcar" : "Concluir"}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                      {!isCompleted && !linkedTopic && (
                        <button
                          onClick={() => {
                            setSelectedSubjectId(subject.id);
                            setSelectedScheduleItemId(item.id);
                            if (item.topicId) {
                              const topic = allTopics.find(t => t.id === item.topicId);
                              if (topic) {
                                setNewTopicTitle(topic.title);
                                setNewTopicDescription(topic.description || '');
                              }
                            }
                            setShowTopicForm(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                          title="Registrar detalhado"
                        >
                          <PlusIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic mb-4">Nada planejado para hoje.</p>
          )}

          {/* Created Topics List (Unlinked Only) */}
          {unlinkedTopics.length > 0 && (
            <div className="space-y-2 border-t dark:border-gray-700 pt-4">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Tópicos Avulsos
              </h4>
              {unlinkedTopics.map(topic => {
                const subject = subjects.find(s => s.id === topic.subjectId);
                return (
                  <div key={topic.id} className="p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-sm flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{topic.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{subject?.name}</p>
                      {topic.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{topic.description}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <section>
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">Revisões Planejadas</h3>
            <div className="space-y-2">
              {reviews.map(review => {
                const topic = allTopics.find(t => t.id === review.topicId);
                const subject = topic ? subjects.find(s => s.id === topic.subjectId) : null;
                const isCompleted = review.completed;

                return (
                  <div key={review.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${isCompleted ? 'bg-green-50 border-green-100 dark:bg-green-900/10 dark:border-green-900/30' : 'bg-yellow-50 border-yellow-100 dark:bg-yellow-900/10 dark:border-yellow-900/30'}`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-yellow-500 text-transparent'}`}>
                        {isCompleted && <CheckCircleSolidIcon className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-medium truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {topic?.title}
                        </p>
                        <p className="text-xs text-gray-500">{subject?.name}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onCompleteReview(review.id)}
                      className={`text-xs px-2 py-1 rounded-md font-medium transition-colors ${isCompleted ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'}`}
                    >
                      {isCompleted ? 'Desfazer' : 'Concluir'}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// --- Main Calendar Component ---

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMobileAgenda, setShowMobileAgenda] = useState(false);

  // Data states
  const [dayTopics, setDayTopics] = useState<Topic[]>([]);
  const [dayReviews, setDayReviews] = useState<Review[]>([]);
  const [dayPlannedItems, setDayPlannedItems] = useState<any[]>([]);

  const { subjects } = useSubjectStore();
  const { topics } = useTopicStore();
  const { reviews, toggleReviewCompletion } = useReviewStore();
  const { darkMode } = useSettingsStore();
  const { schedules, weeklyItems, blockItems, completedScheduleItems, toggleScheduleItemCompletion } = useScheduleStore();

  // Calendar Grid Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const daysInGrid = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Navigation
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    updateSelectedDayInfo(today);
  };

  // Data Helpers
  const getTopicsForDay = (day: Date) => topics.filter(t => {
    const topicDate = typeof t.createdAt === 'string' ? parseISO(t.createdAt) : new Date(t.createdAt);
    return isSameDay(topicDate, day);
  });
  const getReviewsForDay = (day: Date) => reviews.filter(r => {
    const reviewDate = typeof r.scheduledDate === 'string' ? parseISO(r.scheduledDate) : new Date(r.scheduledDate);
    return isSameDay(reviewDate, day);
  });

  const getPlannedItemsForDay = (day: Date) => {
    const activeSchedules = schedules.filter(s => s.isActive);
    let plannedItems: any[] = [];

    activeSchedules.forEach(schedule => {
      const scheduleStart = parseISO(schedule.startDate);
      const scheduleEnd = parseISO(schedule.endDate);

      if (!isWithinInterval(startOfDay(day), { start: startOfDay(scheduleStart), end: startOfDay(scheduleEnd) })) return;

      if (schedule.mode === 'weekly') {
        const dayOfWeek = getDay(day);
        const items = weeklyItems.filter(item => item.scheduleId === schedule.id && item.dayOfWeek === dayOfWeek);
        plannedItems = [...plannedItems, ...items];
      } else {
        const items = blockItems.filter(item => {
          if (item.scheduleId !== schedule.id) return false;
          const start = parseISO(item.startDate);
          const end = parseISO(item.endDate);
          const inRange = isWithinInterval(startOfDay(day), { start: startOfDay(start), end: startOfDay(end) });
          const isRestDay = item.restDays?.includes(getDay(day));
          return inRange && !isRestDay;
        });
        plannedItems = [...plannedItems, ...items];
      }
    });
    return plannedItems;
  };

  const updateSelectedDayInfo = (day: Date) => {
    setDayTopics(getTopicsForDay(day));
    setDayReviews(getReviewsForDay(day));
    setDayPlannedItems(getPlannedItemsForDay(day));
  };

  useEffect(() => {
    updateSelectedDayInfo(selectedDate);
  }, [selectedDate, topics, reviews]); // Added reviews dependency to update when reviews change

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    updateSelectedDayInfo(day);
    setShowMobileAgenda(true);
  };

  const handleToggleReview = (reviewId: string) => {
    toggleReviewCompletion(reviewId);
    // State update handled by useEffect dependency on reviews
  };

  const handleTopicAdded = (topic: Topic) => {
    setDayTopics(prev => [...prev, topic]);
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-140px)] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">

      {/* Left Side: Calendar Grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <ChevronLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={goToToday} className="px-3 py-1.5 text-sm font-medium bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-lg hover:bg-primary-100 transition-colors">
              Hoje
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <ChevronRightIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b dark:border-gray-700">
          {weekDays.map(day => (
            <div key={day} className="py-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-gray-50/50 dark:bg-gray-900/50">
          {daysInGrid.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);

            const dayTopicsList = getTopicsForDay(day);
            const dayReviewsList = getReviewsForDay(day);
            const dayPlannedList = getPlannedItemsForDay(day);

            const hasTopics = dayTopicsList.length > 0;
            const hasReviews = dayReviewsList.length > 0;
            const hasPlanned = dayPlannedList.length > 0;

            return (
              <div
                key={i}
                onClick={() => handleDayClick(day)}
                className={`
                  relative border-b border-r dark:border-gray-700/50 p-1 transition-all cursor-pointer hover:bg-white dark:hover:bg-gray-800
                  ${!isCurrentMonth ? 'opacity-40 bg-gray-100/50 dark:bg-gray-900' : ''}
                  ${isSelected ? 'bg-white dark:bg-gray-800 ring-2 ring-inset ring-primary-500 z-10' : ''}
                `}
              >
                <div className="flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start">
                    <span className={`
                      text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? 'bg-primary-600 text-white shadow-md' : 'text-gray-700 dark:text-gray-300'}
                    `}>
                      {format(day, 'd')}
                    </span>
                  </div>

                  {/* Indicators */}
                  <div className="flex flex-wrap gap-1 mt-1 content-end">
                    {hasPlanned && (
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" title="Planejado" />
                    )}
                    {hasTopics && (
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500" title="Realizado" />
                    )}
                    {hasReviews && (
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-400" title="Revisão" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side: Agenda Panel (Desktop) */}
      <div className="hidden md:block w-96 border-l dark:border-gray-700 bg-white dark:bg-gray-800 z-20">
        <AgendaPanel
          date={selectedDate}
          topics={dayTopics}
          reviews={dayReviews}
          plannedItems={dayPlannedItems}
          onCompleteReview={handleToggleReview}
          onTopicAdded={handleTopicAdded}
          completedScheduleItems={completedScheduleItems}
          onToggleScheduleItem={toggleScheduleItemCompletion}
        />
      </div>

      {/* Mobile Agenda Modal */}
      {showMobileAgenda && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white dark:bg-gray-800 w-full h-[85vh] sm:h-[600px] sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-slide-up">
            <AgendaPanel
              date={selectedDate}
              topics={dayTopics}
              reviews={dayReviews}
              plannedItems={dayPlannedItems}
              onCompleteReview={handleToggleReview}
              onTopicAdded={handleTopicAdded}
              onCloseMobile={() => setShowMobileAgenda(false)}
              completedScheduleItems={completedScheduleItems}
              onToggleScheduleItem={toggleScheduleItemCompletion}
            />
          </div>
        </div>
      )}
    </div>
  );
}