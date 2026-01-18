
import React from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
    Trash,
    Download,
    StickyNote,
    Highlighter,
    ChevronRight,
    Search,
    BookOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/translations';
import { useBookStore } from '@/stores/useStore';

interface NotesSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    annotations: any[];
    onDelete: (id: string) => void;
    onJump: (cfi: string) => void;
    bookTitle: string;
}

const NotesSidebar: React.FC<NotesSidebarProps> = ({
    isOpen,
    onClose,
    annotations,
    onDelete,
    onJump,
    bookTitle
}) => {
    const { settings } = useBookStore();
    const t = useTranslation(settings.language);

    const exportAsText = () => {
        const content = annotations.map(a => {
            const date = new Date(a.createdAt).toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US');
            return `[${a.type.toUpperCase()}] (${date})\n${settings.language === 'tr' ? 'Metin' : 'Text'}: ${a.text}\n${a.note ? `${settings.language === 'tr' ? 'Not' : 'Note'}: ${a.note}\n` : ''}\n-------------------\n`;
        }).join('\n');

        const blob = new Blob([`${t('bookLabel', { title: bookTitle })}\n\n${content}`], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = t('exportTxtFilename', { title: bookTitle });
        link.click();
        toast.success(t('exportNotesSuccess'));
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="w-[400px] sm:w-[540px] p-0 border-none bg-background/80 backdrop-blur-3xl overflow-hidden flex flex-col">
                <SheetHeader className="p-8 bg-card/40 border-b border-border/10">
                    <div className="flex justify-between items-start">
                        <div>
                            <SheetTitle className="text-3xl font-serif font-black tracking-tighter">{t('notesAndHighlights')}</SheetTitle>
                            <SheetDescription className="font-medium mt-1">
                                {t('notesAndHighlightsCount', { count: annotations.length })}
                            </SheetDescription>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exportAsText}
                            className="rounded-full gap-2 border-primary/20 text-primary hover:bg-primary/5"
                        >
                            <Download className="h-4 w-4" /> {t('export')}
                        </Button>
                    </div>
                </SheetHeader>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-4">
                    <AnimatePresence mode="popLayout">
                        {annotations.length > 0 ? (
                            [...annotations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((a) => (
                                <motion.div
                                    key={a.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group relative bg-card/30 hover:bg-card/60 p-5 rounded-3xl border border-border/20 transition-all border-l-4"
                                    style={{ borderLeftColor: a.color }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2">
                                            {a.type === 'note' ? (
                                                <div className="h-6 w-6 rounded-lg bg-orange-500/20 flex items-center justify-center">
                                                    <StickyNote className="h-3.5 w-3.5 text-orange-600" />
                                                </div>
                                            ) : (
                                                <div className="h-6 w-6 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                                                    <Highlighter className="h-3.5 w-3.5 text-yellow-600" />
                                                </div>
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                                                {new Date(a.createdAt).toLocaleDateString(settings.language === 'tr' ? 'tr-TR' : 'en-US')}
                                            </span>
                                        </div>
                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => onJump(a.cfiRange)}>
                                                <BookOpen className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => onDelete(a.id)}>
                                                <Trash className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <p className="text-sm font-medium leading-relaxed italic mb-4 opacity-80">
                                        "{a.text}"
                                    </p>

                                    {a.note && (
                                        <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                            <p className="text-sm font-bold text-foreground/90">{a.note}</p>
                                        </div>
                                    )}
                                </motion.div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 opacity-20">
                                <BookOpen className="h-16 w-16" />
                                <div>
                                    <p className="font-black text-lg uppercase tracking-widest">{t('noNotesYet')}</p>
                                    <p className="text-sm">{t('selectTextToAddNote')}</p>
                                </div>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </SheetContent>
        </Sheet>
    );
};

export default NotesSidebar;
