'use client';

import { useState, useEffect } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useSubjectStore } from '@/store/subjectStore';
import { useTopicStore } from '@/store/topicStore';
import { 
  BookmarkIcon,
  PlayIcon,
  PlusIcon,
  ClockIcon,
  BookOpenIcon,
  DocumentChartBarIcon,
  AcademicCapIcon,
  FireIcon,
  SparklesIcon,
  Cog6ToothIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface TemplateStep {
  type: 'pomodoro' | 'review' | 'simulate' | 'break';
  duration: number; // in minutes
  description: string;
  topicId?: string;
  subjectId?: string;
}

interface StudyTemplate {
  id: string;
  name: string;
  description: string;
  category: 'quick' | 'intensive' | 'review' | 'exam-prep' | 'custom';
  totalDuration: number;
  steps: TemplateStep[];
  icon: any;
  color: string;
  isBuiltIn: boolean;
  usageCount: number;
  lastUsed?: string;
}

interface StudyTemplatesProps {
  onStartTemplate?: (template: StudyTemplate, customizations?: any) => void;
  onCreateTemplate?: () => void;
}

const BUILT_IN_TEMPLATES: StudyTemplate[] = [
  {
    id: 'morning-boost',
    name: 'Manhã Produtiva',
    description: 'Rotina perfeita para começar o dia com foco máximo',
    category: 'quick',
    totalDuration: 90,
    steps: [
      { type: 'pomodoro', duration: 25, description: 'Sessão de foco - tópico prioritário' },
      { type: 'break', duration: 5, description: 'Pausa curta' },
      { type: 'review', duration: 15, description: 'Revisar conceitos anteriores' },
      { type: 'pomodoro', duration: 25, description: 'Segunda sessão de foco' },
      { type: 'break', duration: 5, description: 'Pausa curta' },
      { type: 'simulate', duration: 15, description: 'Teste rápido de conhecimento' },
    ],
    icon: SparklesIcon,
    color: 'bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border-orange-200 dark:border-orange-800',
    isBuiltIn: true,
    usageCount: 0,
  },
  {
    id: 'power-study',
    name: 'Estudo Intensivo',
    description: 'Para dias em que você quer mergulhar fundo no conteúdo',
    category: 'intensive',
    totalDuration: 150,
    steps: [
      { type: 'pomodoro', duration: 45, description: 'Sessão longa de estudo profundo' },
      { type: 'break', duration: 15, description: 'Pausa longa' },
      { type: 'pomodoro', duration: 45, description: 'Segunda sessão profunda' },
      { type: 'break', duration: 15, description: 'Pausa longa' },
      { type: 'simulate', duration: 30, description: 'Simulado completo' },
    ],
    icon: FireIcon,
    color: 'bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border-red-200 dark:border-red-800',
    isBuiltIn: true,
    usageCount: 0,
  },
  {
    id: 'review-master',
    name: 'Mestre das Revisões',
    description: 'Otimizado para dias focados em revisão espaçada',
    category: 'review',
    totalDuration: 60,
    steps: [
      { type: 'review', duration: 20, description: 'Revisão de tópicos antigos' },
      { type: 'break', duration: 5, description: 'Pausa curta' },
      { type: 'review', duration: 20, description: 'Revisão de tópicos recentes' },
      { type: 'break', duration: 5, description: 'Pausa curta' },
      { type: 'simulate', duration: 10, description: 'Teste de retenção' },
    ],
    icon: BookOpenIcon,
    color: 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800',
    isBuiltIn: true,
    usageCount: 0,
  },
  {
    id: 'exam-prep',
    name: 'Preparação para Prova',
    description: 'Simulação de ambiente de prova com timing real',
    category: 'exam-prep',
    totalDuration: 120,
    steps: [
      { type: 'pomodoro', duration: 30, description: 'Revisão geral rápida' },
      { type: 'break', duration: 10, description: 'Pausa de preparação' },
      { type: 'simulate', duration: 60, description: 'Simulado no tempo da prova' },
      { type: 'break', duration: 5, description: 'Análise de resultados' },
      { type: 'review', duration: 15, description: 'Revisar pontos fracos identificados' },
    ],
    icon: DocumentChartBarIcon,
    color: 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-purple-200 dark:border-purple-800',
    isBuiltIn: true,
    usageCount: 0,
  },
  {
    id: 'quick-boost',
    name: 'Impulso Rápido',
    description: 'Para quando você tem pouco tempo mas quer manter a consistência',
    category: 'quick',
    totalDuration: 30,
    steps: [
      { type: 'pomodoro', duration: 20, description: 'Sessão de foco concentrado' },
      { type: 'break', duration: 5, description: 'Pausa rápida' },
      { type: 'review', duration: 5, description: 'Revisão express' },
    ],
    icon: ClockIcon,
    color: 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800',
    isBuiltIn: true,
    usageCount: 0,
  },
];

export default function StudyTemplates({ onStartTemplate, onCreateTemplate }: StudyTemplatesProps) {
  const [templates, setTemplates] = useState<StudyTemplate[]>(BUILT_IN_TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<StudyTemplate | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { getTopicRecommendations } = useIntelligenceStore();
  const subjects = useSubjectStore((state) => state.subjects);
  const topics = useTopicStore((state) => state.topics);

  // Load custom templates from localStorage
  useEffect(() => {
    const savedTemplates = localStorage.getItem('custom-study-templates');
    if (savedTemplates) {
      const customTemplates = JSON.parse(savedTemplates);
      setTemplates([...BUILT_IN_TEMPLATES, ...customTemplates]);
    }
  }, []);

  const categories = [
    { id: 'all', label: 'Todos', icon: BookmarkIcon },
    { id: 'quick', label: 'Rápido', icon: ClockIcon },
    { id: 'intensive', label: 'Intensivo', icon: FireIcon },
    { id: 'review', label: 'Revisão', icon: BookOpenIcon },
    { id: 'exam-prep', label: 'Prova', icon: DocumentChartBarIcon },
    { id: 'custom', label: 'Personalizado', icon: Cog6ToothIcon },
  ];

  const filteredTemplates = activeCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === activeCategory);

  const handleStartTemplate = (template: StudyTemplate) => {
    // Update usage count
    const updatedTemplates = templates.map(t => 
      t.id === template.id 
        ? { ...t, usageCount: t.usageCount + 1, lastUsed: new Date().toISOString() }
        : t
    );
    setTemplates(updatedTemplates);
    
    // Save to localStorage if it's a custom template
    const customTemplates = updatedTemplates.filter(t => !t.isBuiltIn);
    if (customTemplates.length > 0) {
      localStorage.setItem('custom-study-templates', JSON.stringify(customTemplates));
    }

    // Call the callback
    onStartTemplate?.(template);
    setSelectedTemplate(null);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h${remainingMinutes > 0 ? ` ${remainingMinutes}min` : ''}`;
  };

  const getStepIcon = (type: string) => {
    switch (type) {
      case 'pomodoro': return BookOpenIcon;
      case 'review': return ClockIcon;
      case 'simulate': return DocumentChartBarIcon;
      case 'break': return SparklesIcon;
      default: return AcademicCapIcon;
    }
  };

  const getStepColor = (type: string) => {
    switch (type) {
      case 'pomodoro': return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30';
      case 'review': return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30';
      case 'simulate': return 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30';
      case 'break': return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30';
      default: return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/30';
    }
  };

  // Template details modal
  if (selectedTemplate) {
    const IconComponent = selectedTemplate.icon;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full max-h-[80vh] overflow-hidden">
          <div className={`p-4 ${selectedTemplate.color}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded-full">
                  <IconComponent className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedTemplate.name}</h3>
                  <p className="text-sm opacity-90">{selectedTemplate.description}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTemplate(null)}
                className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Duração total: <span className="font-medium">{formatDuration(selectedTemplate.totalDuration)}</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {selectedTemplate.steps.length} etapas
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {selectedTemplate.steps.map((step, index) => {
                const StepIcon = getStepIcon(step.type);
                const stepColor = getStepColor(step.type);
                
                return (
                  <div key={index} className="flex items-center space-x-3">
                    <div className="flex-shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 w-6">
                      {index + 1}
                    </div>
                    <div className={`p-2 rounded-full ${stepColor}`}>
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {step.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {step.duration} minutos
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => handleStartTemplate(selectedTemplate)}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <PlayIcon className="h-4 w-4" />
                <span>Começar Rotina</span>
              </button>
              <button
                onClick={() => {
                  setSelectedTemplate(null);
                  setShowCustomizeModal(true);
                }}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                <Cog6ToothIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BookmarkIcon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            📚 Templates de Estudo
          </h3>
        </div>
        <button
          onClick={onCreateTemplate}
          className="flex items-center space-x-1 px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
        >
          <PlusIcon className="h-3 w-3" />
          <span>Criar</span>
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex space-x-1 mb-4 overflow-x-auto">
        {categories.map((category) => {
          const CategoryIcon = category.icon;
          const isActive = activeCategory === category.id;
          
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`flex items-center space-x-1 px-3 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-slate-200 dark:bg-slate-600 text-slate-900 dark:text-slate-100'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <CategoryIcon className="h-3 w-3" />
              <span>{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredTemplates.map((template) => {
          const IconComponent = template.icon;
          
          return (
            <div
              key={template.id}
              onClick={() => setSelectedTemplate(template)}
              className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm ${template.color} hover:scale-[1.02]`}
            >
              <div className="flex items-start space-x-3 mb-3">
                <div className="p-2 bg-white/50 dark:bg-black/20 rounded-full">
                  <IconComponent className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold mb-1">{template.name}</h4>
                  <p className="text-xs opacity-90 line-clamp-2">{template.description}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {formatDuration(template.totalDuration)}
                </span>
                <div className="flex items-center space-x-2">
                  {template.usageCount > 0 && (
                    <span className="opacity-75">
                      {template.usageCount}× usado
                    </span>
                  )}
                  <span className="opacity-75">
                    {template.steps.length} etapas
                  </span>
                </div>
              </div>

              {/* Quick preview of steps */}
              <div className="flex space-x-1 mt-2">
                {template.steps.slice(0, 4).map((step, index) => {
                  const StepIcon = getStepIcon(step.type);
                  return (
                    <div key={index} className="p-1 bg-white/30 dark:bg-black/20 rounded">
                      <StepIcon className="h-2.5 w-2.5" />
                    </div>
                  );
                })}
                {template.steps.length > 4 && (
                  <div className="p-1 bg-white/30 dark:bg-black/20 rounded text-xs">
                    +{template.steps.length - 4}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-6 text-slate-600 dark:text-slate-400">
          <AcademicCapIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhum template encontrado nesta categoria</p>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-600 dark:text-slate-400 text-center">
          Escolha um template para começar uma sessão de estudo estruturada
        </p>
      </div>
    </div>
  );
} 