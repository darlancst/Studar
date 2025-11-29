'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PencilIcon, TrashIcon, CheckIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useReviewStore } from '@/store/reviewStore';
import { Review } from '@/types';

interface TopicReviewsProps {
    topicId: string;
}

export default function TopicReviews({ topicId }: TopicReviewsProps) {
    const { reviews, deleteReview, updateReview, toggleReviewCompletion } = useReviewStore();

    const topicReviews = reviews
        .filter((review) => review.topicId === topicId)
        .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());

    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState<string>('');

    const handleEditClick = (review: Review) => {
        setEditingReviewId(review.id);
        // Format date for input type="date" (YYYY-MM-DD)
        const date = new Date(review.scheduledDate);
        setEditDate(date.toISOString().split('T')[0]);
    };

    const handleSaveEdit = (reviewId: string) => {
        if (!editDate) return;

        const [year, month, day] = editDate.split('-').map(Number);
        const newDate = new Date(year, month - 1, day); // Month is 0-indexed in Date constructor

        updateReview(reviewId, { scheduledDate: newDate });
        setEditingReviewId(null);
    };

    const handleCancelEdit = () => {
        setEditingReviewId(null);
        setEditDate('');
    };

    if (topicReviews.length === 0) {
        return (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                Nenhuma revisão agendada para este tópico.
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {topicReviews.map((review) => (
                <div
                    key={review.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${review.completed
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            : 'bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600'
                        }`}
                >
                    <div className="flex items-center space-x-3 flex-1">
                        <button
                            onClick={() => toggleReviewCompletion(review.id)}
                            className={`p-1 rounded-full border ${review.completed
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-400 text-transparent hover:border-primary-500'
                                }`}
                        >
                            <CheckIcon className="h-4 w-4" />
                        </button>

                        {editingReviewId === review.id ? (
                            <div className="flex items-center space-x-2">
                                <input
                                    type="date"
                                    value={editDate}
                                    onChange={(e) => setEditDate(e.target.value)}
                                    className="p-1 border rounded dark:bg-gray-600 dark:border-gray-500 dark:text-white"
                                />
                                <button
                                    onClick={() => handleSaveEdit(review.id)}
                                    className="text-green-600 hover:text-green-800 dark:text-green-400"
                                >
                                    <CheckIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400"
                                >
                                    <XCircleIcon className="h-5 w-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex flex-col">
                                <span className={`font-medium ${review.completed ? 'text-gray-500 line-through dark:text-gray-400' : 'dark:text-white'
                                    }`}>
                                    {format(new Date(review.scheduledDate), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {review.completed ? 'Concluída' : 'Pendente'}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex space-x-2 ml-4">
                        {!editingReviewId && (
                            <button
                                onClick={() => handleEditClick(review)}
                                className="text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                                title="Editar data"
                            >
                                <PencilIcon className="h-5 w-5" />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (confirm('Tem certeza que deseja excluir esta revisão?')) {
                                    deleteReview(review.id);
                                }
                            }}
                            className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                            title="Excluir revisão"
                        >
                            <TrashIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
