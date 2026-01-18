
import React, { useState, useEffect, useRef } from 'react';
import { useBookStore } from '@/stores/useStore';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, SkipForward, SkipBack, Volume2, Settings2, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

interface TTSControllerProps {
    onGetText: () => Promise<string>;
    onNext: () => void;
    onPrev: () => void;
}

export default function TTSController({ onGetText, onNext, onPrev }: TTSControllerProps) {
    const { settings, setSettings } = useBookStore();
    const [isPlaying, setIsPlaying] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [showControls, setShowControls] = useState(false);
    const synth = window.speechSynthesis;
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

    useEffect(() => {
        const loadVoices = () => {
            const v = synth.getVoices();
            setVoices(v);
        };
        loadVoices();
        synth.onvoiceschanged = loadVoices;
        return () => {
            synth.cancel();
        };
    }, []);

    const speak = async (text: string) => {
        if (!text) {
            toast.error("Okunacak metin bulunamadı.");
            return;
        }

        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Find selected voice or fallback to Turkish
        const voice = voices.find(v => v.name === settings.ttsVoice) ||
            voices.find(v => v.lang.startsWith('tr')) ||
            voices[0];

        if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
        }

        utterance.rate = settings.ttsSpeed;
        utterance.pitch = 1;

        utterance.onend = () => {
            setIsPlaying(false);
            // Optionally auto-next?
            // onNext();
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
                        className="bg-background/80 backdrop-blur-2xl border border-border/20 p-4 rounded-[2rem] shadow-2xl flex flex-col gap-4 min-w-[200px]"
                    >
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-50">Sesli Okuma</span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onPrev}><SkipBack className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onNext}><SkipForward className="h-4 w-4" /></Button>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-bold">
                                <span>HIZ</span>
                                <span>{settings.ttsSpeed}x</span>
                            </div>
                            <div className="flex gap-2">
                                {[0.5, 1, 1.5, 2].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setSettings({ ttsSpeed: s })}
                                        className={`flex-1 py-1 rounded-lg text-[10px] font-black transition-all ${settings.ttsSpeed === s ? 'bg-primary text-white' : 'bg-secondary/50 hover:bg-secondary'}`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <span className="text-[10px] font-bold">SES SEÇİMİ</span>
                            <select
                                value={settings.ttsVoice}
                                onChange={(e) => setSettings({ ttsVoice: e.target.value })}
                                className="w-full bg-secondary/50 border-none rounded-xl p-2 text-[10px] font-medium outline-none"
                            >
                                {voices.filter(v => v.lang.startsWith('tr') || v.lang.startsWith('en')).map(v => (
                                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                                ))}
                            </select>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xl p-2 rounded-full border border-border/20 shadow-2xl">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full h-12 w-12 hover:bg-primary/10"
                    onClick={() => setShowControls(!showControls)}
                >
                    <Sliders className={`h-5 w-5 ${showControls ? 'text-primary' : ''}`} />
                </Button>

                <div className="h-8 w-px bg-border/20 mx-1" />

                <Button
                    variant={isPlaying ? 'default' : 'ghost'}
                    size="icon"
                    className={`rounded-full h-12 w-12 transition-all ${isPlaying ? 'bg-primary shadow-lg scale-110' : 'hover:bg-primary/10'}`}
                    onClick={handlePlayPause}
                >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                </Button>

                {isPlaying && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full h-12 w-12 hover:bg-red-500/10 text-red-500"
                        onClick={handleStop}
                    >
                        <Square className="h-5 w-5 fill-current" />
                    </Button>
                )}
            </div>
        </div>
    );
}
