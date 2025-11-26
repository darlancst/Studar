'use client';

import { useState, useEffect } from 'react';
import { useFlashcardStore, Card } from '@/store/flashcardStore';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface StudySessionProps {
    deckId: string;
    onClose: () => void;
}

export default function StudySession({ deckId, onClose }: StudySessionProps) {
    const { getDueCards, reviewCard } = useFlashcardStore();
    const [dueCards, setDueCards] = useState<Card[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);

    useEffect(() => {
        const cards = getDueCards(deckId);
        setDueCards(cards);
    }, [deckId, getDueCards]);

    const currentCard = dueCards[currentCardIndex];

    const handleFlip = () => {
        setIsFlipped(true);
    };

    const handleGrade = (quality: number) => {
        if (!currentCard) return;

        reviewCard(currentCard.id, quality);

        if (currentCardIndex < dueCards.length - 1) {
            setIsFlipped(false);
            setCurrentCardIndex(prev => prev + 1);
        } else {
            setSessionComplete(true);
        }
    };

    if (sessionComplete) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center h-96">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold mb-2 dark:text-white">Sessão Concluída!</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Você revisou todas as cartas pendentes deste baralho.
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
                >
                    Voltar aos Baralhos
                </button>
            </div>
        );
    }

    if (dueCards.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-md text-center h-96">
                <div className="text-6xl mb-4">😴</div>
                <h2 className="text-2xl font-bold mb-2 dark:text-white">Nada para revisar agora</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Todas as cartas deste baralho estão em dia. Volte mais tarde!
                </p>
                <button
                    onClick={onClose}
                    className="px-6 py-2 bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    Voltar
                </button>
            </div>
        );
    }

    if (!currentCard) return null;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex justify-between items-center mb-4">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Carta {currentCardIndex + 1} de {dueCards.length}
                </span>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                >
                    <XMarkIcon className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </button>
            </div>

            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg min-h-[400px] flex flex-col relative overflow-hidden cursor-pointer"
                onClick={!isFlipped ? handleFlip : undefined}
            >
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                    <div className="prose dark:prose-invert max-w-none">
                        <h3 className="text-xl text-gray-400 uppercase tracking-wider mb-4 text-sm font-semibold">
                            {isFlipped ? 'Verso' : 'Frente'}
                        </h3>
                        <div className="text-2xl md:text-3xl font-medium dark:text-white">
                            {isFlipped ? currentCard.back : currentCard.front}
                        </div>
                    </div>
                </div>

                {!isFlipped && (
                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gray-50 dark:bg-gray-700/50 text-center text-gray-500 dark:text-gray-400 text-sm">
                        Clique para virar
                    </div>
                )}
            </div>

            {isFlipped && (
                <div className="mt-6 grid grid-cols-4 gap-3">
                    <button
                        onClick={() => handleGrade(0)}
                        className="flex flex-col items-center p-3 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors"
                    >
                        <span className="font-bold mb-1">Errei</span>
                        <span className="text-xs opacity-75">&lt; 1 min</span>
                    </button>

                    <button
                        onClick={() => handleGrade(3)}
                        className="flex flex-col items-center p-3 rounded-lg bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 transition-colors"
                    >
                        <span className="font-bold mb-1">Difícil</span>
                        <span className="text-xs opacity-75">~ 2 dias</span>
                    </button>

                    <button
                        onClick={() => handleGrade(4)}
                        className="flex flex-col items-center p-3 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors"
                    >
                        <span className="font-bold mb-1">Bom</span>
                        <span className="text-xs opacity-75">~ 4 dias</span>
                    </button>

                    <button
                        onClick={() => handleGrade(5)}
                        className="flex flex-col items-center p-3 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 transition-colors"
                    >
                        <span className="font-bold mb-1">Fácil</span>
                        <span className="text-xs opacity-75">~ 7 dias</span>
                    </button>
                </div>
            )}
        </div>
    );
}
