'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useIntelligenceStore } from '@/store/intelligenceStore';
import { useSimuladosStore } from '@/store/simuladosStore';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

type InterfaceMode = 'student' | 'competitor' | 'casual' | 'professional';
type LayoutDensity = 'compact' | 'comfortable' | 'spacious';
type ColorScheme = 'default' | 'focused' | 'energetic' | 'calm';

interface AdaptationSettings {
  interfaceMode: InterfaceMode;
  layoutDensity: LayoutDensity;
  colorScheme: ColorScheme;
  showAdvancedFeatures: boolean;
  preferredDashboardLayout: 'grid' | 'list' | 'cards';
  autoHideCompletedTasks: boolean;
  simplifyNavigation: boolean;
  prioritizeQuickActions: boolean;
  adaptiveNotifications: boolean;
  learningLevel: 'beginner' | 'intermediate' | 'advanced';
}

interface UsageBehavior {
  mostUsedTab: string;
  averageSessionLength: number;
  preferredTimeOfDay: number[];
  interactionPatterns: Record<string, number>;
  featureUsage: Record<string, number>;
  lastAdaptation: Date;
}

interface AdaptiveInterfaceState {
  settings: AdaptationSettings;
  behavior: UsageBehavior;
  adaptationHistory: Array<{
    date: Date;
    changes: Partial<AdaptationSettings>;
    reason: string;
  }>;
  
  // Actions
  updateSettings: (newSettings: Partial<AdaptationSettings>) => void;
  recordInteraction: (feature: string, tab?: string) => void;
  analyzeAndAdapt: () => void;
  resetAdaptations: () => void;
}

const defaultSettings: AdaptationSettings = {
  interfaceMode: 'student',
  layoutDensity: 'comfortable',
  colorScheme: 'default',
  showAdvancedFeatures: false,
  preferredDashboardLayout: 'cards',
  autoHideCompletedTasks: false,
  simplifyNavigation: false,
  prioritizeQuickActions: false,
  adaptiveNotifications: true,
  learningLevel: 'beginner',
};

const defaultBehavior: UsageBehavior = {
  mostUsedTab: 'stats',
  averageSessionLength: 25,
  preferredTimeOfDay: [9, 10, 14, 15],
  interactionPatterns: {},
  featureUsage: {},
  lastAdaptation: new Date(),
};

const useAdaptiveInterfaceStore = create<AdaptiveInterfaceState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      behavior: defaultBehavior,
      adaptationHistory: [],

      updateSettings: (newSettings) => {
        set((state) => ({
          settings: { ...state.settings, ...newSettings }
        }));
      },

      recordInteraction: (feature, tab) => {
        const currentTab = tab || get().behavior.mostUsedTab;
        
        set((state) => ({
          behavior: {
            ...state.behavior,
            interactionPatterns: {
              ...state.behavior.interactionPatterns,
              [currentTab]: (state.behavior.interactionPatterns[currentTab] || 0) + 1
            },
            featureUsage: {
              ...state.behavior.featureUsage,
              [feature]: (state.behavior.featureUsage[feature] || 0) + 1
            }
          }
        }));
      },

      analyzeAndAdapt: () => {
        const { behavior, settings } = get();
        const changes: Partial<AdaptationSettings> = {};
        let reason = '';

        // Analyze most used tab
        const tabUsage = Object.entries(behavior.interactionPatterns);
        if (tabUsage.length > 0) {
          const mostUsedTab = tabUsage.sort(([, a], [, b]) => b - a)[0][0];
          
          // Adapt interface based on primary usage
          if (mostUsedTab === 'simulados' && settings.interfaceMode !== 'competitor') {
            changes.interfaceMode = 'competitor';
            changes.showAdvancedFeatures = true;
            changes.preferredDashboardLayout = 'grid';
            reason = 'Detectado foco em simulados - interface otimizada para competições';
          } else if (mostUsedTab === 'pomodoro' && settings.colorScheme !== 'focused') {
            changes.layoutDensity = 'compact';
            changes.colorScheme = 'focused';
            changes.prioritizeQuickActions = true;
            reason = 'Uso intenso do Pomodoro - interface focada em produtividade';
          } else if (mostUsedTab === 'calendar' && settings.interfaceMode !== 'professional') {
            changes.interfaceMode = 'professional';
            changes.showAdvancedFeatures = true;
            changes.layoutDensity = 'spacious';
            reason = 'Foco no planejamento - interface profissional ativada';
          }
        }

        // Analyze feature usage complexity
        const featureCount = Object.keys(behavior.featureUsage).length;
        const advancedFeatures = ['correlations', 'templates', 'auto-pilot', 'planner'];
        const usesAdvancedFeatures = advancedFeatures.some(f => behavior.featureUsage[f] > 0);

        if (featureCount > 10 && usesAdvancedFeatures && settings.learningLevel !== 'advanced') {
          changes.learningLevel = 'advanced';
          changes.showAdvancedFeatures = true;
          changes.layoutDensity = 'compact';
          reason += (reason ? ' + ' : '') + 'Usuário experiente - recursos avançados habilitados';
        } else if (featureCount < 5 && settings.learningLevel !== 'beginner') {
          changes.simplifyNavigation = true;
          changes.layoutDensity = 'spacious';
          changes.learningLevel = 'beginner';
          reason += (reason ? ' + ' : '') + 'Interface simplificada para iniciante';
        }

        // Adapt based on session patterns
        if (behavior.averageSessionLength > 45) {
          changes.layoutDensity = 'compact';
          changes.autoHideCompletedTasks = true;
          reason += (reason ? ' + ' : '') + 'Sessões longas - interface mais compacta';
        } else if (behavior.averageSessionLength < 20) {
          changes.prioritizeQuickActions = true;
          changes.layoutDensity = 'comfortable';
          reason += (reason ? ' + ' : '') + 'Sessões rápidas - ações rápidas priorizadas';
        }

        // Apply changes if any
        if (Object.keys(changes).length > 0 && reason) {
          set((state) => ({
            settings: { ...state.settings, ...changes },
            behavior: { ...state.behavior, lastAdaptation: new Date() },
            adaptationHistory: [
              ...state.adaptationHistory.slice(-4), // Keep last 5
              { date: new Date(), changes, reason }
            ]
          }));
        }
      },

      resetAdaptations: () => {
        set({
          settings: defaultSettings,
          behavior: defaultBehavior,
          adaptationHistory: []
        });
      }
    }),
    {
      name: 'adaptive-interface-storage'
    }
  )
);

