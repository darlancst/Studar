'use client';

import { useState, useEffect } from 'react';
import { useIntelligenceStore, TopicRecommendation } from '@/store/intelligenceStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { 
  AcademicCapIcon,
  BookOpenIcon,
  DocumentChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PlayCircleIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface SmartRecommendationsProps {
  onStartPomodoro?: (topicId: string) => void;
  onCreateSimulado?: (topicId: string) => void;
  onStartReview?: (topicId: string) => void;
  maxRecommendations?: number;
  showFullDetails?: boolean;
}

export default function SmartRecommendations({ 
  onStartPomodoro,
  onCreateSimulado,
  onStartReview,
  maxRecommendations = 3,
  showFullDetails = false
}: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<TopicRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);
  
  const { getTopicRecommendations, getNextBestAction, startStudySession } = useIntelligenceStore();

  // Refresh recommendations
  const refreshRecommendations = () => {
    setIsLoading(true);
    try {
      const newRecommendations = getTopicRecommendations();
      setRecommendations(newRecommendations.slice(0, maxRecommendations));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshRecommendations();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(refreshRecommendations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [maxRecommendations]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critica': return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'alta': return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
      case 'media': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'baixa': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critica': return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'alta': return <ClockIcon className="h-4 w-4" />;
      case 'media': return <LightBulbIcon className="h-4 w-4" />;
      case 'baixa': return <BookOpenIcon className="h-4 w-4" />;
      default: return <AcademicCapIcon className="h-4 w-4" />;
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'study': return <BookOpenIcon className="h-3 w-3" />;
      case 'review': return <ClockIcon className="h-3 w-3" />;
      case 'simulate': return <DocumentChartBarIcon className="h-3 w-3" />;
      default: return <AcademicCapIcon className="h-3 w-3" />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'study': return 'Estudar';
      case 'review': return 'Revisar';
      case 'simulate': return 'Simular';
      default: return action;
    }
  };

  const handleAction = (recommendation: TopicRecommendation, action: string) => {
    // Start study session tracking
    startStudySession(recommendation.topicId, 'pomodoro');

    switch (action) {
      case 'study':
        onStartPomodoro?.(recommendation.topicId);
        break;
      case 'review':
        onStartReview?.(recommendation.topicId);
        break;
      case 'simulate':
        onCreateSimulado?.(recommendation.topicId);
        break;
    }
  };

  const formatEstimatedTime = (minutes: number) => {
    if (minutes < 60) {
      return `~${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `~${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center space-x-2 mb-3">
          <LightBulbIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            🤖 Analisando seus dados...
          </h3>
        </div>
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-12 bg-white/50 dark:bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-center space-x-2 mb-2">
          <LightBulbIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
            🎉 Está tudo em dia!
          </h3>
        </div>
        <p className="text-xs text-green-600 dark:text-green-400">
          Você está acompanhando bem seus estudos. Continue assim!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <LightBulbIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300">
            🤖 Recomendações Inteligentes
          </h3>
        </div>
        <button
          onClick={refreshRecommendations}
          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-medium"
        >
          Atualizar
        </button>
      </div>

      <div className="space-y-3">
        {recommendations.map((rec, index) => {
          const isExpanded = expandedRec === rec.topicId;
          const urgencyClasses = getUrgencyColor(rec.urgency);
          const UrgencyIcon = () => getUrgencyIcon(rec.urgency);

          return (
            <div
              key={rec.topicId}
              className={`border rounded-lg p-3 transition-all ${urgencyClasses}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="flex items-center space-x-1">
                      <UrgencyIcon />
                      <span className="text-xs font-medium">
                        #{index + 1} - Prioridade {rec.priority}
                      </span>
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded-full">
                      {formatEstimatedTime(rec.estimatedTime)}
                    </span>
                  </div>

                  <div className="mb-2">
                    <h4 className="text-sm font-semibold truncate">
                      {rec.subjectName} - {rec.topicTitle}
                    </h4>
                    <p className="text-xs mt-1">{rec.reason}</p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-1">
                    {rec.actions.map((action) => (
                      <button
                        key={action}
                        onClick={() => handleAction(rec, action)}
                        className="flex items-center space-x-1 px-2 py-1 text-xs bg-white/70 dark:bg-black/30 hover:bg-white dark:hover:bg-black/40 rounded-md transition-colors"
                      >
                        {getActionIcon(action)}
                        <span>{getActionLabel(action)}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {showFullDetails && (
                  <button
                    onClick={() => setExpandedRec(isExpanded ? null : rec.topicId)}
                    className="ml-2 p-1 hover:bg-white/50 dark:hover:bg-black/20 rounded"
                  >
                    <ArrowRightIcon 
                      className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                    />
                  </button>
                )}
              </div>

              {/* Expanded Details */}
              {isExpanded && showFullDetails && (
                <div className="mt-3 pt-3 border-t border-white/30 dark:border-black/20">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="font-medium">Urgência:</span> {rec.urgency}
                    </div>
                    <div>
                      <span className="font-medium">Tempo estimado:</span> {formatEstimatedTime(rec.estimatedTime)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {recommendations.length === maxRecommendations && (
        <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
          <p className="text-xs text-indigo-600 dark:text-indigo-400 text-center">
            Mostrando top {maxRecommendations} recomendações
          </p>
        </div>
      )}
    </div>
  );
} 