
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Book as BookIcon,
    X,
    Command,
    Settings,
    Moon,
    Sun,
    Coffee,
    Library,
    Plus,
    User,
    BarChart2,
    Sparkles,
    ArrowRight
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useBookStore, useAuthStore } from '@/stores/useStore';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/translations';

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SearchModal = ({ isOpen, onClose }: SearchModalProps) => {
    const navigate = useNavigate();
    const { books, settings, setSettings } = useBookStore();
    const { user } = useAuthStore();
    const t = useTranslation(settings.language);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const commands = [
        { id: 'cmd-library', title: t('goToLibraryCommand'), icon: Library, action: () => navigate('/library'), category: t('navigationCategory') },
        { id: 'cmd-discover', title: t('discoverPage'), icon: Sparkles, action: () => navigate('/discover'), category: t('navigationCategory') },
        { id: 'cmd-stats', title: t('viewStats'), icon: BarChart2, action: () => navigate('/stats'), category: t('dataCategory') },
        { id: 'cmd-profile', title: t('profile'), icon: User, action: () => navigate('/profile'), category: t('accountCategory') },
        { id: 'cmd-settings', title: t('settings'), icon: Settings, action: () => navigate('/settings'), category: t('systemCategory') },
        { id: 'cmd-theme-light', title: t('lightMode'), icon: Sun, action: () => setSettings({ theme: 'light' }), category: t('appearanceCategory') },
        { id: 'cmd-theme-dark', title: t('darkMode'), icon: Moon, action: () => setSettings({ theme: 'dark' }), category: t('appearanceCategory') },
        { id: 'cmd-theme-sepia', title: t('sepiaMode'), icon: Coffee, action: () => setSettings({ theme: 'sepia' }), category: t('appearanceCategory') },
    ];

    useEffect(() => {
        const lowQuery = query.toLowerCase().trim();

        if (lowQuery === '') {
            // Show recent/featured
            setResults([
                ...commands.slice(0, 3),
                ...books.slice(0, 3)
            ]);
        } else if (lowQuery.startsWith('>')) {
            // Command mode
            const cmdQuery = lowQuery.slice(1).trim();
            const filteredCmds = commands.filter(c =>
                c.title.toLowerCase().includes(cmdQuery) ||
                c.category.toLowerCase().includes(cmdQuery)
            );
            setResults(filteredCmds);
        } else {
            // Search mode (Books + matching commands)
            const filteredBooks = books.filter(book =>
                book.title.toLowerCase().includes(lowQuery) ||
                book.author.toLowerCase().includes(lowQuery)
            );
            const filteredCmds = commands.filter(c =>
                c.title.toLowerCase().includes(lowQuery)
            );
            setResults([...filteredCmds, ...filteredBooks]);
        }
        setSelectedIndex(0);
    }, [query, books]);

    const handleSelect = (item: any) => {
        if (item.action) {
            item.action();
        } else {
            navigate(`/book/${item.id}`);
        }
        onClose();
        setQuery('');
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(i => (i + 1) % (results.length || 1));
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(i => (i - 1 + (results.length || 1)) % (results.length || 1));
            } else if (e.key === 'Enter' && results[selectedIndex]) {
                e.preventDefault();
                handleSelect(results[selectedIndex]);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, results, selectedIndex]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden border-none bg-transparent shadow-none" aria-describedby={undefined}>
                <span className="sr-only">Kitap ve komut arama</span>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-card/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                    {/* Search Input Area */}
                    <div className="p-6 border-b border-white/5 flex items-center gap-4">
                        {query.startsWith('>') ? (
                            <Command className="h-6 w-6 text-primary stroke-[2.5] animate-pulse" />
                        ) : (
                            <Search className="h-6 w-6 text-primary stroke-[2.5] animate-pulse" />
                        )}
                        <Input
                            autoFocus
                            placeholder={query.startsWith('>') ? t('commandModePlaceholder') : t('searchModalPlaceholder')}
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none text-xl font-bold placeholder:text-muted-foreground focus-visible:ring-0 p-0"
                        />
                        <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10 hidden sm:flex">
                            <span className="text-[10px] font-black opacity-30 tracking-widest uppercase">{t('escToClose')}</span>
                        </div>
                    </div>

                    {/* Results Area */}
                    <div className="max-h-[450px] overflow-y-auto p-4 no-scrollbar">
                        <div className="space-y-1">
                            <AnimatePresence mode="popLayout">
                                {results.length > 0 ? (
                                    results.map((item, index) => {
                                        const isCommand = !!item.action;
                                        const Icon = item.icon || BookIcon;

                                        return (
                                            <motion.button
                                                key={item.id}
                                                layout
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => handleSelect(item)}
                                                onMouseEnter={() => setSelectedIndex(index)}
                                                className={`w-full h-16 flex items-center gap-4 p-3 rounded-2xl transition-all group relative border text-left ${selectedIndex === index
                                                    ? 'bg-primary/20 border-primary/30 shadow-lg'
                                                    : 'hover:bg-primary/10 border-transparent hover:border-primary/20'
                                                    }`}
                                            >
                                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${selectedIndex === index ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'}`}>
                                                    {isCommand ? (
                                                        <Icon className="h-5 w-5" />
                                                    ) : (
                                                        item.cover_url ? (
                                                            <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover rounded-lg" />
                                                        ) : (
                                                            <BookIcon className="h-5 w-5 opacity-40" />
                                                        )
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-sm uppercase tracking-tight truncate">{item.title}</h4>
                                                        {isCommand && (
                                                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/10 text-primary">{t('commandLabel')}</span>
                                                        )}
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground font-bold opacity-60 truncate">
                                                        {isCommand ? item.category : item.author}
                                                    </p>
                                                </div>

                                                <div className={`shrink-0 transition-all ${selectedIndex === index ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                                                    <ArrowRight className="h-4 w-4 text-primary" />
                                                </div>
                                            </motion.button>
                                        );
                                    })
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="py-20 text-center space-y-4"
                                    >
                                        <div className="h-20 w-20 rounded-full bg-secondary/20 flex items-center justify-center mx-auto">
                                            <X className="h-10 w-10 opacity-10" />
                                        </div>
                                        <div>
                                            <p className="font-black text-lg uppercase tracking-tighter">{t('noResultsFoundSearch')}</p>
                                            <p className="text-sm text-muted-foreground font-bold opacity-60">{t('typeForCommands')}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>

                    {/* Footer Area */}
                    <div className="p-4 bg-secondary/5 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-50">
                        <div className="flex gap-4">
                            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">ENTER</kbd> {t('selectAction')}</span>
                            <span className="flex items-center gap-1"><kbd className="bg-white/10 px-1 rounded">↑↓</kbd> {t('navigateAction')}</span>
                            <span className="flex items-center gap-1 ml-4"><kbd className="bg-white/10 px-2 rounded font-mono font-normal tracking-normal text-xs">&gt;</kbd> {t('actions')}</span>
                        </div>
                        <div>
                            {query.startsWith('>') ? t('commandsCount', { count: results.length }) : t('resultsCount', { count: results.length })}
                        </div>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

export default SearchModal;
