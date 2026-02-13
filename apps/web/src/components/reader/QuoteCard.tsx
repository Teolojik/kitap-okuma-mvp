
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
    // Dynamic styles based on text length to prevent overflow and excessive height
    const textLength = text.length;
    const getFontSize = () => {
        if (textLength > 400) return "text-sm";
        if (textLength > 200) return "text-lg";
        if (textLength > 100) return "text-xl";
        return "text-2xl";
    };

    const getGapSize = () => {
        if (textLength > 200) return "gap-4";
        return "gap-8";
    };

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
            className={`w-[600px] min-h-[300px] p-8 relative flex flex-col justify-between overflow-hidden border-8 shadow-2xl transition-all duration-500 ${themes[theme]}`}
            style={{ borderRadius: '2rem' }}
        >
            {/* Background Ornaments */}
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full -mr-16 -mt-16 ${accentColors[theme]}`} />
            <div className={`absolute bottom-0 left-0 w-48 h-48 opacity-10 blur-3xl rounded-full -ml-24 -mb-24 ${accentColors[theme]}`} />

            {/* Content Container */}
            <div className={`relative z-10 flex flex-col ${getGapSize()} items-center text-center px-4`}>
                {/* Large Quote Symbol */}
                <div className={`w-12 h-0.5 rounded-full ${accentColors[theme]} opacity-30`} />

                <div className="space-y-4 w-full">
                    <div className="opacity-20 italic font-serif text-6xl leading-none h-6 select-none">"</div>
                    <p className={`${getFontSize()} font-serif font-medium leading-relaxed italic tracking-tight px-4`}>
                        {text}
                    </p>
                    <div className="opacity-20 italic font-serif text-6xl leading-none h-6 rotate-180 transform select-none">"</div>

                    <div className="flex flex-col items-center gap-3 mt-4">
                        <div className={`h-px w-16 ${accentColors[theme]} opacity-60`} />
                        <div className="space-y-1 max-w-[90%]">
                            <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-90">{author || 'Bilinmeyen Yazar'}</p>
                            <p className="text-[10px] uppercase tracking-[0.2em] opacity-50 font-medium truncate">{title}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer / Branding */}
            <div className="relative z-10 mt-6 flex items-center justify-between border-t border-current/10 pt-4 opacity-40">
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
