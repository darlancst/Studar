'use client';

import { useState, useEffect } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { 
  PlayCircleIcon,
  BoltIcon,
  ArrowRightIcon,
  ClockIcon,
  BookOpenIcon,
  DocumentChartBarIcon,
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

interface AutoPilotModeProps {
  onNavigate?: (tab: string, data?: any) => void;
}

export default function AutoPilotMode({ onNavigate }: AutoPilotModeProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sessionPlan, setSessionPlan] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { getNextBestAction, startStudySession } = useIntelligenceStore();
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);

  const generateStudyPlan = () => {
    setIsLoading(true);
    
    try {
      const recommendation = getNextBestAction();
      
      if (!recommendation) {
        setSessionPlan([]);
        setIsLoading(false);
        return;
      }

      const subject = subjects.find(s => s.id === topics.find(t => t.id === recommendation.topicId)?.subjectId);
      
      // Create a smart study plan based on the recommendation
      const plan = [];
      
      // Always start with study if it's in actions
      if (recommendation.actions.includes('study')) {
        plan.push({
          type: 'pomodoro',
          title: 'Sessão de Foco',
          description: `Estudar ${recommendation.topicTitle}`,
          duration: Math.min(recommendation.estimatedTime, 25),
          topicId: recommendation.topicId,
          subjectName: subject?.name || '',
          icon: BookOpenIcon,
          priority: recommendation.priority,
        });
      }

      // Add review if needed
      if (recommendation.actions.includes('review')) {
        plan.push({
          type: 'review',
          title: 'Revisão',
          description: `Revisar conceitos de ${recommendation.topicTitle}`,
          duration: 10,
          topicId: recommendation.topicId,
          subjectName: subject?.name || '',
          icon: ClockIcon,
          priority: recommendation.priority,
        });
      }

      // Add simulation if performance needs testing
      if (recommendation.actions.includes('simulate')) {
        plan.push({
          type: 'simulate',
          title: 'Teste de Conhecimento',
          description: `Simulado de ${recommendation.topicTitle}`,
          duration: 15,
          topicId: recommendation.topicId,
          subjectName: subject?.name || '',
          icon: DocumentChartBarIcon,
          priority: recommendation.priority,
        });
      }

      setSessionPlan(plan);
      setCurrentStep(0);
    } finally {
      setIsLoading(false);
    }
  };

  const startAutoPilot = () => {
    generateStudyPlan();
    setIsActive(true);
  };

  const stopAutoPilot = () => {
    setIsActive(false);
    setCurrentStep(0);
    setSessionPlan([]);
  };

  const executeCurrentStep = () => {
    const step = sessionPlan[currentStep];
    if (!step) return;

    // Track session start
    startStudySession(step.topicId, step.type === 'pomodoro' ? 'pomodoro' : 'free_study');

    // Navigate to appropriate tab based on step type
    switch (step.type) {
      case 'pomodoro':
        onNavigate?.('pomodoro', { topicId: step.topicId });
        break;
      case 'review':
        onNavigate?.('calendar', { topicId: step.topicId, action: 'review' });
        break;
      case 'simulate':
        onNavigate?.('simulados', { action: 'create-simulado', topicId: step.topicId });
        break;
    }
  };

  const nextStep = () => {
    if (currentStep < sessionPlan.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Session complete
      setIsActive(false);
      setCurrentStep(0);
      
      // Show completion message or generate new plan
      setTimeout(() => {
        generateStudyPlan(); // Auto-generate next session
      }, 2000);
    }
  };

  const getTotalDuration = () => {
    return sessionPlan.reduce((total, step) => total + step.duration, 0);
  };

  if (!isActive) {
    return (
      <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <BoltIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
              ⚡ Modo Auto-Pilot
            </h3>
          </div>
          <SparklesIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </div>

        <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-4">
          Deixe a IA planejar sua próxima sessão de estudos baseada nos seus dados e performance.
        </p>

        <button
          onClick={startAutoPilot}
          disabled={isLoading}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <PlayCircleIcon className="h-5 w-5" />
          <span className="font-medium">
            {isLoading ? 'Analisando...' : 'Iniciar Sessão de Estudo'}
          </span>
        </button>
      </div>
    );
  }

  if (sessionPlan.length === 0) {
    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            <h3 className="text-sm font-semibold text-green-700 dark:text-green-300">
              🎉 Nada urgente encontrado!
            </h3>
          </div>
          <button
            onClick={stopAutoPilot}
            className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-200"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-green-600 dark:text-green-400">
          Seus estudos estão organizados. Continue assim!
        </p>
      </div>
    );
  }

  const currentStepData = sessionPlan[currentStep];
  const StepIcon = currentStepData?.icon || BookOpenIcon;
  const progress = ((currentStep + 1) / sessionPlan.length) * 100;

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 dark:from-emerald-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <BoltIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
            ⚡ Sessão Auto-Pilot Ativa
          </h3>
        </div>
        <button
          onClick={stopAutoPilot}
          className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200"
          title="Parar Auto-Pilot"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 mb-1">
          <span>Progresso da Sessão</span>
          <span>{currentStep + 1}/{sessionPlan.length}</span>
        </div>
        <div className="w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-2">
          <div 
            className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="bg-white/50 dark:bg-black/20 rounded-lg p-3 mb-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 p-2 bg-emerald-100 dark:bg-emerald-800/50 rounded-full">
            <StepIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                {currentStepData.title}
              </h4>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-800/50 px-2 py-0.5 rounded-full">
                ~{currentStepData.duration}min
              </span>
            </div>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mb-2">
              {currentStepData.description}
            </p>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {currentStepData.subjectName}
              </span>
              <span className="text-xs text-emerald-500 dark:text-emerald-400">
                • Prioridade {currentStepData.priority}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <button
          onClick={executeCurrentStep}
          className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-lg transition-colors"
        >
          <PlayCircleIcon className="h-4 w-4" />
          <span className="text-sm font-medium">Começar</span>
        </button>
        <button
          onClick={nextStep}
          className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-800 dark:hover:bg-emerald-700 text-emerald-700 dark:text-emerald-300 rounded-lg transition-colors"
        >
          <ArrowRightIcon className="h-4 w-4" />
        </button>
      </div>

      {/* Session Overview */}
      <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
        <div className="flex items-center justify-between text-xs">
          <span className="text-emerald-600 dark:text-emerald-400">
            Duração total estimada: ~{getTotalDuration()}min
          </span>
          <span className="text-emerald-600 dark:text-emerald-400">
            {sessionPlan.length} etapas
          </span>
        </div>
      </div>
    </div>
  );
} 