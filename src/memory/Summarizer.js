/**
 * Progressive Summarizer — kompresuje rozmowę w trakcie sesji.
 *
 * Produkuje STRUKTURALNE podsumowanie (jak Claude Code compaction):
 * - Sekcje: Cel, Przebieg, Wiadomości usera, Pliki/narzędzia, Problemy, Ustalenia, Stan pracy, Otwarte wątki
 * - Progressive: nowe streszczenie buduje na poprzednim (nie nadpisuje)
 * - Po polsku, maks ~800 słów
 */
import { streamToComplete } from './streamHelper.js';

export class Summarizer {
    /**
     * @param {Object} options
     * @param {number} options.triggerThreshold - % limitu (0.9 = 90%)
     * @param {Object} options.chatModel - SmartChatModel instance
     */
    constructor(options = {}) {
        this.triggerThreshold = options.triggerThreshold || 0.9;
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
     * Generuje progressive summary: łączy stare streszczenie z nowymi wiadomościami.
     * @param {Array} messages - [{role, content, tool_calls?, tool_call_id?}...]
     * @param {string} previousSummary - Dotychczasowe streszczenie (puste przy pierwszej sumaryzacji)
     * @param {Object} options - Opcje: { isEmergency, activeTaskContext }
     * @returns {Promise<string|null>} Nowe streszczenie lub null przy błędzie
     */
    async summarize(messages, previousSummary = '', options = {}) {
        if (!this.chatModel) {
            console.warn('[Summarizer] No chat model provided.');
            return null;
        }

        try {
            const summaryPrompt = this.getSummaryPrompt(messages, previousSummary, options);
            const apiMessages = [
                { role: 'user', content: summaryPrompt }
            ];

            const mode = options.isEmergency ? 'EMERGENCY structured' : 'structured';
            console.log(`[Summarizer] Generating ${mode} summary from`, messages.length, 'messages...');
            const response = await streamToComplete(this.chatModel, apiMessages);
            const text = response.text || null;
            if (text) {
                console.log('[Summarizer] Summary generated:', text.length, 'chars');
            }
            return text;
        } catch (error) {
            console.error('[Summarizer] Error generating summary:', error);
            return null;
        }
    }

    /**
     * Wyciąga tekst z wiadomości (obsługa string / Array multimodal).
     * @param {Object} msg - Message object {role, content, tool_calls?...}
     * @returns {string}
     */
    _extractContent(msg) {
        if (!msg.content) return '';
        if (typeof msg.content === 'string') return msg.content;
        if (Array.isArray(msg.content)) {
            return msg.content
                .filter(b => b.type === 'text')
                .map(b => b.text)
                .join('\n');
        }
        return String(msg.content || '');
    }

    /**
     * Wyciąga nazwy narzędzi użytych w rozmowie (z tool_calls).
     * @param {Array} messages
     * @returns {string[]} Unikalne nazwy tooli
     */
    _extractToolNames(messages) {
        const tools = new Set();
        for (const msg of messages) {
            if (msg.tool_calls) {
                for (const tc of msg.tool_calls) {
                    if (tc.function?.name) tools.add(tc.function.name);
                }
            }
        }
        return [...tools];
    }

    /**
     * Wyciąga wiadomości usera (do zachowania w podsumowaniu).
     * @param {Array} messages
     * @returns {string[]} Treści wiadomości usera
     */
    _extractUserMessages(messages) {
        return messages
            .filter(m => m.role === 'user' && !m.tool_call_id)
            .map(m => {
                const text = this._extractContent(m);
                // Skracaj bardzo długie wiadomości (np. wklejony kod) ale zachowaj sens
                if (text.length > 300) {
                    return text.slice(0, 300) + '...';
                }
                return text;
            })
            .filter(t => t.length > 0);
    }

    /**
     * Buduje prompt do progressive summarization.
     * Produkuje STRUKTURALNE podsumowanie z sekcjami — jak Claude Code compaction.
     * W trybie emergency: dodaje sekcję "ZADANIE W TOKU" z aktywnym todo/planem.
     * @param {Array} messages
     * @param {string} previousSummary
     * @param {Object} options - { isEmergency, activeTaskContext }
     */
    getSummaryPrompt(messages, previousSummary = '', options = {}) {
        const { isEmergency = false, activeTaskContext = '', sessionPath = '' } = options;

        // Buduj tekst rozmowy
        const conversationText = messages
            .filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
            .map(m => {
                let content = this._extractContent(m);

                // Skracaj bardzo długie wyniki tooli (zachowaj esencję)
                if (m.role === 'tool' && content.length > 800) {
                    content = content.slice(0, 800) + '... [skrócone]';
                }

                // Oznacz tool_calls w assistant messages
                let toolCallInfo = '';
                if (m.tool_calls) {
                    const names = m.tool_calls.map(tc => tc.function?.name).filter(Boolean);
                    if (names.length > 0) {
                        toolCallInfo = ` [wywołał: ${names.join(', ')}]`;
                    }
                }

                const label = m.role === 'tool' ? 'TOOL_RESULT' : m.role.toUpperCase();
                return `${label}${toolCallInfo}: ${content}`;
            })
            .join('\n\n');

        // Wyciągnij wiadomości usera osobno
        const userMessages = this._extractUserMessages(messages);
        const userMessagesSection = userMessages.length > 0
            ? `\nWIADOMOŚCI USERA (zachowaj ich treść — ważne dla kontynuacji):\n${userMessages.map((m, i) => `${i + 1}. "${m}"`).join('\n')}\n`
            : '';

        // Wyciągnij użyte narzędzia
        const toolNames = this._extractToolNames(messages);
        const toolsSection = toolNames.length > 0
            ? `\nUŻYTE NARZĘDZIA: ${toolNames.join(', ')}\n`
            : '';

        const previousSection = previousSummary
            ? `\nPOPRZEDNIE PODSUMOWANIE (buduj na nim — rozszerzaj, nie zastępuj):\n---\n${previousSummary}\n---\n`
            : '';

        // Emergency: kontekst aktywnego zadania (todos, plany)
        const taskContextSection = (isEmergency && activeTaskContext)
            ? `\n⚠️ AKTYWNE ZADANIE W MOMENCIE KOMPRESJI (KRYTYCZNE — agent MUSI to kontynuować):\n---\n${activeTaskContext}\n---\n`
            : '';

        // Emergency: dodatkowa sekcja w formacie
        const emergencySection = isEmergency
            ? `\n## 9. ⚠️ ZADANIE W TOKU (KRYTYCZNE)
Co DOKŁADNIE agent robił w momencie kompresji? Jaki był następny krok? Jakie narzędzia miał zamiar wywołać?
Agent MUSI wiedzieć od czego zacząć po wznowieniu — opisz to tak szczegółowo jak to możliwe. Uwzględnij aktywne TODO/PLAN jeśli są.\n`
            : '';

        const emergencyWarning = isEmergency
            ? `\n⚠️ TO JEST AWARYJNA KOMPRESJA — agent był W TRAKCIE ZADANIA. Sekcja "Zadanie w toku" jest NAJWAŻNIEJSZA. Agent po wznowieniu musi wiedzieć DOKŁADNIE co robić dalej.\n`
            : '';

        return `Jesteś systemem kompresji kontekstu rozmowy AI asystenta. Twoim celem jest stworzenie STRUKTURALNEGO podsumowania, które pozwoli agentowi kontynuować pracę bez utraty kontekstu.
${emergencyWarning}${previousSection}${userMessagesSection}${toolsSection}${taskContextSection}
ROZMOWA DO SKOMPRESOWANIA:
${conversationText}

STWÓRZ STRUKTURALNE PODSUMOWANIE w poniższym formacie. Każda sekcja jest opcjonalna — pomiń jeśli nie dotyczy.

## 1. Cel rozmowy
Co user chce osiągnąć? Główny temat/zadanie. (1-2 zdania)

## 2. Przebieg (chronologicznie)
Co się wydarzyło krok po kroku. Kluczowe momenty, decyzje, zwroty akcji. (punkty)

## 3. Wiadomości usera
Zachowaj TREŚĆ kluczowych wiadomości usera (parafrazuj lub cytuj). User może się do nich odwoływać. (numerowane)

## 4. Pliki i narzędzia
Jakie pliki czytano/tworzono/edytowano? Jakie narzędzia użyto i z jakim skutkiem? (punkty)

## 5. Problemy i rozwiązania
Co nie działało? Jakie errory? Jak je naprawiono? (punkty, tylko jeśli były)

## 6. Ustalenia i decyzje
Kluczowe decyzje podjęte w rozmowie. "Postanowiliśmy że...", "User chce...", "Wybraliśmy..." (punkty)

## 7. Aktualny stan pracy
Co zostało zrobione? Co jest w toku? Co agent robił tuż przed kompresją? (opis stanu)

## 8. Otwarte wątki
Co jeszcze do zrobienia? Nierozwiązane kwestie? Następne kroki? (punkty, tylko jeśli są)
${emergencySection}
ZASADY:
- Po polsku
- Maks ~800 słów (proporcjonalnie do ilości treści — krótka rozmowa = krótsze podsumowanie)
- ZACHOWAJ konkretne nazwy plików, zmiennych, funkcji — agent ich potrzebuje
- ZACHOWAJ treść wiadomości usera (agent musi wiedzieć co user powiedział)
- Jeśli jest POPRZEDNIE PODSUMOWANIE — rozszerzaj je o nowe informacje, nie powtarzaj tego samego
- Pomiń: pozdrowienia, small talk, powtórzenia, parametry tool calli (zachowaj WYNIK)

PODSUMOWANIE:${sessionPath ? `\n\n📂 Pełna rozmowa zapisana w: ${sessionPath} — agent może ją przeczytać żeby zweryfikować szczegóły.` : ''}`;
    }
}
