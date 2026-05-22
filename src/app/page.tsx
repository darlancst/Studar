'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { XMarkIcon, BookOpenIcon } from '@heroicons/react/24/outline';
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
import { usePomodoroStore } from '@/store/pomodoroStore';


import NextSessionDisplay from '@/components/NextSessionDisplay';

import { TabName } from '@/types';

import useSwipe from '@/hooks/useSwipe';
import { useRegisterModal } from '@/hooks/useRegisterModal';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName>('stats');
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const isDarkMode = useSettingsStore((state) => state.darkMode);
  const zenMode = usePomodoroStore((state) => state.zenMode);
  const isZenFocus = activeTab === 'pomodoro' && zenMode;

  // Register main modals with back button handler
  useRegisterModal(showSubjectManager, () => setShowSubjectManager(false));
  useRegisterModal(showSettings, () => setShowSettings(false));

  // Ordem das abas para navegação via swipe
  const tabsOrder: TabName[] = ['stats', 'calendar', 'schedule', 'pomodoro', 'simulados'];

  // --- Histórico de abas para o botão voltar do celular ---
  useEffect(() => {
    const handleShowToast = () => {
      setShowExitToast(true);
      setTimeout(() => setShowExitToast(false), 2000);
    };
    window.addEventListener('show-exit-toast', handleShowToast);
    return () => window.removeEventListener('show-exit-toast', handleShowToast);
  }, []);

  const exitTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleInteraction = () => {
      if (exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }
    };
    window.addEventListener('click', handleInteraction, true);
    window.addEventListener('touchstart', handleInteraction, true);
    return () => {
      window.removeEventListener('click', handleInteraction, true);
      window.removeEventListener('touchstart', handleInteraction, true);
    };
  }, []);

  // Initialize hash on load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentHash = window.location.hash;
      if (!currentHash || currentHash === '#' || currentHash === '#stats') {
        window.history.replaceState(null, '', window.location.pathname); // Entry 0 (dummy)
        window.history.pushState(null, '', '#stats'); // Entry 1 (stats)
      } else {
        const hash = currentHash.substring(1) as TabName;
        if (['stats', 'pomodoro', 'calendar', 'schedule'].includes(hash)) {
          setActiveTab(hash);
        }
      }
    }
  }, []);

  const handleTabChange = useCallback((tab: TabName) => {
    if (tab === activeTab) return;

    if (tab === 'stats') {
      window.history.back(); // Volta para limpar a pilha do browser
    } else if (activeTab === 'stats') {
      window.location.hash = tab; // Adiciona no histórico
    } else {
      window.history.replaceState(null, '', '#' + tab);
      setActiveTab(tab); // replaceState não dispara hashchange
    }
  }, [activeTab]);

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      const win = window as any;
      const stack = win._modalCloseStack || [];
      
      // 1. Fechar modais se o hash não for modal e existirem modais abertos
      if (!hash.startsWith('modal') && stack.length > 0) {
        win._modalClosedByBack = true;
        const handler = stack.pop();
        if (handler) handler();
        
        // Se ainda tem modais abertos na pilha, restaura o hash do modal
        if (stack.length > 0) {
          window.history.pushState(null, '', '#modal');
        }
        return;
      }

      // Limpa o timer de saída se navegou
      if (hash !== '' && exitTimerRef.current) {
        clearTimeout(exitTimerRef.current);
        exitTimerRef.current = null;
      }

      // 2. Navegação normal
      if (['stats', 'pomodoro', 'calendar', 'schedule'].includes(hash)) {
        setActiveTab(hash as TabName);
      } 
      // 3. Intercepta saída na tela inicial (hash empty)
      else if (hash === '') {
        if (exitTimerRef.current) {
          clearTimeout(exitTimerRef.current);
          exitTimerRef.current = null;
          // Deixa sair nativamente
        } else {
          window.dispatchEvent(new CustomEvent('show-exit-toast'));
          
          exitTimerRef.current = setTimeout(() => {
            window.history.pushState(null, '', '#stats');
            exitTimerRef.current = null;
          }, 2000);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleSwipeLeft = () => {
    const currentIndex = tabsOrder.indexOf(activeTab);
    if (currentIndex < tabsOrder.length - 1) {
      handleTabChange(tabsOrder[currentIndex + 1]);
    }
  };

  const handleSwipeRight = () => {
    const currentIndex = tabsOrder.indexOf(activeTab);
    if (currentIndex > 0) {
      handleTabChange(tabsOrder[currentIndex - 1]);
    }
  };

  const swipeHandlers = useSwipe({
    onSwipeLeft: handleSwipeLeft,
    onSwipeRight: handleSwipeRight,
    threshold: 80
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
        handleTabChange('simulados');
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-dashboard') {
        handleTabChange('stats');
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-pomodoro') {
        handleTabChange('pomodoro');
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-calendar') {
        handleTabChange('calendar');
        setShowSubjectManager(false);
      } else if (customEvent.type === 'navigate-to-schedule') {
        handleTabChange('schedule');
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
  }, [handleTabChange]);

  // Scroll to top when active tab changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  return (
    <div
      className="min-h-screen overflow-x-hidden"
      {...swipeHandlers}
    >
      <div className={`max-w-6xl mx-auto px-3 sm:px-4 pt-3 sm:pt-4 transition-all duration-300 ${isZenFocus ? 'pt-0 px-0 max-w-full' : ''}`}>
        <header className={`flex items-center justify-between mb-3 sm:mb-4 transition-all duration-300 ${isZenFocus ? 'opacity-0 h-0 pointer-events-none mb-0 overflow-hidden py-0' : ''}`}>
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => handleTabChange('stats')}
              className="w-11 h-11 bg-gradient-to-br from-primary-500 via-primary-600 to-blue-600 rounded-2xl shadow-lg shadow-primary-500/25 flex items-center justify-center text-white font-bold text-xl transition-transform hover:scale-105 active:scale-95 cursor-pointer"
              title="Página Inicial (Estatísticas)"
            >
              S
            </button>
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

        <div className={`hidden sm:block mb-2 transition-all duration-300 ${isZenFocus ? 'opacity-0 h-0 pointer-events-none mb-0 overflow-hidden' : ''}`}>
          <TabBar
            activeTab={activeTab}
            setActiveTab={handleTabChange}
          />
        </div>

        {/* Componentes mantidos montados para preservar estado (display: none quando inativo) */}
        <main className={`transition-all duration-300 ${isZenFocus ? 'pb-0' : 'pb-24 sm:pb-4'}`}>
          <div style={{ display: activeTab === 'stats' ? 'block' : 'none' }}>
            <Stats />
          </div>
          <div style={{ display: activeTab === 'pomodoro' ? 'block' : 'none' }}>
            <Pomodoro />
          </div>
          <div style={{ display: activeTab === 'calendar' ? 'block' : 'none' }}>
            <div className="pb-20 sm:pb-0">
              <div className="flex flex-row justify-between items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold dark:text-white">Agenda</h2>
                <button
                  onClick={() => setShowSubjectManager(true)}
                  className="bg-primary-600 text-white px-4 py-1.5 sm:py-2 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium shadow-sm flex items-center justify-center gap-1.5 sm:gap-2 text-center"
                >
                  <BookOpenIcon className="h-5 w-5" />
                  Matérias
                </button>
              </div>
              <Calendar />
            </div>
          </div>
          <div style={{ display: activeTab === 'simulados' ? 'block' : 'none' }}>
            <SimuladosPage />
          </div>
          <div style={{ display: activeTab === 'schedule' ? 'block' : 'none' }}>
            <ScheduleManager />
          </div>
        </main>

        {showSubjectManager && (
          <SubjectTopicManager onClose={() => setShowSubjectManager(false)} />
        )}

        {showSettings && (
          <SettingsModal onClose={() => setShowSettings(false)} />
        )}

        <PWAInstallPrompt />
        <PWADebug />
      </div>

      {/* Mobile TabBar fora do container para fixed funcionar corretamente */}
      <div className={`sm:hidden transition-all duration-300 ${isZenFocus ? 'opacity-0 h-0 pointer-events-none translate-y-10 overflow-hidden' : ''}`}>
        <TabBar
          activeTab={activeTab}
          setActiveTab={handleTabChange}
        />
      </div>

      {/* Toast de saída (clique duplo) */}
      <div 
        className={`fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 dark:bg-white/90 text-white dark:text-gray-900 px-4 py-2 rounded-full text-sm font-medium shadow-lg transition-all duration-300 z-[999] pointer-events-none ${
          showExitToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        Toque de novo para sair
      </div>
    </div>
  );
}
 