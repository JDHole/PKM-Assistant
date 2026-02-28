import { executeWebSearch } from '../core/WebSearchProvider.js';

/**
 * web_search — MCP tool for searching the internet.
 * Uses configured provider (default: Jina AI, free).
 */
export function createWebSearchTool(app) {
    return {
        name: 'web_search',
        description: `Wyszukaj informacje w internecie.

JAK DZIAŁA:
- Wysyłasz zapytanie → dostajesz wyniki z internetu (tytuły, linki, fragmenty treści)
- Domyślnie: Jina AI (darmowy, zwraca pełną treść stron, nie tylko snippety)
- Inne providery: Tavily, Brave, Serper, SearXNG (konfigurowalne w ustawieniach)

KIEDY UŻYWAĆ:
- User pyta o aktualne wydarzenia, nowości, ceny, daty
- Potrzebujesz informacji spoza vaulta (Wikipedia, dokumentacja, artykuły)
- User mówi: "sprawdź w necie", "wyszukaj", "co mówi internet o..."
- Pytania o technologie, produkty, osoby — cokolwiek co wymaga aktualnych danych

KIEDY NIE UŻYWAĆ:
- User pyta o swoje notatki → użyj vault_search
- User pyta o swoją pamięć → użyj memory_search
- Informacja jest w vaultcie → vault_read

JAK FORMUŁOWAĆ ZAPYTANIA:
- Pisz po angielsku dla lepszych wyników (chyba że szukasz polskich źródeł)
- Bądź konkretny: "Obsidian 1.8 release notes 2026" lepiej niż "obsidian nowości"
- Dla pytań fakturalnych: krótkie, precyzyjne zapytanie

UWAGI:
- Wymaga połączenia z internetem
- Wyniki mogą być nieaktualne lub nieprawdziwe — weryfikuj ważne fakty
- Cytuj źródła w odpowiedzi (podaj URL)`,
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Zapytanie wyszukiwania. Precyzyjne, najlepiej po angielsku dla globalnych wyników.'
                },
                limit: {
                    type: 'number',
                    description: 'Maksymalna liczba wyników (domyślnie 5, max 10). Dla szybkiego pytania wystarczy 3.'
                }
            },
            required: ['query']
        },
        execute: async (args, app, plugin) => {
            try {
                const { query } = args;
                if (!query || typeof query !== 'string') {
                    throw new Error('query jest wymagane i musi być tekstem');
                }

                const limit = Math.min(args.limit || 5, 10);

                // Get web search settings from plugin
                const webSearchSettings = plugin?.env?.settings?.obsek?.webSearch || {};

                if (webSearchSettings.enabled === false) {
                    return {
                        success: false,
                        error: 'Web Search jest wyłączony. Włącz go w ustawieniach pluginu → Web Search.'
                    };
                }

                const result = await executeWebSearch(query, webSearchSettings, limit);

                // Format results for agent readability
                const formatted = result.results.map((r, i) => {
                    let entry = `[${i + 1}] ${r.title}\n    URL: ${r.url}`;
                    if (r.content) {
                        // Trim content to reasonable length per result
                        const trimmed = r.content.length > 1500
                            ? r.content.slice(0, 1500) + '...'
                            : r.content;
                        entry += `\n    ${trimmed}`;
                    }
                    return entry;
                }).join('\n\n');

                return {
                    success: true,
                    provider: result.provider,
                    query: result.query,
                    results: result.results,
                    count: result.count,
                    formatted
                };

            } catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    };
}
