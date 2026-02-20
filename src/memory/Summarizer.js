/**
 * Automatycznie podsumowuje rozmowę gdy przekroczony próg tokenów
 */
import { streamToComplete } from './streamHelper.js';

export class Summarizer {
    /**
     * @param {Object} options
     * @param {number} options.triggerThreshold - % limitu (0.7 = 70%)
     * @param {Object} options.chatModel - SmartChatModel instance
     */
    constructor(options = {}) {
        this.triggerThreshold = options.triggerThreshold || 0.7;
        this.chatModel = options.chatModel;
    }

    /**
     * Sprawdza czy potrzebne podsumowanie
     */
    shouldSummarize(currentTokens, maxTokens) {
        if (!maxTokens) return false;
        return currentTokens >= maxTokens * this.triggerThreshold;
    }

    /**
     * Generuje podsumowanie z wiadomości (wywołuje AI)
     * @param {Array} messages - [{role, content}...]
     * @returns {Promise<string>} Podsumowanie
     */
    async summarize(messages) {
        if (!this.chatModel) {
            console.warn("Summarizer: No chat model provided.");
            return null;
        }

        try {
            const summaryPrompt = this.getSummaryPrompt(messages);
            const apiMessages = [
                { role: 'user', content: summaryPrompt }
            ];

            const result = await streamToComplete(this.chatModel, apiMessages);
            return result || null;
        } catch (error) {
            console.error("Summarizer: Error generating summary", error);
            return null;
        }
    }

    /**
     * Zwraca prompt do generowania podsumowania
     */
    getSummaryPrompt(messages) {
        const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

        return `Jesteś asystentem tworzącym zwięzłe podsumowania rozmów.
Stwórz krótkie podsumowanie poniższej rozmowy, zachowując:
- Główne tematy dyskusji
- Podjęte decyzje lub ustalenia
- Ważne fakty do zapamiętania
- Kontekst emocjonalny (jeśli istotny)
Podsumowanie powinno mieć max 3-5 zdań.

ROZMOWA:
${conversationText}

PODSUMOWANIE:`;
    }
}
