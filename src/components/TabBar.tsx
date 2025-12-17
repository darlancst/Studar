'use client';

import {
  CalendarIcon,
  ClockIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon,
  DocumentChartBarIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import {
  CalendarIcon as CalendarIconSolid,
  ClockIcon as ClockIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  ClipboardDocumentListIcon as ClipboardDocumentListIconSolid,
  DocumentChartBarIcon as DocumentChartBarIconSolid,
  HomeIcon as HomeIconSolid
} from '@heroicons/react/24/solid';
import { TabName } from '@/types';

interface TabBarProps {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
}

export default function TabBar({ activeTab, setActiveTab }: TabBarProps) {
  const tabs = [
    { name: 'stats', label: 'Dashboard', shortLabel: 'Início', icon: ChartBarIcon, iconActive: ChartBarIconSolid },
    { name: 'calendar', label: 'Calendário', shortLabel: 'Agenda', icon: CalendarIcon, iconActive: CalendarIconSolid },
    { name: 'schedule', label: 'Cronograma', shortLabel: 'Cronog.', icon: ClipboardDocumentListIcon, iconActive: ClipboardDocumentListIconSolid },
    { name: 'pomodoro', label: 'Pomodoro', shortLabel: 'Foco', icon: ClockIcon, iconActive: ClockIconSolid },
    { name: 'simulados', label: 'Simulados', shortLabel: 'Simul.', icon: DocumentChartBarIcon, iconActive: DocumentChartBarIconSolid },
  ] as const;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:static sm:mb-6 z-50">
      <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-lg shadow-gray-900/10 dark:shadow-black/30 border border-gray-200/60 dark:border-gray-700/60 p-1.5 mx-auto max-w-2xl">
        <nav className="flex justify-between items-center gap-0.5" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const Icon = isActive ? tab.iconActive : tab.icon;

            return (
              <button
                key={tab.name}
                onClick={() => setActiveTab(tab.name)}
                className={`
                  group relative flex-1 flex flex-col items-center justify-center py-2.5 px-1 rounded-xl transition-all duration-300 ease-out
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2
                  ${isActive
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Active background indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-primary-50 dark:bg-primary-900/30 rounded-xl animate-scale-in" />
                )}

                <Icon
                  className={`relative z-10 h-6 w-6 mb-0.5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-105'
                    }`}
                  aria-hidden="true"
                />

                {/* Desktop label */}
                <span className={`relative z-10 text-[11px] font-medium truncate w-full text-center hidden sm:block transition-colors ${isActive ? 'text-primary-700 dark:text-primary-300' : ''
                  }`}>
                  {tab.label}
                </span>

                {/* Mobile label */}
                <span className={`relative z-10 text-[10px] font-medium truncate w-full text-center sm:hidden transition-colors ${isActive ? 'text-primary-700 dark:text-primary-300' : ''
                  }`}>
                  {tab.shortLabel}
                </span>

                {/* Active dot indicator for mobile */}
                {isActive && (
                  <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary-500 rounded-full sm:hidden" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}