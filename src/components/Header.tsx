'use client';

import { useState, useEffect } from 'react';
import { Cog6ToothIcon, SparklesIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettingsStore } from '@/store/settingsStore';

interface HeaderProps {
  onSettingsClick: () => void;
}

export default function Header({ onSettingsClick }: HeaderProps) {
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const pathname = usePathname();

  return (
    <header className="bg-white dark:bg-gray-900 shadow-sm relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-14">
          {/* Left: Logo */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Studar
            </h1>
          </div>

          {/* Center: Tutorial Button */}
          <div className="flex-1 flex justify-center px-4">
            <button
              type="button"
              onClick={() => setShowFeaturesModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 hover:from-yellow-100 hover:to-orange-100 dark:hover:from-yellow-900/30 dark:hover:to-orange-900/30 transition-all duration-200 shadow-sm hover:shadow-md"
              title="Tutorial Completo do Studar"
            >
              <SparklesIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Tutorial</span>
            </button>
          </div>

          {/* Right: Settings */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowFeaturesModal(true)}
              className="sm:hidden p-1.5 rounded-full text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 dark:focus:ring-offset-gray-900 transition-colors duration-150"
              title="Tutorial"
            >
              <SparklesIcon className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={onSettingsClick}
              className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-offset-gray-900"
              title="Configurações"
            >
              <Cog6ToothIcon className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Funcionalidades */}
      {showFeaturesModal && (
        <div className="fixed inset-0 z-[60] bg-gray-700 bg-opacity-50 dark:bg-black dark:bg-opacity-60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-semibold dark:text-white flex items-center">
                <SparklesIcon className="h-5 w-5 text-yellow-500 mr-2" />
                Bem-vindo ao Studar!
              </h3>
              <button
                onClick={() => setShowFeaturesModal(false)}
                className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-gray-700 dark:text-gray-300">
              <p>
                O Studar é sua plataforma completa para organizar, monitorar e otimizar seus estudos com ferramentas avançadas de análise e acompanhamento. Explore as principais funcionalidades:
              </p>

              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold dark:text-white">🗓️ Calendário</h4>
                  <p className="text-sm">Visualize seus tópicos de estudo e revisões agendadas. Adicione novos tópicos diretamente no dia desejado com interface otimizada para mobile.</p>
                </div>
                <div>
                  <h4 className="font-semibold dark:text-white">🍅 Pomodoro</h4>
                  <p className="text-sm">Utilize a técnica Pomodoro para sessões de estudo focadas. Associe cada sessão a um tópico específico e acompanhe seu tempo de estudo em tempo real.</p>
                </div>
                <div>
                  <h4 className="font-semibold dark:text-white">📊 Dashboard</h4>
                  <p className="text-sm">Visualize seu progresso com gráficos detalhados, heatmap de atividades, resumo de simulados e todas suas estatísticas em um layout compacto e responsivo.</p>
                </div>
                <div>
                  <h4 className="font-semibold dark:text-white">📝 Simulados</h4>
                  <p className="text-sm">Sistema completo de acompanhamento de simulados com análise de performance, identificação de pontos fracos, gráfico de evolução, filtros avançados e integração automática com revisões.</p>
                </div>
              </div>

              <div className="pt-3 border-t dark:border-gray-700">
                <h4 className="font-semibold dark:text-white mb-2">🚀 Funcionalidades Avançadas!</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li><strong>Análise Inteligente:</strong> Identificação automática de pontos fracos e sugestões de revisão baseadas na performance em simulados.</li>
                  <li><strong>Filtros Poderosos:</strong> Filtre simulados por período, matéria, tópico ou simulados gerais.</li>
                  <li><strong>Gráficos Interativos:</strong> Acompanhe a evolução do seu desempenho ao longo do tempo.</li>
                  <li><strong>Sistema de Revisão Espaçada:</strong> Agendamento automático de revisões para tópicos com baixo desempenho.</li>
                  <li><strong>Time Tracking:</strong> Monitore o tempo gasto em cada simulado e calcule seu ritmo de questões.</li>
                  <li><strong>Interface Responsiva:</strong> Design otimizado para todos os dispositivos, especialmente mobile.</li>
                </ul>
              </div>

              <div className="pt-3 border-t dark:border-gray-700">
                <h4 className="font-semibold dark:text-white mb-2">🎨 Altamente Personalizável!</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Gerencie suas <strong>Matérias</strong> e escolha <strong>cores</strong> únicas para cada uma.</li>
                  <li>Defina <strong>Tópicos</strong> dentro de cada matéria para organizar o conteúdo.</li>
                  <li>Ajuste os tempos do <strong>Pomodoro</strong> (foco, pausas curta e longa).</li>
                  <li>Configure os intervalos de <strong>Revisão Espaçada</strong> personalizados.</li>
                  <li>Estabeleça sua <strong>Meta Semanal</strong> de estudos.</li>
                  <li>Escolha entre os temas <strong>Claro e Escuro</strong>.</li>
                  <li>Personalize os níveis de cor do <strong>Heatmap</strong> de atividades.</li>
                </ul>
              </div>

              <p className="text-sm pt-2">
                Explore as <strong>Configurações</strong> (⚙️) para personalizar tudo ao seu gosto. O Studar se adapta ao seu método de estudo!
              </p>
            </div>

            <div className="p-4 border-t dark:border-gray-700 sticky bottom-0 bg-white dark:bg-gray-800 z-10 flex justify-end">
              <button
                onClick={() => setShowFeaturesModal(false)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
              >
                Entendi!
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}