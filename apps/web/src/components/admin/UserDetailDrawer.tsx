
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
import ActivityStream from './ActivityStream';

interface UserDetailDrawerProps {
    user: any;
    isOpen: boolean;
    onClose: () => void;
    logs: any[];
    t: (key: any) => string;
}

const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({ user, isOpen, onClose, logs, t }) => {
    if (!user) return null;

    const userStats = user.stats || {};
    const totalPages = userStats.totalPages || 0;
    const totalTime = Math.floor((userStats.totalTime || 0) / 60); // minutes
    const streak = userStats.streak || 0;
    const booksCount = Object.keys(userStats.bookTime || {}).length;

    // Filter logs for this specific user
    const userLogs = logs.filter(log => log.target_id === user.id || log.details?.userId === user.id);

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="sm:max-w-xl w-full p-0 border-l border-border/40 bg-background/95 backdrop-blur-3xl overflow-hidden flex flex-col">
                <SheetHeader className="p-8 pb-4 text-left">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="h-16 w-16 rounded-3xl bg-primary/10 flex items-center justify-center font-black text-2xl text-primary border border-primary/20">
                            {(user.name || user.email || 'U')[0].toUpperCase()}
                        </div>
                        <div className="space-y-1">
                            <SheetTitle className="text-2xl font-black tracking-tight">{user.display_name}</SheetTitle>
                            <SheetDescription className="flex items-center gap-2 font-medium">
                                <Mail className="h-3 w-3" /> {user.display_email}
                            </SheetDescription>
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
                                { label: t('totalPages'), value: totalPages, icon: BookOpen, color: 'text-blue-500' },
                                { label: t('readingTime'), value: `${totalTime} ${t('minutes')}`, icon: Clock, color: 'text-orange-500' },
                                { label: t('streak'), value: `${streak} ${t('days')}`, icon: Zap, color: 'text-yellow-500' },
                                { label: t('totalBooks'), value: booksCount, icon: PieChart, color: 'text-purple-500' },
                            ].map((stat) => (
                                <div key={stat.label} className="p-4 rounded-3xl bg-secondary/10 border border-border/5 group hover:bg-secondary/20 transition-all text-left">
                                    <stat.icon className={`h-4 w-4 ${stat.color} mb-3`} />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">{stat.label}</p>
                                    <p className="text-xl font-black tracking-tighter">{stat.value}</p>
                                </div>
                            ))}
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

                                        const max = Math.max(...days.map(d => d.count), 10); // Minimum scale of 10 to avoid full bars for 1 page

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
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/5 border border-border/10">
                                    <div className="flex items-center gap-3">
                                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-bold">{
                                            (user.stats?.deviceInfo?.platform || 'Unknown Platform')
                                        }</span>
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground/60 overflow-hidden text-ellipsis max-w-[120px]" title={user.stats?.deviceInfo?.userAgent}>
                                        {(() => {
                                            const ua = user.stats?.deviceInfo?.userAgent || 'Unknown';
                                            if (ua.includes('Win')) return 'Windows';
                                            if (ua.includes('Mac')) return 'MacOS';
                                            if (ua.includes('Android')) return 'Android';
                                            if (ua.includes('iPhone')) return 'iPhone';
                                            if (ua.includes('Linux')) return 'Linux';
                                            return 'Browser';
                                        })()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-secondary/5 border border-border/10">
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-xs font-bold">Member Since</span>
                                    </div>
                                    <span className="text-[10px] font-black text-muted-foreground/60">{new Date(user.created_at).toLocaleDateString()}</span>
                                </div>
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
        </Sheet>
    );
};

export default UserDetailDrawer;
