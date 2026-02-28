import { getTokenCount } from '../utils/tokenCounter.js';
import { Summarizer } from './Summarizer.js';

/**
 * Rolling Window — zarządza historią rozmowy z limitem tokenów.
 *
 * DWUFAZOWA KOMPRESJA (jak Claude Code):
 * Faza 1: Skróć stare wyniki narzędzi — DARMOWE, bez API call.
 * Faza 2: Pełna sumaryzacja — DROGIE, API call. Tylko gdy Faza 1 nie wystarczyła.
 *
 * TRZY PROGI:
 * 1. toolTrimThreshold (0.7) — Faza 1: skróć tool results
 * 2. triggerThreshold (0.9) — Faza 2: pełna sumaryzacja
 * 3. HARD (100%) — awaryjna, w addMessage() gdy kontekst pełny
 *
 * LICZENIE TOKENÓW:
 * getCurrentTokenCount() liczy: system prompt + wiadomości + tool_calls + reasoning_content
 * + definicje narzędzi (tools schema) — cache'owane przez setToolDefinitionsTokens().
 * To jest osobny system od TokenTracker (który liczy in/out API usage).
 */
export class RollingWindow {
    /**
     * @param {Object} options
     * @param {number} options.maxTokens - Limit tokenów (default: 100000)
     * @param {string} options.systemPrompt - Opcjonalny prompt systemowy
     * @param {Object} options.summarizer - Opcjonalna instancja Summarizer (eager)
     * @param {Function} options.modelProvider - () => chatModel — lazy provider (gdy summarizer nie podany)
     * @param {number} options.triggerThreshold - Próg sumaryzacji Faza 2 (0.9 = 90%)
     * @param {number} options.toolTrimThreshold - Próg trimowania tool results Faza 1 (0.7 = 70%)
     * @param {Function} options.onSummarized - Callback(summary, count, messagesKept, isEmergency)
     * @param {Function} options.onToolsTrimmed - Callback(trimmedCount, totalTrimmed) — po Fazie 1
     * @param {Function} options.emergencyContextProvider - () => string — zwraca kontekst aktywnego taska (todos, plan)
     */
    constructor(options = {}) {
        this.maxTokens = options.maxTokens || 100000;
        this.baseSystemPrompt = options.systemPrompt || '';
        this.conversationSummary = '';
        this.summarizer = options.summarizer || null;
        this._modelProvider = options.modelProvider || null;
        this._triggerThreshold = options.triggerThreshold || 0.9;
        this._toolTrimThreshold = options.toolTrimThreshold || 0.7;
        this.messages = [];
        this._summarizationCount = 0;
        this._toolTrimCount = 0;
        this._toolDefinitionsTokens = 0;
        this._lastSummarizationWasEmergency = false;
        this.onSummarized = options.onSummarized || null;
        this.onToolsTrimmed = options.onToolsTrimmed || null;
        this.emergencyContextProvider = options.emergencyContextProvider || null;
        this.sessionPath = ''; // Ustawiane przez chat_view — ścieżka do zapisanej sesji
    }

    /**
     * Pełny system prompt = base + summary.
     * Po awaryjnej sumaryzacji: specjalny nagłówek mówiący agentowi żeby kontynuował.
     * @returns {string}
     */
    get systemPrompt() {
        if (!this.conversationSummary) return this.baseSystemPrompt;

        const header = this._lastSummarizationWasEmergency
            ? '⚠️ KONTEKST ROZMOWY ZOSTAŁ AUTOMATYCZNIE SKOMPRESOWANY — limit tokenów osiągnięty. Jeśli byłeś w trakcie zadania — kontynuuj od miejsca gdzie skończyłeś. Oto podsumowanie rozmowy do tego momentu:'
            : 'Podsumowanie poprzedniej części rozmowy:';

        return `${this.baseSystemPrompt}\n\n---\n${header}\n${this.conversationSummary}`;
    }

    /**
     * Dodaje wiadomość. Sprawdza hard limit (100% maxTokens).
     * Przy hard limit: najpierw Faza 1 (aggressive trim), potem Faza 2 (summarize).
     */
    async addMessage(role, content, metadata = {}) {
        this.messages.push({ role, content, ...metadata });

        // HARD LIMIT — dwufazowa kompresja awaryjna
        try {
            const currentTokens = this.getCurrentTokenCount();
            if (currentTokens > this.maxTokens) {
                console.warn(`[RollingWindow] HARD LIMIT: ${currentTokens} > ${this.maxTokens}`);

                // Faza 1: agresywne skracanie tool results (darmowe)
                this._trimToolResultsAggressive(4);

                // Sprawdź czy Faza 1 wystarczyła
                if (this.getCurrentTokenCount() > this.maxTokens) {
                    // Faza 2: pełna sumaryzacja
                    if (this._ensureSummarizer()) {
                        await this.performSummarization(true); // isEmergency = true
                    }
                }

                // Force-trim jeśli NADAL za dużo (np. summarizer zwrócił null)
                if (this.getCurrentTokenCount() > this.maxTokens) {
                    this._trimOldestMessages();
                }
            }
        } catch (e) {
            console.warn('[RollingWindow] Hard limit check failed:', e);
        }
    }

