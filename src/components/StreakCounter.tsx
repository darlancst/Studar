'use client';

import { useEffect, useState } from 'react';
import { FireIcon } from '@heroicons/react/24/solid';
import { useStatsStore } from '@/store/statsStore';
import { usePomodoroStore } from '@/store/pomodoroStore';

export default function StreakCounter() {
    const getStreak = useStatsStore((state) => state.getStreak);
    const sessions = usePomodoroStore((state) => state.sessions); // Subscribe to sessions to trigger re-render
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        setStreak(getStreak());
    }, [getStreak, sessions]);

    if (streak === 0) return null;

    return (
        <div className="flex items-center bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 px-3 py-1 rounded-full text-sm font-medium shadow-sm border border-orange-200 dark:border-orange-800/50 animate-pulse">
            <FireIcon className="h-5 w-5 mr-1 text-orange-500" />
            <span>{streak} {streak === 1 ? 'dia' : 'dias'}</span>
        </div>
    );
}
