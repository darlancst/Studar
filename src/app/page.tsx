'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import TabBar from '@/components/TabBar';
import Calendar from '@/components/Calendar';
import Pomodoro from '@/components/Pomodoro';
import Stats from '@/components/Stats';
import SubjectTopicManager from '@/components/SubjectTopicManager';
import SettingsModal from '@/components/SettingsModal';
import { TabName } from '@/types';
import SimuladosPage from './simulados/page';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName>('calendar');
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const handleNavigateToSimulados = () => {
      setActiveTab('simulados');
    };

    const handleNavigateToDashboard = () => {
      setActiveTab('stats');
    };

    window.addEventListener('navigate-to-simulados', handleNavigateToSimulados);
    window.addEventListener('navigate-to-dashboard', handleNavigateToDashboard);
    
    return () => {
      window.removeEventListener('navigate-to-simulados', handleNavigateToSimulados);
      window.removeEventListener('navigate-to-dashboard', handleNavigateToDashboard);
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col">
      <Header onSettingsClick={() => setShowSettings(true)} />
      
      <div className="flex-1 container mx-auto px-4 pb-20">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="mt-3">
          {activeTab === 'calendar' && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2 sm:gap-0">
                <h2 className="text-2xl font-bold">Calendário</h2>
                <button
                  onClick={() => setShowSubjectManager(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors w-full sm:w-auto"
                >
                  Gerenciar Matérias e Tópicos
                </button>
              </div>
              <Calendar />
            </div>
          )}
          
          {activeTab === 'pomodoro' && <Pomodoro />}
          
          {activeTab === 'stats' && <Stats />}

          {activeTab === 'simulados' && <SimuladosPage />}
        </div>
      </div>
      
      {showSubjectManager && (
        <SubjectTopicManager onClose={() => setShowSubjectManager(false)} />
      )}

      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}
    </main>
  );
} 