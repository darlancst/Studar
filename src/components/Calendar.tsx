'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfDay, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';

import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSettingsStore } from '@/store/settingsStore';
import { Topic, Review } from '@/types';

// Componente para o modal de detalhes do dia
interface DayDetailsProps {
  date: Date;
  topics: Topic[];
  reviews: Review[];
  onClose: () => void;
  onCompleteReview: (id: string) => void;
  onTopicAdded: (topic: Topic) => void;
}

function DayDetails({ date, topics, reviews, onClose, onCompleteReview, onTopicAdded }: DayDetailsProps) {
  const { subjects } = useSubjectStore();
  const { topics: allTopics, addTopic } = useTopicStore();
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicDescription, setNewTopicDescription] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  
  // Inicializa o subject selecionado com o primeiro disponível (se houver)
  useEffect(() => {
    if (subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  // Função para lidar com a criação de um novo tópico
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTopicTitle.trim() && selectedSubjectId) {
      // Cria o tópico usando a data selecionada no calendário (início do dia)
      // Isso garante que a data de criação corresponda exatamente ao dia selecionado
      const newTopicDate = startOfDay(new Date(date));
      
      // Passa a data personalizada para o addTopic
      const newTopic = addTopic(
        newTopicTitle.trim(), 
        selectedSubjectId, 
        newTopicDescription.trim(),
        newTopicDate
      );
      
      onTopicAdded(newTopic);
      
      // Limpa o formulário e volta para a visualização
      setNewTopicTitle('');
      setNewTopicDescription('');
      setShowTopicForm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 overflow-y-auto flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[90vh]">
        <div className="flex items-center justify-between p-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-semibold dark:text-white">
            Detalhes de {format(date, "dd 'de' MMMM, yyyy", { locale: ptBR })}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}> 
          {/* Seção de Tópicos */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base font-medium text-gray-900 dark:text-white">Tópicos do dia</h3>
            <button 
                onClick={() => setShowTopicForm(prev => !prev)}
                className="flex items-center px-2 py-1 bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 text-xs rounded-md hover:bg-primary-200 dark:hover:bg-primary-800"
            >
                  <PlusIcon className="h-3 w-3 mr-1" />
                {showTopicForm ? 'Cancelar' : 'Adicionar Tópico'}
            </button>
          </div>

          {showTopicForm ? (
            <form onSubmit={handleCreateTopic} className="mb-4 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Matéria
                </label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  required
                >
                  <option value="" disabled>Selecione uma matéria</option>
                  {subjects.map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Título
                </label>
                <input
                  type="text"
                  value={newTopicTitle}
                  onChange={(e) => setNewTopicTitle(e.target.value)}
                  className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="Digite o título do tópico"
                  required
                />
              </div>
              
              <div className="mb-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Descrição (opcional)
                </label>
                <textarea
                  value={newTopicDescription}
                  onChange={(e) => setNewTopicDescription(e.target.value)}
                    rows={2}
                  className="w-full p-2 text-sm border rounded-md dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                    placeholder="Descreva o conteúdo deste tópico..."
                />
              </div>
              
                <div className="flex justify-end">
              <button
                type="submit"
                    disabled={!selectedSubjectId || !newTopicTitle.trim()}
                    className="px-3 py-1 bg-primary-600 text-white text-xs rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Criar Tópico
              </button>
                </div>
            </form>
          ) : (
            // Lista de tópicos existentes
            <div className="mb-4">
              {topics.length > 0 ? (
                <div className="space-y-2">
                  {topics.map((topic) => {
                    const subject = subjects.find(s => s.id === topic.subjectId);
                    return (
                      <div 
                        key={topic.id} 
                        className="p-2 rounded-md dark:bg-opacity-20"
                        style={{ backgroundColor: `${subject?.color}20` }}
                      >
                        <div className="flex items-center">
                          <div 
                            className="w-2 h-2 rounded-full mr-2" 
                            style={{ backgroundColor: subject?.color }}
                          />
                          <span className="font-medium dark:text-white text-sm">{topic.title}</span>
                        </div>
                        {topic.description && (
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{topic.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-xs">Nenhum tópico criado neste dia.</p>
              )}
            </div>
          )}
          </div>

          {/* Seção de revisões */}
          <div>
            <h3 className="text-base font-medium text-gray-900 dark:text-white mb-2">Revisões agendadas</h3>
            {reviews.length > 0 ? (
              <div className="space-y-2">
                {reviews.map((review) => {
                  const topic = allTopics.find(t => t.id === review.topicId);
                  const subject = topic ? subjects.find(s => s.id === topic.subjectId) : null;
                  
                  const isCompleted = review.completed;
                  const completedClasses = isCompleted 
                    ? 'bg-green-50 border-l-4 border-green-400 dark:bg-green-900/30 dark:border-green-600' 
                    : 'bg-yellow-50 border-l-4 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600';
                  
                  const buttonClasses = isCompleted
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white' // Estilo para "Desfazer"
                    : 'bg-green-600 hover:bg-green-700 text-white'; // Estilo para "Concluir"
                    
                  const buttonText = isCompleted ? 'Desfazer' : 'Concluir';
                  
                  return (
                    <div 
                      key={review.id} 
                      className={`p-2 rounded-md flex items-center justify-between ${completedClasses}`}
                    >
                      <div>
                        <div className="flex items-center">
                          {subject && (
                            <div 
                              className="w-2 h-2 rounded-full mr-2" 
                              style={{ backgroundColor: subject?.color }}
                            />
                          )}
                          <span className="font-medium dark:text-white text-sm">{topic?.title || 'Tópico não encontrado'}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                          {isCompleted ? 'Revisão concluída' : 'Revisão pendente'}
                        </p>
                      </div>
                      
                      {/* Botão de Toggle */}
                        <button
                        onClick={() => onCompleteReview(review.id)} // Chama a função passada como prop
                        className={`ml-2 px-2 py-1 text-xs rounded-md ${buttonClasses}`}
                        >
                        {buttonText}
                        </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs">Nenhuma revisão agendada para este dia.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDayDetails, setShowDayDetails] = useState(false);
  const [dayTopics, setDayTopics] = useState<Topic[]>([]);
  const [dayReviews, setDayReviews] = useState<Review[]>([]);
  
  const { subjects } = useSubjectStore();
  const { topics } = useTopicStore();
  const { reviews, toggleReviewCompletion } = useReviewStore();
  const { darkMode } = useSettingsStore();
  
  // Dias do mês atual
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  
  // Determinar o primeiro e último dia da grade do calendário
  // Começamos com o domingo anterior ao primeiro dia do mês
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  // Terminamos com o sábado após o último dia do mês
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  
  // Gerar todos os dias a serem exibidos no calendário (incluindo dias de meses adjacentes)
  const daysInGrid = eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  
  // Dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  // Navegar entre meses
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(today);
    setSelectedDate(today);
    updateSelectedDayInfo(today);
  };
  
  // Filtra tópicos e revisões para um dia específico
  const getTopicsForDay = (day: Date) => {
    return topics.filter(topic => {
      try {
        const topicDate = new Date(topic.createdAt);
        return isSameDay(topicDate, day);
      } catch (e) {
        console.error("Erro ao comparar datas:", e);
        return false;
      }
    });
  };
  
  const getReviewsForDay = (day: Date) => {
    return reviews.filter(review => {
      const reviewDate = new Date(review.scheduledDate);
      return isSameDay(reviewDate, day);
    });
  };
  
  // Atualiza as informações do dia selecionado
  const updateSelectedDayInfo = (day: Date) => {
    setDayTopics(getTopicsForDay(day));
    setDayReviews(getReviewsForDay(day));
  };
  
  // Efeito para atualizar informações quando selecionar um novo dia
  useEffect(() => {
    updateSelectedDayInfo(selectedDate);
  }, [selectedDate, topics]);
  
  // Atualiza para usar a função de toggle
  const handleToggleReview = (reviewId: string) => {
    toggleReviewCompletion(reviewId); 
    // Força a atualização das revisões do dia selecionado para refletir a mudança no modal
    setDayReviews(prevReviews => 
      prevReviews.map(r => 
        r.id === reviewId ? { ...r, completed: !r.completed, date: !r.completed ? new Date() : r.scheduledDate } : r
      )
    );
  };

  // Manipula o clique em um dia
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    updateSelectedDayInfo(day);
    setShowDayDetails(true);
  };
  
  // Atualiza a lista de tópicos quando um novo é adicionado
  const handleTopicAdded = (topic: Topic) => {
    // Simplesmente adiciona o tópico ao estado local, sem recarregar depois
    setDayTopics(prev => [...prev, topic]);
  };
  
  // Verifica se tem tarefas para o dia selecionado
  const hasTasks = dayTopics.length > 0 || dayReviews.length > 0;
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
      <div className="flex items-center justify-between p-3 border-b dark:border-gray-700">
        <h2 className="text-base font-semibold dark:text-white">
          {format(currentMonth, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
        </h2>
        <div className="flex space-x-1">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronLeftIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
          <button
            onClick={goToToday}
            className="px-2 py-1 text-xs bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300 rounded-md hover:bg-primary-200 dark:hover:bg-primary-800"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>
      
      <div className="flex-grow">
        <div className="grid grid-cols-7 bg-gray-50 dark:bg-gray-900">
          {weekDays.map((day) => (
            <div key={day} className="p-1.5 text-center text-xs font-medium text-gray-700 dark:text-gray-300">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {daysInGrid.map((day, i) => {
            const dayTopicsForCell = getTopicsForDay(day);
            const dayReviewsForCell = getReviewsForDay(day);
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const hasEvents = dayTopicsForCell.length > 0 || dayReviewsForCell.length > 0;
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={i}
                onClick={() => handleDayClick(day)}
                className={`calendar-day dark:border-gray-700 
                  ${isSelected ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/30 dark:border-primary-800' : ''} 
                  ${hasEvents ? 'cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20' : 'dark:hover:bg-gray-800'}
                  ${isToday ? 'today-cell' : ''}
                `}
                style={{
                  position: 'relative',
                  minHeight: '64px',
                  overflow: 'hidden'
                }}
              >
                <div 
                  className={`calendar-day-header ${isToday ? 'font-bold text-primary-600 dark:text-primary-400' : ''}`}
                  style={{ 
                    color: isToday 
                      ? '' 
                      : isCurrentMonth 
                        ? darkMode ? 'white' : 'black' 
                        : darkMode ? '#6b7280' : '#d1d5db'
                  }}
                >
                  {format(day, 'd')}
                  {isToday && <div className="today-indicator"></div>}
                </div>
                
                <div className="calendar-day-content" style={{ 
                  maxHeight: 'calc(100% - 16px)',
                  overflow: 'hidden',
                  opacity: isCurrentMonth ? '1' : '0.6'
                }}>
                  {dayTopicsForCell.map((topic) => {
                    const subject = subjects.find((subj) => subj.id === topic.subjectId);
                    
                    // Aumentando a opacidade do fundo no modo escuro para melhorar o contraste
                    const backgroundColor = subject ? 
                      darkMode ? `${subject.color}50` : `${subject.color}30` 
                      : undefined;
                    
                    // Função para determinar se a cor de fundo é clara (e precisa de texto escuro)
                    const isLightColor = (color?: string) => {
                      if (!color) return true;
                      
                      // Remove o # se existir e converte para maiúsculas
                      const hex = color.replace('#', '').toUpperCase();
                      
                      // Converte hex para RGB
                      const r = parseInt(hex.substring(0, 2), 16);
                      const g = parseInt(hex.substring(2, 4), 16);
                      const b = parseInt(hex.substring(4, 6), 16);
                      
                      // Fórmula de luminosidade ajustada para melhor contraste
                      // Com limiares diferentes dependendo do tema
                      const threshold = darkMode ? 0.7 : 0.65;
                      return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > threshold;
                    };
                    
                    // Determinando cores do texto com base no modo do tema
                    // No modo claro, todas as letras serão pretas para melhor legibilidade
                    // No modo escuro, continuamos usando o algoritmo de luminosidade
                    const textColor = darkMode 
                      ? isLightColor(subject?.color) ? '#000000' : '#FFFFFF'
                      : '#000000'; // Sempre preto no modo claro
                    
                    return (
                      <div
                        key={topic.id}
                        className="calendar-day-topic"
                        style={{ 
                          backgroundColor, 
                          color: textColor,
                          fontWeight: 'medium',
                          borderLeft: subject ? `3px solid ${subject.color}` : undefined,
                          boxShadow: darkMode ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none',
                          width: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: '0.65rem',
                          marginBottom: '1px',
                          padding: '1px 2px'
                        }}
                      >
                        <span className="font-semibold">{subject?.name?.substring(0, 8)}:</span> {topic.title}
                      </div>
                    );
                  })}
                  
                  {dayReviewsForCell.map((review) => {
                    const isCompleted = review.completed;
                    const topic = topics.find((t) => t.id === review.topicId);
                    const subject = subjects.find((subj) => subj.id === topic?.subjectId);
                    
                    // Definir cores de fundo e texto com base no status e no tema
                    const backgroundColor = isCompleted 
                      ? darkMode ? 'rgba(22, 163, 74, 0.2)' : 'rgba(220, 252, 231, 0.8)' // Verde para completo
                      : darkMode ? 'rgba(202, 138, 4, 0.2)' : 'rgba(254, 249, 195, 0.8)'; // Amarelo para pendente
                    
                    const borderColor = isCompleted
                      ? darkMode ? 'rgba(22, 163, 74, 0.8)' : 'rgb(22, 163, 74)'  // Verde
                      : darkMode ? 'rgba(234, 179, 8, 0.8)' : 'rgb(234, 179, 8)'; // Amarelo
                    
                    return (
                      <div
                        key={review.id}
                        className="calendar-day-review"
                        style={{
                          backgroundColor,
                          borderLeft: `3px solid ${borderColor}`,
                          padding: '1px 2px',
                          marginTop: '1px',
                          borderRadius: '2px',
                          fontSize: '0.6rem',
                          lineHeight: '1rem',
                          color: darkMode ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.8)',
                          boxShadow: darkMode ? '0 0 0 1px rgba(255,255,255,0.1)' : 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                          display: 'block'
                        }}
                        title={`${subject?.name} - ${topic?.title}`}
                      >
                        <span className="font-semibold">Rev:</span> {subject?.name ? subject.name.substring(0, 4) : ""} - {topic?.title ? topic.title.substring(0, 4) : ""}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Resumo das tarefas do dia */}
      <div className="border-t dark:border-gray-700 p-2">
        <div className="flex items-center mb-2">
          <h3 className="font-medium dark:text-white text-sm">
            Tarefas para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
          </h3>
          <button
            onClick={() => setShowDayDetails(true)}
            className="ml-auto text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center"
          >
            <PlusIcon className="h-3 w-3 mr-1" />
            Adicionar
          </button>
        </div>
        
        {hasTasks ? (
          <div className="space-y-2">
            {/* Tópicos do dia */}
            {dayTopics.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tópicos:</h4>
                <div className="flex flex-wrap gap-1">
                  {dayTopics.map(topic => {
                    const subject = subjects.find(s => s.id === topic.subjectId);
                    return (
                      <div 
                        key={topic.id} 
                        className="inline-flex items-center py-0.5 px-1.5 rounded-md text-xs"
                        style={{ 
                          backgroundColor: subject ? `${subject.color}20` : undefined,
                          borderLeft: subject ? `2px solid ${subject.color}` : undefined
                        }}
                      >
                        <span className="font-medium mr-1">{subject?.name}:</span> {topic.title}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Revisões do dia */}
            {dayReviews.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Revisões:</h4>
                <div className="flex flex-wrap gap-1">
                  {dayReviews.map(review => {
                    const topic = topics.find(t => t.id === review.topicId);
                    const subject = subjects.find(s => s.id === topic?.subjectId);
                    const isCompleted = review.completed;
                    
                    return (
                      <div 
                        key={review.id} 
                        className={`inline-flex items-center py-0.5 px-1.5 rounded-md text-xs ${
                          isCompleted 
                            ? 'bg-green-50 dark:bg-green-900/30 border-l-2 border-green-500' 
                            : 'bg-yellow-50 dark:bg-yellow-900/30 border-l-2 border-yellow-500'
                        }`}
                      >
                        {subject && <span className="font-medium mr-1">{subject.name}:</span>}
                        <span className="truncate max-w-32">{topic?.title}</span>
                        {!isCompleted && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleReview(review.id);
                            }}
                            className="ml-1 text-xs bg-green-600 text-white px-1 py-0.5 rounded hover:bg-green-700"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-2 text-xs">
            Nenhuma tarefa para este dia. Clique em "Adicionar" para criar uma.
          </p>
        )}
      </div>

      {/* Modal de detalhes do dia */}
      {showDayDetails && (
        <DayDetails 
          date={selectedDate}
          topics={dayTopics}
          reviews={dayReviews}
          onClose={() => setShowDayDetails(false)}
          onCompleteReview={handleToggleReview}
          onTopicAdded={handleTopicAdded}
        />
      )}

      <style jsx>{`
        /* Estilo para células do calendário */
        .calendar-day {
          padding: 4px;
          border-bottom: 1px solid #e5e7eb;
          border-right: 1px solid #e5e7eb;
          transition: background-color 0.2s;
        }
        
        .calendar-day-header {
          font-size: 0.75rem;
          margin-bottom: 4px;
          position: relative;
          display: flex;
          align-items: center;
        }
        
        /* Estilos para destacar o dia atual */
        .today-cell {
          box-shadow: inset 0 0 0 2px ${darkMode ? '#a855f7' : '#8b5cf6'};
          background-color: ${darkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)'};
          position: relative;
          z-index: 1;
        }
        
        .today-cell::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 3px;
          background: linear-gradient(90deg, ${darkMode ? '#8b5cf680' : '#8b5cf6'}, ${darkMode ? '#a855f780' : '#a855f7'});
          z-index: 1;
        }
        
        .today-indicator {
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background-color: ${darkMode ? '#a855f7' : '#8b5cf6'};
          margin-left: 3px;
          display: inline-block;
          animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 ${darkMode ? 'rgba(168, 85, 247, 0.5)' : 'rgba(139, 92, 246, 0.5)'};
          }
          
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 3px ${darkMode ? 'rgba(168, 85, 247, 0)' : 'rgba(139, 92, 246, 0)'};
          }
          
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 ${darkMode ? 'rgba(168, 85, 247, 0)' : 'rgba(139, 92, 246, 0)'};
          }
        }
      `}</style>
    </div>
  );
} 