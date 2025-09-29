'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import TabBar from '@/components/TabBar';
import Stats from '@/components/Stats';
import Calendar from '@/components/Calendar';
import Pomodoro from '@/components/Pomodoro';
import SubjectTopicManager from '@/components/SubjectTopicManager';
import SettingsModal from '@/components/SettingsModal';
import SimuladosPage from '@/app/simulados/page';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export type TabName = 'calendar' | 'pomodoro' | 'stats' | 'simulados';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName>('calendar');
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isDarkMode = useSettingsStore((state) => state.darkMode);

  // Aplicar classe dark no body baseado no estado do Zustand
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    
    if (isDarkMode) {
      body.classList.add('dark');
      html.classList.add('dark');
    } else {
      body.classList.remove('dark');
      html.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Listener para navegação entre abas
  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.type === 'navigate-to-simulados') {
        setActiveTab('simulados');
      } else if (customEvent.type === 'navigate-to-dashboard') {
        setActiveTab('stats');
      }
    };

    window.addEventListener('navigate-to-simulados', handleNavigation);
    window.addEventListener('navigate-to-dashboard', handleNavigation);

    return () => {
      window.removeEventListener('navigate-to-simulados', handleNavigation);
      window.removeEventListener('navigate-to-dashboard', handleNavigation);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <Stats />;
      case 'pomodoro':
        return <Pomodoro />;
      case 'calendar':
        return (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0">
              <h2 className="text-2xl font-bold dark:text-white">Calendário</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowSubjectManager(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors flex-1 sm:flex-none"
                >
                  Gerenciar Matérias
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  ⚙️
                </button>
              </div>
            </div>
            <Calendar />
          </div>
        );
      case 'simulados':
        return <SimuladosPage />;
      default:
        return (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0">
              <h2 className="text-2xl font-bold dark:text-white">Calendário</h2>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowSubjectManager(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors flex-1 sm:flex-none"
                >
                  Gerenciar Matérias
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
                >
                  ⚙️
                </button>
              </div>
            </div>
            <Calendar />
          </div>
        );
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4">
      <TabBar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
      />
      
      <div className="mt-3">
        {renderContent()}
      </div>

      {showSubjectManager && (
        <SubjectTopicManager onClose={() => setShowSubjectManager(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      <PWAInstallPrompt />
    </div>
  );
} 