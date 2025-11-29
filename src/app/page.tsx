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
import PWADebug from '@/components/PWADebug';
import ScheduleManager from '@/components/ScheduleManager';

import StreakCounter from '@/components/StreakCounter';

import { TabName } from '@/types';

import useSwipe from '@/hooks/useSwipe';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName>('stats');
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const isDarkMode = useSettingsStore((state) => state.darkMode);

  // Ordem das abas para navegação via swipe
  const tabsOrder: TabName[] = ['stats', 'calendar', 'schedule', 'pomodoro', 'simulados'];

  const handleSwipeLeft = () => {
    const currentIndex = tabsOrder.indexOf(activeTab);
    if (currentIndex < tabsOrder.length - 1) {
      setActiveTab(tabsOrder[currentIndex + 1]);
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabsOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      setActiveTab(tabsOrder[currentIndex - 1]);
    }
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 50
  });

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
      } else if (customEvent.type === 'navigate-to-pomodoro') {
        setActiveTab('pomodoro');
      }
    };

    window.addEventListener('navigate-to-simulados', handleNavigation);
    window.addEventListener('navigate-to-dashboard', handleNavigation);
    window.addEventListener('navigate-to-pomodoro', handleNavigation);

    return () => {
      window.removeEventListener('navigate-to-simulados', handleNavigation);
      window.removeEventListener('navigate-to-dashboard', handleNavigation);
      window.removeEventListener('navigate-to-pomodoro', handleNavigation);
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
                  className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex-1 sm:flex-none shadow-sm text-sm font-medium"
                >
                  Matérias e Tópicos
                </button>
              </div>
            </div>
            <Calendar />
          </div>
        );
      case 'simulados':
        return <SimuladosPage />;
      case 'schedule':
        return <ScheduleManager />;
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen pb-20 sm:pb-4"
      {...swipeHandlers}
    >
      <div className="max-w-6xl mx-auto p-2 sm:p-3 pt-2 sm:pt-3">
        <header className="flex justify-between items-center mb-1 sm:mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-xl">
              S
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 hidden sm:block">
              Studar
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <StreakCounter />
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 transition-colors"
            >
              ⚙️
            </button>
          </div>
        </header>

        <div className="hidden sm:block mb-2">
          <TabBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        <main className="animate-fade-in">
          {renderContent()}
        </main>

        <div className="sm:hidden">
          <TabBar
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </div>

        {showSubjectManager && (
          <SubjectTopicManager onClose={() => setShowSubjectManager(false)} />
        )}

        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}

        <PWAInstallPrompt />
        <PWADebug />
      </div>
    </div>
  );
} 