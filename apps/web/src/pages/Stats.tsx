
import React from 'react';
import { useBookStore } from '@/stores/useStore';
import {
    BarChart2,
    Clock,
    BookOpen,
    TrendingUp,
    Calendar,
    ChevronRight,
    Award,
    Flame
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';

import { useTranslation } from '@/lib/translations';
import { BookCover } from '@/components/ui/BookCover';

const ALL_ACHIEVEMENTS = (t: any) => [
    { id: 'kitap-kurdu', title: t('achievementKitapKurduTitle'), desc: t('achievementKitapKurduDesc'), icon: BookOpen, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    { id: 'usta-okur', title: t('achievementUstaOkurTitle'), desc: t('achievementUstaOkurDesc'), icon: Award, color: 'text-primary', bg: 'bg-primary/10' },
    { id: 'gece-kusu', title: t('achievementGeceKusuTitle'), desc: t('achievementGeceKusuDesc'), icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { id: 'seri-okuyucu', title: t('achievementSeriOkuyucuTitle'), desc: t('achievementSeriOkuyucuDesc'), icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10' },
];

const StatsPage = () => {
    const { books, settings, stats: realStats } = useBookStore();
    const t = useTranslation(settings.language);
    const achievements = ALL_ACHIEVEMENTS(t);

    const stats = [
        { label: t('totalBooks'), value: books.length.toString(), icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
        { label: t('totalPages'), value: realStats.totalPagesRead.toLocaleString(), icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/10' },
        { label: t('readingTime'), value: `${Math.floor(realStats.totalReadingTime / 60)}${t('minutes')}`, icon: Clock, color: 'text-green-500', bg: 'bg-green-500/10' },
        { label: `${t('streak')} (${t('days')})`, value: realStats.currentStreak.toString() || '0', icon: Flame, color: 'text-red-500', bg: 'bg-red-500/10' },
    ];

    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toLocaleDateString('en-CA');
        const dayNames = [t('sun'), t('mon'), t('tue'), t('wed'), t('thu'), t('fri'), t('sat')];
        return {
            day: dayNames[d.getDay()],
            pages: realStats.dailyPages[dateStr] || 0
        };
    });

    const unlockedAchievements = achievements.filter(a =>
        (realStats.achievements || []).some(ra => ra.id === a.id)
    );

    const maxPages = Math.max(...weeklyData.map(d => d.pages), 10);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <BarChart2 className="h-6 w-6 text-primary" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter bg-gradient-to-r from-foreground to-foreground/50 bg-clip-text text-transparent">{t('stats')}</h1>
                </div>
                <p className="text-muted-foreground font-medium text-xl opacity-60">{t('statsSub')}</p>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.1 }}
                    >
                        <Card className="border-border/50 bg-card/30 backdrop-blur-xl hover:bg-card/50 transition-all group overflow-hidden relative">
                            <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
                                <stat.icon className="w-20 h-20" />
                            </div>
                            <CardContent className="p-6 relative z-10">
                                <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center mb-4 group-hover:rotate-12 transition-transform shadow-sm`}>
                                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{stat.label}</p>
                                    <p className="text-3xl font-black tracking-tight">{stat.value}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Weekly Activity Chart */}
                <Card className="md:col-span-2 border-border/50 bg-card/30 backdrop-blur-xl overflow-hidden shadow-2xl shadow-primary/5">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                {t('weeklyActivity')}
                            </CardTitle>
                            <CardDescription>{t('weeklyActivityDesc')}</CardDescription>
                        </div>
                        <div className="h-8 px-4 rounded-full bg-primary/10 border border-primary/20 flex items-center">
                            <span className="text-[10px] font-black text-primary uppercase tracking-widest">{t('active')}</span>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-10">
                        {weeklyData.every(d => d.pages === 0) ? (
                            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-primary/10 rounded-[2rem] bg-primary/5">
                                <div className="h-16 w-16 rounded-full bg-background flex items-center justify-center shadow-xl">
                                    <TrendingUp className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black uppercase tracking-widest text-muted-foreground/60">{t('noDataYet') || 'HENÜZ VERİ YOK'}</p>
                                    <p className="text-[10px] text-muted-foreground/40 max-w-[200px] mx-auto">{t('startReadingHint') || 'Okuma yaparak grafikleri canlandırabilirsin.'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="h-64 flex items-end justify-between gap-2 px-2 bg-secondary/5 rounded-3xl p-6 border border-border/10">
                                {weeklyData.map((data, idx) => {
                                    const height = Math.max((data.pages / maxPages) * 100, 5); // Ensure at least a sliver is visible
                                    return (
                                        <div key={data.day} className="flex-1 flex flex-col items-center gap-4 group h-full">
                                            <div className="relative w-full flex justify-center items-end h-[180px]">
                                                {/* Tooltip on hover */}
                                                <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0 bg-primary text-primary-foreground text-[10px] font-black px-3 py-1.5 rounded-full shadow-xl pointer-events-none z-20 whitespace-nowrap">
                                                    {data.pages} {t('pagesRead')}
                                                </div>

                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: `${height}%` }}
                                                    transition={{ delay: idx * 0.05 + 0.3, duration: 1.5, type: "spring", bounce: 0.4 }}
                                                    className={`w-full max-w-[40px] ${data.pages > 0 ? 'bg-gradient-to-t from-primary/40 via-primary to-primary/80 shadow-[0_10px_20px_-5px_hsl(var(--primary)/0.4)]' : 'bg-primary/10'} rounded-t-xl group-hover:brightness-110 transition-all relative overflow-hidden`}
                                                >
                                                    {data.pages > 0 && (
                                                        <div className="absolute top-0 left-0 right-0 h-full bg-gradient-to-b from-white/20 to-transparent opacity-0 group-hover:opacity-30 transition-opacity" />
                                                    )}
                                                </motion.div>
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${data.pages > 0 ? 'text-primary' : 'text-muted-foreground/40'} group-hover:text-primary transition-colors`}>
                                                {data.day}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Achievements Card */}
                <Card className="border-border/50 bg-card/30 backdrop-blur-xl shadow-2xl">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Award className="h-5 w-5 text-primary" />
                            {t('achievements')} ({unlockedAchievements.length}/{achievements.length})
                        </CardTitle>
                        <CardDescription>{t('achievementsDesc')}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {achievements.map((achievement, idx) => {
                            const isUnlocked = (realStats.achievements || []).some(a => a.id === achievement.id);
                            return (
                                <motion.div
                                    key={achievement.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + (idx * 0.1) }}
                                    className={`flex items-center gap-4 p-4 rounded-[1.5rem] border transition-all ${isUnlocked ? 'bg-secondary/40 border-primary/20 shadow-sm opacity-100' : 'bg-secondary/5 border-transparent opacity-40 grayscale'}`}
                                >
                                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${isUnlocked ? achievement.bg : 'bg-muted'}`}>
                                        <achievement.icon className={`h-6 w-6 ${isUnlocked ? achievement.color : 'text-muted-foreground'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] font-black uppercase tracking-widest truncate">{achievement.title}</p>
                                        <p className="text-[10px] text-muted-foreground font-bold leading-tight line-clamp-2">{achievement.desc}</p>
                                    </div>
                                    {isUnlocked && <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                                </motion.div>
                            );
                        })}
                        <Button variant="outline" className="w-full rounded-2xl border-dashed border-primary/20 text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all py-6">
                            {t('exploreAll')}
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Book Distribution - Premium Addition */}
            <section className="space-y-6">
                <h2 className="text-2xl font-serif font-bold italic tracking-tight px-2">{t('bookDistribution')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {books.slice(0, 3).map((book) => (
                        <Card key={book.id} className="border-border/40 bg-card/20 backdrop-blur-sm hover:bg-card/40 transition-all rounded-[2rem] overflow-hidden">
                            <CardContent className="p-6 flex items-center gap-6">
                                <div className="w-16 shrink-0 shadow-lg">
                                    <BookCover url={book.cover_url} title={book.title} aspectRatio="aspect-[2/3]" className="rounded-lg" />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-tight line-clamp-1">{book.title}</h4>
                                        <p className="text-[10px] text-muted-foreground font-bold">{Math.round(book.progress?.percentage || 0)}% {t('completed')}</p>
                                    </div>
                                    <Progress value={book.progress?.percentage || 0} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default StatsPage;
