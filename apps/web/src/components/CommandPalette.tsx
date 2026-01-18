import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, useBookStore } from '@/stores/useStore';
import {
    Command,
    Search,
    Home,
    Compass,
    Settings,
    BarChart2,
    Sun,
    Moon,
    Monitor,
    LogOut,
    BookOpen,
    Laptop,
    ChevronRight,
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/translations';

interface CommandPaletteProps {
    isOpen: boolean;
    onClose: () => void;
}

interface CommandItem {
    id: string;
    label: string;
    icon: any;
    category: string;
    shortcut?: string;
    action: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { signOut } = useAuthStore();
    const { settings, setSettings, books } = useBookStore();
    const t = useTranslation(settings.language);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const commands: CommandItem[] = [
        // Navigation
        { id: 'nav-home', label: t('goToLibraryCommand'), icon: Home, category: t('navigation'), shortcut: 'G L', action: () => { navigate('/'); onClose(); } },
        { id: 'nav-discover', label: t('discoverPage'), icon: Compass, category: t('navigation'), shortcut: 'G D', action: () => { navigate('/discover'); onClose(); } },
        { id: 'nav-stats', label: t('viewStats'), icon: BarChart2, category: t('navigation'), shortcut: 'G S', action: () => { navigate('/stats'); onClose(); } },
        { id: 'nav-settings', label: t('settings'), icon: Settings, category: t('navigation'), shortcut: 'G A', action: () => { navigate('/settings'); onClose(); } },

        // Actions
        { id: 'action-search', label: t('searchInBooks'), icon: Search, category: t('actions'), shortcut: 'Ctrl K', action: () => { onClose(); /* Logic to open search modal handled in Layout */ } },
        { id: 'action-logout', label: t('closeSession'), icon: LogOut, category: t('actions'), shortcut: '⇧ L', action: () => { signOut(); onClose(); } },

        // Appearance
        { id: 'theme-light', label: t('switchToLightMode'), icon: Sun, category: t('appearance'), action: () => { setSettings({ theme: 'light' }); onClose(); } },
        { id: 'theme-dark', label: t('switchToDarkMode'), icon: Moon, category: t('appearance'), action: () => { setSettings({ theme: 'dark' }); onClose(); } },
        { id: 'theme-sepia', label: t('switchToSepiaMode'), icon: Monitor, category: t('appearance'), action: () => { setSettings({ theme: 'sepia' }); onClose(); } },
    ];

    // Add recent books to commands
    const recentBooks: CommandItem[] = books.slice(0, 3).map(book => ({
        id: `book-${book.id}`,
        label: t('continueReadingBook', { title: book.title }),
        icon: BookOpen,
        category: t('recentReads'),
        action: () => { navigate(`/read/${book.id}`); onClose(); }
    }));

    const allCommands = [...recentBooks, ...commands];
    const filteredCommands = allCommands.filter(c =>
        c.label.toLowerCase().includes(search.toLowerCase()) ||
        c.category.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setSearch('');
            setSelectedIndex(0);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % (filteredCommands.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + (filteredCommands.length || 1)) % (filteredCommands.length || 1));
            } else if (e.key === 'Enter' && filteredCommands[selectedIndex]) {
                e.preventDefault();
                filteredCommands[selectedIndex].action();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredCommands, selectedIndex]);

    const categories = Array.from(new Set(filteredCommands.map(c => c.category)));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 border-none bg-transparent shadow-none top-[20%] translate-y-0 overflow-visible">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    className="bg-card/80 backdrop-blur-3xl border border-border/50 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden transition-colors duration-500"
                >
                    {/* Search Input Area */}
                    <div className="p-6 border-b border-border/30 relative flex items-center gap-4 bg-primary/5">
                        <div className="h-10 w-10 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                            <Command className="h-5 w-5 text-primary animate-pulse" />
                        </div>
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder={t('searchCommandPlaceholder')}
                            className="flex-1 bg-transparent border-none outline-none text-lg font-medium placeholder:text-muted-foreground/50 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/50 border border-border/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                            Esc
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="max-h-[60vh] overflow-y-auto p-3 custom-scrollbar">
                        {filteredCommands.length === 0 ? (
                            <div className="py-20 text-center space-y-4">
                                <div className="h-16 w-16 bg-secondary/50 rounded-full flex items-center justify-center mx-auto">
                                    <Search className="h-8 w-8 text-muted-foreground/30" />
                                </div>
                                <div className="space-y-1">
                                    <p className="font-bold text-foreground/80 lowercase">{t('commandNotFound')}</p>
                                    <p className="text-xs text-muted-foreground">{t('tryDifferentKeyword')}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 py-2">
                                {categories.map(category => (
                                    <div key={category} className="space-y-2">
                                        <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">{category}</h3>
                                        <div className="space-y-1">
                                            {filteredCommands
                                                .filter(c => c.category === category)
                                                .map((command) => {
                                                    const isGlobalSelected = filteredCommands.indexOf(command) === selectedIndex;
                                                    return (
                                                        <button
                                                            key={command.id}
                                                            onClick={command.action}
                                                            className={`w-full flex items-center gap-4 p-3 rounded-[1.5rem] transition-all duration-300 group text-left ${isGlobalSelected
                                                                ? 'bg-primary text-primary-foreground shadow-xl shadow-primary/20 scale-[1.02]'
                                                                : 'hover:bg-secondary/50 text-foreground/70'
                                                                }`}
                                                        >
                                                            <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${isGlobalSelected ? 'bg-primary-foreground/10' : 'bg-secondary group-hover:bg-background'}`}>
                                                                <command.icon className="h-5 w-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold truncate">{command.label}</p>
                                                                {command.id.startsWith('book-') && (
                                                                    <p className={`text-[10px] font-medium opacity-70 ${isGlobalSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>{t('speedReading')}</p>
                                                                )}
                                                            </div>
                                                            {command.shortcut && (
                                                                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${isGlobalSelected ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                                                                    {command.shortcut}
                                                                </div>
                                                            )}
                                                            <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${isGlobalSelected ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0'}`} />
                                                        </button>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Area */}
                    <div className="px-6 py-4 bg-secondary/30 border-t border-border/30 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded border border-border/50 bg-background text-[10px] font-black">↵</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('selectAction')}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 rounded border border-border/50 bg-background text-[10px] font-black">↑↓</span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('navigateAction')}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-50">
                            <Laptop className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Command Palette v1.0</span>
                        </div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

export default CommandPalette;