    /**
     * Lazy init: tworzy Summarizer gdy model jest dostępny.
     * Przy init ChatView model może jeszcze nie być załadowany — dlatego lazy.
     * @returns {boolean} true jeśli summarizer jest gotowy
     */
    _ensureSummarizer() {
        if (this.summarizer) return true;
        if (!this._modelProvider) return false;
        try {
            const chatModel = this._modelProvider();
            if (chatModel?.stream) {
                this.summarizer = new Summarizer({ chatModel, triggerThreshold: this._triggerThreshold });
                console.log('[RollingWindow] Summarizer lazy-init OK');
                return true;
            }
        } catch (e) {
            // Model not ready yet — will retry next time
        }
        return false;
    }

    // ─── FAZA 1: Tool Output Trimming (DARMOWE) ───

    /**
     * Skraca stare wyniki narzędzi — DARMOWE, bez wywołania API.
     * Zastępuje content starych wiadomości tool krótkim placeholderem.
     * NIE usuwa wiadomości (OpenAI wymaga tool_call_id match).
     * Zachowuje ostatnie recentKeep wiadomości bez zmian.
     *
     * @param {number} recentKeep - Ile ostatnich wiadomości chronić (default 10)
     * @returns {{count: number, details: Array<{toolName: string, originalSize: number}>, savedChars: number}}
     */
    trimOldToolResults(recentKeep = 10) {
        const safeZone = Math.max(0, this.messages.length - recentKeep);
        const details = [];
        let savedChars = 0;

        for (let i = 0; i < safeZone; i++) {
            const msg = this.messages[i];
            if (msg.role === 'tool' && msg.content && msg.content.length > 200) {
                const originalSize = msg.content.length;

                // Znajdź nazwę narzędzia z powiązanego assistant message
                const toolName = this._findToolNameForResult(i, msg.tool_call_id);

                const preview = msg.content.slice(0, 150);
                msg.content = `${preview}...\n[wynik skrócony — ${originalSize} zn. → 150]`;
                savedChars += originalSize - msg.content.length;
                details.push({ toolName, originalSize });
            }
        }

        if (details.length > 0) {
            this._toolTrimCount += details.length;
            console.log(`[RollingWindow] Faza 1: skrócono ${details.length} starych wyników narzędzi (łącznie w sesji: ${this._toolTrimCount}), zaoszczędzono ~${savedChars} zn.`);
        }

        return { count: details.length, details, savedChars };
    }

    /**
     * Szuka nazwy narzędzia dla danego tool result (po tool_call_id).
     * @param {number} toolMsgIndex - Index wiadomości tool w messages[]
     * @param {string} toolCallId - tool_call_id do dopasowania
     * @returns {string} Nazwa narzędzia lub 'narzędzie'
     */
    _findToolNameForResult(toolMsgIndex, toolCallId) {
        if (!toolCallId) return 'narzędzie';
        // Szukaj wstecz assistant message z pasującym tool_call
        for (let j = toolMsgIndex - 1; j >= 0; j--) {
            const m = this.messages[j];
            if (m.role === 'assistant' && m.tool_calls) {
                for (const tc of m.tool_calls) {
                    if (tc.id === toolCallId) return tc.function?.name || 'narzędzie';
                }
            }
        }
        return 'narzędzie';
    }

    /**
     * Agresywne skracanie — zamienia ALL stare tool results na minimum.
     * Używane w ścieżce HARD gdy zwykłe trimming nie wystarczyło.
     * @param {number} recentKeep
     * @returns {number}
     */
    _trimToolResultsAggressive(recentKeep = 4) {
        const safeZone = Math.max(0, this.messages.length - recentKeep);
        let trimmed = 0;

        for (let i = 0; i < safeZone; i++) {
            const msg = this.messages[i];
            if (msg.role === 'tool' && msg.content && msg.content.length > 50) {
                msg.content = '[wynik skrócony]';
                trimmed++;
            }
        }

        if (trimmed > 0) {
            console.log(`[RollingWindow] Faza 1 (aggressive): ${trimmed} wyników zminimalizowanych`);
        }
        return trimmed;
    }

    // ─── OCENA POTRZEBY KOMPRESJI ───

