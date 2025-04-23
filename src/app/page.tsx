'use client';

import { useState } from 'react';
import Header from '@/components/Header';
import TabBar from '@/components/TabBar';
import Calendar from '@/components/Calendar';
import Pomodoro from '@/components/Pomodoro';
import Stats from '@/components/Stats';
import SubjectTopicManager from '@/components/SubjectTopicManager';
import SettingsModal from '@/components/SettingsModal';
import { TabName } from '@/types';

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabName>('calendar');
  const [showSubjectManager, setShowSubjectManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <main className="flex min-h-screen flex-col">
      <Header onSettingsClick={() => setShowSettings(true)} />
      
      <div className="flex-1 container mx-auto px-4 pb-20">
        <TabBar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="mt-6">
          {activeTab === 'calendar' && (
            <div>
              <div className="flex justify-between mb-4">
                <h2 className="text-2xl font-bold">Calendário</h2>
                <button
                  onClick={() => setShowSubjectManager(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
                >
                  Gerenciar Matérias e Tópicos
                </button>
              </div>
              <Calendar />
            </div>
          )}
          
          {activeTab === 'pomodoro' && <Pomodoro />}
          
          {activeTab === 'stats' && <Stats />}
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