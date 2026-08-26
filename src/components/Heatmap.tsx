import { useMemo, useRef, useEffect } from 'react';
import {
    format,
    eachDayOfInterval,
    subDays,
    isSameDay,
    startOfDay,
    getDay,
    endOfDay,
    subWeeks,
    startOfWeek,
    addDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { usePomodoroStore } from '@/store/pomodoroStore';
import { useVacationStore } from '@/store/vacationStore';

interface HeatmapProps {
    days?: number; // Default to ~365 or enough to fill the view
}

export default function Heatmap({ days = 365 }: HeatmapProps) {
    const { sessions } = usePomodoroStore();
    const { isVacationDate, vacationPeriods } = useVacationStore();
    const scrollRef = useRef<HTMLDivElement>(null);

    const data = useMemo(() => {
        const today = new Date();
        const endDate = today;
        // Ensure we start on a Sunday to align with the grid rows
        const startDate = startOfWeek(subDays(today, days));
        const allDays = eachDayOfInterval({ start: startDate, end: endDate });

        const dayData = allDays.map(day => {
            const daySessions = sessions.filter(s => isSameDay(new Date(s.date), day));
            const totalMinutes = daySessions.reduce((acc, s) => acc + s.duration, 0);
            const isVacation = isVacationDate(day);

            let level = 0;
            if (totalMinutes > 0) level = 1;
            if (totalMinutes > 30) level = 2;
            if (totalMinutes > 60) level = 3;
            if (totalMinutes > 120) level = 4;

            return {
                date: day,
                count: totalMinutes,
                level,
                isVacation
            };
        });

        return dayData;
    }, [sessions, days, isVacationDate, vacationPeriods]);

    const weeks = useMemo(() => {
        const weeksArray: { date: Date; count: number; level: number; isVacation: boolean }[][] = [];
        let currentWeek: { date: Date; count: number; level: number; isVacation: boolean }[] = [];

        data.forEach((day) => {
            if (getDay(day.date) === 0 && currentWeek.length > 0) {
                weeksArray.push(currentWeek);
                currentWeek = [];
            }
            currentWeek.push(day);
        });
        if (currentWeek.length > 0) {
            weeksArray.push(currentWeek);
        }
        return weeksArray;
    }, [data]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
        }
    }, [weeks]);

    const getDayColor = (level: number, isVacation: boolean) => {
        if (isVacation && level === 0) {
            return 'bg-cyan-100/90 dark:bg-cyan-950/70 border border-cyan-300/60 dark:border-cyan-700/50';
        }
        if (isVacation && level > 0) {
            switch (level) {
                case 1: return 'bg-green-200 dark:bg-green-900/40 ring-1 ring-cyan-400 dark:ring-cyan-600';
                case 2: return 'bg-green-300 dark:bg-green-800/60 ring-1 ring-cyan-400 dark:ring-cyan-600';
                case 3: return 'bg-green-400 dark:bg-green-600 ring-1 ring-cyan-400 dark:ring-cyan-600';
                case 4: return 'bg-green-500 dark:bg-green-500 ring-1 ring-cyan-400 dark:ring-cyan-600';
                default: return 'bg-gray-100 dark:bg-gray-700/50';
            }
        }
        switch (level) {
            case 0: return 'bg-gray-100 dark:bg-gray-700/50';
            case 1: return 'bg-green-200 dark:bg-green-900/40';
            case 2: return 'bg-green-300 dark:bg-green-800/60';
            case 3: return 'bg-green-400 dark:bg-green-600';
            case 4: return 'bg-green-500 dark:bg-green-500';
            default: return 'bg-gray-100 dark:bg-gray-700/50';
        }
    };

    const stopSwipe = (e: React.TouchEvent | React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="flex gap-2">
            {/* Sticky Labels */}
            <div className="flex flex-col gap-1 pt-2 pl-1 w-8 text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-3">
                <div className="h-5"></div> {/* Spacer for Month Labels - Adjusted to align with grid */}
                <div className="h-3"></div> {/* Dom */}
                <div className="h-3 flex items-center">Seg</div>
                <div className="h-3"></div> {/* Ter */}
                <div className="h-3 flex items-center">Qua</div>
                <div className="h-3"></div> {/* Qui */}
                <div className="h-3 flex items-center">Sex</div>
                <div className="h-3"></div> {/* Sab */}
            </div>

            <div
                ref={scrollRef}
                className="flex-1 overflow-x-auto pb-2 pt-2 scrollbar-hide"
                onTouchStart={stopSwipe}
                onTouchMove={stopSwipe}
                onTouchEnd={stopSwipe}
                onMouseDown={stopSwipe}
            >
                <div className="min-w-max pl-2">
                    {/* Month Labels */}
                    <div className="flex gap-1 mb-2 h-4">
                        {weeks.map((week, index) => {
                            const firstDay = week[0].date;
                            const prevWeekFirstDay = index > 0 ? weeks[index - 1][0].date : null;
                            const isNewMonth = !prevWeekFirstDay || firstDay.getMonth() !== prevWeekFirstDay.getMonth();

                            // Prevent overlap: if it's the first week and the next week starts a new month, hide this label
                            const nextWeekFirstDay = index < weeks.length - 1 ? weeks[index + 1][0].date : null;
                            const isFirstWeekAndNextIsNewMonth = index === 0 && nextWeekFirstDay && nextWeekFirstDay.getMonth() !== firstDay.getMonth();

                            const shouldShowLabel = isNewMonth && !isFirstWeekAndNextIsNewMonth;

                            return (
                                <div key={index} className="w-3 relative">
                                    {shouldShowLabel && (
                                        <span className="absolute left-0 text-xs text-gray-400 font-medium whitespace-nowrap">
                                            {format(firstDay, 'MMM', { locale: ptBR })}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex gap-1">
                        {weeks.map((week, weekIndex) => (
                            <div key={weekIndex} className="flex flex-col gap-1">
                                {week.map((day, dayIndex) => {
                                    let tooltipClass = "absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg";

                                    if (weekIndex < 2) {
                                        tooltipClass += " left-0";
                                    } else if (weekIndex >= weeks.length - 2) {
                                        tooltipClass += " right-0";
                                    } else {
                                        tooltipClass += " left-1/2 transform -translate-x-1/2";
                                    }

                                    return (
                                        <div
                                            key={dayIndex}
                                            className={`w-3 h-3 rounded-sm ${getDayColor(day.level, day.isVacation)} transition-colors relative group`}
                                        >
                                            <div className={tooltipClass}>
                                                {format(day.date, "d 'de' MMMM", { locale: ptBR })}: {day.isVacation ? '🌴 Férias - ' : ''}{Math.floor(day.count / 60)}h {day.count % 60}m
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-2 text-xs text-gray-400">
                        <span>Menos</span>
                        <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-700/50"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-200 dark:bg-green-900/40"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-300 dark:bg-green-800/60"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-400 dark:bg-green-600"></div>
                            <div className="w-3 h-3 rounded-sm bg-green-500 dark:bg-green-500"></div>
                        </div>
                        <span>Mais</span>

                        {/* Legenda de Férias */}
                        <div className="flex items-center gap-1.5 ml-2.5 pl-2.5 border-l border-gray-200 dark:border-gray-700">
                            <div className="w-3 h-3 rounded-sm bg-cyan-100/90 dark:bg-cyan-950/70 border border-cyan-300/60 dark:border-cyan-700/50"></div>
                            <span>Férias</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
