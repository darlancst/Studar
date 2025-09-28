'use client';

import { useState, useRef, useEffect } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useReviewStore } from '@/store/reviewStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { useSettingsStore } from '@/store/settingsStore';
import { 
  ChatBubbleLeftIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  UserCircleIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { format, differenceInDays, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';

interface ChatMessage {
  id: string;
  type: 'user' | 'buddy';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface StudyBuddyChatProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export default function StudyBuddyChat({ 
  isMinimized = false, 
  onToggleMinimize 
}: StudyBuddyChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Store hooks
  const simulados = useSimuladosStore((state) => state.simulados);
  const pomodoroSessions = usePomodoroStore((state) => state.sessions);
  const reviews = useReviewStore((state) => state.reviews);
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);
  const { weeklyGoal } = useSettingsStore();
  const { userPatterns, getTopicRecommendations } = useIntelligenceStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        type: 'buddy',
        content: '👋 Oi! Sou seu Study Buddy! Posso responder perguntas sobre seus estudos, como:\n\n• "Quanto tempo falta para minha meta semanal?"\n• "Qual minha matéria mais fraca?"\n• "Como está minha consistência?"',
        timestamp: new Date(),
        suggestions: [
          'Quanto tempo estudei hoje?',
          'Qual minha performance geral?',
          'Tenho revisões pendentes?',
          'Me sugira um plano de estudo'
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen]);

  const analyzeQuery = (query: string): ChatMessage => {
    const lowerQuery = query.toLowerCase();
    let response = '';
    let suggestions: string[] = [];

    try {
      // Calculate common metrics
      const today = new Date();
      const todaySessions = pomodoroSessions.filter(s => isToday(new Date(s.date)));
      const todayMinutes = todaySessions.reduce((acc, s) => acc + s.duration, 0);
      
      const weekSessions = pomodoroSessions.filter(s => {
        const sessionDate = new Date(s.date);
        return differenceInDays(today, sessionDate) <= 7;
      });
      const weekMinutes = weekSessions.reduce((acc, s) => acc + s.duration, 0);
      
      const totalMinutes = pomodoroSessions.reduce((acc, s) => acc + s.duration, 0);
      const averagePerformance = simulados.length > 0 
        ? simulados.reduce((acc, s) => acc + (s.hits / s.questions * 100), 0) / simulados.length
        : 0;

      const pendingReviews = reviews.filter(r => !r.completed && new Date(r.scheduledDate) <= today);
      const recommendations = getTopicRecommendations();

      // Query analysis
      if (lowerQuery.includes('tempo') && (lowerQuery.includes('hoje') || lowerQuery.includes('estudei'))) {
        if (todayMinutes > 0) {
          response = `📚 Hoje você estudou ${todayMinutes} minutos!${todayMinutes >= 120 ? ' Excelente dedicação!' : todayMinutes >= 60 ? ' Bom ritmo!' : ' Que tal mais uma sessão?'}`;
        } else {
          response = '🤔 Você ainda não estudou hoje. Que tal começar agora? Posso sugerir um tópico!';
        }
        suggestions = ['Qual tópico devo estudar?', 'Como está minha meta semanal?', 'Quando foi meu último estudo?'];
      }
      
      else if (lowerQuery.includes('meta') && lowerQuery.includes('semanal')) {
        const progress = (weekMinutes / weeklyGoal) * 100;
        const remaining = Math.max(0, weeklyGoal - weekMinutes);
        
        if (progress >= 100) {
          response = `🎉 Parabéns! Você já atingiu ${progress.toFixed(0)}% da sua meta semanal (${weekMinutes}/${weeklyGoal} min)!`;
        } else {
          response = `🎯 Você está em ${progress.toFixed(0)}% da sua meta semanal. Faltam ${remaining} minutos para completar!`;
        }
        suggestions = ['Como posso otimizar meu tempo?', 'Qual meu ritmo de estudo?', 'Me sugira uma sessão'];
      }
      
      else if (lowerQuery.includes('performance') || lowerQuery.includes('desempenho')) {
        if (simulados.length > 0) {
          const lastSimulados = simulados.slice(-3);
          const recentAvg = lastSimulados.reduce((acc, s) => acc + (s.hits / s.questions * 100), 0) / lastSimulados.length;
          
          response = `📊 Sua performance geral é ${averagePerformance.toFixed(1)}%.\n\nÚltimos simulados: ${recentAvg.toFixed(1)}% de média.${recentAvg > averagePerformance ? ' 📈 Melhorando!' : recentAvg < averagePerformance ? ' 📉 Atenção!' : ' 📊 Estável.'}`;
        } else {
          response = '📊 Você ainda não fez simulados. Que tal começar testando seus conhecimentos?';
        }
        suggestions = ['Qual minha matéria mais fraca?', 'Como melhorar minha performance?', 'Preciso revisar algo?'];
      }
      
      else if (lowerQuery.includes('matéria') && (lowerQuery.includes('fraca') || lowerQuery.includes('pior'))) {
        if (simulados.length >= 3) {
          const subjectPerformance = subjects.map(subject => {
            const subjectSimulados = simulados.filter(s => s.subjectId === subject.id);
            if (subjectSimulados.length < 2) return null;
            
            const avg = subjectSimulados.reduce((acc, s) => acc + (s.hits / s.questions * 100), 0) / subjectSimulados.length;
            return { subject: subject.name, avg, count: subjectSimulados.length };
          }).filter(Boolean);
          
          if (subjectPerformance.length > 0) {
            const weakest = subjectPerformance.sort((a, b) => a!.avg - b!.avg)[0]!;
            response = `📉 Sua matéria com menor performance é ${weakest.subject} (${weakest.avg.toFixed(1)}% em ${weakest.count} simulados). Vamos focar nela?`;
            suggestions = [`Estudar ${weakest.subject}`, 'Como melhorar nesta matéria?', 'Me sugira um plano'];
          } else {
            response = '🤔 Preciso de mais dados para analisar. Que tal fazer mais simulados?';
          }
        } else {
          response = '📊 Faça mais simulados para eu identificar seus pontos fracos!';
        }
      }
      
      else if (lowerQuery.includes('revisão') || lowerQuery.includes('revisar')) {
        if (pendingReviews.length > 0) {
          const overdueReviews = pendingReviews.filter(r => differenceInDays(today, new Date(r.scheduledDate)) > 0);
          
          if (overdueReviews.length > 0) {
            response = `⚠️ Você tem ${overdueReviews.length} revisão(ões) atrasada(s) e ${pendingReviews.length - overdueReviews.length} para hoje. Priorize as atrasadas!`;
          } else {
            response = `📋 Você tem ${pendingReviews.length} revisão(ões) programada(s) para hoje. Está na hora!`;
          }
          suggestions = ['Ir para revisões', 'Qual tópico revisar primeiro?', 'Como organizar minhas revisões?'];
        } else {
          response = '✅ Parabéns! Você está em dia com suas revisões!';
          suggestions = ['O que devo estudar agora?', 'Como está minha consistência?', 'Me sugira um simulado'];
        }
      }
      
      else if (lowerQuery.includes('consistência') || lowerQuery.includes('streak')) {
        const streak = userPatterns.consistencyStreak;
        if (streak >= 7) {
          response = `🔥 Incrível! Você tem um streak de ${streak} dias consecutivos! Continue assim para formar um hábito sólido.`;
        } else if (streak >= 3) {
          response = `👍 Bom! Você estudou ${streak} dias seguidos. Mais ${7 - streak} dias para uma semana completa!`;
        } else if (streak >= 1) {
          response = `🌱 Você começou bem com ${streak} dia(s). A consistência é mais importante que a intensidade!`;
        } else {
          response = '🆕 Vamos começar a construir sua consistência? Mesmo 15 minutos hoje já fazem diferença!';
        }
        suggestions = ['Como manter consistência?', 'Qual o melhor horário para estudar?', 'Me sugira uma sessão curta'];
      }
      
      else if (lowerQuery.includes('plano') || lowerQuery.includes('sugest')) {
        if (recommendations.length > 0) {
          const topRec = recommendations[0];
          response = `💡 Baseado nos seus dados, sugiro:\n\n🎯 **${topRec.topicTitle}** (${topRec.subjectName})\n📊 Prioridade: ${topRec.priority}\n⏱️ Tempo estimado: ~${topRec.estimatedTime}min\n💬 Motivo: ${topRec.reason}`;
          suggestions = ['Começar agora', 'Outra sugestão', 'Fazer um simulado', 'Ver todas as recomendações'];
        } else {
          response = '🤔 Seus estudos estão organizados! Que tal manter a rotina ou explorar novos tópicos?';
          suggestions = ['Criar novo tópico', 'Fazer simulado', 'Revisar conceitos', 'Verificar meta semanal'];
        }
      }
      
      else if (lowerQuery.includes('quando') || lowerQuery.includes('último')) {
        const lastSession = pomodoroSessions
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (lastSession) {
          const daysSince = differenceInDays(today, new Date(lastSession.date));
          if (daysSince === 0) {
            response = `📚 Seu último estudo foi hoje! Você estudou ${lastSession.duration} minutos.`;
          } else {
            response = `📅 Seu último estudo foi há ${daysSince} dia(s). Que tal retomar hoje?`;
          }
          suggestions = ['Continuar estudando', 'Ver progresso da semana', 'Qual tópico estudar?'];
        } else {
          response = '🆕 Este é o início da sua jornada! Vamos começar com uma primeira sessão?';
        }
      }
      
      else if (lowerQuery.includes('melhor') && lowerQuery.includes('horário')) {
        const bestHours = userPatterns.bestStudyHours.slice(0, 3);
        if (bestHours.length > 0) {
          response = `⏰ Seus melhores horários de estudo são: ${bestHours.map(h => `${h}h`).join(', ')}.\n\nBasei isso no seu histórico de sessões!`;
        } else {
          response = '📊 Ainda estou aprendendo seus padrões. Continue estudando para identificar seus horários mais produtivos!';
        }
        suggestions = ['Estudar agora', 'Como otimizar meu tempo?', 'Ver minha rotina'];
      }
      
      else {
        // Generic helpful response
        response = `🤔 Interessante pergunta! Posso te ajudar com informações sobre:\n\n📊 Suas estatísticas e performance\n⏰ Tempo estudado e metas\n📋 Revisões e cronograma\n💡 Sugestões personalizadas\n\nO que gostaria de saber?`;
        suggestions = [
          'Quanto tempo estudei esta semana?',
          'Qual minha performance geral?',
          'Tenho revisões pendentes?',
          'Me sugira o que estudar'
        ];
      }

    } catch (error) {
      response = '😅 Ops! Tive um problema processando sua pergunta. Pode tentar novamente?';
      suggestions = ['Como está minha meta?', 'O que devo estudar?', 'Verificar revisões'];
    }

    return {
      id: `buddy-${Date.now()}`,
      type: 'buddy',
      content: response,
      timestamp: new Date(),
      suggestions
    };
  };

  const sendMessage = () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay and generate response
    setTimeout(() => {
      const buddyResponse = analyzeQuery(userMessage.content);
      setMessages(prev => [...prev, buddyResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setTimeout(() => sendMessage(), 100);
  };

  const formatTime = (date: Date) => format(date, 'HH:mm');

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 p-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-full shadow-lg transition-all hover:scale-110 z-50"
      >
        <ChatBubbleLeftIcon className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl transition-all z-50 ${
      isMinimized ? 'h-14' : 'h-96'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-t-xl">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-200">Study Buddy</h3>
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={onToggleMinimize}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {isMinimized ? 
              <ChevronUpIcon className="h-4 w-4" /> : 
              <ChevronDownIcon className="h-4 w-4" />
            }
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 h-64">
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white rounded-l-xl rounded-tr-xl' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-r-xl rounded-tl-xl'
                } px-3 py-2`}>
                  <div className="flex items-start space-x-2">
                    {message.type === 'buddy' && (
                      <SparklesIcon className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-r-xl rounded-tl-xl px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <SparklesIcon className="h-4 w-4" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t dark:border-gray-700">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Pergunte sobre seus estudos..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                disabled={isTyping}
              />
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isTyping}
                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 