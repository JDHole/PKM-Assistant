/**
 * MemoryExtractor - Extracts memorable facts from conversations
 *
 * After a session ends, the "minion" (cheaper model) analyzes the conversation
 * and extracts key facts to update the agent's brain.md.
 *
 * Part of Phase 3: Memory Extraction (MEMORY_IMPLEMENTATION_PLAN.md)
 */

import { streamToComplete } from './streamHelper.js';

/**
 * Category → brain.md section mapping
 */
const CATEGORY_TO_SECTION = {
    'CORE': '## User',
    'PREFERENCE': '## Preferencje',
    'DECISION': '## Ustalenia',
    'PROJECT': '## Bieżące',
};

export class MemoryExtractor {
    /**
     * Extract facts from a conversation and produce brain updates.
     * @param {Array} messages - Conversation messages [{role, content}, ...]
     * @param {string} currentBrain - Current brain.md content
     * @param {Object} chatModel - SmartChatModel instance with .stream()
     * @returns {Promise<{brainUpdates: Array, activeContextSummary: string}>}
     */
    async extract(messages, currentBrain, chatModel) {
        const prompt = this._buildExtractionPrompt(messages, currentBrain);

        const apiMessages = [
            { role: 'system', content: 'You are a memory extraction assistant. Follow the instructions precisely.' },
            { role: 'user', content: prompt }
        ];

        const responseText = await streamToComplete(chatModel, apiMessages);
        return this._parseExtractionResponse(responseText);
    }

    /**
     * Build the extraction prompt from MEMORY_DESIGN.md section 5
     * @param {Array} messages - Conversation messages
     * @param {string} currentBrain - Current brain content
     * @returns {string}
     */
    _buildExtractionPrompt(messages, currentBrain) {
        // Format conversation for the prompt (skip tool messages for clarity)
        const conversationText = messages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .map(m => {
                const role = m.role === 'user' ? 'Użytkownik' : 'Agent';
                const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
                return `${role}: ${content}`;
            })
            .join('\n\n');

        return `Przeanalizuj poniższą rozmowę między agentem a użytkownikiem.
Wyciągnij TYLKO fakty warte zapamiętania na stałe.

Aktualny Brain agenta:
${currentBrain || '(pusty)'}

Kategoryzuj każdy fakt:
[CORE]       - Kim jest user (imię, praca, rodzina, sytuacja życiowa)
[PREFERENCE] - Preferencje usera (styl, język, nawyki, gusty)
[DECISION]   - Ustalenia i decyzje ("zawsze rób X", "nigdy Y")
[PROJECT]    - Bieżące projekty, cele, postępy
[UPDATE]     - Korekta istniejącego faktu w Brain (zastąp stary). Format: [UPDATE sekcja] nowa treść -> stara treść
[DELETE]     - User poprosił o zapomnienie (usuń z Brain). Format: [DELETE] treść do usunięcia

Sygnały ważności:
- User się poprawia / koryguje agenta → ★★★★★
- User mówi wprost "zapamiętaj" → ★★★★★
- Osobista informacja → ★★★★
- Powtórzenie z poprzednich sesji → ★★★★
- Decyzja/ustalenie → ★★★
- Jednorazowy kontekst → ★ (nie zapamiętuj)
- Szczegóły techniczne → ★ (nie zapamiętuj)

WAŻNE ZASADY FORMATOWANIA:
- ZAWSZE pisz fakty w 3. osobie: "User ma...", "User lubi...", "User pracuje..."
- NIGDY nie pisz w 1. osobie ("Mam", "Lubię") ani w 2. osobie ("Masz")
- Przykład dobry: "User ma numer buta 46"
- Przykład zły: "Mam 46 numer buta"

WAŻNE ZASADY DEDUPLIKACJI:
- Przeczytaj UWAŻNIE aktualny Brain powyżej
- Jeśli fakt JUŻ ISTNIEJE w Brain (nawet w innym sformułowaniu) → POMIŃ go, nie dodawaj
- Jeśli fakt jest PODOBNY ale ma nowe szczegóły → użyj [UPDATE sekcja] nowa treść -> stara treść
- Dodawaj TYLKO naprawdę nowe informacje

BEZPIECZEŃSTWO:
- NIGDY nie wyciągaj kluczy API, haseł, tokenów, sekretów ani danych logowania
- NIGDY nie zapamiętuj adresów serwerów, konfiguracji API ani nazw modeli AI
- Jeśli user wspomina o kluczu API lub haśle → POMIŃ to kompletnie

Zasady ogólne:
- Maks 5-8 faktów na sesję. Mniej = lepiej.
- Jeśli nowy fakt PRZECZY staremu w Brain → oznacz jako [UPDATE sekcja]
- Jeśli user powiedział "zapomnij/usuń/nie pamiętaj" → oznacz jako [DELETE]
- NIE zapamiętuj: jednorazowych nastrojów, szczegółów technicznych, tymczasowego kontekstu
- Jeśli rozmowa nie zawiera nic wartego zapamiętania → napisz "Brak nowych faktów"

Podaj też streszczenie sesji (3-5 zdań) do Active Context.

Format odpowiedzi (ŚCIŚLE przestrzegaj):
## Fakty
- [KATEGORIA] fakt (w 3. osobie!)
- [KATEGORIA] fakt (w 3. osobie!)

## Streszczenie sesji
[3-5 zdań podsumowujących rozmowę]

Rozmowa:
${conversationText}`;
    }

