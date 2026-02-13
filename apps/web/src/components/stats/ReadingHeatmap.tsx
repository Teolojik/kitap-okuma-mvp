
import React from 'react';
import { motion } from 'framer-motion';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ReadingHeatmapProps {
    data: Record<string, number>;
    language?: 'tr' | 'en';
}

const ReadingHeatmap: React.FC<ReadingHeatmapProps> = ({ data, language = 'tr' }) => {

    // Generate days for the last 365 days
    const days = Array.from({ length: 365 }).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (364 - i));
        return date;
    });

    const getColor = (count: number) => {
        if (!count || count === 0) return 'bg-secondary/20';
        if (count < 10) return 'bg-primary/20';
        if (count < 30) return 'bg-primary/40';
        if (count < 60) return 'bg-primary/70';
        return 'bg-primary';
    };

    // Group days by week for the grid
    const weeks: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day, i) => {
        currentWeek.push(day);
        if (day.getDay() === 6 || i === days.length - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    const formatDay = (date: Date) => {
        return date.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return (
        <div className="w-full space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">
                    {language === 'tr' ? 'OKUMA AKTİVİTESİ' : 'READING ACTIVITY'}
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">{language === 'tr' ? 'Az' : 'Less'}</span>
                    <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-sm bg-secondary/20" />
                        <div className="h-2 w-2 rounded-sm bg-primary/20" />
                        <div className="h-2 w-2 rounded-sm bg-primary/40" />
                        <div className="h-2 w-2 rounded-sm bg-primary/70" />
                        <div className="h-2 w-2 rounded-sm bg-primary" />
                    </div>
                    <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50">{language === 'tr' ? 'Çok' : 'More'}</span>
                </div>
            </div>

            <div className="relative overflow-x-auto no-scrollbar pb-2">
                <div className="flex gap-1.5 min-w-max">
                    <TooltipProvider delayDuration={0}>
                        {weeks.map((week, weekIdx) => (
                            <div key={weekIdx} className="flex flex-col gap-1.5">
                                {Array.from({ length: 7 }).map((_, dayIdx) => {
                                    // Adjust dayIdx to map correctly if week is partial
                                    const day = week.find(d => d.getDay() === dayIdx);
                                    if (!day) return <div key={dayIdx} className="h-3 w-3 sm:h-4 sm:w-4 rounded-sm bg-transparent" />;

                                    const dateKey = day.toLocaleDateString('en-CA');
                                    const count = data[dateKey] || 0;

                                    return (
                                        <Tooltip key={dayIdx}>
                                            <TooltipTrigger asChild>
                                                <motion.div
                                                    whileHover={{ scale: 1.2, zIndex: 10 }}
                                                    className={`h-3 w-3 sm:h-4 sm:w-4 rounded-sm transition-colors cursor-pointer ${getColor(count)} border border-white/5 shadow-sm`}
                                                />
                                            </TooltipTrigger>
                                            <TooltipContent side="top" className="rounded-xl bg-background/95 backdrop-blur-xl border-primary/20 p-3 shadow-2xl">
                                                <p className="text-[10px] font-black uppercase tracking-widest mb-1">
                                                    {formatDay(day)}
                                                </p>
                                                <p className="text-[10px] font-bold text-primary">
                                                    {count} {language === 'tr' ? 'Sayfa Okundu' : 'Pages Read'}
                                                </p>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        ))}
                    </TooltipProvider>
                </div>
            </div>

            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 px-1 pt-1 border-t border-border/5">
                <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span>
            </div>
        </div>
    );
};

export default ReadingHeatmap;
