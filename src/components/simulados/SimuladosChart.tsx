'use client';

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ptBR } from 'date-fns/locale';
import { Simulado } from '@/types';

Chart.register(...registerables);

interface SimuladosChartProps {
  simulados: Simulado[];
}

export default function SimuladosChart({ simulados }: SimuladosChartProps) {
  const chartData = useMemo(() => {
    const sortedSimulados = [...simulados].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    return {
      labels: sortedSimulados.map(s => new Date(s.date)),
      datasets: [
        {
          label: '% de Acertos',
          data: sortedSimulados.map(s => (s.hits / s.questions) * 100),
          borderColor: 'rgb(79, 70, 229)',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          tension: 0.3,
          pointRadius: 3,
          pointHoverRadius: 5,
          fill: true,
        },
      ],
    };
  }, [simulados]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: (value: string | number) => `${value}%`,
          font: {
            size: 10,
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
        },
      },
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          tooltipFormat: 'dd/MM/yyyy',
          displayFormats: {
            day: 'dd/MM',
          },
        },
        adapters: {
          date: {
            locale: ptBR,
          },
        },
        ticks: {
          font: {
            size: 10,
          },
        },
        grid: {
          color: 'rgba(156, 163, 175, 0.3)',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: 'rgb(243, 244, 246)',
        bodyColor: 'rgb(243, 244, 246)',
        borderColor: 'rgb(79, 70, 229)',
        borderWidth: 1,
        titleFont: {
          size: 12,
        },
        bodyFont: {
          size: 11,
        },
        callbacks: {
          label: (context: any) => {
            return `Acertos: ${context.parsed.y.toFixed(1)}%`;
          },
        },
      },
    },
  };

  if (simulados.length < 2) {
    return null;
  }

  return (
    <div className="bg-white/80 dark:bg-gray-950/60 backdrop-blur-md rounded-xl shadow-sm border border-gray-150/50 dark:border-gray-800/80 p-3">
      <h3 className="text-sm font-bold mb-2">Evolução</h3>
      <div style={{ height: '140px' }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
} 