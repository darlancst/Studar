'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay, startOfWeek, endOfWeek, isWithinInterval, parseISO, getDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlusIcon, CalendarIcon, ClockIcon, PlayIcon, ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolidIcon } from '@heroicons/react/24/solid';

import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useScheduleStore } from '@/store/scheduleStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useVacationStore } from '@/store/vacationStore';
import { Topic, Review, Subject } from '@/types';
import { useRegisterModal } from '@/hooks/useRegisterModal';
import useSwipe from '@/hooks/useSwipe';

// --- Agenda Panel Component ---

interface AgendaPanelProps {
  date: Date;
  topics: Topic[];
  reviews: Review[];
  plannedItems: any[];
  onCompleteReview: (id: string) => void;
  onTopicAdded: (topic: Topic) => void;
  onCloseMobile?: () => void;
  isItemCompleted: (itemId: string) => boolean;
  onToggleScheduleItem: (itemId: string) => void;
}

function AgendaPanel({ date, topics, reviews, plannedItems, onCompleteReview, onTopicAdded, onCloseMobile, isItemCompleted, onToggleScheduleItem }: AgendaPanelProps) {
  const { subjects } = useSubjectStore();
  const { topics: allTopics, addTopic } = useTopicStore();
  const { generateReviewsForTopic } = useReviewStore();
  const { startSession, sessions, deleteSession } = usePomodoroStore();
  const { isVacationDate } = useVacationStore();
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);

  const isVacation = isVacationDate(date);

  // Filtrar sessões de estudo realizadas neste dia específico
  const daySessions = useMemo(() => {
    return sessions.filter(s => {
      try {
        const sessionDate = parseISO(s.date);
        return isSameDay(sessionDate, date);
      } catch (err) {
        return false;
      }
    }).sort((a, b) => a.date.localeCompare(b.date)); // Ordenar cronologicamente por hora de conclusão
  }, [sessions, date]);

  // Initialize selected subject
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Scroll to top when date changes
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  }, [date]);



  const handleStartSession = (subjectId: string, topicId?: string) => {
    startSession(subjectId, topicId);
    window.dispatchEvent(new CustomEvent('navigate-to-pomodoro'));
  };

  // Filter topics that are NOT linked to any schedule item for the "Tópicos Registrados" list
  const unlinkedTopics = topics.filter(t => !t.linkedScheduleItemId);

  return (
    <div className="flex-1 md:h-full min-h-0 flex flex-col bg-white/95 dark:bg-gray-900/90 border-l border-gray-150/40 dark:border-gray-800/80 shadow-xl md:shadow-none transition-all duration-300">
      {/* Header */}
      <div className="p-3 border-b border-gray-150/50 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-900/60 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white capitalize tracking-tight flex items-center gap-2">
            {format(date, "EEEE", { locale: ptBR })}
            {isVacation && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50">
                🌴 Férias
              </span>
            )}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {format(date, "d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile} 
            className="md:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg active:scale-95 transition-all"
            title="Fechar"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      <div ref={contentRef} className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Vacation Notice Banner */}
        {isVacation && (
          <div className="p-3 bg-gradient-to-r from-cyan-500/10 via-teal-500/10 to-blue-500/10 border border-cyan-200 dark:border-cyan-800/60 rounded-xl flex items-center gap-3 shadow-xs">
            <span className="text-2xl">🌴</span>
            <div className="min-w-0">
              <p className="text-xs font-bold text-cyan-800 dark:text-cyan-300 uppercase tracking-wide">Período de Férias</p>
              <p className="text-xs text-cyan-700 dark:text-cyan-400 mt-0.5">
                Descanso programado. As matérias de cronograma estão pausadas neste dia.
              </p>
            </div>
          </div>
        )}

        {/* Planned Items Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-blue-500" />
              Estudos Planejados
            </h3>
          </div>

          {plannedItems.length > 0 ? (
            <div className="space-y-2 mb-4">
              {plannedItems.map((item, idx) => {
                const subject = subjects.find(s => s.id === item.subjectId);
                if (!subject) return null;

                const isCompleted = isItemCompleted(item.id);
                // Find linked topic for this schedule item
                const linkedTopic = topics.find(t => t.linkedScheduleItemId === item.id);

                return (
                  <div key={idx} className={`group flex items-center justify-between p-2.5 border rounded-xl transition-all duration-300 ${
                    isCompleted
                      ? 'bg-gray-50/40 border-gray-150/20 dark:bg-gray-900/10 dark:border-gray-850/30 opacity-50'
                      : 'bg-white/80 dark:bg-gray-900/40 border-gray-150/50 dark:border-gray-850/80 backdrop-blur-md shadow-sm hover:shadow-md hover:border-primary-300 dark:hover:border-primary-850'
                    }`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      {/* Borda decorativa lateral jateada */}
                      <div 
                        className={`w-1.5 h-8 rounded-full flex-shrink-0 transition-colors ${isCompleted ? 'bg-gray-300 dark:bg-gray-600' : ''}`} 
                        style={{ backgroundColor: isCompleted ? undefined : subject.color }} 
                      />
                      <div className="min-w-0">
                        {linkedTopic ? (
                          <>
                            <p className={`font-semibold text-sm truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                              {linkedTopic.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subject.name}</p>
                          </>
                        ) : (
                          <p className={`font-semibold text-sm truncate ${isCompleted ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                            {subject.name}
                          </p>
                        )}

                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {item.startTime && (
                            <span className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/60 px-1.5 py-0.5 rounded border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm tabular-nums">
                              <ClockIcon className="h-3 w-3 text-gray-400" />
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
                    
                    <div className="flex gap-1">
                      {!isCompleted && (
                        <button
                          onClick={() => handleStartSession(subject.id, item.topicId)}
                          className="p-1.5 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-lg active:scale-90 transition-all"
                          title="Estudar Agora"
                        >
                          <PlayIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          onToggleScheduleItem(item.id);
                          // If we are marking as completed (currently NOT completed)
                          if (!isCompleted) {
                            const topicIdToReview = linkedTopic?.id || item.topicId;
                            if (topicIdToReview) {
                              generateReviewsForTopic(topicIdToReview);
                            }
                          }
                        }}
                        className={`p-1.5 rounded-lg active:scale-90 transition-all ${isCompleted
                          ? 'text-yellow-600 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:bg-yellow-950/30'
                          : 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30'
                          }`}
                        title={isCompleted ? "Desmarcar" : "Concluir"}
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50/20 dark:bg-gray-900/10 border border-dashed border-gray-200 dark:border-gray-800/40 p-4 rounded-xl text-center select-none mb-4">
              <CalendarIcon className="h-5 w-5 mx-auto text-gray-300 dark:text-gray-600 mb-1" />
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 italic">
                {isVacation ? 'Dia de férias/folga (sem matérias de cronograma).' : 'Nada planejado para este dia.'}
              </p>
            </div>
          )}

          {/* Created Topics List (Unlinked Only) */}
          {unlinkedTopics.length > 0 && (
            <div className="space-y-2 border-t border-gray-150/40 dark:border-gray-800 pt-4">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                Tópicos Avulsos
              </h4>
              {unlinkedTopics.map(topic => {
                const subject = subjects.find(s => s.id === topic.subjectId);
                return (
                  <div key={topic.id} className="p-2.5 bg-white/60 dark:bg-gray-900/40 border border-gray-150/50 dark:border-gray-800/80 rounded-xl shadow-sm flex items-center justify-between gap-2.5 group hover:bg-white/80 dark:hover:bg-gray-900/60 transition-all duration-300">
                    <div className="flex items-start gap-3 overflow-hidden">
                      <div className="mt-1 w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{topic.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{subject?.name}</p>
                        {topic.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{topic.description}</p>}
                      </div>
                    </div>
                    <button
                      onClick={() => handleStartSession(topic.subjectId, topic.id)}
                      className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 active:scale-95"
                      title="Estudar Agora"
                    >
                      <PlayIcon className="h-5 w-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Estudos Realizados (Linha do Tempo Real) */}
        <section className="border-t dark:border-gray-700/50 pt-4">
          <div className="flex items-center justify-between mb-3.5">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <ClockIcon className="h-4 w-4 text-primary-500" />
              Estudos Realizados
            </h3>
            {daySessions.length > 0 && (
              <span className="text-[10px] font-bold bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full border border-primary-100 dark:border-primary-900/50">
                {daySessions.length} {daySessions.length === 1 ? 'ciclo' : 'ciclos'}
              </span>
            )}
          </div>

          {daySessions.length > 0 ? (
            <div className="relative pl-4 ml-2 border-l border-dashed border-gray-200 dark:border-gray-700/60 space-y-4 py-1">
              {daySessions.map((session, idx) => {
                // Tentar encontrar o tópico primeiro
                const topic = allTopics.find(t => t.id === session.topicId);
                let subject = null;
                let topicTitle = 'Estudo Geral';

                if (topic) {
                  subject = subjects.find(s => s.id === topic.subjectId) || null;
                  topicTitle = topic.title;
                } else {
                  // Se não encontrou o tópico, o session.topicId representa o ID de uma matéria diretamente
                  subject = subjects.find(s => s.id === session.topicId) || null;
                  topicTitle = 'Estudo Geral';
                }
                
                // Calcular horário de início
                const sessionEndTime = parseISO(session.date);
                const sessionStartTime = new Date(sessionEndTime.getTime() - session.duration * 60 * 1000);
                
                const startTimeStr = format(sessionStartTime, 'HH:mm');
                const endTimeStr = format(sessionEndTime, 'HH:mm');

                return (
                  <div key={session.id || idx} className="relative group">
                    {/* Indicador na linha do tempo */}
                    <div 
                      className="absolute -left-[1.375rem] top-1.5 w-2.5 h-2.5 rounded-full border border-white dark:border-gray-800 shadow-sm transition-transform duration-300 group-hover:scale-125 z-10"
                      style={{ backgroundColor: subject?.color || '#3b82f6' }}
                    />
                    
                    {/* Card do histórico realizado */}
                    <div className="bg-gray-50/50 dark:bg-gray-900/20 border border-gray-150/40 dark:border-gray-800/40 p-2.5 rounded-xl transition-all duration-300 hover:bg-gray-100/50 dark:hover:bg-gray-900/40 hover:shadow-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5 tabular-nums">
                            {startTimeStr} às {endTimeStr}
                          </p>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-1 truncate">
                            {subject?.name || 'Sem Matéria'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 italic truncate">
                            {topicTitle}
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold bg-white/80 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border border-gray-150/50 dark:border-gray-700/50 px-1.5 py-0.5 rounded-md shadow-sm select-none tabular-nums">
                            {session.duration} min
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Deseja realmente apagar o registro desse estudo de ${session.duration} minutos? Isso removerá permanentemente o tempo das suas estatísticas.`)) {
                                deleteSession(session.id);
                              }
                            }}
                            className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all active:scale-90"
                            title="Excluir Registro de Estudo"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-50/30 dark:bg-gray-900/10 border border-dashed border-gray-200 dark:border-gray-800/50 p-4 rounded-xl text-center select-none">
              <ClockIcon className="h-5 w-5 mx-auto text-gray-300 dark:text-gray-600 mb-1.5" />
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500">Nenhum estudo realizado neste dia.</p>
              {isSameDay(date, new Date()) && (
                <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-0.5">Inicie o timer do Pomodoro para começar a sua timeline!</p>
              )}
            </div>
          )}
        </section>

        {/* Reviews Section */}
        {reviews.length > 0 && (
          <section className="border-t border-gray-150/40 dark:border-gray-800 pt-4 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <ArrowPathIcon className="h-4 w-4 text-yellow-500" />
              Revisões Planejadas
            </h3>
            <div className="space-y-2">
              {reviews.map(review => {
                const topic = allTopics.find(t => t.id === review.topicId);
                const subject = topic ? subjects.find(s => s.id === topic.subjectId) : null;
                const isCompleted = review.completed;

                return (
                  <div key={review.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-green-50/20 border-green-150/20 dark:bg-green-950/10 dark:border-green-900/10 opacity-60' 
                      : 'bg-white/80 dark:bg-gray-900/40 border-gray-150/50 dark:border-gray-850/80 shadow-sm hover:shadow-md'
                  }`}>
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div 
                        className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all cursor-pointer ${
                          isCompleted 
                            ? 'bg-green-500 border-green-500 text-white' 
                            : 'border-yellow-500 dark:border-yellow-600 text-transparent'
                        }`}
                        onClick={() => onCompleteReview(review.id)}
                      >
                        {isCompleted && <CheckCircleSolidIcon className="h-3 w-3" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-sm font-semibold truncate ${isCompleted ? 'text-gray-500 line-through font-normal' : 'text-gray-900 dark:text-white'}`}>
                          {topic?.title || 'Revisão Avulsa'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subject?.name || 'Sem Matéria'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onCompleteReview(review.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border transition-colors ${
                        isCompleted 
                          ? 'text-yellow-600 border-yellow-200 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-900/30 dark:hover:bg-yellow-950/20' 
                          : 'text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-900/30 dark:hover:bg-green-950/20'
                      }`}
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

interface CalendarProps {
  activeTab?: string;
}

export default function Calendar({ activeTab }: CalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showMobileAgenda, setShowMobileAgenda] = useState(false);
  const [mounted, setMounted] = useState(false);

  useRegisterModal(showMobileAgenda, () => setShowMobileAgenda(false));

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (activeTab && activeTab !== 'calendar') {
      setShowMobileAgenda(false);
    }
  }, [activeTab]);

  // Data states
  const [dayTopics, setDayTopics] = useState<Topic[]>([]);
  const [dayReviews, setDayReviews] = useState<Review[]>([]);
  const [dayPlannedItems, setDayPlannedItems] = useState<any[]>([]);

  const { subjects } = useSubjectStore();
  const { topics } = useTopicStore();
  const { reviews, toggleReviewCompletion } = useReviewStore();
  const { darkMode } = useSettingsStore();
  const { schedules, weeklyItems, blockItems, isItemCompletedForDate, toggleScheduleItemCompletion } = useScheduleStore();
  const { isVacationDate, vacationPeriods } = useVacationStore();
  const { sessions } = usePomodoroStore();

  const [showAllSubjects, setShowAllSubjects] = useState(false);

  const swipeHandlers = useSwipe({
    onSwipeLeft: () => setCurrentMonth(addMonths(currentMonth, 1)),
    onSwipeRight: () => setCurrentMonth(subMonths(currentMonth, 1)),
    threshold: 60
  });

  // Calendar Grid Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  // Force 6 weeks (42 days) to ensure consistent height
  const calendarEnd = addDays(calendarStart, 41);
  const daysInGrid = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const weekDaysMobile = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

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
  const getCompletedReviewsForDay = (day: Date) => reviews.filter(r => {
    if (!r.completed) return false;
    const compDate = typeof r.date === 'string' ? parseISO(r.date) : new Date(r.date);
    return isSameDay(compDate, day);
  });

  const getPlannedItemsForDay = (day: Date) => {
    // Se o dia for de férias, nenhum item de cronograma é planejado
    if (isVacationDate(day)) return [];

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

  const getDayItems = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayPlannedList = getPlannedItemsForDay(day);
    const dayReviewsList = getReviewsForDay(day);
    
    const items: {
      id: string;
      subject: Subject;
      label: string;
      isCompleted: boolean;
      type: 'study' | 'review';
    }[] = [];

    // 1. Estudos planejados
    dayPlannedList.forEach(item => {
      const subject = subjects.find(s => s.id === item.subjectId);
      if (!subject) return;
      const isCompleted = isItemCompletedForDate(item.id, dateStr);
      const linkedTopic = topics.find(t => t.linkedScheduleItemId === item.id);
      const itemTopic = item.topicId ? topics.find(t => t.id === item.topicId) : null;
      const label = linkedTopic?.title || itemTopic?.title || subject.name;

      items.push({
        id: `plan-${item.id}`,
        subject,
        label,
        isCompleted,
        type: 'study'
      });
    });

    // 2. Revisões agendadas
    dayReviewsList.forEach(review => {
      const topic = topics.find(t => t.id === review.topicId);
      const subject = topic ? subjects.find(s => s.id === topic.subjectId) : null;
      if (!subject) return;

      items.push({
        id: `rev-${review.id}`,
        subject,
        label: topic?.title || subject.name,
        isCompleted: review.completed,
        type: 'review'
      });
    });

    return items;
  };

  // Matérias presentes no dia selecionado (para a legenda dinâmica)
  const selectedDaySubjects = useMemo(() => {
    const dayItems = getDayItems(selectedDate);
    const subjectMap = new Map<string, Subject>();

    // 1. Matérias dos itens do calendário (estudos planejados e revisões do dia)
    dayItems.forEach(item => {
      if (item.subject && !subjectMap.has(item.subject.id)) {
        subjectMap.set(item.subject.id, item.subject);
      }
    });

    // 2. Tópicos avulsos criados no dia
    const topicsToday = getTopicsForDay(selectedDate);
    topicsToday.forEach(t => {
      const sub = subjects.find(s => s.id === t.subjectId);
      if (sub && !subjectMap.has(sub.id)) {
        subjectMap.set(sub.id, sub);
      }
    });

    // 3. Sessões de estudo concluídas no dia
    sessions.forEach(s => {
      try {
        const sessionDate = parseISO(s.date);
        if (isSameDay(sessionDate, selectedDate)) {
          const topic = topics.find(t => t.id === s.topicId);
          const sub = topic ? subjects.find(subj => subj.id === topic.subjectId) : subjects.find(subj => subj.id === s.topicId);
          if (sub && !subjectMap.has(sub.id)) {
            subjectMap.set(sub.id, sub);
          }
        }
      } catch {
        // ignore
      }
    });

    return Array.from(subjectMap.values());
  }, [selectedDate, schedules, weeklyItems, blockItems, reviews, topics, subjects, vacationPeriods, sessions]);

  const displaySubjects = showAllSubjects ? subjects : selectedDaySubjects;

  const updateSelectedDayInfo = (day: Date) => {
    setDayTopics(getTopicsForDay(day));
    setDayReviews(getReviewsForDay(day));
    setDayPlannedItems(getPlannedItemsForDay(day));
  };

  useEffect(() => {
    updateSelectedDayInfo(selectedDate);
  }, [selectedDate, topics, reviews, vacationPeriods]);

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
    <div className="flex flex-col md:flex-row h-auto md:h-[620px] bg-white/80 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 overflow-hidden">

      {/* Left Side: Calendar Grid */}
      <div {...swipeHandlers} className="flex-1 flex flex-col min-w-0">
        {/* Calendar Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-150/30 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/20">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white capitalize truncate max-w-[55%]">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={prevMonth} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <ChevronLeftIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
            </button>
            <button onClick={goToToday} className="px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm font-semibold bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-lg hover:bg-primary-100 transition-colors">
              Hoje
            </button>
            <button onClick={nextMonth} className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
              <ChevronRightIcon className="h-4.5 w-4.5 sm:h-5 sm:w-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-150/30 dark:border-gray-800/50 bg-white/50 dark:bg-gray-900/30">
          {weekDays.map((day, idx) => (
            <div key={day} className="py-2 text-center text-[10px] sm:text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              <span className="hidden sm:inline">{day}</span>
              <span className="inline sm:hidden">{weekDaysMobile[idx]}</span>
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="flex-1 grid grid-cols-7 auto-rows-fr bg-gray-50/50 dark:bg-gray-900/50">
          {daysInGrid.map((day, i) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isVacation = isVacationDate(day);
            const dayItems = getDayItems(day);

            return (
              <div
                key={i}
                onClick={() => handleDayClick(day)}
                className={`
                  relative border-b border-r border-gray-150/35 dark:border-gray-700/30 p-1 sm:p-1.5 transition-all cursor-pointer hover:bg-white/80 dark:hover:bg-gray-750/50
                  ${!isCurrentMonth ? 'opacity-30 bg-gray-100/30 dark:bg-gray-900/30' : ''}
                  ${isVacation && !isSelected ? 'bg-cyan-50/20 dark:bg-cyan-950/15' : ''}
                  ${isSelected ? 'bg-white/95 dark:bg-gray-800/90 ring-2 ring-inset ring-primary-500/60 z-10 shadow-sm' : ''}
                  min-h-[58px] sm:min-h-0 flex flex-col justify-between
                `}
              >
                {/* Header da Célula (Número do Dia e Badge de Férias) */}
                <div className="flex justify-between items-start gap-1">
                  <span className={`
                    text-xs sm:text-sm font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full transition-all tabular-nums
                    ${isToday ? 'bg-primary-600 text-white shadow-sm font-black' : isSelected ? 'text-primary-600 dark:text-primary-400 font-black' : 'text-gray-700 dark:text-gray-300'}
                  `}>
                    {format(day, 'd')}
                  </span>
                  {isVacation && (
                    <span 
                      className="text-[8px] sm:text-[9px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-100/80 dark:bg-cyan-950/70 border border-cyan-200 dark:border-cyan-800/60 px-1 py-0.5 rounded leading-none flex items-center gap-0.5 select-none"
                      title="Dia de férias programado"
                    >
                      🌴 <span className="hidden sm:inline">Férias</span>
                    </span>
                  )}
                </div>

                {/* MATRIZ DE ALTA DENSIDADE: Micro-pontos e losangos coloridos (Suporta 10 a 14+ itens/dia) */}
                <div className="flex flex-wrap gap-1 sm:gap-1.5 items-center content-start mt-1 w-full overflow-hidden min-h-[18px]">
                  {dayItems.slice(0, 12).map((item, idx) => {
                    const isStudy = item.type === 'study';

                    return (
                      <div
                        key={idx}
                        className={`transition-all hover:scale-125 flex-shrink-0 ${
                          isStudy
                            ? 'w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full'
                            : 'w-1.5 h-1.5 sm:w-2 sm:h-2 rotate-45 rounded-[1px]'
                        } ${
                          item.isCompleted
                            ? 'opacity-25 ring-1 ring-gray-400/50'
                            : 'opacity-100 shadow-xs ring-1 ring-black/10 dark:ring-white/20'
                        }`}
                        style={{
                          backgroundColor: item.subject.color,
                        }}
                        title={`${isStudy ? 'Estudo' : 'Revisão'}: ${item.subject.name} - ${item.label} (${item.isCompleted ? 'Concluído' : 'Pendente'})`}
                      />
                    );
                  })}
                  {dayItems.length > 12 && (
                    <span className="text-[7.5px] font-black text-gray-400 dark:text-gray-500 leading-none pl-0.5">
                      +{dayItems.length - 12}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="px-3 sm:px-4 py-2.5 border-t border-gray-150/40 dark:border-gray-800 bg-white/40 dark:bg-gray-900/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[11px] text-gray-500 dark:text-gray-400">
            {/* Matérias do Dia Selecionado */}
            <div className="flex flex-wrap items-center gap-2 max-w-full overflow-hidden">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
                {showAllSubjects ? 'Todas as Matérias:' : `Legenda (${format(selectedDate, 'dd/MM')}):`}
              </span>

              {displaySubjects.length > 0 ? (
                displaySubjects.map(sub => (
                  <div key={sub.id} className="flex items-center gap-1 text-[10px] font-semibold text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 rounded-full flex-shrink-0 shadow-xs" style={{ backgroundColor: sub.color }} />
                    <span className="truncate max-w-[100px] sm:max-w-none">{sub.name}</span>
                  </div>
                ))
              ) : (
                <span className="text-[10px] text-gray-400 dark:text-gray-500 italic">
                  {subjects.length === 0 ? 'Nenhuma matéria cadastrada' : 'Sem matérias para este dia'}
                </span>
              )}

              {subjects.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllSubjects(!showAllSubjects)}
                  className="text-[10px] font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline cursor-pointer ml-1 select-none transition-colors shrink-0"
                >
                  {showAllSubjects ? 'Ver apenas do dia' : `Ver todas (${subjects.length})`}
                </button>
              )}
            </div>

            {/* Guia de símbolos */}
            <div className="flex items-center gap-3 text-[10px] font-medium text-gray-500 dark:text-gray-400 shrink-0">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-gray-600 dark:bg-gray-300" />
                <span>Estudo</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rotate-45 rounded-[1px] bg-gray-600 dark:bg-gray-300" />
                <span>Revisão</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full border border-gray-400 opacity-40" />
                <span>Concluído</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Agenda Panel (Desktop) */}
      <div className="hidden md:block w-96 border-l border-gray-150/50 dark:border-gray-800/80 bg-white/90 dark:bg-gray-950/40 backdrop-blur-md z-20">
        <AgendaPanel
          date={selectedDate}
          topics={dayTopics}
          reviews={dayReviews}
          plannedItems={dayPlannedItems}
          onCompleteReview={handleToggleReview}
          onTopicAdded={handleTopicAdded}
          isItemCompleted={(itemId) => isItemCompletedForDate(itemId, format(selectedDate, 'yyyy-MM-dd'))}
          onToggleScheduleItem={(itemId) => toggleScheduleItemCompletion(itemId, format(selectedDate, 'yyyy-MM-dd'))}
        />
      </div>

      {/* Mobile Agenda Modal */}
      {showMobileAgenda && mounted && typeof document !== 'undefined' && createPortal(
        <div className="md:hidden fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end justify-center transition-all duration-300">
          <div className="bg-white dark:bg-gray-900 w-full h-[82vh] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-up border border-gray-150/50 dark:border-gray-800/80">
            {/* Bottom Sheet Drag Handle */}
            <div 
              className="w-full flex justify-center py-2.5 bg-white dark:bg-gray-900 border-b border-gray-100/30 dark:border-gray-850/10 flex-shrink-0 cursor-pointer"
              onClick={() => setShowMobileAgenda(false)}
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700/80 transition-colors hover:bg-gray-400 dark:hover:bg-gray-600" />
            </div>
            <AgendaPanel
              date={selectedDate}
              topics={dayTopics}
              reviews={dayReviews}
              plannedItems={dayPlannedItems}
              onCompleteReview={handleToggleReview}
              onTopicAdded={handleTopicAdded}
              onCloseMobile={() => setShowMobileAgenda(false)}
              isItemCompleted={(itemId) => isItemCompletedForDate(itemId, format(selectedDate, 'yyyy-MM-dd'))}
              onToggleScheduleItem={(itemId) => toggleScheduleItemCompletion(itemId, format(selectedDate, 'yyyy-MM-dd'))}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}