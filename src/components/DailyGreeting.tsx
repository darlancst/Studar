'use client';

import { useState, useEffect } from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function DailyGreeting() {
  const [greeting, setGreeting] = useState<{ text: string; emoji: string } | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const lastGreeting = localStorage.getItem('studar_last_daily_greeting');

      if (lastGreeting === todayStr) {
        return; // Já foi exibido hoje
      }

      const hour = now.getHours();
      let text = 'Bom dia, Darlan!';
      let emoji = '☀️';

      if (hour >= 12 && hour < 18) {
        text = 'Boa tarde, Darlan!';
        emoji = '⛅';
      } else if (hour >= 18 || hour < 5) {
        text = 'Boa noite, Darlan!';
        emoji = '🌙';
      }

      setGreeting({ text, emoji });
      
      // Surge suavemente após 500ms
      const showTimer = setTimeout(() => {
        setVisible(true);
        localStorage.setItem('studar_last_daily_greeting', todayStr);
      }, 500);

      // Fica visível por 4 segundos e desvanece suavemente
      const hideTimer = setTimeout(() => {
        setVisible(false);
      }, 4500);

      // Limpa do DOM
      const cleanupTimer = setTimeout(() => {
        setGreeting(null);
      }, 5000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        clearTimeout(cleanupTimer);
      };
    } catch {
      // Ignora se localStorage não estiver disponível
    }
  }, []);

  if (!greeting) return null;

  return (
    <aside
      aria-label="Saudação diária"
      className={`fixed top-3.5 sm:top-5 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none transition-all duration-400 ease-out ${
        visible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 -translate-y-3 scale-95'
      }`}
    >
      <div className="bg-gray-900/90 dark:bg-gray-800/95 text-white backdrop-blur-md px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-xl border border-white/15 dark:border-gray-700 flex items-center gap-2 select-none">
        <span className="text-sm sm:text-base shrink-0">{greeting.emoji}</span>
        <span className="text-xs sm:text-sm font-bold text-white tracking-tight shrink-0">
          {greeting.text}
        </span>
        <SparklesIcon className="w-3.5 h-3.5 text-primary-400 shrink-0 ml-0.5 opacity-80" />
      </div>
    </aside>
  );
}
