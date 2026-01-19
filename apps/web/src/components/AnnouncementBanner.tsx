
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useBookStore } from '@/stores/useStore';
import { Megaphone, X, Info, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AnnouncementBanner = () => {
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const { settings } = useBookStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [dismissedIds, setDismissedIds] = useState<string[]>([]);

    useEffect(() => {
        const fetchAnnouncements = async () => {
            const { data } = await supabase
                .from('system_announcements')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (data) setAnnouncements(data);
        };

        fetchAnnouncements();

        // Subscribe to changes
        const channel = supabase
            .channel('public:system_announcements')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'system_announcements' }, fetchAnnouncements)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const activeAnnouncements = announcements.filter(a => !dismissedIds.includes(a.id));

    if (activeAnnouncements.length === 0) return null;

    const current = activeAnnouncements[currentIndex];

    const getIcon = (type: string) => {
        switch (type) {
            case 'warning': return <AlertTriangle className="h-4 w-4" />;
            case 'success': return <CheckCircle2 className="h-4 w-4" />;
            case 'error': return <AlertCircle className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'warning': return 'bg-orange-500 text-white';
            case 'success': return 'bg-green-500 text-white';
            case 'error': return 'bg-red-500 text-white';
            default: return 'bg-primary text-primary-foreground';
        }
    };

    const handleDismiss = (id: string) => {
        setDismissedIds(prev => [...prev, id]);
        if (currentIndex >= activeAnnouncements.length - 1) {
            setCurrentIndex(Math.max(0, activeAnnouncements.length - 2));
        }
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={current.id}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={`${getColor(current.type)} w-full overflow-hidden relative z-50 shadow-sm`}
            >
                <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1">
                        <div className="flex-shrink-0">
                            {getIcon(current.type)}
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 overflow-hidden">
                            <span className="font-black uppercase tracking-widest text-[10px] opacity-80 whitespace-nowrap">
                                {current.title}
                            </span>
                            <span className="text-xs font-medium truncate">
                                {current.message}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {activeAnnouncements.length > 1 && (
                            <div className="flex gap-1 mr-2">
                                {activeAnnouncements.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentIndex(i)}
                                        className={`h-1 rounded-full transition-all ${i === currentIndex ? 'w-4 bg-white' : 'w-1 bg-white/40'}`}
                                    />
                                ))}
                            </div>
                        )}
                        <button
                            onClick={() => handleDismiss(current.id)}
                            className="p-1 hover:bg-black/10 rounded-lg transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default AnnouncementBanner;
