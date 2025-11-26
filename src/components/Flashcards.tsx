'use client';

import { useState } from 'react';
import { useFlashcardStore, Deck } from '@/store/flashcardStore';
import { useSubjectStore } from '@/store/subjectStore';
import { PlusIcon, TrashIcon, PlayIcon } from '@heroicons/react/24/outline';
import DeckView from './DeckView';
import StudySession from './StudySession';

export default function Flashcards() {
    const { decks, addDeck, deleteDeck, getCardsByDeck, getDueCards } = useFlashcardStore();
    const { subjects } = useSubjectStore();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newDeckName, setNewDeckName] = useState('');
    const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

    const [activeDeckId, setActiveDeckId] = useState<string | null>(null);
    const [isStudying, setIsStudying] = useState(false);

    const handleCreateDeck = () => {
        if (newDeckName.trim()) {
            addDeck(newDeckName, selectedSubjectId || undefined);
            setNewDeckName('');
            setSelectedSubjectId('');
            setShowCreateModal(false);
        }
    };

    const handleDeleteDeck = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Tem certeza que deseja excluir este baralho?')) {
            deleteDeck(id);
        }
    };

    const startStudy = (e: React.MouseEvent, deckId: string) => {
        e.stopPropagation();
        setActiveDeckId(deckId);
        setIsStudying(true);
    };

    if (isStudying && activeDeckId) {
        return (
            <StudySession
                deckId={activeDeckId}
                onClose={() => {
                    setIsStudying(false);
                    setActiveDeckId(null);
                }}
            />
        );
    }

    if (activeDeckId) {
        return (
            <DeckView
                deckId={activeDeckId}
                onBack={() => setActiveDeckId(null)}
                onStudy={() => setIsStudying(true)}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold dark:text-white">Flashcards</h2>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors text-sm"
                >
                    <PlusIcon className="h-5 w-5 mr-1" />
                    Novo Baralho
                </button>
            </div>

            {decks.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-gray-500 dark:text-gray-400">Nenhum baralho criado ainda.</p>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="mt-2 text-primary-600 hover:text-primary-700 font-medium"
                    >
                        Crie seu primeiro baralho
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {decks.map((deck) => {
                        const subject = subjects.find(s => s.id === deck.subjectId);
                        const cardCount = getCardsByDeck(deck.id).length;
                        const dueCount = getDueCards(deck.id).length;

                        return (
                            <div
                                key={deck.id}
                                onClick={() => setActiveDeckId(deck.id)}
                                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer relative group"
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-semibold text-lg dark:text-white">{deck.name}</h3>
                                        {subject && (
                                            <span
                                                className="text-xs px-2 py-0.5 rounded-full text-white inline-block mt-1"
                                                style={{ backgroundColor: subject.color }}
                                            >
                                                {subject.name}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleDeleteDeck(e, deck.id)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mt-4 flex justify-between items-end">
                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        <p>{cardCount} cartas</p>
                                        <p className={dueCount > 0 ? "text-orange-500 font-medium" : "text-green-500"}>
                                            {dueCount} para revisar
                                        </p>
                                    </div>

                                    {dueCount > 0 && (
                                        <button
                                            onClick={(e) => startStudy(e, deck.id)}
                                            className="flex items-center px-3 py-1.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 rounded-md hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors text-sm font-medium"
                                        >
                                            <PlayIcon className="h-4 w-4 mr-1" />
                                            Estudar
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Criação */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Novo Baralho</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome do Baralho
                                </label>
                                <input
                                    type="text"
                                    value={newDeckName}
                                    onChange={(e) => setNewDeckName(e.target.value)}
                                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="Ex: Vocabulário Inglês"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Matéria (Opcional)
                                </label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                                    className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                    <option value="">Nenhuma</option>
                                    {subjects.map(subject => (
                                        <option key={subject.id} value={subject.id}>
                                            {subject.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end space-x-3">
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateDeck}
                                disabled={!newDeckName.trim()}
                                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Criar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
