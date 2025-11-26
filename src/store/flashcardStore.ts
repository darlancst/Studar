import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import { firebaseSync } from '@/services/firebaseSync';

export interface Card {
    id: string;
    deckId: string;
    front: string;
    back: string;
    nextReview: number; // Timestamp
    interval: number; // Dias
    ease: number;
    repetitions: number;
}

export interface Deck {
    id: string;
    name: string;
    subjectId?: string;
    createdAt: number;
}

interface FlashcardState {
    decks: Deck[];
    cards: Card[];

    addDeck: (name: string, subjectId?: string) => void;
    deleteDeck: (id: string) => void;

    addCard: (deckId: string, front: string, back: string) => void;
    deleteCard: (id: string) => void;

    // Algoritmo SM-2
    reviewCard: (cardId: string, quality: number) => void; // quality: 0-5

    getCardsByDeck: (deckId: string) => Card[];
    getDueCards: (deckId: string) => Card[];
}

const storage = typeof window !== 'undefined'
    ? createJSONStorage(() => localStorage)
    : undefined;

export const useFlashcardStore = create<FlashcardState>()(
    persist(
        (set, get) => ({
            decks: [],
            cards: [],

            addDeck: (name, subjectId) => {
                const newDeck: Deck = {
                    id: uuidv4(),
                    name,
                    subjectId,
                    createdAt: Date.now(),
                };
                set(state => ({ decks: [...state.decks, newDeck] }));
                setTimeout(() => firebaseSync.syncToCloud(), 0);
            },

            deleteDeck: (id) => {
                set(state => ({
                    decks: state.decks.filter(d => d.id !== id),
                    cards: state.cards.filter(c => c.deckId !== id) // Cascading delete
                }));
                setTimeout(() => firebaseSync.syncToCloud(), 100);
            },

            addCard: (deckId, front, back) => {
                const newCard: Card = {
                    id: uuidv4(),
                    deckId,
                    front,
                    back,
                    nextReview: Date.now(),
                    interval: 0,
                    ease: 2.5,
                    repetitions: 0,
                };
                set(state => ({ cards: [...state.cards, newCard] }));
                setTimeout(() => firebaseSync.syncToCloud(), 0);
            },

            deleteCard: (id) => {
                set(state => ({ cards: state.cards.filter(c => c.id !== id) }));
                setTimeout(() => firebaseSync.syncToCloud(), 100);
            },

            reviewCard: (cardId, quality) => {
                set(state => {
                    const cardIndex = state.cards.findIndex(c => c.id === cardId);
                    if (cardIndex === -1) return state;

                    const card = state.cards[cardIndex];
                    let { interval, ease, repetitions } = card;

                    // SM-2 Algorithm
                    if (quality >= 3) {
                        if (repetitions === 0) {
                            interval = 1;
                        } else if (repetitions === 1) {
                            interval = 6;
                        } else {
                            interval = Math.round(interval * ease);
                        }
                        repetitions++;
                    } else {
                        repetitions = 0;
                        interval = 1;
                    }

                    ease = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
                    if (ease < 1.3) ease = 1.3;

                    const nextReview = Date.now() + (interval * 24 * 60 * 60 * 1000);

                    const updatedCards = [...state.cards];
                    updatedCards[cardIndex] = {
                        ...card,
                        interval,
                        ease,
                        repetitions,
                        nextReview
                    };

                    return { cards: updatedCards };
                });
                setTimeout(() => firebaseSync.syncToCloud(), 100);
            },

            getCardsByDeck: (deckId) => {
                return get().cards.filter(c => c.deckId === deckId);
            },

            getDueCards: (deckId) => {
                const now = Date.now();
                return get().cards.filter(c => c.deckId === deckId && c.nextReview <= now);
            }
        }),
        {
            name: 'flashcards',
            storage: storage,
        }
    )
);
