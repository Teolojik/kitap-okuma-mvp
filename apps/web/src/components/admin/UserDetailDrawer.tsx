
import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import {
    User,
    Mail,
    Calendar,
    Shield,
    Zap,
    Monitor,
    Clock,
    BookOpen,
    PieChart,
    ChevronRight,
    Smartphone
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { getBrowserInfo, getPlatformInfo } from '@/lib/utils';
import ActivityStream from './ActivityStream';

interface UserDetailDrawerProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
    logs: any[];
    userBooks: any[];
    t: (key: any) => string;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ user, isOpen, onClose, logs, userBooks, t }) => {
    if (!user) return null;

    const userStats = user.stats || {};
    const totalPages = userStats.totalPagesRead || 0;
    const totalTime = Math.floor((userStats.totalReadingTime || 0) / 60); // minutes
    const streak = userStats.currentStreak || userStats.streak || 0;
    const booksCount = Array.isArray(userBooks) ? userBooks.length : 0;
    const hasStatsData =
        totalPages > 0 ||
        totalTime > 0 ||
        streak > 0 ||
        Object.keys(userStats.bookTime || {}).length > 0 ||
        Object.values(userStats.dailyPages || {}).some((value: any) => Number(value) > 0);

    const noDataText = t('noDataAvailable');
    const totalPagesValue = hasStatsData ? totalPages : noDataText;
    const readingTimeValue = hasStatsData ? `${totalTime} ${t('minutes')}` : noDataText;
    const streakValue = hasStatsData ? `${streak} ${t('days')}` : noDataText;
    const booksValue = booksCount;

    // Filter logs for this specific user
    const userLogs = logs.filter(log => log.target_id === user.id || log.details?.userId === user.id);

    // Online Status Logic (Active in last 15 mins)
    const lastSeen = user.stats?.deviceInfo?.lastSeen;
    const isOnline = lastSeen && (new Date().getTime() - new Date(lastSeen).getTime() < 15 * 60 * 1000);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="sm:max-w-xl w-full p-0 border-l border-border/40 bg-background/95 backdrop-blur-3xl overflow-hidden flex flex-col">
                <SheetHeader className="p-8 pb-4 text-left">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="relative">
                            <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center font-black text-2xl text-primary border border-primary/20">
                                {(user.name || user.email || 'U')[0].toUpperCase()}
                            </div>
                            <div className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-[3px] border-background ${isOnline ? 'bg-green-500' : 'bg-muted-foreground/30'} flex items-center justify-center`}>
                                {isOnline && <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <SheetTitle className="text-2xl font-black tracking-tight">{user.display_name}</SheetTitle>
                            <SheetDescription className="flex items-center gap-2 font-medium">
                                <Mail className="h-3 w-3" /> {user.display_email}
                            </SheetDescription>
                            <div className="flex items-center gap-2 text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">
                                <span className={isOnline ? 'text-green-500' : ''}>{isOnline ? t('online') : t('offline')}</span>
                                {lastSeen && (
                                    <>
                                        <span>•</span>
                                        <span>{t('lastSeen')}: {new Date(lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Badge variant="secondary" className="rounded-xl px-4 py-1.5 font-black uppercase tracking-widest text-[10px] bg-primary/5 text-primary border-primary/10">
                            {user.role || 'Reader'}
                        </Badge>
                        <Badge variant="outline" className={`rounded-xl px-4 py-1.5 font-black uppercase tracking-widest text-[10px] ${user.status === 'Banned' ? 'text-red-500 border-red-500/20 bg-red-500/5' : 'text-green-500 border-green-500/20 bg-green-500/5'}`}>
                            {user.status || 'Active'}
                        </Badge>
                    </div>
                </SheetHeader>

                <ScrollArea className="flex-1 px-8 pb-8">
                    <div className="space-y-10">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: t('totalPages'), value: totalPagesValue, icon: BookOpen, color: 'text-blue-500' },
                                { label: t('readingTime'), value: readingTimeValue, icon: Clock, color: 'text-orange-500' },
                                { label: t('streak'), value: streakValue, icon: Zap, color: 'text-yellow-500' },
                                { label: t('totalBooks'), value: booksValue, icon: PieChart, color: 'text-purple-500' },
                            ].map((stat) => (
                                <div key={stat.label} className="p-4 rounded-3xl bg-secondary/10 border border-border/5 group hover:bg-secondary/20 transition-all text-left">
                                    <stat.icon className={`h-4 w-4 ${stat.color} mb-3`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
                                    <p className={`font-black tracking-tighter ${stat.value === noDataText ? 'text-xs text-muted-foreground/70 uppercase tracking-wider' : 'text-xl'}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>

                        {/* User Library Section */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <BookOpen className="h-3 w-3" /> {t('userLibrary')} <span className="opacity-50">({userBooks?.length || 0})</span>
                            </h4>
                            <div className="space-y-3">
                                {userBooks && userBooks.length > 0 ? (
                                    userBooks.map((book) => {
                                        const progress = book.progress?.percentage || 0;
                                        const isFinished = progress >= 100;
                                        return (
                                            <div key={book.id} className="flex items-center gap-4 p-3 rounded-2xl bg-secondary/5 border border-border/10">
                                                <div className="h-12 w-8 bg-muted rounded shadow-sm overflow-hidden flex-shrink-0">
                                                    {book.cover_url ? (
                                                        <img src={book.cover_url} alt={book.title} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary text-[8px] font-black">
                                                            {(book.title || '?')[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h5 className="text-xs font-bold truncate">{book.title}</h5>
                                                    <p className="text-[10px] text-muted-foreground truncate">{book.author || t('unknownAuthor')}</p>
                                                </div>
                                                <div className="text-right">
                                                    <Badge variant={isFinished ? 'default' : 'secondary'} className="text-[9px] h-5 rounded-md px-1.5 font-bold">
                                                        {isFinished ? t('completed') : progress > 0 ? `${progress.toFixed(0)}%` : t('notStarted')}
                                                    </Badge>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="p-6 text-center rounded-2xl bg-secondary/5 border border-border/10 border-dashed">
                                        <p className="text-xs text-muted-foreground font-medium">{t('noBooksFound')}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Reading Habits Section */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Zap className="h-3 w-3" /> {t('adminReadingHabits')}
                            </h4>
                            <div className="p-6 rounded-[2rem] bg-secondary/5 border border-border/20 space-y-6">
                                {/* Heatmap using Real Data */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1 text-left">
                                        <p className="text-xs font-bold">{t('last7Days')}</p>
                                        <p className="text-[10px] text-muted-foreground">{t('weeklyActivityDesc')}</p>
                                    </div>
                                    <ChevronRight className="h-4 w-4 opacity-20" />
                                </div>

                                <div className="h-24 flex items-end justify-between gap-1">
                                    {/* Generate last 7 days bars */}
                                    {(() => {
                                        const dailyPages = user.stats?.dailyPages || {};
                                        const days = [];
                                        const today = new Date();

                                        for (let i = 6; i >= 0; i--) {
                                            const d = new Date(today);
                                            d.setDate(today.getDate() - i);
                                            // Format to YYYY-MM-DD to match storage key
                                            // Note: date-fns format or manual. useStore uses 'en-CA' for YYYY-MM-DD
                                            const dateKey = d.toLocaleDateString('en-CA');
                                            days.push({
                                                date: d,
                                                label: d.toLocaleDateString('tr-TR', { weekday: 'short' }),
                                                count: dailyPages[dateKey] || 0
                                            });
                                        }

                                        const maxCount = Math.max(...days.map(d => d.count), 0);
                                        if (maxCount === 0) {
                                            return (
                                                <div className="h-full w-full flex items-center justify-center">
                                                    <p className="text-xs text-muted-foreground font-medium">{noDataText}</p>
                                                </div>
                                            );
                                        }
                                        const max = Math.max(maxCount, 10); // Minimum scale of 10 to avoid full bars for 1 page

                                        return days.map((day, i) => (
                                            <div key={i} className="flex flex-col items-center gap-2 w-full group relative">
                                                <div className="relative w-full flex items-end justify-center h-16 rounded-t-sm overflow-visible">
                                                    <div
                                                        className="w-2 bg-primary/40 rounded-full transition-all group-hover:bg-primary group-hover:w-3 relative"
                                                        style={{ height: `${Math.max((day.count / max) * 100, 5)}%` }} // Min 5% height
                                                    >
                                                        {/* Tooltip */}
                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-[9px] font-bold px-2 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                                            {day.count} {t('pages')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-black opacity-30 uppercase">{day.label}</span>
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* System Info - Real Data */}
                        <div className="space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Monitor className="h-3 w-3" /> {t('adminDeviceSystem')}
                            </h4>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-bold">{
                                        (() => {
                                            const stats = user.stats?.deviceInfo || {};
                                            // Function to get icon or just text? Text for now.
                                            // If we have stats.platform, we invoke getPlatformInfo to ensure it's clean if it was raw, 
                                            // or just return it if it's already clean (the util handles cleanup nicely)
                                            return getPlatformInfo(stats.userAgent || '', stats.platform) || t('unknownPlatform');
                                        })()
                                    }</span>
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground/60 overflow-hidden text-ellipsis max-w-[120px]" title={user.stats?.deviceInfo?.userAgent}>
                                    {(() => {
                                        const stats = user.stats?.deviceInfo || {};
                                        // Prefer 'browser' field if exists (new data), otherwise parse userAgent (old data)
                                        return stats.browser || getBrowserInfo(stats.userAgent || '') || t('browser');
                                    })()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/5 border border-border/10">
                                <div className="flex items-center gap-3">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-bold">{t('memberSince')}</span>
                                </div>
                                <span className="text-[10px] font-black text-muted-foreground/60">
                                    {new Date(user.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        {/* Recent Activity Timeline for User */}
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                                <Clock className="h-3 w-3" /> {t('adminActivityTimeline')}
                            </h4>
                            <ActivityStream logs={userLogs} t={t} />
                        </div>
                    </div>
                </ScrollArea>

                <div className="p-8 border-t border-border/40 bg-background/50 flex gap-3">
                    <Badge variant="outline" className="ml-auto opacity-40 font-mono text-[9px] uppercase tracking-tighter">
                        UUID: {user.id}
                    </Badge>
                </div>
            </SheetContent>
        </Sheet >
    );
};

export default UserDetailDrawer;