    /**
     * Sprawdza jaki typ kompresji jest potrzebny.
     * @returns {'none'|'trim'|'summarize'}
     * - 'none': poniżej progu trim (70%) — nic nie rób
     * - 'trim': między progami (70-90%) — Faza 1 wystarczy
     * - 'summarize': powyżej progu sumaryzacji (90%) — Faza 1 + Faza 2
     */
    getCompressionNeeded() {
        const currentTokens = this.getCurrentTokenCount();
        const summaryThreshold = this._ensureSummarizer()
            ? this.maxTokens * this.summarizer.triggerThreshold
            : this.maxTokens * this._triggerThreshold;
        const trimThreshold = this.maxTokens * this._toolTrimThreshold;

        if (currentTokens >= summaryThreshold) return 'summarize';
        if (currentTokens >= trimThreshold) return 'trim';
        return 'none';
    }

    /**
     * BACKWARD COMPAT: stara metoda. Deleguje do getCompressionNeeded().
     * @returns {boolean}
     */
    shouldSoftSummarize() {
        return this.getCompressionNeeded() !== 'none';
    }

    // ─── DWUFAZOWA KOMPRESJA ───

    /**
     * Dwufazowa kompresja kontekstu (jak Claude Code):
     * Faza 1: Skróć stare wyniki narzędzi (DARMOWE — bez API call)
     * Faza 2: Pełna sumaryzacja (DROGIE — API call) — tylko jeśli Faza 1 nie wystarczyła
     *
     * @param {boolean} isEmergency - Czy to awaryjna kompresja (hard limit)
     * @returns {Promise<{phase: number, trimmed: number, summarized: boolean}>}
     */
    async performTwoPhaseCompression(isEmergency = false) {
        const result = { phase: 0, trimmed: 0, trimDetails: [], savedChars: 0, summarized: false };
        const tokensBefore = this.getCurrentTokenCount();

        // === FAZA 1: Trim tool results (darmowe) ===
        const trimResult = this.trimOldToolResults(isEmergency ? 4 : 10);
        result.phase = 1;
        result.trimmed = trimResult.count;
        result.trimDetails = trimResult.details;
        result.savedChars = trimResult.savedChars;

        const tokensAfterTrim = this.getCurrentTokenCount();

        // Notify UI o Fazie 1
        if (trimResult.count > 0 && this.onToolsTrimmed) {
            try {
                this.onToolsTrimmed({
                    trimmed: trimResult.count,
                    details: trimResult.details,
                    savedChars: trimResult.savedChars,
                    tokensBefore,
                    tokensAfterTrim,
                    totalTrimmed: this._toolTrimCount
                });
            } catch (e) {
                console.warn('[RollingWindow] onToolsTrimmed callback error:', e);
            }
        }

        // Sprawdź czy Faza 1 wystarczyła
        const summaryThreshold = this._ensureSummarizer()
            ? this.maxTokens * this.summarizer.triggerThreshold
            : this.maxTokens * this._triggerThreshold;

        if (!isEmergency && tokensAfterTrim < summaryThreshold) {
            console.log(`[RollingWindow] Faza 1 wystarczyła: ${tokensAfterTrim} < ${Math.round(summaryThreshold)} (skrócono ${trimResult.count} wyników)`);
            return result;
        }

        // === FAZA 2: Pełna sumaryzacja (drogie) ===
        if (this._ensureSummarizer()) {
            result.phase = 2;
            console.log(`[RollingWindow] Faza 1 nie wystarczyła (${tokensAfterTrim} >= ${Math.round(summaryThreshold)}) — uruchamiam Fazę 2`);
            await this.performSummarization(isEmergency);
            result.summarized = true;
        }

        return result;
    }

    /**
     * Wykonuje progressive summarization (Faza 2).
     * Nowe streszczenie = stare streszczenie + nowe wiadomości.
     * W trybie emergency: zbiera kontekst aktywnego taska (todos, plan) i przekazuje do Summarizera.
     * @param {boolean} isEmergency - Czy to awaryjna sumaryzacja (hard limit)
     */
    async performSummarization(isEmergency = false) {
        try {
            // Zbierz kontekst aktywnego zadania (tylko przy emergency)
            let activeTaskContext = '';
            if (isEmergency && this.emergencyContextProvider) {
                try {
                    activeTaskContext = this.emergencyContextProvider();
                    if (activeTaskContext) {
                        console.log(`[RollingWindow] Emergency context collected: ${activeTaskContext.length} chars`);
                    }
                } catch (e) {
                    console.warn('[RollingWindow] Emergency context provider failed:', e);
                }
            }

            const summary = await this.summarizer.summarize(
                this.messages,
                this.conversationSummary,
                { isEmergency, activeTaskContext, sessionPath: this.sessionPath }
            );

            if (summary) {
                const recentMessages = this.messages.slice(-4);
                this.messages = recentMessages;
                this.conversationSummary = summary;
                this._summarizationCount++;
                this._lastSummarizationWasEmergency = isEmergency;

                const mode = isEmergency ? 'EMERGENCY' : 'soft';
                console.log(`[RollingWindow] Summarization #${this._summarizationCount} (${mode}) done. Summary: ${summary.length} chars. Messages kept: ${recentMessages.length}`);

                // Notify chat_view to render compression block
                if (this.onSummarized) {
                    try {
                        this.onSummarized(summary, this._summarizationCount, recentMessages.length, isEmergency);
                    } catch (cbErr) {
                        console.warn('[RollingWindow] onSummarized callback error:', cbErr);
                    }
                }
            } else {
                console.warn('[RollingWindow] Summarizer returned null — summarization skipped');
            }
        } catch (e) {
            console.error('[RollingWindow] Summarization failed:', e);
        }
    }

