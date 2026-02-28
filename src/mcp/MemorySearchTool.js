/**
 * MCP tool for searching agent's own memory (sessions, brain, summaries).
 * Separate from vault_search which searches user's notes.
 *
 * Supports semantic search via EmbeddingHelper when embed model is available,
 * with fallback to keyword indexOf.
 */
import { EmbeddingHelper } from '../memory/EmbeddingHelper.js';

export function createMemorySearchTool(app) {
    return {
        name: 'memory_search',
        description: 'Przeszukaj SWOJĄ pamięć — przeszłe sesje, brain.md (fakty o userze), podsumowania L1/L2/L3. Szuka semantycznie (po znaczeniu) z fallbackiem na słowa kluczowe.\n\nCO PRZESZUKUJE:\n- sessions: pliki rozmów z userem (każda sesja = osobny .md)\n- brain: brain.md — trwałe fakty o userze (preferencje, ustalenia, informacje osobiste)\n- summaries: streszczenia L1 (5 sesji → 1 plik), L2 (5 L1 → 1 streszczenie) i L3 (10 L2 → mega-streszczenie wzorców/trendów)\n\nKIEDY UŻYWAĆ:\n- User pyta "co rozmawialiśmy o X?", "pamiętasz że...?", "kiedy ostatnio...?"\n- Szukasz kontekstu z poprzednich rozmów\n- Potrzebujesz sprawdzić co wiesz o userze\n\nKIEDY NIE UŻYWAĆ:\n- Szukasz w notatkach USERA → użyj vault_search\n- Chcesz przeczytać brain.md → użyj memory_update z operation="read_brain"\n- Chcesz statystyki pamięci → użyj memory_status\n\nUWAGI:\n- Wyszukuje semantycznie (batch embedding — efektywny, 1-2 HTTP calls)\n- Max 30 dokumentów przeszukiwanych jednocześnie\n- Wyniki posortowane po score (0-1, im wyżej tym lepiej)\n- Zwraca snippet (200 znaków) z każdego wyniku',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Zapytanie — pisz naturalnie, np. "co user lubi jeść", "rozmowa o projekcie X", "ustalenia z zeszłego tygodnia"'
                },
                scope: {
                    type: 'string',
                    enum: ['all', 'sessions', 'brain', 'summaries'],
                    description: '"all" (domyślnie) = przeszukaj wszystko. "sessions" = tylko rozmowy. "brain" = tylko trwałe fakty. "summaries" = tylko streszczenia L1/L2/L3.'
                },
                limit: {
                    type: 'number',
                    description: 'Max wyników. Domyślnie 10, max 30. Dla szybkiego sprawdzenia wystarczy 3-5.'
                }
            },
            required: ['query']
        },
        execute: async (args, app, plugin) => {
            try {
                const { query } = args;
                if (!query || typeof query !== 'string') {
                    throw new Error('Query is required and must be a string');
                }

                const scope = args.scope || 'all';
                const limit = Math.min(args.limit || 10, 30);

                // Get active agent's memory path
                const agentManager = plugin?.agentManager;
                const activeAgent = agentManager?.getActiveAgent();
                if (!activeAgent) {
                    return { success: false, error: 'No active agent' };
                }

                const safeName = activeAgent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const memoryBase = `.pkm-assistant/agents/${safeName}/memory`;
                const adapter = app.vault.adapter;

                // Collect all memory documents to search
                const docs = [];

                // Collect sessions
                if (scope === 'all' || scope === 'sessions') {
                    const sessionsPath = `${memoryBase}/sessions`;
                    try {
                        const listed = await adapter.list(sessionsPath);
                        if (listed?.files) {
                            const mdFiles = listed.files.filter(f => f.endsWith('.md')).sort().reverse();
                            for (const filePath of mdFiles) {
                                try {
                                    const content = await adapter.read(filePath);
                                    docs.push({
                                        source: 'session',
                                        path: filePath,
                                        name: filePath.split('/').pop(),
                                        content
                                    });
                                } catch (e) { /* skip unreadable */ }
                            }
                        }
                    } catch (e) { /* sessions folder not found */ }
                }

                // Collect brain
                if (scope === 'all' || scope === 'brain') {
                    const brainPath = `${memoryBase}/brain.md`;
                    try {
                        if (await adapter.exists(brainPath)) {
                            const content = await adapter.read(brainPath);
                            docs.push({
                                source: 'brain',
                                path: brainPath,
                                name: 'brain.md',
                                content
                            });
                        }
                    } catch (e) { /* no brain yet */ }
                }

                // Collect summaries (L1/L2/L3)
                if (scope === 'all' || scope === 'summaries') {
                    for (const subdir of ['summaries/L1', 'summaries/L2', 'summaries/L3']) {
                        const dirPath = `${memoryBase}/${subdir}`;
                        try {
                            const listed = await adapter.list(dirPath);
                            if (listed?.files) {
                                for (const filePath of listed.files) {
                                    if (!filePath.endsWith('.md')) continue;
                                    try {
                                        const content = await adapter.read(filePath);
                                        docs.push({
                                            source: subdir,
                                            path: filePath,
                                            name: filePath.split('/').pop(),
                                            content
                                        });
                                    } catch (e) { /* skip */ }
                                }
                            }
                        } catch (e) { /* dir doesn't exist */ }
                    }
                }

                // ── TRY SEMANTIC SEARCH via EmbeddingHelper (batch) ──
                const env = plugin?.env;
                if (env) {
                    try {
                        const embedHelper = new EmbeddingHelper(env);
                        if (embedHelper.isReady() && docs.length > 0) {
                            // Limit docs to most recent 30, odfiltruj puste
                            const searchDocs = docs
                                .filter(d => d.content && d.content.trim().length > 0)
                                .slice(0, 30);
                            const snippets = searchDocs.map(d => d.content.substring(0, 1500));

                            // Single batch: query + all doc snippets (1-2 HTTP calls instead of N)
                            const allVecs = await embedHelper.embedBatch([query, ...snippets]);
                            const queryVec = allVecs[0];

                            const scored = searchDocs.map((doc, i) => ({
                                ...doc,
                                score: embedHelper.cosineSimilarity(queryVec, allVecs[i + 1])
                            }));

                            scored.sort((a, b) => b.score - a.score);
                            const topResults = scored.slice(0, limit).filter(r => r.score > 0.3);

                            if (topResults.length > 0) {
                                return {
                                    success: true,
                                    query,
                                    agent: activeAgent.name,
                                    searchType: 'semantic',
                                    results: topResults.map(r => ({
                                        source: r.source,
                                        path: r.path,
                                        name: r.name,
                                        score: r.score,
                                        snippet: r.content.substring(0, 200).replace(/\n/g, ' ') + '...'
                                    })),
                                    count: topResults.length
                                };
                            }
                        }
                    } catch (e) {
                        console.warn('[MemorySearch] Semantic search failed, falling back to keyword:', e.message);
                    }
                }

                // ── FALLBACK: keyword indexOf ──
                const queryLower = query.toLowerCase();
                const results = [];

                for (const doc of docs) {
                    if (results.length >= limit) break;
                    const contentLower = doc.content.toLowerCase();
                    const idx = contentLower.indexOf(queryLower);
                    if (idx !== -1) {
                        const start = Math.max(0, idx - 100);
                        const end = Math.min(doc.content.length, idx + query.length + 100);
                        let snippet = doc.content.substring(start, end).replace(/\n/g, ' ');
                        if (start > 0) snippet = '...' + snippet;
                        if (end < doc.content.length) snippet = snippet + '...';

                        results.push({
                            source: doc.source,
                            path: doc.path,
                            name: doc.name,
                            snippet
                        });
                    }
                }

                return {
                    success: true,
                    query,
                    agent: activeAgent.name,
                    searchType: 'keyword',
                    results,
                    count: results.length
                };

            } catch (error) {
                console.error('[MemorySearchTool] Error:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        }
    };
}
