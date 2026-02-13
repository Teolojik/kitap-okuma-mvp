
import React from 'react';
import { motion } from 'framer-motion';
import { BookCover } from '../ui/BookCover';

interface QuoteCardProps {
    text: string;
    author: string;
    title: string;
    coverUrl?: string;
    theme?: 'warm' | 'dark' | 'glass' | 'nature';
}

const QuoteCard = React.forwardRef<HTMLDivElement, QuoteCardProps>(({
    text,
    author,
    title,
    coverUrl,
    theme = 'warm'
}, ref) => {

    const themes = {
        warm: "bg-[#fdf6e3] text-[#586e75] border-[#eee8d5]",
        dark: "bg-[#073642] text-[#93a1a1] border-[#002b36]",
        glass: "bg-white/10 backdrop-blur-xl text-white border-white/20",
        nature: "bg-[#f0f4f0] text-[#2d3a2d] border-[#dce4dc]"
    };

    const accentColors = {
        warm: "bg-orange-500",
        dark: "bg-cyan-500",
        glass: "bg-white",
        nature: "bg-green-600"
    };

    return (
        <div
            ref={ref}
            className={`w-[600px] min-h-[400px] p-12 relative flex flex-col justify-between overflow-hidden border-8 shadow-2xl transition-colors duration-500 ${themes[theme]}`}
            style={{ borderRadius: '2rem' }}
        >
            {/* Background Ornaments */}
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full -mr-16 -mt-16 ${accentColors[theme]}`} />
            <div className={`absolute bottom-0 left-0 w-48 h-48 opacity-10 blur-3xl rounded-full -ml-24 -mb-24 ${accentColors[theme]}`} />

            {/* Content Container */}
            <div className="relative z-10 flex gap-8 items-start">
                {/* Mini Book Cover */}
                <div className="w-32 shrink-0 shadow-2xl transform -rotate-2 group-hover:rotate-0 transition-transform duration-700">
                    <BookCover
                        url={coverUrl}
                        title={title}
                        aspectRatio="aspect-[2/3]"
                    />
                </div>

                {/* Quote Text */}
                <div className="flex-1 space-y-6">
                    <div className="opacity-40 italic font-serif text-6xl leading-none">"</div>
                    <p className="text-2xl font-serif font-medium leading-relaxed italic tracking-tight">
                        {text}
                    </p>
                    <div className="flex items-center gap-4">
                        <div className={`h-px w-8 ${accentColors[theme]} opacity-60`} />
                        <div className="space-y-0.5">
                            <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-80">{author || 'Bilinmeyen Yazar'}</p>
                            <p className="text-xs uppercase tracking-widest opacity-40">{title}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Branding */}
            <div className="relative z-10 mt-12 flex items-center justify-between border-t border-current/10 pt-6 opacity-40">
                <div className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full ${accentColors[theme]}`} />
                    <span className="text-xs font-black tracking-widest uppercase font-sans">Epigraph</span>
                </div>
                <p className="text-[10px] font-sans font-bold uppercase tracking-widest">epigraphreader.com</p>
            </div>
        </div>
    );
});

QuoteCard.displayName = 'QuoteCard';

export default QuoteCard;
