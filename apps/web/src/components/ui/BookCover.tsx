
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { getCleanCoverUrl } from '@/lib/discovery-service';
import { cleanTitle } from '@/lib/metadata-utils';

interface BookCoverProps {
    url?: string;
    title: string;
    className?: string;
    aspectRatio?: string; // e.g. "aspect-[2/3.2]"
}

export const BookCover: React.FC<BookCoverProps> = ({
    url,
    title,
    className = "",
    aspectRatio = "aspect-[2/3.2]"
}) => {
    const [isLoaded, setIsLoaded] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {
        setIsLoaded(false);
        setError(false);
    }, [url]);

    return (
        <div className={`relative w-full ${aspectRatio} rounded-xl overflow-hidden bg-secondary shadow-md ${className}`}>
            <AnimatePresence>
                {(!isLoaded && !error && url) && (
                    <motion.div
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-10 bg-secondary animate-pulse flex items-center justify-center"
                    >
                        <BookOpen className="h-8 w-8 text-muted-foreground/20" />
                    </motion.div>
                )}
            </AnimatePresence>

            {url && !error ? (
                <motion.img
                    src={getCleanCoverUrl(url)}
                    alt={title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{
                        opacity: isLoaded ? 1 : 0,
                        scale: isLoaded ? 1 : 1.05
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    onLoad={() => setIsLoaded(true)}
                    onError={() => setError(true)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex flex-col justify-between p-3 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-white/10">
                    <div className="w-full h-1 bg-primary/20 rounded-full" />
                    <div className="text-center">
                        <h3 className="font-serif font-bold text-[10px] leading-tight text-foreground/80 line-clamp-3 mb-1">
                            {cleanTitle(title)}
                        </h3>
                    </div>
                    <div className="flex justify-center">
                        <BookOpen className="h-6 w-6 text-primary/30" />
                    </div>
                </div>
            )}
        </div>
    );
};
