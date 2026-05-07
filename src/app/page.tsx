'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
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


import NextSessionDisplay from '@/components/NextSessionDisplay';

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
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-dashboard') {
        setActiveTab('stats');
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-pomodoro') {
        setActiveTab('pomodoro');
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-calendar') {
        setActiveTab('calendar');
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-schedule') {
        setActiveTab('schedule');
        setShowSubjectManager(false);
      }
    };

    window.addEventListener('navigate-to-simulados', handleNavigation);
    window.addEventListener('navigate-to-dashboard', handleNavigation);
    window.addEventListener('navigate-to-pomodoro', handleNavigation);
    window.addEventListener('navigate-to-calendar', handleNavigation);
    window.addEventListener('navigate-to-schedule', handleNavigation);
    window.addEventListener('open-subject-manager', () => setShowSubjectManager(true));

    return () => {
      window.removeEventListener('navigate-to-simulados', handleNavigation);
      window.removeEventListener('navigate-to-dashboard', handleNavigation);
      window.removeEventListener('navigate-to-pomodoro', handleNavigation);
      window.removeEventListener('navigate-to-calendar', handleNavigation);
      window.removeEventListener('navigate-to-schedule', handleNavigation);
      window.removeEventListener('open-subject-manager', () => setShowSubjectManager(true));
    };
  }, []);

  // Scroll to top when active tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <Stats />;
      case 'pomodoro':
        return <Pomodoro />;
      case 'calendar':
        return (
          <div className="pb-20 sm:pb-0">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold dark:text-white">Calendário</h2>
              <button
                onClick={() => setShowSubjectManager(true)}
                className="bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors shadow-sm text-xs sm:text-sm font-medium"
              >
                Matérias e Tópicos
              </button>
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
      className="min-h-screen pb-24 sm:pb-4"
      {...swipeHandlers}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4">
        <header className="flex items-center justify-between mb-3 sm:mb-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 rounded-2xl shadow-lg shadow-primary-500/25 flex items-center justify-center text-white font-bold text-xl transition-transform hover:scale-105">
              S
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-gray-700 to-gray-600 dark:from-white dark:via-gray-200 dark:to-gray-400">
                Studar
              </h1>
            </div>
          </div>

          {/* Right: Next Session + Settings */}
          <div className="flex items-center gap-2 sm:gap-3">
            <StreakCounter />
            <NextSessionDisplay />
            <button
              onClick={() => setShowSettings(true)}
              className="p-2.5 rounded-xl bg-gray-100/80 dark:bg-gray-800/80 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 active:scale-95"
              title="Configurações"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
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