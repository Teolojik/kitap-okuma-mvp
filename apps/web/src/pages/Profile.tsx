
import React from 'react';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookOpen, Award, Settings, Heart, Library } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { cleanTitle, cleanAuthor } from '@/lib/metadata-utils';
import { useTranslation } from '@/lib/translations';
import ReadingHeatmap from '@/components/stats/ReadingHeatmap';

const ProfilePage = () => {
    const { user } = useAuthStore();
    const { books, stats, settings } = useBookStore();
    const t = useTranslation(settings.language);

    const favoriteBooks = books.filter(b => b.is_favorite);

    return (
        <div className="space-y-10 pb-20 animate-in fade-in duration-700">
            {/* Header / Banner Area */}
            <div className="relative rounded-[3rem] overflow-hidden bg-gradient-to-r from-primary/20 via-primary/5 to-transparent border border-primary/10 p-8 md:p-12">
                <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                    <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
                        <AvatarImage src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id || 'd1'}&backgroundColor=e5e7eb`} />
                        <AvatarFallback className="text-4xl font-black">{user?.name?.[0] || t('userInitial')}</AvatarFallback>
                    </Avatar>
                    <div className="text-center md:text-left space-y-2">
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <h1 className="text-4xl font-black tracking-tight">{user?.name || t('userLabel')}</h1>
                            <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                {t('premiumMember')}
                            </span>
                        </div>
                        <p className="text-muted-foreground font-medium max-w-md italic">
                            "{t('quotePlaceholder')}"
                        </p>
                        <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                            <Link to="/settings">
                                <Button variant="secondary" size="sm" className="rounded-full px-6 gap-2">
                                    <Settings className="h-4 w-4" /> {t('editProfile')}
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Background Decoration */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                {/* Stats Summary Column */}
                <div className="space-y-6">
                    <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground px-2">{t('summaryInfo')}</h2>

                    <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden">
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                                    <BookOpen className="h-5 w-5 text-blue-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black tabular-nums leading-none">{books.length}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('library')}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-red-500/10 flex items-center justify-center">
                                    <Heart className="h-5 w-5 text-red-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black tabular-nums leading-none">{favoriteBooks.length}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('favorites')}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-orange-500/10 flex items-center justify-center">
                                    <Award className="h-5 w-5 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-2xl font-black tabular-nums leading-none">{stats.currentStreak} {t('days')}</p>
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('streak')}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Badges / Achievements */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground px-2">{t('achievements')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {(() => {
                                const BADGES: any = {
                                    'kitap-kurdu': { icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-500/10', titleKey: 'achievementKitapKurduTitle', descKey: 'achievementKitapKurduDesc' },
                                    'usta-okur': { icon: Award, color: 'text-purple-500', bg: 'bg-purple-500/10', titleKey: 'achievementUstaOkurTitle', descKey: 'achievementUstaOkurDesc' },
                                    'gece-kusu': { icon: Heart, color: 'text-indigo-500', bg: 'bg-indigo-500/10', titleKey: 'achievementGeceKusuTitle', descKey: 'achievementGeceKusuDesc' },
                                    'seri-okuyucu': { icon: Award, color: 'text-orange-500', bg: 'bg-orange-500/10', titleKey: 'achievementSeriOkuyucuTitle', descKey: 'achievementSeriOkuyucuDesc' },
                                };

                                const userBadges = stats.achievements || [];

                                if (userBadges.length === 0) {
                                    return (
                                        <Card className="col-span-2 rounded-[2rem] border-dashed border-border/50 bg-secondary/20 p-6 text-center">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('locked')}</p>
                                            <p className="text-[9px] text-muted-foreground/50 mt-1">{t('achievementsDesc')}</p>
                                        </Card>
                                    );
                                }

                                return userBadges.map((badge) => {
                                    const meta = BADGES[badge.id] || { icon: Award, color: 'text-primary', bg: 'bg-primary/10', titleKey: 'unknown', descKey: 'unknown' };
                                    const Icon = meta.icon;
                                    return (
                                        <Card key={badge.id} className={`rounded-[2rem] border-border/50 ${meta.bg} shadow-none p-4 flex flex-col items-center text-center gap-3`}>
                                            <div className={`h-10 w-10 rounded-full bg-background flex items-center justify-center shadow-sm ${meta.color}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="font-black text-[10px] uppercase tracking-widest text-foreground/80">{t(meta.titleKey)}</p>
                                                <p className="text-[9px] text-muted-foreground/70 font-medium leading-tight mt-1">{t(meta.descKey)}</p>
                                            </div>
                                        </Card>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                </div>

                {/* Heatmap and Favorites Column */}
                <div className="md:col-span-2 space-y-10">
                    <Card className="rounded-[3rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-sm overflow-hidden p-8 px-10">
                        <ReadingHeatmap data={stats.dailyPages} language={settings.language} />
                        <div className="mt-4 pt-4 border-t border-primary/5 text-center">
                            <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-[0.2em]">
                                {t('startReadingHint') || 'Okuma yaparak ısı haritasını canlandırabilirsin.'}
                            </p>
                        </div>
                    </Card>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">{t('favoriteBooks')}</h2>
                            <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline transition-all">{t('viewAll')}</Link>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                            {favoriteBooks.length > 0 ? (
                                favoriteBooks.map((book) => (
                                    <motion.div
                                        key={book.id}
                                        whileHover={{ y: -5 }}
                                        className="group relative"
                                    >
                                        <Link to={`/read/${book.id}`}>
                                            <div className="aspect-[2/3.2] rounded-2xl overflow-hidden shadow-lg border border-border/50 bg-secondary relative">
                                                {book.cover_url ? (
                                                    <img src={book.cover_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                                                        <span className="font-serif text-[10px] font-bold line-clamp-2">{cleanTitle(book.title)}</span>
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <div className="absolute bottom-3 left-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                                    <Button size="icon" className="h-8 w-8 rounded-full shadow-2xl">
                                                        <BookOpen className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="mt-3">
                                                <h3 className="text-xs font-bold line-clamp-1">{cleanTitle(book.title)}</h3>
                                                <p className="text-[10px] text-muted-foreground font-medium">{cleanAuthor(book.author)}</p>
                                            </div>
                                        </Link>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 bg-secondary/20 rounded-[2.5rem] border border-dashed border-border flex flex-col items-center justify-center text-center px-6">
                                    <Library className="h-10 w-10 text-muted-foreground/30 mb-4" />
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('noFavoritesYet')}</p>
                                    <p className="text-[10px] text-muted-foreground/60 max-w-[200px]">{t('addFavoritesHint')}</p>
                                    <Link to="/" className="mt-6">
                                        <Button variant="outline" size="sm" className="rounded-full px-6 text-[10px] font-black uppercase tracking-widest">{t('goToLibrary')}</Button>
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;
