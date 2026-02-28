
import React from 'react';

interface QuoteCardProps {
    text: string;
    author: string;
    title: string;
    coverUrl?: string;
    theme?: 'warm' | 'dark' | 'glass' | 'nature';
    exportMode?: boolean;
}

const QuoteCard = React.forwardRef<HTMLDivElement, QuoteCardProps>(({
    text,
    author,
    title,
    coverUrl,
    theme = 'warm',
    exportMode = false
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
        warm: {
            card: exportMode
                ? "bg-[#f7efdc] text-[#5a6b70] border-[#d8ccb1]"
                : "bg-[#fdf6e3] text-[#586e75] border-[#eee8d5]",
            accent: exportMode ? "bg-[#d9a15b]" : "bg-orange-500",
        },
        dark: {
            card: exportMode
                ? "bg-[#102f3a] text-[#c1d0cf] border-[#1c4d5c]"
                : "bg-[#073642] text-[#93a1a1] border-[#002b36]",
            accent: "bg-cyan-500",
        },
        glass: {
            card: exportMode
                ? "bg-[#eef4f6] text-[#62757b] border-[#c9dde3]"
                : "bg-white/10 backdrop-blur-xl text-white border-white/20",
            accent: exportMode ? "bg-[#84d7ea]" : "bg-white",
        },
        nature: {
            card: exportMode
                ? "bg-[#eef3ea] text-[#344235] border-[#ccd8c7]"
                : "bg-[#f0f4f0] text-[#2d3a2d] border-[#dce4dc]",
            accent: exportMode ? "bg-[#6d9f68]" : "bg-green-600",
        },
    };
    const activeTheme = themes[theme];
    const containerClass = exportMode
        ? "w-[720px] p-10 border-[5px] min-h-0 justify-start"
        : "w-[600px] min-h-[300px] p-8 border-8 justify-between shadow-2xl transition-all duration-500";
    const contentClass = exportMode ? "gap-6" : getGapSize();
    const quoteMarkClass = exportMode ? "opacity-[0.15]" : "opacity-20";
    const titleClass = exportMode ? "opacity-70" : "opacity-50";
    const footerClass = exportMode
        ? "mt-10 border-t border-current/[0.12] pt-4 opacity-[0.55]"
        : "mt-6 border-t border-current/10 pt-4 opacity-40";
    const accentLineClass = exportMode ? "opacity-80" : "opacity-60";
    const accentDotClass = exportMode ? "opacity-90" : "";

    return (
        <div
            ref={ref}
            className={`relative flex flex-col overflow-hidden ${containerClass} ${activeTheme.card}`}
            style={{ borderRadius: '2rem' }}
        >
            {/* Background Ornaments */}
            <div className={`absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl rounded-full -mr-16 -mt-16 ${activeTheme.accent}`} />
            <div className={`absolute bottom-0 left-0 w-48 h-48 opacity-10 blur-3xl rounded-full -ml-24 -mb-24 ${activeTheme.accent}`} />

            {/* Content Container */}
            <div className={`relative z-10 flex flex-col ${contentClass} items-center text-center px-4`}>
                {/* Large Quote Symbol */}
                <div className={`w-12 h-0.5 rounded-full ${activeTheme.accent} opacity-30`} />

                <div className="space-y-4 w-full">
                    <div className={`${quoteMarkClass} italic font-serif text-6xl leading-none h-6 select-none`}>"</div>
                    <p className={`${getFontSize()} font-serif font-medium leading-relaxed italic tracking-tight px-4 ${exportMode ? 'text-[2.15rem] leading-[1.5]' : ''}`}>
                        {text}
                    </p>
                    <div className={`${quoteMarkClass} italic font-serif text-6xl leading-none h-6 rotate-180 transform select-none`}>"</div>

                    <div className={`flex flex-col items-center gap-3 ${exportMode ? 'mt-6' : 'mt-4'}`}>
                        <div className={`h-px w-16 ${activeTheme.accent} ${accentLineClass}`} />
                        <div className="space-y-1 max-w-[90%]">
                            <p className="text-sm font-bold uppercase tracking-[0.3em] opacity-90">{author || 'Bilinmeyen Yazar'}</p>
                            <p className={`text-[10px] uppercase tracking-[0.2em] font-medium truncate ${titleClass}`}>{title}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`relative z-10 flex items-center justify-between ${footerClass}`}>
                <div className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full ${activeTheme.accent} ${accentDotClass}`} />
                    <span className="text-xs font-black tracking-widest uppercase font-sans">epigraphreader.com</span>
                </div>
            </div>
        </div>
    );
});

QuoteCard.displayName = 'QuoteCard';

export default QuoteCard;