    // ─── TOKEN COUNTING ───

    /**
     * Returns context usage as percentage (0-100).
     * @returns {number}
     */
    getUsagePercent() {
        if (!this.maxTokens) return 0;
        return Math.min(100, Math.round((this.getCurrentTokenCount() / this.maxTokens) * 100));
    }

    /**
     * Ile razy sumaryzacja się odbyła w tej sesji
     * @returns {number}
     */
    get summarizationCount() {
        return this._summarizationCount;
    }

    /**
     * Zwraca wiadomości gotowe do wysłania do API.
     * ZAWSZE dodaje systemPrompt jako pierwszą wiadomość (role: 'system').
     * reasoning_content: DeepSeek Reasoner WYMAGA tego pola w assistant messages
     * z tool_calls. Odsyłamy je gdy istnieją na wiadomości.
     * @returns {Array<{role: string, content: string}>}
     */
    getMessagesForAPI() {
        const apiMessages = [];
        const fullPrompt = this.systemPrompt;

        if (fullPrompt) {
            apiMessages.push({ role: 'system', content: fullPrompt });
        }

        for (const msg of this.messages) {
            const hasContent = msg.content && (typeof msg.content === 'string' ? msg.content.length > 0 : Array.isArray(msg.content) && msg.content.length > 0);
            if (!hasContent && !msg.tool_calls?.length && !msg.tool_call_id) continue;

            const apiMsg = { role: msg.role, content: msg.content };

            if (msg.tool_call_id) {
                apiMsg.tool_call_id = msg.tool_call_id;
            }

            if (msg.tool_calls) {
                apiMsg.tool_calls = msg.tool_calls;
            }

            // DeepSeek Reasoner WYMAGA reasoning_content w assistant messages z tool_calls.
            // Bez tego API zwraca error. Odsyłamy je gdy istnieją na wiadomości.
            if (msg.reasoning_content !== undefined) {
                apiMsg.reasoning_content = msg.reasoning_content;
            }

            apiMessages.push(apiMsg);
        }

        return apiMessages;
    }

    /**
     * Zwraca aktualną liczbę tokenów w oknie kontekstowym.
     * Liczy: system prompt + wiadomości + tool_calls + reasoning_content + definicje narzędzi.
     * UWAGA: To NIE jest TokenTracker (in/out API usage). To jest pomiar kontekstu do kompresji.
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
                if (typeof msg.content === 'string') {
                    textToCount += msg.content;
                } else if (Array.isArray(msg.content)) {
                    for (const block of msg.content) {
                        if (block.type === 'text') textToCount += block.text;
                        else if (block.type === 'image_url') textToCount += '[image:85tokens]';
                    }
                }
            }
            // Licz też tool_calls arguments (zajmują miejsce w kontekście)
            if (msg.tool_calls) {
                for (const tc of msg.tool_calls) {
                    if (tc.function?.arguments) textToCount += tc.function.arguments;
                    if (tc.function?.name) textToCount += tc.function.name;
                }
            }
            // DeepSeek reasoning_content — wysyłane z powrotem do API, liczy się w kontekście
            if (msg.reasoning_content) {
                textToCount += msg.reasoning_content;
            }
        }

        const messageTokens = getTokenCount(textToCount);
        // Dodaj cache'owane tokeny definicji narzędzi (tools schema lecą z każdym requestem)
        return messageTokens + this._toolDefinitionsTokens;
    }

    /**
     * Ustawia liczbę tokenów zajmowanych przez definicje narzędzi (tools schema).
     * Wywoływane przez chat_view przed każdym API call.
     * @param {number} count
     */
    setToolDefinitionsTokens(count) {
        this._toolDefinitionsTokens = count || 0;
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
        this._summarizationCount = 0;
        this._toolTrimCount = 0;
        this._toolDefinitionsTokens = 0;
        this._lastSummarizationWasEmergency = false;
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
