
/**
 * AI & Dictionary Service
 * Provides word definitions and text summarization using Google Gemini.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: "gemini-1.5-flash" }) : null;

export interface DictionaryEntry {
    word: string;
    phonetic?: string;
    meanings: {
        partOfSpeech: string;
        definitions: {
            definition: string;
            example?: string;
        }[];
    }[];
}

export const AIDiscoveryService = {
    /**
     * Check if AI key is available
     */
    hasKey(): boolean {
        return !!API_KEY;
    },

    /**
     * Fetch word definition from Free Dictionary API
     */
    async defineWord(word: string): Promise<DictionaryEntry | null> {
        try {
            const cleanWord = word.trim().toLowerCase().replace(/[.,!?;:]/g, '');
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data[0];
        } catch (error) {
            console.error("Dictionary API error:", error);
            return null;
        }
    },

    /**
     * Simulate AI Summarization
     */
    async summarizeText(text: string): Promise<string> {
        if (!model) {
            // Fallback to simulation if no API key
            await new Promise(resolve => setTimeout(resolve, 1500));
            const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);
            if (sentences.length <= 1) return text;
            return `[SIMÜLE ÖZET]: ${sentences[0]}... ${sentences[sentences.length - 1]}`;
        }

        try {
            const prompt = `Lütfen aşağıdaki metni kısa ve öz bir şekilde (maksimum 3 cümle) özetle. Yanıtın sadece özet metni olsun:\n\n${text}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini Summarize Error:", error);
            return "Özet oluşturulurken bir hata oluştu.";
        }
    },

    /**
     * Real Gemini AI QA integration
     */
    async askAI(question: string, context: string): Promise<string> {
        if (!model) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return `[SIMÜLASYON]: "${question}" sorunuza gerçek bir API anahtarı olmadan yanıt veremiyorum. Lütfen ayarlar kısmından Gemini API anahtarını tanımlayın.`;
        }

        try {
            const prompt = `Aşağıdaki metin bağlamında şu soruyu cevapla. Eğer cevap metinde yoksa, genel bilgilerini kullanarak ama bağlamdan kopmadan cevap ver. Yanıtın samimi ve yardımcı bir okuma asistanı gibi olsun.\n\nBAĞLAM:\n${context}\n\nSORU:\n${question}`;
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error("Gemini QA Error:", error);
            return "Yapay zeka yanıt verirken bir hata oluştu.";
        }
    }
};