// Context for adaptive interface
interface AdaptiveContextType {
  settings: AdaptationSettings;
  recordInteraction: (feature: string, tab?: string) => void;
  getAdaptiveStyles: () => AdaptiveStyles;
  styles: AdaptiveStyles;
}

interface AdaptiveStyles {
  cardSpacing: string;
  textSizes: {
    title: string;
    subtitle: string;
    body: string;
    caption: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  layout: {
    containerPadding: string;
    gridGap: string;
    borderRadius: string;
  };
}

const AdaptiveContext = createContext<AdaptiveContextType | null>(null);

export const useAdaptive = () => {
  const context = useContext(AdaptiveContext);
  if (!context) {
    throw new Error('useAdaptive must be used within AdaptiveInterfaceProvider');
  }
  return context;
};

interface AdaptiveInterfaceProviderProps {
  children: ReactNode;
}

export function AdaptiveInterfaceProvider({ children }: AdaptiveInterfaceProviderProps) {
  const { settings, recordInteraction, analyzeAndAdapt } = useAdaptiveInterfaceStore();
  const simulados = useSimuladosStore(state => state.simulados);
  const pomodoroSessions = usePomodoroStore(state => state.sessions);
  const { userPatterns } = useIntelligenceStore();

  // Auto-analyze and adapt periodically
  useEffect(() => {
    const interval = setInterval(() => {
      analyzeAndAdapt();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Update behavior based on app usage
  useEffect(() => {
    // Update average session length from user patterns
    useAdaptiveInterfaceStore.setState((state) => ({
      behavior: {
        ...state.behavior,
        averageSessionLength: userPatterns.averageSessionLength,
        preferredTimeOfDay: userPatterns.bestStudyHours.slice(0, 4),
      }
    }));
  }, [userPatterns]);

  const getAdaptiveStyles = (): AdaptiveStyles => {
    const baseStyles: AdaptiveStyles = {
      cardSpacing: 'space-y-4',
      textSizes: {
        title: 'text-2xl',
        subtitle: 'text-lg',
        body: 'text-sm',
        caption: 'text-xs'
      },
      colors: {
        primary: 'blue-600',
        secondary: 'gray-600',
        accent: 'purple-600',
        background: 'white'
      },
      layout: {
        containerPadding: 'p-4',
        gridGap: 'gap-4',
        borderRadius: 'rounded-lg'
      }
    };

    // Adapt based on current settings
    switch (settings.layoutDensity) {
      case 'compact':
        baseStyles.cardSpacing = 'space-y-2';
        baseStyles.textSizes.title = 'text-xl';
        baseStyles.textSizes.subtitle = 'text-base';
        baseStyles.textSizes.body = 'text-xs';
        baseStyles.textSizes.caption = 'text-xs';
        baseStyles.layout.containerPadding = 'p-2';
        baseStyles.layout.gridGap = 'gap-2';
        break;
      case 'spacious':
        baseStyles.cardSpacing = 'space-y-6';
        baseStyles.textSizes.title = 'text-3xl';
        baseStyles.textSizes.subtitle = 'text-xl';
        baseStyles.textSizes.body = 'text-base';
        baseStyles.textSizes.caption = 'text-sm';
        baseStyles.layout.containerPadding = 'p-6';
        baseStyles.layout.gridGap = 'gap-6';
        break;
    }

    switch (settings.colorScheme) {
      case 'focused':
        baseStyles.colors.primary = 'green-600';
        baseStyles.colors.accent = 'green-500';
        break;
      case 'energetic':
        baseStyles.colors.primary = 'red-600';
        baseStyles.colors.accent = 'orange-500';
        break;
      case 'calm':
        baseStyles.colors.primary = 'blue-500';
        baseStyles.colors.accent = 'indigo-400';
        break;
    }

    return baseStyles;
  };

  const contextValue: AdaptiveContextType = {
    settings,
    recordInteraction,
    getAdaptiveStyles,
    styles: getAdaptiveStyles()
  };

  return (
    <AdaptiveContext.Provider value={contextValue}>
      {children}
    </AdaptiveContext.Provider>
  );
}

// Hook for adaptive components
export function useAdaptiveComponent(componentName: string, tabName?: string) {
  const { recordInteraction, getAdaptiveStyles } = useAdaptive();
  
  // Record interaction when component is used
  useEffect(() => {
    recordInteraction(componentName, tabName);
  }, []);

  return {
    styles: getAdaptiveStyles(),
    recordInteraction: (action: string) => recordInteraction(`${componentName}-${action}`, tabName)
  };
}

// Adaptive Dashboard Layout Component
export function AdaptiveDashboardLayout({ children }: { children: ReactNode }) {
  const { settings } = useAdaptive();
  
  const layoutClasses = {
    grid: 'grid grid-cols-1 lg:grid-cols-2 gap-4',
    list: 'space-y-4',
    cards: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
  };

  return (
    <div className={layoutClasses[settings.preferredDashboardLayout]}>
      {children}
    </div>
  );
}

// Adaptive Text Component
interface AdaptiveTextProps {
  variant: 'title' | 'subtitle' | 'body' | 'caption';
  children: ReactNode;
  className?: string;
}

export function AdaptiveText({ variant, children, className = '' }: AdaptiveTextProps) {
  const { styles } = useAdaptiveComponent('adaptive-text');
  
  return (
    <span className={`${styles.textSizes[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Adaptive Card Component
interface AdaptiveCardProps {
  children: ReactNode;
  className?: string;
  priority?: 'high' | 'medium' | 'low';
}

export function AdaptiveCard({ children, className = '', priority = 'medium' }: AdaptiveCardProps) {
  const { styles, settings } = useAdaptive();
  
  const priorityStyles = settings.prioritizeQuickActions && priority === 'high' 
    ? 'ring-2 ring-blue-500 shadow-lg' 
    : '';
  
  return (
    <div className={`
      ${styles.layout.borderRadius} 
      ${styles.layout.containerPadding}
      bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
      ${priorityStyles}
      ${className}
    `}>
      {children}
    </div>
  );
}

// Settings Panel for Adaptive Interface
export function AdaptiveInterfaceSettings() {
  const { settings, updateSettings, adaptationHistory, resetAdaptations } = useAdaptiveInterfaceStore();
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Interface Adaptativa</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          A interface se adapta automaticamente ao seu uso. Você pode ajustar manualmente as configurações abaixo.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Modo da Interface</label>
          <select
            value={settings.interfaceMode}
            onChange={(e) => updateSettings({ interfaceMode: e.target.value as InterfaceMode })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="student">Estudante</option>
            <option value="competitor">Competidor</option>
            <option value="casual">Casual</option>
            <option value="professional">Profissional</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Densidade do Layout</label>
          <select
            value={settings.layoutDensity}
            onChange={(e) => updateSettings({ layoutDensity: e.target.value as LayoutDensity })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="compact">Compacto</option>
            <option value="comfortable">Confortável</option>
            <option value="spacious">Espaçoso</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Esquema de Cores</label>
          <select
            value={settings.colorScheme}
            onChange={(e) => updateSettings({ colorScheme: e.target.value as ColorScheme })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="default">Padrão</option>
            <option value="focused">Focado</option>
            <option value="energetic">Energético</option>
            <option value="calm">Calmo</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Layout do Dashboard</label>
          <select
            value={settings.preferredDashboardLayout}
            onChange={(e) => updateSettings({ preferredDashboardLayout: e.target.value as any })}
            className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="grid">Grade</option>
            <option value="list">Lista</option>
            <option value="cards">Cards</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {[
          { key: 'showAdvancedFeatures', label: 'Mostrar recursos avançados' },
          { key: 'autoHideCompletedTasks', label: 'Ocultar tarefas concluídas automaticamente' },
          { key: 'simplifyNavigation', label: 'Simplificar navegação' },
          { key: 'prioritizeQuickActions', label: 'Priorizar ações rápidas' },
          { key: 'adaptiveNotifications', label: 'Notificações adaptativas' },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={settings[key as keyof AdaptationSettings] as boolean}
              onChange={(e) => updateSettings({ [key]: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>

      <div>
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {showHistory ? 'Ocultar' : 'Ver'} histórico de adaptações
        </button>
        
        {showHistory && (
          <div className="mt-3 space-y-2 max-h-32 overflow-y-auto">
            {adaptationHistory.map((adaptation, index) => (
              <div key={index} className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded">
                <div className="font-medium">{format(adaptation.date, 'dd/MM/yyyy HH:mm')}</div>
                <div className="text-gray-600 dark:text-gray-400">{adaptation.reason}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={resetAdaptations}
        className="w-full py-2 px-4 bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
      >
        Resetar Adaptações
      </button>
    </div>
  );
} 