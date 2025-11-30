'use client';

import { CalendarIcon, ClockIcon, ChartBarIcon, ClipboardDocumentListIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { TabName } from '@/types';

interface TabBarProps {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
}

export default function TabBar({ activeTab, setActiveTab }: TabBarProps) {
  const tabs = [
    { name: 'stats', label: 'Dashboard', shortLabel: 'Início', icon: ChartBarIcon },
    { name: 'calendar', label: 'Calendário', shortLabel: 'Agenda', icon: CalendarIcon },
    { name: 'schedule', label: 'Cronograma', shortLabel: 'Cronog.', icon: ClipboardDocumentListIcon },
    { name: 'pomodoro', label: 'Pomodoro', shortLabel: 'Foco', icon: ClockIcon },
    { name: 'simulados', label: 'Simulados', shortLabel: 'Simul.', icon: DocumentChartBarIcon },
  ] as const;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:static sm:mb-6 z-50">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-lg rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-1.5 mx-auto max-w-2xl">
        <nav className="flex justify-between items-center gap-1" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.name;
            const Icon = tab.icon;

            return (
              <button
                key={tab.name}

                onClick={() => setActiveTab(tab.name)}
                className={`
                  flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all duration-200
                  focus:outline-none focus:ring-2 focus:ring-primary-500/50
                  ${isActive
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 shadow-sm scale-105'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/30'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`h-6 w-6 mb-0.5 ${isActive ? 'stroke-2' : 'stroke-1.5'}`} aria-hidden="true" />
                <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center hidden sm:block">
                  {tab.label}
                </span>
                <span className="text-[10px] font-medium truncate w-full text-center sm:hidden">
                  {tab.shortLabel}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}