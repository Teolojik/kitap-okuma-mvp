
import React, { useState, useEffect, useRef } from 'react';
import { useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, SkipForward, SkipBack, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/translations';
import { Slider } from '@/components/ui/slider';

interface TTSControllerProps {
    onGetText: () => Promise<string>;
    onNext: () => void;
    onPrev: () => void;
}

export default function TTSController({ onGetText, onNext, onPrev }: TTSControllerProps) {
    const { settings, setSettings } = useBookStore();
    const t = useTranslation(settings.language);
    const [isPlaying, setIsPlaying] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [showControls, setShowControls] = useState(false);
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        if (!synth) return;

        const loadVoices = () => {
            const v = synth.getVoices();
            setVoices(v);
        };
        loadVoices();
        synth.onvoiceschanged = loadVoices;
        return () => {
            synth.cancel();
        };
    }, [synth]);

    const speak = async (text: string) => {
        if (!synth) return;
        if (!text) {
            toast.error(t('noTextFound'));
            return;
        }

        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Find selected voice or fallback to preferred language
        const voice = voices.find(v => v.name === settings.ttsVoice) ||
            voices.find(v => v.lang.startsWith(settings.language)) ||
            voices.find(v => v.lang.startsWith('tr')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0];

        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }

        utterance.rate = settings.ttsSpeed;
        utterance.pitch = settings.ttsPitch;

        utterance.onend = () => {
            setIsPlaying(false);
        };

        utterance.onerror = (e) => {
            console.error("TTS Error", e);
            setIsPlaying(false);
        };

        utteranceRef.current = utterance;
        setIsPlaying(true);
        synth.speak(utterance);
    };

    const handlePlayPause = async () => {
        if (!synth) return;
        if (isPlaying) {
            synth.pause();
            setIsPlaying(false);
        } else {
            if (synth.paused) {
                synth.resume();
                setIsPlaying(true);
            } else {
                const text = await onGetText();
                speak(text);
            }
        }
    };

    const handleStop = () => {
        if (!synth) return;
        synth.cancel();
        setIsPlaying(false);
    };

    return (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end gap-3">
            <AnimatePresence>
                {showControls && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-card/95 backdrop-blur-2xl border border-primary/10 p-5 rounded-[2.5rem] shadow-2xl flex flex-col gap-5 min-w-[260px] border-2"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{t('ttsSettings')}</span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={onPrev}><SkipBack className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-primary/10" onClick={onNext}><SkipForward className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                                    <span>{t('speed')}</span>
                                    <span className="text-primary">{settings.ttsSpeed}x</span>
                                </div>
                                <Slider
                                    value={[settings.ttsSpeed]}
                                    onValueChange={([val]) => setSettings({ ttsSpeed: val })}
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tighter">
                                    <span>{t('pitch')}</span>
                                    <span className="text-primary">{settings.ttsPitch}x</span>
                                </div>
                                <Slider
                                    value={[settings.ttsPitch]}
                                    onValueChange={([val]) => setSettings({ ttsPitch: val })}
                                    min={0.5}
                                    max={2}
                                    step={0.1}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-tighter opacity-70">{t('voiceSelection')}</span>
                            <select
                                value={settings.ttsVoice}
                                onChange={(e) => setSettings({ ttsVoice: e.target.value })}
                                className="w-full bg-secondary/50 border-none rounded-2xl p-3 text-[11px] font-bold outline-none ring-2 ring-transparent focus:ring-primary/20 transition-all appearance-none"
                            >
                                {voices
                                    .filter(v => v.lang.startsWith('tr') || v.lang.startsWith('en'))
                                    .sort((a, b) => b.lang.startsWith('tr') ? 1 : -1)
                                    .map(v => (
                                        <option key={v.name} value={v.name}>{v.name.split('-')[0]} ({v.lang})</option>
                                    ))}
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xl p-2 rounded-full border-2 border-primary/10 shadow-2xl">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-12 w-12 hover:bg-primary/10 group transition-all"
                    onClick={() => setShowControls(!showControls)}
                >
                    <Sliders className={`h-5 w-5 transition-transform ${showControls ? 'text-primary rotate-180 scale-110' : 'group-hover:scale-110'}`} />
                </Button>

                <div className="h-8 w-px bg-primary/10 mx-1" />

                <Button
                    variant={isPlaying ? 'default' : 'ghost'}
                    size="icon"
                    className={`rounded-full h-12 w-12 transition-all ${isPlaying ? 'bg-primary shadow-lg shadow-primary/20 scale-110' : 'hover:bg-primary/10 hover:scale-105'}`}
                    onClick={handlePlayPause}
                >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-1" />}
                </Button>

                {isPlaying && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-12 w-12 hover:bg-red-500/10 text-red-500 hover:scale-110 transition-all"
                        onClick={handleStop}
                    >
                        <Square className="h-5 w-5 fill-current" />
                    </Button>
                )}
            </div>
        </div>
    );
}
