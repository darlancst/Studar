'use client';

import { useFlashcardStore } from '@/store/flashcardStore';
import { RectangleStackIcon, DocumentDuplicateIcon, ClockIcon, AcademicCapIcon } from '@heroicons/react/24/outline';

export default function FlashcardStats() {
    const { decks, cards } = useFlashcardStore();

    const totalDecks = decks.length;
    const totalCards = cards.length;
    const cardsDue = cards.filter(c => c.nextReview <= Date.now()).length;
    const cardsLearned = cards.filter(c => c.repetitions > 0).length;

    const stats = [
        {
            label: 'Baralhos',
            value: totalDecks,
            icon: RectangleStackIcon,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-100 dark:bg-blue-900/30',
        },
        {
            label: 'Total de Cartas',
            value: totalCards,
            icon: DocumentDuplicateIcon,
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-100 dark:bg-purple-900/30',
        },
        {
            label: 'Para Revisar',
            value: cardsDue,
            icon: ClockIcon,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-100 dark:bg-amber-900/30',
        },
        {
            label: 'Cartas Aprendidas',
            value: cardsLearned,
            icon: AcademicCapIcon,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-100 dark:bg-green-900/30',
        },
    ];

    return (
        <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                    <div
                        key={stat.label}
                        className="bg-white dark:bg-gray-800 rounded-xl p-2 sm:p-3 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.02]"
                    >
                        <div className={`hidden sm:flex p-1.5 rounded-full mb-1 ${stat.bg}`}>
                            <Icon className={`w-4 h-4 ${stat.color}`} />
                        </div>
                        <span className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                            {stat.value}
                        </span>
                        <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide leading-tight mt-0.5 sm:mt-0">
                            {stat.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}
