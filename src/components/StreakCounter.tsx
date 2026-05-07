'use client';

import { useEffect, useState } from 'react';
import { useStatsStore } from '@/store/statsStore';
import { usePomodoroStore } from '@/store/pomodoroStore';

export default function StreakCounter() {
    const getStreak = useStatsStore((state) => state.getStreak);
    const sessions = usePomodoroStore((state) => state.sessions);
    const [streak, setStreak] = useState(0);

    useEffect(() => {
        setStreak(getStreak());
    }, [getStreak, sessions]);

    if (streak === 0) return null;

    const getStreakEmoji = () => {
        if (streak >= 30) return '💎';
        if (streak >= 14) return '🔥';
        if (streak >= 7) return '🔥';
        return '🔥';
    };

    const getStreakColor = () => {
        if (streak >= 30) return 'from-purple-500 to-blue-500';
        if (streak >= 14) return 'from-orange-500 to-red-500';
        if (streak >= 7) return 'from-orange-400 to-orange-600';
        return 'from-orange-300 to-orange-500';
    };

    return (
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r bg-opacity-10 border transition-all duration-300"
            style={{
                background: streak >= 30
                    ? 'linear-gradient(135deg, rgba(168,85,247,0.1), rgba(59,130,246,0.1))'
                    : 'linear-gradient(135deg, rgba(251,146,60,0.1), rgba(239,68,68,0.08))',
                borderColor: streak >= 30
                    ? 'rgba(168,85,247,0.2)'
                    : 'rgba(251,146,60,0.2)',
            }}
        >
            <span className="text-sm" role="img" aria-label="streak">{getStreakEmoji()}</span>
            <span className={`text-xs font-bold tabular-nums bg-gradient-to-r ${getStreakColor()} bg-clip-text text-transparent`}>
                {streak}
            </span>
        </div>
    );
}
