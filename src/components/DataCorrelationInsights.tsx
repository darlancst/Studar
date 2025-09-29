'use client';

import { useState, useEffect, useMemo } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useTopicStore } from '@/store/topicStore';
import { useSubjectStore } from '@/store/subjectStore';
import { 
  ChartBarIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  SparklesIcon,
  EyeIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { format, getDay, getHours, differenceInDays, isWithinInterval, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';

interface Correlation {
  id: string;
  type: 'performance' | 'timing' | 'pattern' | 'prediction';
  title: string;
  description: string;
  strength: 'weak' | 'moderate' | 'strong';
  confidence: number; // 0-100
  icon: any;
  color: string;
  actionable: boolean;
  recommendation?: string;
  data?: any;
}

interface DataCorrelationInsightsProps {
  onShowDetails?: (correlation: Correlation) => void;
  maxInsights?: number;
}

export default function DataCorrelationInsights({ 
  onShowDetails, 
  maxInsights = 4 
}: DataCorrelationInsightsProps) {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  const simulados = useSimuladosStore((state) => state.simulados);
  const pomodoroSessions = usePomodoroStore((state) => state.sessions);
  const topics = useTopicStore((state) => state.topics);
  const subjects = useSubjectStore((state) => state.subjects);
  const { userPatterns } = useIntelligenceStore();

  const analyzeCorrelations = () => {
    setIsAnalyzing(true);
    const foundCorrelations: Correlation[] = [];

    try {
      // 1. Time of Day vs Performance Correlation
      if (simulados.length >= 5) {
        const timePerformanceMap = new Map<number, number[]>();
        
        simulados.forEach(simulado => {
          const hour = new Date(simulado.date).getHours();
          const performance = (simulado.hits / simulado.questions) * 100;
          
          if (!timePerformanceMap.has(hour)) {
            timePerformanceMap.set(hour, []);
          }
          timePerformanceMap.get(hour)!.push(performance);
        });

        // Find best performing hours
        let bestHour = -1;
        let bestAvg = 0;
        let worstHour = -1;
        let worstAvg = 100;

        timePerformanceMap.forEach((performances, hour) => {
          const avg = performances.reduce((a, b) => a + b, 0) / performances.length;
          if (avg > bestAvg && performances.length >= 2) {
            bestAvg = avg;
            bestHour = hour;
          }
          if (avg < worstAvg && performances.length >= 2) {
            worstAvg = avg;
            worstHour = hour;
          }
        });

        if (bestHour !== -1 && Math.abs(bestAvg - worstAvg) > 15) {
          foundCorrelations.push({
            id: 'time-performance',
            type: 'performance',
            title: '⏰ Horário Ideal Identificado',
            description: `Você tem ${bestAvg.toFixed(0)}% de acerto às ${bestHour}h vs ${worstAvg.toFixed(0)}% às ${worstHour}h`,
            strength: Math.abs(bestAvg - worstAvg) > 25 ? 'strong' : 'moderate',
            confidence: Math.min(95, Math.round((Math.abs(bestAvg - worstAvg) / 40) * 100)),
            icon: ClockIcon,
            color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
            actionable: true,
            recommendation: `Programe seus simulados mais importantes entre ${bestHour-1}h e ${bestHour+1}h`,
            data: { bestHour, bestAvg, worstHour, worstAvg }
          });
        }
      }

      // 2. Study Time vs Performance Correlation  
      if (simulados.length >= 3) {
        const studyPerformanceData: Array<{study: number, performance: number, topicId: string}> = [];
        
        simulados.forEach(simulado => {
          if (!simulado.topicId) return;
          
          // Get study time in the 7 days before the simulado
          const simuladoDate = new Date(simulado.date);
          const weekBefore = subDays(simuladoDate, 7);
          
          const studyTime = pomodoroSessions
            .filter(session => 
              session.topicId === simulado.topicId &&
              isWithinInterval(new Date(session.date), { start: weekBefore, end: simuladoDate })
            )
            .reduce((total, session) => total + session.duration, 0);

          const performance = (simulado.hits / simulado.questions) * 100;
          
          if (studyTime > 0) {
            studyPerformanceData.push({
              study: studyTime,
              performance,
              topicId: simulado.topicId
            });
          }
        });

        if (studyPerformanceData.length >= 3) {
          // Calculate correlation coefficient (simplified)
          const avgStudy = studyPerformanceData.reduce((a, b) => a + b.study, 0) / studyPerformanceData.length;
          const avgPerf = studyPerformanceData.reduce((a, b) => a + b.performance, 0) / studyPerformanceData.length;
          
          let correlation = 0;
          let numerator = 0;
          let denominator1 = 0;
          let denominator2 = 0;

          studyPerformanceData.forEach(item => {
            const studyDiff = item.study - avgStudy;
            const perfDiff = item.performance - avgPerf;
            
            numerator += studyDiff * perfDiff;
            denominator1 += studyDiff * studyDiff;
            denominator2 += perfDiff * perfDiff;
          });

          if (denominator1 > 0 && denominator2 > 0) {
            correlation = numerator / Math.sqrt(denominator1 * denominator2);
          }

          if (Math.abs(correlation) > 0.3) {
            const isPositive = correlation > 0;
            foundCorrelations.push({
              id: 'study-performance',
              type: 'pattern',
              title: isPositive ? '📈 Mais Estudo = Melhor Performance' : '📉 Padrão Inesperado',
              description: isPositive 
                ? `Correlação de ${(correlation * 100).toFixed(0)}% entre tempo de estudo e performance em simulados`
                : `Correlação negativa detectada: pode estar estudando demais sem consolidar`,
              strength: Math.abs(correlation) > 0.6 ? 'strong' : Math.abs(correlation) > 0.4 ? 'moderate' : 'weak',
              confidence: Math.round(Math.abs(correlation) * 100),
              icon: isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon,
              color: isPositive 
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300',
              actionable: true,
              recommendation: isPositive 
                ? `Mantenha ~${Math.round(avgStudy)} minutos de estudo por semana antes dos simulados`
                : 'Foque na qualidade do estudo, não apenas quantidade. Faça mais pausas.',
              data: { correlation, avgStudy, avgPerf }
            });
          }
        }
      }

      // 3. Day of Week Performance Pattern
      if (simulados.length >= 7) {
        const dayPerformanceMap = new Map<number, number[]>();
        
        simulados.forEach(simulado => {
          const dayOfWeek = getDay(new Date(simulado.date));
          const performance = (simulado.hits / simulado.questions) * 100;
          
          if (!dayPerformanceMap.has(dayOfWeek)) {
            dayPerformanceMap.set(dayOfWeek, []);
          }
          dayPerformanceMap.get(dayOfWeek)!.push(performance);
        });

        const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        let bestDay = -1;
        let bestDayAvg = 0;

        dayPerformanceMap.forEach((performances, day) => {
          if (performances.length >= 2) {
            const avg = performances.reduce((a, b) => a + b, 0) / performances.length;
            if (avg > bestDayAvg) {
              bestDayAvg = avg;
              bestDay = day;
            }
          }
        });

        if (bestDay !== -1 && bestDayAvg > 70) {
          foundCorrelations.push({
            id: 'day-performance',
            type: 'timing',
            title: `🗓️ ${dayNames[bestDay]} é seu dia de ouro`,
            description: `Performance média de ${bestDayAvg.toFixed(0)}% nas ${dayNames[bestDay]}s`,
            strength: bestDayAvg > 85 ? 'strong' : 'moderate',
            confidence: Math.round((bestDayAvg / 100) * 100),
            icon: SparklesIcon,
            color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300',
            actionable: true,
            recommendation: `Programe seus simulados mais importantes para ${dayNames[bestDay]}s`,
            data: { bestDay, bestDayAvg, dayName: dayNames[bestDay] }
          });
        }
      }

      // 4. Subject Difficulty Prediction
      if (subjects.length >= 2 && simulados.length >= 6) {
        const subjectPerformance = subjects.map(subject => {
          const subjectSimulados = simulados.filter(s => s.subjectId === subject.id);
          if (subjectSimulados.length < 2) return null;

          const avgPerformance = subjectSimulados.reduce((acc, s) => 
            acc + (s.hits / s.questions * 100), 0
          ) / subjectSimulados.length;

          // Calculate trend (recent vs old performance)
          const sortedSimulados = subjectSimulados
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          const oldHalf = sortedSimulados.slice(0, Math.floor(sortedSimulados.length / 2));
          const newHalf = sortedSimulados.slice(Math.floor(sortedSimulados.length / 2));
          
          const oldAvg = oldHalf.reduce((acc, s) => acc + (s.hits / s.questions * 100), 0) / oldHalf.length;
          const newAvg = newHalf.reduce((acc, s) => acc + (s.hits / s.questions * 100), 0) / newHalf.length;
          
          return {
            subject,
            avgPerformance,
            trend: newAvg - oldAvg,
            simuladoCount: subjectSimulados.length
          };
        }).filter(Boolean);

        // Find declining subject
        const decliningSubject = subjectPerformance
          .filter(sp => sp!.trend < -10 && sp!.simuladoCount >= 3)
          .sort((a, b) => a!.trend - b!.trend)[0];

        if (decliningSubject) {
          foundCorrelations.push({
            id: 'subject-decline',
            type: 'prediction',
            title: '⚠️ Alerta de Declínio',
            description: `${decliningSubject.subject.name}: queda de ${Math.abs(decliningSubject.trend).toFixed(0)} pontos percentuais`,
            strength: Math.abs(decliningSubject.trend) > 20 ? 'strong' : 'moderate',
            confidence: Math.min(90, Math.round(Math.abs(decliningSubject.trend) * 2)),
            icon: ArrowTrendingDownIcon,
            color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300',
            actionable: true,
            recommendation: `Dedique mais tempo estudando ${decliningSubject.subject.name} nos próximos dias`,
            data: decliningSubject
          });
        }
      }

      // 5. Session Length vs Retention (Advanced)
      if (pomodoroSessions.length >= 10) {
        // Group sessions by length ranges
        const shortSessions = pomodoroSessions.filter(s => s.duration <= 20);
        const mediumSessions = pomodoroSessions.filter(s => s.duration > 20 && s.duration <= 35);
        const longSessions = pomodoroSessions.filter(s => s.duration > 35);

        if (shortSessions.length >= 2 && longSessions.length >= 2) {
          // This is a simplified analysis - in reality you'd need retention tests
          const userFeedback = userPatterns.averageSessionLength;
          
          if (userFeedback > 30) {
            foundCorrelations.push({
              id: 'session-length',
              type: 'pattern',
              title: '⏱️ Sessões Longas Preferidas',
              description: `Sua média de ${userFeedback.toFixed(0)} min/sessão indica preferência por foco prolongado`,
              strength: 'moderate',
              confidence: 75,
              icon: ClockIcon,
              color: 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
              actionable: true,
              recommendation: 'Continue com sessões longas, mas faça pausas de 15 min a cada 45 min',
              data: { averageLength: userFeedback }
            });
          }
        }
      }

      // Sort by strength and confidence
      const sortedCorrelations = foundCorrelations
        .sort((a, b) => {
          const strengthScore = { strong: 3, moderate: 2, weak: 1 };
          const aScore = strengthScore[a.strength] * (a.confidence / 100);
          const bScore = strengthScore[b.strength] * (b.confidence / 100);
          return bScore - aScore;
        })
        .slice(0, maxInsights);

      setCorrelations(sortedCorrelations);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Run analysis after component mounts and when data changes
    const timeout = setTimeout(analyzeCorrelations, 1000);
    return () => clearTimeout(timeout);
  }, [simulados, pomodoroSessions, maxInsights]);

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'strong': return 'text-green-600 dark:text-green-400';
      case 'moderate': return 'text-yellow-600 dark:text-yellow-400';
      case 'weak': return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (isAnalyzing) {
    return (
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
        <div className="flex items-center space-x-2 mb-3">
          <ChartBarIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
            🔍 Analisando Correlações
          </h3>
        </div>
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-16 bg-white/50 dark:bg-gray-700/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (correlations.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2 mb-2">
          <LightBulbIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            🔍 Insights de Correlação
          </h3>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Continue usando o app para gerar insights baseados em seus dados de estudo!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ChartBarIcon className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          <h3 className="text-sm font-semibold text-cyan-700 dark:text-cyan-300">
            🔍 Insights de Correlação
          </h3>
        </div>
        <span className="text-xs text-cyan-600 dark:text-cyan-400 bg-cyan-100 dark:bg-cyan-800/50 px-2 py-1 rounded-full">
          {correlations.length} encontrado{correlations.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-3">
        {correlations.map((correlation) => {
          const IconComponent = correlation.icon;
          
          return (
            <div
              key={correlation.id}
              className={`border rounded-lg p-3 transition-all hover:shadow-sm cursor-pointer ${correlation.color}`}
              onClick={() => onShowDetails?.(correlation)}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  <IconComponent className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold truncate">
                      {correlation.title}
                    </h4>
                    <div className="flex items-center space-x-1 text-xs">
                      <span className={getStrengthColor(correlation.strength)}>
                        {correlation.confidence}%
                      </span>
                      <EyeIcon className="h-3 w-3 opacity-50" />
                    </div>
                  </div>
                  
                  <p className="text-xs opacity-90 mb-2">
                    {correlation.description}
                  </p>
                  
                  {correlation.actionable && correlation.recommendation && (
                    <div className="flex items-center space-x-1 text-xs font-medium">
                      <LightBulbIcon className="h-3 w-3" />
                      <span className="truncate">{correlation.recommendation}</span>
                      <ArrowRightIcon className="h-3 w-3 flex-shrink-0" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-cyan-200 dark:border-cyan-700">
        <p className="text-xs text-cyan-600 dark:text-cyan-400 text-center">
          Correlações baseadas em {simulados.length} simulado{simulados.length !== 1 ? 's' : ''} 
          e {pomodoroSessions.length} sessão{pomodoroSessions.length !== 1 ? 'ões' : ''} de estudo
        </p>
      </div>
    </div>
  );
} 