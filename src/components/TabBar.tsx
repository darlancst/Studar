'use client';

import { CalendarIcon, ClockIcon, ChartBarIcon, DocumentChartBarIcon } from '@heroicons/react/24/outline';
import { TabName } from '@/types';

interface TabBarProps {
  activeTab: TabName;
  setActiveTab: (tab: TabName) => void;
}

export default function TabBar({ activeTab, setActiveTab }: TabBarProps) {
  const tabs = [
    { name: 'calendar', label: 'Calendário', shortLabel: 'Calendar', icon: CalendarIcon },
    { name: 'pomodoro', label: 'Pomodoro', shortLabel: 'Pomodoro', icon: ClockIcon },
    { name: 'stats', label: 'Dashboard', shortLabel: 'Dashboard', icon: ChartBarIcon },
    { name: 'simulados', label: 'Simulados', shortLabel: 'Simulados', icon: DocumentChartBarIcon },
  ] as const;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
      <nav className="flex border-b dark:border-gray-700" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          const Icon = tab.icon;
          
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={`
                flex-1 flex flex-col sm:flex-row items-center justify-center py-1.5 sm:py-2 px-1 text-center
                border-b-2 transition-colors duration-150 ease-in-out focus:outline-none
                ${
                  isActive
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon className={`h-5 w-5 mb-1 sm:mb-0 sm:mr-2 ${isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`} aria-hidden="true" />
              <span className="text-xs sm:text-sm whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
} 