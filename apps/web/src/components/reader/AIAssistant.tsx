
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { AIDiscoveryService, DictionaryEntry } from '@/lib/ai-service';
import {
    Brain,
    Book,
    Sparkles,
    Loader2,
    Copy,
    Volume2,
    Languages,
    MessageSquare,
    X
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '@/lib/translations';
import { useBookStore } from '@/stores/useStore';

interface AIAssistantProps {
    isOpen: boolean;
    onClose: () => void;
    selection: { text: string; cfi: string } | null;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOpen, onClose, selection }) => {
    const { settings } = useBookStore();
    const t = useTranslation(settings.language);
    const [mode, setMode] = useState<'dictionary' | 'summary' | 'qa'>('dictionary');
    const [loading, setLoading] = useState(false);
    const [definition, setDefinition] = useState<DictionaryEntry | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [question, setQuestion] = useState('');
    const [aiResponse, setAiResponse] = useState('');

    useEffect(() => {
        if (isOpen && selection) {
            // Auto-detect mode based on word counts
            const wordCount = selection.text.trim().split(/\s+/).length;
            if (wordCount > 10) {
                setMode('summary');
                handleSummarize();
            } else {
                setMode('dictionary');
                handleDefine();
            }
        }
    }, [isOpen, selection?.text]);

    const handleDefine = async () => {
        if (!selection) return;
        setLoading(true);
        setMode('dictionary');
        try {
            const result = await AIDiscoveryService.defineWord(selection.text);
            setDefinition(result);
        } catch (e) {
            toast.error(t('definitionNotFound'));
        } finally {
            setLoading(false);
        }
    };

    const handleSummarize = async () => {
        if (!selection) return;
        setLoading(true);
        setMode('summary');
        try {
            const result = await AIDiscoveryService.summarizeText(selection.text);
            setSummary(result);
        } catch (e) {
            toast.error(t('summarizationError'));
        } finally {
            setLoading(false);
        }
    };
    const handleAsk = async () => {
        if (!selection || !question.trim()) return;
        setLoading(true);
        try {
            const result = await AIDiscoveryService.askAI(question, selection.text);
            setAiResponse(result);
            setQuestion('');
        } catch (e) {
            toast.error(t('responseNotReceived'));
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        const textToCopy = mode === 'dictionary'
            ? definition?.meanings[0]?.definitions[0]?.definition
            : summary;
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy);
            toast.success(t('copied'));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-xl p-0 overflow-hidden border-none bg-transparent shadow-none">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card/90 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                >
                    {/* Header Panel */}
                    <div className="p-8 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border-b border-white/5 relative">
                        <DialogTitle className="text-3xl font-serif font-black tracking-tighter flex items-center gap-3">
                            {mode === 'dictionary' ? <Book className="text-primary h-8 w-8" /> : <Sparkles className="text-primary h-8 w-8" />}
                            AI {mode === 'dictionary' ? t('aiDictionary') : t('aiAssistant')}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-medium mt-1">
                            {selection?.text.slice(0, 40)}{selection?.text && selection.text.length > 40 ? '...' : ''}
                        </DialogDescription>

                        {/* Mode Switcher */}
                        <div className="flex gap-2 mt-6">
                            {[
                                { id: 'dictionary', label: 'dictionaryLabel', icon: Book },
                                { id: 'summary', label: 'aiSummaryLabel', icon: Sparkles },
                                { id: 'qa', label: 'aiAskLabel', icon: MessageSquare }
                            ].map(m => (
                                <Button
                                    key={m.id}
                                    variant={mode === m.id ? 'default' : 'secondary'}
                                    size="sm"
                                    onClick={() => {
                                        setMode(m.id as any);
                                        if (m.id === 'dictionary') handleDefine();
                                        if (m.id === 'summary') handleSummarize();
                                    }}
                                    className={`rounded-full px-4 text-[10px] font-black uppercase tracking-widest gap-2 ${mode === m.id ? 'shadow-lg shadow-primary/20' : 'bg-white/5 hover:bg-white/10'}`}
                                >
                                    <m.icon className="h-3 w-3" />
                                    {t(m.label as any)}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* AI Key Notice */}
                    {!AIDiscoveryService.hasKey() && (
                        <div className="px-8 py-3 bg-yellow-500/10 border-b border-yellow-500/20 flex items-center gap-3">
                            <div className="h-6 w-6 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                                <Brain className="h-3 w-3 text-yellow-500" />
                            </div>
                            <p className="text-[10px] font-bold text-yellow-600/80 leading-tight">
                                <span className="font-black mr-1 uppercase">{t('aiApiKeyMissing')}:</span>
                                {t('aiSimulationNotice')}
                            </p>
                        </div>
                    )}

                    {/* Content Panel */}
                    <div className="flex-1 overflow-y-auto p-8 no-scrollbar scroll-smooth">
                        <AnimatePresence mode="wait">
                            {loading ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="py-12 flex flex-col items-center justify-center gap-4 text-center"
                                >
                                    <div className="relative">
                                        <Loader2 className="h-12 w-12 text-primary animate-spin" />
                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
                                    </div>
                                    <p className="font-black text-sm uppercase tracking-widest text-muted-foreground animate-pulse">{t('aiWorking')}</p>
                                </motion.div>
                            ) : mode === 'dictionary' ? (
                                <motion.div
                                    key="dictionary"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    {definition ? (
                                        <div className="space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h2 className="text-4xl font-serif font-bold text-foreground">{definition.word}</h2>
                                                    {definition.phonetic && <p className="text-primary font-mono text-sm">{definition.phonetic}</p>}
                                                </div>
                                                <Button size="icon" variant="ghost" className="rounded-full bg-primary/10 hover:bg-primary/20 text-primary">
                                                    <Volume2 className="h-5 w-5" />
                                                </Button>
                                            </div>

                                            <Separator className="opacity-10" />

                                            {definition.meanings.map((meaning, i) => (
                                                <div key={i} className="space-y-3">
                                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary px-3 py-1 rounded-full">
                                                        {meaning.partOfSpeech}
                                                    </span>
                                                    <div className="space-y-4 pl-2 border-l-2 border-primary/20">
                                                        {meaning.definitions.map((def, j) => (
                                                            <div key={j} className="space-y-2">
                                                                <p className="text-foreground/90 font-medium leading-relaxed">{def.definition}</p>
                                                                {def.example && (
                                                                    <p className="text-sm text-muted-foreground italic bg-secondary/30 p-3 rounded-xl">"{def.example}"</p>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 opacity-50">
                                            <Languages className="h-12 w-12 mx-auto mb-4" />
                                            <p className="font-bold">{t('wordDefinitionNotFound')}</p>
                                            <p className="text-xs">{t('onlyEnglishSupported')}</p>
                                        </div>
                                    )}
                                </motion.div>
                            ) : mode === 'summary' ? (
                                <motion.div
                                    key="summary"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-125 transition-transform duration-700">
                                            <Sparkles className="h-20 w-20 text-primary" />
                                        </div>
                                        <p className="text-lg font-medium leading-relaxed text-foreground/90 relative z-10">
                                            {summary}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="secondary" className="rounded-2xl gap-2 h-12" onClick={handleSummarize}>
                                            <Sparkles className="h-4 w-4" /> {t('rewrite')}
                                        </Button>
                                        <Button variant="secondary" className="rounded-2xl gap-2 h-12" onClick={handleCopy}>
                                            <Copy className="h-4 w-4" /> {t('copy')}
                                        </Button>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="qa"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-4">
                                        <div className="bg-secondary/20 p-4 rounded-2xl border border-border/50">
                                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">{t('selectedTextContext')}</p>
                                            <p className="text-sm italic line-clamp-2 opacity-70">"{selection?.text}"</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder={t('whatDoYouWantToKnow')}
                                                className="flex-1 bg-card border-2 border-primary/10 rounded-2xl px-4 py-3 text-sm focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                                                value={question}
                                                onChange={(e) => setQuestion(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                                            />
                                            <Button
                                                onClick={handleAsk}
                                                disabled={loading || !question.trim()}
                                                className="rounded-2xl h-12 w-12 p-0"
                                            >
                                                <MessageSquare className="h-5 w-5" />
                                            </Button>
                                        </div>
                                    </div>

                                    {aiResponse && (
                                        <div className="bg-primary/5 p-6 rounded-3xl border border-primary/20 animate-in slide-in-from-bottom-2">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Brain className="h-4 w-4 text-primary" />
                                                <span className="text-[10px] font-black uppercase tracking-wider text-primary">{t('aiResponseLabel')}</span>
                                            </div>
                                            <p className="text-sm font-medium leading-relaxed">
                                                {aiResponse}
                                            </p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Action Bar */}
                    <div className="p-6 bg-secondary/5 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">
                            {t('poweredByAI')}
                        </p>
                        <Button variant="ghost" size="sm" onClick={onClose} className="rounded-xl hover:bg-white/10 gap-2">
                            {t('close')} <X className="h-4 w-4" />
                        </Button>
                    </div>
                </motion.div>
            </DialogContent>
        </Dialog>
    );
};

export default AIAssistant;
