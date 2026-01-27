import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuthStore, useBookStore } from '@/stores/useStore';
import {
    Home,
    Compass,
    Bookmark,
    Settings,
    LogOut,
    Hand,
    Search,
    ChevronLeft,
    ChevronRight,
    Sun,
    Moon,
    BarChart2,
    WifiOff,
    User,
    ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import SearchModal from './reader/SearchModal';
import CommandPalette from './CommandPalette';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, Languages } from 'lucide-react';

import { useTranslation } from '@/lib/translations';
import AnnouncementBanner from './AnnouncementBanner';

export default function Layout() {
    const { user, signOut } = useAuthStore();
    const { settings, setSettings, guestLimitTrigger } = useBookStore();
    const t = useTranslation(settings.language);
    const location = useLocation();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const isReadMode = location.pathname.includes('/read/');
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    const currentAppName = "Epigraph";

    const navItems = [
        { href: '/', label: t('library'), icon: Home },
        { href: '/discover', label: t('discover'), icon: Compass },
        { href: '/profile', label: t('profile'), icon: User },
        { href: '/stats', label: t('stats'), icon: BarChart2 },
    ];

    const isAdmin = user?.user_metadata?.role === 'admin' ||
        user?.email === 'support@epigraph.app' ||
        user?.email === 'blocking_saxsafon@hotmail.com';

    const finalNavItems = isAdmin
        ? [...navItems, { href: '/admin', label: t('adminTitle'), icon: ShieldCheck }]
        : navItems;

    // Online/Offline status listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl/Meta + K -> Search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsSearchOpen(true);
            }
            // Alt + K -> Command Palette
            if (e.altKey && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                setIsCommandPaletteOpen(true);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className={`min-h-screen bg-background flex flex-col font-sans selection:bg-primary/20 selection:text-primary overflow-hidden transition-colors duration-700 theme-${settings.theme}`}>
            <AnnouncementBanner />
            <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
                {/* Professional Sidebar (Desktop) */}
                <TooltipProvider delayDuration={0}>
                    <motion.aside
                        initial={false}
                        animate={{ width: isExpanded ? 240 : 80 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="hidden md:flex flex-col border-r border-border/40 bg-card/5 backdrop-blur-xl relative z-40 h-screen transition-colors duration-500"
                    >
                        {/* Logo Area */}
                        <div className="p-6 flex items-center gap-4 h-24 overflow-hidden border-b border-border/10">
                            <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner group cursor-pointer hover:bg-primary transition-colors duration-500">
                                <Hand className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors stroke-[1.5]" />
                            </div>
                            <AnimatePresence mode="wait">
                                {isExpanded && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="font-black text-xl tracking-tighter whitespace-nowrap"
                                    >
                                        {currentAppName.substring(0, currentAppName.length - 3)}
                                        <span className="text-primary">{currentAppName.substring(currentAppName.length - 3)}</span>
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Navigation Items */}
                        <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto no-scrollbar">
                            {/* Search Trigger */}
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <button
                                        onClick={() => setIsSearchOpen(true)}
                                        className={`w-full flex items-center gap-4 p-3 rounded-2xl transition-all duration-300 group hover:bg-secondary/50 overflow-hidden text-left`}
                                    >
                                        <div className="h-10 w-10 shrink-0 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                                            <Search className="h-5 w-5 stroke-[1.5]" />
                                        </div>
                                        <AnimatePresence mode="wait">
                                            {isExpanded && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -10 }}
                                                    className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground group-hover:text-foreground whitespace-nowrap"
                                                >
                                                    {t('quickSearch')}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>
                                    </button>
                                </TooltipTrigger>
                                {!isExpanded && (
                                    <TooltipContent side="right" className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl">
                                        {t('quickSearch')}
                                    </TooltipContent>
                                )}
                            </Tooltip>

                            <Separator className="my-4 opacity-10 mx-auto w-10" />

                            {finalNavItems.map(item => {
                                const isActive = location.pathname === item.href;
                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link to={item.href} className="block relative group overflow-hidden">
                                                <div className={`flex items-center gap-4 p-3 rounded-[1.5rem] transition-all duration-500 group relative ${isActive
                                                    ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/30'
                                                    : 'text-muted-foreground hover:bg-secondary'
                                                    }`}>
                                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center relative z-10">
                                                        <item.icon className={`h-5 w-5 stroke-[1.5] transition-transform duration-500 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                                                    </div>
                                                    <AnimatePresence mode="wait">
                                                        {isExpanded && (
                                                            <motion.span
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                className="font-black text-[11px] uppercase tracking-[0.2em] whitespace-nowrap"
                                                            >
                                                                {item.label}
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="active-indicator"
                                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full shadow-lg shadow-primary z-20"
                                                    />
                                                )}
                                            </Link>
                                        </TooltipTrigger>
                                        {!isExpanded && (
                                            <TooltipContent side="right" className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl">
                                                {item.label}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                );
                            })}

                            <Separator className="my-4 opacity-10 mx-auto w-10 shrink-0" />
                        </nav>

                        {/* Bottom Section */}
                        <div className="p-4 space-y-4 overflow-hidden">
                            <Separator className="opacity-10" />

                            {/* Theme Toggle */}
                            <DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <button className="w-full flex items-center gap-4 p-3 rounded-[1.5rem] transition-all duration-500 group text-muted-foreground hover:bg-secondary">
                                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center">
                                                        <AnimatePresence mode="wait">
                                                            {settings.theme === 'light' && (
                                                                <motion.div key="sun" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                                                                    <Sun className="h-5 w-5 stroke-[1.5] text-orange-400" />
                                                                </motion.div>
                                                            )}
                                                            {settings.theme === 'sepia' && (
                                                                <motion.div key="sepia" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                                                                    <Sun className="h-5 w-5 stroke-[1.5] text-[#433422]" />
                                                                </motion.div>
                                                            )}
                                                            {settings.theme === 'dark' && (
                                                                <motion.div key="moon" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                                                                    <Moon className="h-5 w-5 stroke-[1.5] text-blue-500" />
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                    <AnimatePresence mode="wait">
                                                        {isExpanded && (
                                                            <motion.span
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                className="font-black text-[11px] uppercase tracking-[0.2em] whitespace-nowrap text-left"
                                                            >
                                                                {t('activeTheme', { theme: settings.theme === 'light' ? t('light') : settings.theme === 'sepia' ? t('sepia') : t('dark') })}
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        {!isExpanded && (
                                            <TooltipContent side="right" className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl">
                                                {t('themeDiscovery')}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                                <DropdownMenuContent side="right" align="end" className="w-48 rounded-[2rem] p-2 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                                    {[
                                        { id: 'light', label: t('lightMode'), icon: Sun, color: 'text-orange-400' },
                                        { id: 'sepia', label: t('sepiaMode'), icon: Sun, color: 'text-[#433422]' },
                                        { id: 'dark', label: t('darkMode'), icon: Moon, color: 'text-blue-500' },
                                    ].map((t) => (
                                        <DropdownMenuItem
                                            key={t.id}
                                            onClick={() => setSettings({ theme: t.id as any })}
                                            className="flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-secondary transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <t.icon className={`h-4 w-4 ${t.color}`} />
                                                <span className="text-[11px] font-black uppercase tracking-widest">{t.label}</span>
                                            </div>
                                            {settings.theme === t.id && <Check className="h-4 w-4 text-primary" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Language Toggle */}
                            <DropdownMenu>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <DropdownMenuTrigger asChild>
                                                <button className="w-full flex items-center gap-4 p-3 rounded-[1.5rem] text-muted-foreground hover:bg-secondary transition-all overflow-hidden relative group">
                                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center group-hover:rotate-12 transition-transform">
                                                        <Languages className="h-5 w-5 stroke-[1.5]" />
                                                    </div>
                                                    <AnimatePresence mode="wait">
                                                        {isExpanded && (
                                                            <motion.span
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                className="font-black text-[11px] uppercase tracking-[0.2em] whitespace-nowrap"
                                                            >
                                                                {settings.language === 'tr' ? 'Türkçe' : 'English'}
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </button>
                                            </DropdownMenuTrigger>
                                        </TooltipTrigger>
                                        {!isExpanded && (
                                            <TooltipContent side="right" className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl">
                                                {t('language')}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                                <DropdownMenuContent side="right" align="end" className="w-48 rounded-[2rem] p-2 bg-background/95 backdrop-blur-xl border-border/50 shadow-2xl">
                                    {[
                                        { id: 'tr', label: 'Türkçe' },
                                        { id: 'en', label: 'English' },
                                    ].map((l) => (
                                        <DropdownMenuItem
                                            key={l.id}
                                            onClick={() => setSettings({ language: l.id as 'tr' | 'en' })}
                                            className="flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-secondary transition-colors"
                                        >
                                            <span className="text-[11px] font-black uppercase tracking-widest">{l.label}</span>
                                            {settings.language === l.id && <Check className="h-4 w-4 text-primary" />}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Settings Link */}
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link to="/settings" className="block group">
                                            <div className={`flex items-center gap-4 p-3 rounded-[1.5rem] transition-all duration-500 relative ${location.pathname === '/settings'
                                                ? 'bg-primary text-primary-foreground shadow-2xl shadow-primary/30'
                                                : 'text-muted-foreground hover:bg-secondary'
                                                }`}>
                                                <div className="h-10 w-10 shrink-0 flex items-center justify-center relative z-10">
                                                    <Settings className={`h-5 w-5 stroke-[1.5] ${location.pathname === '/settings' ? '' : 'group-hover:rotate-90 transition-transform duration-500'}`} />
                                                </div>
                                                <AnimatePresence mode="wait">
                                                    {isExpanded && (
                                                        <motion.span
                                                            initial={{ opacity: 0, x: -10 }}
                                                            animate={{ opacity: 1, x: 0 }}
                                                            exit={{ opacity: 0, x: -10 }}
                                                            className="font-black text-[11px] uppercase tracking-[0.2em] whitespace-nowrap"
                                                        >
                                                            {t('settings')}
                                                        </motion.span>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </Link>
                                    </TooltipTrigger>
                                    {!isExpanded && (
                                        <TooltipContent side="right" className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl">
                                            {t('settings')}
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>

                            {/* User Profile / Login */}
                            {!user ? (
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <motion.div
                                                animate={guestLimitTrigger > 0 ? {
                                                    x: [0, -10, 10, -10, 10, 0],
                                                    scale: [1, 1.15, 1],
                                                } : {}}
                                                className="w-full"
                                            >
                                                <Link to="/login" className="w-full flex items-center gap-4 p-3 rounded-[1.5rem] bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all duration-500 overflow-hidden group border border-primary/20 shadow-lg shadow-primary/5">
                                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center">
                                                        <LogOut className="h-5 w-5 rotate-180 stroke-[2]" />
                                                    </div>
                                                    <AnimatePresence mode="wait">
                                                        {isExpanded && (
                                                            <motion.span
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                className="font-black text-[11px] uppercase tracking-[0.2em] whitespace-nowrap"
                                                            >
                                                                {t('login')}
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </Link>
                                            </motion.div>
                                        </TooltipTrigger>
                                        {!isExpanded && (
                                            <TooltipContent side="right" className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl">
                                                {t('login')}
                                            </TooltipContent>
                                        )}
                                    </Tooltip>
                                </TooltipProvider>
                            ) : (
                                <div className="space-y-4">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex items-center gap-4 p-2 rounded-[2rem] bg-secondary/20 hover:bg-secondary/40 transition-all duration-500 cursor-pointer group overflow-hidden">
                                                    <Avatar className="h-10 w-10 shrink-0 ring-2 ring-transparent group-hover:ring-primary/20 transition-all shadow-xl">
                                                        <AvatarImage src={user?.user_metadata?.avatar_url} />
                                                        <AvatarFallback className="bg-primary/10 text-primary font-black text-xs">
                                                            {(user?.user_metadata?.name || user?.email)?.[0]?.toUpperCase() || 'U'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <AnimatePresence mode="wait">
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                className="flex flex-col min-w-0"
                                                            >
                                                                <span className="text-[10px] font-black uppercase tracking-widest truncate">{user?.user_metadata?.name || user?.email?.split('@')[0]}</span>
                                                                <span className="text-[8px] text-muted-foreground font-bold truncate opacity-50 uppercase tracking-tighter">{t('premiumMember')}</span>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </TooltipTrigger>
                                            {!isExpanded && (
                                                <TooltipContent side="right" className="bg-primary text-primary-foreground font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl">
                                                    {t('profile')}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>

                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    className="w-full justify-start gap-4 rounded-[1.5rem] h-auto p-3 text-muted-foreground hover:text-red-500 hover:bg-red-500/5 group overflow-hidden"
                                                    onClick={() => signOut()}
                                                >
                                                    <div className="h-10 w-10 shrink-0 flex items-center justify-center border border-transparent group-hover:border-red-500/20 rounded-full transition-all">
                                                        <LogOut className="h-5 w-5 stroke-[1.5]" />
                                                    </div>
                                                    <AnimatePresence mode="wait">
                                                        {isExpanded && (
                                                            <motion.span
                                                                initial={{ opacity: 0, x: -10 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                exit={{ opacity: 0, x: -10 }}
                                                                className="font-black text-[11px] uppercase tracking-[0.2em] whitespace-nowrap"
                                                            >
                                                                {t('logout')}
                                                            </motion.span>
                                                        )}
                                                    </AnimatePresence>
                                                </Button>
                                            </TooltipTrigger>
                                            {!isExpanded && (
                                                <TooltipContent side="right" className="bg-red-500 text-white font-black text-[10px] uppercase tracking-widest py-1.5 px-3 rounded-xl border-none shadow-2xl shadow-red-500/20">
                                                    {t('logout')}
                                                </TooltipContent>
                                            )}
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            )}
                        </div>

                        {/* Expand Toggle Button */}
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="absolute -right-3 top-10 h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-95 transition-all z-50 hover:scale-110"
                        >
                            {isExpanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </motion.aside>
                </TooltipProvider>

                {/* Main Content */}
                <main className="flex-1 overflow-auto h-screen relative bg-background/50 transition-colors duration-700">
                    {/* Offline Indicator */}
                    <AnimatePresence>
                        {!isOnline && (
                            <motion.div
                                initial={{ y: -50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: -50, opacity: 0 }}
                                className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-2 rounded-full bg-red-500/90 text-white text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 border border-white/20"
                            >
                                <WifiOff className="h-3.5 w-3.5" />
                                {t('offlineMode')}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Atmospheric Glow */}
                    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none -z-10 opacity-30">
                        <div className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] rounded-full blur-[120px] bg-primary/20 animate-pulse duration-[10000ms]" />
                        <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] rounded-full blur-[100px] bg-primary/10 animate-pulse duration-[8000ms]" />
                    </div>

                    {isReadMode ? (
                        <Outlet />
                    ) : (
                        <div className="container mx-auto p-4 md:p-12 max-w-7xl relative z-10">
                            <Outlet />
                        </div>
                    )}
                </main>
            </div>

            {/* Mobile Bottom Nav */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/80 backdrop-blur-xl p-3 flex justify-around items-center z-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                {finalNavItems.map(item => (
                    <Link key={item.href} to={item.href} className="flex flex-col items-center p-2 rounded-2xl relative">
                        <item.icon className={`h-6 w-6 stroke-[1.5] ${location.pathname === item.href ? 'text-primary' : 'text-muted-foreground'}`} />
                    </Link>
                ))}
                <Link to="/settings" className="p-2">
                    <Settings className={`h-6 w-6 stroke-[1.5] ${location.pathname === '/settings' ? 'text-primary' : 'text-muted-foreground'}`} />
                </Link>
                {user && (
                    <button
                        onClick={() => signOut()}
                        className="p-2"
                    >
                        <LogOut className="h-6 w-6 text-muted-foreground" />
                    </button>
                )}
            </nav>

            {/* Global Search Modal */}
            <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

            {/* Command Palette */}
            <CommandPalette
                isOpen={isCommandPaletteOpen}
                onClose={() => setIsCommandPaletteOpen(false)}
            />


        </div>
    );
}
