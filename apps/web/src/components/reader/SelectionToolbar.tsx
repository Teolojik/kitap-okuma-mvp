
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    Highlighter,
    Copy,
    X,
    StickyNote,
    Share2
} from 'lucide-react';

interface SelectionToolbarProps {
    selection: { text: string; cfi: string } | null;
    onClose: () => void;
    onAction: (action: 'ai' | 'highlight' | 'note' | 'share', color?: string) => void;
}

const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ selection, onClose, onAction }) => {
    if (!selection) return null;

    const wordCount = selection.text.trim().split(/\s+/).length;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.9 }}
                className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 p-2 bg-card/80 backdrop-blur-2xl border border-white/10 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
                <div className="flex items-center gap-1.5 px-3 border-r border-white/10 shrink-0">
                    {[
                        { color: 'rgba(255, 255, 0, 0.4)', class: 'bg-yellow-400' },
                        { color: 'rgba(34, 197, 94, 0.4)', class: 'bg-green-400' },
                        { color: 'rgba(59, 130, 246, 0.4)', class: 'bg-blue-400' },
                        { color: 'rgba(236, 72, 153, 0.4)', class: 'bg-pink-400' },
                    ].map((c, i) => (
                        <button
                            key={i}
                            onClick={() => onAction('highlight', c.color)}
                            className={`h-6 w-6 rounded-full ${c.class} border border-white/20 hover:scale-125 transition-transform shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50`}
                        />
                    ))}
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction('share')}
                    className="rounded-full gap-2 hover:bg-orange-500 hover:text-white transition-all px-3 group"
                >
                    <Share2 className="h-4 w-4 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Paylaş</span>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction('note')}
                    className="rounded-full gap-2 hover:bg-orange-500 hover:text-white transition-all px-3"
                >
                    <StickyNote className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Not</span>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        navigator.clipboard.writeText(selection.text);
                        onClose();
                        import('sonner').then(({ toast }) => toast.success("Metin kopyalandı!"));
                    }}
                    className="rounded-full h-8 w-8 hover:bg-secondary transition-all"
                >
                    <Copy className="h-4 w-4" />
                </Button>

                <div className="h-8 w-px bg-white/10 mx-1" />

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="rounded-full h-8 w-8 hover:bg-red-500 hover:text-white transition-all"
                >
                    <X className="h-4 w-4" />
                </Button>
            </motion.div>
        </AnimatePresence>
    );
};

export default SelectionToolbar;
