/**
 * Automatycznie podsumowuje rozmowę gdy przekroczony próg tokenów
 */
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
        if (!maxTokens) return false; // Prevent division by zero or undefined
        return currentTokens >= maxTokens * this.triggerThreshold;
    }

    /**
     * Generuje podsumowanie z wiadomości (wywołuje AI)
     * @param {Array} messages - [{role, content}...]
     * @returns {Promise<string>} Podsumowanie
     */
    async summarize(messages) {
        if (!this.chatModel) {
            console.warn("Summarizer: No chat model provided provided.");
            return null;
        }

        try {
            // 1. Przygotuj prompt do podsumowania
            const systemPrompt = this.getSummaryPrompt(messages);

            // Construct the message payload for the model
            // Usually models expect a system prompt and then the user message, 
            // or just a user message if we are "simulating" a task.
            // Since getSummaryPrompt returns the instructions AND the conversation, 
            // we can send it as a single user message or system message depending on the model.
            // However, the instructions say "Zwraca prompt systemowy do generowania podsumowania". 
            // I will treat it as the input prompt.

            const promptMessages = [
                { role: 'user', content: systemPrompt }
            ];

            // 2. Wywołaj this.chatModel.complete() lub podobną metodę
            // User hint: "użyj chatModel.invoke() lub podobnej metody"
            let result;
            if (this.chatModel.invoke) {
                result = await this.chatModel.invoke(promptMessages);
            } else if (this.chatModel.complete) {
                result = await this.chatModel.complete(promptMessages);
            } else {
                // Fallback or TODO if method is unknown
                // TODO: Verify the correct method name for SmartChatModel (invoke vs complete vs other)
                console.warn("Summarizer: chatModel.invoke/complete not found. Trying chatModel.call if available.");
                if (this.chatModel.call) {
                    result = await this.chatModel.call(promptMessages);
                } else {
                    throw new Error("SmartChatModel does not have a known completion method (invoke/complete/call).");
                }
            }

            // 3. Zwróć treść podsumowania
            // Assuming result is string or has content property. 
            // Based on typical adapters, it might return an object with content.
            if (typeof result === 'string') {
                return result;
            } else if (result && result.content) {
                return result.content;
            } else if (result && result.choices && result.choices[0] && result.choices[0].message) {
                return result.choices[0].message.content;
            }

            return JSON.stringify(result); // Fallback

        } catch (error) {
            console.error("Summarizer: Error generating summary", error);
            // Return null or throw depending on expected behavior. 
            // For now returning null so it doesn't crash the app.
            return null;
        }
    }

    /**
     * Zwraca prompt systemowy do generowania podsumowania
     */
    getSummaryPrompt(messages) {
        // Format messages for the prompt
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
