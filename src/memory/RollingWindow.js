import { countTokens } from '../utils/tokenCounter.js';

/**
 * Klasa zarządzająca historią rozmowy z limitem tokenów (Rolling Window).
 * Zachowuje system prompt i przycina najstarsze wiadomości parami.
 */
export class RollingWindow {
    /**
     * @param {Object} options
     * @param {number} options.maxTokens - Limit tokenów (default: 100000)
     * @param {string} options.systemPrompt - Opcjonalny prompt systemowy
     * @param {Object} options.summarizer - Opcjonalna instancja Summarizer
     */
    constructor(options = {}) {
        this.maxTokens = options.maxTokens || 100000;
        this.baseSystemPrompt = options.systemPrompt || ''; // stały (brain + agent context)
        this.conversationSummary = ''; // nadpisywane przy summaryzacji
        this.summarizer = options.summarizer;
        this.messages = [];
    }

    /**
     * Pełny system prompt = base + summary
     * @returns {string}
     */
    get systemPrompt() {
        if (!this.conversationSummary) return this.baseSystemPrompt;
        return `${this.baseSystemPrompt}\n\n---\nPodsumowanie poprzedniej części rozmowy:\n${this.conversationSummary}`;
    }

    /**
     * Dodaje wiadomość i przycina historię jeśli trzeba
     * @param {string} role - 'user' | 'assistant' | 'system' | 'tool'
     * @param {string} content
     * @param {Object} [metadata] - Optional metadata like tool_call_id
     */
    async addMessage(role, content, metadata = {}) {
        this.messages.push({ role, content, ...metadata });

        // Sprawdź czy potrzebne podsumowanie
        if (this.summarizer && this.summarizer.shouldSummarize(this.getCurrentTokenCount(), this.maxTokens)) {
            await this.performSummarization();
        }

        // Przytnij stare wiadomości jeśli NADAL przekraczamy limit
        const currentTokens = this.getCurrentTokenCount();
        if (currentTokens > this.maxTokens) {
            this._trimOldestMessages();
        }
    }

    /**
     * Wykonuje proces podsumowania historii
     */
    async performSummarization() {
        console.log('RollingWindow: Performing summarization...');
        const summary = await this.summarizer.summarize(this.messages);

        if (summary) {
            // Zachowaj ostatnie 4 wiadomości (context window)
            const recentMessages = this.messages.slice(-4);
            this.messages = recentMessages;

            // Nadpisz summary (nie doklejaj do base!)
            this.conversationSummary = summary;

            console.log('RollingWindow: Summarization complete. History compressed.');
        }
    }

    /**
     * Zwraca wiadomości gotowe do wysłania do API
     * ZAWSZE dodaje systemPrompt jako pierwszą wiadomość (role: 'system')
     * @returns {Array<{role: string, content: string}>}
     */
    getMessagesForAPI() {
        const apiMessages = [];
        const fullPrompt = this.systemPrompt;

        if (fullPrompt) {
            apiMessages.push({ role: 'system', content: fullPrompt });
        }

        for (const msg of this.messages) {
            if (!msg.content && !msg.tool_calls?.length) continue;

            const apiMsg = { role: msg.role, content: msg.content };

            if (msg.tool_call_id) {
                apiMsg.tool_call_id = msg.tool_call_id;
            }

            if (msg.tool_calls) {
                apiMsg.tool_calls = msg.tool_calls;
            }

            apiMessages.push(apiMsg);
        }

        return apiMessages;
    }

    /**
     * Zwraca aktualną liczbę tokenów (wraz z system prompt)
     * @returns {number}
     */
    getCurrentTokenCount() {
        let textToCount = '';
        const fullPrompt = this.systemPrompt;

        if (fullPrompt) {
            textToCount += fullPrompt;
        }

        for (const msg of this.messages) {
            if (msg.content) {
                textToCount += msg.content;
            }
        }

        return countTokens(textToCount);
    }

    /**
     * Ustawia nowy bazowy system prompt (brain + agent context)
     * @param {string} prompt
     */
    setSystemPrompt(prompt) {
        this.baseSystemPrompt = prompt || '';
    }

    /**
     * Czyści historię i summary (ale zachowuje base system prompt)
     */
    clear() {
        this.messages = [];
        this.conversationSummary = '';
    }

    /**
     * Przycina najstarsze wiadomości, ale zachowuje pary User-Assistant
     * @private
     */
    _trimOldestMessages() {
        while (this.getCurrentTokenCount() > this.maxTokens && this.messages.length > 1) {
            const firstMsg = this.messages[0];

            if (this.messages.length <= 1) break;

            if (firstMsg.role === 'user') {
                if (this.messages.length >= 2 && this.messages[1].role === 'assistant') {
                    this.messages.splice(0, 2);
                } else {
                    this.messages.shift();
                }
            } else {
                this.messages.shift();
            }
        }
    }
}
