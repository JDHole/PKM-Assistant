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
     */
    constructor(options = {}) {
        this.maxTokens = options.maxTokens || 100000;
        this.systemPrompt = options.systemPrompt || '';
        this.summarizer = options.summarizer; // Nowe pole: instancja Summarizer
        this.messages = []; // {role, content}
    }

    /**
     * Dodaje wiadomość i przycina historię jeśli trzeba
     * @param {string} role - 'user' | 'assistant' | 'system' | 'tool'
     * @param {string} content 
     * @param {Object} [metadata] - Optional metadata like tool_call_id
     */
    async addMessage(role, content, metadata = {}) {
        this.messages.push({ role, content, ...metadata });

        // Sprawdź czy potrzebne podsumowanie (zanim zaczniemy cokolwiek usuwać)
        if (this.summarizer && this.summarizer.shouldSummarize(this.getCurrentTokenCount(), this.maxTokens)) {
            await this.performSummarization();
        }

        // Sprawdź limit tokenów i przytnij stare wiadomości jeśli NADAL przekraczamy limit
        // (nawet po podsumowaniu, lub gdy podsumowanie nie działa/nie jest skonfigurowane)
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
            // Logika zastąpienia historii podsumowaniem
            // Zachowaj ostatnie 4 wiadomości (context window)
            // Używamy slice(-4) aby pobrać 4 ostatnie elementy
            const recentMessages = this.messages.slice(-4);

            this.messages = []; // Wyczyść historię

            // Ustaw nowy system prompt z podsumowaniem
            // TODO: Czy nadpisywać, czy doklejać? Na razie nadpisujemy/doklejamy do info o podsumowaniu.
            // Wygodniej może być sformatować to jako:
            // "Oto podsumowanie poprzedniej części rozmowy: ... \n\n [Oryginalny System Prompt]"
            // Ale zgodnie z instrukcją: "Nowe podsumowanie wstaw jako system prompt"
            this.setSystemPrompt(`Poprzednia rozmowa (podsumowanie): ${summary}\n\n---\n${this.systemPrompt}`);

            // Przywróć ostatnie wiadomości
            this.messages = recentMessages;

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

        if (this.systemPrompt) {
            apiMessages.push({ role: 'system', content: this.systemPrompt });
        }

        // Copy messages from history, including metadata like tool_call_id
        for (const msg of this.messages) {
            // Skip messages with no content AND no tool_calls (assistant with tool_calls has empty content!)
            if (!msg.content && !msg.tool_calls?.length) continue;

            const apiMsg = { role: msg.role, content: msg.content };

            // Include tool_call_id for tool messages (required by Anthropic)
            if (msg.tool_call_id) {
                apiMsg.tool_call_id = msg.tool_call_id;
            }

            // Include tool_calls for assistant messages with tool calls
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

        // Dodaj system prompt
        if (this.systemPrompt) {
            textToCount += this.systemPrompt;
        }

        // Dodaj treść wszystkich wiadomości
        for (const msg of this.messages) {
            if (msg.content) {
                textToCount += msg.content;
            }
        }

        // TODO: Można tu dodać optymalizację (cache), ale na razie liczymy dynamicznie
        // dla pełnej zgodności ze stanem faktycznym.
        return countTokens(textToCount);
    }

    /**
     * Ustawia nowy system prompt
     * @param {string} prompt 
     */
    setSystemPrompt(prompt) {
        this.systemPrompt = prompt || '';
    }

    /**
     * Czyści historię (ale zachowuje system prompt w pamięci)
     */
    clear() {
        this.messages = [];
    }

    /**
     * Przycina najstarsze wiadomości, ale zachowuje pary User-Assistant
     * Nigdy nie usuwa ostatniej wiadomości (żeby nie uciąć kontekstu bieżącego pytania)
     * @private
     */
    _trimOldestMessages() {
        // Pętla dopóki przekraczamy limit I mamy co usuwać (więcej niż 1 wiadomość, żeby nie usunąć ostatniej)
        while (this.getCurrentTokenCount() > this.maxTokens && this.messages.length > 1) {
            // Strategia: Usuwaj od początku.
            // - Jeśli pierwsza to 'system' (w messages[] nie powinno być systemPrompt, ale np. context injection): usuń pojedynczo?
            // - Jeśli 'user', sprawdź czy następna to 'assistant' -> usuń parę.
            // - Jeśli 'assistant' (wisząca?): usuń.

            const firstMsg = this.messages[0];

            // Zabezpieczenie: Jeśli została tylko 1 wiadomość, przerywamy (wymóg "Nigdy nie usuwa ostatniej wiadomości")
            if (this.messages.length <= 1) break;

            if (firstMsg.role === 'user') {
                // Sprawdź czy następna to assistant
                if (this.messages.length >= 2 && this.messages[1].role === 'assistant') {
                    // Usuń parę User + Assistant
                    this.messages.splice(0, 2);
                } else {
                    // Samotny user (dziwne, ale możliwe) -> usuń
                    this.messages.shift();
                }
            } else {
                // Assistant lub System w historii -> usuń pojedynczo z początku
                this.messages.shift();
            }
        }
    }
}
