'use client';

import { useState } from 'react';
import { useFlashcardStore, Card } from '@/store/flashcardStore';
import { ArrowLeftIcon, PlusIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';

interface DeckViewProps {
    deckId: string;
    onBack: () => void;
    onStudy: () => void;
}

export default function DeckView({ deckId, onBack, onStudy }: DeckViewProps) {
    const { decks, getCardsByDeck, addCard, deleteCard, getDueCards } = useFlashcardStore();
    const deck = decks.find(d => d.id === deckId);
    const cards = getCardsByDeck(deckId);
    const dueCards = getDueCards(deckId);

    const [showAddModal, setShowAddModal] = useState(false);
    const [front, setFront] = useState('');
    const [back, setBack] = useState('');

    if (!deck) return null;

    const handleAddCard = () => {
        if (front.trim() && back.trim()) {
            addCard(deckId, front, back);
            setFront('');
            setBack('');
            // Manter modal aberto para adicionar mais cartas
            // Focar no input de frente (será feito via ref se necessário, ou autoFocus no input)
        }
    };

    const handleDeleteCard = (id: string) => {
        if (confirm('Excluir esta carta?')) {
            deleteCard(id);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                >
                    <ArrowLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
                <h2 className="text-2xl font-bold dark:text-white flex-1">{deck.name}</h2>

                {cards.length > 0 && (
                    <button
                        onClick={onStudy}
                        disabled={dueCards.length === 0}
                        className={`flex items-center px-4 py-2 rounded-md text-white font-medium transition-colors ${dueCards.length > 0
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-gray-400 cursor-not-allowed'
                            }`}
                    >
                        <PlayIcon className="h-5 w-5 mr-1" />
                        Estudar ({dueCards.length})
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Estatísticas Rápidas */}
                <div className="md:col-span-3 grid grid-cols-3 gap-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Total de Cartas</p>
                        <p className="text-2xl font-bold dark:text-white">{cards.length}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Para Revisar</p>
                        <p className="text-2xl font-bold text-orange-500">{dueCards.length}</p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Novas</p>
                        <p className="text-2xl font-bold text-blue-500">
                            {cards.filter(c => c.repetitions === 0).length}
                        </p>
                    </div>
                </div>

                {/* Lista de Cartas */}
                <div className="md:col-span-3 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold dark:text-white">Cartas</h3>
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center px-3 py-1.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                        >
                            <PlusIcon className="h-4 w-4 mr-1" />
                            Adicionar Carta
                        </button>
                    </div>

                    {cards.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-dashed border-gray-300 dark:border-gray-700">
                            <p className="text-gray-500 dark:text-gray-400">Este baralho está vazio.</p>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Adicionar primeira carta
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cards.map((card) => (
                                <div
                                    key={card.id}
                                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex justify-between items-center group"
                                >
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="border-b md:border-b-0 md:border-r border-gray-100 dark:border-gray-700 pb-2 md:pb-0 md:pr-4">
                                            <span className="text-xs font-semibold text-gray-400 uppercase block mb-1">Frente</span>
                                            <p className="dark:text-white whitespace-pre-wrap">{card.front}</p>
                                        </div>
                                        <div className="md:pl-4">
                                            <span className="text-xs font-semibold text-gray-400 uppercase block mb-1">Verso</span>
                                            <p className="dark:text-gray-300 whitespace-pre-wrap">{card.back}</p>
                                        </div>
                                    </div>
                                    <div className="ml-4 flex flex-col items-end space-y-2">
                                        <span className="text-xs text-gray-400">
                                            Próx: {new Date(card.nextReview).toLocaleDateString()}
                                        </span>
                                        <button
                                            onClick={() => handleDeleteCard(card.id)}
                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal Adicionar Carta */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl shadow-xl">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Nova Carta</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Frente
                                </label>
                                <textarea
                                    value={front}
                                    onChange={(e) => setFront(e.target.value)}
                                    className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white h-24 resize-none"
                                    placeholder="Pergunta ou termo..."
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Verso
                                </label>
                                <textarea
                                    value={back}
                                    onChange={(e) => setBack(e.target.value)}
                                    className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white h-24 resize-none"
                                    placeholder="Resposta ou definição..."
                                />
                            </div>
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Pressione Enter no verso para salvar (se não houver quebra de linha)
                            </span>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                                >
                                    Fechar
                                </button>
                                <button
                                    onClick={handleAddCard}
                                    disabled={!front.trim() || !back.trim()}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