    /**
     * Parse the extraction response into structured data.
     * Designed to be resilient to slight format variations from AI.
     * @param {string} responseText - Raw response from the model
     * @returns {{brainUpdates: Array, activeContextSummary: string}}
     */
    _parseExtractionResponse(responseText) {
        const result = {
            brainUpdates: [],
            activeContextSummary: ''
        };

        if (!responseText || responseText.trim().length === 0) {
            return result;
        }

        // Check for "no facts" response
        if (responseText.includes('Brak nowych faktów')) {
            // Still try to extract summary
            const summaryMatch = responseText.match(/##\s*Streszczenie\s+sesji\s*\n([\s\S]*?)(?:$|##)/i);
            if (summaryMatch) {
                result.activeContextSummary = summaryMatch[1].trim();
            }
            return result;
        }

        // Extract facts section
        const factsMatch = responseText.match(/##\s*Fakty\s*\n([\s\S]*?)(?:##\s*Streszczenie|$)/i);
        if (factsMatch) {
            const factsBlock = factsMatch[1];
            const lines = factsBlock.split('\n').filter(l => l.trim().startsWith('-'));

            for (const line of lines) {
                const parsed = this._parseFactLine(line);
                if (parsed) {
                    result.brainUpdates.push(parsed);
                }
            }
        }

        // Extract summary section
        const summaryMatch = responseText.match(/##\s*Streszczenie\s+sesji\s*\n([\s\S]*?)(?:$|##)/i);
        if (summaryMatch) {
            result.activeContextSummary = summaryMatch[1].trim();
        }

        return result;
    }

    /**
     * Parse a single fact line like "- [CORE] User ma na imię Kuba"
     * @param {string} line
     * @returns {{category: string, content: string, section: string, oldContent?: string}|null}
     */
    _parseFactLine(line) {
        const trimmed = line.trim().replace(/^-\s*/, '');

        // Match [CATEGORY] or [CATEGORY section] patterns
        const match = trimmed.match(/^\[(\w+)(?:\s+([^\]]*))?\]\s*(.+)/);
        if (!match) return null;

        const category = match[1].toUpperCase();
        const extra = match[2]?.trim() || '';
        let content = match[3].trim();

        // Skip [SKIP] facts
        if (category === 'SKIP') return null;

        // Handle [UPDATE section] new -> old
        if (category === 'UPDATE') {
            const arrowParts = content.split('->').map(s => s.trim());
            return {
                category: 'UPDATE',
                content: arrowParts[0],
                oldContent: arrowParts[1] || '',
                section: extra ? `## ${extra}` : '## User'
            };
        }

        // Handle [DELETE]
        if (category === 'DELETE') {
            return {
                category: 'DELETE',
                content: content,
                section: extra ? `## ${extra}` : ''
            };
        }

        // Standard categories
        const section = CATEGORY_TO_SECTION[category];
        if (!section) return null;

        return {
            category,
            content,
            section
        };
    }
}
