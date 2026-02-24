export function createVaultSearchTool(app) {
    return {
        name: 'vault_search',
        description: 'Przeszukaj notatki użytkownika w vaultcie — semantycznie (po znaczeniu) lub po słowach kluczowych.\n\nJAK DZIAŁA:\n- Domyślnie: wyszukiwanie SEMANTYCZNE (embeddingi) — rozumie znaczenie, nie tylko dokładne słowa\n- Fallback: jeśli embeddingi niedostępne, szuka po słowach kluczowych (indexOf)\n- Zwraca listę pasujących notatek z path, score i snippet\n\nKIEDY UŻYWAĆ:\n- User pyta "mam notatkę o X?", "znajdź moje notatki dotyczące Y"\n- Potrzebujesz znaleźć pliki powiązane z tematem (semantycznie)\n- Szukasz konkretnej treści w vaultcie\n\nKIEDY NIE UŻYWAĆ:\n- Szukasz we własnej pamięci/sesjach → użyj memory_search\n- Znasz dokładną ścieżkę → użyj vault_read\n- Potrzebujesz przeszukać DUŻO plików i zrobić analizę → deleguj minionowi (minion_task)\n\nJAK FORMUŁOWAĆ ZAPYTANIA:\n- Semantyczne: pisz naturalnie ("notatki o planowaniu budżetu", "pomysły na projekt")\n- Po nazwie pliku: ustaw searchIn="filename" ("dziennik", "TODO")\n\nUWAGI:\n- Max 50 wyników (domyślnie 20)\n- folder: ogranicz do podfolderu (np. "Projekty/")\n- Nie przeszukuje .smart-env/ ani plików binarnych',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Zapytanie wyszukiwania. Dla wyszukiwania semantycznego pisz naturalnie (np. "notatki o produktywności"). Dla keyword search: dokładne słowo/fraza.'
                },
                searchIn: {
                    type: 'string',
                    enum: ['content', 'filename', 'both'],
                    description: '"content" = szukaj w treści notatek. "filename" = szukaj w nazwach plików. "both" (domyślnie) = szukaj wszędzie.'
                },
                folder: {
                    type: 'string',
                    description: 'Ogranicz wyszukiwanie do folderu. Przykłady: "Projekty/", "Dziennik/2026/". Puste = cały vault.'
                },
                limit: {
                    type: 'number',
                    description: 'Max wyników do zwrócenia. Domyślnie 20, max 50. Dla szybkiego przeglądu wystarczy 5-10.'
                }
            },
            required: ['query']
        },
        execute: async (args, app, plugin) => {
            try {
                const { query, folder } = args;
                if (!query || typeof query !== 'string') {
                    throw new Error('Query is required and must be a string');
                }

                const searchIn = args.searchIn || 'both';
                const limit = Math.min(args.limit || 20, 50);

                // ── SEMANTIC MODE: use SmartSources.lookup() if embeddings available ──
                const env = plugin?.env;
                const smartSources = env?.smart_sources;
                if (smartSources && searchIn !== 'filename') {
                    try {
                        const results = await smartSources.lookup({
                            hypotheticals: [query],
                            filter: folder ? { path_begins_with: folder } : {},
                            k: limit
                        });
                        if (results?.length) {
                            return {
                                success: true,
                                query,
                                searchType: 'semantic',
                                results: results.map(r => ({
                                    path: r.item.path,
                                    score: r.score,
                                    matchType: 'semantic'
                                })),
                                count: results.length
                            };
                        }
                    } catch (e) {
                        console.warn('[VaultSearch] Semantic search failed, falling back to keyword:', e.message);
                    }
                }

                // ── FALLBACK: keyword indexOf (when embeddings unavailable) ──
                const queryLower = query.toLowerCase();
                const allFiles = app.vault.getMarkdownFiles();

                let candidates = allFiles;
                if (folder) {
                    candidates = candidates.filter(f => f.path.startsWith(folder));
                }

                const results = [];

                for (const file of candidates) {
                    if (results.length >= limit) break;

                    let matchType = null;
                    let snippet = null;

                    if (searchIn === 'filename' || searchIn === 'both') {
                        if (file.basename.toLowerCase().includes(queryLower)) {
                            matchType = 'filename';
                        }
                    }

                    let contentMatch = false;

                    if (searchIn === 'content' || searchIn === 'both') {
                        const content = await app.vault.cachedRead(file);
                        const contentLower = content.toLowerCase();
                        const idx = contentLower.indexOf(queryLower);

                        if (idx !== -1) {
                            contentMatch = true;
                            const start = Math.max(0, idx - 75);
                            const end = Math.min(content.length, idx + query.length + 75);
                            snippet = content.substring(start, end).replace(/\n/g, ' ');
                            if (start > 0) snippet = '...' + snippet;
                            if (end < content.length) snippet = snippet + '...';
                        }
                    }

                    if (matchType === 'filename' && contentMatch) {
                        matchType = 'both';
                    } else if (!matchType && contentMatch) {
                        matchType = 'content';
                    }

                    if (matchType) {
                        results.push({ path: file.path, matchType, snippet });
                    }
                }

                return {
                    success: true,
                    query,
                    searchType: 'keyword',
                    results,
                    count: results.length
                };

            } catch (error) {
                console.error('[VaultSearchTool] Error:', error);
                return { success: false, error: error.message };
            }
        }
    };
}
