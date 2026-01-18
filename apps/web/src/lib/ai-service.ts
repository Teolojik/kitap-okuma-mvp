
/**
 * AI & Dictionary Service
 * Provides word definitions and text summarization.
 */

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
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Since we don't have a real backend, we use a simulation logic
        const sentences = text.split(/[.!?]/).filter(s => s.trim().length > 10);

        if (sentences.length <= 1) {
            return "Metin çok kısa olduğu için özetlenemedi. Lütfen daha uzun bir paragraf seçin.";
        }

        // HEURISTIC: Take first and last sentence + a middle one if exists
        const summary = [
            sentences[0].trim(),
            sentences.length > 2 ? sentences[Math.floor(sentences.length / 2)].trim() : null,
            sentences[sentences.length - 1].trim()
        ].filter(Boolean).join('. ') + '.';

        return `[AI ÖZETİ]: ${summary}`;
    },

    /**
     * In a real app, this would call an LLM (Gemini, GPT, etc.)
     */
    async askAI(question: string, context: string): Promise<string> {
        await new Promise(resolve => setTimeout(resolve, 2500));
        return `"${context.slice(0, 50)}..." bağlamında sorduğunuz "${question}" sorusuna bir yanıt simüle ediliyor. Gerçek bir API entegrasyonu ile burada Gemini'den gelen cevap yer alacaktır.`;
    }
};
