import React from 'react';

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
    const textLength = text.length;

    const getFontSize = () => {
        if (textLength > 400) return 'text-base sm:text-lg';
        if (textLength > 200) return 'text-lg sm:text-xl';
        if (textLength > 100) return 'text-xl sm:text-2xl';
        return 'text-2xl sm:text-[2.55rem]';
    };

    const getGapSize = () => {
        if (textLength > 200) return 'gap-4 sm:gap-5';
        return 'gap-6 sm:gap-8';
    };

    const themes = {
        warm: {
            card: 'bg-[#fdf6e3] text-[#586e75] border-[#eee8d5]',
            accent: 'bg-orange-500',
        },
        dark: {
            card: 'bg-[#0a4957] text-[#b6c7cc] border-[#083946]',
            accent: 'bg-[#1e8fa5]',
        },
        glass: {
            card: 'bg-[#f3f6f4] text-[#5e7077] border-[#d6e0dc]',
            accent: 'bg-[#86b9c5]',
        },
        nature: {
            card: 'bg-[#eef2ea] text-[#394539] border-[#c8d4c1]',
            accent: 'bg-[#6d9f68]',
        },
    };

    const activeTheme = themes[theme];
    const containerClass = 'w-full max-w-[600px] min-h-[300px] p-5 sm:p-8 border-[5px] sm:border-8 justify-between shadow-2xl transition-all duration-500';
    const contentClass = getGapSize();
    const quoteMarkClass = 'opacity-20';
    const titleClass = 'opacity-65';
    const footerClass = 'mt-6 border-t border-current/10 pt-4 opacity-50';
    const accentLineClass = 'opacity-60';
    const quoteTextClass = getFontSize();

    return (
        <div
            ref={ref}
            className={`relative flex flex-col overflow-hidden ${containerClass} ${activeTheme.card}`}
            style={{ borderRadius: '2rem' }}
        >
            <div className={`absolute top-0 left-1/2 h-1.5 w-16 sm:w-24 -translate-x-1/2 rounded-b-full ${activeTheme.accent} opacity-85`} />

            <div className={`relative z-10 flex flex-col ${contentClass} items-center text-center px-1 sm:px-4`}>
                <div className={`w-12 h-0.5 rounded-full ${activeTheme.accent} opacity-30`} />

                <div className="space-y-4 w-full">
                    <div className={`${quoteMarkClass} italic font-serif text-5xl sm:text-6xl leading-none h-6 select-none`}>"</div>
                    <p className={`${quoteTextClass} font-serif font-medium italic tracking-tight px-2 sm:px-4 leading-relaxed`}>
                        {text}
                    </p>
                    <div className={`${quoteMarkClass} italic font-serif text-5xl sm:text-6xl leading-none h-6 rotate-180 transform select-none`}>"</div>

                    <div className="flex flex-col items-center gap-4 sm:gap-5 mt-5 sm:mt-6 w-full">
                        <div className={`h-px w-16 ${activeTheme.accent} ${accentLineClass}`} />
                        <div className="w-full max-w-[420px] space-y-2.5 sm:space-y-3 text-center">
                            <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm sm:text-base font-bold uppercase tracking-[0.14em] sm:tracking-[0.18em] leading-none opacity-95">
                                {author || 'Bilinmeyen Yazar'}
                            </p>
                            <p className={`w-full overflow-hidden text-ellipsis whitespace-nowrap text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.14em] leading-none font-semibold ${titleClass}`}>
                                {title}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className={`relative z-10 flex items-center justify-between ${footerClass}`}>
                <div className="flex items-center gap-2">
                    <div className={`h-5 w-5 rounded-full ${activeTheme.accent}`} />
                    <span className="text-[10px] sm:text-xs font-black tracking-[0.12em] sm:tracking-widest uppercase font-sans">
                        epigraphreader.com
                    </span>
                </div>
            </div>
        </div>
    );
});

QuoteCard.displayName = 'QuoteCard';

export default QuoteCard;
