/**
 * MCP tool for searching agent's own memory (sessions, brain, summaries).
 * Separate from vault_search which searches user's notes.
 */
export function createMemorySearchTool(app) {
    return {
        name: 'memory_search',
        description: 'Search your own memory - past sessions, brain notes, and summaries. Use this when user asks about previous conversations or things you should remember.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Text to search for in your memory'
                },
                scope: {
                    type: 'string',
                    enum: ['all', 'sessions', 'brain', 'summaries'],
                    description: 'Where to search. Default: all'
                },
                limit: {
                    type: 'number',
                    description: 'Max results to return. Default: 10'
                }
            },
            required: ['query']
        },
        execute: async (args, app, plugin) => {
            console.log('[MemorySearchTool] Executing with args:', args);
            try {
                const { query } = args;
                if (!query || typeof query !== 'string') {
                    throw new Error('Query is required and must be a string');
                }

                const scope = args.scope || 'all';
                const limit = Math.min(args.limit || 10, 30);
                const queryLower = query.toLowerCase();

                // Get active agent's memory path
                const agentManager = plugin?.agentManager;
                const activeAgent = agentManager?.getActiveAgent();
                if (!activeAgent) {
                    return { success: false, error: 'No active agent' };
                }

                const safeName = activeAgent.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
                const memoryBase = `.pkm-assistant/agents/${safeName}/memory`;
                const adapter = app.vault.adapter;

                const results = [];

                // Search sessions
                if (scope === 'all' || scope === 'sessions') {
                    const sessionsPath = `${memoryBase}/sessions`;
                    try {
                        const listed = await adapter.list(sessionsPath);
                        if (listed?.files) {
                            const mdFiles = listed.files.filter(f => f.endsWith('.md')).sort().reverse();
                            for (const filePath of mdFiles) {
                                if (results.length >= limit) break;
                                try {
                                    const content = await adapter.read(filePath);
                                    const contentLower = content.toLowerCase();
                                    const idx = contentLower.indexOf(queryLower);
                                    if (idx !== -1) {
                                        const start = Math.max(0, idx - 100);
                                        const end = Math.min(content.length, idx + query.length + 100);
                                        let snippet = content.substring(start, end).replace(/\n/g, ' ');
                                        if (start > 0) snippet = '...' + snippet;
                                        if (end < content.length) snippet = snippet + '...';

                                        results.push({
                                            source: 'session',
                                            path: filePath,
                                            name: filePath.split('/').pop(),
                                            snippet
                                        });
                                    }
                                } catch (e) {
                                    // Skip unreadable files
                                }
                            }
                        }
                    } catch (e) {
                        console.log('[MemorySearchTool] Sessions folder not found');
                    }
                }

                // Search brain
                if (scope === 'all' || scope === 'brain') {
                    const brainPath = `${memoryBase}/brain.md`;
                    try {
                        if (await adapter.exists(brainPath)) {
                            const content = await adapter.read(brainPath);
                            const contentLower = content.toLowerCase();
                            const idx = contentLower.indexOf(queryLower);
                            if (idx !== -1) {
                                const start = Math.max(0, idx - 100);
                                const end = Math.min(content.length, idx + query.length + 100);
                                let snippet = content.substring(start, end).replace(/\n/g, ' ');
                                if (start > 0) snippet = '...' + snippet;
                                if (end < content.length) snippet = snippet + '...';

                                results.push({
                                    source: 'brain',
                                    path: brainPath,
                                    name: 'brain.md',
                                    snippet
                                });
                            }
                        }
                    } catch (e) {
                        // No brain yet
                    }
                }

                // Search summaries (L1/L2)
                if (scope === 'all' || scope === 'summaries') {
                    for (const subdir of ['summaries/L1', 'summaries/L2']) {
                        const dirPath = `${memoryBase}/${subdir}`;
                        try {
                            const listed = await adapter.list(dirPath);
                            if (listed?.files) {
                                for (const filePath of listed.files) {
                                    if (results.length >= limit) break;
                                    if (!filePath.endsWith('.md')) continue;
                                    try {
                                        const content = await adapter.read(filePath);
                                        const contentLower = content.toLowerCase();
                                        const idx = contentLower.indexOf(queryLower);
                                        if (idx !== -1) {
                                            const start = Math.max(0, idx - 100);
                                            const end = Math.min(content.length, idx + query.length + 100);
                                            let snippet = content.substring(start, end).replace(/\n/g, ' ');
                                            if (start > 0) snippet = '...' + snippet;
                                            if (end < content.length) snippet = snippet + '...';

                                            results.push({
                                                source: subdir,
                                                path: filePath,
                                                name: filePath.split('/').pop(),
                                                snippet
                                            });
                                        }
                                    } catch (e) {
                                        // Skip
                                    }
                                }
                            }
                        } catch (e) {
                            // Dir doesn't exist
                        }
                    }
                }

                return {
                    success: true,
                    query,
                    agent: activeAgent.name,
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
